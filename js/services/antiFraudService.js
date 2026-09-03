// antiFraudService.js — Modil 12.2/12.3 : Deteksyon Anti-Fwod & Risk Score (rule-based)
// Li dirèkteman soti nan koleksyon sous yo (lavant, ajistman_stock, chanjman_pri)
// + auditLog pou anilasyon vant. Pa gen apèl AI/LLM — 100% konpatib Firebase Spark plan.
// Depann de window.db, window.currentCompanyId (menm konvansyon ak SalesService/ProductsService)

const AntiFraudService = (function () {

  const SEUY_PRI_POUSANTAJ = 15;
  const SEUY_PRI_KRITIK = 40;
  const SEUY_STOCK_MASIV = 5;
  const FENN_MASIV_MIN = 30;
  const SEUY_GWO_TRANZAKSYON = 100000;
  const SEUY_REZON_VAG = 8;
  const SEUY_RANBOUSE_RAPID = 3;
  const LÈ_TRAVAY_DEB = 6;
  const LÈ_TRAVAY_FEN = 21;

  function getBizRef() {
    if (!window.currentCompanyId) throw new Error("Pa gen biznis aktif chwazi.");
    return window.db.collection('biznis').doc(window.currentCompanyId);
  }

  function _toDate(v) {
    return v ? (v.toDate ? v.toDate() : new Date(v)) : null;
  }

  function _dateLimit(jou) {
    const d = new Date();
    d.setDate(d.getDate() - jou);
    return d;
  }

  async function _alètAnilasyonVant(bizRef, dateLimit) {
    const snap = await bizRef.collection('auditLog')
      .where('modil', '==', 'Ventes')
      .where('aksyon', '==', 'Anile Vant')
      .where('dat', '>=', dateLimit)
      .orderBy('dat', 'desc').limit(200).get();

    return snap.docs.map(d => {
      const l = d.data();
      const nimewoFakti = l.ansyenValè || '—';
      const rezon = (l.nouvoValè || '').replace('RV — rezon: ', '').trim();
      const rezonVag = rezon.length < SEUY_REZON_VAG;
      return {
        id: `anile_${d.id}`, itilizateId: l.itilizateId, itilizateNon: l.itilizateNon,
        aksyon: 'Anile Vant', dat: l.dat, ansyenValè: nimewoFakti,
        nouvoValè: rezon || '(vid)',
        risk: rezonVag ? 75 : 40,
        rezon: rezonVag ? 'Rezon anilasyon two vag/kout' : 'Vant anile',
        severite: rezonVag ? 'ijan' : 'atansyon',
        icon: rezonVag ? '🔴' : '🟠',
        aksyonRekòmande: 'Egzamine'
      };
    }).filter(a => a.risk >= 40);
  }

  async function _alètChanjmanPri(bizRef, dateLimit) {
    const snap = await bizRef.collection('chanjman_pri')
      .where('dat', '>=', dateLimit).orderBy('dat', 'desc').limit(200).get();
    const alèt = [];
    snap.docs.forEach(d => {
      const l = d.data();
      const anP = Number(l.priAvan), noP = Number(l.priApre);
      if (!anP || anP <= 0) return;
      const pousantaj = Math.abs((noP - anP) / anP) * 100;
      if (pousantaj < SEUY_PRI_POUSANTAJ) return;
      const risk = pousantaj >= SEUY_PRI_KRITIK ? 87 : 60;
      alèt.push({
        id: `pri_${d.id}`, itilizateId: l.itilizatèId, itilizateNon: '—',
        aksyon: 'Modifikasyon Pri', dat: l.dat, ansyenValè: anP, nouvoValè: noP,
        risk, rezon: `${l.pwodwiNon || ''} — chanjman ${pousantaj.toFixed(0)}%`,
        severite: risk >= 70 ? 'ijan' : 'atansyon', icon: risk >= 70 ? '🔴' : '🟠',
        aksyonRekòmande: 'Egzamine'
      });
    });
    return alèt;
  }

  async function _alètStockMasiv(bizRef, dateLimit) {
    const snap = await bizRef.collection('ajistman_stock')
      .where('dat', '>=', dateLimit).orderBy('dat', 'desc').limit(300).get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const gwoup = {};
    items.forEach(l => {
      if (!l.itilizatèId || !l.dat) return;
      (gwoup[l.itilizatèId] = gwoup[l.itilizatèId] || []).push(l);
    });
    const alèt = [];
    Object.entries(gwoup).forEach(([uid, list]) => {
      list.sort((a, b) => _toDate(a.dat) - _toDate(b.dat));
      for (let i = 0; i < list.length; i++) {
        let konte = 1;
        const tDeb = _toDate(list[i].dat);
        for (let j = i + 1; j < list.length; j++) {
          if ((_toDate(list[j].dat) - tDeb) / 60000 <= FENN_MASIV_MIN) konte++;
          else break;
        }
        if (konte >= SEUY_STOCK_MASIV) {
          alèt.push({
            id: `stock_${list[i].id}`, itilizateId: uid, itilizateNon: '—',
            aksyon: 'Ajistman Stock Masiv', dat: list[i].dat, ansyenValè: '—',
            nouvoValè: `${konte} ajistman / ${FENN_MASIV_MIN}min`, risk: 70,
            rezon: 'Plizyè ajistman stock nan menm fenèt tan', severite: 'ijan', icon: '🔴',
            aksyonRekòmande: 'Egzamine'
          });
          break;
        }
      }
    });
    return alèt;
  }

  async function _alètGwoTranzaksyon(bizRef, dateLimit) {
    const snap = await bizRef.collection('lavant')
      .where('dat', '>=', dateLimit).orderBy('dat', 'desc').limit(300).get();
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(v => (v.total || 0) >= SEUY_GWO_TRANZAKSYON && v.estati !== 'anile')
      .map(v => ({
        id: `gwo_${v.id}`, itilizateId: v.vandèId, itilizateNon: '—',
        aksyon: 'Gwo Tranzaksyon', dat: v.dat, ansyenValè: '—',
        nouvoValè: `${v.nimewoFakti} — ${(v.total || 0).toLocaleString()} HTG`,
        risk: 45, rezon: `Depase sèy ${SEUY_GWO_TRANZAKSYON.toLocaleString()} HTG`,
        severite: 'atansyon', icon: '🟠', aksyonRekòmande: 'Egzamine'
      }));
  }

  // ---------- Règ 5 : Ranbousman (Avoir) repetitif pou menm kliyan ----------
  // NÒT: koleksyon 'avoir' pa gen itilizatèId (se yon evènman ki lye ak KLIYAN, pa anplwaye)
  async function _alètRanbousmanRapid(bizRef, dateLimit) {
    const snap = await bizRef.collection('avoir')
      .where('dat', '>=', dateLimit).orderBy('dat', 'desc').limit(300).get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const gwoup = {};
    items.forEach(l => {
      if (!l.clientId) return;
      (gwoup[l.clientId] = gwoup[l.clientId] || []).push(l);
    });
    const alèt = [];
    Object.entries(gwoup).forEach(([cid, list]) => {
      if (list.length >= SEUY_RANBOUSE_RAPID) {
        const total = list.reduce((s, l) => s + (l.montantTTC || 0), 0);
        alèt.push({
          id: `avoir_${cid}`, itilizateId: null, itilizateNon: '—',
          kliyanId: cid, kliyanNon: list[0].clientNon || '—',
          aksyon: 'Ranbousman Repetitif', dat: list[0].dat, ansyenValè: '—',
          nouvoValè: `${list.length} avoir — ${total.toLocaleString()} HTG`,
          risk: 55, rezon: 'Plizyè ranbousman pou menm kliyan', severite: 'atansyon', icon: '🟠',
          aksyonRekòmande: 'Egzamine'
        });
      }
    });
    return alèt;
  }

  async function getAlètAntiFwod(jouAnyè = 30) {
    const bizRef = getBizRef();
    const dateLimit = _dateLimit(jouAnyè);
    const [anilasyon, pri, stock, gwo, ranbousman] = await Promise.all([
      _alètAnilasyonVant(bizRef, dateLimit),
      _alètChanjmanPri(bizRef, dateLimit),
      _alètStockMasiv(bizRef, dateLimit),
      _alètGwoTranzaksyon(bizRef, dateLimit),
      _alètRanbousmanRapid(bizRef, dateLimit)
    ]);
    return [...anilasyon, ...pri, ...stock, ...gwo, ...ranbousman].sort((a, b) => b.risk - a.risk);
  }

  async function getRiskScoreParItilizate(jouAnyè = 30) {
    const alèt = await getAlètAntiFwod(jouAnyè);
    const paItilizate = {};
    const initU = (uid, non) => paItilizate[uid] || (paItilizate[uid] = {
      itilizateId: uid, itilizateNon: non || '—', score: 0, detay: []
    });
    alèt.forEach(a => {
      if (!a.itilizateId) return;
      const u = initU(a.itilizateId, a.itilizateNon);
      u.score = Math.min(100, u.score + Math.round(a.risk * 0.4));
      u.detay.push(a.aksyon);
    });
    return Object.values(paItilizate).sort((a, b) => b.score - a.score);
  }

  function getNivoRisk(score) {
    if (score >= 70) return { label: 'Wo', bg: '#FEE2E2', color: '#B91C1C' };
    if (score >= 35) return { label: 'Mwayen', bg: '#FEF3C7', color: '#B45309' };
    return { label: 'Ba', bg: '#D1FAE5', color: '#047857' };
  }

  return { getAlètAntiFwod, getRiskScoreParItilizate, getNivoRisk };
})();

window.AntiFraudService = AntiFraudService;
