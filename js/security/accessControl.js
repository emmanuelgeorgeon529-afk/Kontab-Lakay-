// js/security/accessControl.js
//
// Middleware santral: chaje wòl itilizatè a soti nan Firestore epi
// verifye pèmisyon anvan CHAK aksyon sansib nan lòt modil yo.
//
// ITILIZASYON nan yon lòt modil (egzanp accounting.js):
//
//   import { verifyePèmisyon } from "../security/accessControl.js";
//
//   async function efaseFakti(faktiId) {
//     verifyePèmisyon(MODIL.ACCOUNTING, AKSYON.DELETE); // voye Error si refize
//     await deleteDoc(doc(db, "biznis", bizIdAktyèl, "fakti", faktiId));
//     await anrejistreAksyon(bizIdAktyèl, { modil: "accounting", aksyon: "delete", sib: faktiId });
//   }

import { db } from "../core/firebase-config.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { genPèmisyon } from "./permissions.js";
import { anrejistreAksyon } from "./audit.js";
import { wolValid } from "./roles.js";

let bizIdAktyèl = null;
let uidAktyèl = null;
let wolItilizatèAktyèl = null;
let nonItilizatèAktyèl = null;

/**
 * Rele fonksyon sa a YON SÈL FWA, imedyatman apre login reyisi
 * (nan auth.js, apre onAuthStateChanged konfime itilizatè a).
 */
export async function chajeWolItilizatè(bizId, uid) {
  bizIdAktyèl = bizId;
  uidAktyèl = uid;

  const snap = await getDoc(doc(db, "biznis", bizId, "manm", uid));
  if (!snap.exists()) {
    throw new Error("Itilizatè sa a pa yon manm biznis sa a. Kontakte Administratè w.");
  }

  const done_ = snap.data();
  if (!wolValid(done_.wol)) {
    throw new Error(`Wòl "${done_.wol}" pa yon wòl rekonèt nan sistèm nan.`);
  }

  wolItilizatèAktyèl = done_.wol;
  nonItilizatèAktyèl = done_.non || null;
  return wolItilizatèAktyèl;
}

export function getWolAktyèl() {
  return wolItilizatèAktyèl;
}

export function getKontèksAktyèl() {
  return { bizId: bizIdAktyèl, uid: uidAktyèl, wol: wolItilizatèAktyèl, non: nonItilizatèAktyèl };
}

/**
 * Verifye pèmisyon — voye yon Error si aksè refize (epi anrejistre tantativ la).
 * Sèvi ak sa a kòm premye liy nan CHAK fonksyon ki kreye/modifye/efase done.
 */
export function verifyePèmisyon(modil, aksyon) {
  if (!wolItilizatèAktyèl) {
    throw new Error("Kontèks sekirite pa chaje. Rele chajeWolItilizatè() apre login.");
  }

  const otorize = genPèmisyon(wolItilizatèAktyèl, modil, aksyon);

  if (!otorize) {
    // Pa bloke sou echèk log — men pa janm kite yon echèk log anpeche refi a rive.
    anrejistreAksyon(bizIdAktyèl, {
      itilizatèId: uidAktyèl,
      itilizatèNon: nonItilizatèAktyèl,
      wol: wolItilizatèAktyèl,
      modil,
      aksyon: `REFIZE:${aksyon}`,
    }).catch(() => {});

    throw new Error(
      `Aksè refize: wòl "${wolItilizatèAktyèl}" pa gen dwa "${aksyon}" sou modil "${modil}".`
    );
  }

  return true;
}

/**
 * Vèsyon ki pa voye Error — itil pou kache/montre bouton nan UI a
 * san w pa deklanche yon eksepsyon.
 */
export function kaFè(modil, aksyon) {
  if (!wolItilizatèAktyèl) return false;
  return genPèmisyon(wolItilizatèAktyèl, modil, aksyon);
}

/**
 * Wrapper konvenyans: verifye pèmisyon, egzekite fonksyon an, epi
 * otomatikman anrejistre aksyon an nan audit log si li reyisi.
 */
export async function avekPèmisyonEAudit(modil, aksyon, sib, fonksyon) {
  verifyePèmisyon(modil, aksyon);
  const rezilta = await fonksyon();
  await anrejistreAksyon(bizIdAktyèl, {
    itilizatèId: uidAktyèl,
    itilizatèNon: nonItilizatèAktyèl,
    wol: wolItilizatèAktyèl,
    modil,
    aksyon,
    sib,
  });
  return rezilta;
}
