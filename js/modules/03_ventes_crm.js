// js/modules/03_ventes_crm.js
import { getCustomers, getAllInvoices, getAllQuotes } from '../../services/salesService.js';
import { formatCurrency } from '../../utils/currency.js';

// ID konpayi an (pita sa pral soti nan login la)
const COMPANY_ID = 'demo_company_001';

export async function initVentes() {
    // 1. Chaje tout done yo
    const invoices = await getAllInvoices(COMPANY_ID);
    const customers = await getCustomers(COMPANY_ID);
    const quotes = await getAllQuotes(COMPANY_ID);

    // 2. Kalkile estastistik yo
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7); // Egzanp: "2026-08"

    // Vant Jodi a (filtre faktirasyon ki fèt jodi a)
    const salesTodayTotal = invoices
        .filter(inv => inv.date && inv.date.toDate().toISOString().split('T')[0] === today)
        .reduce((sum, inv) => sum + (inv.total || 0), 0);
    
    // Vant Mwa a (filtre faktirasyon ki fèt nan mwa sa)
    const salesMonthTotal = invoices
        .filter(inv => inv.date && inv.date.toDate().toISOString().split('T')[0].startsWith(currentMonth))
        .reduce((sum, inv) => sum + (inv.total || 0), 0);

    // Total revni (tout faktirasyon)
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

    // Nouvo kliyan (total kliyan nan baz done)
    const newClientsCount = customers.length;

    // Devis an atant (devis ki gen status 'En attente')
    const pendingQuotesCount = quotes.filter(q => q.status === 'En attente').length;

    // 3. Mete ajou UI
    document.getElementById('salesToday').textContent = formatCurrency(salesTodayTotal);
    document.getElementById('salesMonth').textContent = formatCurrency(salesMonthTotal);
    document.getElementById('totalRevenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('newClients').textContent = newClientsCount;
    document.getElementById('pendingQuotes').textContent = pendingQuotesCount;

    // 4. Kreye graf yo (Chart.js)
    createCharts();
}

function createCharts() {
    // Graf 1: Vant pa Mwa (Line Chart)
    const ctxSales1 = document.getElementById('salesChartMonthly')?.getContext('2d');
    if (ctxSales1) {
        new Chart(ctxSales1, {
            type: 'line',
            data: {
                labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
                datasets: [{
                    label: 'Vant (k HTG)',
                    data: [3200, 3400, 3450, 3100, 3500, 3600],
                    borderColor: '#4F46E5',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(79, 70, 229, 0.1)'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    // Graf 2: Vant pa Pwodwi (Pie Chart)
    const ctxSales2 = document.getElementById('salesChartProduct')?.getContext('2d');
    if (ctxSales2) {
        new Chart(ctxSales2, {
            type: 'pie',
            data: {
                labels: ['Kafe', 'Ri Asye', 'Telefòn Smart'],
                datasets: [{ data: [120, 80, 50], backgroundColor: ['#4F46E5', '#10B981', '#EF4444'] }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
    }
