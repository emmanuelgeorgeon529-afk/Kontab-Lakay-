// js/modules/pos.js
import { anrejistreVant, jwennKatalogStok } from "../core/db.js";

/* --- Eta lokal modil la --- */
let panyen = [];              // [{ produitId, non, kantite, prixInite, cmpInite }]
let katalogPwodwi = [];       // katalòg ki soti nan Firestore
let bizIdAktyèl = null;
let vandèIdAktyèl = null;
let vandèNonAktyèl = null;

/* ------------------------------------------------------------------ */
/* INISYALIZASYON                                                      */
/* ------------------------------------------------------------------ */
export async function inisyalizePOS(bizId, vandèId, vandèNon) {
  bizIdAktyèl = bizId;
  vandèIdAktyèl = vandèId;
  vandèNonAktyèl = vandèNon;

  branchevènman();
  await chajeKatalog();
}

function branchevènman() {
  // Event delegation: yon SÈL listener sou paran an, olye onclick sou chak
  // bouton. Sa mache ak modil ES6 e li pi pèfòman ak plis atik.
  const katalogContainer = document.getElementById("katalog-grid");
  if (katalogContainer) {
    katalogContainer.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-produit-id]");
      if (btn) ajouteNanPanyen(btn.dataset.produitId);
    });
  }

  const panyenContainer = document.getElementById("panyen-list");
  if (panyenContainer) {
    panyenContainer.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-retire-id]");
      if (btn) retireNanPanyen(btn.dataset.retireId);
    });
  }

  const btnPeye = document.getElementById("btn-peye");
  if (btnPeye) {
    btnPeye.addEventListener("click", () => {
      const modPeman = document.querySelector('input[name="mod-peman"]:checked')?.value || "Cash";
      soumetVant(modPeman);
    });
  }
}

/* ------------------------------------------------------------------ */
/* KATALÒG                                                             */
/* ------------------------------------------------------------------ */
async function chajeKatalog() {
  try {
    katalogPwodwi = await jwennKatalogStok(bizIdAktyèl);
    afficheKatalog();
  } catch (error) {
    console.error("Erè pandan chajman katalòg la:", error);
    afficheAvis("Pa ka chaje pwodwi yo", "danger");
  }
}

/* ------------------------------------------------------------------ */
/* PANYEN                                                               */
/* ------------------------------------------------------------------ */
export function ajouteNanPanyen(produitId, kantite = 1) {
  const pwodwi = katalogPwodwi.find((p) => p.id === produitId);
  if (!pwodwi) {
    afficheAvis("Pwodwi sa a pa egziste!", "warning");
    return;
  }

  const atikNanPanyen = panyen.find((it) => it.produitId === produitId);
  const kantiteMande = atikNanPanyen ? atikNanPanyen.kantite + kantite : kantite;

  // Verifikasyon rapid lokal — verifikasyon FINAL la fèt nan runTransaction()
  // sou db.js, sa a se jis pou bon eksperyans itilizatè a.
  if (kantiteMande > pwodwi.kantite) {
    afficheAvis(`Stòk ensifizan! Rete sèlman ${pwodwi.kantite}.`, "danger");
    return;
  }

  if (atikNanPanyen) {
    atikNanPanyen.kantite = kantiteMande;
  } else {
    panyen.push({
      produitId: pwodwi.id,
      non: pwodwi.non,
      kantite,
      prixInite: pwodwi.priVant,
      cmpInite: pwodwi.cmp || 0,
    });
  }
  afficheKPanyen();
}

export function retireNanPanyen(produitId) {
  panyen = panyen.filter((it) => it.produitId !== produitId);
  afficheKPanyen();
}

export function videPanyen() {
  panyen = [];
  afficheKPanyen();
}

/* ------------------------------------------------------------------ */
/* SOUMÈT VANT LA                                                       */
/* ------------------------------------------------------------------ */
export async function soumetVant(modPeman = "Cash", kliyanId = null) {
  if (panyen.length === 0) {
    afficheAvis("Panyen an vid!", "warning");
    return;
  }

  const total = panyen.reduce((sum, it) => sum + it.kantite * it.prixInite, 0);

  dezaktiveBoutonPeman(true);
  try {
    const resilta = await anrejistreVant(bizIdAktyèl, {
      items: panyen,
      peman: { mòd: modPeman, montan: total },
      kliyanId,
      vandèId: vandèIdAktyèl,
      vandèNon: vandèNonAktyèl,
    });

    afficheAvis(`Vant anrejistre! Facti #: ${resilta.nimewoFacti}`, "success");
    videPanyen();
    await chajeKatalog(); // rafrechi kantite stòk ki afiche a
  } catch (error) {
    console.error("Erè nan vant lan:", error);
    afficheAvis(`Echèk vant: ${error.message}`, "danger");
  } finally {
    dezaktiveBoutonPeman(false);
  }
}

/* ------------------------------------------------------------------ */
/* RENDER (DOM)                                                        */
/* ------------------------------------------------------------------ */
function afficheKatalog() {
  const container = document.getElementById("katalog-grid");
  if (!container) return;

  container.innerHTML = katalogPwodwi
    .map(
      (p) => `
      <button data-produit-id="${p.id}" class="p-4 border rounded shadow hover:bg-gray-50 text-left">
        <h4 class="font-bold">${escapeHTML(p.non)}</h4>
        <p class="text-green-600 font-semibold">${p.priVant} HTG</p>
        <p class="text-xs text-gray-500">Stòk: ${p.kantite}</p>
      </button>`
    )
    .join("");
}

function afficheKPanyen() {
  const container = document.getElementById("panyen-list");
  const totalEl = document.getElementById("panyen-total");
  if (!container) return;

  container.innerHTML = panyen
    .map(
      (it) => `
      <div class="panyen-item flex justify-between items-center py-2 border-b">
        <div>
          <p class="font-bold">${escapeHTML(it.non)}</p>
          <p class="text-sm text-gray-500">${it.kantite} x ${it.prixInite} HTG</p>
        </div>
        <div class="flex items-center gap-2">
          <span class="font-semibold">${it.kantite * it.prixInite} HTG</span>
          <button data-retire-id="${it.produitId}" class="text-red-500 text-sm">✕</button>
        </div>
      </div>`
    )
    .join("");

  const total = panyen.reduce((sum, it) => sum + it.kantite * it.prixInite, 0);
  if (totalEl) totalEl.textContent = `${total} HTG`;
}

function dezaktiveBoutonPeman(status) {
  const btn = document.getElementById("btn-peye");
  if (btn) btn.disabled = status;
}

function afficheAvis(message, type) {
  // Ranplase pa yon vrè tòs/notifikasyon UI pita — alert() se jis pou MVP.
  alert(`[${type.toUpperCase()}] ${message}`);
}

// Ti fonksyon pwoteksyon kont XSS lè nou enjekte non pwodwi/kliyan nan innerHTML
function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
      }
