// js/modules/05_logistique_distribution.js
import { getDeliveries, getVehicles, getFuelLogs } from '../../services/logisticsService.js';
import { formatCurrency } from '../../utils/currency.js';

const COMPANY_ID = 'demo_company_001';

export async function initLogistique() {
    // 1. Chaje done yo
    const deliveries = await getDeliveries(COMPANY_ID);
    const vehicles = await getVehicles(COMPANY_ID);
    const fuelLogs = await getFuelLogs(COMPANY_ID);

    // 2. Kalkile metrik yo
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7);

    // Livrezon an atant
    const pendingDeliveries = deliveries.filter(d => d.status === 'En attente').length;
    
    // Livrezon jodi a
    const todayDeliveries = deliveries.filter(d => d.date && d.date.toDate().toISOString().split('T')[0] === today).length;

    // Depans transpò (total depans pou mwa sa)
    const transportCost = deliveries
        .filter(d => d.date && d.date.toDate().toISOString().split('T')[0].startsWith(currentMonth))
        .reduce((sum, d) => sum + (d.cost || 0), 0);

    // Retou
    const returnsCount = deliveries.filter(d => d.type === 'return').length;

    // Depans gaz (total mwa sa)
    const fuelCost = fuelLogs
        .filter(f => f.date && f.date.toDate().toISOString().split('T')[0].startsWith(currentMonth))
        .reduce((sum, f) => sum + (f.total || 0), 0);

    // Veyikil aktif
    const activeVehicles = vehicles.filter(v => v.status === 'Actif').length;

    // 3. Mete ajou UI
    document.getElementById('pendingDeliveries').textContent = pendingDeliveries;
    document.getElementById('todayDeliveries').textContent = todayDeliveries;
    document.getElementById('transportCost').textContent = formatCurrency(transportCost);
    document.getElementById('returnsCount').textContent = returnsCount;
    document.getElementById('fuelCost').textContent = formatCurrency(fuelCost);
    document.getElementById('activeVehicles').textContent = activeVehicles;

    // 4. Kreye graf yo
    createCharts(deliveries);
}

function createCharts(deliveries) {
    // Graf 1: Livrezon pa mwa (Line Chart)
    const ctxDel = document.getElementById('deliveriesChart')?.getContext('2d');
    if (ctxDel) {
        new Chart(ctxDel, {
            type: 'line',
            data: {
                labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
                datasets: [{
                    label: 'Livrezon',
                    data: [45, 52, 48, 60, 55, 58],
                    borderColor: '#4F46E5',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(79,70,229,0.1)'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    // Graf 2: Depans transpò (Bar Chart)
    const ctxCost = document.getElementById('transportCostsChart')?.getContext('2d');
    if (ctxCost) {
        new Chart(ctxCost, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
                datasets: [{
                    label: 'Depans (k HTG)',
                    data: [180, 200, 215, 190, 220, 210],
                    backgroundColor: '#EF4444',
                    borderRadius: 4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }
}
