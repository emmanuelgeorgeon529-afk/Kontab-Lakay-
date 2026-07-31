// js/core/auth.js
import { auth } from './firebase-config.js';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Variable globale pour suivre l'utilisateur connecté
let currentUser = null;

// 1. Connexion (Login)
export async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    currentUser = userCredential.user;
    return { success: true, user: currentUser };
  } catch (error) {
    console.error("Erreur de connexion:", error.message);
    return { success: false, error: error.message };
  }
}

// 2. Inscription (Register)
export async function registerUser(email, password, displayName) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    currentUser = userCredential.user;
    // Note : On peut ajouter le displayName dans Firestore plus tard
    return { success: true, user: currentUser };
  } catch (error) {
    console.error("Erreur d'inscription:", error.message);
    return { success: false, error: error.message };
  }
}

// 3. Déconnexion (Logout)
export async function logoutUser() {
  try {
    await signOut(auth);
    currentUser = null;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 4. Observateur d'état (pour protéger les pages)
export function onAuthStateChange(callback) {
  return onAuthStateChanged(auth, (user) => {
    currentUser = user;
    callback(user);
  });
}

// 5. Obtenir l'utilisateur actuel
export function getCurrentUser() {
  return currentUser;
}
