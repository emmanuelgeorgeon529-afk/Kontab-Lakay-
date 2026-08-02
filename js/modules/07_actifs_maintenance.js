// js/modules/07_actifs_maintenance.js
import { getAssets, getMaintenance } from '../../services/assetService.js';
import { formatCurrency } from '../../utils/currency.js';

const COMPANY_ID = 'demo_company_001';

export async function initActifs() {
    // 1. Chaje done yo
    const assets = await getAssets(COMPANY_ID);
    const maintenance = await getMaintenance(COMPANY_ID);

    // 2. Kalkile metrik yo
    const totalAssetsValue = assets.reduce((sum, a) => sum + (a.purchasePrice || 0), 0);
    const accumulatedDepreciation = assets.reduce((sum, a) => sum + (a.depreciation || 0), 0);
    const netBookValue = totalAssetsValue - accumulatedDepreciation;

    // Antretyen pwograme (status: 'Planifié')
    const scheduledMaintenance = maintenance.filter(m => m.status === 'Planifié').length;
    // Antretyen an reta (status: 'En retard')
    const overdueMaintenance = maintenance.filter(m => m.status === 'En retard').length;

    // Machin aktif (kategori 'Véhicule' ak status 'Actif')
    const activeVehiclesAssets = assets.filter(a => a.category === 'Véhicule' && a.status === 'Actif').length;

    // 3. Mete ajou UI
    document.getElementById('totalAssetsValue').textContent = formatCurrency(totalAssetsValue);
    document.getElementById('accumulatedDepreciation').textContent = formatCurrency(accumulatedDepreciation);
    document.getElementById('netBookValue').textContent = formatCurrency(netBookValue);
    document.getElementById('scheduledMaintenance').textContent = scheduledMaintenance;
    document.getElementById('overdueMaintenance').textContent = overdueMaintenance;
    document.getElementById('activeVehiclesAssets').textContent = activeVehiclesAssets;

    // 4. Kreye graf yo
    createCharts(assets, maintenance);
}

function createCharts(assets, maintenance) {
    // Graf 1: Evolisyon valè byen (Line Chart)
    const ctxVal = document.getElementById('assetValueChart')?.getContext('2d');
    if (ctxVal) {
        new Chart(ctxVal, {
            type: 'line',
            data: {
                labels: ['2021', '2022', '2023', '2024', '2025', '2026'],
                datasets: [{
                    label: 'Valè total (M HTG)',
                    data: [6.5, 7.0, 7.8, 8.2, 8.45, 8.45],
                    borderColor: '#4F46E5',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(79,70,229,0.1)'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    // Graf 2: Depans antretyen pa mwa (Bar Chart)
    const ctxMaint = document.getElementById('assetMaintenanceChart')?.getContext('2d');
    if (ctxMaint) {
        new Chart(ctxMaint, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
                datasets: [{
                    label: 'Depans (k HTG)',
                    data: [15, 22, 18, 30, 12, 25],
                    backgroundColor: '#EF4444',
                    borderRadius: 4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }
}
