// aiReportService.js — Modil 12.8 : Génération Rapports (rezime egzekitif rule-based)
// Reyitilize BiService (Modil 11) ak AntiFraudService (Modil 12.2) — pa gen LLM/AI reyèl,
// se konparezon chif reyèl + règ senp ki jenere fraz eksplikasyon yo.

const AiReportService = (function () {

  function _pousantaj(kounye, avan) {
    if (!avan) return null;
    return ((kounye - avan) / avan) * 100;
  }

  async function jenereRapòEgzekitif() {
    const [stats, fin, stock, klyan, alèt] = await Promise.all([
      window.BiService.getDashboardStats(),
      window.BiService.getFinancialAnalysis(),
      window.BiService.getStockAnalysis(),
      window.BiService.getClientAnalysis(),
      window.AntiFraudService?.getAlètAntiFwod ? window.AntiFraudService.getAlètAntiFwod(30) : Promise.resolve([])
    ]);

    const kwasansCA = _pousantaj(stats.revniMwa, stats.revniMwaPase);
    const kwasansDepans = _pousantaj(stats.depansMwa, stats.depansMwaPase);
    const kwasansBenefis = _pousantaj(stats.benefisNèt, stats.benefisMwaPase);
    const alètIjan = alèt.filter(a => a.severite === 'ijan').length;

    const eksplikasyon = [];
    if (kwasansDepans != null && kwasansCA != null && kwasansDepans > kwasansCA) {
      eksplikasyon.push(`Depans yo ogmante pi vit (${kwasansDepans.toFixed(0)}%) pase vant yo (${kwasansCA.toFixed(0)}%) mwa sa a — sa merite atansyon.`);
    }
    if (stock.stockFèb > 0) {
      eksplikasyon.push(`${stock.stockFèb} pwodwi rive nan stock ba — risk pou pèdi vant si yo pa ranouvle.`);
    }
    if (alètIjan > 0) {
      eksplikasyon.push(`${alètIjan} alèt risk ijan detekte nan 30 dènye jou yo (Modil 12.2) — verifye yo anvan yo vin pi grav.`);
    }
    if (klyan.inaktif > 0 && klyan.nouvoKliyan === 0) {
      eksplikasyon.push(`Pa gen nouvo kliyan mwa sa a, epi ${klyan.inaktif} kliyan inaktif — konsidere yon aksyon rekonkèt.`);
    }
    if (!eksplikasyon.length) {
      eksplikasyon.push('Pa gen siyal enkyetan detekte mwa sa a — sitiyasyon an sanble estab.');
    }

    return {
      chifAfèMwa: stats.revniMwa, kwasansCA,
      margeBrite: fin.margeBrute, margeNette: fin.margeNette,
      depansMwa: stats.depansMwa, kwasansDepans,
      benefisNèt: stats.benefisNèt, kwasansBenefis,
      stockKritik: stock.stockFèb,
      trezorriDisponib: stats.kesDisponib,
      alètIjan,
      eksplikasyon
    };
  }

  return { jenereRapòEgzekitif };
})();

window.AiReportService = AiReportService;
