// js/modules/02_finance_comptabilite.js
// AVÈTISMAN: Sèvis yo (accountingService.js, currency.js) dwe chaje anvan! 
// Gade nòt anba pou konvèti sèvis yo tou.

const COMPANY_ID = 'demo_company_001';

// Fonksyon prensipal init la (pa gen export, li pral global)
async function initFinance() {
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    // Sèvi ak fonksyon global yo (soti nan sèvis)
    const balance = await window.getBalanceSheet(COMPANY_ID, today);
    const cashAccount = balance.assets.find(acc => acc.code === '1000'); 
    const bankAccount = balance.assets.find(acc => acc.code === '1200');  

    document.getElementById('cashValue').textContent = window.formatCurrency(cashAccount ? cashAccount.solde : 0);
    document.getElementById('bankValue').textContent = window.formatCurrency(bankAccount ? bankAccount.solde : 0);

    const pl = await window.getProfitAndLoss(COMPANY_ID, startOfMonth, today);
    document.getElementById('revenueValue').textContent = window.formatCurrency(pl.revenue || 0);
    document.getElementById('expenseValue').textContent = window.formatCurrency(pl.expenses || 0);

    document.getElementById('cashChange').textContent = '↑ 5%';
    document.getElementById('bankChange').textContent = '↑ 2,4%';
    document.getElementById('revenueChange').textContent = '↑ 12%';
    document.getElementById('expenseChange').textContent = '↑ 4%';

    createCharts();
}

function createCharts() {
    const ctxFin1 = document.getElementById('financeChart1')?.getContext('2d');
    if (ctxFin1) new Chart(ctxFin1, { type: 'bar', data: { labels: ['Jan','Fév','Mar','Avr','Mai','Juin'], datasets: [{ label:'Revni', data:[800,850,890,820,910,890], backgroundColor:'#4F46E5', borderRadius:4 }, { label:'Depans', data:[600,620,645,610,680,660], backgroundColor:'#EF4444', borderRadius:4 }] }, options: { responsive:true, maintainAspectRatio:false } });
    const ctxFin2 = document.getElementById('financeChart2')?.getContext('2d');
    if (ctxFin2) new Chart(ctxFin2, { type: 'line', data: { labels: ['Sem1','Sem2','Sem3','Sem4'], datasets: [{ label:'Flux', data:[120,80,150,52], borderColor:'#10B981', tension:0.3, fill:false }] }, options: { responsive:true, maintainAspectRatio:false } });
}

// --- MODAL FONKSYON (Deja global) ---
window.openJournalModal = function() {
    document.getElementById('newJournalModal').style.display = 'flex';
    document.getElementById('journalDate').valueAsDate = new Date();
};

window.closeJournalModal = function() {
    document.getElementById('newJournalModal').style.display = 'none';
};

window.saveJournalEntry = async function() {
    const date = document.getElementById('journalDate').value;
    const ref = document.getElementById('journalRef').value.trim();
    const desc = document.getElementById('journalDesc').value.trim();
    const debitAcc = document.getElementById('journalDebitAcc').value;
    const creditAcc = document.getElementById('journalCreditAcc').value;
    const amount = parseFloat(document.getElementById('journalAmount').value);

    if (!date || !desc || isNaN(amount) || amount <= 0) {
        alert("Tanpri ranpli tout chan yo byen.");
        return;
    }

    try {
        const lines = [
            { accountId: debitAcc, debit: amount, credit: 0 },
            { accountId: creditAcc, debit: 0, credit: amount }
        ];

        await window.addJournalEntry(COMPANY_ID, {
            date: date,
            reference: ref || 'MANUEL',
            description: desc,
            lines: lines
        });

        alert("✅ Ekriti jounal anrejistre avèk siksè!");
        closeJournalModal();
        await initFinance(); // Refè KPI yo

    } catch (error) {
        console.error(error);
        alert("❌ Erè pandan anrejistreman: " + error.message);
    }
};

// Mete init la global pou routeur la ka rele l
window.init = initFinance;
