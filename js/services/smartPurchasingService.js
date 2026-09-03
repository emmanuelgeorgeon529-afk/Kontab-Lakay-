// smartPurchasingService.js — Modil 12.7 : Smart Purchasing
// NÒT ONÈT: 'founise' pa gen chan délai/kalite — SA PA EGZISTE nan done a.
// Sèvis sa a sèlman konpare PRI ISTORIK reyèl (acha.atik[].priInite) pa
// founisè, pou pwodwi ki nan stock ba. Si Emmanuel vle konparezon
// délai/kalite pita, sa mande ajoute chan sa yo nan founise/acha anvan.

const SmartPurchasingService = (function () {

  function getBizRef() {
    if (!window.currentCompanyId) throw new Error("Pa gen biznis aktif chwazi.");
    return window.db.collection('biznis').doc(window.currentCompanyId);
  }

  /**
   * @param {number} limitPwodwi - konbyen pwodwi (stock ba) pou analize (defo 5)
   * @param {number} jouIstorik - konbyen jou istorik acha pou gade (defo 180)
   */
  async function getRekòmandasyonAcha(limitPwodwi = 5, jouIstorik = 180) {
    const bizRef = getBizRef();
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - jouIstorik);

    const [pwodwiSnap, achaSnap] = await Promise.all([
      bizRef.collection('pwodwi').where('aktif', '==', true).get(),
      bizRef.collection('acha').where('dat', '>=', dateLimit).orderBy('dat', 'desc').limit(500).get()
    ]);

    const pwodwiBa = pwodwiSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(p => (p.kantiteStock || 0) <= (p.stockMinimum || 5))
      .slice(0, limitPwodwi);

    const achaList = achaSnap.docs.map(d => d.data()).filter(a => a.estati !== 'anile');

    return pwodwiBa.map(p => {
      const paFounise = {};
      achaList.forEach(a => {
        const liy = (a.atik || []).find(x => x.pwodwiId === p.id);
        if (!liy) return;
        const f = paFounise[a.founiseId] || (paFounise[a.founiseId] = {
          founiseId: a.founiseId, founiseNon: a.founiseNon, kantite: 0, total: 0, dènyeAchat: null
        });
        f.kantite += liy.kantite;
        f.total += liy.kantite * liy.priInite;
        const dat = a.dat?.toDate ? a.dat.toDate() : new Date(a.dat);
        if (!f.dènyeAchat || dat > f.dènyeAchat) f.dènyeAchat = dat;
      });

      const touFounise = Object.values(paFounise)
        .map(f => ({ ...f, priMoyen: f.kantite > 0 ? f.total / f.kantite : 0 }))
        .sort((a, b) => a.priMoyen - b.priMoyen);

      return {
        pwodwiId: p.id, pwodwiNon: p.non, stockAktyèl: p.kantiteStock || 0,
        founiseRekòmande: touFounise[0] || null,
        touFounise
      };
    }).filter(r => r.founiseRekòmande);
  }

  return { getRekòmandasyonAcha };
})();

window.SmartPurchasingService = SmartPurchasingService;
