// js/services/hrService.js
import { db } from '../core/config.js';
import { collection, addDoc, query, where, getDocs, Timestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js";

const COLLECTION_EMPLOYEES = 'employees';
const COLLECTION_ATTENDANCE = 'attendance';

// Ajoute yon anplwaye
export async function createEmployee(companyId, employeeData) {
  const data = { companyId, ...employeeData, createdAt: Timestamp.now(), status: 'Actif' };
  const ref = await addDoc(collection(db, COLLECTION_EMPLOYEES), data);
  return { id: ref.id, ...data };
}

// Pointage (Prezans)
export async function addAttendance(companyId, employeeId, type) {
  const data = { companyId, employeeId, type, date: Timestamp.now() };
  const ref = await addDoc(collection(db, COLLECTION_ATTENDANCE), data);
  return { id: ref.id, ...data };
}
