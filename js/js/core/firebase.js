// Importation des modules Firebase (via CDN ou npm)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, doc, getDoc, setDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// --- CONFIGURATION FIREBASE ---
// Remplacez ces valeurs par celles de votre projet Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSy...", // À remplacer
  authDomain: "kontab-lakay.firebaseapp.com",
  projectId: "kontab-lakay",
  storageBucket: "kontab-lakay.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

// Initialisation
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// --- SERVICES DE DONNÉES (DB Wrapper) ---

// 1. Authentification
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const logoutUser = async () => {
  await signOut(auth);
};

export const onUserChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// 2. Firestore (Accès aux données)
export const getDocument = async (collectionName, docId) => {
  const docRef = doc(db, collectionName, docId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
};

export const setDocument = async (collectionName, docId, data) => {
  await setDoc(doc(db, collectionName, docId), data, { merge: true });
};

export const queryCollection = async (collectionName, field, value) => {
  const q = query(collection(db, collectionName), where(field, "==", value));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Export des instances pour utilisation dans les modules
export { db, auth, storage };
