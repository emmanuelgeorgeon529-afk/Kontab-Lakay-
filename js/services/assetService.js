// js/services/assetService.js
import { db } from '../core/config.js';
import { collection, addDoc, query, where, getDocs, Timestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js";

const COLLECTION_ASSETS = 'assets';
const COLLECTION_MAINTENANCE = 'maintenance';

// --- BYEN (IMMOBILISATIONS) ---
export async function createAsset(companyId, assetData) {
  const data = { companyId, ...assetData, createdAt: Timestamp.now() };
  const ref = await addDoc(collection(db, COLLECTION_ASSETS), data);
  return { id: ref.id, ...data };
}

export async function getAssets(companyId) {
  const q = query(collection(db, COLLECTION_ASSETS), where('companyId', '==', companyId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// --- ANTRETYEN ---
export async function getMaintenance(companyId) {
  const q = query(collection(db, COLLECTION_MAINTENANCE), where('companyId', '==', companyId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
