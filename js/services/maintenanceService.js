// js/services/maintenanceService.js
// Depann de window.db, window.currentCompanyId, window.AdminService, window.DepansService
// Konsepsyon JENERIK: yon plan/tikè ka konekte ak yon 'immobilisation' (Modil 7)
// OSWA yon 'veyikil' (Modil 5 — VeyikilSevis) via { byenTip, byenId, byenNon }.
// Kou reparasyon yo PASE PA DepansService.createDepans() (kategori 'Maintenance'),
// pou rezitilize workflow apwobasyon ak ekriti jounal ki deja egziste.

const MaintenanceService = (() => {

    function getBizRef() {
        if (!window.currentCompanyId) throw new Error("Pa gen biznis aktif chwazi.");
        return window.db.collection('biznis').doc(window.currentCompanyId);
    }

    // ---------- 7.3 MAINTENANCE PRÉVENTIVE ----------

    /**
     * @param {Object} data
     *   data.byenTip - 'immobilisation' | 'veyikil'
     *   data.byenId, data.byenNon
     *   data.kalite - ex: 'Chanjman Lwil', 'Enspeksyon'
     *   data.dateProgram - 'YYYY-MM-DD'
     *   data.frekans - ex: 'Chak 3 mwa' (tèks lib, pa rekiryans otomatik — Firebase Spark)
     *   data.responsab
     */
    async function kreyePlanPreventif(data) {
        if (!['immobilisation', 'veyikil'].includes(data.byenTip)) {
            throw new Error("Tip byen pa valid.");
        }
        if (!data.byenId || !data.dateProgram) {
            throw new Error("Byen ak dat pwograme obligatwa.");
        }

        const bizRef = getBizRef();
        const planRef = bizRef.collection('antretyen_plan').doc();
        await planRef.set({
            byenTip: data.byenTip,
            byenId: data.byenId,
            byenNon: data.byenNon || '',
            kalite: data.kalite || '',
            dateProgram: data.dateProgram,
            frekans: data.frekans || '',
            responsab: data.responsab || '',
            estati: 'pwograme', // 'pwograme' | 'fèt' | 'anreta'
            dat: firebase.firestore.FieldValue.serverTimestamp()
        });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Actifs', 'Kreye Plan Antretyen', '—',
                `${data.byenNon} — ${data.kalite} (${data.dateProgram})`
            ).catch(err => console.warn('Audit log echwe:', err));
        }

        return { id: planRef.id };
    }

    async function getPlansPreventifs() {
        const bizRef = getBizRef();
        const snapshot = await bizRef.collection('antretyen_plan')
            .orderBy('dateProgram', 'asc').get();
        const jodiA = new Date().toISOString().slice(0, 10);
        return snapshot.docs.map(d => {
            const plan = { id: d.id, ...d.data() };
            // Estati "anreta" kalkile dinamikman — pa estoke, evite done obsolèt
            if (plan.estati === 'pwograme' && plan.dateProgram < jodiA) {
                plan.estatiKalkile = 'anreta';
            } else {
                plan.estatiKalkile = plan.estati;
            }
            return plan;
        });
    }

    async function marquePlanFèt(planId) {
        const bizRef = getBizRef();
        await bizRef.collection('antretyen_plan').doc(planId).update({
            estati: 'fèt', dateFèt: firebase.firestore.FieldValue.serverTimestamp()
        });
        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Actifs', 'Marke Antretyen Fèt', 'pwograme', 'fèt'
            ).catch(err => console.warn('Audit log echwe:', err));
        }
    }

    // ---------- 7.4 MAINTENANCE CORRECTIVE ----------

    async function getNextTicketNumber(transaction, bizRef) {
        const counterRef = bizRef.collection('konte').doc('antretyen_tikè');
        const counterDoc = await transaction.get(counterRef);
        let nextNum = 1;
        if (counterDoc.exists) nextNum = (counterDoc.data().dènyeNimewo || 0) + 1;
        transaction.set(counterRef, { dènyeNimewo: nextNum }, { merge: true });
        return 'TCK-' + String(nextNum).padStart(4, '0');
    }

    /**
     * @param {Object} data
     *   data.byenTip - 'immobilisation' | 'veyikil'
     *   data.byenId, data.byenNon
     *   data.pwoblèm - deskripsyon pann lan
     *   data.ijans - 'kritik' | 'mwayen' | 'ba'
     */
    async function kreyeTicketCorrectif(data) {
        if (!['immobilisation', 'veyikil'].includes(data.byenTip)) {
            throw new Error("Tip byen pa valid.");
        }
        if (!data.pwoblèm || !data.pwoblèm.trim()) {
            throw new Error("Deskripsyon pwoblèm nan obligatwa.");
        }

        const bizRef = getBizRef();

        const rezilta = await window.db.runTransaction(async (transaction) => {
            const nimewoTicket = await getNextTicketNumber(transaction, bizRef);
            const ticketRef = bizRef.collection('antretyen_ticket').doc();
            transaction.set(ticketRef, {
                nimewoTicket,
                byenTip: data.byenTip,
                byenId: data.byenId,
                byenNon: data.byenNon || '',
                pwoblèm: data.pwoblèm.trim(),
                ijans: data.ijans || 'mwayen',
                estati: 'ouvè', // 'ouvè' | 'anReparasyon' | 'fèmen'
                dateOuvèti: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { id: ticketRef.id, nimewoTicket };
        });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Actifs', 'Kreye Ticket Pann', '—',
                `${rezilta.nimewoTicket} — ${data.byenNon} (${data.ijans})`
            ).catch(err => console.warn('Audit log echwe:', err));
        }

        return rezilta;
    }

    async function getTicketsCorrectifs(limitCount = 50) {
        const bizRef = getBizRef();
        const snapshot = await bizRef.collection('antretyen_ticket')
            .orderBy('dateOuvèti', 'desc').limit(limitCount).get();
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    async function avanseTicket(ticketId, nouvoEstati) {
        if (!['anReparasyon', 'fèmen'].includes(nouvoEstati)) {
            throw new Error("Estati pa valid.");
        }
        const bizRef = getBizRef();
        await bizRef.collection('antretyen_ticket').doc(ticketId).update({ estati: nouvoEstati });
        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Actifs', 'Avanse Ticket Pann', '—', nouvoEstati
            ).catch(err => console.warn('Audit log echwe:', err));
        }
    }

    /**
     * Fèmen tikè a AK anrejistre kou reparasyon an kòm yon Depans (kategori
     * 'Maintenance', kont 6070) — rezitilize DepansService pou jounal + apwobasyon.
     * NÒT — si kout la depase sèy apwobasyon (50 000 HTG), tikè a make 'fèmen'
     * IMEDYATMAN men depans lan rete 'enAtant' jiskaske Direktè apwouve l.
     * @param {string} ticketId
     * @param {number} kout - kou reparasyon an (HTG)
     * @param {string} mòdPeman - 'kach' | 'transfè' | 'kredi'
     * @param {string} [founiseId] - obligatwa si mòdPeman === 'kredi'
     */
    async function fèmenTicketAvecKou(ticketId, kout, mòdPeman, founiseId) {
        const bizRef = getBizRef();
        const ticketDoc = await bizRef.collection('antretyen_ticket').doc(ticketId).get();
        if (!ticketDoc.exists) throw new Error("Ticket sa a pa egziste.");
        const ticket = ticketDoc.data();

        const depansRezilta = await window.DepansService.createDepans({
            kategori: 'Maintenance',
            montan: kout,
            deskripsyon: `${ticket.nimewoTicket} — ${ticket.byenNon}: ${ticket.pwoblèm}`,
            mòdPeman,
            founiseId,
            veyikilId: ticket.byenTip === 'veyikil' ? ticket.byenId : null
        });

        await bizRef.collection('antretyen_ticket').doc(ticketId).update({
            estati: 'fèmen',
            kout,
            depansId: depansRezilta.id || null,
            depansEnAtant: depansRezilta.enAtant,
            dateFèmti: firebase.firestore.FieldValue.serverTimestamp()
        });

        return depansRezilta;
    }

    return {
        kreyePlanPreventif, getPlansPreventifs, marquePlanFèt,
        kreyeTicketCorrectif, getTicketsCorrectifs, avanseTicket, fèmenTicketAvecKou
    };
})();

window.MaintenanceService = MaintenanceService;
