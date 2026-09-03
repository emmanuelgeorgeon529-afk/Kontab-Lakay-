// workflowService.js — Modil 12.12 : Workflow Builder (Opsyon A — egzekisyon "best-effort")
// NÒT ARKITEKTI: pa gen Cloud Functions (Firebase Spark plan). Sa vle di workflow yo
// SÈLMAN egzekite lè yon moun louvri #ia (pa gen vrè "background job" 24/7).
// Egzanp konkrè bati: relans otomatik pou kliyan ak gwo dèt (Nouvo Fakti kredi gwo
// montan → swiv 7 jou → tcheke si peye → relanse oswa fèmen), ki reyitilize
// SmartCollectionService ak kliyan.dèt ki deja egziste.

const WorkflowService = (function () {

  const SÈY_MONTAN_DEKLANCHE = 50000; // HTG — dèt ki deklanche yon workflow relans
  const JOU_ANT_RELANS = 7;

  function getBizRef() {
    if (!window.currentCompanyId) throw new Error("Pa gen biznis aktif chwazi.");
    return window.db.collection('biznis').doc(window.currentCompanyId);
  }

  /** TRIGGER + CONDITION: kreye yon workflow pou chak kliyan gwo dèt ki poko gen youn aktif. */
  async function verifyeEDeklancheWorkflow() {
    const bizRef = getBizRef();
    const rekòmandasyon = await window.SmartCollectionService.getRekòmandasyonKolèk(15);
    const gwoDèt = rekòmandasyon.filter(r => r.dèt >= SÈY_MONTAN_DEKLANCHE);

    let nbKreye = 0;
    for (const r of gwoDèt) {
      const existSnap = await bizRef.collection('workflow_instance')
        .where('kliyanId', '==', r.kliyanId)
        .where('etap', '==', 'atant')
        .limit(1).get();
      if (!existSnap.empty) continue; // deja gen yon workflow aktif pou kliyan sa a

      const pwochenVerifikasyon = new Date(Date.now() + JOU_ANT_RELANS * 86400000);
      await bizRef.collection('workflow_instance').add({
        tip: 'relans_kliyan_gwo_dèt',
        kliyanId: r.kliyanId, kliyanNon: r.kliyanNon,
        montanDeklanche: r.dèt,
        etap: 'atant',
        pwochenVerifikasyon,
        istorik: [{ etap: 'kreye', dat: new Date().toISOString(), detay: `Dèt ${Math.round(r.dèt).toLocaleString()} HTG detekte` }],
        dat: firebase.firestore.FieldValue.serverTimestamp()
      });
      nbKreye++;
    }
    return nbKreye;
  }

  /** ACTION + WAIT + CONDITION: egzekite workflow ki rive nan dat verifikasyon yo. */
  async function egzekiteWorkflowAnAtant() {
    const bizRef = getBizRef();
    const jodiya = new Date();
    const snap = await bizRef.collection('workflow_instance')
      .where('etap', '==', 'atant')
      .where('pwochenVerifikasyon', '<=', jodiya)
      .get();

    const rezilta = [];
    for (const doc of snap.docs) {
      const w = doc.data();
      const kliyanDoc = await bizRef.collection('kliyan').doc(w.kliyanId).get();
      const dètAktyèl = kliyanDoc.exists ? (kliyanDoc.data().dèt || 0) : 0;

      if (dètAktyèl <= 0) {
        await doc.ref.update({
          etap: 'fèmen',
          istorik: firebase.firestore.FieldValue.arrayUnion({ etap: 'fèmen', dat: new Date().toISOString(), detay: 'Dèt peye' })
        });
        rezilta.push({ kliyanNon: w.kliyanNon, aksyon: 'fèmen', detay: 'Dèt peye — workflow fèmen' });
      } else {
        const pwochenVerifikasyon = new Date(Date.now() + JOU_ANT_RELANS * 86400000);
        await doc.ref.update({
          pwochenVerifikasyon,
          istorik: firebase.firestore.FieldValue.arrayUnion({ etap: 'relanse', dat: new Date().toISOString(), detay: `Dèt toujou ${Math.round(dètAktyèl).toLocaleString()} HTG` })
        });
        rezilta.push({ kliyanNon: w.kliyanNon, aksyon: 'relanse', detay: `Dèt toujou ${Math.round(dètAktyèl).toLocaleString()} HTG — pwochen tcheke nan ${JOU_ANT_RELANS}j` });
      }
    }
    return rezilta;
  }

  async function getWorkflowAktif() {
    const bizRef = getBizRef();
    const snap = await bizRef.collection('workflow_instance')
      .where('etap', '==', 'atant')
      .orderBy('pwochenVerifikasyon', 'asc')
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  /** Rele lè app la louvri Modil 12 — deklanche nouvo workflow + egzekite sa ki rive. */
  async function egzekiteSiklKonplè() {
    const nbKreye = await verifyeEDeklancheWorkflow();
    const rezilta = await egzekiteWorkflowAnAtant();
    return { nbKreye, rezilta };
  }

  return { verifyeEDeklancheWorkflow, egzekiteWorkflowAnAtant, egzekiteSiklKonplè, getWorkflowAktif, SÈY_MONTAN_DEKLANCHE };
})();

window.WorkflowService = WorkflowService;
