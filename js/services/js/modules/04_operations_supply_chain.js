// js/modules/04_operations_supply_chain.js
import { getProducts, getSuppliers, createProduct } from '../../services/inventoryService.js';
import { formatCurrency } from '../../utils/currency.js';

const COMPANY_ID = 'demo_company_001';

export async function initOperations() {
    const products = await getProducts(COMPANY_ID);
    const suppliers = await getSuppliers(COMPANY_ID);

    const totalStockValue = products.reduce((sum, p) => sum + ((p.price || 0) * (p.quantity || 0)), 0);
    const totalProductsCount = products.length;
    const activeSuppliers = suppliers.length;
    const stockAlertsCount = products.filter(p => (p.quantity || 0) < (p.minStock || 10)).length;

    document.getElementById('totalStockValue').textContent = formatCurrency(totalStockValue);
    document.getElementById('totalProductsCount').textContent = totalProductsCount;
    document.getElementById('activeSuppliers').textContent = activeSuppliers;
    document.getElementById('stockAlertsCount').textContent = stockAlertsCount;

    createCharts();
}

function createCharts() {
    const ctxStock = document.getElementById('stockChartEvolution')?.getContext('2d');
    if (ctxStock) new Chart(ctxStock, { type: 'line', data: { labels: ['Jan','Fév','Mar','Avr','Mai','Juin'], datasets: [{ label:'Valè Inventory', data:[2.4,2.6,2.5,2.8,2.7,2.8], borderColor:'#4F46E5', tension:0.4, fill:true, backgroundColor:'rgba(79,70,229,0.1)' }] }, options: { responsive:true, maintainAspectRatio:false } });

    const ctxPurch = document.getElementById('purchasesChart')?.getContext('2d');
    if (ctxPurch) new Chart(ctxPurch, { type: 'bar', data: { labels: ['Jan','Fév','Mar','Avr','Mai','Juin'], datasets: [{ label:'Achats', data:[1.0,1.2,1.1,1.4,1.3,1.24], backgroundColor:'#10B981', borderRadius:4 }] }, options: { responsive:true, maintainAspectRatio:false } });
}

// --- MODAL FONKSYON ---
window.openProductModal = function() {
    document.getElementById('newProductModal').style.display = 'flex';
};

window.closeProductModal = function() {
    document.getElementById('newProductModal').style.display = 'none';
};

window.saveNewProduct = async function() {
    const name = document.getElementById('prodName').value.trim();
    const sku = document.getElementById('prodSku').value.trim();
    const category = document.getElementById('prodCategory').value;
    const price = parseFloat(document.getElementById('prodPrice').value);
    const quantity = parseInt(document.getElementById('prodQty').value) || 0;

    if (!name || !sku || isNaN(price) || price <= 0) {
        alert("Tanpri ranpli tout chan yo byen.");
        return;
    }

    try {
        // Kreye yon nouvo pwodwi nan Firestore
        await createProduct(COMPANY_ID, {
            name: name,
            sku: sku,
            category: category,
            price: price,
            quantity: quantity,
            minStock: 10 // Valè pa defo
        });

        alert("✅ Pwodwi ajoute avèk siksè!");
        closeProductModal();
        await initOperations(); // Refè KPI yo otomatikman

    } catch (error) {
        console.error(error);
        alert("❌ Erè pandan anrejistreman: " + error.message);
    }
};
