// js/core/theme.js
(function () {
    const STORAGE_KEY = 'kontablakay_theme';

    function getSavedTheme() {
        return localStorage.getItem(STORAGE_KEY) || 'light';
    }

    function applyTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem(STORAGE_KEY, theme);

        const btn = document.getElementById('themeToggleBtn');
        if (btn) {
            btn.textContent = theme === 'dark' ? '☀️' : '🌙';
            btn.setAttribute('aria-label', theme === 'dark' ? 'Aktive mòd klè' : 'Aktive mòd sonb');
        }
    }

    function toggleTheme() {
        const current = document.body.getAttribute('data-theme') || 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
    }

    applyTheme(getSavedTheme());

    window.toggleTheme = toggleTheme;
})();
