// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', () => {
    // Charger Chart.js depuis le CDN (ou depuis assets/js/ si vous le téléchargez)
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.onload = initChart;
    document.head.appendChild(script);
});

function initChart() {
    const ctx = document.getElementById('mainChart')?.getContext('2d');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
            datasets: [{
                label: 'Revenus',
                data: [12, 19, 15, 25, 22, 30],
                borderColor: '#4F46E5',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                tension: 0.4, fill: true, pointRadius: 0, borderWidth: 2
            }, {
                label: 'Dépenses',
                data: [8, 11, 9, 15, 12, 18],
                borderColor: '#EF4444',
                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                tension: 0.4, fill: true, pointRadius: 0, borderWidth: 2
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { 
                legend: { display: true, position: 'top', align: 'end', labels: { boxWidth: 8, usePointStyle: true, font: { size: 12 } } } 
            },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { display: false } },
                x: { grid: { display: false }, ticks: { font: { size: 12 } } }
            }
        }
    });
}
