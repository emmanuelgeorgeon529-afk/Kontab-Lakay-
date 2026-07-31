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
  apiKey: "AIzaSyCloroCtw8hrdVQH-Cj1aIbJpb-HG5UhMI",
  authDomain: "kontab-lakay-5b169.firebaseapp.com",
  databaseURL: "https://kontab-lakay-5b169-default-rtdb.firebaseio.com",
  projectId: "kontab-lakay-5b169",
  storageBucket: "kontab-lakay-5b169.firebasestorage.app",
  messagingSenderId: "221994063902",
  appId: "1:221994063902:web:5248558df3775341d6f60f",
  measurementId: "G-CXH1G88X4D"
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
