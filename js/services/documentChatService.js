// documentChatService.js — Modil 12.9 : Chat With Documents
// Reyitilize GedService.js (Modil 8) — dokiman soti nan Firebase Storage reyèl.
// Konvèti fichye a an base64 kliyan-side, voye l bay worker.js (menm pwoxy ak 12.1).

const DocumentChatService = (function () {

  let _dokimanChwazi = null; // { id, tit, base64, mediaType }

  async function listeDokimanChatab() {
    const tout = await window.GedService.getDokiman(true);
    // Sèlman PDF pou kounye a (Claude Document API sipòte PDF byen; imaj ta mande yon chemen apa)
    return tout.filter(d => (d.tipFichye || '').includes('pdf'));
  }

  function _blobVersBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = () => reject(new Error('Erè lekti fichye a.'));
      reader.readAsDataURL(blob);
    });
  }

  async function chwaziDokiman(dokimanId) {
    const dok = await window.GedService.getDokimanById(dokimanId);
    if (!dok.downloadURL) throw new Error('Dokiman sa a pa gen URL telechajman.');

    const resp = await fetch(dok.downloadURL);
    if (!resp.ok) throw new Error('Pa t kapab telechaje dokiman an.');
    const blob = await resp.blob();

    if (blob.size >= 15 * 1024 * 1024) {
      throw new Error('Dokiman an twò gwo pou chat (limit 15 MB).');
    }

    const base64 = await _blobVersBase64(blob);
    _dokimanChwazi = { id: dok.id, tit: dok.tit, base64, mediaType: 'application/pdf' };
    return _dokimanChwazi;
  }

  function dokimanAktyèl() {
    return _dokimanChwazi;
  }

  function retireDokiman() {
    _dokimanChwazi = null;
  }

  /**
   * @param {Array<{role, content}>} istorikMesaj
   */
  async function poseKesyonSouDokiman(istorikMesaj) {
    if (!_dokimanChwazi) throw new Error('Chwazi yon dokiman anvan.');
    const itilizate = window.auth?.currentUser;
    if (!itilizate) throw new Error('Ou dwe konekte pou itilize sa a.');

    const idToken = await itilizate.getIdToken();

    const resp = await fetch(window.AiCopilotService.WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({
        messages: istorikMesaj,
        konteksBiznis: `Dokiman chwazi: ${_dokimanChwazi.tit}`,
        dokiman: { base64: _dokimanChwazi.base64, mediaType: _dokimanChwazi.mediaType }
      })
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Erè Chat Documents.');
    return data.reply;
  }

  return { listeDokimanChatab, chwaziDokiman, dokimanAktyèl, retireDokiman, poseKesyonSouDokiman };
})();

window.DocumentChatService = DocumentChatService;
