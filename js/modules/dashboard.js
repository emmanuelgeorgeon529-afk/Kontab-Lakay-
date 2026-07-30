// js/modules/dashboard.j
import {
  getVentesJour,
  getDepansJour,
  getBeneficeJour,
  getSoldeCaisse,
  getDetteClients,
  getDetteFournisseurs,
  getAlertesStock,
} from "../core/db.js";

export async function inisyalizeDashboard(bizId) {
  const [ventes, depans, benefis, kès, detteKliyan, detteFounisè, alètStok] =
    await Promise.allSettled([
      getVentesJour(bizId),
      getDepansJour(bizId),
      getBeneficeJour(bizId),
      getSoldeCaisse(bizId),
      getDetteClients(bizId),
      getDetteFournisseurs(bizId),
      getAlertesStock(bizId),
    ]);

  afficheKPI("kpi-ventes", ventes);
  afficheKPI("kpi-depans", depans);
  afficheKPI("kpi-benefis", benefis);
  afficheKPI("kpi-kès", kès, false);
  afficheKPI("kpi-dette-kliyan", detteKliyan, false);
  afficheKPI("kpi-dette-founisè", detteFounisè, false);
  afficheAlètStok(alètStok);
}

function afficheKPI(elId, rezilta, montreVaryasyon = true) {
  const el = document.getElementById(elId);
  if (!el) return;

  if (rezilta.status !== "fulfilled") {
    console.error(`Erè chajman KPI "${elId}":`, rezilta.reason);
    el.innerHTML = `<span class="text-red-500 text-xs">Erè chajman</span>`;
    return;
  }

  const { valeur, variation } = rezilta.value;
  let html = `<span class="text-2xl font-bold">${fòmateLajan(valeur)}</span>`;

  if (montreVaryasyon && variation != null) {
    const koulèKlas = variation >= 0 ? "text-emerald-600" : "text-red-600";
    const flèch = variation >= 0 ? "▲" : "▼";
    html += ` <span class="text-xs font-semibold ${koulèKlas}">${flèch} ${Math.abs(variation)}%</span>`;
  }

  el.innerHTML = html;
}

function afficheAlètStok(rezilta) {
  const container = document.getElementById("dashboard-alèt-stok");
  if (!container) return;

  if (rezilta.status !== "fulfilled") {
    console.error("Erè chajman alèt stòk:", rezilta.reason);
    container.innerHTML = `<p class="text-red-500 text-sm">Erè chajman alèt stòk.</p>`;
    return;
  }

  const { alèt } = rezilta.value;
  if (!alèt || alèt.length === 0) {
    container.innerHTML = `<p class="text-gray-500 text-sm">Pa gen alèt stòk kounye a.</p>`;
    return;
  }

  container.innerHTML = alèt
    .map(
      (p) => `
      <div class="flex justify-between items-center py-2 border-b">
        <span>${escapeHTML(p.non)}</span>
        <span class="text-xs font-mono font-semibold px-2 py-1 rounded" style="background:#FBEBC7; color:#7A5A12;">
          ${p.kantite} / min ${p.stokMinimòm}
        </span>
      </div>`
    )
    .join("");
}

function fòmateLajan(montan) {
  const antye = Math.round(montan || 0);
  return `${antye.toLocaleString("fr-FR")} HTG`;
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
