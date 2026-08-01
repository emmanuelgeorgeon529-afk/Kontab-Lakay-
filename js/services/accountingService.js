// js/services/accountingService.js
import { db } from '../core/config.js';
import { collection, doc, getDoc, getDocs, addDoc, query, where, orderBy, Timestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js";

const COLLECTION_COA = 'chartOfAccounts';
const COLLECTION_JOURNAL = 'journalEntries';

// 1. Plan de Comptes
export async function getChartOfAccounts(companyId) {
  const q = query(collection(db, COLLECTION_COA), where('companyId', '==', companyId), orderBy('code', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// 2. Ajoute yon ekriti
export async function addJournalEntry(companyId, entryData) {
  const totalDebit = entryData.lines.reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalCredit = entryData.lines.reduce((sum, l) => sum + (l.credit || 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) throw new Error("Total Débit ≠ Total Crédit");

  const entry = {
    companyId,
    date: Timestamp.fromDate(new Date(entryData.date)),
    reference: entryData.reference,
    description: entryData.description,
    lines: entryData.lines,
    totalDebit, totalCredit,
    createdAt: Timestamp.now()
  };
  const ref = await addDoc(collection(db, COLLECTION_JOURNAL), entry);
  return { id: ref.id, ...entry };
}

// 3. Bilan (senplifye)
export async function getBalanceSheet(companyId, asOfDate) {
  const accounts = await getChartOfAccounts(companyId);
  const endDate = new Date(asOfDate); endDate.setHours(23,59,59);
  
  const q = query(collection(db, COLLECTION_JOURNAL), where('companyId', '==', companyId), where('date', '<=', Timestamp.fromDate(endDate)));
  const snap = await getDocs(q);
  
  const balances = {};
  snap.docs.forEach(doc => {
    const entry = doc.data();
    entry.lines.forEach(line => {
      if (!balances[line.accountId]) balances[line.accountId] = { debit: 0, credit: 0 };
      balances[line.accountId].debit += line.debit || 0;
      balances[line.accountId].credit += line.credit || 0;
    });
  });

  const assets = [], liabilities = [], equity = [];
  accounts.forEach(acc => {
    const b = balances[acc.id] || { debit: 0, credit: 0 };
    const solde = b.debit - b.credit;
    if (acc.code.startsWith('1')) assets.push({ ...acc, solde });
    else if (acc.code.startsWith('2')) liabilities.push({ ...acc, solde: Math.abs(solde) });
    else if (acc.code.startsWith('3')) equity.push({ ...acc, solde });
  });

  return {
    totalAssets: assets.reduce((s, a) => s + a.solde, 0),
    totalLiabilities: liabilities.reduce((s, l) => s + l.solde, 0),
    totalEquity: equity.reduce((s, e) => s + e.solde, 0),
    assets, liabilities, equity
  };
}
