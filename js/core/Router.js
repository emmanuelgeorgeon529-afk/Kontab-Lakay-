// Fonction de navigation globale
function navigate(targetId) {
    // 1. Cacher toutes les vues
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    
    // 2. Afficher la vue cible
    // Si la vue n'existe pas encore dans le DOM, on la crée depuis le dossier views/
    let target = document.getElementById(targetId);
    if (!target) {
        // Placeholder pour les modules non encore chargés
        const container = document.getElementById('view-container');
        const div = document.createElement('div');
        div.id = targetId;
        div.className = 'view-section';
        div.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:80%; color:var(--text-muted);">
                <div style="font-size:48px; margin-bottom:16px;">📁</div>
                <h2 style="font-size:24px; color:var(--text-dark); margin-bottom:8px;">Module : ${targetId.charAt(0).toUpperCase() + targetId.slice(1)}</h2>
                <p>Veuillez charger <strong>views/${targetId}.html</strong> via votre routeur.</p>
            </div>
        `;
        container.appendChild(div);
        target = document.getElementById(targetId);
    }
    target.classList.add('active');

    // 3. Mettre à jour l'état actif de la sidebar
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-item[data-target="${targetId}"]`);
    if (activeNav) activeNav.classList.add('active');
}

// Initialisation du routeur
function initRouter() {
    // Si on est sur la page d'accueil, on s'assure que le dashboard est actif
    navigate('dashboard');
}
