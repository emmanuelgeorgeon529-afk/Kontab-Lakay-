// js/services/inventoryService.js
import { db } from '../core/config.js';
import { collection, doc, getDocs, addDoc, query, where, Timestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js";

const COLLECTION_PRODUCTS = 'products';
const COLLECTION_STOCK_MOVEMENT = 'stockMovements';

// Kreye yon pwodwi
export async function createProduct(companyId, productData) {
  const data = { companyId, ...productData, createdAt: Timestamp.now() };
  const ref = await addDoc(collection(db, COLLECTION_PRODUCTS), data);
  return { id: ref.id, ...data };
}

// Rekipere tout pwodwi yon konpayi
export async function getProducts(companyId) {
  const q = query(collection(db, COLLECTION_PRODUCTS), where('companyId', '==', companyId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Ajoute yon mouvman stock (Antre / Sòti)
export async function addStockMovement(companyId, movementData) {
  const data = { companyId, ...movementData, date: Timestamp.now() };
  const ref = await addDoc(collection(db, COLLECTION_STOCK_MOVEMENT), data);
  return { id: ref.id, ...data };
}
