// js/core/router.js (Nouvo vèsyon ki pa sèvi ak import)

const moduleMap = {
    'dashboard': { view: 'views/dashboard.html', js: null },
    'structure': { view: 'views/structure_gouvernance.html', js: '../modules/01_structure_gouvernance.js' },
    'finance': { view: 'views/finance_comptabilite.html', js: '../modules/02_finance_comptabilite.js' },
    'ventes': { view: 'views/ventes_crm.html', js: '../modules/03_ventes_crm.js' },
    'operations': { view: 'views/operations_supply_chain.html', js: '../modules/04_operations_supply_chain.js' },
    'logistique': { view: 'views/logistique_distribution.html', js: '../modules/05_logistique_distribution.js' },
    'rh': { view: 'views/rh_paie.html', js: '../modules/06_rh_paie.js' },
    'actifs': { view: 'views/actifs_maintenance.html', js: '../modules/07_actifs_maintenance.js' },
    'ged': { view: 'views/ged_archivage.html', js: '../modules/08_ged_archivage.js' },
    'juridique': { view: 'views/juridique_portails.html', js: '../modules/09_juridique_portails.js' },
    'saas': { view: 'views/saas_localisation.html', js: '../modules/10_saas_localisation.js' },
    'bi': { view: 'views/business_intelligence.html', js: '../modules/11_business_intelligence.js' },
    'ia': { view: 'views/ia_automatisation.html', js: '../modules/12_ia_automatisation.js' },
    'ecommerce': { view: 'views/ecommerce_omnicanal.html', js: '../modules/13_ecommerce_omnicanal.js' },
    'settings': { view: 'views/settings.html', js: null }
};

async function navigate(targetId) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-item[data-target="${targetId}"]`);
    if (activeNav) activeNav.classList.add('active');

    const route = moduleMap[targetId];
    if (!route) { console.warn(`Modil "${targetId}" pa egziste.`); return; }

    const container = document.getElementById('view-container');

    try {
        // 1. Chaje HTML
        const response = await fetch(route.view);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = await response.text();

        let existingSection = document.getElementById(targetId);
        if (existingSection) {
            existingSection.outerHTML = html;
        } else {
            container.insertAdjacentHTML('beforeend', html);
        }

        document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
        document.getElementById(targetId).classList.add('active');

        // 2. Chaje JavaScript la (san import, anbalan ak eval)
        if (route.js) {
            try {
                // Telechaje kòd JS la
                const jsRes = await fetch(route.js);
                const jsCode = await jsRes.text();
                
                // Kreye yon eleman script epi mete kòd la ladan l
                const script = document.createElement('script');
                script.type = 'text/javascript';
                script.textContent = jsCode;
                document.body.appendChild(script);
                // Retire script la apre ekzekisyon
                setTimeout(() => script.remove(), 100);

                // Apele init la si li egziste (modil yo dwe defini window.init)
                if (typeof window.init === 'function') {
                    window.init();
                }
            } catch (jsError) {
                console.warn(`Erè chajman JS pou ${targetId}:`, jsError);
            }
        }

        document.getElementById('sidebar').classList.remove('open');

    } catch (error) {
        console.error("Erè chajman view:", error);
        const fallbackContainer = document.getElementById(targetId) || container;
        fallbackContainer.innerHTML = `
            <div class="view-section" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:80%; color:var(--text-muted);">
                <div style="font-size:48px; margin-bottom:16px;">📁</div>
                <h2 style="font-size:24px; color:var(--text-dark); margin-bottom:8px;">Module : ${targetId.charAt(0).toUpperCase() + targetId.slice(1)}</h2>
                <p style="font-size:14px;">Impossible de charger le fichier <strong>${route.view}</strong>.</p>
            </div>
        `;
    }
}

function initRouter() {
    navigate('dashboard');
}
