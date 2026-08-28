// rekritmanService.js — Pipeline Rekritman (6.3): Kandida -> Entèvyou -> Evalyasyon -> Aksepte/Rejte
// Kandida yo pa itilizatè app la (pa gen itilizateId) — sèl RH/Admin gen aksè, kòm nan firestore.rules

const RekritmanService = (() => {

  const db = firebase.firestore();
  const storage = firebase.storage();

  function refKandida(bizId, kandidaId) {
    return db.collection('biznis').doc(bizId).collection('kandida').doc(kandidaId);
  }

  async function kreyeKandida(bizId, done) {
    const ref = db.collection('biznis').doc(bizId).collection('kandida').doc();
    await ref.set({
      non: done.non,
      pozisyon: done.pozisyon || '',
      etap: 'Kandida',        // Kandida | Entèvyou | Evalyasyon | Aksepte | Rejte
      cvUrl: null,
      cvNonFichye: null,
      siprime: false,
      kreyeNan: firebase.firestore.FieldValue.serverTimestamp()
    });
    AdminService.anrejistreLog(bizId, 'RH', 'Kreye Kandida', '—', done.non)
      .catch(err => console.error('Erè audit log:', err));
    return ref.id;
  }

  async function modifyeEtapKandida(bizId, kandidaId, nouvelEtap) {
    await refKandida(bizId, kandidaId).update({
      etap: nouvelEtap,
      modifyeNan: firebase.firestore.FieldValue.serverTimestamp()
    });
    AdminService.anrejistreLog(bizId, 'RH', 'Chanje Etap Kandida', '—', nouvelEtap)
      .catch(err => console.error('Erè audit log:', err));
  }

  // Storage path: biznis/{bizId}/kandida/{kandidaId}/cv.pdf
  // Egzije PDF, max 5MB — menm limit ak storage.rules (verifye la si w chanje youn, chanje lòt la tou)
  async function telechajeCV(bizId, kandidaId, file) {
    if (file.type !== 'application/pdf') {
      throw new Error('Sèl fichye PDF aksepte pou CV.');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Fichye a twò gwo (limit 5MB).');
    }

    const path = `biznis/${bizId}/kandida/${kandidaId}/cv.pdf`;
    const ref = storage.ref(path);
    await ref.put(file);
    const url = await ref.getDownloadURL();

    await refKandida(bizId, kandidaId).update({ cvUrl: url, cvNonFichye: file.name });

    AdminService.anrejistreLog(bizId, 'RH', 'Telechaje CV Kandida', '—', file.name)
      .catch(err => console.error('Erè audit log:', err));

    return url;
  }

  async function listeKandida(bizId) {
    const snap = await db.collection('biznis').doc(bizId).collection('kandida')
      .where('siprime', '==', false).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  return { kreyeKandida, modifyeEtapKandida, telechajeCV, listeKandida };
})();
