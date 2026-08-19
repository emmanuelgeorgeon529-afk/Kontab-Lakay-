// js/services/promotionsService.js
// Depann de window.db, window.currentCompanyId, window.AdminService

const PromotionsService = (() => {

    function getBizRef() {
        if (!window.currentCompanyId) throw new Error("Pa gen biznis aktif chwazi.");
        return window.db.collection('biznis').doc(window.currentCompanyId);
    }

    const TIP_VALID = ['rabè_pousantaj', 'rabè_montan', 'buy1get1', 'promo_sezonye'];

    /**
     * @param {Object} data
     *   data.kòd          - kòd promo (ex: "SOLDE10")
     *   data.tip           - youn nan TIP_VALID
     *   data.valè          - pousantaj oswa montan (selon tip)
     *   data.dateDebut, dateFen - ISO date strings
     *   data.pwodwiIds     - [] limite promo a a sèten pwodwi (vid = tout)
     */
    async function createPromotion(data) {
        if (!data.kòd || !data.kòd.trim()) throw new Error("Kòd promo obligatwa.");
        if (!TIP_VALID.includes(data.tip)) throw new Error("Tip promo pa valid.");
        if (!data.dateDebut || !data.dateFen) throw new Error("Dat kòmansman ak fen obligatwa.");

        const bizRef = getBizRef();
        const promoRef = bizRef.collection('promotion').doc();

        await promoRef.set({
            kòd: data.kòd.trim().toUpperCase(),
            tip: data.tip,
            valè: data.valè || 0,
            dateDebut: firebase.firestore.Timestamp.fromDate(new Date(data.dateDebut)),
            dateFen: firebase.firestore.Timestamp.fromDate(new Date(data.dateFen)),
            pwodwiIds: data.pwodwiIds || [],
            aktif: true,
            nòmbFwaItilize: 0,
            dat: firebase.firestore.FieldValue.serverTimestamp()
        });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Ventes', 'Kreye Promosyon', '—', data.kòd.trim().toUpperCase()
            ).catch(err => console.warn('Audit log echwe:', err));
        }

        return { id: promoRef.id };
    }

    async function getPromotions(onlyActive = true) {
        const bizRef = getBizRef();
        let query = bizRef.collection('promotion').orderBy('dat', 'desc');
        if (onlyActive) query = query.where('aktif', '==', true);
        const snapshot = await query.get();
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    // ---------- VERIFYE ET APLIKE YON KÒD PROMO (rele pandan yon vant) ----------

    async function validatePromoCode(kòd, pwodwiId) {
        const bizRef = getBizRef();
        const snapshot = await bizRef.collection('promotion')
            .where('kòd', '==', kòd.trim().toUpperCase())
            .where('aktif', '==', true)
            .limit(1)
            .get();

        if (snapshot.empty) throw new Error("Kòd promo sa a pa valid oswa li ekspire.");

        const promo = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        const kounyeA = new Date();

        if (kounyeA < promo.dateDebut.toDate() || kounyeA > promo.dateFen.toDate()) {
            throw new Error("Kòd promo sa a pa aktif nan dat sa a.");
        }
        if (promo.pwodwiIds.length > 0 && pwodwiId && !promo.pwodwiIds.includes(pwodwiId)) {
            throw new Error("Kòd promo sa a pa aplikab pou pwodwi sa a.");
        }

        return promo; // { tip, valè, ... } — VentesUI konvèti sa an rabais/remise pou DiscountEngine
    }

    async function recordPromoUsage(promoId) {
        const bizRef = getBizRef();
        await bizRef.collection('promotion').doc(promoId).update({
            nòmbFwaItilize: firebase.firestore.FieldValue.increment(1)
        });
    }

    async function deactivatePromotion(promoId) {
        const bizRef = getBizRef();
        await bizRef.collection('promotion').doc(promoId).update({ aktif: false });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Ventes', 'Dezaktive Promosyon', 'aktif', 'dezaktive'
            ).catch(err => console.warn('Audit log echwe:', err));
        }
    }

    return {
        TIP_VALID,
        createPromotion, getPromotions,
        validatePromoCode, recordPromoUsage, deactivatePromotion
    };
})();

window.PromotionsService = PromotionsService;
