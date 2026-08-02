// js/modules/09_juridique_portails.js
import { getContracts, getInsurance, getPortalAccess, createContract } from '../../services/legalService.js';

const COMPANY_ID = 'demo_company_001';

export async function initJuridique() {
    const contracts = await getContracts(COMPANY_ID);
    const insurance = await getInsurance(COMPANY_ID);
    const portalAccess = await getPortalAccess(COMPANY_ID);

    // Kalkile metrik yo
    const totalContracts = contracts.length;
    const activeContracts = contracts.filter(c => c.status === 'Aktif').length;
    const expiringContracts = contracts.filter(c => {
        if (!c.expiryDate) return false;
        const expiry = c.expiryDate.toDate();
        const now = new Date();
        const diffDays = (expiry - now) / (1000 * 60 * 60 * 24);
        return diffDays <= 30 && diffDays > 0; // ekspire nan 30 jou
    }).length;

    const totalInsurance = insurance.length;
    const clientPortalCount = portalAccess.filter(p => p.type === 'client').length;

    // Mete ajou UI
    document.getElementById('totalContracts').textContent = totalContracts;
    document.getElementById('activeContracts').textContent = activeContracts;
    document.getElementById('expiringContracts').textContent = expiringContracts;
    document.getElementById('totalInsurance').textContent = totalInsurance;
    document.getElementById('clientPortalCount').textContent = clientPortalCount;

    createCharts();
}

function createCharts() {
    // Graf 1: Evolisyon Kontra (Line)
    const ctxJur1 = document.getElementById('juridiqueChart1')?.getContext('2d');
    if (ctxJur1) {
        new Chart(ctxJur1, {
            type: 'line',
            data: {
                labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
                datasets: [{
                    label: 'Kontra',
                    data: [35, 38, 42, 40, 45, 47],
                    borderColor: '#4F46E5',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(79,70,229,0.1)'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    // Graf 2: Aksè Pòtal (Doughnut)
    const ctxJur2 = document.getElementById('juridiqueChart2')?.getContext('2d');
    if (ctxJur2) {
        new Chart(ctxJur2, {
            type: 'doughnut',
            data: {
                labels: ['Pòtal Kliyan', 'Pòtal Founisè'],
                datasets: [{ data: [23, 14], backgroundColor: ['#4F46E5', '#10B981'] }]
            },
            options: { responsive: true }
        });
    }
}

// --- MODAL FONKSYON ---
window.openContractModal = function() {
    document.getElementById('newContractModal').style.display = 'flex';
};

window.closeContractModal = function() {
    document.getElementById('newContractModal').style.display = 'none';
};

window.saveNewContract = async function() {
    const name = document.getElementById('contractName').value.trim();
    const party = document.getElementById('contractParty').value.trim();
    const expiry = document.getElementById('contractExpiry').value;

    if (!name || !party || !expiry) {
        alert("Tanpri ranpli tout chan yo.");
        return;
    }

    try {
        await createContract(COMPANY_ID, {
            name: name,
            party: party,
            expiryDate: new Date(expiry + 'T00:00:00'),
            status: 'Aktif'
        });
        alert("✅ Kontra kreye avèk siksè!");
        closeContractModal();
        await initJuridique();
    } catch (error) {
        alert("❌ Erè: " + error.message);
    }
};
