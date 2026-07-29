// js/security/audit.js
//
// Log chak aksyon sansib nan biznis/{bizId}/audit/{autoId}.
// Paske nou rete sou Spark plan (san Cloud Functions), log la fèt
// dirèkteman soti nan navigatè a — sa vle di CHAK modil (accounting.js,
// expenses.js, team.js...) dwe rele anrejistreAksyon() li menm apre
// yon aksyon sansib. Sa PA otomatik san sa.

import { db } from "../core/firebase-config.js";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/**
 * Anrejistre yon aksyon nan audit log.
 * @param {string} bizId
 * @param {object} detay - { itilizatèId, itilizatèNon, wol, modil, aksyon, sib, enfòSipl }
 */
export async function anrejistreAksyon(bizId, detay) {
  if (!bizId) return; // pa kraze aplikasyon an si kontèks pa pare
  try {
    await addDoc(collection(db, "biznis", bizId, "audit"), {
      itilizatèId: detay.itilizatèId ?? null,
      itilizatèNon: detay.itilizatèNon ?? null,
      wol: detay.wol ?? null,
      modil: detay.modil ?? null,
      aksyon: detay.aksyon ?? null,
      sib: detay.sib ?? null,
      enfòSipl: detay.enfòSipl ?? null,
      kreyeLe: serverTimestamp(),
    });
  } catch (error) {
    // Yon echèk log pa dwe janm bloke yon operasyon biznis reyèl.
    console.error("Erè anrejistreman audit:", error);
  }
}

/* ------------------------------------------------------------------ */
/* UI — PAJ "AUDIT LOGS" (50 DÈNYE AKSYON)                              */
/* ------------------------------------------------------------------ */

export async function inisyalizeAuditLogsUI(bizId) {
  await rafrechiListAudit(bizId);
  document.getElementById("btn-rafrechi-audit")?.addEventListener("click", () => rafrechiListAudit(bizId));
}

async function rafrechiListAudit(bizId) {
  try {
    const q = query(
      collection(db, "biznis", bizId, "audit"),
      orderBy("kreyeLe", "desc"),
      limit(50)
    );
    const snap = await getDocs(q);
    const lisyo = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    afficheListAudit(lisyo);
  } catch (error) {
    console.error("Erè chajman audit log:", error);
    const container = document.getElementById("audit-liste");
    if (container) {
      container.innerHTML = `<p class="text-red-600 text-sm">Erè chajman audit log.</p>`;
    }
  }
}

function afficheListAudit(lisyo) {
  const container = document.getElementById("audit-liste");
  if (!container) return;

  if (lisyo.length === 0) {
    container.innerHTML = `<p class="text-gray-500 text-sm">Pa gen aksyon anrejistre ankò.</p>`;
    return;
  }

  container.innerHTML = lisyo
    .map((l) => {
      const refize = (l.aksyon || "").startsWith("REFIZE:");
      const badge = refize
        ? `<span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Refize</span>`
        : `<span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">OK</span>`;
      return `
      <div class="flex justify-between items-start py-2 border-b text-sm">
        <div>
          <p class="font-semibold">${escapeHTML(l.itilizatèNon || "Enkoni")}
            <span class="text-xs text-gray-400 font-normal">(${escapeHTML(l.wol || "—")})</span>
          </p>
          <p class="text-xs text-gray-500">
            ${escapeHTML(l.aksyon || "")} · ${escapeHTML(l.modil || "")}
            ${l.sib ? " · " + escapeHTML(String(l.sib)) : ""}
          </p>
        </div>
        <div class="text-right">
          ${badge}
          <p class="text-xs text-gray-400 mt-1">${formatDat(l.kreyeLe)}</p>
        </div>
      </div>`;
    })
    .join("");
}

function formatDat(ts) {
  if (!ts?.toDate) return "";
  return ts.toDate().toLocaleString("fr-HT", { dateStyle: "short", timeStyle: "short" });
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
