// js/core/firebase-config.js
// Sèl fichye ki gen konfigirasyon Firebase la — pa dwe gen lojik biznis isit la.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  enableIndexedDbPersistence,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js";

const firebaseConfig = {
  apiKey: "REMPLASE_AVEK_KLE_OU",
  authDomain: "REMPLASE.firebaseapp.com",
  projectId: "REMPLASE",
  storageBucket: "REMPLASE.appspot.com",
  messagingSenderId: "REMPLASE",
  appId: "REMPLASE",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app);

// Aktive offline cache (itil pou PWA sou mobil ak koneksyon fèb)
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === "failed-precondition") {
    console.warn("Persistence: plizyè tab ouvri, sa OK — pa yon erè kritik.");
  } else if (err.code === "unimplemented") {
    console.warn("Navigatè a pa sipòte offline persistence.");
  }
});
