// js/services/salesService.js
import { db } from '../core/config.js';
import { collection, addDoc, query, where, getDocs, Timestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js";

const COLLECTION_CUSTOMERS = 'customers';
const COLLECTION_INVOICES = 'invoices';

// Ajoute yon kliyan
export async function createCustomer(companyId, customerData) {
  const data = { companyId, ...customerData, createdAt: Timestamp.now() };
  const ref = await addDoc(collection(db, COLLECTION_CUSTOMERS), data);
  return { id: ref.id, ...data };
}

// Kreye yon fakti
export async function createInvoice(companyId, invoiceData) {
  const data = { companyId, ...invoiceData, date: Timestamp.now(), status: 'En attente' };
  const ref = await addDoc(collection(db, COLLECTION_INVOICES), data);
  return { id: ref.id, ...data };
}

// Rekipere faktirasyon kliyan
export async function getInvoicesByCustomer(companyId, customerId) {
  const q = query(collection(db, COLLECTION_INVOICES), where('companyId', '==', companyId), where('customerId', '==', customerId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
