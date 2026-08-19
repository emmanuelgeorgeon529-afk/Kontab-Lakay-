// js/services/quotesService.js
// Depann de window.db, window.currentCompanyId, window.AdminService, window.SalesService

const QuotesService = (() => {

    function getBizRef() {
        if (!window.currentCompanyId) throw new Error("Pa gen biznis aktif chwazi.");
        return window.db.collection('biznis').doc(window.currentCompanyId);
    }

    async function getNextQuoteNumber(transaction, bizRef) {
        const counterRef = bizRef.collection('konte').doc('devis');
        const counterDoc = await transaction.get(counterRef);
        let nextNum = 1;
        if (counterDoc.exists) {
            nextNum = (counterDoc.data().dènyeNimewo || 0) + 1;
        }
        transaction.set(counterRef, { dènyeNimewo: nextNum }, { merge: true });
        return 'DEV-' + String(nextNum).padStart(6, '0');
    }

    /**
     * Kreye yon devis. Pa touche stock ni jounal — se yon pwopozisyon sèlman.
     * @param {Object} devisData
     *   devisData.kliyanId, kliyanNon
     *   devisData.atik - [{ pwodwiId, non, kantite, priInite }]
     *   devisData.validitéJou - konbyen jou devi a valab (default 15)
     */
    async function createQuote(devisData) {
        if (!devisData.atik || devisData.atik.length === 0) {
            throw new Error("Devi a dwe gen pou pi piti yon atik.");
        }

        const bizRef = getBizRef();
        const total = devisData.atik.reduce((s, a) => s + (a.kantite * a.priInite), 0);

        const rezilta = await window.db.runTransaction(async (transaction) => {
            const nimewoDevis = await getNextQuoteNumber(transaction, bizRef);
            const devisRef = bizRef.collection('devis').doc();

            const validitéJou = devisData.validitéJou || 15;
            const dateExpirasyon = new Date();
            dateExpirasyon.setDate(dateExpirasyon.getDate() + validitéJou);

            transaction.set(devisRef, {
                nimewoDevis,
                kliyanId: devisData.kliyanId || null,
                kliyanNon: devisData.kliyanNon || 'Kliyan Divès',
                atik: devisData.atik,
                total,
                estati: 'brouillon', // brouillon | envoyé | accepté | refusé | expiré | converti
                dateExpirasyon: firebase.firestore.Timestamp.fromDate(dateExpirasyon),
                dat: firebase.firestore.FieldValue.serverTimestamp(),
                kreyePa: window.auth?.currentUser?.uid || null
            });

            return { id: devisRef.id, nimewoDevis, total };
        });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Ventes', 'Kreye Devis', '—',
                `${rezilta.nimewoDevis} (${rezilta.total.toLocaleString()} HTG)`
            ).catch(err => console.warn('Audit log echwe:', err));
        }

        return rezilta;
    }

    async function getQuotes(limitCount = 50) {
        const bizRef = getBizRef();
        const snapshot = await bizRef.collection('devis')
            .orderBy('dat', 'desc').limit(limitCount).get();
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    async function getQuoteById(quoteId) {
        const bizRef = getBizRef();
        const doc = await bizRef.collection('devis').doc(quoteId).get();
        if (!doc.exists) throw new Error("Devi sa a pa egziste.");
        return { id: doc.id, ...doc.data() };
    }

    // ---------- CHANJE ESTATI (brouillon → envoyé → accepté/refusé) ----------

    async function updateQuoteStatus(quoteId, nouvoEstati) {
        const valid = ['brouillon', 'envoyé', 'accepté', 'refusé', 'expiré'];
        if (!valid.includes(nouvoEstati)) throw new Error('Estati pa valid.');

        const bizRef = getBizRef();
        const ref = bizRef.collection('devis').doc(quoteId);

        await db_updateWithCheck(ref, quoteId, nouvoEstati);

        async function db_updateWithCheck(ref, quoteId, nouvoEstati) {
            await window.db.runTransaction(async (transaction) => {
                const doc = await transaction.get(ref);
                if (!doc.exists) throw new Error("Devi sa a pa egziste.");
                if (doc.data().estati === 'converti') {
                    throw new Error("Devi sa a deja konvèti an vant, ou pa ka chanje estati li ankò.");
                }
                transaction.update(ref, { estati: nouvoEstati });
            });
        }

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Ventes', 'Chanje Estati Devis', quoteId, nouvoEstati
            ).catch(err => console.warn('Audit log echwe:', err));
        }
    }

    // ---------- KONVÈTI DEVI AN VANT (rele SalesService.createSale) ----------

    async function convertQuoteToSale(quoteId, mòdPeman) {
        const devis = await getQuoteById(quoteId);
        if (devis.estati === 'converti') throw new Error("Devi sa a deja konvèti.");
        if (devis.estati !== 'accepté') throw new Error("Devi a dwe aksepte anvan konvèsyon.");

        const vant = await window.SalesService.createSale({
            kliyanId: devis.kliyanId,
            kliyanNon: devis.kliyanNon,
            mòdPeman: mòdPeman || 'kach',
            atik: devis.atik
        });

        const bizRef = getBizRef();
        await bizRef.collection('devis').doc(quoteId).update({
            estati: 'converti',
            venteId: vant.id,
            dateConversyon: firebase.firestore.FieldValue.serverTimestamp()
        });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Ventes', 'Konvèti Devis an Vant',
                devis.nimewoDevis, vant.nimewoFakti
            ).catch(err => console.warn('Audit log echwe:', err));
        }

        return vant;
    }

    return { createQuote, getQuotes, getQuoteById, updateQuoteStatus, convertQuoteToSale };
})();

window.QuotesService = QuotesService;
