// js/modules/receivables.js
import {
  anrejistrePemanKliyan,
  jwennKliyanAkDèt,
} from "../core/db.js";

let bizIdAktyèl = null;
let itilizatèIdAktyèl = null;
let itilizatèNonAktyèl = null;
let kliyanChwaziId = null;

export async function inisyalizeReceivables(bizId, itilizatèId, itilizatèNon) {
  bizIdAktyèl = bizId;
  itilizatèIdAktyèl = itilizatèId;
  itilizatèNonAktyèl = itilizatèNon;

  branchevènman();
  await rafrechiListKliyanAkDèt();
}

function branchevènman() {
  const listeKliyan = document.getElementById("kliyan-dèt-liste");
  if (listeKliyan) {
    listeKliyan.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-kliyan-id]");
      if (btn) selectionneKliyan(btn.dataset.kliyanId, btn.dataset.kliyanNon, btn.dataset.kliyanDèt);
    });
  }

  const form = document.getElementById("form-peman-kliyan");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      soumetPeman(new FormData(form));
    });
  }
}

function selectionneKliyan(kliyanId, kliyanNon, dèt) {
  kliyanChwaziId = kliyanId;
  const label = document.getElementById("peman-kliyan-non");
  if (label) label.textContent = `${kliyanNon} — Dèt aktyèl: ${dèt} HTG`;
  document.getElementById("form-peman-kliyan")?.classList.remove("hidden");
}

async function soumetPeman(formData) {
  if (!kliyanChwaziId) {
    afficheAvis("Chwazi yon kliyan dabò.", "warning");
    return;
  }
  const montanPeye = parseFloat(formData.get("montanPeye"));
  const modePeman = formData.get("modePeman") || "Cash";

  const btnSoumèt = document.getElementById("btn-soumèt-peman");
  if (btnSoumèt) btnSoumèt.disabled = true;

  try {
    const { pieceRef, nouvoSolde } = await anrejistrePemanKliyan(bizIdAktyèl, {
      kliyanId: kliyanChwaziId,
      montanPeye,
      modePeman,
      itilizatèId: itilizatèIdAktyèl,
      itilizatèNon: itilizatèNonAktyèl,
    });
    afficheAvis(
      `Peman anrejistre! Referans: ${pieceRef} — Nouvo dèt: ${nouvoSolde} HTG`,
      "success"
    );
    document.getElementById("form-peman-kliyan")?.reset();
    kliyanChwaziId = null;
    await rafrechiListKliyanAkDèt();
  } catch (error) {
    console.error("Erè anrejistreman peman:", error);
    afficheAvis(`Echèk: ${error.message}`, "danger");
  } finally {
    if (btnSoumèt) btnSoumèt.disabled = false;
  }
}

async function rafrechiListKliyanAkDèt() {
  try {
    const kliyanYo = await jwennKliyanAkDèt(bizIdAktyèl);
    afficheListKliyan(kliyanYo);
  } catch (error) {
    console.error("Erè chajman kliyan ak dèt:", error);
    afficheAvis("Pa ka chaje lis kliyan yo", "danger");
  }
}

function afficheListKliyan(kliyanYo) {
  const container = document.getElementById("kliyan-dèt-liste");
  if (!container) return;

  if (kliyanYo.length === 0) {
    container.innerHTML = `<p class="text-gray-500 text-sm">Pa gen okenn kliyan ki gen dèt kounye a.</p>`;
    return;
  }

  container.innerHTML = kliyanYo
    .map(
      (k) => `
      <button
        data-kliyan-id="${k.id}"
        data-kliyan-non="${escapeHTML(k.non || "Kliyan")}"
        data-kliyan-dèt="${k.dèt}"
        class="w-full text-left p-3 border rounded mb-2 hover:bg-gray-50 flex justify-between"
      >
        <span>${escapeHTML(k.non || "Kliyan san non")}</span>
        <span class="font-semibold text-red-600">${k.dèt} HTG</span>
      </button>`
    )
    .join("");
}

function afficheAvis(message, type) {
  alert(`[${type.toUpperCase()}] ${message}`);
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
