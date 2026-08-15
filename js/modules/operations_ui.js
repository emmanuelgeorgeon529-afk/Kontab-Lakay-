// js/modules/operations_ui.js
// Konekte UI Operations (Acha + Founisè) ak PurchasesService, SuppliersService, ProductsService

const OperationsUI = (() => {

    let panyeAcha = [];
    let pwodwiCache = [];
    let founisèCache = [];

    async function chajePwodwiEtFounisè() {
        try {
            const [pwodwi, founisè] = await Promise.all([
                window.ProductsService.getProducts(true),
                window.SuppliersService.getSuppliers(true)
            ]);
            pwodwiCache = pwodwi;
            founisèCache = founisè;
            renderPwodwiDropdown();
            renderFounisèDropdown();
        } catch (err) {
            console.error('Erè chajman pwodwi/founisè:', err);
        }
    }

    function renderPwodwiDropdown() {
        const select = document.getElementById('achatPwodwiSelect');
        if (!select) return;
        select.innerHTML = '<option value="">— Chwazi pwodwi —</option>' +
            pwodwiCache.map(p => `<option value="${p.id}" data-pri="${p.priAchat || 0}">${p.non} (Stock: ${p.kantiteStock ?? 0})</option>`).join('');
        select.onchange = () => {
            const selected = select.options[select.selectedIndex];
            document.getElementById('achatPriInite').value = selected?.dataset?.pri || 0;
        };
    }

    function renderFounisèDropdown() {
        const select = document.getElementById('achatFounisèSelect');
        if (!select) return;
        select.innerHTML = '<option value="">— Chwazi founisè —</option>' +
            founisèCache.map(f => `<option value="${f.id}">${f.non}</option>`).join('');
    }

    function showError(elId, msg) {
        const el = document.getElementById(elId);
        if (!el) return;
        el.textContent = msg;
        el.style.display = 'block';
    }

    function openNewSupplierModal() {
        document.getElementById('newSupplierError').style.display = 'none';
        document.getElementById('suppNon').value = '';
        document.getElementById('suppTelefòn').value = '';
        document.getElementById('suppAdrès').value = '';
        document.getElementById('newSupplierModal').style.display = 'flex';
    }

    function closeNewSupplierModal() {
        document.getElementById('newSupplierModal').style.display = 'none';
    }

    async function submitNewSupplier() {
        const non = document.getElementById('suppNon').value.trim();
        const telefòn = document.getElementById('suppTelefòn').value.trim();
        const adrès = document.getElementById('suppAdrès').value.trim();

        if (!non) { showError('newSupplierError', 'Non founisè a obligatwa.'); return; }

        const btn = document.getElementById('suppSubmitBtn');
        btn.disabled = true;
        btn.textContent = '⏳ Ap kreye...';

        try {
            const result = await window.SuppliersService.createSupplier({
                non, telefòn: telefòn || null, adrès: adrès || null
            });
            closeNewSupplierModal();
            await chajePwodwiEtFounisè();
            const founisèSelect = document.getElementById('achatFounisèSelect');
            if (founisèSelect) founisèSelect.value = result.id;
            await loadSuppliersTable();
            alert(`✅ Founisè "${non}" kreye avèk siksè!`);
        } catch (err) {
            showError('newSupplierError', err.message || 'Erè pandan kreyasyon founisè a.');
        } finally {
            btn.disabled = false;
            btn.textContent = '✅ Kreye Founisè';
        }
    }

    function openNewPurchaseModal() {
        panyeAcha = [];
        renderPanyeAcha();
        document.getElementById('newPurchaseError').style.display = 'none';
        document.getElementById('newPurchaseModal').style.display = 'flex';
        chajePwodwiEtFounisè();
    }

    function closeNewPurchaseModal() {
        document.getElementById('newPurchaseModal').style.display = 'none';
    }

    function addItemToPurchaseCart() {
        const pwodwiSelect = document.getElementById('achatPwodwiSelect');
        const pwodwiId = pwodwiSelect.value;
        const pwodwiNon = pwodwiSelect.options[pwodwiSelect.selectedIndex]?.text || '';
        const kantite = parseInt(document.getElementById('achatKantite').value, 10);
        const priInite = parseFloat(document.getElementById('achatPriInite').value);
        const rabaisPousantaj = parseFloat(document.getElementById('achatRabaisPousantaj').value) || 0;

        if (!pwodwiId) { showError('newPurchaseError', 'Chwazi yon pwodwi anvan.'); return; }
        if (!kantite || kantite <= 0) { showError('newPurchaseError', 'Kantite dwe pi gran pase 0.'); return; }
        if (isNaN(priInite) || priInite < 0) { showError('newPurchaseError', 'Pri inite pa valid.'); return; }

        const atik = { pwodwiId, non: pwodwiNon, kantite, priInite };
        if (rabaisPousantaj > 0) {
            atik.rabais = { valeur: rabaisPousantaj, estPousantaj: true };
        }

        panyeAcha.push(atik);
        renderPanyeAcha();
        document.getElementById('newPurchaseError').style.display = 'none';
    }

    function removeItemFromPurchaseCart(index) {
        panyeAcha.splice(index, 1);
        renderPanyeAcha();
    }

    function renderPanyeAcha() {
        const listEl = document.getElementById('achatPanyeList');
        const totalEl = document.getElementById('achatPanyeTotal');

        if (panyeAcha.length === 0) {
            listEl.innerHTML = '<p style="color:var(--text-muted); font-size:12px;">Panye vid</p>';
            totalEl.textContent = '0';
            return;
        }

        let total = 0;
        listEl.innerHTML = panyeAcha.map((item, i) => {
            const prixBrut = item.kantite * item.priInite;
            const rabaisMontan = item.rabais ? prixBrut * (item.rabais.valeur / 100) : 0;
            const sousTotal = prixBrut - rabaisMontan;
            total += sousTotal;
            const rabaisTxt = item.rabais ? ` (-${item.rabais.valeur}%)` : '';
            return `<div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid #F1F5F9;">
                <span>${item.non} × ${item.kantite}${rabaisTxt}</span>
                <span>${sousTotal.toLocaleString()} HTG <span onclick="OperationsUI.removeItemFromPurchaseCart(${i})" style="color:var(--danger); cursor:pointer; margin-left:8px;">✕</span></span>
            </div>`;
        }).join('');

        totalEl.textContent = total.toLocaleString();
    }

    async function submitNewPurchase() {
        if (panyeAcha.length === 0) { showError('newPurchaseError', 'Ajoute pou pi piti yon atik nan panye a.'); return; }

        const founisèSelect = document.getElementById('achatFounisèSelect');
        const founisèId = founisèSelect.value;
        const founisèNon = founisèSelect.options[founisèSelect.selectedIndex]?.text || '';
        const mòdPeman = document.getElementById('achatMòdPeman').value;
        const fraisAccessoires = parseFloat(document.getElementById('achatFraisAccessoires').value) || 0;

        if (!founisèId) { showError('newPurchaseError', 'Chwazi yon founisè anvan.'); return; }

        const btn = document.getElementById('achatSubmitBtn');
        btn.disabled = true;
        btn.textContent = '⏳ Ap trete...';

        try {
            const result = await window.PurchasesService.createPurchase({
                founisèId, founisèNon, mòdPeman,
                atik: panyeAcha,
                fraisAccessoires
            });
            closeNewPurchaseModal();
            await loadPurchasesTable();
            alert(`✅ Acha kreye avèk siksè! Nimewo: ${result.nimewoAcha}`);
        } catch (err) {
            showError('newPurchaseError', err.message || 'Yon erè rive pandan kreyasyon acha a.');
        } finally {
            btn.disabled = false;
            btn.textContent = '✅ Konfime Acha';
        }
    }

    async function loadPurchasesTable() {
        const tbody = document.getElementById('achatTableBody');
        if (!tbody) return;

        try {
            const achats = await window.PurchasesService.getPurchases(20);

            if (achats.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:20px;">Pa gen acha ankò</td></tr>';
                return;
            }

            tbody.innerHTML = achats.map(a => {
                const estatiBadge = a.estati === 'anile'
                    ? '<span class="ged-status" style="background:#FEE2E2; color:#B91C1C;">Anile</span>'
                    : '<span class="ged-status" style="background:#EEF2FF; color:var(--primary);">Aktif</span>';
                return `<tr>
                    <td>${a.nimewoAcha}</td>
                    <td>${a.founisèNon}</td>
                    <td style="text-align:right;">${(a.total || 0).toLocaleString()} HTG</td>
                    <td>${estatiBadge}</td>
                </tr>`;
            }).join('');
        } catch (err) {
            console.error('Erè chajman lis acha:', err);
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--danger); padding:20px;">❌ Erè chajman done</td></tr>';
        }
    }

    async function loadSuppliersTable() {
        const tbody = document.getElementById('founisèTableBody');
        if (!tbody) return;

        try {
            const founisèYo = await window.SuppliersService.getSuppliers(true);

            if (founisèYo.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-muted); padding:20px;">Pa gen founisè ankò</td></tr>';
                return;
            }

            tbody.innerHTML = founisèYo.map(f => `<tr>
                <td>${f.non}</td>
                <td>${f.telefòn || '—'}</td>
                <td style="text-align:right; ${f.dèt > 0 ? 'color:var(--danger);' : ''}">${(f.dèt || 0).toLocaleString()} HTG</td>
            </tr>`).join('');
        } catch (err) {
            console.error('Erè chajman lis founisè:', err);
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--danger); padding:20px;">❌ Erè chajman done</td></tr>';
        }
    }

    return {
        openNewSupplierModal, closeNewSupplierModal, submitNewSupplier,
        openNewPurchaseModal, closeNewPurchaseModal,
        addItemToPurchaseCart, removeItemFromPurchaseCart, submitNewPurchase,
        loadPurchasesTable, loadSuppliersTable
    };
})();

window.OperationsUI = OperationsUI;

document.addEventListener('DOMContentLoaded', () => {
    const operationsNavItem = document.querySelector('[data-target="operations"]');
    if (operationsNavItem) {
        OperationsUI.loadPurchasesTable();
        operationsNavItem.addEventListener('click', () => {
            OperationsUI.loadPurchasesTable();
            OperationsUI.loadSuppliersTable();
        });
    }
});
