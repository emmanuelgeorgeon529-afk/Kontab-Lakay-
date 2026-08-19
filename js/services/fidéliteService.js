// js/services/fidéliteService.js
// Depann de window.db, window.currentCompanyId, window.AdminService

const FidéliteService = (() => {

    function getBizRef() {
        if (!window.currentCompanyId) throw new Error("Pa gen biznis aktif chwazi.");
        return window.db.collection('biznis').doc(window.currentCompanyId);
    }

    const TAUX_PWEN = 1;        // 1 pwen pou chak 100 HTG depanse
    const VALÈ_PWEN_HTG = 1;    // 1 pwen = 1 HTG lè kliyan sèvi ak li
    const TAUX_CASHBACK = 0.02; // 2% cashback otomatik

    // ---------- AJOUTE PWEN APRE YON VANT (rele pa salesService/ventes_ui) ----------

    async function ajoutePwenApreVant(kliyanId, montanVant) {
        if (!kliyanId) return; // Kliyan Divès pa gen kont fidélité

        const pwenGanye = Math.floor((montanVant / 100) * TAUX_PWEN);
        const cashback = montanVant * TAUX_CASHBACK;
        if (pwenGanye === 0 && cashback === 0) return;

        const bizRef = getBizRef();
        const fidèlRef = bizRef.collection('fidélité').doc(kliyanId);

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

    async function getFidéliteByCustomer(kliyanId) {
        const bizRef = getBizRef();
        const doc = await bizRef.collection('fidélité').doc(kliyanId).get();
        if (!doc.exists) return { pwenAkimile: 0, cashbackAkimile: 0 };
        return doc.data();
    }

    // ---------- SÈVI AK PWEN (rediksyon sou pwochen vant) ----------

    async function itilizePwen(kliyanId, nòmbPwen) {
        if (!nòmbPwen || nòmbPwen <= 0) throw new Error("Nòmb pwen dwe pi gran pase 0.");

        const bizRef = getBizRef();
        const fidèlRef = bizRef.collection('fidélité').doc(kliyanId);

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

        return rezilta; // ventes_ui aplike valèItilize kòm yon remise sou fakti a
    }

    // ---------- RETIRE CASHBACK (kliyan mande peman cashback li) ----------

    async function retireCashback(kliyanId) {
        const bizRef = getBizRef();
        const fidèlRef = bizRef.collection('fidélité').doc(kliyanId);

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
        ajoutePwenApreVant, getFidéliteByCustomer, itilizePwen, retireCashback
    };
})();

window.FidéliteService = FidéliteService;
