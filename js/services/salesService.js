// js/services/salesService.js
import { db } from '../core/config.js';
import { collection, addDoc, query, where, getDocs, Timestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js";

const COLLECTION_CUSTOMERS = 'customers';
const COLLECTION_INVOICES = 'invoices';
const COLLECTION_QUOTES = 'quotes';

export async function createCustomer(companyId, customerData) {
  const data = { companyId, ...customerData, createdAt: Timestamp.now() };
  const ref = await addDoc(collection(db, COLLECTION_CUSTOMERS), data);
  return { id: ref.id, ...data };
}

export async function getCustomers(companyId) {
  const q = query(collection(db, COLLECTION_CUSTOMERS), where('companyId', '==', companyId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// --- NOUVO: Kreye yon fakti ---
export async function createInvoice(companyId, invoiceData) {
  // Ajoute companyId ak dat Firestore
  const data = { 
    companyId, 
    ...invoiceData, 
    createdAt: Timestamp.now(),
    date: Timestamp.fromDate(invoiceData.date) // Konvèti dat la an Timestamp
  };
  const ref = await addDoc(collection(db, COLLECTION_INVOICES), data);
  return { id: ref.id, ...data };
}

export async function getAllInvoices(companyId) {
  const q = query(collection(db, COLLECTION_INVOICES), where('companyId', '==', companyId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getAllQuotes(companyId) {
  const q = query(collection(db, COLLECTION_QUOTES), where('companyId', '==', companyId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
