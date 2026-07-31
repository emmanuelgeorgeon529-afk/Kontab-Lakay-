// js/services/accountingService.js
// Sèvis pou jere tout lojik kontablite (Plan Cont, Jounal, Bilan, P&L)

import { db } from '../core/firebase-config.js';
import { 
  collection, doc, getDoc, getDocs, addDoc, updateDoc, query, where, orderBy, Timestamp, writeBatch 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// --- CONSTANTES ---
const COLLECTION_COA = 'chartOfAccounts'; // Plan de comptes
const COLLECTION_JOURNAL = 'journalEntries'; // Écritures comptables

// --- 1. PLAN DE COMPTES (Chart of Accounts) ---
export async function getChartOfAccounts(companyId) {
  const q = query(
    collection(db, COLLECTION_COA),
    where('companyId', '==', companyId),
    orderBy('code', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// --- 2. ÉCRITURES COMPTABLES (Journal Entries) ---
export async function addJournalEntry(companyId, entryData) {
  // entryData doit contenir : date, reference, description, lines: [{accountId, debit, credit}]
  // Vérification Debit = Credit avant l'envoi
  const totalDebit = entryData.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredit = entryData.lines.reduce((sum, line) => sum + (line.credit || 0), 0);
  
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error("Erreur : Le total des débits doit être égal au total des crédits.");
  }

  const entry = {
    companyId,
    date: Timestamp.fromDate(new Date(entryData.date)),
    reference: entryData.reference,
    description: entryData.description,
    lines: entryData.lines,
    totalDebit,
    totalCredit,
    createdBy: entryData.userId,
    createdAt: Timestamp.now()
  };

  const docRef = await addDoc(collection(db, COLLECTION_JOURNAL), entry);
  return { id: docRef.id, ...entry };
}

export async function getJournalEntries(companyId, startDate, endDate) {
  const start = Timestamp.fromDate(new Date(startDate));
  const end = Timestamp.fromDate(new Date(endDate));
  
  const q = query(
    collection(db, COLLECTION_JOURNAL),
    where('companyId', '==', companyId),
    where('date', '>=', start),
    where('date', '<=', end),
    orderBy('date', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// --- 3. BILAN (Balance Sheet) au 31/MM/AAAA ---
export async function getBalanceSheet(companyId, asOfDate) {
  // Une méthode simplifiée : on somme les soldes des comptes jusqu'à une date donnée.
  // Dans un vrai ERP, on utiliserait les cumuls de journal ou les soldes mensuels.
  // Ici, on va utiliser le Plan de Comptes et simuler un calcul pour l'exemple.
  
  // Récupérer tous les comptes
  const accounts = await getChartOfAccounts(companyId);
  const asOf = new Date(asOfDate);
  asOf.setHours(23, 59, 59); // Fin de journée

  // On va récupérer toutes les écritures jusqu'à cette date (pour démonstration)
  // Dans la vraie vie, il faut faire une agrégation côté serveur (Cloud Function) ou utiliser des soldes pré-calculés.
  const q = query(
    collection(db, COLLECTION_JOURNAL),
    where('companyId', '==', companyId),
    where('date', '<=', Timestamp.fromDate(asOf))
  );
  const snapshot = await getDocs(q);
  
  // Calculer les soldes par compte
  const balances = {};
  snapshot.docs.forEach(doc => {
    const entry = doc.data();
    entry.lines.forEach(line => {
      if (!balances[line.accountId]) balances[line.accountId] = { debit: 0, credit: 0 };
      balances[line.accountId].debit += line.debit || 0;
      balances[line.accountId].credit += line.credit || 0;
    });
  });

  // Structurer le bilan
  const assets = [];
  const liabilities = [];
  const equity = [];
  
  accounts.forEach(acc => {
    const balance = balances[acc.id] || { debit: 0, credit: 0 };
    const solde = balance.debit - balance.credit;
    // Classification simplifiée (1XXX = Actif, 2XXX = Passif, 3XXX = Capitaux)
    if (acc.code.startsWith('1')) {
      assets.push({ ...acc, solde });
    } else if (acc.code.startsWith('2')) {
      liabilities.push({ ...acc, solde: Math.abs(solde) });
    } else if (acc.code.startsWith('3')) {
      equity.push({ ...acc, solde });
    }
  });

  return {
    asOfDate: asOfDate,
    totalAssets: assets.reduce((sum, a) => sum + a.solde, 0),
    totalLiabilities: liabilities.reduce((sum, l) => sum + l.solde, 0),
    totalEquity: equity.reduce((sum, e) => sum + e.solde, 0),
    assets,
    liabilities,
    equity
  };
}

// --- 4. COMPTE DE RÉSULTAT (P&L) ---
export async function getProfitAndLoss(companyId, startDate, endDate) {
  // Récupérer les écritures pour la période
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

  let revenue = 0;
  let expenses = 0;
  
  accounts.forEach(acc => {
    const balance = balances[acc.id] || { debit: 0, credit: 0 };
    // 4XXX = Produits (Revenus), 5XXX = Charges (Dépenses)
    if (acc.code.startsWith('4')) {
      revenue += balance.credit - balance.debit;
    } else if (acc.code.startsWith('5')) {
      expenses += balance.debit - balance.credit;
    }
  });

  return {
    period: `${startDate} to ${endDate}`,
    revenue: revenue,
    expenses: expenses,
    netProfit: revenue - expenses
  };
}
