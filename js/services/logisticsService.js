// js/services/logisticsService.js
import { db } from '../core/config.js';
import { collection, addDoc, query, where, getDocs, Timestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js";

const COLLECTION_DELIVERIES = 'deliveries';
const COLLECTION_VEHICLES = 'vehicles';
const COLLECTION_DRIVERS = 'drivers';
const COLLECTION_FUEL = 'fuelLogs';

// --- LIVREZON ---
export async function createDelivery(companyId, deliveryData) {
  const data = { companyId, ...deliveryData, date: Timestamp.now() };
  const ref = await addDoc(collection(db, COLLECTION_DELIVERIES), data);
  return { id: ref.id, ...data };
}

export async function getDeliveries(companyId) {
  const q = query(collection(db, COLLECTION_DELIVERIES), where('companyId', '==', companyId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// --- VEYIKIL ---
export async function getVehicles(companyId) {
  const q = query(collection(db, COLLECTION_VEHICLES), where('companyId', '==', companyId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// --- CHOFÈ ---
export async function getDrivers(companyId) {
  const q = query(collection(db, COLLECTION_DRIVERS), where('companyId', '==', companyId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// --- GAZ ---
export async function getFuelLogs(companyId) {
  const q = query(collection(db, COLLECTION_FUEL), where('companyId', '==', companyId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
