// js/services/savService.js
// Depann de window.db, window.currentCompanyId, window.AdminService,
// window.SalesService, window.ProductsService

const SavService = (() => {

    function getBizRef() {
        if (!window.currentCompanyId) throw new Error("Pa gen biznis aktif chwazi.");
        return window.db.collection('biznis').doc(window.currentCompanyId);
    }

    const TIP_SAV_VALID = ['réclamation', 'retour', 'échange', 'garantie'];
    const ETAP_RETOUR = ['retour_demandé', 'inspection', 'remboursement', 'échange_effectué', 'rejeté'];

    async function getNextTicketNumber(transaction, bizRef) {
        const counterRef = bizRef.collection('konte').doc('sav');
        const counterDoc = await transaction.get(counterRef);
        let nextNum = 1;
        if (counterDoc.exists) {
            nextNum = (counterDoc.data().dènyeNimewo || 0) + 1;
        }
        transaction.set(counterRef, { dènyeNimewo: nextNum }, { merge: true });
        return 'SAV-' + String(nextNum).padStart(6, '0');
    }

    /**
     * Kreye yon tikè SAV (Réclamation, Retour, Échange, oswa Garantie).
     * @param {Object} data
     *   data.tip - youn nan TIP_SAV_VALID
     *   data.venteId - ID vant orijinal la (obligatwa pou retour/échange/garantie)
     *   data.kliyanId, kliyanNon
     *   data.deskripsyon - rezon/deskripsyon pwoblèm nan
     *   data.atik - [{ pwodwiId, non, kantite }] pou retour/échange
     */
    async function createTicket(data) {
        if (!TIP_SAV_VALID.includes(data.tip)) throw new Error("Tip SAV pa valid.");
        if (!data.deskripsyon || !data.deskripsyon.trim()) {
            throw new Error("Deskripsyon an obligatwa.");
        }
        if (['retour', 'échange', 'garantie'].includes(data.tip) && !data.venteId) {
            throw new Error("Referans vant orijinal la obligatwa pou " + data.tip + ".");
        }

        const bizRef = getBizRef();

        const rezilta = await window.db.runTransaction(async (transaction) => {
            const nimewoTikè = await getNextTicketNumber(transaction, bizRef);
            const tikèRef = bizRef.collection('sav').doc();

            transaction.set(tikèRef, {
                nimewoTikè,
                tip: data.tip,
                venteId: data.venteId || null,
                kliyanId: data.kliyanId || null,
                kliyanNon: data.kliyanNon || 'Kliyan Divès',
                deskripsyon: data.deskripsyon.trim(),
                atik: data.atik || [],
                estati: data.tip === 'retour' ? 'retour_demandé' : 'ouvert',
                istorik: [{ etap: 'kreye', dat: new Date().toISOString() }],
                dat: firebase.firestore.FieldValue.serverTimestamp()
            });

            return { id: tikèRef.id, nimewoTikè };
        });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Ventes', `Kreye Tikè ${data.tip}`, '—', rezilta.nimewoTikè
            ).catch(err => console.warn('Audit log echwe:', err));
        }

        return rezilta;
    }

    async function getTickets(limitCount = 50) {
        const bizRef = getBizRef();
        const snapshot = await bizRef.collection('sav')
            .orderBy('dat', 'desc').limit(limitCount).get();
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    async function getTicketById(ticketId) {
        const bizRef = getBizRef();
        const doc = await bizRef.collection('sav').doc(ticketId).get();
        if (!doc.exists) throw new Error("Tikè sa a pa egziste.");
        return { id: doc.id, ...doc.data() };
    }

    // ---------- WORKFLOW RETOUR: retour_demandé → inspection → remboursement/échange/rejeté ----------

    async function advanceReturnStatus(ticketId, nouvoEstati) {
        if (!ETAP_RETOUR.includes(nouvoEstati)) throw new Error("Etap pa valid.");

        const bizRef = getBizRef();
        const ref = bizRef.collection('sav').doc(ticketId);

        const rezilta = await window.db.runTransaction(async (transaction) => {
            const doc = await transaction.get(ref);
            if (!doc.exists) throw new Error("Tikè sa a pa egziste.");
            const tikè = doc.data();

            if (['remboursement', 'échange_effectué', 'rejeté'].includes(tikè.estati)) {
                throw new Error("Tikè sa a deja fèmen.");
            }

            transaction.update(ref, {
                estati: nouvoEstati,
                istorik: firebase.firestore.FieldValue.arrayUnion({
                    etap: nouvoEstati, dat: new Date().toISOString()
                })
            });

            return { nimewoTikè: tikè.nimewoTikè, atik: tikè.atik, venteId: tikè.venteId };
        });

        // Si echanj oswa ranbousman apwouve, remèt pwodwi nan stock
        if (nouvoEstati === 'remboursement' || nouvoEstati === 'échange_effectué') {
            for (const atik of (rezilta.atik || [])) {
                if (atik.pwodwiId) {
                    await window.ProductsService.adjustStock(
                        atik.pwodwiId, atik.kantite, `Retour SAV ${rezilta.nimewoTikè}`
                    );
                }
            }
        }

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Ventes', 'Avanse Estati Retour SAV',
                rezilta.nimewoTikè, nouvoEstati
            ).catch(err => console.warn('Audit log echwe:', err));
        }

        return rezilta;
    }

    // ---------- FÈMEN TIKÈ (réclamation/garantie sèlman) ----------

    async function closeTicket(ticketId, rezolisyon) {
        const bizRef = getBizRef();
        const ref = bizRef.collection('sav').doc(ticketId);

        await ref.update({
            estati: 'fèmen',
            rezolisyon: rezolisyon || '',
            dateFèmen: firebase.firestore.FieldValue.serverTimestamp()
        });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Ventes', 'Fèmen Tikè SAV', ticketId, rezolisyon || ''
            ).catch(err => console.warn('Audit log echwe:', err));
        }
    }

    return {
        TIP_SAV_VALID, ETAP_RETOUR,
        createTicket, getTickets, getTicketById,
        advanceReturnStatus, closeTicket
    };
})();

window.SavService = SavService;
