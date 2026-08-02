// js/services/documentService.js
import { db } from '../core/config.js';
import { collection, addDoc, query, where, getDocs, Timestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js";

const COLLECTION_DOCUMENTS = 'documents';

// Kreye yon dokiman
export async function createDocument(companyId, documentData) {
  const data = { 
    companyId, 
    ...documentData, 
    uploadedAt: Timestamp.now(),
    status: 'Valide' // pa defo
  };
  const ref = await addDoc(collection(db, COLLECTION_DOCUMENTS), data);
  return { id: ref.id, ...data };
}

// Rekipere tout dokiman yon konpayi
export async function getDocuments(companyId) {
  const q = query(collection(db, COLLECTION_DOCUMENTS), where('companyId', '==', companyId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
