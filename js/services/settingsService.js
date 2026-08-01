// js/services/settingsService.js
import { db } from '../core/firebase-config.js';
import { doc, getDoc, setDoc, updateDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Récupérer les paramètres d'une entreprise
export async function getSettings(companyId) {
  try {
    const settingsRef = doc(db, 'companies', companyId, 'settings', 'general');
    const docSnap = await getDoc(settingsRef);
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      // Si pa gen paramet, retounen yon konfigirasyon pa defo
      return {
        general: { companyName: "Nom de l'entreprise", nif: "", address: "", phone: "", email: "" },
        localization: { defaultCurrency: "HTG", languages: ["fr"], timezone: "America/Port-au-Prince" },
        taxes: { tva: { enabled: true, rate: 18 }, tps: { enabled: false, rate: 5 }, tca: { enabled: false, rate: 0 } }
      };
    }
  } catch (error) {
    console.error("Erè lekti settings:", error);
    return null;
  }
}

// Mete ajou paramèt yo
export async function updateSettings(companyId, newData) {
  try {
    const settingsRef = doc(db, 'companies', companyId, 'settings', 'general');
    // Ajoute dat modifikasyon an
    newData.updatedAt = Timestamp.now();
    await setDoc(settingsRef, newData, { merge: true });
    return { success: true };
  } catch (error) {
    console.error("Erè modifikasyon settings:", error);
    return { success: false, error: error.message };
  }
}
