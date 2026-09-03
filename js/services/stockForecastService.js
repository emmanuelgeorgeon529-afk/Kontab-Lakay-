// stockForecastService.js — Modil 12.4 : Prévision Stock
// Kalkile vitès vant reyèl (lavant/{jouAnaliz} jou) + stock aktyèl (pwodwi.kantiteStock)
// Pa gen chif fiks — 100% baze sou done Firestore reyèl.

const StockForecastService = (function () {

  function getBizRef() {
    if (!window.currentCompanyId) throw new Error("Pa gen biznis aktif chwazi.");
    return window.db.collection('biznis').doc(window.currentCompanyId);
  }

  async function _getKantiteVannPaPwodwi(bizRef, jouAnaliz) {
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - jouAnaliz);
    const snap = await bizRef.collection('lavant')
      .where('dat', '>=', dateLimit)
      .get();

    const kantitePaPwodwi = {};
    snap.docs.forEach(d => {
      const v = d.data();
      if (v.estati === 'anile') return; // eskli vant anile — pa reprezante demand reyèl
      (v.atik || []).forEach(a => {
        kantitePaPwodwi[a.pwodwiId] = (kantitePaPwodwi[a.pwodwiId] || 0) + (a.kantite || 0);
      });
    });
    return kantitePaPwodwi;
  }

  /**
   * @param {number} jouAnaliz - konbyen jou istorik pou kalkile vitès vant (defo 30)
   * @param {number} jouRekòmande - konbyen jou depo pou rekòmande nan kòmand (defo 14)
   */
  async function getPrevisionStock(jouAnaliz = 30, jouRekòmande = 14) {
    const bizRef = getBizRef();
    const [pwodwiSnap, kantitePaPwodwi] = await Promise.all([
      bizRef.collection('pwodwi').where('aktif', '==', true).get(),
      _getKantiteVannPaPwodwi(bizRef, jouAnaliz)
    ]);

    const rezilta = pwodwiSnap.docs.map(d => {
      const p = { id: d.id, ...d.data() };
      const totalVann = kantitePaPwodwi[p.id] || 0;
      const vitesseParJou = totalVann / jouAnaliz;
      const stockAktyèl = p.kantiteStock || 0;
      const jouRete = vitesseParJou > 0 ? Math.floor(stockAktyèl / vitesseParJou) : null;
      const rekòmande = vitesseParJou > 0 ? Math.ceil(vitesseParJou * jouRekòmande) : 0;

      let nivo;
      if (vitesseParJou === 0) nivo = 'san_done';
      else if (jouRete <= 7) nivo = 'kritik';
      else if (jouRete <= 21) nivo = 'atansyon';
      else nivo = 'ok';

      return {
        id: p.id, non: p.non, inite: p.inite || 'Pyès',
        stockAktyèl, stockMinimum: p.stockMinimum || 5,
        vitesseParJou: Math.round(vitesseParJou * 100) / 100,
        jouRete, rekòmande, nivo
      };
    });

    // Montre an priyorite sa ki pi kritik yo (jouRete pi kout anvan) ; san_done rete an ba
    return rezilta.sort((a, b) => {
      if (a.nivo === 'san_done' && b.nivo !== 'san_done') return 1;
      if (b.nivo === 'san_done' && a.nivo !== 'san_done') return -1;
      return (a.jouRete ?? Infinity) - (b.jouRete ?? Infinity);
    });
  }

  return { getPrevisionStock };
})();

window.StockForecastService = StockForecastService;
