// js/services/accountingService.js
// Vèsyon GLOBAL (pa gen import/export)
// Asire w js/core/config.js la chaje db globalman anvan!

// 1. Dekonpoze Firebase helper yo (piske yo soti nan CDN)
const { collection, doc, getDoc, getDocs, addDoc, query, where, orderBy, Timestamp } = firebase.firestore();
const db = window.db || firebase.firestore(); // Sèvi ak db global la

const COLLECTION_COA = 'chartOfAccounts';
const COLLECTION_JOURNAL = 'journalEntries';

// --- 1. Plan de Comptes ---
async function getChartOfAccounts(companyId) {
  const q = query(collection(db, COLLECTION_COA), where('companyId', '==', companyId), orderBy('code', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// --- 2. Ajoute yon ekriti ---
async function addJournalEntry(companyId, entryData) {
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

// --- 3. Rekipere ekriti yo pou P&L ---
async function getJournalEntries(companyId, startDate, endDate) {
  const start = Timestamp.fromDate(new Date(startDate));
  const end = Timestamp.fromDate(new Date(endDate));
  const q = query(
    collection(db, COLLECTION_JOURNAL),
    where('companyId', '==', companyId),
    where('date', '>=', start),
    where('date', '<=', end),
    orderBy('date', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// --- 4. Bilan ---
async function getBalanceSheet(companyId, asOfDate) {
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

// --- 5. Compte de Résultat (P&L) ---
async function getProfitAndLoss(companyId, startDate, endDate) {
  const entries = await getJournalEntries(companyId, startDate, endDate);
  const accounts = await getChartOfAccounts(companyId);
  const balances = {};
  entries.forEach(entry => {
    entry.lines.forEach(line => {
      if (!balances[line.accountId]) balances[line.accountId] = { debit: 0, credit: 0 };
      balances[line.accountId].debit += line.debit || 0;
      balances[line.accountId].credit += line.credit || 0;
    });
  });
  let revenue = 0, expenses = 0;
  accounts.forEach(acc => {
    const b = balances[acc.id] || { debit: 0, credit: 0 };
    if (acc.code.startsWith('4')) revenue += b.credit - b.debit;
    else if (acc.code.startsWith('5')) expenses += b.debit - b.credit;
  });
  return { revenue, expenses, netProfit: revenue - expenses };
}

// --- Mete tout fonksyon yo GLOBAL pou modil yo ka itilize yo ---
window.getChartOfAccounts = getChartOfAccounts;
window.addJournalEntry = addJournalEntry;
window.getBalanceSheet = getBalanceSheet;
window.getProfitAndLoss = getProfitAndLoss;
