// aiGovernanceService.js — Modil 12.13 : AI Governance & Audit
// Log chak repons/rekòmandasyon ki soti nan yon vrè apèl LLM (12.1, 12.9) nan
// koleksyon 'ai_recommendation', pou gen yon audit trail konplè: Ki sa IA a te wè?
// Ki sa li te rekòmande? Ki moun ki mande l? Depann de window.db, window.currentCompanyId.

const AiGovernanceService = (function () {

  function getBizRef() {
    if (!window.currentCompanyId) throw new Error("Pa gen biznis aktif chwazi.");
    return window.db.collection('biznis').doc(window.currentCompanyId);
  }

  /**
   * @param {Object} done
   *   done.sous - 'copilot' | 'chat_documents'
   *   done.kesyon - kesyon itilizatè a poze
   *   done.repons - repons IA a bay
   *   done.dokimanId - (opsyonèl, pou chat_documents)
   */
  async function anrejistreRekòmandasyon(done) {
    const bizRef = getBizRef();
    const itilizate = window.auth?.currentUser;
    if (!itilizate) return; // pa gen kont konekte — pa gen log posib (règ sekirite mande matche uid)

    try {
      await bizRef.collection('ai_recommendation').add({
        sous: done.sous,
        kesyon: String(done.kesyon || '').slice(0, 2000),
        repons: String(done.repons || '').slice(0, 4000),
        dokimanId: done.dokimanId || null,
        itilizateId: itilizate.uid,
        itilizateNon: itilizate.displayName || 'Itilizatè',
        dat: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (err) {
      // Pa dwe janm bloke chat la si log echwe — se yon fonksyon segondè, pa kritik
      console.warn('AI Governance log echwe:', err);
    }
  }

  async function getIstorikRekòmandasyon(limitCount = 50) {
    const bizRef = getBizRef();
    const snap = await bizRef.collection('ai_recommendation')
      .orderBy('dat', 'desc')
      .limit(limitCount)
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  return { anrejistreRekòmandasyon, getIstorikRekòmandasyon };
})();

window.AiGovernanceService = AiGovernanceService;
