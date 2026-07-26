// js/modules/expenses.js
import { anrejistreDepans, jwennDènyeDepans } from "../core/db.js";

let bizIdAktyèl = null;
let itilizatèIdAktyèl = null;
let itilizatèNonAktyèl = null;

export async function inisyalizeExpenses(bizId, itilizatèId, itilizatèNon) {
  bizIdAktyèl = bizId;
  itilizatèIdAktyèl = itilizatèId;
  itilizatèNonAktyèl = itilizatèNon;

  branchevènman();
  await rafrechiListDepans();
}

function branchevènman() {
  const form = document.getElementById("form-nouvo-depans");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      soumetDepans(new FormData(form));
    });
  }
}

async function soumetDepans(formData) {
  const libele = formData.get("libele")?.trim();
  const montan = parseFloat(formData.get("montan"));
  const modePeman = formData.get("modePeman") || "Cash";

  const btnSoumèt = document.getElementById("btn-soumèt-depans");
  if (btnSoumèt) btnSoumèt.disabled = true;

  try {
    const { pieceRef } = await anrejistreDepans(bizIdAktyèl, {
      libele,
      montan,
      modePeman,
      itilizatèId: itilizatèIdAktyèl,
      itilizatèNon: itilizatèNonAktyèl,
    });
    afficheAvis(`Depans anrejistre! Referans: ${pieceRef}`, "success");
    document.getElementById("form-nouvo-depans")?.reset();
    await rafrechiListDepans();
  } catch (error) {
    console.error("Erè anrejistreman depans:", error);
    afficheAvis(`Echèk: ${error.message}`, "danger");
  } finally {
    if (btnSoumèt) btnSoumèt.disabled = false;
  }
}

async function rafrechiListDepans() {
  try {
    const depansYo = await jwennDènyeDepans(bizIdAktyèl);
    afficheListDepans(depansYo);
  } catch (error) {
    console.error("Erè chajman depans:", error);
    afficheAvis("Pa ka chaje lis depans yo", "danger");
  }
}

function afficheListDepans(depansYo) {
  const container = document.getElementById("depans-liste");
  if (!container) return;

  container.innerHTML = depansYo
    .map(
      (d) => `
      <div class="depans-item flex justify-between items-center py-2 border-b">
        <div>
          <p class="font-bold">${escapeHTML(d.libele)}</p>
          <p class="text-sm text-gray-500">${escapeHTML(d.pieceRef)} &middot; ${escapeHTML(d.modePeman)}</p>
        </div>
        <span class="font-semibold text-red-600">-${d.montan} HTG</span>
      </div>`
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
