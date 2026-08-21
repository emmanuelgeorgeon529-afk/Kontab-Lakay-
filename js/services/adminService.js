// js/services/adminService.js
// Sèvis pou jesyon Itilizatè, Wòl/Pèmisyon (RBAC), Workflow Apwobasyon,
// Multi-Biznis/Succursales, Depatman/Pòs, Sessions, Audit Log, ak Notifikasyon
// NÒT: tout non koleksyon/chan ASCII-safe (san aksan) pou konpatibilite ak Firestore Rules
// NÒT: rasin koleksyon an rele "biznis" (matche salesService.js/purchasesService.js/etc.)
// Depann de window.db ak window.auth (defini nan config.js)

(function () {
  const db = window.db;

  const WOL_VALID = [
    'Propriyete',
    'Administrate',
    'Direkte',
    'Kontable',
    'Vande',
    'Magasinier',
    'Komis'
  ];

  const PEMISYON_PA_WOL = {
    'Propriyete':    { tout: true },
    'Administrate':  { tout: true },
    'Direkte':       { rapò: true, aprouve: true, vant: 'li', acha: 'li' },
    'Kontable':      { kontabilite: true, rapò: true, kès: true },
    'Vande':         { vant: 'ekri', kliyan: 'ekri' },
    'Magasinier':    { enventè: 'ekri', pwodwi: 'li' },
    'Komis':         { vant: 'li' }
  };

  const MODIL_LIS = [
    'vant', 'acha', 'kès', 'depans', 'enventè',
    'kliyan', 'founisè', 'rapò', 'kontabilite', 'aprouve'
  ];

  const SÈY_APWOBASYON = 50000; // HTG

  const ETAP_WORKFLOW = ['an_atant', 'apwouve_manadjè', 'apwouve_direktè', 'egzekite', 'rejte'];

  // ---------- ITILIZATE ----------

  async function kreyeItilizate(bizId, itilizateData) {
    if (!bizId || !itilizateData?.imèl || !itilizateData?.wol) {
      throw new Error('Done itilizate yo enkonplè (bizId, imèl, wol obligatwa)');
    }
    if (!WOL_VALID.includes(itilizateData.wol)) {
      throw new Error(`Wol "${itilizateData.wol}" pa valid`);
    }

    const itilizateRef = db
      .collection('biznis').doc(bizId)
      .collection('itilizate').doc();

    await db.runTransaction(async (tx) => {
      const kIm = await tx.get(
        db.collection('biznis').doc(bizId)
          .collection('itilizate')
          .where('imèl', '==', itilizateData.imèl)
      );
      if (!kIm.empty) {
        throw new Error('Yon itilizate ak imèl sa a deja egziste');
      }

      tx.set(itilizateRef, {
        non: itilizateData.non,
        imèl: itilizateData.imèl,
        depatman: itilizateData.depatman || null,
        pos: itilizateData.pos || null,
        wol: itilizateData.wol,
        pèmisyon: PEMISYON_PA_WOL[itilizateData.wol] || {},
        estati: 'aktif',
        dateKreyasyon: firebase.firestore.FieldValue.serverTimestamp(),
        kreyePa: window.auth?.currentUser?.uid || null
      });
    });

    return itilizateRef.id;
  }

  async function chanjeEstatiItilizate(bizId, itilizateId, nouvoEstati) {
    const estatiValid = ['aktif', 'sispann', 'dezaktive'];
    if (!estatiValid.includes(nouvoEstati)) {
      throw new Error('Estati pa valid');
    }
    const ref = db.collection('biznis').doc(bizId)
      .collection('itilizate').doc(itilizateId);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error('Itilizate pa jwenn');
      tx.update(ref, {
        estati: nouvoEstati,
        dateModifikasyon: firebase.firestore.FieldValue.serverTimestamp(),
        modifyePa: window.auth?.currentUser?.uid || null
      });
    });
  }

  async function chanjeWolItilizate(bizId, itilizateId, nouvoWol) {
    if (!WOL_VALID.includes(nouvoWol)) {
      throw new Error(`Wol "${nouvoWol}" pa valid`);
    }
    const ref = db.collection('biznis').doc(bizId)
      .collection('itilizate').doc(itilizateId);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error('Itilizate pa jwenn');
      tx.update(ref, {
        wol: nouvoWol,
        pèmisyon: PEMISYON_PA_WOL[nouvoWol] || {},
        dateModifikasyon: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
  }

  function abònmanItilizate(bizId, callback) {
    return db.collection('biznis').doc(bizId)
      .collection('itilizate')
      .orderBy('dateKreyasyon', 'desc')
      .onSnapshot((snap) => {
        const lis = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(lis);
      });
  }

  function genPèmisyon(itilizate, modil, nivo) {
    if (!itilizate || itilizate.estati !== 'aktif') return false;
    const p = itilizate.pèmisyon || {};
    if (p.tout) return true;
    if (!(modil in p)) return false;
    if (p[modil] === true) return true;
    if (nivo === 'li') return p[modil] === 'li' || p[modil] === 'ekri';
    if (nivo === 'ekri') return p[modil] === 'ekri';
    return false;
  }

  // ---------- PÈMISYON PÈSONALIZE PA BIZNIS ----------

  async function jwennPèmisyonBiznis(bizId) {
    const ref = db.collection('biznis').doc(bizId)
      .collection('paramet').doc('pèmisyon');
    const snap = await ref.get();
    if (snap.exists) return snap.data();
    return { ...PEMISYON_PA_WOL };
  }

  async function aktyaliizePèmisyonWol(bizId, wol, pèmisyonObj) {
    if (!WOL_VALID.includes(wol)) throw new Error(`Wol "${wol}" pa valid`);

    const ref = db.collection('biznis').doc(bizId)
      .collection('paramet').doc('pèmisyon');

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const done = snap.exists ? snap.data() : { ...PEMISYON_PA_WOL };
      done[wol] = pèmisyonObj;
      tx.set(ref, done, { merge: true });
    });

    const itilizateSnap = await db.collection('biznis').doc(bizId)
      .collection('itilizate').where('wol', '==', wol).get();

    const batch = db.batch();
    itilizateSnap.docs.forEach(d => {
      batch.update(d.ref, { pèmisyon: pèmisyonObj });
    });
    await batch.commit();
  }

  function abònmanPèmisyon(bizId, callback) {
    return db.collection('biznis').doc(bizId)
      .collection('paramet').doc('pèmisyon')
      .onSnapshot((snap) => {
        callback(snap.exists ? snap.data() : { ...PEMISYON_PA_WOL });
      });
  }

  // ---------- WORKFLOW APWOBASYON ----------

  async function soumèTDemandApwobasyon(bizId, demandData) {
    if (!demandData?.tip || !demandData?.montan || !demandData?.refDokiman) {
      throw new Error('Done demand enkonplè (tip, montan, refDokiman obligatwa)');
    }

    const ref = db.collection('biznis').doc(bizId)
      .collection('demandApwobasyon').doc();

    await db.runTransaction(async (tx) => {
      tx.set(ref, {
        tip: demandData.tip,
        refDokiman: demandData.refDokiman,
        montan: demandData.montan,
        deskripsyon: demandData.deskripsyon || '',
        estati: 'an_atant',
        soumètPa: window.auth?.currentUser?.uid || null,
        dateSoumèt: firebase.firestore.FieldValue.serverTimestamp(),
        istorik: [{
          etap: 'an_atant',
          pa: window.auth?.currentUser?.uid || null,
          dat: new Date().toISOString()
        }]
      });
    });

    return ref.id;
  }

  async function apwouveDemand(bizId, demandId, etapAktyèl) {
    const ref = db.collection('biznis').doc(bizId)
      .collection('demandApwobasyon').doc(demandId);

    const pwochenEtap = {
      manadjè: 'apwouve_manadjè',
      direktè: 'apwouve_direktè'
    };

    if (!pwochenEtap[etapAktyèl]) throw new Error('Etap pa valid');

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error('Demand pa jwenn');
      const done = snap.data();

      if (done.estati === 'rejte' || done.estati === 'egzekite') {
        throw new Error(`Demand sa a deja ${done.estati}, ou pa ka aji sou li ankò`);
      }

      const nouvoEstati = pwochenEtap[etapAktyèl];
      const istorikAjoute = {
        etap: nouvoEstati,
        pa: window.auth?.currentUser?.uid || null,
        dat: new Date().toISOString()
      };

      tx.update(ref, {
        estati: nouvoEstati,
        istorik: firebase.firestore.FieldValue.arrayUnion(istorikAjoute)
      });
    });
  }

  async function rejteDemand(bizId, demandId, rezon) {
    const ref = db.collection('biznis').doc(bizId)
      .collection('demandApwobasyon').doc(demandId);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error('Demand pa jwenn');
      if (snap.data().estati === 'egzekite') {
        throw new Error('Demand deja egzekite, pa ka rejte');
      }

      tx.update(ref, {
        estati: 'rejte',
        rezonRejè: rezon || '',
        istorik: firebase.firestore.FieldValue.arrayUnion({
          etap: 'rejte',
          pa: window.auth?.currentUser?.uid || null,
          dat: new Date().toISOString(),
          rezon: rezon || ''
        })
      });
    });
  }

  async function egzekiteDemand(bizId, demandId) {
    const ref = db.collection('biznis').doc(bizId)
      .collection('demandApwobasyon').doc(demandId);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error('Demand pa jwenn');
      if (snap.data().estati !== 'apwouve_direktè') {
        throw new Error('Demand dwe apwouve pa Direktè anvan egzekisyon');
      }

      tx.update(ref, {
        estati: 'egzekite',
        istorik: firebase.firestore.FieldValue.arrayUnion({
          etap: 'egzekite',
          pa: window.auth?.currentUser?.uid || null,
          dat: new Date().toISOString()
        })
      });
    });
  }

  function abònmanDemandApwobasyon(bizId, callback) {
    return db.collection('biznis').doc(bizId)
      .collection('demandApwobasyon')
      .orderBy('dateSoumèt', 'desc')
      .onSnapshot((snap) => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
  }

  // ---------- 1.1 PROFIL ANTREPRIZ ----------

  function abònmanProfilAntrepriz(bizId, callback) {
    return db.collection('biznis').doc(bizId)
      .onSnapshot(snap => callback(snap.exists ? snap.data() : {}));
  }

  async function aktyalizeProfilAntrepriz(bizId, done) {
    await db.collection('biznis').doc(bizId).set(done, { merge: true });
    await anrejistreLog(bizId, 'Administrasyon', 'Modifye Profil Antrepriz', '—', done.nonAntrepriz || '');
  }

  // ---------- 1.2 MULTI-BIZNIS ----------

  async function kreyeBiznis(pwopriyetèId, bizData) {
    if (!bizData?.nonAntrepriz) throw new Error('Non antrepriz obligatwa');
    const ref = db.collection('biznis').doc();
    await ref.set({
      nonAntrepriz: bizData.nonAntrepriz,
      pwopriyetèId,
      estati: 'aktif',
      dateKreyasyon: firebase.firestore.FieldValue.serverTimestamp()
    });
    return ref.id;
  }

  function abònmanBiznisPa(pwopriyetèId, callback) {
    return db.collection('biznis')
      .where('pwopriyetèId', '==', pwopriyetèId)
      .onSnapshot(snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }

  async function chanjeEstatiBiznis(bizId, nouvoEstati) {
    const valid = ['aktif', 'dezaktive'];
    if (!valid.includes(nouvoEstati)) throw new Error('Estati pa valid');
    await db.collection('biznis').doc(bizId).update({ estati: nouvoEstati });
  }

  // ---------- 1.3 MULTI-SUCCURSALES ----------

  async function kreyeSuccursale(bizId, succData) {
    if (!succData?.non) throw new Error('Non succursale obligatwa');
    const ref = db.collection('biznis').doc(bizId)
      .collection('succursale').doc();
    await ref.set({
      non: succData.non,
      adrès: succData.adrès || '',
      estati: 'aktif',
      dateKreyasyon: firebase.firestore.FieldValue.serverTimestamp()
    });
    return ref.id;
  }

  function abònmanSuccursale(bizId, callback) {
    return db.collection('biznis').doc(bizId)
      .collection('succursale')
      .onSnapshot(snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }

  // ---------- 1.5 DEPATMAN ----------

  async function kreyeDepatman(bizId, depatmanData) {
    if (!depatmanData?.non) throw new Error('Non depatman an obligatwa.');

    const ref = db.collection('biznis').doc(bizId)
      .collection('depatman').doc();

    await ref.set({
      non: depatmanData.non.trim(),
      parantId: depatmanData.parantId || null,
      aktif: true,
      dateKreyasyon: firebase.firestore.FieldValue.serverTimestamp()
    });

    await anrejistreLog(bizId, 'Administrasyon', 'Kreye Depatman', '—', depatmanData.non.trim());
    return ref.id;
  }

  function abònmanDepatman(bizId, callback) {
    return db.collection('biznis').doc(bizId)
      .collection('depatman')
      .where('aktif', '==', true)
      .onSnapshot(snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }

  async function dezaktiveDepatman(bizId, depatmanId) {
    await db.collection('biznis').doc(bizId)
      .collection('depatman').doc(depatmanId)
      .update({ aktif: false });
    await anrejistreLog(bizId, 'Administrasyon', 'Dezaktive Depatman', 'aktif', 'dezaktive');
  }

  // ---------- 1.6 POS (Postes) ----------

  async function kreyePos(bizId, posData) {
    if (!posData?.non) throw new Error('Non pòs la obligatwa.');

    const ref = db.collection('biznis').doc(bizId)
      .collection('pos').doc();

    await ref.set({
      non: posData.non.trim(),
      depatmanId: posData.depatmanId || null,
      aktif: true,
      dateKreyasyon: firebase.firestore.FieldValue.serverTimestamp()
    });

    await anrejistreLog(bizId, 'Administrasyon', 'Kreye Pòs', '—', posData.non.trim());
    return ref.id;
  }

  function abònmanPos(bizId, callback) {
    return db.collection('biznis').doc(bizId)
      .collection('pos')
      .where('aktif', '==', true)
      .onSnapshot(snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }

  async function dezaktivePos(bizId, posId) {
    await db.collection('biznis').doc(bizId)
      .collection('pos').doc(posId)
      .update({ aktif: false });
    await anrejistreLog(bizId, 'Administrasyon', 'Dezaktive Pòs', 'aktif', 'dezaktive');
  }

  // ---------- 1.10 SESSIONS AKTIF ----------

  async function anrejistreSession(bizId, itilizateId, sessionInfo) {
    const ref = db.collection('biznis').doc(bizId)
      .collection('sessions').doc();
    await ref.set({
      itilizateId,
      itilizateNon: sessionInfo.non || '',
      aparèy: sessionInfo.aparèy || 'Enkoni',
      navigatè: sessionInfo.navigatè || 'Enkoni',
      dateKoneksyon: firebase.firestore.FieldValue.serverTimestamp(),
      aktif: true
    });
    return ref.id;
  }

  async function fèmenSession(bizId, sessionId) {
    await db.collection('biznis').doc(bizId)
      .collection('sessions').doc(sessionId)
      .update({ aktif: false, dateFèmen: firebase.firestore.FieldValue.serverTimestamp() });
  }

  function abònmanSessionsAktif(bizId, callback) {
    return db.collection('biznis').doc(bizId)
      .collection('sessions')
      .where('aktif', '==', true)
      .onSnapshot(snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }

  // ---------- 1.11 AUDIT LOGS ----------

  async function anrejistreLog(bizId, modil, aksyon, ansyenValè, nouvoValè) {
    const ref = db.collection('biznis').doc(bizId)
      .collection('auditLog').doc();
    await ref.set({
      itilizateId: window.auth?.currentUser?.uid || null,
      itilizateNon: window.auth?.currentUser?.displayName || 'Sistèm',
      modil,
      aksyon,
      ansyenValè: String(ansyenValè ?? '—'),
      nouvoValè: String(nouvoValè ?? '—'),
      dat: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  function abònmanAuditLog(bizId, callback, limit = 50) {
    return db.collection('biznis').doc(bizId)
      .collection('auditLog')
      .orderBy('dat', 'desc')
      .limit(limit)
      .onSnapshot(snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }

  // ---------- 1.12 NOTIFIKASYON ADMINISTRATIF ----------

  /**
   * @param {string} bizId
   * @param {Object} notifData
   *   notifData.mesaj (obligatwa)
   *   notifData.destinataireId (OBLIGATWA — UID itilizatè ki resevwa notifikasyon an,
   *     egzije pa firestore.rules pou izole lekti pa itilizatè)
   *   notifData.severite ('ijan' | 'atansyon' | 'enfo', default 'atansyon')
   */
  async function kreyeNotifikasyon(bizId, notifData) {
    if (!notifData?.destinataireId) {
      throw new Error('destinataireId obligatwa pou kreye yon notifikasyon (egzije pa règ sekirite).');
    }
    const ref = db.collection('biznis').doc(bizId)
      .collection('notifikasyon').doc();
    await ref.set({
      mesaj: notifData.mesaj,
      severite: notifData.severite || 'atansyon',
      destinataireId: notifData.destinataireId,
      rezoud: false,
      dateKreyasyon: firebase.firestore.FieldValue.serverTimestamp()
    });
    return ref.id;
  }

  async function rezoudNotifikasyon(bizId, notifId) {
    await db.collection('biznis').doc(bizId)
      .collection('notifikasyon').doc(notifId)
      .update({ rezoud: true, dateRezoud: firebase.firestore.FieldValue.serverTimestamp() });
  }

  // NÒT: kounye a limite a notifikasyon PWOP itilizatè konekte a (matche règ sekirite)
  function abònmanNotifikasyon(bizId, callback) {
    const uid = window.auth?.currentUser?.uid;
    if (!uid) {
      console.warn('abònmanNotifikasyon: pa gen itilizatè konekte');
      return () => {};
    }
    return db.collection('biznis').doc(bizId)
      .collection('notifikasyon')
      .where('destinataireId', '==', uid)
      .where('rezoud', '==', false)
      .onSnapshot(snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }

  // ---------- API PIBLIK ----------

  window.AdminService = {
    WOL_VALID, MODIL_LIS, SÈY_APWOBASYON, ETAP_WORKFLOW,
    kreyeItilizate, chanjeEstatiItilizate, chanjeWolItilizate, abònmanItilizate, genPèmisyon,
    jwennPèmisyonBiznis, aktyaliizePèmisyonWol, abònmanPèmisyon,
    soumèTDemandApwobasyon, apwouveDemand, rejteDemand, egzekiteDemand, abònmanDemandApwobasyon,
    abònmanProfilAntrepriz, aktyalizeProfilAntrepriz,
    kreyeBiznis, abònmanBiznisPa, chanjeEstatiBiznis,
    kreyeSuccursale, abònmanSuccursale,
    kreyeDepatman, abònmanDepatman, dezaktiveDepatman,
    kreyePos, abònmanPos, dezaktivePos,
    anrejistreSession, fèmenSession, abònmanSessionsAktif,
    anrejistreLog, abònmanAuditLog,
    kreyeNotifikasyon, rezoudNotifikasyon, abònmanNotifikasyon
  };
})();
