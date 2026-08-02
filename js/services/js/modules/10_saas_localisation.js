// js/modules/10_saas_localisation.js
import { getSaaSSettings, updateSaaSSettings } from '../../services/saasService.js';

const COMPANY_ID = 'demo_company_001';

export async function initSaaS() {
    // 1. Chaje done yo
    const settings = await getSaaSSettings(COMPANY_ID);

    // 2. Kalkile metrik yo
    const activeLanguages = settings.languages ? settings.languages.length : 0;
    const activeCurrencies = settings.currencies ? settings.currencies.length : 0;
    
    // Taks aktif (konte kiyès ki true)
    const taxKeys = settings.taxes ? Object.keys(settings.taxes) : [];
    const activeTaxes = taxKeys.filter(key => settings.taxes[key] === true).length;

    // API aktif
    const apiKeys = settings.apis ? Object.keys(settings.apis) : [];
    const activeApis = apiKeys.filter(key => settings.apis[key] === true).length;

    // 3. Mete ajou UI
    document.getElementById('activeLanguages').textContent = activeLanguages;
    document.getElementById('activeCurrencies').textContent = activeCurrencies;
    document.getElementById('activeTaxes').textContent = activeTaxes;
    document.getElementById('activeApis').textContent = activeApis;

    // 4. Kreye graf yo
    createCharts(settings);
}

function createCharts(settings) {
    // Graf 1: Repatrisyon pa Deviz (Pie) — Sipoze tout deviz egal
    const ctxCurr = document.getElementById('saasCurrencyChart')?.getContext('2d');
    if (ctxCurr) {
        const currencies = settings.currencies || ['HTG', 'USD', 'EUR', 'CAD', 'DOP'];
        const data = currencies.map(() => 100 / currencies.length); // egal repatrisyon
        const colors = ['#4F46E5', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6'];

        new Chart(ctxCurr, {
            type: 'pie',
            data: {
                labels: currencies,
                datasets: [{ data: data, backgroundColor: colors }]
            },
            options: { responsive: true }
        });
    }

    // Graf 2: Itilizasyon API yo (Bar)
    const ctxApi = document.getElementById('saasApiChart')?.getContext('2d');
    if (ctxApi) {
        const apis = settings.apis || { gmail: true, sheets: true, bank: false, csv: true };
        const labels = Object.keys(apis);
        const data = labels.map(key => apis[key] ? 100 : 0); // 100 si aktif, 0 si inaktif
        const colors = labels.map(key => apis[key] ? '#4F46E5' : '#E2E8F0');

        new Chart(ctxApi, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{ label: 'Estati API (%)', data: data, backgroundColor: colors, borderRadius: 4 }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, max: 100, ticks: { display: false } }, x: { grid: { display: false } } }
            }
        });
    }
}

// --- MODAL FONKSYON ---
window.openSaaSSettingsModal = function() {
    document.getElementById('saasSettingsModal').style.display = 'flex';
};

window.closeSaaSSettingsModal = function() {
    document.getElementById('saasSettingsModal').style.display = 'none';
};

window.saveNewLanguage = async function() {
    const langCode = document.getElementById('newLangCode').value.trim().toLowerCase();
    if (!langCode) {
        alert("Tanpri mete yon kòd lang (eg: 'ht').");
        return;
    }

    try {
        // Chaje anviwònman aktyèl yo
        const currentSettings = await getSaaSSettings(COMPANY_ID);
        const newLanguages = currentSettings.languages || [];
        
        // Si lang la poko egziste, ajoute li
        if (!newLanguages.includes(langCode)) {
            newLanguages.push(langCode);
        } else {
            alert("⚠️ Lang sa a deja egziste.");
            return;
        }

        // Mete ajou nan Firestore
        await updateSaaSSettings(COMPANY_ID, { languages: newLanguages });
        
        alert("✅ Nouvo lang ajoute avèk siksè!");
        closeSaaSSettingsModal();
        await initSaaS(); // Refè UI

    } catch (error) {
        alert("❌ Erè: " + error.message);
    }
};
