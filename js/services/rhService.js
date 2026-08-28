const RhService = (() => {
  const db = firebase.firestore();
  function refAnplwaye(bizId, anplwayeId) {
    return db.collection('biznis').doc(bizId).collection('anplwaye').doc(anplwayeId);
  }
  function refDemanKonje(bizId, demanId) {
    return db.collection('biznis').doc(bizId).collection('demann_konje').doc(demanId);
  }
  async function kreyeAnplwaye(bizId, done, itilizateId) {
    const anplwayeRef = db.collection('biznis').doc(bizId).collection('anplwaye').doc();
    const payload = {
      non: done.non, depatman: done.depatman || '', pozisyon: done.pozisyon || '',
      tipKontra: done.tipKontra || 'CDI', salèBaz: Number(done.salèBaz) || 0,
      datAntre: done.datAntre || null, datFenKontra: done.datFenKontra || null,
      niFiskal: done.niFiskal || '', niONA: done.niONA || '',
      orèTravayId: done.orèTravayId || null,
      itilizateId: itilizateId || null, aktif: true, siprime: false,
      kreyeNan: firebase.firestore.FieldValue.serverTimestamp()
    };
    await anplwayeRef.set(payload);
    AdminService.anrejistreLog(bizId, 'RH', 'Kreye Anplwaye', '—', done.non)
      .catch(err => console.error('Erè audit log:', err));
    return anplwayeRef.id;
  }
  async function modifyeAnplwaye(bizId, anplwayeId, chanjman) {
    const ref = refAnplwaye(bizId, anplwayeId);
    let ansyenSalè = null;
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error('Anplwaye pa jwenn.');
      ansyenSalè = snap.data().salèBaz;
      tx.update(ref, { ...chanjman, modifyeNan: firebase.firestore.FieldValue.serverTimestamp() });
    });
    const detay = ('salèBaz' in chanjman) ? `Salè: ${ansyenSalè} -> ${chanjman.salèBaz}` : 'Modifikasyon dosye anplwaye';
    AdminService.anrejistreLog(bizId, 'RH', 'Modifye Anplwaye', '—', detay).catch(err => console.error(err));
  }
  async function dezaktiveAnplwaye(bizId, anplwayeId, rezon) {
    const ref = refAnplwaye(bizId, anplwayeId);
    await ref.update({ aktif: false, dezaktivenNan: firebase.firestore.FieldValue.serverTimestamp(), rezonDezaktivasyon: rezon || '' });
    AdminService.anrejistreLog(bizId, 'RH', 'Dezaktive Anplwaye', 'aktif', rezon ? `dezaktive: ${rezon}` : 'dezaktive').catch(err => console.error(err));
  }
  async function listeAnplwayeAktif(bizId) {
    const snap = await db.collection('biznis').doc(bizId).collection('anplwaye')
      .where('siprime', '==', false).where('aktif', '==', true).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async function listeTouAnplwaye(bizId) {
    const snap = await db.collection('biznis').doc(bizId).collection('anplwaye')
      .where('siprime', '==', false).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  // Lekti youn-fwa (pa onSnapshot) kont vrè koleksyon depatman/pos ki egziste nan adminService.js
  // (Modil 1 — Structure). RH pa modifye yo, sèlman li yo pou ranpli <select> nan modal anplwaye a.
  async function listeDepatmanAktif(bizId) {
    const snap = await db.collection('biznis').doc(bizId).collection('depatman')
      .where('aktif', '==', true).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async function listePosAktif(bizId) {
    const snap = await db.collection('biznis').doc(bizId).collection('pos')
      .where('aktif', '==', true).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async function listeKontraKapExpire(bizId, jouAvanti = 30) {
    const jodiya = new Date();
    const limit = new Date(jodiya.getTime() + jouAvanti * 24 * 60 * 60 * 1000);
    const snap = await db.collection('biznis').doc(bizId).collection('anplwaye')
      .where('siprime', '==', false).where('aktif', '==', true).where('tipKontra', '==', 'CDD').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .filter(a => a.datFenKontra && new Date(a.datFenKontra) <= limit);
  }

  async function soumetDemandKonje(bizId, itilizateId, anplwayeId, done) {
    const ref = db.collection('biznis').doc(bizId).collection('demann_konje').doc();
    await ref.set({
      anplwayeId, itilizateId, tip: done.tip, datDebi: done.datDebi, datFen: done.datFen,
      rezon: done.rezon || '', estati: 'AnAtant',
      soumetNan: firebase.firestore.FieldValue.serverTimestamp()
    });
    AdminService.anrejistreLog(bizId, 'RH', 'Soumèt Demann Konje', '—', `${done.tip} (${done.datDebi} - ${done.datFen})`)
      .catch(err => console.error('Erè audit log:', err));
    return ref.id;
  }

  async function tretDemandKonje(bizId, demanId, deSizyon, itilizateAdminId, motif) {
    const ref = refDemanKonje(bizId, demanId);
    await ref.update({
      estati: deSizyon, tretePa: itilizateAdminId,
      treteNan: firebase.firestore.FieldValue.serverTimestamp(), motifTretman: motif || ''
    });
    AdminService.anrejistreLog(bizId, 'RH', 'Trete Demann Konje', 'AnAtant', motif ? `${deSizyon}: ${motif}` : deSizyon)
      .catch(err => console.error('Erè audit log:', err));
  }

  async function listeTouDemandKonje(bizId, limit = 20) {
    const snap = await db.collection('biznis').doc(bizId).collection('demann_konje')
      .orderBy('soumetNan', 'desc').limit(limit).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async function listeAnplwayeAnKonjeKounyeya(bizId) {
    const jodiyaStr = new Date().toISOString().slice(0, 10);
    const snap = await db.collection('biznis').doc(bizId).collection('demann_konje')
      .where('estati', '==', 'Apwouve').get();
    const anKonje = snap.docs.map(d => d.data())
      .filter(k => k.datDebi <= jodiyaStr && jodiyaStr <= k.datFen);
    return anKonje.length;
  }

  // ---------- 6.8 AVANS SALÈ ----------

  function refAvans(bizId, avansId) {
    return db.collection('biznis').doc(bizId).collection('avans_sale').doc(avansId);
  }

  async function soumetAvansSale(bizId, itilizateId, anplwayeId, non, montan) {
    const ref = db.collection('biznis').doc(bizId).collection('avans_sale').doc();
    await ref.set({
      anplwayeId, non, itilizateId,
      montan: Number(montan) || 0,
      estati: 'AnAtant',
      rekipere: false,
      soumetNan: firebase.firestore.FieldValue.serverTimestamp()
    });
    AdminService.anrejistreLog(bizId, 'RH', 'Soumèt Demann Avans', '—', `${non}: ${montan} HTG`)
      .catch(err => console.error('Erè audit log:', err));
    return ref.id;
  }

  async function tretAvansSale(bizId, avansId, deSizyon, itilizateAdminId) {
    const ref = refAvans(bizId, avansId);
    await ref.update({
      estati: deSizyon, tretePa: itilizateAdminId,
      treteNan: firebase.firestore.FieldValue.serverTimestamp()
    });
    AdminService.anrejistreLog(bizId, 'RH', 'Trete Demann Avans', 'AnAtant', deSizyon)
      .catch(err => console.error('Erè audit log:', err));
  }

  async function listeTouAvansSale(bizId, limit = 20) {
    const snap = await db.collection('biznis').doc(bizId).collection('avans_sale')
      .orderBy('soumetNan', 'desc').limit(limit).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  // Avans APWOUVE ki poko dediwi sou okenn pewòl — itilize pa payrollService pou dediksyon otomatik
  async function listeAvansNonRekipirePaAnplwaye(bizId, anplwayeId) {
    const snap = await db.collection('biznis').doc(bizId).collection('avans_sale')
      .where('anplwayeId', '==', anplwayeId)
      .where('estati', '==', 'Apwouve')
      .where('rekipere', '==', false)
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async function markeAvansRekipere(bizId, avansIds) {
    if (!avansIds || avansIds.length === 0) return;
    const batch = db.batch();
    avansIds.forEach(id => {
      batch.update(refAvans(bizId, id), {
        rekipere: true,
        rekipereNan: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
    await batch.commit();
  }

  // ---------- 6.4 PREZANS & POINTAGE (mòd Manyèl sèlman pou kounye a) ----------

  function datJodiya() {
    return new Date().toISOString().slice(0, 10);
  }

  function refPrezans(bizId, anplwayeId, dat) {
    return db.collection('biznis').doc(bizId).collection('prezans').doc(`${anplwayeId}_${dat}`);
  }

  async function pwenteAntre(bizId, itilizateId, anplwayeId, non) {
    const dat = datJodiya();
    const ref = refPrezans(bizId, anplwayeId, dat);
    const snap = await ref.get();
    if (snap.exists) throw new Error(`${non} deja pwente antre jodi a.`);

    await ref.set({
      anplwayeId, non, itilizateId, dat,
      lèAntre: firebase.firestore.FieldValue.serverTimestamp(),
      lèSòti: null
    });
    AdminService.anrejistreLog(bizId, 'RH', 'Pwente Antre', '—', non)
      .catch(err => console.error('Erè audit log:', err));
  }

  async function pwenteSòti(bizId, anplwayeId, non) {
    const dat = datJodiya();
    const ref = refPrezans(bizId, anplwayeId, dat);
    const snap = await ref.get();
    if (!snap.exists) throw new Error(`${non} poko pwente antre jodi a.`);
    if (snap.data().lèSòti) throw new Error(`${non} deja pwente sòti jodi a.`);

    await ref.update({ lèSòti: firebase.firestore.FieldValue.serverTimestamp() });
    AdminService.anrejistreLog(bizId, 'RH', 'Pwente Sòti', '—', non)
      .catch(err => console.error('Erè audit log:', err));
  }

  async function listePrezansJodiya(bizId) {
    const snap = await db.collection('biznis').doc(bizId).collection('prezans')
      .where('dat', '==', datJodiya()).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  // ---------- 6.6 ORÈ TRAVAY (konfigirab pa biznis — pa gen valè kodifye an dur) ----------

  async function listeOrèTravay(bizId) {
    const snap = await db.collection('biznis').doc(bizId).collection('paramet').doc('orè_travay').get();
    return snap.exists ? (snap.data().shifts || []) : [];
  }

  async function sovgadeOrèTravay(bizId, shifts) {
    await db.collection('biznis').doc(bizId).collection('paramet').doc('orè_travay')
      .set({ shifts, modifyeNan: firebase.firestore.FieldValue.serverTimestamp() });
    AdminService.anrejistreLog(bizId, 'RH', 'Modifye Orè Travay', '—', `${shifts.length} orè konfigire`)
      .catch(err => console.error('Erè audit log:', err));
  }

  // ---------- KONT PEWÒL (kòd plan_comptes konfigirab pa biznis) ----------
  // Chak biznis gen pwòp plan_comptes — pa gen okenn kòd kodifye an dur isit la
  // (sof '6040' Salaires ki deja pataje ak depansService.js pou evite doub-konte).

  async function jwennKontPewòl(bizId) {
    const snap = await db.collection('biznis').doc(bizId).collection('paramet').doc('kont_pewol').get();
    return snap.exists ? snap.data() : {};
  }

  async function sovgadeKontPewòl(bizId, kont) {
    await db.collection('biznis').doc(bizId).collection('paramet').doc('kont_pewol')
      .set({ ...kont, modifyeNan: firebase.firestore.FieldValue.serverTimestamp() });
    AdminService.anrejistreLog(bizId, 'RH', 'Konfigire Kont Pewòl', '—', 'Kòd kont mete ajou')
      .catch(err => console.error('Erè audit log:', err));
  }

  // ---------- 6.9 EVALYASYON PÈFÒMANS ----------

  async function kreyeEvalyasyon(bizId, anplwaye, nòt, komantè) {
    const ref = db.collection('biznis').doc(bizId).collection('evalyasyon').doc();
    await ref.set({
      anplwayeId: anplwaye.id,
      non: anplwaye.non,
      itilizateId: anplwaye.itilizateId || null,
      nòt: Number(nòt),
      komantè: komantè || '',
      dat: datJodiya(),
      kreyeNan: firebase.firestore.FieldValue.serverTimestamp()
    });
    AdminService.anrejistreLog(bizId, 'RH', 'Kreye Evalyasyon', '—', `${anplwaye.non}: ${nòt}/5`)
      .catch(err => console.error('Erè audit log:', err));
    return ref.id;
  }

  async function listeEvalyasyon(bizId, limit = 20) {
    const snap = await db.collection('biznis').doc(bizId).collection('evalyasyon')
      .orderBy('kreyeNan', 'desc').limit(limit).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  // ---------- 6.10 FÒMASYON ----------

  async function kreyeFòmasyon(bizId, done) {
    const ref = db.collection('biznis').doc(bizId).collection('fòmasyon').doc();
    await ref.set({
      non: done.non,
      dat: done.dat,
      patisipan: done.patisipan || [],   // lis anplwayeId
      kreyeNan: firebase.firestore.FieldValue.serverTimestamp()
    });
    AdminService.anrejistreLog(bizId, 'RH', 'Kreye Fòmasyon', '—', `${done.non} (${done.patisipan.length} patisipan)`)
      .catch(err => console.error('Erè audit log:', err));
    return ref.id;
  }

  async function listeFòmasyon(bizId, limit = 20) {
    const snap = await db.collection('biznis').doc(bizId).collection('fòmasyon')
      .orderBy('kreyeNan', 'desc').limit(limit).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  return {
    kreyeAnplwaye, modifyeAnplwaye, dezaktiveAnplwaye,
    listeAnplwayeAktif, listeTouAnplwaye, listeKontraKapExpire,
    listeDepatmanAktif, listePosAktif,
    soumetDemandKonje, tretDemandKonje, listeTouDemandKonje, listeAnplwayeAnKonjeKounyeya,
    soumetAvansSale, tretAvansSale, listeTouAvansSale,
    listeAvansNonRekipirePaAnplwaye, markeAvansRekipere,
    pwenteAntre, pwenteSòti, listePrezansJodiya,
    listeOrèTravay, sovgadeOrèTravay,
    jwennKontPewòl, sovgadeKontPewòl,
    kreyeEvalyasyon, listeEvalyasyon,
    kreyeFòmasyon, listeFòmasyon
  };
})();
