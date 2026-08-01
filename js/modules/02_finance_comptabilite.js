// js/modules/02_finance_comptabilite.js
import { getBalanceSheet, getChartOfAccounts } from '../services/accountingService.js';
import { formatCurrency } from '../utils/currency.js';

const COMPANY_ID = 'demo_company_001';

export async function loadFinanceKPIs() {
    const today = new Date().toISOString().split('T')[0];
    const balance = await getBalanceSheet(COMPANY_ID, today);
    
    // Mettre à jour les KPI
    document.getElementById('financeTotalAssets').textContent = formatCurrency(balance.totalAssets);
    document.getElementById('financeTotalLiabilities').textContent = formatCurrency(balance.totalLiabilities);
    
    // On suppose que vous avez ajouté des IDs à vos KPI dans views/finance_comptabilite.html
}

export function initFinance() {
    loadFinanceKPIs();
    // Ici, vous pouvez appeler une fonction pour créer les graphiques Chart.js
}
