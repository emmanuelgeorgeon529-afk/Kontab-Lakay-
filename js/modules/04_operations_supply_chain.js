// js/modules/04_operations_supply_chain.js
import { getProducts, getStockMovements, getSuppliers } from '../../services/inventoryService.js';
import { formatCurrency } from '../../utils/currency.js';

const COMPANY_ID = 'demo_company_001';

export async function initOperations() {
    // 1. Chaje done yo
    const products = await getProducts(COMPANY_ID);
    const movements = await getStockMovements(COMPANY_ID);
    const suppliers = await getSuppliers(COMPANY_ID);

    // 2. Kalkile metrik yo
    // Valè Inventory: sum(pri * quantity)
    const totalStockValue = products.reduce((sum, p) => sum + ((p.price || 0) * (p.quantity || 0)), 0);
    
    // Total pwodwi
    const totalProductsCount = products.length;

    // Founisè aktif (tout founisè)
    const activeSuppliers = suppliers.length;

    // Alertes Stock: Pwodwi ki gen quantity < minStock
    const stockAlertsCount = products.filter(p => (p.quantity || 0) < (p.minStock || 10)).length;

    // 3. Mete ajou UI
    document.getElementById('totalStockValue').textContent = formatCurrency(totalStockValue);
    document.getElementById('totalProductsCount').textContent = totalProductsCount;
    document.getElementById('activeSuppliers').textContent = activeSuppliers;
    document.getElementById('stockAlertsCount').textContent = stockAlertsCount;

    // 4. Kreye graf yo (Chart.js)
    createCharts(products);
}

function createCharts(products) {
    // Graf 1: Evolution Stock (Line Chart)
    const ctxStock = document.getElementById('stockChartEvolution')?.getContext('2d');
    if (ctxStock) {
        new Chart(ctxStock, {
            type: 'line',
            data: {
                labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
                datasets: [{
                    label: 'Valè Inventory',
                    data: [2.4, 2.6, 2.5, 2.8, 2.7, 2.8],
                    borderColor: '#4F46E5',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(79,70,229,0.1)'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    // Graf 2: Achats Mensuels (Bar Chart)
    const ctxPurch = document.getElementById('purchasesChart')?.getContext('2d');
    if (ctxPurch) {
        new Chart(ctxPurch, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
                datasets: [{
                    label: 'Achats',
                    data: [1.0, 1.2, 1.1, 1.4, 1.3, 1.24],
                    backgroundColor: '#10B981',
                    borderRadius: 4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }
}
