// js/modules/02_finance_comptabilite.js
import { getBalanceSheet, getProfitAndLoss, getChartOfAccounts } from '../../services/accountingService.js';
import { formatCurrency } from '../../utils/currency.js';

// ID konpayi an (pita sa pral soti nan login la)
const COMPANY_ID = 'demo_company_001';

// Fonksyon prensipal ki lanse lè modil la chaje
export async function initFinance() {
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    // 1. Chaje Bilan an pou jwenn Kès ak Bank
    const balance = await getBalanceSheet(COMPANY_ID, today);
    const cashAccount = balance.assets.find(acc => acc.code === '1000'); // Sipoze kòd kont kès la se 1000
    const bankAccount = balance.assets.find(acc => acc.code === '1200');  // Sipoze kòd kont bank la se 1200

    // Mete ajou KPI Kès ak Bank
    document.getElementById('cashValue').textContent = formatCurrency(cashAccount ? cashAccount.solde : 0);
    document.getElementById('bankValue').textContent = formatCurrency(bankAccount ? bankAccount.solde : 0);

    // 2. Chaje P&L la pou jwenn Revni ak Depans
    const pl = await getProfitAndLoss(COMPANY_ID, startOfMonth, today);
    document.getElementById('revenueValue').textContent = formatCurrency(pl.revenue || 0);
    document.getElementById('expenseValue').textContent = formatCurrency(pl.expenses || 0);

    // 3. (Opsyonèl) Kalkile ak mete ajou pousantaj chanjman an (Simile yon chanjman pou kounya)
    document.getElementById('cashChange').textContent = '↑ 5%';
    document.getElementById('bankChange').textContent = '↑ 2,4%';
    document.getElementById('revenueChange').textContent = '↑ 12%';
    document.getElementById('expenseChange').textContent = '↑ 4%';

    // 4. Kreye graf yo (Chart.js)
    createCharts();
}

// Fonksyon pou kreye graf yo
function createCharts() {
    // Graf 1: Revni vs Depans (Bar Chart)
    const ctxFin1 = document.getElementById('financeChart1')?.getContext('2d');
    if (ctxFin1) {
        new Chart(ctxFin1, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
                datasets: [
                    { label: 'Revni', data: [800, 850, 890, 820, 910, 890], backgroundColor: '#4F46E5', borderRadius: 4 },
                    { label: 'Depans', data: [600, 620, 645, 610, 680, 660], backgroundColor: '#EF4444', borderRadius: 4 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // Graf 2: Flux de Trésorerie (Line Chart)
    const ctxFin2 = document.getElementById('financeChart2')?.getContext('2d');
    if (ctxFin2) {
        new Chart(ctxFin2, {
            type: 'line',
            data: {
                labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
                datasets: [{ label: 'Flux', data: [120, 80, 150, 52], borderColor: '#10B981', tension: 0.3, fill: false }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
}
