// js/security/sessionManager.js
//
// Jesyon sesyon 100% kote kliyan (san Cloud Functions, konpatib Spark plan).
// Chak itilizatè gen YON dokiman sesyon: biznis/{bizId}/sesyon/{uid}.
// - "dènyèAktivite" refrechi chak 60s (heartbeat) — si li pi vye pase 5 min,
//   n konsidere itilizatè a "enaktif" (li fèmen navigatè a san dekonekte).
// - "revoke: true" pèmèt yon Administratè/Propriétaire fòse dekonekte yon moun.

import { db } from "../core/firebase-config.js";
import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  serverTimestamp,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const SÈY_ENAKTIF_MS = 5 * 60 * 1000; // 5 minit
const ENTÈVAL_HEARTBEAT_MS = 60 * 1000; // 1 minit

let bizIdAktyèl = null;
let uidAktyèl = null;
let heartbeatId = null;
let ekouteSesyonPwòpTèt = null;
let ekouteTouSesyon = null;

/**
 * Rele apre login reyisi (menm kote w rele chajeWolItilizatè nan accessControl.js).
 */
export async function demareSesyon(bizId, uid, non) {
  bizIdAktyèl = bizId;
  uidAktyèl = uid;

  await setDoc(
    doc(db, "biznis", bizId, "sesyon", uid),
    {
      non: non || null,
      aparèy: (navigator.userAgent || "").slice(0, 140),
      dènyèAktivite: serverTimestamp(),
      revoke: false,
    },
    { merge: true }
  );

  demareHeartbeat();
  ekouteRevokasyonPwòpTèt();
}

function demareHeartbeat() {
  if (heartbeatId) clearInterval(heartbeatId);
  heartbeatId = setInterval(async () => {
    try {
      await updateDoc(doc(db, "biznis", bizIdAktyèl, "sesyon", uidAktyèl), {
        dènyèAktivite: serverTimestamp(),
      });
    } catch (error) {
      console.error("Erè heartbeat sesyon:", error);
    }
  }, ENTÈVAL_HEARTBEAT_MS);
}

// Si yon Administratè mete revoke:true sou pwòp dokiman sesyon nou an,
// dekonekte imedyatman — pa gen bezwen refrechi paj la manyèlman.
function ekouteRevokasyonPwòpTèt() {
  if (ekouteSesyonPwòpTèt) ekouteSesyonPwòpTèt();
  ekouteSesyonPwòpTèt = onSnapshot(doc(db, "biznis", bizIdAktyèl, "sesyon", uidAktyèl), (snap) => {
    if (snap.exists() && snap.data().revoke === true) {
      dekonekteFòse();
    }
  });
}

function dekonekteFòse() {
  if (heartbeatId) clearInterval(heartbeatId);
  alert("Sesyon ou te fèmen pa yon administratè. Ou pral dekonekte.");
  // NÒT: ranplase sa a ak apèl reyèl bay fonksyon dekonekte a nan auth.js
  // (egzanp: signOut(auth)) anvan reload.
  window.location.reload();
}

/** Rele lè itilizatè a dekonekte volontèman (bouton "Dekonekte"). */
export function fèmenSesyon() {
  if (heartbeatId) clearInterval(heartbeatId);
  if (ekouteSesyonPwòpTèt) ekouteSesyonPwòpTèt();
  if (ekouteTouSesyon) ekouteTouSesyon();
}

/* ------------------------------------------------------------------ */
/* UI — PAJ "SESSIONS AKTIF" (pou Administratè/Propriétaire)             */
/* ------------------------------------------------------------------ */

export function inisyalizeSessionsUI(bizId) {
  if (ekouteTouSesyon) ekouteTouSesyon();
  ekouteTouSesyon = onSnapshot(collection(db, "biznis", bizId, "sesyon"), (snap) => {
    const sesyonYo = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    afficheListSesyon(bizId, sesyonYo);
  });
}

function afficheListSesyon(bizId, sesyonYo) {
  const container = document.getElementById("sesyon-liste");
  if (!container) return;

  if (sesyonYo.length === 0) {
    container.innerHTML = `<p class="text-gray-500 text-sm">Pa gen sesyon anrejistre.</p>`;
    return;
  }

  const kounyeA = Date.now();

  container.innerHTML = sesyonYo
    .map((s) => {
      const dènyèMs = s.dènyèAktivite instanceof Timestamp ? s.dènyèAktivite.toMillis() : 0;
      const aktif = kounyeA - dènyèMs < SÈY_ENAKTIF_MS;
      const badge = aktif
        ? `<span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Aktif</span>`
        : `<span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Enaktif</span>`;

      return `
      <div class="flex justify-between items-center py-2 border-b text-sm" data-uid="${escapeHTML(s.id)}">
        <div>
          <p class="font-semibold">${escapeHTML(s.non || "Enkoni")}</p>
          <p class="text-xs text-gray-500">${escapeHTML(s.aparèy || "")}</p>
        </div>
        <div class="flex items-center gap-2">
          ${badge}
          <button class="btn-fòse-dekonekte text-xs text-red-600 underline" data-uid="${escapeHTML(s.id)}">
            Dekonekte
          </button>
        </div>
      </div>`;
    })
    .join("");

  container.querySelectorAll(".btn-fòse-dekonekte").forEach((btn) => {
    btn.addEventListener("click", () => fòseDekonekteItilizatè(bizId, btn.dataset.uid));
  });
}

/** Rele pa yon Administratè/Propriétaire pou fòse dekonekte yon manm. */
export async function fòseDekonekteItilizatè(bizId, uid) {
  if (!confirm("Ou sèten ou vle fòse dekonekte itilizatè sa a?")) return;
  await updateDoc(doc(db, "biznis", bizId, "sesyon", uid), { revoke: true });
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
