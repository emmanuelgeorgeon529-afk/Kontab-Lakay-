// js/services/inventoryService.js
import { db } from '../core/config.js';
import { collection, doc, getDocs, addDoc, query, where, Timestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js";

const COLLECTION_PRODUCTS = 'products';
const COLLECTION_STOCK_MOVEMENT = 'stockMovements';
const COLLECTION_SUPPLIERS = 'suppliers';

// --- PWODWI ---
export async function createProduct(companyId, productData) {
  const data = { companyId, ...productData, createdAt: Timestamp.now() };
  const ref = await addDoc(collection(db, COLLECTION_PRODUCTS), data);
  return { id: ref.id, ...data };
}

export async function getProducts(companyId) {
  const q = query(collection(db, COLLECTION_PRODUCTS), where('companyId', '==', companyId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// --- MOUVMAN STOCK ---
export async function addStockMovement(companyId, movementData) {
  const data = { companyId, ...movementData, date: Timestamp.now() };
  const ref = await addDoc(collection(db, COLLECTION_STOCK_MOVEMENT), data);
  return { id: ref.id, ...data };
}

export async function getStockMovements(companyId) {
  const q = query(collection(db, COLLECTION_STOCK_MOVEMENT), where('companyId', '==', companyId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// --- FOUNISÈ ---
export async function createSupplier(companyId, supplierData) {
  const data = { companyId, ...supplierData, createdAt: Timestamp.now() };
  const ref = await addDoc(collection(db, COLLECTION_SUPPLIERS), data);
  return { id: ref.id, ...data };
}

export async function getSuppliers(companyId) {
  const q = query(collection(db, COLLECTION_SUPPLIERS), where('companyId', '==', companyId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
