// js/services/saasService.js
import { db } from '../core/config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js";

// Koleksyon an se 'settings' anba konpayi an, ak yon dokiman id 'saas'
export async function getSaaSSettings(companyId) {
  const ref = doc(db, 'companies', companyId, 'settings', 'saas');
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return snap.data();
  }
  // Konfigirasyon pa defo
  return {
    languages: ['ht', 'fr', 'en', 'es'],
    currencies: ['HTG', 'USD', 'EUR', 'CAD', 'DOP'],
    taxes: { tva: true, tps: false, tca: false },
    apis: { gmail: true, sheets: true, bank: false, csv: true }
  };
}

export async function updateSaaSSettings(companyId, data) {
  const ref = doc(db, 'companies', companyId, 'settings', 'saas');
  await setDoc(ref, data, { merge: true });
  return { success: true };
}
