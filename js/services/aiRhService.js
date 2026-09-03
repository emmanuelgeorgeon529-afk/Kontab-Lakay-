// aiRhService.js — Modil 12.10 : Analiz RH (rule-based, PA yon LLM)
// Li sèvis RhService.js + koleksyon prezans/avans_sale dirèkteman — pa modifye rhService.js.
// NÒT: "Reta" PA kalkile — estrikti 'shifts[]' (lè kòmansman ofisyèl) pa konfime.
// Sèlman Absans kalkile (jou biznis san pwentaj, eskli jou konje Apwouve).

const AiRhService = (function () {

  function getBizRef() {
    if (!window.currentCompanyId) throw new Error("Pa gen biznis aktif chwazi.");
    return window.db.collection('biznis').doc(window.currentCompanyId);
  }

  function _dateStr(d) {
    return d.toISOString().slice(0, 10);
  }

  async function _getAbsansAnalyse(jouAnaliz) {
    const bizRef = getBizRef();
    const jodiya = new Date();
    const dateLimitStr = _dateStr(new Date(jodiya.getTime() - jouAnaliz * 86400000));

    const [anplwayeList, prezansSnap, konjeSnap] = await Promise.all([
      window.RhService.listeAnplwayeAktif(window.currentCompanyId),
      bizRef.collection('prezans').where('dat', '>=', dateLimitStr).get(),
      bizRef.collection('demann_konje').where('estati', '==', 'Apwouve').get()
    ]);

    const prezansPaAnplwaye = {};
    prezansSnap.docs.forEach(d => {
      const p = d.data();
      (prezansPaAnplwaye[p.anplwayeId] = prezansPaAnplwaye[p.anplwayeId] || []).push(p);
    });

    const konjePaAnplwaye = {};
    konjeSnap.docs.forEach(d => {
      const k = d.data();
      (konjePaAnplwaye[k.anplwayeId] = konjePaAnplwaye[k.anplwayeId] || []).push(k);
    });

    const jouBiznis = [];
    for (let i = 0; i < jouAnaliz; i++) {
      const d = new Date(jodiya.getTime() - i * 86400000);
      const jou = d.getDay();
      if (jou !== 0 && jou !== 6) jouBiznis.push(_dateStr(d));
    }

    function _anKonje(anplwayeId, datStr) {
      return (konjePaAnplwaye[anplwayeId] || []).some(k => k.datDebi <= datStr && datStr <= k.datFen);
    }

    const paAnplwaye = anplwayeList.map(a => {
      const jouPrezan = new Set((prezansPaAnplwaye[a.id] || []).map(p => p.dat));
      const absans = jouBiznis.filter(d => !jouPrezan.has(d) && !_anKonje(a.id, d)).length;
      return { anplwayeId: a.id, non: a.non, depatman: a.depatman || '—', absans };
    }).sort((a, b) => b.absans - a.absans);

    const totalAbsans = paAnplwaye.reduce((s, a) => s + a.absans, 0);
    return { paAnplwaye, totalAbsans, jouAnalize: jouBiznis.length, totalAnplwaye: anplwayeList.length };
  }

  /**
   * @param {number} jouAnaliz - fenèt kalandriye pou absans (defo 14)
   */
  async function getAnalizRh(jouAnaliz = 14) {
    const bizRef = getBizRef();
    const bizId = window.currentCompanyId;

    const [absansData, anKonje, kontraKapExpire, evalyasyon, fòmasyon, avansSnap] = await Promise.all([
      _getAbsansAnalyse(jouAnaliz),
      window.RhService.listeAnplwayeAnKonjeKounyeya(bizId),
      window.RhService.listeKontraKapExpire(bizId, 30),
      window.RhService.listeEvalyasyon(bizId, 20),
      window.RhService.listeFòmasyon(bizId, 10),
      bizRef.collection('avans_sale').where('estati', '==', 'Apwouve').where('rekipere', '==', false).get()
    ]);

    const avansNonRekipere = avansSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const totalAvansNonRekipere = avansNonRekipere.reduce((s, a) => s + (a.montan || 0), 0);

    const rekòmandasyon = [];
    if (kontraKapExpire.length > 0) {
      rekòmandasyon.push(`${kontraKapExpire.length} kontra CDD ap ekspire nan 30 pwochen jou — planifye renouvèlman oswa fen kontra.`);
    }
    const anplwayeAbsansRepete = absansData.paAnplwaye.filter(a => a.absans >= 3);
    if (anplwayeAbsansRepete.length > 0) {
      rekòmandasyon.push(`${anplwayeAbsansRepete.length} anplwaye gen 3+ absans nan ${absansData.jouAnalize} jou biznis — revize sitiyasyon yo.`);
    }
    if (totalAvansNonRekipere > 0) {
      rekòmandasyon.push(`${Math.round(totalAvansNonRekipere).toLocaleString()} HTG an avans salè poko rekipere — konfime dediksyon sou pwochen pewòl.`);
    }
    if (!rekòmandasyon.length) {
      rekòmandasyon.push('Pa gen siyal RH enkyetan detekte kounye a.');
    }

    return {
      totalAnplwaye: absansData.totalAnplwaye,
      anKonje,
      kontraKapExpire: kontraKapExpire.length,
      totalAbsans: absansData.totalAbsans,
      jouAnalize: absansData.jouAnalize,
      absansParAnplwaye: absansData.paAnplwaye.filter(a => a.absans > 0).slice(0, 10),
      nbEvalyasyon: evalyasyon.length,
      nbFòmasyon: fòmasyon.length,
      totalAvansNonRekipere,
      nbAvansNonRekipere: avansNonRekipere.length,
      rekòmandasyon,
      retaDisponib: false
    };
  }

  return { getAnalizRh };
})();

window.AiRhService = AiRhService;
