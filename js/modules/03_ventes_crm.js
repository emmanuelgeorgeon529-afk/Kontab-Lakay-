// js/modules/03_ventes_crm.js
import { getCustomers } from '../services/salesService.js';
import { formatCurrency } from '../utils/currency.js';

const COMPANY_ID = 'demo_company_001';

export async function loadSalesKPIs() {
    const customers = await getCustomers(COMPANY_ID);
    // Mettre à jour le compteur de clients
    const customerCount = document.querySelector('#ventes .kpi-card:contains("👥 Nouvo Kliyan") .value');
    if(customerCount) customerCount.textContent = customers.length;
}

export function initVentes() {
    loadSalesKPIs();
}
