// js/services/ecomSyncService.js
// Achitekti adapter jenerik pou senkwonizasyon Marketplace/Meta.
// San Cloud Functions (plan Spark), sa rete DEKLANCHE MANYÈLMAN
// pa yon anplwaye (bouton "Senkwonize Kounye a"), pa yon webhook otomatik.

const EcomSyncService = (() => {

    function getBizRef() {
        if (!window.currentCompanyId) throw new Error("Pa gen biznis aktif chwazi.");
        return window.db.collection('biznis').doc(window.currentCompanyId);
    }

    // NÒT: adapter reyèl yo (apèl API Meta/Shopify/WooCommerce) mande kle
    // API sekrè ki PA ka viv nan kliyan/navigatè — sa mande yon backend
    // (Cloud Functions, plan Blaze). Chak adapter se yon "stub" pou kounye a.

    const ADAPTERS = {
        meta: {
            non: 'Facebook & Instagram Shop',
            async senkwonize() {
                throw new Error("Entegrasyon Meta mande yon backend (Cloud Functions) ki poko konfigire.");
            }
        },
        shopify: { non: 'Shopify', async senkwonize() { throw new Error("Entegrasyon Shopify poko konfigire."); } },
        woocommerce: { non: 'WooCommerce', async senkwonize() { throw new Error("Entegrasyon WooCommerce poko konfigire."); } },
        amazon: { non: 'Amazon', async senkwonize() { throw new Error("Entegrasyon Amazon poko konfigire."); } },
        ebay: { non: 'eBay', async senkwonize() { throw new Error("Entegrasyon eBay poko konfigire."); } }
    };

    async function senkwonizeKounyeA(adapterKey) {
        const adapter = ADAPTERS[adapterKey];
        if (!adapter) throw new Error("Adapter enkoni.");

        const bizRef = getBizRef();
        const logRef = bizRef.collection('ecom_sync_log').doc();

        try {
            const rezilta = await adapter.senkwonize(bizRef);
            await logRef.set({
                adapter: adapterKey, adapterNon: adapter.non,
                estati: 'siksè', rezilta,
                dat: firebase.firestore.FieldValue.serverTimestamp()
            });
            return rezilta;
        } catch (e) {
            await logRef.set({
                adapter: adapterKey, adapterNon: adapter.non,
                estati: 'echwe', erè: e.message,
                dat: firebase.firestore.FieldValue.serverTimestamp()
            });
            throw e;
        }
    }

    async function getSyncLog(limitCount = 20) {
        const bizRef = getBizRef();
        const snapshot = await bizRef.collection('ecom_sync_log')
            .orderBy('dat', 'desc').limit(limitCount).get();
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    return { ADAPTERS, senkwonizeKounyeA, getSyncLog };
})();

window.EcomSyncService = EcomSyncService;
