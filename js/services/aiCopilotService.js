// aiCopilotService.js — Modil 12.1 : Co-Pilot IA (kliyan)
// Ranmase kontèks reyèl (BiService/StockForecastService/AntiFraudService) epi rele
// worker.js la (Cloudflare) — kle API a JAMÈ nan fichye sa a.

const AiCopilotService = (function () {

  // ⚠️ RANPLASE ak URL worker ou a apre deplwaman
  const WORKER_URL = 'https://kontab-lakay-copilot.VOTRE-SOUS-DOMÈN.workers.dev';

  async function _jwennKontèks() {
    try {
      const [stats, fin, stock, klyan] = await Promise.all([
        window.BiService.getDashboardStats(),
        window.BiService.getFinancialAnalysis(),
        window.BiService.getStockAnalysis(),
        window.BiService.getClientAnalysis()
      ]);

      return [
        `Chif Afè mwa a: ${Math.round(stats.revniMwa).toLocaleString()} HTG (mwa pase: ${Math.round(stats.revniMwaPase).toLocaleString()} HTG)`,
        `Depans mwa a: ${Math.round(stats.depansMwa).toLocaleString()} HTG`,
        `Benefis Nèt mwa a: ${Math.round(stats.benefisNèt).toLocaleString()} HTG`,
        `Cash Disponib: ${Math.round(stats.kesDisponib).toLocaleString()} HTG`,
        `Marge Brite: ${fin.margeBrute.toFixed(1)}% · Marge Nèt: ${fin.margeNette.toFixed(1)}%`,
        `Pwodwi stock ba: ${stock.stockFèb} · Pwodwi ki pi vann: ${stock.topVente}`,
        `Kliyan aktif: ${stats.kliyanAktif} · Nouvo kliyan mwa a: ${klyan.nouvoKliyan} · Pi bon kliyan: ${klyan.piBonKliyan}`
      ].join('\n');
    } catch (err) {
      console.warn('Pa t kapab ranmase tout kontèks:', err);
      return 'Kontèks pasyèl disponib — kèk done pa t chaje.';
    }
  }

  /**
   * @param {Array<{role:'user'|'assistant', content:string}>} istorikMesaj
   */
  async function poseKesyon(istorikMesaj) {
    const itilizate = window.auth?.currentUser;
    if (!itilizate) throw new Error('Ou dwe konekte pou itilize Co-Pilot la.');

    const idToken = await itilizate.getIdToken();
    const konteksBiznis = await _jwennKontèks();

    const resp = await fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ messages: istorikMesaj, konteksBiznis })
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Erè Co-Pilot.');
    return data.reply;
  }

  return { poseKesyon, WORKER_URL };
})();

window.AiCopilotService = AiCopilotService;
