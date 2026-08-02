// js/services/ecommerceService.js
import { db } from '../core/config.js';
import { collection, addDoc, query, where, getDocs, Timestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js";

const COLLECTION_ECOMM_PRODUCTS = 'ecommerceProducts';
const COLLECTION_ECOMM_ORDERS = 'ecommerceOrders';

// --- PWODWI E-COMMERCE ---
export async function createEcommerceProduct(companyId, productData) {
  const data = { companyId, ...productData, createdAt: Timestamp.now() };
  const ref = await addDoc(collection(db, COLLECTION_ECOMM_PRODUCTS), data);
  return { id: ref.id, ...data };
}

export async function getEcommerceProducts(companyId) {
  const q = query(collection(db, COLLECTION_ECOMM_PRODUCTS), where('companyId', '==', companyId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// --- KÒMAND E-COMMERCE ---
export async function createEcommerceOrder(companyId, orderData) {
  const data = { companyId, ...orderData, createdAt: Timestamp.now(), status: 'Confirmée' };
  const ref = await addDoc(collection(db, COLLECTION_ECOMM_ORDERS), data);
  return { id: ref.id, ...data };
}

export async function getEcommerceOrders(companyId) {
  const q = query(collection(db, COLLECTION_ECOMM_ORDERS), where('companyId', '==', companyId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
