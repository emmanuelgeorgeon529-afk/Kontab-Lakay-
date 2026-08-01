// js/core/router.js
// Mappage des vues HTML et des modules JS
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
    'settings': { view: 'views/settings.html', js: null } // Settings ka jere dirèkteman nan view la oswa pita
};

// Fonksyon navigasyon global
async function navigate(targetId) {
    // 1. Mettre à jour l'état actif de la sidebar
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-item[data-target="${targetId}"]`);
    if (activeNav) activeNav.classList.add('active');

    // 2. Vérifier si le module existe dans le map
    const route = moduleMap[targetId];
    if (!route) {
        console.warn(`Modil "${targetId}" pa egziste.`);
        return;
    }

    const container = document.getElementById('view-container');

    try {
        // 3. Charger le HTML depuis le dossier views/
        const response = await fetch(route.view);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = await response.text();

        // 4. Injecter ou remplacer la section
        let existingSection = document.getElementById(targetId);
        if (existingSection) {
            existingSection.outerHTML = html;
        } else {
            container.insertAdjacentHTML('beforeend', html);
        }

        // 5. Afficher la vue cible (enlever la classe active des autres)
        document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
        document.getElementById(targetId).classList.add('active');

        // 6. Charger et initialiser le module JS associé (si applicable)
        if (route.js) {
            try {
                const module = await import(route.js);
                if (typeof module.init === 'function') {
                    module.init(); // Appelle la fonction init() du module
                }
            } catch (jsError) {
                console.warn(`Erè chajman JS pou ${targetId}:`, jsError);
            }
        }

        // 7. Fermer le sidebar sur mobile
        document.getElementById('sidebar').classList.remove('open');

    } catch (error) {
        console.error("Erè chajman view:", error);
        // Fallback: Si view la pa jwenn, mete yon placeholder
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

// Initialisation du routeur
function initRouter() {
    // Si on est sur la page d'accueil, on charge le dashboard
    navigate('dashboard');
                                           }
