// js/modules/ventes_ui.js
// Konekte UI Ventes la ak window.SalesService

const VentesUI = (() => {

    let cart = [];
    let produitsCache = [];
    let kliyanCache = [];

    // ---------- CHAJMAN LIS PWODWI / KLIYAN POU DROPDOWN YO ----------

    async function loadProduitsEtKliyan() {
        const bizRef = window.db.collection('biznis').doc(window.currentCompanyId);

        try {
            const [pwodwiSnap, kliyanSnap] = await Promise.all([
                bizRef.collection('pwodwi').get(),
                bizRef.collection('kliyan').get()
            ]);

            produitsCache = pwodwiSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            kliyanCache = kliyanSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            const pwodwiSelect = document.getElementById('salePwodwiSelect');
            pwodwiSelect.innerHTML = '<option value="">— Chwazi pwodwi —</option>' +
                produitsCache.map(p => `<option value="${p.id}" data-pri="${p.priVente || 0}">${p.non} (Stock: ${p.kantiteStock ?? 0})</option>`).join('');

            const kliyanSelect = document.getElementById('saleKliyanSelect');
            kliyanSelect.innerHTML = '<option value="">Kliyan Divès</option>' +
                kliyanCache.map(k => `<option value="${k.id}">${k.non}</option>`).join('');

            // Otomatikman ranpli pri lè yo chwazi pwodwi
            pwodwiSelect.onchange = () => {
                const selected = pwodwiSelect.options[pwodwiSelect.selectedIndex];
                document.getElementById('salePriInite').value = selected?.dataset?.pri || 0;
            };
        } catch (err) {
            console.error('Erè chajman pwodwi/kliyan:', err);
        }
    }

    // ---------- MODAL ----------

    function openNewSaleModal() {
        cart = [];
        renderCart();
        document.getElementById('newSaleError').style.display = 'none';
        document.getElementById('newSaleModal').style.display = 'flex';
        loadProduitsEtKliyan();
    }

    function closeNewSaleModal() {
        document.getElementById('newSaleModal').style.display = 'none';
    }

    // ---------- PANYE (CART) ----------

    function addItemToCart() {
        const pwodwiSelect = document.getElementById('salePwodwiSelect');
        const pwodwiId = pwodwiSelect.value;
        const pwodwiNon = pwodwiSelect.options[pwodwiSelect.selectedIndex]?.text || '';
        const kantite = parseInt(document.getElementById('saleQuantite').value, 10);
        const priInite = parseFloat(document.getElementById('salePriInite').value);

        if (!pwodwiId) { showError('Chwazi yon pwodwi anvan.'); return; }
        if (!kantite || kantite <= 0) { showError('Kantite dwe pi gran pase 0.'); return; }
        if (isNaN(priInite) || priInite < 0) { showError('Pri inite pa valid.'); return; }

        cart.push({ pwodwiId, non: pwodwiNon, kantite, priInite });
        renderCart();
        document.getElementById('newSaleError').style.display = 'none';
    }

    function removeItemFromCart(index) {
        cart.splice(index, 1);
        renderCart();
    }

    function renderCart() {
        const listEl = document.getElementById('saleCartList');
        const totalEl = document.getElementById('saleCartTotal');

        if (cart.length === 0) {
            listEl.innerHTML = '<p style="color:var(--text-muted); font-size:12px;">Panye vid</p>';
            totalEl.textContent = '0';
            return;
        }

        let total = 0;
        listEl.innerHTML = cart.map((item, i) => {
            const souTotal = item.kantite * item.priInite;
            total += souTotal;
            return `<div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid #F1F5F9;">
                <span>${item.non} × ${item.kantite}</span>
                <span>${souTotal.toLocaleString()} HTG <span onclick="VentesUI.removeItemFromCart(${i})" style="color:var(--danger); cursor:pointer; margin-left:8px;">✕</span></span>
            </div>`;
        }).join('');

        totalEl.textContent = total.toLocaleString();
    }

    function showError(msg) {
        const errEl = document.getElementById('newSaleError');
        errEl.textContent = msg;
        errEl.style.display = 'block';
    }

    // ---------- SOUMÈT VANT ----------

    async function submitNewSale() {
        if (cart.length === 0) { showError('Ajoute pou pi piti yon atik nan panye a.'); return; }

        const submitBtn = document.getElementById('saleSubmitBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Ap trete...';

        const kliyanSelect = document.getElementById('saleKliyanSelect');
        const kliyanId = kliyanSelect.value || null;
        const kliyanNon = kliyanId ? kliyanSelect.options[kliyanSelect.selectedIndex].text : 'Kliyan Divès';
        const mòdPeman = document.getElementById('saleMòdPeman').value;

        try {
            const result = await window.SalesService.createSale({
                kliyanId,
                kliyanNon,
                mòdPeman,
                atik: cart
            });

            closeNewSaleModal();
            await loadSalesTable();
            alert(`✅ Vant kreye avèk siksè! Nimewo Fakti: ${result.nimewoFakti}`);
        } catch (err) {
            showError(err.message || 'Yon erè rive pandan kreyasyon vant lan.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = '✅ Konfime Vant';
        }
    }

    // ---------- CHAJE TABLO VANT YO ----------

    async function loadSalesTable() {
        const tbody = document.getElementById('ventesTableBody');
        if (!tbody) return;

        try {
            const sales = await window.SalesService.getSales(20);

            if (sales.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:20px;">Pa gen vant ankò</td></tr>';
                return;
            }

            tbody.innerHTML = sales.map(s => {
                const dat = s.dat?.toDate ? s.dat.toDate().toLocaleDateString('fr-HT') : '—';
                const estatiBadge = s.estati === 'anile'
                    ? '<span class="ged-status" style="background:#FEE2E2; color:#B91C1C;">Anile</span>'
                    : '<span class="ged-status" style="background:#D1FAE5; color:#047857;">Aktif</span>';
                return `<tr>
                    <td>${s.nimewoFakti}</td>
                    <td>${dat}</td>
                    <td>${s.kliyanNon}</td>
                    <td style="text-align:right;">${(s.total || 0).toLocaleString()} HTG</td>
                    <td>${estatiBadge}</td>
                </tr>`;
            }).join('');
        } catch (err) {
            console.error('Erè chajman lis vant:', err);
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--danger); padding:20px;">❌ Erè chajman done</td></tr>';
        }
    }

    // ---------- API PIBLIK ----------
    return {
        openNewSaleModal,
        closeNewSaleModal,
        addItemToCart,
        removeItemFromCart,
        submitNewSale,
        loadSalesTable
    };
})();

window.VentesUI = VentesUI;

// Chaje tablo a otomatikman lè paj la rive sou seksyon Ventes
document.addEventListener('DOMContentLoaded', () => {
    const ventesNavItem = document.querySelector('[data-target="ventes"]');
    if (ventesNavItem) {
        ventesNavItem.addEventListener('click', () => VentesUI.loadSalesTable());
    }
});
