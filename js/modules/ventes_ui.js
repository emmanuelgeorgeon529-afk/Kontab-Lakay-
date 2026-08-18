// js/modules/ventes_ui.js
// Konekte UI Ventes ak SalesService, ProductsService, CustomersService, DiscountEngine

const VentesUI = (() => {

    let cart = [];
    let produitsCache = [];
    let kliyanCache = [];

    async function loadProduitsEtKliyan() {
        try {
            const [pwodwi, kliyan] = await Promise.all([
                window.ProductsService.getProducts(true),
                window.CustomersService.getCustomers(true)
            ]);
            produitsCache = pwodwi;
            kliyanCache = kliyan;
            renderProduitsDropdown();
            renderKliyanDropdown();
        } catch (err) {
            console.error('Erè chajman pwodwi/kliyan:', err);
        }
    }

    function renderProduitsDropdown() {
        const select = document.getElementById('salePwodwiSelect');
        if (!select) return;
        select.innerHTML = '<option value="">— Chwazi pwodwi —</option>' +
            produitsCache.map(p => `<option value="${p.id}" data-pri="${p.priVente || 0}">${p.non} (Stock: ${p.kantiteStock ?? 0})</option>`).join('');
        select.onchange = () => {
            const selected = select.options[select.selectedIndex];
            document.getElementById('salePriInite').value = selected?.dataset?.pri || 0;
        };
    }

    function renderKliyanDropdown() {
        const select = document.getElementById('saleKliyanSelect');
        if (!select) return;
        select.innerHTML = '<option value="">Kliyan Divès</option>' +
            kliyanCache.map(k => `<option value="${k.id}">${k.non}</option>`).join('');
    }

    function showError(elId, msg) {
        const el = document.getElementById(elId);
        if (!el) return;
        el.textContent = msg;
        el.style.display = 'block';
    }

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

    function addItemToCart() {
        const pwodwiSelect = document.getElementById('salePwodwiSelect');
        const pwodwiId = pwodwiSelect.value;
        const pwodwiNon = pwodwiSelect.options[pwodwiSelect.selectedIndex]?.text || '';
        const kantite = parseInt(document.getElementById('saleQuantite').value, 10);
        const priInite = parseFloat(document.getElementById('salePriInite').value);
        const rabaisPousantaj = parseFloat(document.getElementById('saleRabaisPousantaj').value) || 0;
        const remiseMontan = parseFloat(document.getElementById('saleRemiseMontant').value) || 0;
        const ristournePousantaj = parseFloat(document.getElementById('saleRistournePousantaj').value) || 0;

        if (!pwodwiId) { showError('newSaleError', 'Chwazi yon pwodwi anvan.'); return; }
        if (!kantite || kantite <= 0) { showError('newSaleError', 'Kantite dwe pi gran pase 0.'); return; }
        if (isNaN(priInite) || priInite < 0) { showError('newSaleError', 'Pri inite pa valid.'); return; }

        const atik = { pwodwiId, non: pwodwiNon, kantite, priInite };
        if (rabaisPousantaj > 0) atik.rabais = { valeur: rabaisPousantaj, estPousantaj: true };
        if (remiseMontan > 0) atik.remise = { valeur: remiseMontan, estPousantaj: false };
        if (ristournePousantaj > 0) atik.ristourne = { valeur: ristournePousantaj, estPousantaj: true };

        cart.push(atik);
        renderCart();
        document.getElementById('newSaleError').style.display = 'none';

        document.getElementById('saleRabaisPousantaj').value = 0;
        document.getElementById('saleRemiseMontant').value = 0;
        document.getElementById('saleRistournePousantaj').value = 0;
    }

    function removeItemFromCart(index) {
        cart.splice(index, 1);
        renderCart();
    }

    function calculeNetLiy(item) {
        const prixBrut = item.kantite * item.priInite;
        let rès = prixBrut;
        if (item.rabais) rès -= item.rabais.estPousantaj ? rès * (item.rabais.valeur / 100) : item.rabais.valeur;
        if (item.remise) rès -= item.remise.estPousantaj ? rès * (item.remise.valeur / 100) : item.remise.valeur;
        if (item.ristourne) rès -= item.ristourne.estPousantaj ? rès * (item.ristourne.valeur / 100) : item.ristourne.valeur;
        return rès;
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
            const net = calculeNetLiy(item);
            total += net;
            const rrrTags = [];
            if (item.rabais) rrrTags.push(`Rabais -${item.rabais.valeur}%`);
            if (item.remise) rrrTags.push(`Remise -${item.remise.valeur}`);
            if (item.ristourne) rrrTags.push(`Ristourne -${item.ristourne.valeur}%`);
            const rrrTxt = rrrTags.length ? `<div style="font-size:11px; color:var(--secondary);">${rrrTags.join(' · ')}</div>` : '';
            return `<div style="padding:6px 0; border-bottom:1px solid #F1F5F9;">
                <div style="display:flex; justify-content:space-between;">
                    <span>${item.non} × ${item.kantite}</span>
                    <span>${net.toLocaleString()} HTG <span onclick="VentesUI.removeItemFromCart(${i})" style="color:var(--danger); cursor:pointer; margin-left:8px;">✕</span></span>
                </div>
                ${rrrTxt}
            </div>`;
        }).join('');

        totalEl.textContent = total.toLocaleString();
    }

    async function submitNewSale() {
        if (cart.length === 0) { showError('newSaleError', 'Ajoute pou pi piti yon atik nan panye a.'); return; }

        const submitBtn = document.getElementById('saleSubmitBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Ap trete...';

        const kliyanSelect = document.getElementById('saleKliyanSelect');
        const kliyanId = kliyanSelect.value || null;
        const kliyanNon = kliyanId ? kliyanSelect.options[kliyanSelect.selectedIndex].text : 'Kliyan Divès';
        const mòdPeman = document.getElementById('saleMòdPeman').value;
        const tauxEscompte = parseFloat(document.getElementById('saleTauxEscompte').value) || 0;

        try {
            const result = await window.SalesService.createSale({
                kliyanId, kliyanNon, mòdPeman,
                atik: cart,
                tauxEscompte
            });

            closeNewSaleModal();
            await loadSalesTable();
            await loadDashboardStats();
            alert(`✅ Vant kreye avèk siksè! Nimewo Fakti: ${result.nimewoFakti}`);
        } catch (err) {
            showError('newSaleError', err.message || 'Yon erè rive pandan kreyasyon vant lan.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = '✅ Konfime Vant';
        }
    }

    function openNewCustomerModal() {
        document.getElementById('newCustomerError').style.display = 'none';
        document.getElementById('custNon').value = '';
        document.getElementById('custTelefòn').value = '';
        document.getElementById('custLimitKredi').value = '0';
        document.getElementById('newCustomerModal').style.display = 'flex';
    }

    function closeNewCustomerModal() {
        document.getElementById('newCustomerModal').style.display = 'none';
    }

    async function submitNewCustomer() {
        const non = document.getElementById('custNon').value.trim();
        const telefòn = document.getElementById('custTelefòn').value.trim();
        const kategori = document.getElementById('custKategori').value;
        const limitKredi = parseFloat(document.getElementById('custLimitKredi').value) || 0;

        if (!non) { showError('newCustomerError', 'Non kliyan an obligatwa.'); return; }

        const btn = document.getElementById('custSubmitBtn');
        btn.disabled = true;
        btn.textContent = '⏳ Ap kreye...';

        try {
            const result = await window.CustomersService.createCustomer({
                non, telefòn: telefòn || null, kategori, limitKredi
            });
            closeNewCustomerModal();
            await loadProduitsEtKliyan();
            const kliyanSelect = document.getElementById('saleKliyanSelect');
            if (kliyanSelect) kliyanSelect.value = result.id;
            await loadClientsTable();
            await loadDashboardStats();
            alert(`✅ Kliyan "${non}" kreye avèk siksè!`);
        } catch (err) {
            showError('newCustomerError', err.message || 'Erè pandan kreyasyon kliyan an.');
        } finally {
            btn.disabled = false;
            btn.textContent = '✅ Kreye Kliyan';
        }
    }

    function openNewProductModal() {
        document.getElementById('newProductError').style.display = 'none';
        document.getElementById('prodNon').value = '';
        document.getElementById('prodKategori').value = '';
        document.getElementById('prodPriAchat').value = '0';
        document.getElementById('prodPriVente').value = '0';
        document.getElementById('prodStockInisyal').value = '0';
        document.getElementById('prodStockMinimum').value = '5';
        document.getElementById('newProductModal').style.display = 'flex';
    }

    function closeNewProductModal() {
        document.getElementById('newProductModal').style.display = 'none';
    }

    async function submitNewProduct() {
        const non = document.getElementById('prodNon').value.trim();
        const kategori = document.getElementById('prodKategori').value.trim();
        const priAchat = parseFloat(document.getElementById('prodPriAchat').value) || 0;
        const priVente = parseFloat(document.getElementById('prodPriVente').value);
        const kantiteStock = parseInt(document.getElementById('prodStockInisyal').value, 10) || 0;
        const stockMinimum = parseInt(document.getElementById('prodStockMinimum').value, 10) || 5;
        const inite = document.getElementById('prodInite').value;

        if (!non) { showError('newProductError', 'Non pwodwi a obligatwa.'); return; }
        if (isNaN(priVente) || priVente < 0) { showError('newProductError', 'Pri vann pa valid.'); return; }

        const btn = document.getElementById('prodSubmitBtn');
        btn.disabled = true;
        btn.textContent = '⏳ Ap kreye...';

        try {
            const result = await window.ProductsService.createProduct({
                non, kategori: kategori || 'Divès', priAchat, priVente, kantiteStock, stockMinimum, inite
            });
            closeNewProductModal();
            await loadProduitsEtKliyan();
            const pwodwiSelect = document.getElementById('salePwodwiSelect');
            if (pwodwiSelect) {
                pwodwiSelect.value = result.id;
                document.getElementById('salePriInite').value = priVente;
            }
            alert(`✅ Pwodwi "${non}" kreye avèk siksè!`);
        } catch (err) {
            showError('newProductError', err.message || 'Erè pandan kreyasyon pwodwi a.');
        } finally {
            btn.disabled = false;
            btn.textContent = '✅ Kreye Pwodwi';
        }
    }

    async function anileVant(saleId, nimewoFakti) {
        const rezon = prompt(`Poukisa w ap anile fakti ${nimewoFakti}?`);
        if (rezon === null) return;
        if (!rezon.trim()) { alert('Ou dwe bay yon rezon pou anile vant lan.'); return; }

        try {
            await window.SalesService.cancelSale(saleId, rezon.trim());
            await loadSalesTable();
            await loadDashboardStats();
            alert(`✅ Fakti ${nimewoFakti} anile.`);
        } catch (err) {
            alert(`❌ Erè: ${err.message}`);
        }
    }

    let kliyanPemanId = null;

    function openPaymentModal(kliyanId, kliyanNon, dètAktyèl) {
        kliyanPemanId = kliyanId;
        document.getElementById('paymentError').style.display = 'none';
        document.getElementById('paymentKliyanNon').textContent = kliyanNon;
        document.getElementById('paymentDètAktyèl').textContent = dètAktyèl.toLocaleString() + ' HTG';
        document.getElementById('paymentMontan').value = dètAktyèl;
        document.getElementById('paymentModal').style.display = 'flex';
    }

    function closePaymentModal() {
        document.getElementById('paymentModal').style.display = 'none';
        kliyanPemanId = null;
    }

    async function submitPayment() {
        const montan = parseFloat(document.getElementById('paymentMontan').value);
        const mòdPeman = document.getElementById('paymentMòdPeman').value;

        if (!montan || montan <= 0) {
            showError('paymentError', 'Montan an dwe pi gran pase 0.');
            return;
        }

        const btn = document.getElementById('paymentSubmitBtn');
        btn.disabled = true;
        btn.textContent = '⏳ Ap trete...';

        try {
            await window.CustomersService.recordPayment(kliyanPemanId, montan, mòdPeman);
            closePaymentModal();
            await loadClientsTable();
            await loadDashboardStats();
            alert('✅ Peman anrejistre avèk siksè!');
        } catch (err) {
            showError('paymentError', err.message || 'Erè pandan anrejistreman peman an.');
        } finally {
            btn.disabled = false;
            btn.textContent = '✅ Anrejistre Peman';
        }
    }

    async function loadSalesTable() {
        const tbody = document.getElementById('ventesTableBody');
        if (!tbody) return;

        try {
            const sales = await window.SalesService.getSales(20);

            if (sales.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:20px;">Pa gen vant ankò</td></tr>';
                return;
            }

            tbody.innerHTML = sales.map(s => {
                const dat = s.dat?.toDate ? s.dat.toDate().toLocaleDateString('fr-HT') : '—';
                const estatiBadge = s.estati === 'anile'
                    ? '<span class="ged-status" style="background:#FEE2E2; color:#B91C1C;">Anile</span>'
                    : '<span class="ged-status" style="background:#D1FAE5; color:#047857;">Aktif</span>';
                const aksyonBtn = s.estati === 'anile'
                    ? '—'
                    : `<span onclick="VentesUI.anileVant('${s.id}', '${s.nimewoFakti}')" style="color:var(--danger); cursor:pointer; font-size:12px; font-weight:600;">Anile</span>`;
                return `<tr>
                    <td>${s.nimewoFakti}</td>
                    <td>${dat}</td>
                    <td>${s.kliyanNon}</td>
                    <td style="text-align:right;">${(s.total || 0).toLocaleString()} HTG</td>
                    <td>${estatiBadge}</td>
                    <td style="text-align:center;">${aksyonBtn}</td>
                </tr>`;
            }).join('');
        } catch (err) {
            console.error('Erè chajman lis vant:', err);
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--danger); padding:20px;">❌ Erè chajman done</td></tr>';
        }
    }

    async function loadClientsTable() {
        const tbody = document.getElementById('kliyanTableBody');
        if (!tbody) return;

        try {
            const kliyanYo = await window.CustomersService.getCustomers(true);

            if (kliyanYo.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:20px;">Pa gen kliyan ankò</td></tr>';
                return;
            }

            tbody.innerHTML = kliyanYo.map(k => {
                const dèt = k.dèt || 0;
                const aksyonBtn = dèt > 0
                    ? `<span onclick="VentesUI.openPaymentModal('${k.id}', '${k.non.replace(/'/g, "\\'")}', ${dèt})" style="color:var(--primary); cursor:pointer; font-size:12px; font-weight:600;">💳 Peye</span>`
                    : '—';
                return `<tr>
                    <td>${k.non}</td>
                    <td>${k.telefòn || '—'}</td>
                    <td><span class="ged-status" style="background:#F1F5F9;">${k.kategori}</span></td>
                    <td style="text-align:right; ${dèt > 0 ? 'color:var(--danger);' : ''}">${dèt.toLocaleString()} HTG</td>
                    <td style="text-align:center;">${aksyonBtn}</td>
                </tr>`;
            }).join('');
        } catch (err) {
            console.error('Erè chajman lis kliyan:', err);
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--danger); padding:20px;">❌ Erè chajman done</td></tr>';
        }
    }

    async function loadDashboardStats() {
        try {
            const [sales, clients] = await Promise.all([
                window.SalesService.getSales(500),
                window.CustomersService.getCustomers(true)
            ]);

            const salesActives = sales.filter(s => s.estati !== 'anile');
            const jodiA = new Date();
            jodiA.setHours(0, 0, 0, 0);
            const kòmansmanMwa = new Date(jodiA.getFullYear(), jodiA.getMonth(), 1);

            let totalJodiA = 0, totalMwa = 0, totalGeneral = 0;
            const venteParKliyan = {};
            const venteParVandè = {};

            salesActives.forEach(s => {
                const dat = s.dat?.toDate ? s.dat.toDate() : null;
                const total = s.total || 0;
                totalGeneral += total;

                if (dat && dat >= jodiA) totalJodiA += total;
                if (dat && dat >= kòmansmanMwa) totalMwa += total;

                const kliyanKey = s.kliyanNon || 'Kliyan Divès';
                venteParKliyan[kliyanKey] = (venteParKliyan[kliyanKey] || 0) + total;

                const vandèKey = s.vandèId || 'Enkoni';
                venteParVandè[vandèKey] = (venteParVandè[vandèKey] || 0) + total;
            });

            const totalDèt = clients.reduce((sum, k) => sum + (k.dèt || 0), 0);

            const topKliyanList = Object.entries(venteParKliyan).sort((a, b) => b[1] - a[1]).slice(0, 5);
            const topVandèList = Object.entries(venteParVandè).sort((a, b) => b[1] - a[1]).slice(0, 5);

            const setText = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
            const setHTML = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };

            setText('kpiLavantJodi', totalJodiA.toLocaleString() + ' HTG');
            setText('kpiLavantMwa', totalMwa.toLocaleString() + ' HTG');
            setText('kpiNouvoKliyan', clients.length);
            setText('kpiChifAfè', totalGeneral.toLocaleString() + ' HTG');
            setText('kpiDètKliyan', totalDèt.toLocaleString() + ' HTG');

            setText('kpiTopKliyan', topKliyanList.length ? topKliyanList[0][0] : '—');
            setHTML('topKliyanList', topKliyanList.length
                ? topKliyanList.map(([non, total], i) => `<div style="display:flex; justify-content:space-between; padding:2px 0;"><span>${i + 1}. ${non}</span><span>${total.toLocaleString()} HTG</span></div>`).join('')
                : '<span style="color:var(--text-muted);">Pa gen done</span>');

            setText('kpiTopVandè', topVandèList.length ? topVandèList[0][0] : '—');
            setHTML('topVandèList', topVandèList.length
                ? topVandèList.map(([non, total], i) => `<div style="display:flex; justify-content:space-between; padding:2px 0;"><span>${i + 1}. ${non}</span><span>${total.toLocaleString()} HTG</span></div>`).join('')
                : '<span style="color:var(--text-muted);">Pa gen done</span>');

        } catch (err) {
            console.error('Erè kalkil dashboard:', err);
        }
    }

    function toggleTopList(elId) {
        const el = document.getElementById(elId);
        if (!el) return;
        const arrowId = elId === 'topKliyanList' ? 'topKliyanArrow' : 'topVandèArrow';
        const arrow = document.getElementById(arrowId);
        const isOuvri = el.style.display !== 'none';
        el.style.display = isOuvri ? 'none' : 'block';
        if (arrow) arrow.textContent = isOuvri ? '▾' : '▴';
    }

    return {
        openNewSaleModal, closeNewSaleModal,
        addItemToCart, removeItemFromCart, submitNewSale,
        openNewCustomerModal, closeNewCustomerModal, submitNewCustomer,
        openNewProductModal, closeNewProductModal, submitNewProduct,
        anileVant,
        openPaymentModal, closePaymentModal, submitPayment,
        loadSalesTable, loadClientsTable, loadDashboardStats, toggleTopList
    };
})();

window.VentesUI = VentesUI;

document.addEventListener('DOMContentLoaded', () => {
    const ventesNavItem = document.querySelector('[data-target="ventes"]');
    if (ventesNavItem) {
        ventesNavItem.addEventListener('click', () => {
            VentesUI.loadSalesTable();
            VentesUI.loadClientsTable();
            VentesUI.loadDashboardStats();
        });
    }
});
