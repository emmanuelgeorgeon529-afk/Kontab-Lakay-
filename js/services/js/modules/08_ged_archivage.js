// js/modules/08_ged_archivage.js
import { getDocuments, createDocument } from '../../services/documentService.js';
import { formatCurrency } from '../../utils/currency.js'; // (pa itilize la, men kenbe)

const COMPANY_ID = 'demo_company_001';

export async function initGed() {
    const docs = await getDocuments(COMPANY_ID);

    const totalDocuments = docs.length;
    const pendingDocs = docs.filter(d => d.status === 'An Atant').length;
    const expiredDocs = docs.filter(d => d.status === 'Ekspire').length;

    // Simile storage itilize (an MB)
    const totalSize = docs.reduce((sum, d) => sum + (d.size || 0), 0);
    const storageUsed = (totalSize / 1024).toFixed(1); // konvèti an GB

    document.getElementById('totalDocuments').textContent = totalDocuments;
    document.getElementById('pendingDocs').textContent = pendingDocs;
    document.getElementById('expiredDocs').textContent = expiredDocs;
    document.getElementById('storageUsed').textContent = storageUsed + ' GB';

    createCharts();
}

function createCharts() {
    // Graf 1: Evolisyon Dokiman (Line)
    const ctxEvo = document.getElementById('gedEvolutionChart')?.getContext('2d');
    if (ctxEvo) {
        new Chart(ctxEvo, {
            type: 'line',
            data: {
                labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
                datasets: [{
                    label: 'Dokiman',
                    data: [180, 220, 210, 260, 250, 245],
                    borderColor: '#4F46E5',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(79,70,229,0.1)'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    // Graf 2: Kategori (Pie)
    const ctxCat = document.getElementById('gedCategoryChart')?.getContext('2d');
    if (ctxCat) {
        // Sipoze kategori yo fiks pou demo
        new Chart(ctxCat, {
            type: 'pie',
            data: {
                labels: ['Contrats', 'Factures', 'RH', 'Juridique'],
                datasets: [{ data: [320, 480, 250, 195], backgroundColor: ['#4F46E5', '#10B981', '#EF4444', '#F59E0B'] }]
            },
            options: { responsive: true }
        });
    }
}

// --- MODAL FONKSYON ---
window.openGedModal = function() {
    document.getElementById('newDocModal').style.display = 'flex';
};

window.closeGedModal = function() {
    document.getElementById('newDocModal').style.display = 'none';
};

window.saveNewDocument = async function() {
    const name = document.getElementById('docName').value.trim();
    const category = document.getElementById('docCategory').value;
    const size = parseFloat(document.getElementById('docSize').value) || 0;

    if (!name) {
        alert("Tanpri mete non dokiman an.");
        return;
    }

    try {
        await createDocument(COMPANY_ID, {
            name: name,
            category: category,
            size: size,
            status: 'Valide',
            description: 'Telechaje depi modal'
        });
        alert("✅ Dokiman telechaje avèk siksè!");
        closeGedModal();
        // Refè KPI yo
        await initGed();
    } catch (error) {
        alert("❌ Erè: " + error.message);
    }
};
