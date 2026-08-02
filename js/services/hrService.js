// js/services/hrService.js
import { db } from '../core/config.js';
import { collection, addDoc, query, where, getDocs, Timestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js";

const COLLECTION_EMPLOYEES = 'employees';
const COLLECTION_ATTENDANCE = 'attendance';
const COLLECTION_LEAVES = 'leaves';
const COLLECTION_PAYROLL = 'payroll';

// --- ANPLWAYE ---
export async function createEmployee(companyId, employeeData) {
  const data = { companyId, ...employeeData, createdAt: Timestamp.now(), status: 'Actif' };
  const ref = await addDoc(collection(db, COLLECTION_EMPLOYEES), data);
  return { id: ref.id, ...data };
}

export async function getEmployees(companyId) {
  const q = query(collection(db, COLLECTION_EMPLOYEES), where('companyId', '==', companyId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// --- PREZANS ---
export async function addAttendance(companyId, employeeId, type) {
  const data = { companyId, employeeId, type, date: Timestamp.now() };
  const ref = await addDoc(collection(db, COLLECTION_ATTENDANCE), data);
  return { id: ref.id, ...data };
}

export async function getAttendance(companyId) {
  const q = query(collection(db, COLLECTION_ATTENDANCE), where('companyId', '==', companyId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// --- KONJE ---
export async function getLeaves(companyId) {
  const q = query(collection(db, COLLECTION_LEAVES), where('companyId', '==', companyId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// --- PEWÒL ---
export async function getPayroll(companyId) {
  const q = query(collection(db, COLLECTION_PAYROLL), where('companyId', '==', companyId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
