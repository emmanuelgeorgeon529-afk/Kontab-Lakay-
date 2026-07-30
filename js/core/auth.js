// js/core/auth.js
import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ------------------------------------------------------------------ */
/* TRADIKSYON ERÈ FIREBASE → MESAJ KREYÒL EDIKATIF                       */
/* ------------------------------------------------------------------ */
function tradiErèFirebase(error) {
  const kòd = error?.code || "";
  const mesaj = {
    "auth/email-already-in-use": "Yon kont deja egziste ak email sa a.",
    "auth/invalid-email": "Fòma email lan pa kòrèk.",
    "auth/weak-password": "Modpas la twò fèb — mete omwen 6 karaktè.",
    "auth/user-not-found": "Pa gen kont ak email sa a.",
    "auth/wrong-password": "Modpas la pa kòrèk.",
    "auth/invalid-credential": "Email oswa modpas la pa kòrèk.",
    "auth/too-many-requests": "Twòp tantativ — tann yon ti moman anvan w eseye ankò.",
    "auth/network-request-failed": "Pwoblèm koneksyon entènèt — verifye rezo w.",
  };
  return mesaj[kòd] || `Erè inatandi: ${error?.message || "Erè enkoni"}`;
}

/* ------------------------------------------------------------------ */
/* JWENN KONTÈKS ITILIZATÈ — separe de listener a pou l ka rele ankò    */
/* MANYÈLMAN apre yon enskripsyon reyisi, san pa gen depann sèlman sou  */
/* `onAuthStateChanged` (ki ka deklanche TWÒ BONÈ, anvan ekriti          */
/* Firestore yo fin fèt — gade koumanseKouteAuth() pi ba pou detay).    */
/* ------------------------------------------------------------------ */
export async function jwennKontèksItilizatè(uid, email) {
  try {
    const lookupRef = doc(db, "itilizate_biznis", uid);
    const lookupSnap = await getDoc(lookupRef);

    if (!lookupSnap.exists()) {
      return { uid, email, bizId: null, non: null, wòl: null };
    }

    const bizId = lookupSnap.data().bizId;
    const manmRef = doc(db, "biznis", bizId, "manm", uid);
    const manmSnap = await getDoc(manmRef);

    return {
      uid,
      email,
      bizId,
      non: manmSnap.exists() ? manmSnap.data().non : email,
      wòl: manmSnap.exists() ? manmSnap.data().wol : null,
    };
  } catch (error) {
    console.error("Erè chajman kontèks itilizatè:", error);
    return { uid, email, bizId: null, non: null, wòl: null, erè: error.message };
  }
}

/* ------------------------------------------------------------------ */
/* KOUTE CHANJMAN AUTH — rele onChanje(null) si dekonekte, oswa           */
/* onChanje({ uid, email, bizId, non, wòl }) si konekte ak biznis konplè  */
/*                                                                       */
/* ATANSYON — RACE CONDITION KONNI: `onAuthStateChanged` deklanche       */
/* IMEDYATMAN apre `createUserWithEmailAndPassword()` — sa vle di li ka  */
/* rive AVAN ekriti Firestore yo (biznis/manm/itilizate_biznis) nan      */
/* enskriNouvoBiznis()/enskriAkEnvitasyon() fin egzekite. Se poutèt sa    */
/* app.js dwe rele jwennKontèksItilizatè() MANYÈLMAN apre yon enskripsyon */
/* reyisi, olye l depann sèlman sou premye deklanchman listener sa a.     */
/* ------------------------------------------------------------------ */
export function koumanseKouteAuth(onChanje) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      onChanje(null);
      return;
    }
    const kontèks = await jwennKontèksItilizatè(user.uid, user.email);
    onChanje(kontèks);
  });
}

/* ------------------------------------------------------------------ */
/* ENSKRIPSYON — kreye kont + biznis + premye manm kòm Propriétaire       */
/*                                                                       */
/* NÒT: sa a se 3 ekriti separe (kreyasyon itilizatè Auth, biznis,        */
/* manm) — PA yon transaction Firestore, paske createUserWithEmailAnd    */
/* Password() se yon apèl Auth, pa Firestore, e li pa ka antre nan yon    */
/* runTransaction(). Si yon etap echwe apre kont Auth la kreye, itilizatè */
/* a ap gen yon kont "enkonplè" (bizId: null) — ki detekte pa             */
/* koumanseKouteAuth() epi ki ka reyesèye kreye biznis la ankò.           */
/* ------------------------------------------------------------------ */
export async function enskriNouvoBiznis({ email, modpas, bizNon, itilizatèNon }) {
  if (!email || !modpas || !bizNon || !itilizatèNon) {
    throw new Error("Ranpli tout chan yo pou enskri.");
  }

  let userCredential;
  try {
    userCredential = await createUserWithEmailAndPassword(auth, email, modpas);
  } catch (error) {
    throw new Error(tradiErèFirebase(error));
  }

  const uid = userCredential.user.uid;

  try {
    const bizRef = doc(collection(db, "biznis"));
    const bizId = bizRef.id;

    await setDoc(bizRef, {
      non: bizNon,
      kreyeLe: serverTimestamp(),
    });

    await setDoc(doc(db, "biznis", bizId, "manm", uid), {
      non: itilizatèNon,
      email,
      wol: "Propriétaire",
      kreyeLe: serverTimestamp(),
    });

    await setDoc(doc(db, "itilizate_biznis", uid), {
      bizId,
      kreyeLe: serverTimestamp(),
    });

    return { uid, bizId };
  } catch (error) {
    // Kont Auth la kreye deja men biznis la echwe — pa efase kont Auth la
    // isit la (mande privilèj admin), men avèti itilizatè a klèman.
    console.error("Erè kreyasyon biznis apre kont kreye:", error);
    throw new Error(
      "Kont ou kreye, men gen yon pwoblèm pou kreye biznis la. Rekonekte pou eseye ankò."
    );
  }
}

/* ------------------------------------------------------------------ */
/* ENSKRIPSYON PA ENVITASYON — yon nouvo anplwaye enskri TÈT LI ak yon    */
/* kòd yon jesyonè te kreye. Sa a se apèl Auth "self-service" — li PA     */
/* mande Admin SDK/Cloud Function, kidonk li mache sou plan Spark        */
/* (gratis), pa Blaze. Sekirite a garanti pa firestore.rules: yon kòd     */
/* pa ka itilize 2 fwa, e wòl la dwe egzakteman matche sa envitasyon an   */
/* bay la (verifye ak yon `get()` nan règ Firestore a).                  */
/* ------------------------------------------------------------------ */
export async function enskriAkEnvitasyon({ email, modpas, non, bizId, kòd, wòl }) {
  if (!email || !modpas || !non || !bizId || !kòd || !wòl) {
    throw new Error("Enfòmasyon envitasyon an enkonplè — verifye lyen an.");
  }

  let userCredential;
  try {
    userCredential = await createUserWithEmailAndPassword(auth, email, modpas);
  } catch (error) {
    throw new Error(tradiErèFirebase(error));
  }
  const uid = userCredential.user.uid;

  try {
    // Kreye dosye manm lan — firestore.rules verifye kòd la valid AVAN
    // aksepte ekriti sa a (pa fè konfyans nan kliyan an sèlman).
    await setDoc(doc(db, "biznis", bizId, "manm", uid), {
      non,
      email,
      wol: wòl,
      envitasyonKod: kòd,
      kreyeLe: serverTimestamp(),
    });

    // Konsome kòd envitasyon an pou l pa ka itilize 2 fwa
    await setDoc(
      doc(db, "biznis", bizId, "envitasyon", kòd),
      { itilize: true, itilizePa: uid },
      { merge: true }
    );

    await setDoc(doc(db, "itilizate_biznis", uid), {
      bizId,
      kreyeLe: serverTimestamp(),
    });

    return { uid, bizId };
  } catch (error) {
    console.error("Erè finalizasyon enskripsyon pa envitasyon:", error);
    throw new Error(
      "Kont ou kreye, men lyezon ak biznis la echwe — kontak Propriétaire a pou l verifye kòd la toujou valid."
    );
  }
}

export async function jwennEnvitasyon(bizId, kòd) {
  const ref = doc(db, "biznis", bizId, "envitasyon", kòd);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/* ------------------------------------------------------------------ */
/* KONEKSYON / DEKONEKSYON                                                */
/* ------------------------------------------------------------------ */
export async function konekteItilizatè({ email, modpas }) {
  if (!email || !modpas) {
    throw new Error("Antre email ak modpas.");
  }
  try {
    await signInWithEmailAndPassword(auth, email, modpas);
  } catch (error) {
    throw new Error(tradiErèFirebase(error));
  }
}

export async function dekonekte() {
  await signOut(auth);
}

export async function voyeReyajisManPas(email) {
  if (!email) {
    throw new Error("Antre email ou pou resevwa lyen reyajisman an.");
  }
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    throw new Error(tradiErèFirebase(error));
  }
}
