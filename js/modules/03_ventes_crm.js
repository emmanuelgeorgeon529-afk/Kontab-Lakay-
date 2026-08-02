// js/modules/03_ventes_crm.js
import { getCustomers, getAllInvoices, getAllQuotes, createInvoice } from '../../services/salesService.js';
import { formatCurrency } from '../../utils/currency.js';

const COMPANY_ID = 'demo_company_001';

// --- LANSMAN MODIL LA ---
export async function initVentes() {
    const invoices = await getAllInvoices(COMPANY_ID);
    const customers = await getCustomers(COMPANY_ID);
    const quotes = await getAllQuotes(COMPANY_ID);

    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7);

    const salesTodayTotal = invoices
        .filter(inv => inv.date && inv.date.toDate().toISOString().split('T')[0] === today)
        .reduce((sum, inv) => sum + (inv.total || 0), 0);
    
    const salesMonthTotal = invoices
        .filter(inv => inv.date && inv.date.toDate().toISOString().split('T')[0].startsWith(currentMonth))
        .reduce((sum, inv) => sum + (inv.total || 0), 0);

    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const newClientsCount = customers.length;
    const pendingQuotesCount = quotes.filter(q => q.status === 'En attente').length;

    document.getElementById('salesToday').textContent = formatCurrency(salesTodayTotal);
    document.getElementById('salesMonth').textContent = formatCurrency(salesMonthTotal);
    document.getElementById('totalRevenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('newClients').textContent = newClientsCount;
    document.getElementById('pendingQuotes').textContent = pendingQuotesCount;

    createCharts();
}

function createCharts() {
    const ctxSales1 = document.getElementById('salesChartMonthly')?.getContext('2d');
    if (ctxSales1) new Chart(ctxSales1, { type: 'line', data: { labels: ['Jan','Fév','Mar','Avr','Mai','Juin'], datasets: [{ label:'Vant (k HTG)', data:[3200,3400,3450,3100,3500,3600], borderColor:'#4F46E5', tension:0.4, fill:true, backgroundColor:'rgba(79,70,229,0.1)' }] }, options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}} } });
    const ctxSales2 = document.getElementById('salesChartProduct')?.getContext('2d');
    if (ctxSales2) new Chart(ctxSales2, { type: 'pie', data: { labels: ['Kafe','Ri Asye','Telefòn Smart'], datasets: [{ data:[120,80,50], backgroundColor:['#4F46E5','#10B981','#EF4444'] }] }, options: { responsive:true } });
}

// --- FONKSYON MODAL LA ---
window.openSalesModal = function() {
    document.getElementById('newSaleModal').style.display = 'flex';
    document.getElementById('saleDate').valueAsDate = new Date(); // Met dat jodi a pa defo
};

window.closeSalesModal = function() {
    document.getElementById('newSaleModal').style.display = 'none';
};

window.saveNewSale = async function() {
    const customer = document.getElementById('saleCustomer').value.trim();
    const total = parseFloat(document.getElementById('saleTotal').value);
    const date = document.getElementById('saleDate').value;

    if (!customer || isNaN(total) || !date) {
        alert("Tanpri ranpli tout chan yo.");
        return;
    }

    try {
        // Kreye yon nouvo fakti nan Firestore
        await createInvoice(COMPANY_ID, {
            customerName: customer,
            total: total,
            date: new Date(date + 'T00:00:00'), // Konvèti dat la an objè Date pou Firebase
            status: 'Payé',
            items: [{ description: 'Vant manuel', quantity: 1, price: total }] // Egzanp senp
        });

        alert("✅ Vant anrejistre avèk siksè!");
        closeSalesModal();
        
        // Refè KPI yo otomatikman
        await initVentes(); 

    } catch (error) {
        console.error(error);
        alert("❌ Erè pandan anrejistreman: " + error.message);
    }
};
