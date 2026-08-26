// js/services/depansService.js
// Depann de window.db, window.currentCompanyId, window.AdminService
// Depans anba SÈY_APWOBASYON (50,000 HTG) kreye dirèkteman.
// Depans pi wo pase sèy la pase PA workflow apwobasyon (demandApwobasyon)
// deja egziste nan adminService.js — yo vin yon vrè ekriti sèlman apre
// Direktè apwouve yo (estati 'apwouve_direktè') e yon moun rele
// egzekiteDepansApwouve().

const DepansService = (() => {

    function getBizRef() {
        if (!window.currentCompanyId) throw new Error("Pa gen biznis aktif chwazi.");
        return window.db.collection('biznis').doc(window.currentCompanyId);
    }

    const KATEGORI_KONT = {
        'Loyer': '6010',
        'Électricité': '6020',
        'Internet': '6030',
        'Salaires': '6040',
        'Transport': '6050',
        'Marketing': '6060',
        'Maintenance': '6070',
        'Autres': '6080'
    };

    function getSèy() {
        return window.AdminService?.SÈY_APWOBASYON || 50000;
    }

    /**
     * @param {Object} data
     *   data.kategori - youn nan kle KATEGORI_KONT
     *   data.montan
     *   data.deskripsyon
     *   data.mòdPeman - 'kach' | 'transfè' | 'kredi'
     *   data.founiseId - obligatwa si mòdPeman === 'kredi'
     *   data.veyikilId - opsyonèl (Modil 5 — Logistique, kategori 'Transport')
     *   data.chofeId - opsyonèl (Modil 5 — Logistique, kategori 'Transport')
     *   data.souKategori - opsyonèl (ex: 'Carburant'|'Péage'|'Reparasyon'|'Lojman Chofè'|'Manje')
     *   data.kantite - opsyonèl (galon, sèlman itilize pou souKategori 'Carburant')
     *
     * @returns { enAtant: true, demandId } si montan depase sèy la (soumèt pou apwobasyon)
     *          { enAtant: false, id, nimewoDepans } si kreye dirèkteman
     */
    async function createDepans(data) {
        if (!KATEGORI_KONT[data.kategori]) throw new Error("Kategori depans pa valid.");
        if (!data.montan || data.montan <= 0) throw new Error("Montan dwe pi gran pase 0.");
        if (data.mòdPeman === 'kredi' && !data.founiseId) {
            throw new Error("Founisè obligatwa pou yon depans an kredi.");
        }

        if (data.montan > getSèy()) {
            return await soumèTPouApwobasyon(data);
        }
        return await kreyeDirèkteman(data);
    }

    async function soumèTPouApwobasyon(data) {
        if (!window.AdminService?.soumèTDemandApwobasyon) {
            throw new Error("Workflow apwobasyon pa disponib — pa ka soumèt depans ki depase sèy la.");
        }
        // NÒT: refDokiman itilize kòm veyikil pou sove detay depans lan (JSON),
        // paske dokiman depans lan poko egziste (li ap kreye SÈLMAN apre apwobasyon).
        const payload = JSON.stringify({
            kategori: data.kategori,
            mòdPeman: data.mòdPeman,
            founiseId: data.founiseId || null,
            veyikilId: data.veyikilId || null,
            chofeId: data.chofeId || null,
            souKategori: data.souKategori || null,
            kantite: data.kantite || null
        });

        const demandId = await window.AdminService.soumèTDemandApwobasyon(window.currentCompanyId, {
            tip: 'depans',
            montan: data.montan,
            refDokiman: payload,
            deskripsyon: `${data.kategori}: ${data.deskripsyon || ''}`
        });

        return { enAtant: true, demandId };
    }

    async function getNextDepansNumber(transaction, bizRef) {
        const counterRef = bizRef.collection('konte').doc('depans');
        const counterDoc = await transaction.get(counterRef);
        let nextNum = 1;
        if (counterDoc.exists) {
            nextNum = (counterDoc.data().dènyeNimewo || 0) + 1;
        }
        transaction.set(counterRef, { dènyeNimewo: nextNum }, { merge: true });
        return 'DEP-' + String(nextNum).padStart(6, '0');
    }

    async function kreyeDirèkteman(data) {
        const bizRef = getBizRef();
        const kontDepans = KATEGORI_KONT[data.kategori];

        const rezilta = await window.db.runTransaction(async (transaction) => {
            let founiseRef = null;
            let founiseDoc = null;
            if (data.mòdPeman === 'kredi') {
                founiseRef = bizRef.collection('founise').doc(data.founiseId);
                founiseDoc = await transaction.get(founiseRef);
                if (!founiseDoc.exists) throw new Error("Founisè sa a pa egziste.");
            }

            const nimewoDepans = await getNextDepansNumber(transaction, bizRef);
            const depansRef = bizRef.collection('depans').doc();

            transaction.set(depansRef, {
                nimewoDepans,
                kategori: data.kategori,
                montan: data.montan,
                deskripsyon: data.deskripsyon || '',
                mòdPeman: data.mòdPeman,
                founiseId: data.founiseId || null,
                veyikilId: data.veyikilId || null,
                chofeId: data.chofeId || null,
                souKategori: data.souKategori || null,
                kantite: data.kantite || null,
                estati: 'peye',
                dat: firebase.firestore.FieldValue.serverTimestamp()
            });

            const kontCredit = data.mòdPeman === 'kredi' ? '2010' : (data.mòdPeman === 'transfè' ? '1020' : '1010');
            const journalRef = bizRef.collection('jounal').doc();
            transaction.set(journalRef, {
                nimewoEkriti: nimewoDepans,
                dat: firebase.firestore.FieldValue.serverTimestamp(),
                liy: [
                    { kont: kontDepans, débit: data.montan, crédit: 0 },
                    { kont: kontCredit, débit: 0, crédit: data.montan }
                ],
                referans: depansRef.id,
                sous: 'automatique'
            });

            if (data.mòdPeman === 'kredi') {
                const dètAktyèl = founiseDoc.data().dèt || 0;
                transaction.update(founiseRef, { dèt: dètAktyèl + data.montan });
            }

            return { id: depansRef.id, nimewoDepans };
        });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Depans', 'Kreye Depans', '—',
                `${rezilta.nimewoDepans} — ${data.kategori} (${data.montan.toLocaleString()} HTG)`
            ).catch(err => console.warn('Audit log echwe:', err));
        }

        return { enAtant: false, ...rezilta };
    }

    /**
     * Rele lè yon demand apwobasyon tip='depans' rive nan estati 'apwouve_direktè'
     * epi yon moun klike "Egzekite". Kreye vrè dokiman depans + jounal la,
     * epi mete demand lan kòm 'egzekite'.
     */
    async function egzekiteDepansApwouve(demandId) {
        const bizRef = getBizRef();
        const demandRef = bizRef.collection('demandApwobasyon').doc(demandId);
        const demandDoc = await demandRef.get();
        if (!demandDoc.exists) throw new Error("Demand sa a pa egziste.");
        const demand = demandDoc.data();

        if (demand.tip !== 'depans') throw new Error("Demand sa a se pa yon depans.");
        if (demand.estati !== 'apwouve_direktè') {
            throw new Error("Demand dwe apwouve pa Direktè anvan egzekisyon.");
        }

        let payload;
        try {
            payload = JSON.parse(demand.refDokiman);
        } catch (e) {
            throw new Error("Done depans lan koripi (refDokiman pa valid).");
        }

        const rezilta = await kreyeDirèkteman({
            kategori: payload.kategori,
            montan: demand.montan,
            deskripsyon: demand.deskripsyon || '',
            mòdPeman: payload.mòdPeman,
            founiseId: payload.founiseId,
            veyikilId: payload.veyikilId,
            chofeId: payload.chofeId,
            souKategori: payload.souKategori,
            kantite: payload.kantite
        });

        // Make demand lan kòm egzekite (apre depans la konfime kreye)
        if (window.AdminService?.egzekiteDemand) {
            await window.AdminService.egzekiteDemand(window.currentCompanyId, demandId)
                .catch(err => console.warn('Mete demand kòm egzekite echwe (depans deja kreye):', err));
        }

        return rezilta;
    }

    async function getDepans(limitCount = 50) {
        const bizRef = getBizRef();
        const snapshot = await bizRef.collection('depans')
            .orderBy('dat', 'desc')
            .limit(limitCount)
            .get();
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    async function getDepansById(depansId) {
        const bizRef = getBizRef();
        const doc = await bizRef.collection('depans').doc(depansId).get();
        if (!doc.exists) throw new Error("Depans sa a pa egziste.");
        return { id: doc.id, ...doc.data() };
    }

    return {
        KATEGORI_KONT,
        createDepans, egzekiteDepansApwouve,
        getDepans, getDepansById
    };
})();

window.DepansService = DepansService;
