// js/modules/payables.js
import {
  anrejistreAchteKredi,
  anrejistrePemanFounisè,
  jwennFounisèAkDèt,
  jwennKatalogStok,
} from "../core/db.js";

let bizIdAktyèl = null;
let itilizatèIdAktyèl = null;
let itilizatèNonAktyèl = null;
let founisèChwaziId = null;
let panyenAcha = []; // [{ produitId, non, quantite, prixAchat }]
let katalogPwodwi = [];

/* ------------------------------------------------------------------ */
/* INISYALIZASYON                                                        */
/* ------------------------------------------------------------------ */
export async function inisyalizePayables(bizId, itilizatèId, itilizatèNon) {
  bizIdAktyèl = bizId;
  itilizatèIdAktyèl = itilizatèId;
  itilizatèNonAktyèl = itilizatèNon;

  branchevènman();
  katalogPwodwi = await jwennKatalogStok(bizId);
  await rafrechiListFounisè();
}

function branchevènman() {
  const formAcha = document.getElementById("form-acha-kredi");
  if (formAcha) {
    formAcha.addEventListener("submit", (e) => {
      e.preventDefault();
      soumetAcha(new FormData(formAcha));
    });
  }

  const listeFounisè = document.getElementById("founisè-dèt-liste");
  if (listeFounisè) {
    listeFounisè.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-founisè-id]");
      if (btn) selectionneFounisè(btn.dataset.founisèId, btn.dataset.founisèNon, btn.dataset.founisèDèt);
    });
  }

  const formPeman = document.getElementById("form-peman-founisè");
  if (formPeman) {
    formPeman.addEventListener("submit", (e) => {
      e.preventDefault();
      soumetPemanFounisè(new FormData(formPeman));
    });
  }
}

/* ------------------------------------------------------------------ */
/* ACHA A KREDI                                                           */
/* ------------------------------------------------------------------ */
async function soumetAcha(formData) {
  const founisèId = formData.get("founisèId");
  const founisèNon = formData.get("founisèNon") || "Founisè";
  const produitId = formData.get("produitId");
  const quantite = parseInt(formData.get("quantite"), 10);
  const prixAchat = parseFloat(formData.get("prixAchat"));

  if (!founisèId || !produitId || !quantite || quantite <= 0 || isNaN(prixAchat) || prixAchat <= 0) {
    afficheAvis("Ranpli tout chan yo kòrèkteman.", "warning");
    return;
  }

  const btnSoumèt = document.getElementById("btn-soumèt-acha");
  if (btnSoumèt) btnSoumèt.disabled = true;

  try {
    const { pieceRef, montanTotal } = await anrejistreAchteKredi(bizIdAktyèl, {
      founisèId,
      founisèNon,
      items: [{ produitId, quantite, prixAchat }],
      itilizatèId: itilizatèIdAktyèl,
      itilizatèNon: itilizatèNonAktyèl,
    });
    afficheAvis(`Acha anrejistre! Referans: ${pieceRef} — Total: ${montanTotal} HTG`, "success");
    document.getElementById("form-acha-kredi")?.reset();
    katalogPwodwi = await jwennKatalogStok(bizIdAktyèl);
    await rafrechiListFounisè();
  } catch (error) {
    console.error("Erè acha a kredi:", error);
    afficheAvis(`Echèk: ${error.message}`, "danger");
  } finally {
    if (btnSoumèt) btnSoumèt.disabled = false;
  }
}

/* ------------------------------------------------------------------ */
/* RÈGLEMAN FOUNISÈ                                                       */
/* ------------------------------------------------------------------ */
function selectionneFounisè(founisèId, founisèNon, dèt) {
  founisèChwaziId = founisèId;
  const label = document.getElementById("peman-founisè-non");
  if (label) label.textContent = `${founisèNon} — Nou dwe: ${dèt} HTG`;
  document.getElementById("form-peman-founisè")?.classList.remove("hidden");
}

async function soumetPemanFounisè(formData) {
  if (!founisèChwaziId) {
    afficheAvis("Chwazi yon founisè dabò.", "warning");
    return;
  }
  const montanPeye = parseFloat(formData.get("montanPeye"));
  const modePeman = formData.get("modePeman") || "Cash";

  const btnSoumèt = document.getElementById("btn-soumèt-peman-founisè");
  if (btnSoumèt) btnSoumèt.disabled = true;

  try {
    const { pieceRef, nouvoDèt } = await anrejistrePemanFounisè(bizIdAktyèl, {
      founisèId: founisèChwaziId,
      montanPeye,
      modePeman,
      itilizatèId: itilizatèIdAktyèl,
      itilizatèNon: itilizatèNonAktyèl,
    });
    afficheAvis(`Peman anrejistre! Referans: ${pieceRef} — Rete pou dwe: ${nouvoDèt} HTG`, "success");
    document.getElementById("form-peman-founisè")?.reset();
    founisèChwaziId = null;
    await rafrechiListFounisè();
  } catch (error) {
    console.error("Erè peman founisè:", error);
    afficheAvis(`Echèk: ${error.message}`, "danger");
  } finally {
    if (btnSoumèt) btnSoumèt.disabled = false;
  }
}

async function rafrechiListFounisè() {
  try {
    const founisèYo = await jwennFounisèAkDèt(bizIdAktyèl);
    afficheListFounisè(founisèYo);
  } catch (error) {
    console.error("Erè chajman founisè:", error);
    afficheAvis("Pa ka chaje lis founisè yo", "danger");
  }
}

function afficheListFounisè(founisèYo) {
  const container = document.getElementById("founisè-dèt-liste");
  if (!container) return;

  if (founisèYo.length === 0) {
    container.innerHTML = `<p class="text-gray-500 text-sm">Pa gen dèt founisè kounye a.</p>`;
    return;
  }

  container.innerHTML = founisèYo
    .map(
      (f) => `
      <button
        data-founisè-id="${f.id}"
        data-founisè-non="${escapeHTML(f.non || "Founisè")}"
        data-founisè-dèt="${f.dèt}"
        class="w-full text-left p-3 border rounded mb-2 hover:bg-gray-50 flex justify-between"
      >
        <span>${escapeHTML(f.non || "Founisè san non")}</span>
        <span class="font-semibold text-orange-600">${f.dèt} HTG</span>
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
