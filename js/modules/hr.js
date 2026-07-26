// js/modules/hr.js
import {
  anrejistrePwennaj,
  anrejistrePewòl,
  jwennPwennajJodi,
  jwennDènyePewòl,
} from "../core/db.js";

let bizIdAktyèl = null;
let itilizatèIdAktyèl = null;
let itilizatèNonAktyèl = null;

export async function inisyalizeHR(bizId, itilizatèId, itilizatèNon) {
  bizIdAktyèl = bizId;
  itilizatèIdAktyèl = itilizatèId;
  itilizatèNonAktyèl = itilizatèNon;

  branchevènman();
  await rafrechiDènyePewòl();
}

function branchevènman() {
  const btnAntre = document.getElementById("btn-pwennaj-antre");
  if (btnAntre) {
    btnAntre.addEventListener("click", () => soumetPwennaj("ENTREE"));
  }
  const btnSòti = document.getElementById("btn-pwennaj-sòti");
  if (btnSòti) {
    btnSòti.addEventListener("click", () => soumetPwennaj("SORTIE"));
  }

  const formPewòl = document.getElementById("form-pewòl");
  if (formPewòl) {
    formPewòl.addEventListener("submit", (e) => {
      e.preventDefault();
      soumetPewòl(new FormData(formPewòl));
    });
  }
}

/* ------------------------------------------------------------------ */
/* PWENNAJ                                                                */
/* ------------------------------------------------------------------ */
async function soumetPwennaj(tip) {
  try {
    // Verifikasyon rapid: pa kite yon moun antre 2 fwa youn apre lòt san sòti.
    const dènye = await jwennPwennajJodi(bizIdAktyèl, itilizatèIdAktyèl);
    if (dènye && dènye.tip === tip) {
      afficheAvis(
        tip === "ENTREE" ? "Ou deja antre — sòti anvan w antre ankò." : "Ou deja sòti.",
        "warning"
      );
      return;
    }

    await anrejistrePwennaj(bizIdAktyèl, {
      anplwayeId: itilizatèIdAktyèl,
      anplwayeNon: itilizatèNonAktyèl,
      tip,
    });
    afficheAvis(tip === "ENTREE" ? "Antre anrejistre!" : "Sòti anrejistre!", "success");
  } catch (error) {
    console.error("Erè pwennaj:", error);
    afficheAvis(`Echèk: ${error.message}`, "danger");
  }
}

/* ------------------------------------------------------------------ */
/* PEWÒL                                                                  */
/* ------------------------------------------------------------------ */
async function soumetPewòl(formData) {
  const anplwayeId = formData.get("anplwayeId");
  const anplwayeNon = formData.get("anplwayeNon");
  const salèDeBaz = parseFloat(formData.get("salèDeBaz"));
  const prim = parseFloat(formData.get("prim")) || 0;
  const dediksyon = parseFloat(formData.get("dediksyon")) || 0;
  const modePeman = formData.get("modePeman") || "Cash";

  if (!anplwayeId || !anplwayeNon || isNaN(salèDeBaz) || salèDeBaz <= 0) {
    afficheAvis("Ranpli tout chan yo kòrèkteman.", "warning");
    return;
  }

  const btnSoumèt = document.getElementById("btn-soumèt-pewòl");
  if (btnSoumèt) btnSoumèt.disabled = true;

  try {
    const { pieceRef, netAPeye } = await anrejistrePewòl(bizIdAktyèl, {
      anplwayeId,
      anplwayeNon,
      salèDeBaz,
      prim,
      dediksyon,
      modePeman,
      itilizatèId: itilizatèIdAktyèl,
      itilizatèNon: itilizatèNonAktyèl,
    });
    afficheAvis(`Pewòl peye! Referans: ${pieceRef} — Net: ${netAPeye} HTG`, "success");
    document.getElementById("form-pewòl")?.reset();
    await rafrechiDènyePewòl();
  } catch (error) {
    console.error("Erè pewòl:", error);
    afficheAvis(`Echèk: ${error.message}`, "danger");
  } finally {
    if (btnSoumèt) btnSoumèt.disabled = false;
  }
}

async function rafrechiDènyePewòl() {
  try {
    const pewòlYo = await jwennDènyePewòl(bizIdAktyèl);
    afficheListPewòl(pewòlYo);
  } catch (error) {
    console.error("Erè chajman pewòl:", error);
    afficheAvis("Pa ka chaje istorik pewòl la", "danger");
  }
}

function afficheListPewòl(pewòlYo) {
  const container = document.getElementById("pewòl-liste");
  if (!container) return;

  container.innerHTML = pewòlYo
    .map(
      (p) => `
      <div class="pewòl-item flex justify-between items-center py-2 border-b">
        <div>
          <p class="font-bold">${escapeHTML(p.anplwayeNon)}</p>
          <p class="text-sm text-gray-500">${escapeHTML(p.pieceRef)} &middot; ${escapeHTML(p.modePeman)}</p>
        </div>
        <span class="font-semibold text-red-600">-${p.netAPeye} HTG</span>
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
