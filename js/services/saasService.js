// js/services/saasService.js
// Sèvis pou Modil 10 — SaaS, Localisation & Paramètres Globaux
// NÒT: peyi/deviz/lang/taks se DONE GLOBAL pataje ant tout biznis, estoke nan
// paramet_fiskal_global/{peyiCode} (write:false, jere manyèlman via Firebase Console,
// paske pa gen Cloud Functions sou Spark plan).
// "Aktivasyon" pa biznis (ki lang/peyi/deviz biznis la itilize) estoke nan
// biznis/{bizId}/paramet/general.
// Depann de window.db (defini nan config.js)

(function () {
  const db = window.db;

  // ---------- 10.1 / 10.2 / 10.3 / 10.6 — KATALÒG GLOBAL (peyi/deviz/lang/taks) ----------

  async function getPeyiGlobalList() {
    const snap = await db.collection('paramet_fiskal_global').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  function abònmanPeyiGlobal(callback) {
    return db.collection('paramet_fiskal_global')
      .onSnapshot(snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }

  // ---------- 10.3 — LANG AKTIF PA BIZNIS ----------

  async function getLokalizasyonBiznis(bizId) {
    const ref = db.collection('biznis').doc(bizId).collection('paramet').doc('general');
    const snap = await ref.get();
    const done = snap.exists ? snap.data() : {};
    return done.localization || { defaultCurrency: 'HTG', langAktif: ['Kreyòl', 'Français', 'English'] };
  }

  function abònmanLokalizasyonBiznis(bizId, callback) {
    const ref = db.collection('biznis').doc(bizId).collection('paramet').doc('general');
    return ref.onSnapshot(snap => {
      const done = snap.exists ? snap.data() : {};
      callback(done.localization || { defaultCurrency: 'HTG', langAktif: ['Kreyòl', 'Français', 'English'] });
    });
  }

  async function aktyalizeLangAktifBiznis(bizId, lang, aktif) {
    const ref = db.collection('biznis').doc(bizId).collection('paramet').doc('general');
    await ref.set({
      localization: {
        langAktif: aktif
          ? firebase.firestore.FieldValue.arrayUnion(lang)
          : firebase.firestore.FieldValue.arrayRemove(lang)
      }
    }, { merge: true });
    await window.AdminService?.anrejistreLog(bizId, 'SaaS', aktif ? 'Aktive Lang' : 'Dezaktive Lang', '—', lang);
  }

  // ---------- 10.4 / 10.5 — DEVIZ & TAUX DE CHANGE ----------

  async function getTauxChangeIstorik(bizId, limit = 50) {
    const snap = await db.collection('biznis').doc(bizId)
      .collection('tauxChange')
      .orderBy('dat', 'desc')
      .limit(limit)
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  function abònmanTauxChange(bizId, callback, limit = 10) {
    return db.collection('biznis').doc(bizId)
      .collection('tauxChange')
      .orderBy('dat', 'desc')
      .limit(limit)
      .onSnapshot(snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }

  async function ajouteTauxChangeManyèl(bizId, devizSous, devizDestinasyon, to) {
    if (!devizSous || !devizDestinasyon || !to || to <= 0) {
      throw new Error('Deviz sous, deviz destinasyon ak to chanj (pozitif) obligatwa');
    }
    const ref = db.collection('biznis').doc(bizId).collection('tauxChange').doc();
    await ref.set({
      devizSous, devizDestinasyon, to: Number(to),
      sous: 'manyèl',
      dat: firebase.firestore.FieldValue.serverTimestamp()
    });
    await window.AdminService?.anrejistreLog(bizId, 'SaaS', 'Ajoute Taux Chanj Manyèl', '—', `${devizSous}→${devizDestinasyon}: ${to}`);
    return ref.id;
  }

  // Rele API gratis open.er-api.com (san kle, san Cloud Function — konvni pou Spark plan).
  // Yon sèl apèl ak base=HTG bay tout to yo; nou envèse yo pou jwenn "konbyen HTG pou 1 deviz etranje".
  async function ajouteTauxChangeAPI(bizId, listDevizSible) {
    const rep = await fetch('https://open.er-api.com/v6/latest/HTG');
    const done = await rep.json();
    if (done.result !== 'success') throw new Error('API to chanj pa reponn kòrèkteman');

    const batch = db.batch();
    const rezilta = [];
    for (const kod of listDevizSible) {
      const tauxHtgVèDeviz = done.rates?.[kod];
      if (!tauxHtgVèDeviz) continue;
      const toChanj = 1 / tauxHtgVèDeviz; // konbyen HTG pou 1 inite deviz sa a
      const ref = db.collection('biznis').doc(bizId).collection('tauxChange').doc();
      batch.set(ref, {
        devizSous: kod, devizDestinasyon: 'HTG', to: Number(toChanj.toFixed(4)),
        sous: 'api',
        dat: firebase.firestore.FieldValue.serverTimestamp()
      });
      rezilta.push(kod);
    }
    await batch.commit();
    await window.AdminService?.anrejistreLog(bizId, 'SaaS', 'Ajoute Taux Chanj API', '—', rezilta.join(', '));
    return rezilta;
  }

  async function aktyalizeDevizParamBiznis(bizId, patch) {
    const ref = db.collection('biznis').doc(bizId).collection('paramet').doc('general');
    await ref.set({ localization: { devizPa: patch } }, { merge: true });
  }

  // ---------- 10.9 — ABÒNMAN SAAS ----------

  const PLAN_VALID = ['Starter', 'Professional', 'Enterprise'];

  async function getAbònmanBiznis(bizId) {
    const ref = db.collection('biznis').doc(bizId).collection('abònman').doc('aktyèl');
    const snap = await ref.get();
    return snap.exists ? snap.data() : { plan: 'Starter', estati: 'aktif' };
  }

  function abònmanAbònmanBiznis(bizId, callback) {
    return db.collection('biznis').doc(bizId).collection('abònman').doc('aktyèl')
      .onSnapshot(snap => callback(snap.exists ? snap.data() : { plan: 'Starter', estati: 'aktif' }));
  }

  async function chanjePlanAbònman(bizId, nouvoPlan) {
    if (!PLAN_VALID.includes(nouvoPlan)) throw new Error(`Plan "${nouvoPlan}" pa valid`);
    const ref = db.collection('biznis').doc(bizId).collection('abònman').doc('aktyèl');
    await ref.set({
      plan: nouvoPlan,
      estati: 'aktif',
      dateChanjman: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    await window.AdminService?.anrejistreLog(bizId, 'SaaS', 'Chanje Plan Abònman', '—', nouvoPlan);
  }

  // ---------- 10.10 — GESTION DES LICENCES ----------

  async function getLisansBiznis(bizId) {
    const ref = db.collection('biznis').doc(bizId).collection('lisans').doc('aktyèl');
    const snap = await ref.get();
    return snap.exists ? snap.data() : null;
  }

  function abònmanLisansBiznis(bizId, callback) {
    return db.collection('biznis').doc(bizId).collection('lisans').doc('aktyèl')
      .onSnapshot(snap => callback(snap.exists ? snap.data() : null));
  }

  async function jenereLisans(bizId, plan) {
    const nimewo = 'LIC-' + Math.floor(10000 + Math.random() * 89999);
    const dateEkspirasyon = new Date();
    dateEkspirasyon.setFullYear(dateEkspirasyon.getFullYear() + 1);

    const ref = db.collection('biznis').doc(bizId).collection('lisans').doc('aktyèl');
    await ref.set({
      nimewo, plan,
      dateEkspirasyon: dateEkspirasyon.toISOString().split('T')[0],
      estati: 'aktif',
      dateJenerasyon: firebase.firestore.FieldValue.serverTimestamp()
    });
    await window.AdminService?.anrejistreLog(bizId, 'SaaS', 'Jenere Lisans', '—', nimewo);
    return nimewo;
  }

  // ---------- 10.11 — INTÉGRATION API ----------
  // NÒT: sou Spark plan san Cloud Functions, pa gen OAuth reyèl posib isit la.
  // "Konekte" senpleman anrejistre entansyon/estati nan Firestore — konvni pou demo
  // ak fiti entegrasyon manyèl (ex: kle API antre a la men).

  const SÈVIS_API_DISPONIB = [
    { id: 'gmail', non: '📧 Gmail' },
    { id: 'google_drive', non: '📂 Google Drive' },
    { id: 'whatsapp', non: '💬 WhatsApp Business' },
    { id: 'openai', non: '🤖 OpenAI' }
  ];

  function abònmanIntegrasyon(bizId, callback) {
    return db.collection('biznis').doc(bizId).collection('integrasyon')
      .onSnapshot(snap => {
        const done = {};
        snap.docs.forEach(d => { done[d.id] = d.data(); });
        callback(done);
      });
  }

  async function konekteIntegrasyon(bizId, sèvisId, non) {
    await db.collection('biznis').doc(bizId).collection('integrasyon').doc(sèvisId).set({
      non, konekte: true,
      dateConeksyon: firebase.firestore.FieldValue.serverTimestamp()
    });
    await window.AdminService?.anrejistreLog(bizId, 'SaaS', 'Konekte Entegrasyon', '—', non);
  }

  async function dekonekteIntegrasyon(bizId, sèvisId) {
    await db.collection('biznis').doc(bizId).collection('integrasyon').doc(sèvisId)
      .update({ konekte: false });
    await window.AdminService?.anrejistreLog(bizId, 'SaaS', 'Dekonekte Entegrasyon', 'konekte', 'dekonekte');
  }

  // ---------- 10.12 — PARAMÈTRES INTERFACE ----------

  async function getParamInterface(bizId) {
    const ref = db.collection('biznis').doc(bizId).collection('paramet').doc('general');
    const snap = await ref.get();
    const done = snap.exists ? snap.data() : {};
    return done.interface || { tèm: 'light', koulèPrimè: '#4F46E5' };
  }

  async function aktyalizeParamInterface(bizId, patch) {
    const ref = db.collection('biznis').doc(bizId).collection('paramet').doc('general');
    await ref.set({ interface: patch }, { merge: true });
  }

  // ---------- 10.13 — NOTIFICATIONS GLOBALES ----------

  async function getNotifikasyonKanal(bizId) {
    const ref = db.collection('biznis').doc(bizId).collection('paramet').doc('general');
    const snap = await ref.get();
    const done = snap.exists ? snap.data() : {};
    return done.notifikasyonKanal || { email: true, push: true, whatsapp: false, sms: false };
  }

  async function aktyalizeNotifikasyonKanal(bizId, kanal, aktif) {
    const ref = db.collection('biznis').doc(bizId).collection('paramet').doc('general');
    await ref.set({ notifikasyonKanal: { [kanal]: aktif } }, { merge: true });
  }

  // ---------- API PIBLIK ----------

  window.SaasService = {
    getPeyiGlobalList, abònmanPeyiGlobal,
    getLokalizasyonBiznis, abònmanLokalizasyonBiznis, aktyalizeLangAktifBiznis,
    getTauxChangeIstorik, abònmanTauxChange, ajouteTauxChangeManyèl, ajouteTauxChangeAPI,
    aktyalizeDevizParamBiznis,
    getAbònmanBiznis, abònmanAbònmanBiznis, chanjePlanAbònman, PLAN_VALID,
    getLisansBiznis, abònmanLisansBiznis, jenereLisans,
    SÈVIS_API_DISPONIB, abònmanIntegrasyon, konekteIntegrasyon, dekonekteIntegrasyon,
    getParamInterface, aktyalizeParamInterface,
    getNotifikasyonKanal, aktyalizeNotifikasyonKanal
  };
})();
