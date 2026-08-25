// js/services/stockService.js
// Sèvis Stock pa Depo (Multi-Dépôt) — Modil 4.3
// Patwon: biznis/{bizId}/stock/{pwodwiId}__{depoId}
//
// 3 fason pou modifye stock pa depo anndan yon transaction:
//
//  A) ajisteStokDepo(pwodwiId, depoId, kantiteChanjman, transaction)
//     → GET + WRITE ansanm. SÈLMAN pou operasyon YON SÈL PWODWI
//       (egzanp: productsService.adjustStock()).
//
//  B) liStokPouTransaction(pwodwiId, depoId, transaction)  [GET sèlman]
//     + ekriStokPouTransaction(pwodwiId, depoId, stockAvan,
//       kantiteChanjman, transaction)  [WRITE sèlman, san GET]
//     → SEPARE espre pou operasyon PLIZYÈ PWODWI (Acha, Vant, SAV,
//       Transfè). Caller la DWE fè TOUT liStokPouTransaction() pou
//       tout liy yo AVAN nenpòt ekriStokPouTransaction(), sinon
//       Firestore ap jete erè "reads must come before writes".
//
// Depann de window.db, window.currentCompanyId

const StockService = (() => {

    function getBizRef() {
        if (!window.currentCompanyId) throw new Error("Pa gen biznis aktif chwazi.");
        return window.db.collection('biznis').doc(window.currentCompanyId);
    }

    // ---------- ID KONPOZE (evite doublons) ----------

    function stockDocId(pwodwiId, depoId) {
        if (!pwodwiId || !depoId) {
            throw new Error("pwodwiId ak depoId obligatwa pou fòme stockDocId.");
        }
        return `${pwodwiId}__${depoId}`;
    }

    function _stockRef(bizRef, pwodwiId, depoId) {
        return bizRef.collection('stock').doc(stockDocId(pwodwiId, depoId));
    }

    // ---------- LEKTI SENP (DEYÒ TRANSACTION) ----------
    // Itilize pou UI ki jis vle AFICHE stock aktyèl la (pa modifye l).

    async function getStockForProduct(pwodwiId, depoId) {
        const bizRef = getBizRef();
        const doc = await _stockRef(bizRef, pwodwiId, depoId).get();
        if (!doc.exists) {
            return { pwodwiId, depoId, kantiteStock: 0 };
        }
        return { id: doc.id, ...doc.data() };
    }

    // ---------- (A) HELPER TOUT-AN-YON — SÈLMAN 1 PWODWI ----------

    /**
     * GET + WRITE ansanm nan menm apèl. Sekiritè: si w rele sa plizyè
     * fwa nan menm transaction (yon fwa pa atik), 2yèm apèl la ap
     * kraze paske premye a deja fè yon WRITE. PA itilize l pou plizyè
     * atik — itilize (B) pi ba a pito.
     */
    async function ajisteStokDepo(pwodwiId, depoId, kantiteChanjman, transaction) {
        if (!transaction) {
            throw new Error("ajisteStokDepo() mande yon transaction Firestore deja louvri — pa rele l san sa.");
        }
        if (!kantiteChanjman || kantiteChanjman === 0) {
            throw new Error("Kantite chanjman dwe diferan de 0.");
        }

        const stockAvan = await liStokPouTransaction(pwodwiId, depoId, transaction);
        const rezilta = ekriStokPouTransaction(pwodwiId, depoId, stockAvan, kantiteChanjman, transaction);
        return rezilta;
    }

    // ---------- (B1) LEKTI SÈLMAN — pou plizyè atik, faz GET ----------

    /**
     * @returns {Promise<number>} kantite stock aktyèl nan depo sa a (0 si dokiman pa egziste)
     */
    async function liStokPouTransaction(pwodwiId, depoId, transaction) {
        if (!transaction) {
            throw new Error("liStokPouTransaction() mande yon transaction Firestore deja louvri.");
        }
        const bizRef = getBizRef();
        const stockRef = _stockRef(bizRef, pwodwiId, depoId);
        const stockDoc = await transaction.get(stockRef);
        return stockDoc.exists ? (stockDoc.data().kantiteStock || 0) : 0;
    }

    // ---------- (B2) EKRITI SÈLMAN — pou plizyè atik, faz WRITE (san okenn GET) ----------

    /**
     * @param {number} stockAvan - valè jwenn nan liStokPouTransaction() pi bonè nan menm transaction
     * @param {number} kantiteChanjman - pozitif oswa negatif
     * @returns {{stockDepoAvan:number, stockDepoApre:number}}
     */
    function ekriStokPouTransaction(pwodwiId, depoId, stockAvan, kantiteChanjman, transaction) {
        if (!transaction) {
            throw new Error("ekriStokPouTransaction() mande yon transaction Firestore deja louvri.");
        }
        if (!kantiteChanjman || kantiteChanjman === 0) {
            throw new Error("Kantite chanjman dwe diferan de 0.");
        }

        const stockApre = stockAvan + kantiteChanjman;
        if (stockApre < 0) {
            throw new Error(
                `Stock pa sifi nan depo sa a (rete: ${stockAvan}, chanjman mande: ${kantiteChanjman}).`
            );
        }

        const bizRef = getBizRef();
        const stockRef = _stockRef(bizRef, pwodwiId, depoId);

        transaction.set(stockRef, {
            pwodwiId,
            depoId,
            kantiteStock: stockApre,
            dateModifye: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        return { stockDepoAvan: stockAvan, stockDepoApre: stockApre };
    }

    // ---------- TRANSFÈ ANT DEPO ----------
    // Operasyon ENDEPANDAN — louvri PWÒP transaksyon pa l (pa yon helper
    // "transaction-aware" tankou ajisteStokDepo). Pa deplase pwodwi.kantiteStock
    // (total agrégé rete menm jan, machandiz la rete nan menm biznis la).

    /**
     * @param {string} pwodwiId
     * @param {string} depoSourceId
     * @param {string} depoDestId
     * @param {number} kantite - toujou pozitif
     * @param {string} [rezon] - opsyonèl
     */
    async function transferDepo(pwodwiId, depoSourceId, depoDestId, kantite, rezon) {
        if (depoSourceId === depoDestId) {
            throw new Error("Depo sous ak depo destinasyon pa ka menm depo a.");
        }
        if (!kantite || kantite <= 0) {
            throw new Error("Kantite transfè a dwe pi gran pase 0.");
        }

        const bizRef = getBizRef();

        const rezilta = await window.db.runTransaction(async (transaction) => {
            // ---- FAZ 1 : TOUT GET ----
            const pwodwiRef = bizRef.collection('pwodwi').doc(pwodwiId);
            const pwodwiDoc = await transaction.get(pwodwiRef);
            if (!pwodwiDoc.exists) throw new Error("Pwodwi sa a pa egziste.");

            const stockSourceAvan = await liStokPouTransaction(pwodwiId, depoSourceId, transaction);
            const stockDestAvan = await liStokPouTransaction(pwodwiId, depoDestId, transaction);

            // ---- FAZ 2 : TOUT WRITE ----
            const { stockDepoApre: stockSourceApre } =
                ekriStokPouTransaction(pwodwiId, depoSourceId, stockSourceAvan, -kantite, transaction);
            const { stockDepoApre: stockDestApre } =
                ekriStokPouTransaction(pwodwiId, depoDestId, stockDestAvan, kantite, transaction);

            const transferRef = bizRef.collection('transferans_depo').doc();
            transaction.set(transferRef, {
                pwodwiId,
                pwodwiNon: pwodwiDoc.data().non,
                depoSourceId,
                depoDestId,
                kantite,
                rezon: rezon || '',
                dat: firebase.firestore.FieldValue.serverTimestamp(),
                itilizatèId: window.auth?.currentUser?.uid || null
            });

            return { stockSourceApre, stockDestApre, pwodwiNon: pwodwiDoc.data().non };
        });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId,
                'Stock',
                'Transfè Ant Depo',
                `${rezilta.pwodwiNon} (${kantite})`,
                `${depoSourceId} → ${depoDestId}`
            ).catch(err => console.warn('Audit log echwe:', err));
        }

        return rezilta;
    }

    async function getTransfers(limitCount = 50) {
        const bizRef = getBizRef();
        const snapshot = await bizRef.collection('transferans_depo')
            .orderBy('dat', 'desc')
            .limit(limitCount)
            .get();
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    // ---------- API PIBLIK ----------
    return {
        stockDocId,
        getStockForProduct,
        ajisteStokDepo,
        liStokPouTransaction,
        ekriStokPouTransaction,
        transferDepo,
        getTransfers
    };
})();

window.StockService = StockService;
