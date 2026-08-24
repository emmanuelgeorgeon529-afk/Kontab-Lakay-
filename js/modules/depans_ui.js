// js/modules/depans_ui.js
// Konekte sou-seksyon "2.9 — Gestion des Dépenses" ak DepansService
// NÒT: chaje otomatikman lè #finance prezan (menm modèl ak kes_ui.js).

(function () {
    let founiseCache = [];

    function escHtml(str) {
        const d = document.createElement('div');
        d.textContent = String(str ?? '');
        return d.innerHTML;
    }

    function fmtHTG(n) {
        return (n || 0).toLocaleString('fr-HT') + ' HTG';
    }

    function showError(id, msg) {
        const el = document.querySelector('#' + id);
        if (!el) return;
        el.textContent = msg;
        el.style.display = 'block';
    }
    function hideError(id) {
        const el = document.querySelector('#' + id);
        if (!el) return;
        el.style.display = 'none';
        el.textContent = '';
    }

    // ---------- TABLO DEPANS ----------

    function rannTabloDepans(lis) {
        const tbody = document.querySelector('#depansTableBody');
        if (!tbody) return;
        if (lis.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:16px;">Pa gen depans ankò</td></tr>`;
            return;
        }
        tbody.innerHTML = lis.map(d => `
            <tr>
                <td>${escHtml(d.nimewoDepans)}</td>
                <td>${escHtml(d.kategori)}</td>
                <td style="text-align:right;">${fmtHTG(d.montan)}</td>
                <td><span class="ged-status" style="background:#D1FAE5; color:#047857;">${escHtml(d.estati || 'peye')}</span></td>
            </tr>`).join('');
    }

    async function chajeDepans() {
        try {
            const lis = await window.DepansService.getDepans(50);
            rannTabloDepans(lis);
        } catch (e) {
            console.warn('DepansUI: chajeDepans echwe', e);
        }
    }

    // ---------- MODAL: NOUVO DEPANS ----------

    async function openNewDepansModal() {
        document.querySelector('#depansKategoriSelect').value = 'Loyer';
        document.querySelector('#depansDeskripsyon').value = '';
        document.querySelector('#depansMontan').value = 0;
        document.querySelector('#depansMòdPeman').value = 'kach';
        onMòdPemanChange();
        hideError('newDepansError');

        // Ranpli lis founisè si poko fèt
        if (founiseCache.length === 0 && window.SuppliersService) {
            try {
                founiseCache = await window.SuppliersService.getSuppliers(true);
                const sel = document.querySelector('#depansFounisèSelect');
                if (sel) {
                    sel.innerHTML = `<option value="">— Chwazi founisè —</option>` +
                        founiseCache.map(f => `<option value="${f.id}">${escHtml(f.non)}</option>`).join('');
                }
            } catch (e) {
                console.warn('DepansUI: chaje founisè echwe', e);
            }
        }

        document.querySelector('#newDepansModal').style.display = 'flex';
    }

    function closeNewDepansModal() {
        document.querySelector('#newDepansModal').style.display = 'none';
    }

    function onMòdPemanChange() {
        const mòdPeman = document.querySelector('#depansMòdPeman').value;
        const wrap = document.querySelector('#depansFounisèWrap');
        wrap.style.display = (mòdPeman === 'kredi') ? 'block' : 'none';
    }

    async function submitNewDepans() {
        const kategori = document.querySelector('#depansKategoriSelect').value;
        const deskripsyon = document.querySelector('#depansDeskripsyon').value.trim();
        const montan = Number(document.querySelector('#depansMontan').value);
        const mòdPeman = document.querySelector('#depansMòdPeman').value;
        const founiseId = document.querySelector('#depansFounisèSelect').value;

        if (!montan || montan <= 0) return showError('newDepansError', 'Montan dwe pi gran pase 0.');
        if (mòdPeman === 'kredi' && !founiseId) return showError('newDepansError', 'Chwazi yon founisè pou peman kredi.');

        const btn = document.querySelector('#depansSubmitBtn');
        btn.disabled = true;
        try {
            const rezilta = await window.DepansService.createDepans({
                kategori, deskripsyon, montan, mòdPeman,
                founiseId: mòdPeman === 'kredi' ? founiseId : null
            });

            closeNewDepansModal();

            if (rezilta.enAtant) {
                alert(`Depans sa a depase 50 000 HTG — li soumèt pou apwobasyon. Ale nan Gouvernance → Demand Apwobasyon pou swiv li.`);
            } else {
                await chajeDepans();
            }
        } catch (e) {
            showError('newDepansError', e.message);
        } finally {
            btn.disabled = false;
        }
    }

    // ---------- INISYALIZASYON ----------

    function inisyaliseDepansUI() {
        if (!window.currentCompanyId) {
            console.warn('depans_ui.js: pa gen bizId disponib');
            return;
        }
        chajeDepans();
    }

    window.DepansUI = {
        openNewDepansModal, closeNewDepansModal,
        onMòdPemanChange, submitNewDepans
    };

    document.addEventListener('DOMContentLoaded', () => {
        if (document.querySelector('#finance')) inisyaliseDepansUI();
    });
})();
