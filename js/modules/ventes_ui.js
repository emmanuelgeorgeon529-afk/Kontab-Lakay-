// js/modules/ventes_ui.js
// Konekte UI Ventes ak SalesService, ProductsService, CustomersService, DiscountEngine,
// QuotesService, CommandesService, PromotionsService, FidéliteService, MarketingService,
// SavService, ObjectifsService

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
                return `<tr onclick="VentesUI.ouvriFichKliyan('${k.id}')" style="cursor:pointer;">
                    <td>${k.non}</td>
                    <td>${k.telefòn || '—'}</td>
                    <td><span class="ged-status" style="background:#F1F5F9;">${k.kategori}</span></td>
                    <td style="text-align:right; ${dèt > 0 ? 'color:var(--danger);' : ''}">${dèt.toLocaleString()} HTG</td>
                    <td style="text-align:center;" onclick="event.stopPropagation();">${aksyonBtn}</td>
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

    // ================= 3.3 FICH KLIYAN =================

    async function ouvriFichKliyan(kliyanId) {
        try {
            const kliyan = await window.CustomersService.getCustomerById(kliyanId);
            const toutVant = await window.SalesService.getSales(500);
            const vantKliyan = toutVant.filter(v => v.kliyanId === kliyanId && v.estati !== 'anile');
            const totalAcha = vantKliyan.reduce((s, v) => s + (v.total || 0), 0);
            const dènyeVant = vantKliyan.sort((a, b) => (b.dat?.toMillis?.() || 0) - (a.dat?.toMillis?.() || 0))[0];

            const el = document.getElementById('fichKliyanKontenè');
            if (!el) return;
            el.innerHTML = `
                <p style="font-size:13px; color:var(--text-muted); margin-bottom:10px;">Kliyan: <strong>${kliyan.non}</strong></p>
                <table class="fin-table">
                    <tr><td>Total Acha</td><td style="text-align:right; font-weight:600;">${totalAcha.toLocaleString()} HTG</td></tr>
                    <tr><td>Dèt Aktyèl</td><td style="text-align:right; color:var(--danger);">${(kliyan.dèt || 0).toLocaleString()} HTG</td></tr>
                    <tr><td>Limit Kredi</td><td style="text-align:right;">${(kliyan.limitKredi || 0).toLocaleString()} HTG</td></tr>
                    <tr><td>Dènye Fakti</td><td style="text-align:right;">${dènyeVant ? dènyeVant.nimewoFakti : '—'}</td></tr>
                    <tr><td>Kategori</td><td style="text-align:right;">${kliyan.kategori}</td></tr>
                </table>`;

            await loadFidéliteInfo(kliyanId);
        } catch (err) {
            console.error('Erè chajman fich kliyan:', err);
        }
    }

    // ================= 3.11 CATALOGUE PWODWI =================

    async function loadCatalogueTable() {
        const tbody = document.getElementById('catalogueTableBody');
        if (!tbody) return;
        try {
            const pwodwiYo = await window.ProductsService.getProducts(true);
            if (pwodwiYo.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:20px;">Pa gen pwodwi ankò</td></tr>';
                return;
            }
            tbody.innerHTML = pwodwiYo.map(p => `
                <tr>
                    <td>${p.sku || '—'}</td>
                    <td>${p.non}</td>
                    <td style="text-align:right;">${(p.priVente || 0).toLocaleString()} HTG</td>
                    <td style="text-align:right; ${(p.kantiteStock || 0) <= (p.stockMinimum || 5) ? 'color:var(--danger);' : ''}">${p.kantiteStock ?? 0}</td>
                </tr>`).join('');
        } catch (err) {
            console.error('Erè chajman katalòg:', err);
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--danger); padding:20px;">❌ Erè chajman done</td></tr>';
        }
    }

    // ================= 3.18 ANALIZ VANT =================

    async function analizVantPa(kritè) {
        // kritè: 'pwodwi' | 'kliyan' | 'vandè'
        try {
            const sales = await window.SalesService.getSales(500);
            const salesActives = sales.filter(s => s.estati !== 'anile');
            const gwoup = {};

            salesActives.forEach(s => {
                if (kritè === 'kliyan') {
                    const key = s.kliyanNon || 'Kliyan Divès';
                    gwoup[key] = (gwoup[key] || 0) + (s.total || 0);
                } else if (kritè === 'vandè') {
                    const key = s.vandèId || 'Enkoni';
                    gwoup[key] = (gwoup[key] || 0) + (s.total || 0);
                } else if (kritè === 'pwodwi') {
                    (s.atik || []).forEach(a => {
                        gwoup[a.non] = (gwoup[a.non] || 0) + (a.kantite * a.priInite);
                    });
                }
            });

            const triye = Object.entries(gwoup).sort((a, b) => b[1] - a[1]);
            const el = document.getElementById('analizVantRezilta');
            if (!el) return;
            el.innerHTML = triye.length
                ? triye.map(([non, total]) => `
                    <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #F1F5F9;">
                        <span>${non}</span><span style="font-weight:600;">${total.toLocaleString()} HTG</span>
                    </div>`).join('')
                : '<p style="color:var(--text-muted); font-size:13px;">Pa gen done pou analiz sa a.</p>';
        } catch (err) {
            console.error('Erè analiz vant:', err);
        }
    }

    // ================= 3.7 DEVIS =================

    async function loadQuotesTable() {
        const tbody = document.getElementById('devisTableBody');
        if (!tbody) return;
        try {
            const devisYo = await window.QuotesService.getQuotes(30);
            tbody.innerHTML = devisYo.length === 0
                ? '<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:20px;">Pa gen devis ankò</td></tr>'
                : devisYo.map(d => `
                    <tr>
                        <td>${d.nimewoDevis}</td>
                        <td>${d.kliyanNon}</td>
                        <td style="text-align:right;">${(d.total || 0).toLocaleString()} HTG</td>
                        <td><span class="ged-status" style="background:#F1F5F9;">${d.estati}</span></td>
                        <td style="text-align:center;">
                            ${d.estati === 'brouillon' ? `<span onclick="VentesUI.updateQuoteStatus('${d.id}','envoyé')" style="color:var(--primary); cursor:pointer; font-size:12px;">Voye</span>` : ''}
                            ${d.estati === 'envoyé' ? `<span onclick="VentesUI.updateQuoteStatus('${d.id}','accepté')" style="color:#047857; cursor:pointer; font-size:12px;">Aksepte</span> · <span onclick="VentesUI.updateQuoteStatus('${d.id}','refusé')" style="color:var(--danger); cursor:pointer; font-size:12px;">Rejte</span>` : ''}
                            ${d.estati === 'accepté' ? `<span onclick="VentesUI.convertQuote('${d.id}')" style="color:#047857; cursor:pointer; font-size:12px; font-weight:600;">Konvèti→Vant</span>` : ''}
                        </td>
                    </tr>`).join('');
        } catch (err) { console.error('Erè chajman devis:', err); }
    }

    async function updateQuoteStatus(quoteId, estati) {
        try {
            await window.QuotesService.updateQuoteStatus(quoteId, estati);
            await loadQuotesTable();
        } catch (err) { alert('Erè: ' + err.message); }
    }

    async function convertQuote(quoteId) {
        const mòdPeman = prompt('Mòd peman (kach/kredi/moncash/kat):', 'kach');
        if (!mòdPeman) return;
        try {
            const vant = await window.QuotesService.convertQuoteToSale(quoteId, mòdPeman.trim());
            await loadQuotesTable();
            await loadSalesTable();
            alert(`✅ Devi konvèti! Fakti: ${vant.nimewoFakti}`);
        } catch (err) { alert('Erè: ' + err.message); }
    }

    // ================= 3.8 COMMANDES CLIENTS =================

    async function loadCommandesTable() {
        const kontenè = document.getElementById('commandesKontenè');
        if (!kontenè) return;
        try {
            const cmdYo = await window.CommandesService.getOrders(30);
            const badges = {
                brouillon: ['#FEF3C7', '#B45309', '🟡'], confirmée: ['#EEF2FF', 'var(--primary)', '🔵'],
                en_préparation: ['#FFEDD5', '#C2410C', '🟠'], expédiée: ['#DBEAFE', '#1D4ED8', '🚚'],
                livrée: ['#D1FAE5', '#047857', '🟢'], annulée: ['#FEE2E2', '#B91C1C', '🔴']
            };
            kontenè.innerHTML = cmdYo.length === 0
                ? '<p style="color:var(--text-muted); font-size:13px;">Pa gen kòmand ankò</p>'
                : cmdYo.map(c => {
                    const [bg, koulè, ikòn] = badges[c.estati] || ['#F1F5F9', 'var(--text-dark)', ''];
                    let aksyon = '';
                    if (!['livrée', 'annulée'].includes(c.estati)) {
                        aksyon = `<span onclick="VentesUI.advanceOrder('${c.id}')" style="color:var(--primary); cursor:pointer; font-size:12px; font-weight:600;">Avanse →</span> · <span onclick="VentesUI.cancelOrder('${c.id}')" style="color:var(--danger); cursor:pointer; font-size:12px;">Anile</span>`;
                    } else if (c.estati === 'livrée' && !c.venteId) {
                        aksyon = `<span onclick="VentesUI.convertOrder('${c.id}')" style="color:#047857; cursor:pointer; font-size:12px; font-weight:600;">Konvèti→Vant</span>`;
                    }
                    return `<div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border:1px solid #E2E8F0; border-radius:10px; margin-bottom:8px;">
                        <div><strong>${c.nimewoCommande}</strong> — ${c.kliyanNon}<div style="font-size:12px; color:var(--text-muted);">${(c.total || 0).toLocaleString()} HTG</div></div>
                        <div style="display:flex; align-items:center; gap:10px;"><span class="ged-status" style="background:${bg}; color:${koulè};">${ikòn} ${c.estati}</span>${aksyon}</div>
                    </div>`;
                }).join('');
        } catch (err) { console.error('Erè chajman kòmand:', err); }
    }

    async function advanceOrder(orderId) {
        try { await window.CommandesService.advanceOrderStatus(orderId); await loadCommandesTable(); }
        catch (err) { alert('Erè: ' + err.message); }
    }

    async function cancelOrder(orderId) {
        const rezon = prompt('Rezon anilasyon:');
        if (rezon === null || !rezon.trim()) return;
        try { await window.CommandesService.cancelOrder(orderId, rezon.trim()); await loadCommandesTable(); }
        catch (err) { alert('Erè: ' + err.message); }
    }

    async function convertOrder(orderId) {
        const mòdPeman = prompt('Mòd peman:', 'kach');
        if (!mòdPeman) return;
        try {
            const vant = await window.CommandesService.convertOrderToSale(orderId, mòdPeman.trim());
            await loadCommandesTable(); await loadSalesTable();
            alert(`✅ Kòmand konvèti! Fakti: ${vant.nimewoFakti}`);
        } catch (err) { alert('Erè: ' + err.message); }
    }

    // ================= 3.13 PROMOTIONS =================

    async function loadPromotionsTable() {
        const kontenè = document.getElementById('promotionsKontenè');
        if (!kontenè) return;
        try {
            const promoYo = await window.PromotionsService.getPromotions(true);
            kontenè.innerHTML = promoYo.length === 0
                ? '<p style="color:var(--text-muted); font-size:13px;">Pa gen promosyon aktif</p>'
                : promoYo.map(p => `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border:1px solid #E2E8F0; border-radius:10px; margin-bottom:8px;">
                        <div><strong>${p.kòd}</strong><div style="font-size:12px; color:var(--text-muted);">${p.tip} — ${p.valè}</div></div>
                        <span onclick="VentesUI.deactivatePromo('${p.id}')" style="color:var(--danger); cursor:pointer; font-size:12px;">Dezaktive</span>
                    </div>`).join('');
        } catch (err) { console.error('Erè chajman promo:', err); }
    }

    async function deactivatePromo(promoId) {
        try { await window.PromotionsService.deactivatePromotion(promoId); await loadPromotionsTable(); }
        catch (err) { alert('Erè: ' + err.message); }
    }

    // ================= 3.14 FIDÉLITÉ =================

    async function loadFidéliteInfo(kliyanId) {
        const el = document.getElementById('fidéliteKontenè');
        if (!el || !kliyanId) return;
        try {
            const fidèl = await window.FidéliteService.getFidéliteByCustomer(kliyanId);
            el.innerHTML = `
                <table class="fin-table">
                    <tr><td>Pwen Akimile</td><td style="text-align:right;">${fidèl.pwenAkimile || 0} pts</td></tr>
                    <tr><td>Cashback Disponib</td><td style="text-align:right;">${(fidèl.cashbackAkimile || 0).toLocaleString()} HTG</td></tr>
                </table>`;
        } catch (err) { console.error('Erè chajman fidélité:', err); }
    }

    // ================= 3.15 MARKETING =================

    async function loadCampaignsTable() {
        const kontenè = document.getElementById('kanpayKontenè');
        if (!kontenè) return;
        try {
            const kanpayYo = await window.MarketingService.getCampaigns(20);
            kontenè.innerHTML = kanpayYo.length === 0
                ? '<p style="color:var(--text-muted); font-size:13px;">Pa gen kanpay ankò</p>'
                : kanpayYo.map(k => `
                    <div style="padding:10px; border:1px solid #E2E8F0; border-radius:10px; margin-bottom:8px;">
                        <strong>${k.non}</strong> — ${k.kanal}
                        <div style="font-size:12px; color:var(--text-muted);">${k.estati} · Segman: ${k.sègman}</div>
                    </div>`).join('');
        } catch (err) { console.error('Erè chajman kanpay:', err); }
    }

    // ================= 3.16-3.17 SAV & RETOURS =================

    async function loadSavTable() {
        const kontenè = document.getElementById('savKontenè');
        if (!kontenè) return;
        try {
            const tikèYo = await window.SavService.getTickets(30);
            kontenè.innerHTML = tikèYo.length === 0
                ? '<p style="color:var(--text-muted); font-size:13px;">Pa gen tikè SAV</p>'
                : tikèYo.map(t => {
                    let aksyon = '';
                    if (t.tip === 'retour' && !['remboursement', 'échange_effectué', 'rejeté'].includes(t.estati)) {
                        const pwochen = { retour_demandé: 'inspection', inspection: 'remboursement' }[t.estati];
                        if (pwochen) aksyon = `<span onclick="VentesUI.advanceReturn('${t.id}','${pwochen}')" style="color:var(--primary); cursor:pointer; font-size:12px; font-weight:600;">Avanse: ${pwochen}</span>`;
                    } else if (t.estati === 'ouvert') {
                        aksyon = `<span onclick="VentesUI.closeSavTicket('${t.id}')" style="color:#047857; cursor:pointer; font-size:12px; font-weight:600;">Fèmen</span>`;
                    }
                    return `<div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border:1px solid #E2E8F0; border-radius:10px; margin-bottom:8px;">
                        <div><strong>${t.nimewoTikè}</strong> (${t.tip}) — ${t.kliyanNon}<div style="font-size:12px; color:var(--text-muted);">${t.deskripsyon}</div></div>
                        <div style="display:flex; align-items:center; gap:10px;"><span class="ged-status" style="background:#F1F5F9;">${t.estati}</span>${aksyon}</div>
                    </div>`;
                }).join('');
        } catch (err) { console.error('Erè chajman SAV:', err); }
    }

    async function advanceReturn(ticketId, nouvoEstati) {
        try { await window.SavService.advanceReturnStatus(ticketId, nouvoEstati); await loadSavTable(); }
        catch (err) { alert('Erè: ' + err.message); }
    }

    async function closeSavTicket(ticketId) {
        const rezolisyon = prompt('Rezolisyon:');
        if (rezolisyon === null) return;
        try { await window.SavService.closeTicket(ticketId, rezolisyon); await loadSavTable(); }
        catch (err) { alert('Erè: ' + err.message); }
    }

    // ================= 3.19 OBJECTIFS COMMERCIAUX =================

    async function loadObjectivesProgress() {
        const kontenè = document.getElementById('objectifsKontenè');
        if (!kontenè) return;
        try {
            const progress = await window.ObjectifsService.getAllProgress();
            kontenè.innerHTML = progress.length === 0
                ? '<p style="color:var(--text-muted); font-size:13px;">Pa gen objektif defini</p>'
                : progress.map(p => `
                    <div style="margin-bottom:16px;">
                        <p style="font-size:13px; font-weight:600; margin-bottom:6px;">${p.vandèNon} — Objektif: ${p.montanObjektif.toLocaleString()} HTG</p>
                        <div style="background:#F1F5F9; border-radius:8px; height:14px; overflow:hidden;">
                            <div style="background:var(--secondary); width:${p.pousantaj}%; height:100%;"></div>
                        </div>
                        <p style="text-align:right; font-size:12px; color:var(--text-muted); margin-top:4px;">Reyalizasyon: ${p.totalReyalize.toLocaleString()} HTG (${p.pousantaj}%)</p>
                    </div>`).join('');
        } catch (err) { console.error('Erè chajman objektif:', err); }
    }

    // ================= MODAL NOUVO DEVIS =================

    let devisCart = [];

    function openNewQuoteModal() {
        devisCart = [];
        renderDevisCart();
        document.getElementById('newQuoteError').style.display = 'none';
        document.getElementById('newQuoteModal').style.display = 'flex';
        renderDevisDropdowns();
    }

    function closeNewQuoteModal() {
        document.getElementById('newQuoteModal').style.display = 'none';
    }

    function renderDevisDropdowns() {
        const pwodwiSelect = document.getElementById('devisPwodwiSelect');
        if (pwodwiSelect) {
            pwodwiSelect.innerHTML = '<option value="">— Chwazi pwodwi —</option>' +
                produitsCache.map(p => `<option value="${p.id}" data-pri="${p.priVente || 0}">${p.non}</option>`).join('');
            pwodwiSelect.onchange = () => {
                const sel = pwodwiSelect.options[pwodwiSelect.selectedIndex];
                document.getElementById('devisPriInite').value = sel?.dataset?.pri || 0;
            };
        }
        const kliyanSelect = document.getElementById('devisKliyanSelect');
        if (kliyanSelect) {
            kliyanSelect.innerHTML = '<option value="">Kliyan Divès</option>' +
                kliyanCache.map(k => `<option value="${k.id}">${k.non}</option>`).join('');
        }
    }

    function addItemToQuoteCart() {
        const pwodwiSelect = document.getElementById('devisPwodwiSelect');
        const pwodwiId = pwodwiSelect.value;
        const pwodwiNon = pwodwiSelect.options[pwodwiSelect.selectedIndex]?.text || '';
        const kantite = parseInt(document.getElementById('devisQuantite').value, 10);
        const priInite = parseFloat(document.getElementById('devisPriInite').value);

        if (!pwodwiId) { showError('newQuoteError', 'Chwazi yon pwodwi anvan.'); return; }
        if (!kantite || kantite <= 0) { showError('newQuoteError', 'Kantite dwe pi gran pase 0.'); return; }
        if (isNaN(priInite) || priInite < 0) { showError('newQuoteError', 'Pri inite pa valid.'); return; }

        devisCart.push({ pwodwiId, non: pwodwiNon, kantite, priInite });
        renderDevisCart();
        document.getElementById('newQuoteError').style.display = 'none';
    }

    function renderDevisCart() {
        const listEl = document.getElementById('devisCartList');
        const totalEl = document.getElementById('devisCartTotal');
        if (!listEl || !totalEl) return;

        if (devisCart.length === 0) {
            listEl.innerHTML = '<p style="color:var(--text-muted); font-size:12px;">Devi vid</p>';
            totalEl.textContent = '0';
            return;
        }

        let total = 0;
        listEl.innerHTML = devisCart.map((item, i) => {
            const net = item.kantite * item.priInite;
            total += net;
            return `<div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid #F1F5F9;">
                <span>${item.non} × ${item.kantite}</span>
                <span>${net.toLocaleString()} HTG <span onclick="VentesUI.removeItemFromQuoteCart(${i})" style="color:var(--danger); cursor:pointer; margin-left:8px;">✕</span></span>
            </div>`;
        }).join('');
        totalEl.textContent = total.toLocaleString();
    }

    function removeItemFromQuoteCart(index) {
        devisCart.splice(index, 1);
        renderDevisCart();
    }

    async function submitNewQuote() {
        if (devisCart.length === 0) { showError('newQuoteError', 'Ajoute pou pi piti yon atik.'); return; }

        const kliyanSelect = document.getElementById('devisKliyanSelect');
        const kliyanId = kliyanSelect.value || null;
        const kliyanNon = kliyanId ? kliyanSelect.options[kliyanSelect.selectedIndex].text : 'Kliyan Divès';
        const validitéJou = parseInt(document.getElementById('devisValiditéJou').value, 10) || 15;

        const btn = document.getElementById('devisSubmitBtn');
        btn.disabled = true;
        btn.textContent = '⏳ Ap kreye...';

        try {
            const result = await window.QuotesService.createQuote({
                kliyanId, kliyanNon, atik: devisCart, validitéJou
            });
            closeNewQuoteModal();
            await loadQuotesTable();
            alert(`✅ Devi kreye! Nimewo: ${result.nimewoDevis}`);
        } catch (err) {
            showError('newQuoteError', err.message || 'Erè pandan kreyasyon devi a.');
        } finally {
            btn.disabled = false;
            btn.textContent = '✅ Kreye Devis';
        }
    }

    // ================= MODAL NOUVO KÒMAND =================

    let commandeCart = [];

    function openNewOrderModal() {
        commandeCart = [];
        renderCommandeCart();
        document.getElementById('newOrderError').style.display = 'none';
        document.getElementById('newOrderModal').style.display = 'flex';
        renderCommandeDropdowns();
    }

    function closeNewOrderModal() {
        document.getElementById('newOrderModal').style.display = 'none';
    }

    function renderCommandeDropdowns() {
        const pwodwiSelect = document.getElementById('commandePwodwiSelect');
        if (pwodwiSelect) {
            pwodwiSelect.innerHTML = '<option value="">— Chwazi pwodwi —</option>' +
                produitsCache.map(p => `<option value="${p.id}" data-pri="${p.priVente || 0}">${p.non}</option>`).join('');
            pwodwiSelect.onchange = () => {
                const sel = pwodwiSelect.options[pwodwiSelect.selectedIndex];
                document.getElementById('commandePriInite').value = sel?.dataset?.pri || 0;
            };
        }
        const kliyanSelect = document.getElementById('commandeKliyanSelect');
        if (kliyanSelect) {
            kliyanSelect.innerHTML = '<option value="">Kliyan Divès</option>' +
                kliyanCache.map(k => `<option value="${k.id}">${k.non}</option>`).join('');
        }
    }

    function addItemToOrderCart() {
        const pwodwiSelect = document.getElementById('commandePwodwiSelect');
        const pwodwiId = pwodwiSelect.value;
        const pwodwiNon = pwodwiSelect.options[pwodwiSelect.selectedIndex]?.text || '';
        const kantite = parseInt(document.getElementById('commandeQuantite').value, 10);
        const priInite = parseFloat(document.getElementById('commandePriInite').value);

        if (!pwodwiId) { showError('newOrderError', 'Chwazi yon pwodwi anvan.'); return; }
        if (!kantite || kantite <= 0) { showError('newOrderError', 'Kantite dwe pi gran pase 0.'); return; }
        if (isNaN(priInite) || priInite < 0) { showError('newOrderError', 'Pri inite pa valid.'); return; }

        commandeCart.push({ pwodwiId, non: pwodwiNon, kantite, priInite });
        renderCommandeCart();
        document.getElementById('newOrderError').style.display = 'none';
    }

    function renderCommandeCart() {
        const listEl = document.getElementById('commandeCartList');
        const totalEl = document.getElementById('commandeCartTotal');
        if (!listEl || !totalEl) return;

        if (commandeCart.length === 0) {
            listEl.innerHTML = '<p style="color:var(--text-muted); font-size:12px;">Kòmand vid</p>';
            totalEl.textContent = '0';
            return;
        }

        let total = 0;
        listEl.innerHTML = commandeCart.map((item, i) => {
            const net = item.kantite * item.priInite;
            total += net;
            return `<div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid #F1F5F9;">
                <span>${item.non} × ${item.kantite}</span>
                <span>${net.toLocaleString()} HTG <span onclick="VentesUI.removeItemFromOrderCart(${i})" style="color:var(--danger); cursor:pointer; margin-left:8px;">✕</span></span>
            </div>`;
        }).join('');
        totalEl.textContent = total.toLocaleString();
    }

    function removeItemFromOrderCart(index) {
        commandeCart.splice(index, 1);
        renderCommandeCart();
    }

    async function submitNewOrder() {
        if (commandeCart.length === 0) { showError('newOrderError', 'Ajoute pou pi piti yon atik.'); return; }

        const kliyanSelect = document.getElementById('commandeKliyanSelect');
        const kliyanId = kliyanSelect.value || null;
        const kliyanNon = kliyanId ? kliyanSelect.options[kliyanSelect.selectedIndex].text : 'Kliyan Divès';
        const adrèsLivrezon = document.getElementById('commandeAdrès').value.trim();

        const btn = document.getElementById('commandeSubmitBtn');
        btn.disabled = true;
        btn.textContent = '⏳ Ap kreye...';

        try {
            const result = await window.CommandesService.createOrder({
                kliyanId, kliyanNon, atik: commandeCart, adrèsLivrezon
            });
            closeNewOrderModal();
            await loadCommandesTable();
            alert(`✅ Kòmand kreye! Nimewo: ${result.nimewoCommande}`);
        } catch (err) {
            showError('newOrderError', err.message || 'Erè pandan kreyasyon kòmand lan.');
        } finally {
            btn.disabled = false;
            btn.textContent = '✅ Kreye Kòmand';
        }
    }

    // ================= MODAL NOUVO PROMO =================

    function openNewPromoModal() {
        document.getElementById('newPromoError').style.display = 'none';
        document.getElementById('promoKòd').value = '';
        document.getElementById('promoValè').value = '0';
        document.getElementById('promoDateDebut').value = '';
        document.getElementById('promoDateFen').value = '';
        document.getElementById('newPromoModal').style.display = 'flex';
    }

    function closeNewPromoModal() {
        document.getElementById('newPromoModal').style.display = 'none';
    }

    async function submitNewPromo() {
        const kòd = document.getElementById('promoKòd').value.trim();
        const tip = document.getElementById('promoTip').value;
        const valè = parseFloat(document.getElementById('promoValè').value) || 0;
        const dateDebut = document.getElementById('promoDateDebut').value;
        const dateFen = document.getElementById('promoDateFen').value;

        if (!kòd) { showError('newPromoError', 'Kòd promo obligatwa.'); return; }
        if (!dateDebut || !dateFen) { showError('newPromoError', 'Dat kòmansman ak fen obligatwa.'); return; }

        const btn = document.getElementById('promoSubmitBtn');
        btn.disabled = true;
        btn.textContent = '⏳ Ap kreye...';

        try {
            await window.PromotionsService.createPromotion({ kòd, tip, valè, dateDebut, dateFen });
            closeNewPromoModal();
            await loadPromotionsTable();
            alert(`✅ Promo "${kòd}" kreye avèk siksè!`);
        } catch (err) {
            showError('newPromoError', err.message || 'Erè pandan kreyasyon promo a.');
        } finally {
            btn.disabled = false;
            btn.textContent = '✅ Kreye Promo';
        }
    }

    // ================= MODAL NOUVO KANPAY =================

    function openNewCampaignModal() {
        document.getElementById('newCampaignError').style.display = 'none';
        document.getElementById('kanpayNon').value = '';
        document.getElementById('kanpayMesaj').value = '';
        document.getElementById('newCampaignModal').style.display = 'flex';
    }

    function closeNewCampaignModal() {
        document.getElementById('newCampaignModal').style.display = 'none';
    }

    async function submitNewCampaign() {
        const non = document.getElementById('kanpayNon').value.trim();
        const kanal = document.getElementById('kanpayKanal').value;
        const sègman = document.getElementById('kanpaySègman').value;
        const mesaj = document.getElementById('kanpayMesaj').value.trim();

        if (!non) { showError('newCampaignError', 'Non kanpay la obligatwa.'); return; }
        if (!mesaj) { showError('newCampaignError', 'Mesaj la obligatwa.'); return; }

        const btn = document.getElementById('kanpaySubmitBtn');
        btn.disabled = true;
        btn.textContent = '⏳ Ap kreye...';

        try {
            await window.MarketingService.createCampaign({ non, kanal, sègman, mesaj });
            closeNewCampaignModal();
            await loadCampaignsTable();
            alert(`✅ Kanpay "${non}" kreye avèk siksè!`);
        } catch (err) {
            showError('newCampaignError', err.message || 'Erè pandan kreyasyon kanpay la.');
        } finally {
            btn.disabled = false;
            btn.textContent = '✅ Kreye Kanpay';
        }
    }

    // ================= MODAL NOUVO TIKÈ SAV =================

    async function openNewSavModal() {
        document.getElementById('newSavError').style.display = 'none';
        document.getElementById('savDeskripsyon').value = '';
        document.getElementById('newSavModal').style.display = 'flex';

        const kliyanSelect = document.getElementById('savKliyanSelect');
        if (kliyanSelect) {
            kliyanSelect.innerHTML = '<option value="">Kliyan Divès</option>' +
                kliyanCache.map(k => `<option value="${k.id}">${k.non}</option>`).join('');
        }

        try {
            const sales = await window.SalesService.getSales(100);
            const venteSelect = document.getElementById('savVenteSelect');
            if (venteSelect) {
                venteSelect.innerHTML = '<option value="">— Chwazi fakti —</option>' +
                    sales.filter(s => s.estati !== 'anile')
                        .map(s => `<option value="${s.id}">${s.nimewoFakti} — ${s.kliyanNon}</option>`).join('');
            }
        } catch (err) {
            console.error('Erè chajman vant pou SAV:', err);
        }
    }

    function closeNewSavModal() {
        document.getElementById('newSavModal').style.display = 'none';
    }

    async function submitNewSavTicket() {
        const tip = document.getElementById('savTip').value;
        const kliyanSelect = document.getElementById('savKliyanSelect');
        const kliyanId = kliyanSelect.value || null;
        const kliyanNon = kliyanId ? kliyanSelect.options[kliyanSelect.selectedIndex].text : 'Kliyan Divès';
        const venteId = document.getElementById('savVenteSelect').value || null;
        const deskripsyon = document.getElementById('savDeskripsyon').value.trim();

        if (!deskripsyon) { showError('newSavError', 'Deskripsyon an obligatwa.'); return; }
        if (['retour', 'échange', 'garantie'].includes(tip) && !venteId) {
            showError('newSavError', 'Chwazi fakti orijinal la pou ' + tip + '.');
            return;
        }

        const btn = document.getElementById('savSubmitBtn');
        btn.disabled = true;
        btn.textContent = '⏳ Ap kreye...';

        try {
            const result = await window.SavService.createTicket({
                tip, kliyanId, kliyanNon, venteId, deskripsyon
            });
            closeNewSavModal();
            await loadSavTable();
            alert(`✅ Tikè kreye! Nimewo: ${result.nimewoTikè}`);
        } catch (err) {
            showError('newSavError', err.message || 'Erè pandan kreyasyon tikè a.');
        } finally {
            btn.disabled = false;
            btn.textContent = '✅ Kreye Tikè';
        }
    }

    // ================= MODAL NOUVO OBJEKTIF =================

    function openNewObjectiveModal() {
        document.getElementById('newObjectiveError').style.display = 'none';
        document.getElementById('objVandèId').value = '';
        document.getElementById('objVandèNon').value = '';
        document.getElementById('objMontan').value = '0';
        document.getElementById('objDateDebut').value = '';
        document.getElementById('objDateFen').value = '';
        document.getElementById('newObjectiveModal').style.display = 'flex';
    }

    function closeNewObjectiveModal() {
        document.getElementById('newObjectiveModal').style.display = 'none';
    }

    async function submitNewObjective() {
        const vandèId = document.getElementById('objVandèId').value.trim();
        const vandèNon = document.getElementById('objVandèNon').value.trim();
        const montanObjektif = parseFloat(document.getElementById('objMontan').value) || 0;
        const dateDebut = document.getElementById('objDateDebut').value;
        const dateFen = document.getElementById('objDateFen').value;

        if (!vandèId) { showError('newObjectiveError', 'ID vandè a obligatwa.'); return; }
        if (montanObjektif <= 0) { showError('newObjectiveError', 'Montan objektif la dwe pi gran pase 0.'); return; }
        if (!dateDebut || !dateFen) { showError('newObjectiveError', 'Peryòd la obligatwa.'); return; }

        const btn = document.getElementById('objSubmitBtn');
        btn.disabled = true;
        btn.textContent = '⏳ Ap kreye...';

        try {
            await window.ObjectifsService.createObjective({ vandèId, vandèNon, montanObjektif, dateDebut, dateFen });
            closeNewObjectiveModal();
            await loadObjectivesProgress();
            alert(`✅ Objektif pou "${vandèNon}" kreye avèk siksè!`);
        } catch (err) {
            showError('newObjectiveError', err.message || 'Erè pandan kreyasyon objektif la.');
        } finally {
            btn.disabled = false;
            btn.textContent = '✅ Kreye Objektif';
        }
    }

    // ================= CHAJMAN TOUT SEKSYON KOUNYE VENTES OUVÈ =================

    async function loadAllVentesSections() {
        await Promise.all([
            loadSalesTable(),
            loadClientsTable(),
            loadDashboardStats(),
            loadCatalogueTable(),
            loadQuotesTable(),
            loadCommandesTable(),
            loadPromotionsTable(),
            loadCampaignsTable(),
            loadSavTable(),
            loadObjectivesProgress()
        ]);
    }

    return {
        openNewSaleModal, closeNewSaleModal,
        addItemToCart, removeItemFromCart, submitNewSale,
        openNewCustomerModal, closeNewCustomerModal, submitNewCustomer,
        openNewProductModal, closeNewProductModal, submitNewProduct,
        anileVant,
        openPaymentModal, closePaymentModal, submitPayment,
        loadSalesTable, loadClientsTable, loadDashboardStats, toggleTopList,
        ouvriFichKliyan, loadCatalogueTable, analizVantPa,
        loadQuotesTable, updateQuoteStatus, convertQuote,
        loadCommandesTable, advanceOrder, cancelOrder, convertOrder,
        loadPromotionsTable, deactivatePromo,
        loadFidéliteInfo,
        loadCampaignsTable,
        loadSavTable, advanceReturn, closeSavTicket,
        loadObjectivesProgress,
        loadAllVentesSections,
        openNewQuoteModal, closeNewQuoteModal, addItemToQuoteCart, removeItemFromQuoteCart, submitNewQuote,
        openNewOrderModal, closeNewOrderModal, addItemToOrderCart, removeItemFromOrderCart, submitNewOrder,
        openNewPromoModal, closeNewPromoModal, submitNewPromo,
        openNewCampaignModal, closeNewCampaignModal, submitNewCampaign,
        openNewSavModal, closeNewSavModal, submitNewSavTicket,
        openNewObjectiveModal, closeNewObjectiveModal, submitNewObjective
    };
})();

window.VentesUI = VentesUI;

document.addEventListener('DOMContentLoaded', () => {
    const ventesNavItem = document.querySelector('[data-target="ventes"]');
    if (ventesNavItem) {
        ventesNavItem.addEventListener('click', () => {
            VentesUI.loadAllVentesSections();
        });
    }
});
