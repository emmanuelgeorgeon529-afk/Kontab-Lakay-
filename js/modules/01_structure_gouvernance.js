// js/modules/01_structure_gouvernance.js
import { getDocument, queryCollection } from '../core/db.js';
import { formatCurrency } from '../utils/currency.js';

// ID de l'entreprise (à récupérer depuis l'auth plus tard)
const COMPANY_ID = 'demo_company_001';

export async function loadStructureKPIs() {
    const companyData = await getDocument('companies', COMPANY_ID);
    if (companyData) {
        document.querySelector('#structure .kpi-card .label:contains("👥 Total Itilizatè") + .value')
            .textContent = companyData.totalUsers || 0;
    }
}

// Fonction d'initialisation appelée par le routeur
export function initStructure() {
    loadStructureKPIs();
}
