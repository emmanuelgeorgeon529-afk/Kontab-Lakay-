// js/utils/discountEngine.js
// Mòtè kalkil rediksyon pataje ant salesService.js ak purchasesService.js
// Aplike RRR an kaskad (Rabais -> Remise -> Ristourne), separe Escompte.

const DiscountEngine = (() => {

    /**
     * Aplike yon sèl rediksyon (pousantaj oswa montan fiks) sou yon baz.
     * @param {number} baz
     * @param {{ valeur: number, estPousantaj: boolean }} reduction
     * @returns {{ montanReduksyon: number, rès: number }}
     */
    function aplikeReduksyon(baz, reduction) {
        if (!reduction || !reduction.valeur) {
            return { montanReduksyon: 0, rès: baz };
        }
        const montanReduksyon = reduction.estPousantaj
            ? baz * (reduction.valeur / 100)
            : reduction.valeur;

        if (montanReduksyon > baz) {
            throw new Error(`Rediksyon (${montanReduksyon}) pi gwo pase baz la (${baz}).`);
        }
        return { montanReduksyon, rès: baz - montanReduksyon };
    }

    /**
     * Kalkile pri final yon liy (yon atik) apati pri brit la, aplike
     * Rabais -> Remise -> Ristourne an kaskad, separe Escompte a,
     * epi aplike taks la sou net komèsyal la (pa sou net finansye a).
     *
     * @param {Object} params
     *   params.prixBrut       - Pri brit (Kantite x Pri Inite), anvan tout rediksyon
     *   params.rabais         - { valeur, estPousantaj } (opsyonèl)
     *   params.remise         - { valeur, estPousantaj } (opsyonèl)
     *   params.ristourne      - { valeur, estPousantaj } (opsyonèl)
     *   params.tauxEscompte   - pousantaj escompte si peman kach/rapid (opsyonèl, default 0)
     *   params.tauxTaks       - pousantaj taks (TCA/TVA), default 0
     *
     * @returns {Object} Detay konplè kalkil la, chak etap vizib pou fakti a
     */
    function calculeLiy(params) {
        const prixBrut = params.prixBrut || 0;
        const tauxTaks = params.tauxTaks || 0;
        const tauxEscompte = params.tauxEscompte || 0;

        // ---- KASKAD RRR (chak sou rès presedan an, PA sou prixBrut chak fwa) ----
        const étapRabais = aplikeReduksyon(prixBrut, params.rabais);
        const étapRemise = aplikeReduksyon(étapRabais.rès, params.remise);
        const étapRistourne = aplikeReduksyon(étapRemise.rès, params.ristourne);

        const netCommercial = étapRistourne.rès;

        // ---- TAKS sou Net Komèsyal (Escompte PA afekte baz taks la) ----
        const montanTaks = netCommercial * (tauxTaks / 100);
        const netAPayerAvanEscompte = netCommercial + montanTaks;

        // ---- ESCOMPTE — kalkile SEPAREMAN, pa mele nan pri fakti a ----
        const montanEscompte = tauxEscompte > 0
            ? netCommercial * (tauxEscompte / 100)
            : 0;

        return {
            prixBrut,
            rabais: étapRabais.montanReduksyon,
            remise: étapRemise.montanReduksyon,
            ristourne: étapRistourne.montanReduksyon,
            netCommercial,           // <- sa a ki parèt sou fakti a kòm "Net Commercial"
            montanTaks,
            netAPayer: netAPayerAvanEscompte,  // <- Total fakti — Escompte PA soustraktè isit
            montanEscompte,          // <- separe, anrejistre nan kont finansye apa si peman rapid fèt
            totalRRR: étapRabais.montanReduksyon + étapRemise.montanReduksyon + étapRistourne.montanReduksyon
        };
    }

    /**
     * Kalkile total plizyè liy (fakti konplè), ak rezime RRR ak taks.
     */
    function calculeFakti(liyParams) {
        const liyKalkile = liyParams.map(calculeLiy);

        const totaux = liyKalkile.reduce((acc, l) => ({
            prixBrut: acc.prixBrut + l.prixBrut,
            totalRRR: acc.totalRRR + l.totalRRR,
            netCommercial: acc.netCommercial + l.netCommercial,
            montanTaks: acc.montanTaks + l.montanTaks,
            netAPayer: acc.netAPayer + l.netAPayer,
            montanEscompte: acc.montanEscompte + l.montanEscompte
        }), { prixBrut: 0, totalRRR: 0, netCommercial: 0, montanTaks: 0, netAPayer: 0, montanEscompte: 0 });

        return { liy: liyKalkile, totaux };
    }

    return { aplikeReduksyon, calculeLiy, calculeFakti };
})();

window.DiscountEngine = DiscountEngine;
