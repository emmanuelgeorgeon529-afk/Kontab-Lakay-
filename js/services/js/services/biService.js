// js/services/biService.js
import { db } from '../core/config.js';
import { collection, query, where, getDocs, Timestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js";

// Rekipere tout revni (fakti) ak kliyan
export async function getBIStats(companyId) {
    // 1. Fakti pou revni
    const invRef = collection(db, 'invoices');
    const invQuery = query(invRef, where('companyId', '==', companyId));
    const invSnap = await getDocs(invQuery);
    const invoices = invSnap.docs.map(d => d.data());

    // 2. Kliyan
    const custRef = collection(db, 'customers');
    const custQuery = query(custRef, where('companyId', '==', companyId));
    const custSnap = await getDocs(custQuery);
    const customers = custSnap.docs.map(d => d.data());

    // 3. Anplwaye (pou distribisyon)
    const empRef = collection(db, 'employees');
    const empQuery = query(empRef, where('companyId', '==', companyId));
    const empSnap = await getDocs(empQuery);
    const employees = empSnap.docs.map(d => d.data());

    return { invoices, customers, employees };
}
