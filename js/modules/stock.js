// js/modules/stock.js
import {
  jwennKatalogStok,
  kreyePwodwi,
  meteAjouPwiPwodwi,
  ajisteStok,
} from "../core/db.js";

let katalogPwodwi = [];
let bizIdAktyèl = null;

/* ------------------------------------------------------------------ */
/* INISYALIZASYON                                                       */
/* ------------------------------------------------------------------ */
export async function inisyalizeStock(bizId) {
  bizIdAktyèl = bizId;
  branchevènman();
  await chajeKatalog();
}

function branchevènman() {
  const formNouvo = document.getElementById("form-nouvo-pwodwi");
  if (formNouvo) {
    formNouvo.addEventListener("submit", (e) => {
      e.preventDefault();
      soumetNouvoPwodwi(new FormData(formNouvo));
      formNouvo.reset();
    });
  }

  const listeStok = document.getElementById("stok-liste");
  if (listeStok) {
    listeStok.addEventListener("click", (e) => {
      const btnPlis = e.target.closest("[data-ajoute-id]");
      const btnMwens = e.target.closest("[data-retire-id]");
      if (btnPlis) ouvriPromptAjisteman(btnPlis.dataset.ajouteId, 1);
      if (btnMwens) ouvriPromptAjisteman(btnMwens.dataset.retireId, -1);
    });
  }
}

/* ------------------------------------------------------------------ */
/* KATALÒG                                                              */
/* ------------------------------------------------------------------ */
async function chajeKatalog() {
  try {
    katalogPwodwi = await jwennKatalogStok(bizIdAktyèl);
    afficheStok();
  } catch (error) {
    console.error("Erè chajman stòk:", error);
    afficheAvis("Pa ka chaje stòk la", "danger");
  }
}

/* ------------------------------------------------------------------ */
/* KREYE NOUVO PWODWI                                                    */
/* ------------------------------------------------------------------ */
async function soumetNouvoPwodwi(formData) {
  const non = formData.get("non")?.trim();
  const priVant = parseFloat(formData.get("priVant"));
  const cmp = parseFloat(formData.get("cmp")) || 0;
  const kantiteInisyal = parseInt(formData.get("kantiteInisyal"), 10) || 0;
  const stokMinimòmBrit = formData.get("stokMinimòm");
  const stokMinimòm = stokMinimòmBrit ? parseInt(stokMinimòmBrit, 10) : null;

  if (!non || isNaN(priVant) || priVant <= 0) {
    afficheAvis("Non ak pri vant obligatwa e dwe pozitif.", "warning");
    return;
  }

  try {
    await kreyePwodwi(bizIdAktyèl, { non, priVant, cmp, kantiteInisyal, stokMinimòm });
    afficheAvis(`Pwodwi "${non}" kreye avèk siksè.`, "success");
    await chajeKatalog();
  } catch (error) {
    console.error("Erè kreyasyon pwodwi:", error);
    afficheAvis(`Echèk kreyasyon: ${error.message}`, "danger");
  }
}

/* ------------------------------------------------------------------ */
/* AJISTEMAN STÒK (antre/sòti manyèl, koreksyon, kase, pèt)             */
/* ------------------------------------------------------------------ */
function ouvriPromptAjisteman(produitId, siyen) {
  // siyen: +1 pou antre, -1 pou sòti — MVP itilize prompt(), ranplase pa
  // yon modal pita.
  const kantiteStr = prompt(
    siyen > 0 ? "Konbyen w ap ajoute?" : "Konbyen w ap retire?"
  );
  const kantite = parseInt(kantiteStr, 10);
  if (isNaN(kantite) || kantite <= 0) return;

  const motif = prompt("Motif (egz: 'Livrezon founisè', 'Pwodwi kase')") || "Ajisteman manyèl";

  soumetAjisteman(produitId, kantite * siyen, motif);
}

async function soumetAjisteman(produitId, kantiteChanjman, motif) {
  try {
    await ajisteStok(bizIdAktyèl, produitId, kantiteChanjman, motif);
    afficheAvis("Stòk ajiste avèk siksè.", "success");
    await chajeKatalog();
  } catch (error) {
    console.error("Erè ajisteman stòk:", error);
    afficheAvis(`Echèk ajisteman: ${error.message}`, "danger");
  }
}

/* ------------------------------------------------------------------ */
/* METE AJOU PRI VANT / CMP DIRÈKTEMAN (san afekte kantite)              */
/* ------------------------------------------------------------------ */
export async function metaAjouPriPwodwi(produitId, priVant, cmp) {
  try {
    await meteAjouPwiPwodwi(bizIdAktyèl, produitId, { priVant, cmp });
    afficheAvis("Pri mete ajou.", "success");
    await chajeKatalog();
  } catch (error) {
    console.error("Erè mete ajou pri:", error);
    afficheAvis(`Echèk: ${error.message}`, "danger");
  }
}

/* ------------------------------------------------------------------ */
/* RENDER (DOM)                                                          */
/* ------------------------------------------------------------------ */
function afficheStok() {
  const container = document.getElementById("stok-liste");
  if (!container) return;

  container.innerHTML = katalogPwodwi
    .map((p) => {
      const alèt = p.kantite <= (p.sèyStokMinimum || 5);
      return `
      <div class="stok-item flex justify-between items-center py-2 border-b ${alèt ? "bg-red-50" : ""}">
        <div>
          <p class="font-bold">${escapeHTML(p.non)}</p>
          <p class="text-sm text-gray-500">
            Pri: ${p.priVant} HTG &middot; CMP: ${p.cmp || 0} HTG
          </p>
        </div>
        <div class="flex items-center gap-3">
          <span class="font-semibold ${alèt ? "text-red-600" : ""}">${p.kantite}</span>
          <button data-ajoute-id="${p.id}" class="text-green-600 font-bold px-2">+</button>
          <button data-retire-id="${p.id}" class="text-red-600 font-bold px-2">−</button>
        </div>
      </div>`;
    })
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
