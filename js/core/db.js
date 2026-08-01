import { db } from './config.js';
import { collection, doc, getDoc, setDoc, deleteDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js";

export const getDocument = async (col, id) => {
  const ref = doc(db, col, id);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
};

export const setDocument = async (col, id, data) => {
  await setDoc(doc(db, col, id), data, { merge: true });
};

export const queryCollection = async (col, field, value) => {
  const q = query(collection(db, col), where(field, '==', value));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};
