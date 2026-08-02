// js/modules/13_ecommerce_omnicanal.js
import { getEcommerceProducts, getEcommerceOrders, createEcommerceProduct } from '../../services/ecommerceService.js';
import { formatCurrency } from '../../utils/currency.js';

const COMPANY_ID = 'demo_company_001';
let ecomProducts = [];
let ecomOrders = [];

export async function initEcommerce() {
    // 1. Chaje done yo
    ecomProducts = await getEcommerceProducts(COMPANY_ID);
    ecomOrders = await getEcommerceOrders(COMPANY_ID);

    // 2. Kalkile metrik yo
    const currentMonth = new Date().toISOString().split('T')[0].substring(0, 7);
    
    // Vant mwa sa
    const ecomSales = ecomOrders
        .filter(order => order.createdAt && order.createdAt.toDate().toISOString().split('T')[0].startsWith(currentMonth))
        .reduce((sum, order) => sum + (order.total || 0), 0);
    const ecomOrdersCount = ecomOrders.length;
    
    // Panier mwayen
    const avgCart = ecomOrders.length > 0 ? ecomOrders.reduce((sum, order) => sum + (order.total || 0), 0) / ecomOrders.length : 0;
    
    // Konvèsyon (Simile yon pousantaj ki baze sou kòmand)
    const convRate = ecomOrders.length > 0 ? Math.min((ecomOrders.length / 100) * 5, 100) : 0;
    
    // Vizitè (Fiks pou demo)
    const visitors = 4400;

    // 3. Mete ajou UI
    document.getElementById('ecomSales').textContent = formatCurrency(ecomSales);
    document.getElementById('ecomOrders').textContent = ecomOrdersCount;
    document.getElementById('ecomAvgCart').textContent = formatCurrency(avgCart);
    document.getElementById('ecomConvRate').textContent = convRate.toFixed(1) + '%';
    document.getElementById('ecomVisitors').textContent = visitors;

    // 4. Ranpli tablo yo
    renderTables();
    
    // 5. Kreye graf yo
    createCharts();
}

function renderTables() {
    // Tablo Pwodwi
    const productTable = document.getElementById('ecomProductTable');
    if (ecomProducts.length === 0) {
        productTable.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:20px;">Okenn pwodwi.</td></tr>`;
    } else {
        productTable.innerHTML = ecomProducts.slice(0, 5).map(p => `
            <tr>
                <td>${p.sku || 'N/A'}</td>
                <td>${p.name || 'Sans non'}</td>
                <td>${formatCurrency(p.price || 0)}</td>
                <td>${p.stock || 0}</td>
            </tr>
        `).join('');
    }

    // Tablo Kòmand
    const orderTable = document.getElementById('ecomOrderTable');
    if (ecomOrders.length === 0) {
        orderTable.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:20px;">Okenn kòmand.</td></tr>`;
    } else {
        orderTable.innerHTML = ecomOrders.slice(0, 5).map(o => `
            <tr>
                <td>#${o.id ? o.id.substring(0, 6) : 'N/A'}</td>
                <td>${o.customerName || 'Inconnu'}</td>
                <td>${formatCurrency(o.total || 0)}</td>
                <td><span style="background:#D1FAE5; color:#047857; padding:2px 8px; border-radius:12px; font-size:11px;">${o.status || 'Confirmée'}</span></td>
            </tr>
        `).join('');
    }
}

function createCharts() {
    // Graf 1: Vant pa Chanèl (Doughnut)
    const ctxChannel = document.getElementById('ecomChannelChart')?.getContext('2d');
    if (ctxChannel) {
        new Chart(ctxChannel, {
            type: 'doughnut',
            data: {
                labels: ['Sit Web', 'Marketplace', 'Sosyal Médias', 'Boutik Fizik'],
                datasets: [{ data: [45, 25, 20, 10], backgroundColor: ['#4F46E5', '#10B981', '#EF4444', '#F59E0B'] }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 12 } } } } }
        });
    }

    // Graf 2: Tandans Konvèsyon (Line)
    const ctxConv = document.getElementById('ecomSalesChart')?.getContext('2d');
    if (ctxConv) {
        new Chart(ctxConv, {
            type: 'line',
            data: {
                labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
                datasets: [{ label: 'Konvèsyon %', data: [2.2, 2.8, 3.0, 3.2], borderColor: '#4F46E5', tension: 0.4, fill: true, backgroundColor: 'rgba(79,70,229,0.1)' }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { display: false } }, x: { grid: { display: false } } } }
        });
    }
}

// --- MODAL LOGIC ---
window.openEcomProductModal = function() {
    document.getElementById('newEcomProductModal').style.display = 'flex';
};

window.closeEcomProductModal = function() {
    document.getElementById('newEcomProductModal').style.display = 'none';
};

window.saveEcomProduct = async function() {
    const name = document.getElementById('ecomProductName').value.trim();
    const sku = document.getElementById('ecomProductSku').value.trim();
    const price = parseFloat(document.getElementById('ecomProductPrice').value);

    if (!name || !sku || isNaN(price) || price <= 0) {
        alert("Tanpri ranpli tout chan yo byen.");
        return;
    }

    try {
        await createEcommerceProduct(COMPANY_ID, {
            name: name,
            sku: sku,
            price: price,
            stock: 0
        });
        alert("✅ Pwodwi e-commerce ajoute avèk siksè!");
        closeEcomProductModal();
        await initEcommerce(); // Refè UI
    } catch (error) {
        alert("❌ Erè: " + error.message);
    }
};
