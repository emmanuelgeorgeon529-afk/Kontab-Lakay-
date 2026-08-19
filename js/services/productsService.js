// js/services/productsService.js
// Depann de window.db (inisyalize nan config.js) ak window.currentCompanyId, window.AdminService

const ProductsService = (() => {

    function getBizRef() {
        if (!window.currentCompanyId) throw new Error("Pa gen biznis aktif chwazi.");
        return window.db.collection('biznis').doc(window.currentCompanyId);
    }

    // ---------- KREYE PWODWI ----------

    /**
     * @param {Object} data
     *   data.non         - non pwodwi
     *   data.sku         - kòd SKU (opsyonèl)
     *   data.barcode     - kòd bar (opsyonèl)
     *   data.kategori    - kategori pwodwi
     *   data.priAchat    - pri acha (kout)
     *   data.priVente    - pri vann (detay)
     *   data.kantiteStock- kantite inisyal nan stock
     *   data.stockMinimum- sèy pou alèt stock ba
     *   data.inite       - inite (Pyès, Sac, Litre, Kg, elt.)
     */
    async function createProduct(data) {
        if (!data.non || !data.non.trim()) {
            throw new Error("Non pwodwi a obligatwa.");
        }
        if (data.priVente == null || data.priVente < 0) {
            throw new Error("Pri vann pa valid.");
        }

        const bizRef = getBizRef();
        const pwodwiRef = bizRef.collection('pwodwi').doc();

        await pwodwiRef.set({
            non: data.non.trim(),
            sku: data.sku || null,
            barcode: data.barcode || null,
            kategori: data.kategori || 'Divès',
            priAchat: data.priAchat || 0,
            priVente: data.priVente,
            kantiteStock: data.kantiteStock || 0,
            stockMinimum: data.stockMinimum || 5,
            inite: data.inite || 'Pyès',
            aktif: true,
            dat: firebase.firestore.FieldValue.serverTimestamp()
        });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId,
                'Pwodwi',
                'Kreye Pwodwi',
                '—',
                `${data.non.trim()} (${data.priVente} HTG)`
            ).catch(err => console.warn('Audit log echwe:', err));
        }

        return { id: pwodwiRef.id };
    }

    // ---------- LI PWODWI YO ----------

    async function getProducts(onlyActive = true) {
        const bizRef = getBizRef();
        let query = bizRef.collection('pwodwi').orderBy('non', 'asc');
        if (onlyActive) {
            query = query.where('aktif', '==', true);
        }
        const snapshot = await query.get();
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    async function getProductById(productId) {
        const bizRef = getBizRef();
        const doc = await bizRef.collection('pwodwi').doc(productId).get();
        if (!doc.exists) throw new Error("Pwodwi sa a pa egziste.");
        return { id: doc.id, ...doc.data() };
    }

    // ---------- MODIFYE PWODWI (enfòmasyon jeneral, PA stock) ----------

    async function updateProduct(productId, updates) {
        const bizRef = getBizRef();
        const allowedFields = ['non', 'sku', 'barcode', 'kategori', 'priAchat', 'priVente', 'stockMinimum', 'inite'];
        const cleanUpdates = {};
        allowedFields.forEach(f => {
            if (updates[f] !== undefined) cleanUpdates[f] = updates[f];
        });
        if (Object.keys(cleanUpdates).length === 0) {
            throw new Error("Pa gen chan valid pou modifye.");
        }
        await bizRef.collection('pwodwi').doc(productId).update(cleanUpdates);

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId,
                'Pwodwi',
                'Modifye Pwodwi',
                productId,
                JSON.stringify(cleanUpdates)
            ).catch(err => console.warn('Audit log echwe:', err));
        }
    }

    // ---------- AJISTMAN STOCK MANYÈL (transaksyon separe de vant) ----------

    /**
     * @param {string} productId
     * @param {number} kantiteChanjman - pozitif (antre) oswa negatif (sòti)
     * @param {string} rezon - "Enventè Fizik", "Domaje", "Resepsyon", elt.
     */
    async function adjustStock(productId, kantiteChanjman, rezon) {
        if (!kantiteChanjman || kantiteChanjman === 0) {
            throw new Error("Kantite ajistman dwe diferan de 0.");
        }
        if (!rezon || !rezon.trim()) {
            throw new Error("Rezon ajistman an obligatwa.");
        }

        const bizRef = getBizRef();

        const rezilta = await window.db.runTransaction(async (transaction) => {
            const pwodwiRef = bizRef.collection('pwodwi').doc(productId);
            const pwodwiDoc = await transaction.get(pwodwiRef);
            if (!pwodwiDoc.exists) throw new Error("Pwodwi sa a pa egziste.");

            const stockAktyèl = pwodwiDoc.data().kantiteStock || 0;
            const nouvoStock = stockAktyèl + kantiteChanjman;

            if (nouvoStock < 0) {
                throw new Error(`Ajistman sa a ta fè stock la negatif (rete: ${stockAktyèl}, chanjman: ${kantiteChanjman}).`);
            }

            transaction.update(pwodwiRef, { kantiteStock: nouvoStock });

            const ajistmanRef = bizRef.collection('ajistman_stock').doc();
            transaction.set(ajistmanRef, {
                pwodwiId: productId,
                pwodwiNon: pwodwiDoc.data().non,
                stockAvan: stockAktyèl,
                kantiteChanjman: kantiteChanjman,
                stockApre: nouvoStock,
                rezon: rezon.trim(),
                dat: firebase.firestore.FieldValue.serverTimestamp(),
                itilizatèId: window.auth?.currentUser?.uid || null
            });

            return { stockAvan: stockAktyèl, stockApre: nouvoStock, pwodwiNon: pwodwiDoc.data().non };
        });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId,
                'Pwodwi',
                `Ajistman Stock (${rezon.trim()})`,
                `${rezilta.pwodwiNon}: ${rezilta.stockAvan}`,
                `${rezilta.stockApre}`
            ).catch(err => console.warn('Audit log echwe:', err));
        }

        return { stockAvan: rezilta.stockAvan, stockApre: rezilta.stockApre };
    }

    // ---------- DEZAKTIVE (JAMAIS DELETE) ----------

    async function deactivateProduct(productId) {
        const bizRef = getBizRef();
        await bizRef.collection('pwodwi').doc(productId).update({ aktif: false });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId,
                'Pwodwi',
                'Dezaktive Pwodwi',
                'aktif',
                'dezaktive'
            ).catch(err => console.warn('Audit log echwe:', err));
        }
    }

    async function reactivateProduct(productId) {
        const bizRef = getBizRef();
        await bizRef.collection('pwodwi').doc(productId).update({ aktif: true });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId,
                'Pwodwi',
                'Reaktive Pwodwi',
                'dezaktive',
                'aktif'
            ).catch(err => console.warn('Audit log echwe:', err));
        }
    }

    // ---------- PWODWI AK STOCK BA (pou alèt) ----------

    async function getLowStockProducts() {
        const bizRef = getBizRef();
        const snapshot = await bizRef.collection('pwodwi')
            .where('aktif', '==', true)
            .get();

        return snapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(p => (p.kantiteStock || 0) <= (p.stockMinimum || 5));
    }

    // ---------- API PIBLIK ----------
    return {
        createProduct,
        getProducts,
        getProductById,
        updateProduct,
        adjustStock,
        deactivateProduct,
        reactivateProduct,
        getLowStockProducts
    };
})();

window.ProductsService = ProductsService;
