// js/modules/operations_ui.js
// Konekte seksyon "Opérations, Supply Chain & Gestion de Stock" ak
// ProductsService, SuppliersService, PurchasesService
// NÒT: modil sa a chaje lè moun klike nan navigasyon (data-target="operations"),
// menm konvansyon ak VentesUI — sidebar.html dwe rele
// OperationsUI.loadAllOperationsSections() nan click listener li.
// Pa gen okenn ekriti Firestore dirèkteman isit — tout pase pa sèvis yo.

(function () {
    let pwodwiCache = [];
    let founiseCache = [];
    let panye = []; // [{ pwodwiId, non, kantite, priInite, rabaisPousantaj }]

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

    // ---------- 4.1 / 4.2 PWODWI & STOCK ----------

    function rannTabloProduits(lis) {
        const tbody = document.querySelector('#operationsProduitsTableBody');
        if (!tbody) return;
        if (lis.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">Pa gen pwodwi ankò</td></tr>`;
            return;
        }
        tbody.innerHTML = lis.map(p => `
            <tr>
                <td>${escHtml(p.sku || '—')}</td>
                <td>${escHtml(p.non)}</td>
                <td>${escHtml(p.kategori || '—')}</td>
                <td style="text-align:right;">${fmtHTG(p.priAchat)}</td>
                <td style="text-align:right;">${fmtHTG(p.priVente)}</td>
                <td>${escHtml(p.inite || 'Pyès')}</td>
            </tr>`).join('');
    }

    function rannTabloStock(lis) {
        const tbody = document.querySelector('#stockTableBody');
        const valèTotalEl = document.querySelector('#kpiStockValèTotal');
        const dispoEl = document.querySelector('#kpiStockDisponib');
        const fèbEl = document.querySelector('#kpiStockFèb');
        const epwizeEl = document.querySelector('#kpiStockEpwize');

        let valèTotal = 0, dispo = 0, fèb = 0, epwize = 0;

        if (tbody) {
            if (lis.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">Pa gen pwodwi ankò</td></tr>`;
            } else {
                tbody.innerHTML = lis.map(p => {
                    const stock = p.kantiteStock || 0;
                    const min = p.stockMinimum || 5;
                    valèTotal += stock * (p.priAchat || 0);

                    let badge, statutClass;
                    if (stock === 0) { badge = '🔴 Rupture'; statutClass = 'background:#FEE2E2; color:#B91C1C;'; epwize++; }
                    else if (stock <= min) { badge = '🟡 Faible'; statutClass = 'background:#FEF3C7; color:#B45309;'; fèb++; }
                    else { badge = '🟢 Disponible'; statutClass = 'background:#D1FAE5; color:#047857;'; dispo++; }

                    return `<tr>
                        <td>${escHtml(p.non)}</td>
                        <td style="text-align:right;">${stock}</td>
                        <td style="text-align:right;">${min}</td>
                        <td><span class="ged-status" style="${statutClass}">${badge}</span></td>
                        <td></td>
                    </tr>`;
                }).join('');
            }
        }

        if (valèTotalEl) valèTotalEl.textContent = fmtHTG(valèTotal);
        if (dispoEl) dispoEl.textContent = dispo;
        if (fèbEl) fèbEl.textContent = fèb;
        if (epwizeEl) epwizeEl.textContent = epwize;
    }

    async function chajePwodwi() {
        try {
            pwodwiCache = await window.ProductsService.getProducts(true);
            rannTabloProduits(pwodwiCache);
            rannTabloStock(pwodwiCache);
            remliSelectPwodwi();
            await mèteAjouKpiPwodwiStock();
        } catch (e) {
            console.warn('OperationsUI: chajePwodwi echwe', e);
        }
    }

    async function mèteAjouKpiPwodwiStock() {
        const stockTotalEl = document.querySelector('#kpiOperationsStockTotal');
        const produitsEl = document.querySelector('#kpiOperationsProduits');
        const alètEl = document.querySelector('#kpiOperationsAlèt');
        const valèEnvantèEl = document.querySelector('#kpiOperationsValèEnvantè');

        const stockTotal = pwodwiCache.reduce((s, p) => s + (p.kantiteStock || 0), 0);
        const valèEnvantè = pwodwiCache.reduce((s, p) => s + (p.kantiteStock || 0) * (p.priAchat || 0), 0);

        if (stockTotalEl) stockTotalEl.textContent = stockTotal.toLocaleString('fr-HT');
        if (produitsEl) produitsEl.textContent = pwodwiCache.length;
        if (valèEnvantèEl) valèEnvantèEl.textContent = fmtHTG(valèEnvantè);

        try {
            const lowStock = await window.ProductsService.getLowStockProducts();
            if (alètEl) alètEl.textContent = lowStock.length;
        } catch (e) {
            console.warn('OperationsUI: getLowStockProducts echwe', e);
        }
    }

    // ---------- 4.6 FOUNISÈ ----------

    function rannTabloFounise(lis) {
        const tbody = document.querySelector('#founisèTableBody');
        if (!tbody) return;
        if (lis.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-muted);">Pa gen founisè ankò</td></tr>`;
            return;
        }
        tbody.innerHTML = lis.map(f => `
            <tr>
                <td>${escHtml(f.non)}</td>
                <td>${escHtml(f.telefòn || '—')}</td>
                <td style="text-align:right; ${(f.dèt || 0) > 0 ? 'color:var(--danger); font-weight:600;' : ''}">${fmtHTG(f.dèt)}</td>
            </tr>`).join('');
    }

    async function chajeFounise() {
        try {
            founiseCache = await window.SuppliersService.getSuppliers(true);
            rannTabloFounise(founiseCache);
            remliSelectFounise();
            const founiseEl = document.querySelector('#kpiOperationsFounise');
            if (founiseEl) founiseEl.textContent = founiseCache.length;
        } catch (e) {
            console.warn('OperationsUI: chajeFounise echwe', e);
        }
    }

    // ---------- 4.5 ACHA ----------

    function rannTabloAcha(lis) {
        const tbody = document.querySelector('#achatTableBody');
        if (!tbody) return;
        if (lis.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">Pa gen acha ankò</td></tr>`;
            return;
        }
        tbody.innerHTML = lis.map(a => {
            const badge = a.estati === 'anile'
                ? `<span class="ged-status" style="background:#FEE2E2; color:#B91C1C;">Anile</span>`
                : `<span class="ged-status" style="background:#D1FAE5; color:#047857;">Aktif</span>`;
            return `<tr>
                <td>${escHtml(a.nimewoAcha)}</td>
                <td>${escHtml(a.founiseNon)}</td>
                <td style="text-align:right;">${fmtHTG(a.total)}</td>
                <td>${badge}</td>
            </tr>`;
        }).join('');
    }

    async function chajeAcha() {
        try {
            const acha = await window.PurchasesService.getPurchases(50);
            rannTabloAcha(acha);

            const kounyeA = new Date();
            const totalMwa = acha
                .filter(a => a.estati !== 'anile' && a.dat?.toDate &&
                    a.dat.toDate().getMonth() === kounyeA.getMonth() &&
                    a.dat.toDate().getFullYear() === kounyeA.getFullYear())
                .reduce((s, a) => s + (a.total || 0), 0);

            const achatMwaEl = document.querySelector('#kpiOperationsAchatMwa');
            if (achatMwaEl) achatMwaEl.textContent = fmtHTG(totalMwa);
        } catch (e) {
            console.warn('OperationsUI: chajeAcha echwe', e);
        }
    }

    // ---------- MODAL: NOUVO FOUNISÈ ----------

    function openNewSupplierModal() {
        document.querySelector('#suppNon').value = '';
        document.querySelector('#suppTelefòn').value = '';
        document.querySelector('#suppAdrès').value = '';
        hideError('newSupplierError');
        document.querySelector('#newSupplierModal').style.display = 'flex';
    }

    function closeNewSupplierModal() {
        document.querySelector('#newSupplierModal').style.display = 'none';
    }

    async function submitNewSupplier() {
        const non = document.querySelector('#suppNon').value.trim();
        const telefòn = document.querySelector('#suppTelefòn').value.trim();
        const adrès = document.querySelector('#suppAdrès').value.trim();

        if (!non) return showError('newSupplierError', 'Non founisè a obligatwa.');

        const btn = document.querySelector('#suppSubmitBtn');
        btn.disabled = true;
        try {
            await window.SuppliersService.createSupplier({ non, telefòn, adrès });
            closeNewSupplierModal();
            await chajeFounise();
        } catch (e) {
            showError('newSupplierError', e.message);
        } finally {
            btn.disabled = false;
        }
    }

    // ---------- MODAL: NOUVO ACHA ----------

    function remliSelectFounise() {
        const sel = document.querySelector('#achatFounisèSelect');
        if (!sel) return;
        const valèAvan = sel.value;
        sel.innerHTML = `<option value="">— Chwazi founisè —</option>` +
            founiseCache.map(f => `<option value="${f.id}">${escHtml(f.non)}</option>`).join('');
        sel.value = valèAvan;
    }

    function remliSelectPwodwi() {
        const sel = document.querySelector('#achatPwodwiSelect');
        if (!sel) return;
        const valèAvan = sel.value;
        sel.innerHTML = `<option value="">— Chwazi pwodwi —</option>` +
            pwodwiCache.map(p => `<option value="${p.id}">${escHtml(p.non)}</option>`).join('');
        sel.value = valèAvan;
    }

    function openNewPurchaseModal() {
        panye = [];
        rannPanye();
        document.querySelector('#achatFounisèSelect').value = '';
        document.querySelector('#achatPwodwiSelect').value = '';
        document.querySelector('#achatKantite').value = 1;
        document.querySelector('#achatPriInite').value = 0;
        document.querySelector('#achatRabaisPousantaj').value = 0;
        document.querySelector('#achatFraisAccessoires').value = 0;
        document.querySelector('#achatMòdPeman').value = 'kach';
        hideError('newPurchaseError');
        document.querySelector('#newPurchaseModal').style.display = 'flex';
    }

    function closeNewPurchaseModal() {
        document.querySelector('#newPurchaseModal').style.display = 'none';
    }

    function addItemToPurchaseCart() {
        const pwodwiId = document.querySelector('#achatPwodwiSelect').value;
        const kantite = Number(document.querySelector('#achatKantite').value);
        const priInite = Number(document.querySelector('#achatPriInite').value);
        const rabaisPousantaj = Number(document.querySelector('#achatRabaisPousantaj').value) || 0;

        if (!pwodwiId) return showError('newPurchaseError', 'Chwazi yon pwodwi.');
        if (!kantite || kantite <= 0) return showError('newPurchaseError', 'Kantite dwe pi gran pase 0.');
        if (priInite < 0) return showError('newPurchaseError', 'Pri inite pa ka negatif.');

        const pwodwi = pwodwiCache.find(p => p.id === pwodwiId);
        panye.push({
            pwodwiId,
            non: pwodwi ? pwodwi.non : 'Pwodwi',
            kantite, priInite, rabaisPousantaj
        });

        hideError('newPurchaseError');
        rannPanye();

        document.querySelector('#achatPwodwiSelect').value = '';
        document.querySelector('#achatKantite').value = 1;
        document.querySelector('#achatPriInite').value = 0;
        document.querySelector('#achatRabaisPousantaj').value = 0;
    }

    function retireItemFromCart(index) {
        panye.splice(index, 1);
        rannPanye();
    }

    function rannPanye() {
        const kontenè = document.querySelector('#achatPanyeList');
        const totalEl = document.querySelector('#achatPanyeTotal');
        if (!kontenè || !totalEl) return;

        if (panye.length === 0) {
            kontenè.innerHTML = `<p style="color:var(--text-muted);">Panye a vid</p>`;
            totalEl.textContent = '0';
            return;
        }

        let total = 0;
        kontenè.innerHTML = panye.map((a, i) => {
            const brut = a.kantite * a.priInite;
            const netLiy = brut * (1 - a.rabaisPousantaj / 100);
            total += netLiy;
            return `<div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid #F1F5F9;">
                <span>${escHtml(a.non)} — ${a.kantite} × ${fmtHTG(a.priInite)}${a.rabaisPousantaj > 0 ? ` (−${a.rabaisPousantaj}%)` : ''}</span>
                <span style="display:flex; align-items:center; gap:8px;">
                    <strong>${fmtHTG(netLiy)}</strong>
                    <span onclick="OperationsUI.retireItemFromCart(${i})" style="cursor:pointer; color:var(--danger);">✕</span>
                </span>
            </div>`;
        }).join('');

        const fraisAccessoires = Number(document.querySelector('#achatFraisAccessoires')?.value) || 0;
        totalEl.textContent = (total + fraisAccessoires).toLocaleString('fr-HT');
    }

    // Aktyalize total panye a lè moun chanje frè akseswa
    document.addEventListener('input', (e) => {
        if (e.target && e.target.id === 'achatFraisAccessoires') rannPanye();
    });

    async function submitNewPurchase() {
        const founiseId = document.querySelector('#achatFounisèSelect').value;
        const mòdPeman = document.querySelector('#achatMòdPeman').value;
        const fraisAccessoires = Number(document.querySelector('#achatFraisAccessoires').value) || 0;

        if (!founiseId) return showError('newPurchaseError', 'Chwazi yon founisè.');
        if (panye.length === 0) return showError('newPurchaseError', 'Ajoute omwen yon atik nan panye a.');

        const founise = founiseCache.find(f => f.id === founiseId);
        const btn = document.querySelector('#achatSubmitBtn');
        btn.disabled = true;

        try {
            await window.PurchasesService.createPurchase({
                founiseId,
                founiseNon: founise ? founise.non : undefined,
                mòdPeman,
                fraisAccessoires,
                atik: panye
            });
            closeNewPurchaseModal();
            await Promise.all([chajeAcha(), chajePwodwi(), chajeFounise()]);
        } catch (e) {
            showError('newPurchaseError', e.message);
        } finally {
            btn.disabled = false;
        }
    }

    // ---------- AJISTMAN STOCK MANYÈL (4.2) ----------
    // NÒT: itilize prompt() pou rete kongriyan ak modèl admin_ui.js
    // (ajouteDepatman/ajoutePos sèvi menm apwòch la pou aksyon rapid).

    async function ajusteStockManyèl() {
        if (pwodwiCache.length === 0) {
            return alert('Pa gen pwodwi chaje ankò. Tann yon ti moman epi reesaye.');
        }
        const lisOptions = pwodwiCache.map(p => `${p.id} = ${p.non} (stock aktyèl: ${p.kantiteStock || 0})`).join('\n');
        const pwodwiId = prompt(`ID pwodwi pou ajiste:\n${lisOptions}`);
        if (!pwodwiId) return;
        if (!pwodwiCache.find(p => p.id === pwodwiId)) {
            return alert('ID pwodwi sa a pa nan lis la.');
        }

        const kantiteChanjmanStr = prompt('Chanjman kantite (pozitif pou antre, negatif pou sòti). Egzanp: 10 oswa -5');
        if (!kantiteChanjmanStr) return;
        const kantiteChanjman = Number(kantiteChanjmanStr);
        if (!kantiteChanjman || isNaN(kantiteChanjman)) {
            return alert('Kantite pa valid.');
        }

        const rezon = prompt('Rezon ajistman an (obligatwa): "Enventè Fizik", "Domaje", "Resepsyon", elt.');
        if (!rezon || !rezon.trim()) return alert('Rezon obligatwa.');

        try {
            const rezilta = await window.ProductsService.adjustStock(pwodwiId, kantiteChanjman, rezon.trim());
            alert(`Stock ajiste: ${rezilta.stockAvan} → ${rezilta.stockApre}`);
            await chajePwodwi();
        } catch (e) {
            alert('Erè: ' + e.message);
        }
    }

    // ---------- 📸 SNAPSHOT STOCK (pou grafik Évolution Stock) ----------
    // NÒT: yon dokiman pa jou (id = "YYYY-MM-DD"), pou moun ka klike plizyè fwa
    // menm jou a san kreye dubl — dènye klik la ranplase (merge) valè jou a.

    function getBizRef() {
        if (!window.currentCompanyId) throw new Error("Pa gen biznis aktif chwazi.");
        return window.db.collection('biznis').doc(window.currentCompanyId);
    }

    function dateKeyJodi() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    async function sovSnapshotStock() {
        try {
            const lis = pwodwiCache.length > 0 ? pwodwiCache : await window.ProductsService.getProducts(true);
            const stockTotal = lis.reduce((s, p) => s + (p.kantiteStock || 0), 0);
            const valèEnvantè = lis.reduce((s, p) => s + (p.kantiteStock || 0) * (p.priAchat || 0), 0);

            const bizRef = getBizRef();
            const docId = dateKeyJodi();
            await bizRef.collection('stock_istorik').doc(docId).set({
                dat: docId,
                stockTotal,
                valèEnvantè,
                dateKreyasyon: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            alert(`Snapshot sove pou ${docId}: ${stockTotal.toLocaleString('fr-HT')} inite, ${fmtHTG(valèEnvantè)}.`);
            await rannGrafikEvolutionStock();
        } catch (e) {
            alert('Erè: ' + e.message);
        }
    }

    async function rannGrafikEvolutionStock() {
        const canvas = document.getElementById('stockChartEvolution');
        if (!canvas || typeof Chart === 'undefined') return;

        try {
            const bizRef = getBizRef();
            const snapshot = await bizRef.collection('stock_istorik')
                .orderBy('dat', 'asc').limitToLast(30).get();

            if (snapshot.empty) {
                // Pa gen istorik ankò — kite kanvas la vid ak yon mesaj
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#94A3B8';
                ctx.font = '13px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('Klike "📸 Sove Snapshot Jodi a" pou kòmanse istorik la', canvas.width / 2, canvas.height / 2);
                return;
            }

            const done = snapshot.docs.map(d => d.data());

            if (chartStockEvolution) chartStockEvolution.destroy();
            chartStockEvolution = new Chart(canvas, {
                type: 'line',
                data: {
                    labels: done.map(d => d.dat),
                    datasets: [{
                        label: 'Stock Total',
                        data: done.map(d => d.stockTotal),
                        borderColor: '#6366F1',
                        backgroundColor: 'rgba(99,102,241,0.1)',
                        fill: true, tension: 0.3
                    }]
                },
                options: { responsive: true, plugins: { legend: { display: false } } }
            });
        } catch (e) {
            console.warn('OperationsUI: rannGrafikEvolutionStock echwe', e);
        }
    }

    // ---------- GRAFIK (4.5/4.6/4.1) — Chart.js ----------

    let chartStockEvolution, chartAchats, chartTopProduits, chartCategories;

    async function rannGrafikAchatsMensuels() {
        const canvas = document.getElementById('purchasesChart');
        if (!canvas || typeof Chart === 'undefined') return;

        const acha = await window.PurchasesService.getPurchases(200);
        const parMwa = {};
        acha.filter(a => a.estati !== 'anile' && a.dat?.toDate).forEach(a => {
            const d = a.dat.toDate();
            const kle = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            parMwa[kle] = (parMwa[kle] || 0) + (a.total || 0);
        });
        const kleTriye = Object.keys(parMwa).sort().slice(-6);

        if (chartAchats) chartAchats.destroy();
        chartAchats = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: kleTriye,
                datasets: [{ label: 'Achats (HTG)', data: kleTriye.map(k => parMwa[k]), backgroundColor: '#6366F1' }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });
    }

    async function rannGrafikTopProduits() {
        const canvas = document.getElementById('topProductsChart');
        if (!canvas || typeof Chart === 'undefined') return;
        if (!window.SalesService) return;

        const vant = await window.SalesService.getSales(300);
        const parPwodwi = {};
        vant.filter(v => v.estati !== 'anile').forEach(v => {
            (v.atik || []).forEach(a => {
                parPwodwi[a.non] = (parPwodwi[a.non] || 0) + (a.kantite || 0);
            });
        });
        const top5 = Object.entries(parPwodwi).sort((a, b) => b[1] - a[1]).slice(0, 5);

        if (chartTopProduits) chartTopProduits.destroy();
        chartTopProduits = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: top5.map(t => t[0]),
                datasets: [{ label: 'Kantite Vann', data: top5.map(t => t[1]), backgroundColor: '#10B981' }]
            },
            options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } } }
        });
    }

    function rannGrafikCategories() {
        const canvas = document.getElementById('categoryDistributionChart');
        if (!canvas || typeof Chart === 'undefined') return;

        const parKategori = {};
        pwodwiCache.forEach(p => {
            const kat = p.kategori || 'Divès';
            parKategori[kat] = (parKategori[kat] || 0) + 1;
        });

        if (chartCategories) chartCategories.destroy();
        chartCategories = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: Object.keys(parKategori),
                datasets: [{ data: Object.values(parKategori), backgroundColor: ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'] }]
            },
            options: { responsive: true }
        });
    }

    async function rannTouGrafik() {
        try {
            await Promise.all([
                rannGrafikAchatsMensuels(),
                rannGrafikTopProduits(),
                rannGrafikEvolutionStock()
            ]);
            rannGrafikCategories();
        } catch (e) {
            console.warn('OperationsUI: rann grafik echwe', e);
        }
    }

    // ---------- INISYALIZASYON ----------
    // NÒT: rele lè moun klike nan navigasyon (data-target="operations"),
    // menm konvansyon ak VentesUI.loadAllVentesSections() — verifye sidebar.html
    // gen listener ki rele OperationsUI.loadAllOperationsSections().

    async function loadAllOperationsSections() {
        if (!window.currentCompanyId) {
            console.warn('operations_ui.js: pa gen biznis aktif chwazi');
            return;
        }
        await Promise.all([chajePwodwi(), chajeFounise(), chajeAcha()]);
        await rannTouGrafik();
    }

    window.OperationsUI = {
        loadAllOperationsSections,
        openNewSupplierModal, closeNewSupplierModal, submitNewSupplier,
        openNewPurchaseModal, closeNewPurchaseModal,
        addItemToPurchaseCart, submitNewPurchase, retireItemFromCart,
        ajusteStockManyèl, sovSnapshotStock
    };
})();
