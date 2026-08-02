// js/services/legalService.js
import { db } from '../core/config.js';
import { collection, addDoc, query, where, getDocs, Timestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js";

const COLLECTION_CONTRACTS = 'contracts';
const COLLECTION_INSURANCE = 'insurance';
const COLLECTION_PORTAL_ACCESS = 'portalAccess';

// --- KONTRA ---
export async function createContract(companyId, contractData) {
  const data = { companyId, ...contractData, createdAt: Timestamp.now(), status: 'Aktif' };
  const ref = await addDoc(collection(db, COLLECTION_CONTRACTS), data);
  return { id: ref.id, ...data };
}

export async function getContracts(companyId) {
  const q = query(collection(db, COLLECTION_CONTRACTS), where('companyId', '==', companyId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// --- ASIRANS ---
export async function getInsurance(companyId) {
  const q = query(collection(db, COLLECTION_INSURANCE), where('companyId', '==', companyId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// --- PÒTAL AKSÈ (Kliyan / Founisè) ---
export async function getPortalAccess(companyId) {
  const q = query(collection(db, COLLECTION_PORTAL_ACCESS), where('companyId', '==', companyId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
