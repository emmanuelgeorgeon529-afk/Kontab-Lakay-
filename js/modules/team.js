// js/modules/team.js
//
// NÒT ACHITEKTI: modil sa a te itilize yon Cloud Function (ajouteAnplwaye)
// ki mande plan Blaze (peman) — nou retire sa nèt pou rete 100% Spark
// (gratis). Kounye a Propriétaire/Administratè kreye yon KÒD ENVITASYON,
// e nouvo anplwaye a ENSKRI TÈT LI ak kòd sa a (gade auth.js:
// enskriAkEnvitasyon()). firestore.rules verifye kòd la valid.

import { db } from "../core/firebase-config.js";
import {
  collection,
  doc,
  setDoc,
  getDocs,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let bizIdAktyèl = null;

export async function inisyalizeTeam(bizId) {
  bizIdAktyèl = bizId;
  branchevènman();
  await rafrechiListManm();
  await rafrechiListEnvitasyon();
}

function branchevènman() {
  const form = document.getElementById("form-envite-anplwaye");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      soumetEnvitasyon(new FormData(form));
    });
  }
}

/* ------------------------------------------------------------------ */
/* KREYE YON KÒD ENVITASYON                                               */
/* ------------------------------------------------------------------ */
async function soumetEnvitasyon(formData) {
  const non = formData.get("non")?.trim();
  const wòl = formData.get("wòl");

  if (!non || !wòl) {
    afficheAvis("Ranpli non ak wòl anplwaye a.", "warning");
    return;
  }

  const btnSoumèt = document.getElementById("btn-envite-anplwaye");
  const zònRezilta = document.getElementById("envite-rezilta");
  if (btnSoumèt) btnSoumèt.disabled = true;

  try {
    const kòd = jenereKòd();
    const ekspireLe = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jou
    await setDoc(doc(db, "biznis", bizIdAktyèl, "envitasyon", kòd), {
      non,
      wol: wòl,
      itilize: false,
      ekspireLe,
      kreyeLe: serverTimestamp(),
    });

    const lyen = `${window.location.origin}${window.location.pathname}?biz=${bizIdAktyèl}&kod=${kòd}`;

    if (zònRezilta) {
      zònRezilta.innerHTML = `
        <div class="bg-emerald-50 border border-emerald-200 rounded p-3 text-sm mt-2">
          <p class="font-semibold text-emerald-800">Kòd envitasyon kreye pou ${escapeHTML(non)} (${escapeHTML(wòl)})</p>
          <p class="mt-1">Voye lyen sa a bay li pa WhatsApp/SMS pou li ka enskri tèt li:</p>
          <p class="mt-1 break-all text-xs bg-white border rounded p-2">${escapeHTML(lyen)}</p>
        </div>`;
    }
    document.getElementById("form-envite-anplwaye")?.reset();
    await rafrechiListEnvitasyon();
  } catch (error) {
    console.error("Erè kreyasyon envitasyon:", error);
    if (zònRezilta) {
      zònRezilta.innerHTML = `<p class="text-red-600 text-sm mt-2">Echèk: ${escapeHTML(error.message)}</p>`;
    }
  } finally {
    if (btnSoumèt) btnSoumèt.disabled = false;
  }
}

/* ------------------------------------------------------------------ */
/* LIS MANM AK ENVITASYON AN ATANT                                       */
/* ------------------------------------------------------------------ */
async function rafrechiListManm() {
  try {
    const snap = await getDocs(collection(db, "biznis", bizIdAktyèl, "manm"));
    const manmYo = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    afficheListManm(manmYo);
  } catch (error) {
    console.error("Erè chajman lis manm:", error);
  }
}

async function rafrechiListEnvitasyon() {
  try {
    const snap = await getDocs(collection(db, "biznis", bizIdAktyèl, "envitasyon"));
    const envitasyonYo = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((e) => !e.itilize);
    afficheListEnvitasyon(envitasyonYo);
  } catch (error) {
    console.error("Erè chajman envitasyon:", error);
  }
}

function afficheListManm(manmYo) {
  const container = document.getElementById("manm-liste");
  if (!container) return;
  container.innerHTML = manmYo
    .map(
      (m) => `
      <div class="flex justify-between items-center py-2 border-b">
        <div>
          <p class="font-bold">${escapeHTML(m.non)}</p>
          <p class="text-xs text-gray-500">${escapeHTML(m.email || "")}</p>
        </div>
        <span class="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100">${escapeHTML(m.wol)}</span>
      </div>`
    )
    .join("");
}

function afficheListEnvitasyon(envitasyonYo) {
  const container = document.getElementById("envitasyon-an-atant-liste");
  if (!container) return;
  if (envitasyonYo.length === 0) {
    container.innerHTML = `<p class="text-gray-500 text-sm">Pa gen envitasyon an atant.</p>`;
    return;
  }
  container.innerHTML = envitasyonYo
    .map(
      (e) => `
      <div class="flex justify-between items-center py-2 border-b">
        <span>${escapeHTML(e.non)} — ${escapeHTML(e.wol)}</span>
        <span class="text-xs text-amber-600 font-semibold">An atant</span>
      </div>`
    )
    .join("");
}

function jenereKòd() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function afficheAvis(message, type) {
  alert(`[${type.toUpperCase()}] ${message}`);
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
