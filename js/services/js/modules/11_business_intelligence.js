// js/modules/11_business_intelligence.js
import { getBIStats } from '../../services/biService.js';
import { formatCurrency } from '../../utils/currency.js';

const COMPANY_ID = 'demo_company_001';

export async function initBI() {
    // 1. Chaje done yo
    const { invoices, customers, employees } = await getBIStats(COMPANY_ID);

    // 2. Kalkile metrik yo
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalClients = customers.length;

    // Kalkile kwasans (konpare dènye mwa ak mwa anvan an — fè yon senplifikasyon tès)
    const currentMonth = new Date().toISOString().split('T')[0].substring(0, 7);
    const prevMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0].substring(0, 7);
    
    const currentRevenue = invoices
        .filter(inv => inv.date && inv.date.toDate().toISOString().split('T')[0].startsWith(currentMonth))
        .reduce((sum, inv) => sum + (inv.total || 0), 0);
    const prevRevenue = invoices
        .filter(inv => inv.date && inv.date.toDate().toISOString().split('T')[0].startsWith(prevMonth))
        .reduce((sum, inv) => sum + (inv.total || 0), 0);
    
    const growth = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    // Rentabilité (Sipoze depans yo se 60% nan revni pou kalkil demo)
    const profitMargin = totalRevenue > 0 ? ((totalRevenue * 0.4) / totalRevenue) * 100 : 0;

    // Objektif vant (Sipoze yon objektif 10M pa ane)
    const annualTarget = 10000000;
    const salesTarget = totalRevenue > 0 ? (totalRevenue / annualTarget) * 100 : 0;

    // Panier mwayen
    const avgBasket = invoices.length > 0 ? totalRevenue / invoices.length : 0;

    // 3. Mete ajou UI
    document.getElementById('biRevenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('biGrowth').textContent = growth.toFixed(1) + '%';
    document.getElementById('biProfit').textContent = profitMargin.toFixed(1) + '%';
    document.getElementById('biSalesTarget').textContent = salesTarget.toFixed(1) + '%';
    document.getElementById('biAvgBasket').textContent = formatCurrency(avgBasket);
    document.getElementById('biTotalClients').textContent = totalClients;

    // 4. Kreye graf yo
    createCharts(invoices, employees);
}

function createCharts(invoices, employees) {
    // Graf 1: Vant vs Objektif (Bar + Line combo)
    const ctxTrend = document.getElementById('biSalesTrendChart')?.getContext('2d');
    if (ctxTrend) {
        const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'];
        // Jwenn revni pa mwa
        const monthData = months.map((_, idx) => {
            const monthStr = `2026-${String(idx + 1).padStart(2, '0')}`;
            const total = invoices
                .filter(inv => inv.date && inv.date.toDate().toISOString().split('T')[0].startsWith(monthStr))
                .reduce((sum, inv) => sum + (inv.total || 0), 0);
            return total / 1000; // an kilò (k HTG)
        });

        new Chart(ctxTrend, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    {
                        label: 'Reyalizasyon (k HTG)',
                        data: monthData,
                        backgroundColor: '#4F46E5',
                        borderRadius: 4
                    },
                    {
                        label: 'Objektif (k HTG)',
                        data: [7500, 7500, 7500, 7500, 7500, 7500],
                        type: 'line',
                        borderColor: '#EF4444',
                        borderWidth: 2,
                        fill: false,
                        pointRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: true, position: 'top' } },
                scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { display: false } }, x: { grid: { display: false } } }
            }
        });
    }

    // Graf 2: Radar Analiz pa Depatman
    const ctxRadar = document.getElementById('biDeptRadarChart')?.getContext('2d');
    if (ctxRadar) {
        // Sipoze done depatman (soti nan anplwaye yo)
        const deptCounts = {};
        employees.forEach(emp => {
            const dept = emp.department || 'Lòt';
            deptCounts[dept] = (deptCounts[dept] || 0) + 1;
        });

        new Chart(ctxRadar, {
            type: 'radar',
            data: {
                labels: Object.keys(deptCounts),
                datasets: [{
                    label: 'Pèfòmans Relatif',
                    data: Object.values(deptCounts).map(v => v * 10), // Senplifye pou demo
                    borderColor: '#4F46E5',
                    backgroundColor: 'rgba(79,70,229,0.2)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { r: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { display: false } } }
            }
        });
    }

    // Graf 3: Repatrisyon Depans (Doughnut)
    const ctxCost = document.getElementById('biCostPieChart')?.getContext('2d');
    if (ctxCost) {
        new Chart(ctxCost, {
            type: 'doughnut',
            data: {
                labels: ['Depans Operasyon', 'Salè', 'Lòt Depans', 'Depans Komèsyal'],
                datasets: [{ data: [35, 40, 10, 15], backgroundColor: ['#4F46E5', '#10B981', '#EF4444', '#F59E0B'] }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 12 } } } } }
        });
    }
}

// FONKSYON POU JENERE RAPÒ (Demo)
window.generateBIReport = function() {
    alert("📊 Fonksyon jenere rapò PDF ap vini nan pwochen vèsyon!");
};
