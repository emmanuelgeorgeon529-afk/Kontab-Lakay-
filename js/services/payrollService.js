// payrollService.js — Kalkil Pewòl jenerik, miltip-peyi
// Priyorite: override biznis (paramet/fiskal_rh) > default global (peyiCode)

const PayrollService = (() => {

  const db = firebase.firestore();
  let _cacheParam = {};

  async function chajeParamFiskal(bizId) {
    if (_cacheParam[bizId]) return _cacheParam[bizId];

    const bizSnap = await db.collection('biznis').doc(bizId).get();
    const peyi = bizSnap.data().peyi || 'HT';

    const overrideSnap = await db.collection('biznis').doc(bizId)
      .collection('paramet').doc('fiskal_rh').get();

    if (overrideSnap.exists) {
      _cacheParam[bizId] = overrideSnap.data();
      return _cacheParam[bizId];
    }

    const globalSnap = await db.collection('paramet_fiskal_global').doc(peyi).get();
    if (!globalSnap.exists) {
      throw new Error(`Pa gen paramèt fiskal konfigire pou peyi "${peyi}". Kontakte administratè.`);
    }
    if (globalSnap.data().fyabilite === 'PA_KONFIGIRE') {
      throw new Error(`Peyi "${peyi}" poko konfigire pou kalkil pewòl.`);
    }

    _cacheParam[bizId] = globalSnap.data();
    return _cacheParam[bizId];
  }

  function kalkileEnpoMansyèl(param, salèBaz) {
    const abattman = param.abattmanSpesyal || 0;
    const baz = salèBaz * (1 - abattman);
    const bazPeryòd = param.peryodisiteBaèm === 'anyèl' ? baz * 12 : baz;

    let enpo = 0;
    for (const tr of param.tranch) {
      if (bazPeryòd <= tr.min) continue;
      const plafon = tr.max === null ? bazPeryòd : Math.min(bazPeryòd, tr.max);
      enpo += Math.max(0, plafon - tr.min) * tr.to;
    }
    return param.peryodisiteBaèm === 'anyèl' ? Math.round(enpo / 12) : Math.round(enpo);
  }

  async function kalkileFichSale(bizId, salèBaz, avantaj = {}) {
    const param = await chajeParamFiskal(bizId);

    const primeTranspò = Number(avantaj.primeTranspò) || 0;
    const primeManje   = Number(avantaj.primeManje) || 0;
    const bonus         = Number(avantaj.bonus) || 0;
    const komisyon       = Number(avantaj.komisyon) || 0;
    const avansADediwi   = Number(avantaj.avansADediwi) || 0;

    const salèBrit = salèBaz + primeTranspò + primeManje + bonus + komisyon;
    const enpo = kalkileEnpoMansyèl(param, salèBaz);

    const kotizasyon = param.kotizasyon.map(k => ({
      id: k.id,
      non: k.non,
      anplwaye: salèBaz >= (k.planche || 0) ? Math.round(salèBaz * k.toAnplwaye) : 0,
      patwonal: salèBaz >= (k.planche || 0) ? Math.round(salèBaz * k.toPatwonal) : 0
    }));

    const totalKotizasyonAnplwaye = kotizasyon.reduce((s, k) => s + k.anplwaye, 0);
    const totalKotizasyonPatwonal = kotizasyon.reduce((s, k) => s + k.patwonal, 0);

    const totalDediksyon = enpo + totalKotizasyonAnplwaye + avansADediwi;
    const salèNet = salèBrit - totalDediksyon;

    return {
      salèBaz, salèBrit, enpo, kotizasyon,
      totalKotizasyonAnplwaye, totalKotizasyonPatwonal,
      avansADediwi, totalDediksyon, salèNet
    };
  }

  function verifyeBalans(liy) {
    const totalDeb = liy.reduce((s, l) => s + l.débit, 0);
    const totalKre = liy.reduce((s, l) => s + l.crédit, 0);
    return Math.abs(totalDeb - totalKre) < 0.01;
  }

  // AUKENN kòd kont kodifye an dur — Kontab Lakay se yon SaaS global, chak biznis
  // gen pwòp plan_comptes li (Ayiti, Brezil, Kanada, elt). Tout kòd soti nan
  // paramet/kont_pewol (konfigire pa biznis la), ak fallback tèks si vid.

  // Konte sekans pou nimewo pewòl, menm patwon ak getNextDepansNumber() nan depansService.js
  async function getNextPewolNumber(tx, bizId) {
    const counterRef = db.collection('biznis').doc(bizId).collection('konte').doc('pewol');
    const counterDoc = await tx.get(counterRef);
    let nextNum = 1;
    if (counterDoc.exists) nextNum = (counterDoc.data().dènyeNimewo || 0) + 1;
    tx.set(counterRef, { dènyeNimewo: nextNum }, { merge: true });
    return 'PW-' + String(nextNum).padStart(6, '0');
  }

  async function jenerePewol(bizId, peryòd, listAnplwaye, itilizateAdminId, mòdPeman = 'kach') {
    const fichSale = [];
    for (const a of listAnplwaye) {
      const f = await kalkileFichSale(bizId, a.salèBaz, { ...a.avantaj, avansADediwi: a.avansADediwi });
      fichSale.push({ anplwayeId: a.anplwayeId, non: a.non, ...f });
    }

    const kontPewòl = await RhService.jwennKontPewòl(bizId);

    const kotizasyonMap = {};
    let totBrit = 0, totEnpo = 0, totAvans = 0, totNet = 0, totPatwonal = 0;

    fichSale.forEach(f => {
      totBrit  += f.salèBrit;
      totEnpo  += f.enpo;
      totAvans += f.avansADediwi;
      totNet   += f.salèNet;
      totPatwonal += f.totalKotizasyonPatwonal;
      f.kotizasyon.forEach(k => {
        kotizasyonMap[k.id] = kotizasyonMap[k.id] || { non: k.non, anplwaye: 0, patwonal: 0 };
        kotizasyonMap[k.id].anplwaye += k.anplwaye;
        kotizasyonMap[k.id].patwonal += k.patwonal;
      });
    });

    // Chak kont sa yo se biznis la ki konfigire l (paramet/kont_pewol) — si li poko konfigire,
    // itilize non deskriptif kòm fallback (pa bloke pewòl la, men avèti nan UI a).
    const kontKotizasyon = (id, non) => kontPewòl.kotizasyon?.[id] || `${non} à Payer`;
    const kontEnpo = kontPewòl.enpo || 'Enpo/DGI à Payer';
    const kontAvans = kontPewòl.avansARecouvre || 'Avans Salè à Recouvre';
    const kontChajPatwonal = kontPewòl.chajPatwonal || 'Charj Patwonal';

    const kontSalèBrit = kontPewòl.salèBrit || 'Depans Salè';
    const liy1 = [{ kont: kontSalèBrit, débit: totBrit, crédit: 0 }];
    Object.entries(kotizasyonMap).forEach(([id, k]) => {
      if (k.anplwaye > 0) liy1.push({ kont: kontKotizasyon(id, k.non), débit: 0, crédit: k.anplwaye });
    });
    if (totEnpo > 0) liy1.push({ kont: kontEnpo, débit: 0, crédit: totEnpo });
    if (totAvans > 0) liy1.push({ kont: kontAvans, débit: 0, crédit: totAvans });
    const kontKès = mòdPeman === 'transfè'
      ? (kontPewòl.bank || 'Bank')
      : (kontPewòl.kach || 'Kès');
    liy1.push({ kont: kontKès, débit: 0, crédit: totNet });

    const liy2 = [{ kont: kontChajPatwonal, débit: totPatwonal, crédit: 0 }];
    Object.entries(kotizasyonMap).forEach(([id, k]) => {
      if (k.patwonal > 0) liy2.push({ kont: kontKotizasyon(id, k.non), débit: 0, crédit: k.patwonal });
    });

    if (!verifyeBalans(liy1) || (totPatwonal > 0 && !verifyeBalans(liy2))) {
      throw new Error('Ekriti jounal pewòl la pa balanse — kalkil anile.');
    }

    const pewolRef = db.collection('biznis').doc(bizId).collection('pewol').doc();

    const nimewoPewol = await db.runTransaction(async (tx) => {
      const nimewo = await getNextPewolNumber(tx, bizId);

      tx.set(pewolRef, {
        nimewoPewol: nimewo,
        peryòd, fichSale,
        totaux: { brit: totBrit, enpo: totEnpo, avans: totAvans, net: totNet, patwonal: totPatwonal },
        estati: 'Valide',
        jenereNan: firebase.firestore.FieldValue.serverTimestamp(),
        jenerePa: itilizateAdminId
      });

      const jRef1 = db.collection('biznis').doc(bizId).collection('jounal').doc();
      tx.set(jRef1, {
        nimewoEkriti: nimewo, liy: liy1, dat: peryòd,
        referans: pewolRef.id, sous: 'automatique', tip: 'Pewòl'
      });

      if (totPatwonal > 0) {
        const jRef2 = db.collection('biznis').doc(bizId).collection('jounal').doc();
        tx.set(jRef2, {
          nimewoEkriti: nimewo + '-P', liy: liy2, dat: peryòd,
          referans: pewolRef.id, sous: 'automatique', tip: 'Pewòl'
        });
      }

      return nimewo;
    });

    AdminService.anrejistreLog(bizId, 'RH', 'Jenere Pewòl', '—', `${nimewoPewol} (${peryòd}): ${listAnplwaye.length} anplwaye, net total ${totNet}`)
      .catch(err => console.error('Erè audit log:', err));

    return pewolRef.id;
  }

  async function listeTouPewol(bizId, limit = 10) {
    const snap = await db.collection('biznis').doc(bizId).collection('pewol')
      .orderBy('jenereNan', 'desc').limit(limit).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async function egzisteDejaPourPeryòd(bizId, peryòd) {
    const snap = await db.collection('biznis').doc(bizId).collection('pewol')
      .where('peryòd', '==', peryòd).limit(1).get();
    return !snap.empty;
  }

  async function jwennPewolPaPeryòd(bizId, peryòd) {
    const snap = await db.collection('biznis').doc(bizId).collection('pewol')
      .where('peryòd', '==', peryòd).limit(1).get();
    return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
  }

  return {
    kalkileFichSale, jenerePewol, chajeParamFiskal,
    listeTouPewol, egzisteDejaPourPeryòd, jwennPewolPaPeryòd
  };
})();
