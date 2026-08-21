// js/services/fideliteService.js
// Depann de window.db, window.currentCompanyId, window.AdminService

const FideliteService = (() => {

    function getBizRef() {
        if (!window.currentCompanyId) throw new Error("Pa gen biznis aktif chwazi.");
        return window.db.collection('biznis').doc(window.currentCompanyId);
    }

    const TAUX_PWEN = 1;
    const VALÈ_PWEN_HTG = 1;
    const TAUX_CASHBACK = 0.02;

    async function ajoutePwenApreVant(kliyanId, montanVant) {
        if (!kliyanId) return;

        const pwenGanye = Math.floor((montanVant / 100) * TAUX_PWEN);
        const cashback = montanVant * TAUX_CASHBACK;
        if (pwenGanye === 0 && cashback === 0) return;

        const bizRef = getBizRef();
        const fidèlRef = bizRef.collection('fidelite').doc(kliyanId);

        await window.db.runTransaction(async (transaction) => {
            const doc = await transaction.get(fidèlRef);
            const done = doc.exists ? doc.data() : { pwenAkimile: 0, cashbackAkimile: 0 };

            transaction.set(fidèlRef, {
                kliyanId,
                pwenAkimile: (done.pwenAkimile || 0) + pwenGanye,
                cashbackAkimile: (done.cashbackAkimile || 0) + cashback,
                dènyeAktivite: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        });
    }

    async function getFideliteByCustomer(kliyanId) {
        const bizRef = getBizRef();
        const doc = await bizRef.collection('fidelite').doc(kliyanId).get();
        if (!doc.exists) return { pwenAkimile: 0, cashbackAkimile: 0 };
        return doc.data();
    }

    async function itilizePwen(kliyanId, nòmbPwen) {
        if (!nòmbPwen || nòmbPwen <= 0) throw new Error("Nòmb pwen dwe pi gran pase 0.");

        const bizRef = getBizRef();
        const fidèlRef = bizRef.collection('fidelite').doc(kliyanId);

        const rezilta = await window.db.runTransaction(async (transaction) => {
            const doc = await transaction.get(fidèlRef);
            if (!doc.exists) throw new Error("Kliyan sa a pa gen kont fidélité.");

            const pwenAktyèl = doc.data().pwenAkimile || 0;
            if (nòmbPwen > pwenAktyèl) {
                throw new Error(`Kliyan an gen sèlman ${pwenAktyèl} pwen.`);
            }

            transaction.update(fidèlRef, {
                pwenAkimile: pwenAktyèl - nòmbPwen
            });

            return { valèItilize: nòmbPwen * VALÈ_PWEN_HTG, pwenRete: pwenAktyèl - nòmbPwen };
        });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Ventes', 'Itilize Pwen Fidélité',
                `${nòmbPwen} pwen`, `${rezilta.valèItilize} HTG rabè`
            ).catch(err => console.warn('Audit log echwe:', err));
        }

        return rezilta;
    }

    async function retireCashback(kliyanId) {
        const bizRef = getBizRef();
        const fidèlRef = bizRef.collection('fidelite').doc(kliyanId);

        const rezilta = await window.db.runTransaction(async (transaction) => {
            const doc = await transaction.get(fidèlRef);
            if (!doc.exists) throw new Error("Kliyan sa a pa gen kont fidélité.");
            const cashbackAktyèl = doc.data().cashbackAkimile || 0;
            if (cashbackAktyèl <= 0) throw new Error("Pa gen cashback disponib.");

            transaction.update(fidèlRef, { cashbackAkimile: 0 });
            return { montan: cashbackAktyèl };
        });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Ventes', 'Retire Cashback', kliyanId, `${rezilta.montan} HTG`
            ).catch(err => console.warn('Audit log echwe:', err));
        }

        return rezilta;
    }

    return {
        TAUX_PWEN, VALÈ_PWEN_HTG, TAUX_CASHBACK,
        ajoutePwenApreVant, getFideliteByCustomer, itilizePwen, retireCashback
    };
})();

window.FideliteService = FideliteService;
