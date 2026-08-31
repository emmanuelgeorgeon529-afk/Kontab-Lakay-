// js/modules/ecommerce_ui.js
// UI Modil 13 — E-Commerce & Omnicanal Commerce.
// Depann de window.BiService, window.SalesService, window.CommandesService,
// window.ProductsService, window.BonLivrezonSevis, window.PromotionsService,
// window.MarketingService, window.CustomerAuthService, window.EcomSyncService,
// window.ModalService, window.currentCompanyId, window.escHtml
//
// NÒT: init() rele chak fwa navigate() antre nan seksyon 'ecommerce' (gade
// chajmanPaSeksyon nan app.js). Pou evite double-atachman addEventListener
// sou vizit repete, _atacheListenerYo() rele YON SÈL FWA (gad _initye),
// men done yo (chajeDashboard, chajeKatalòg, elt.) rechaje chak fwa.

const EcommerceUI = (() => {

    let _initye = false;
    let chartChanèl = null;
    let periodeAktyèl = '30j';

    const CHANÈL_LABEL = {
        magazen: 'Magazen', web: 'Sit Web', whatsapp: 'WhatsApp',
        facebook: 'Facebook', marketplace: 'Marketplace'
    };
    const CHANÈL_KOULÈ = {
        magazen: '#94A3B8', web: '#6366F1', whatsapp: '#22C55E',
        facebook: '#3B82F6', marketplace: '#F59E0B'
    };

    function fmtHTG(n) { return (n || 0).toLocaleString('fr-HT') + ' HTG'; }

    function fmtChg(pousantaj) {
        if (pousantaj === null || pousantaj === undefined) return '';
        const koulè = pousantaj >= 0 ? '#047857' : '#DC2626';
        const siy = pousantaj >= 0 ? '+' : '';
        return `<span style="color:${koulè};">${siy}${pousantaj}% vs peryòd anvan</span>`;
    }

    // ================= 13.1 DASHBOARD =================

    async function chajeDashboard(periode) {
        periodeAktyèl = periode;

        document.querySelectorAll('.ecom-periode-btn').forEach(btn => {
            const aktif = btn.dataset.periode === periode;
            btn.classList.toggle('active', aktif);
            btn.style.background = aktif ? 'var(--primary)' : 'var(--bg-white)';
            btn.style.color = aktif ? 'white' : 'var(--text-dark)';
        });

        let stats;
        try {
            stats = await window.BiService.getEcommerceStats(periode);
        } catch (e) {
            console.error('Erè chajman estatistik e-commerce:', e);
            return;
        }

        document.getElementById('ecomKpiKòmand').textContent = stats.kòmandOnlineKantite;
        document.getElementById('ecomKpiKòmandChg').innerHTML = fmtChg(stats.kòmandOnlineChanjman);
        document.getElementById('ecomKpiRevni').textContent = fmtHTG(stats.revniOnline);
        document.getElementById('ecomKpiRevniChg').innerHTML = fmtChg(stats.revniOnlineChanjman);
        document.getElementById('ecomKpiOmnicanal').textContent = fmtHTG(stats.lavantOmnicanal);
        document.getElementById('ecomKpiKliyan').textContent = stats.kliyanOnline;
        document.getElementById('ecomKpiPwodwi').textContent = stats.pwodwiAktif;
        document.getElementById('ecomKpiLivrezon').textContent = stats.livrezonAnKou;
        document.getElementById('ecomKpiKonvèsyon').textContent = stats.toKonvèsyon !== null ? stats.toKonvèsyon + '%' : '—';
        document.getElementById('ecomKpiWhatsapp').textContent = fmtHTG(stats.lavantParChanèl.whatsapp || 0);

        renderChartChanèl(stats.lavantParChanèl);
        await renderKòmandPaJou();
        await renderTopPwodwi();
        renderOmnicanalTable(stats);
        renderAnalytics(periode);
    }

    function renderChartChanèl(lavantParChanèl) {
        const canvas = document.getElementById('ecomChannelChart');
        if (!canvas || !window.Chart) return;

        const entries = Object.entries(lavantParChanèl).filter(([_, v]) => v > 0);
        if (chartChanèl) chartChanèl.destroy();

        if (entries.length === 0) {
            canvas.style.display = 'none';
            return;
        }
        canvas.style.display = 'block';

        chartChanèl = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: entries.map(([k]) => CHANÈL_LABEL[k] || k),
                datasets: [{
                    data: entries.map(([_, v]) => v),
                    backgroundColor: entries.map(([k]) => CHANÈL_KOULÈ[k] || '#CBD5E1')
                }]
            },
            options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
        });
    }

    async function renderKòmandPaJou() {
        const canvas = document.getElementById('ecomOrdersDailyChart');
        const empty = document.getElementById('ecomOrdersDailyEmpty');
        if (!canvas) return;

        const kòmand = toutKòmandKache.length ? toutKòmandKache : await window.CommandesService.getOrders(500);
        const jodiA = new Date(); jodiA.setHours(0, 0, 0, 0);

        const labels = [];
        const valè = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(jodiA.getTime() - i * 24 * 60 * 60 * 1000);
            const dSuivan = new Date(d.getTime() + 24 * 60 * 60 * 1000);
            const kont = kòmand.filter(c => {
                const dat = c.dat?.toDate ? c.dat.toDate() : null;
                return dat && dat >= d && dat < dSuivan;
            }).length;
            labels.push(d.toLocaleDateString('fr-HT', { weekday: 'short' }));
            valè.push(kont);
        }

        const genDone = valè.some(v => v > 0);
        if (!genDone) {
            canvas.style.display = 'none';
            if (empty) empty.style.display = 'flex';
            return;
        }
        canvas.style.display = 'block';
        if (empty) empty.style.display = 'none';

        if (window._ecomOrdersDailyChartInstance) window._ecomOrdersDailyChartInstance.destroy();
        window._ecomOrdersDailyChartInstance = new Chart(canvas, {
            type: 'bar',
            data: { labels, datasets: [{ label: 'Kòmand', data: valè, backgroundColor: '#6366F1' }] },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });
    }

    async function renderTopPwodwi() {
        const canvas = document.getElementById('ecomTopProductsChart');
        const empty = document.getElementById('ecomTopProductsEmpty');
        if (!canvas) return;

        const [sales, produits] = await Promise.all([
            window.SalesService.getSales(1000),
            window.ProductsService.getProducts(true)
        ]);

        const kantiteParPwodwi = {};
        sales.filter(s => s.estati !== 'anile').forEach(s => {
            (s.atik || []).forEach(a => {
                kantiteParPwodwi[a.pwodwiId] = (kantiteParPwodwi[a.pwodwiId] || 0) + (a.kantite || 0);
            });
        });

        const top3 = Object.entries(kantiteParPwodwi)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([pwodwiId, kantite]) => {
                const p = produits.find(pp => pp.id === pwodwiId);
                return { non: p ? p.non : 'Pwodwi Efase', kantite };
            });

        if (top3.length === 0) {
            canvas.style.display = 'none';
            if (empty) empty.style.display = 'flex';
            return;
        }
        canvas.style.display = 'block';
        if (empty) empty.style.display = 'none';

        if (window._ecomTopProductsChartInstance) window._ecomTopProductsChartInstance.destroy();
        window._ecomTopProductsChartInstance = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: top3.map(p => p.non),
                datasets: [{ label: 'Kantite Vandi', data: top3.map(p => p.kantite), backgroundColor: '#22C55E' }]
            },
            options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } } }
        });
    }

    // ================= 13.2 BOUTIK / PANYE / CHECKOUT =================

    let toutPwodwiBoutik = [];
    let panyeKliyan = JSON.parse(localStorage.getItem('kontablakay_panye') || '[]');

    function sovgadPanye() {
        localStorage.setItem('kontablakay_panye', JSON.stringify(panyeKliyan));
    }

    async function chajeBoutik() {
        const bizRef = window.db.collection('biznis').doc(window.currentCompanyId);
        const snapshot = await bizRef.collection('pwodwi')
            .where('aktif', '==', true)
            .where('vizib_ecommerce', '==', true)
            .get();
        toutPwodwiBoutik = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        renderBoutikGrid();
        renderPanye();
    }

    function renderBoutikGrid() {
        const rechèch = (document.getElementById('ecomBoutikSearch')?.value || '').toLowerCase().trim();
        const filtre = toutPwodwiBoutik.filter(p => !rechèch || p.non.toLowerCase().includes(rechèch));
        const grid = document.getElementById('ecomBoutikGrid');
        if (!grid) return;

        if (filtre.length === 0) {
            grid.innerHTML = '<p style="color:var(--text-muted); font-size:13px;">Pa gen pwodwi disponib kounye a.</p>';
            return;
        }

        grid.innerHTML = filtre.map(p => {
            const pri = p.pri_ecommerce || p.priVente || 0;
            const disponib = (p.kantiteStock || 0) > 0;
            return `
                <div style="border:1px solid #E2E8F0; border-radius:12px; padding:10px; text-align:center;">
                    <div style="width:100%; aspect-ratio:1; background:#F1F5F9; border-radius:8px; margin-bottom:8px; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                        ${p.imageUrl ? `<img src="${escHtml(p.imageUrl)}" style="width:100%; height:100%; object-fit:cover;">` : '<span style="font-size:24px;">📦</span>'}
                    </div>
                    <p style="font-size:12px; font-weight:600; margin-bottom:4px;">${escHtml(p.non)}</p>
                    <p style="font-size:13px; color:var(--primary); margin-bottom:8px;">${pri.toLocaleString('fr-HT')} HTG</p>
                    <button class="ecom-add-panye" data-id="${p.id}" ${disponib ? '' : 'disabled'} style="width:100%; padding:6px; border-radius:6px; border:none; background:${disponib ? 'var(--primary)' : '#CBD5E1'}; color:white; font-size:12px;">${disponib ? 'Ajoute' : 'Ripti'}</button>
                </div>
            `;
        }).join('');

        grid.querySelectorAll('.ecom-add-panye').forEach(btn => {
            btn.addEventListener('click', () => ajoutePanye(btn.dataset.id));
        });
    }

    function ajoutePanye(pwodwiId) {
        const p = toutPwodwiBoutik.find(pp => pp.id === pwodwiId);
        if (!p) return;
        const existan = panyeKliyan.find(a => a.pwodwiId === pwodwiId);
        if (existan) {
            existan.kantite++;
        } else {
            panyeKliyan.push({
                pwodwiId, non: p.non,
                priInite: p.pri_ecommerce || p.priVente || 0,
                kantite: 1
            });
        }
        sovgadPanye();
        renderPanye();
    }

    function retirePanye(pwodwiId) {
        panyeKliyan = panyeKliyan.filter(a => a.pwodwiId !== pwodwiId);
        sovgadPanye();
        renderPanye();
    }

    function renderPanye() {
        const konteneur = document.getElementById('ecomPanyeListe');
        const totalEl = document.getElementById('ecomPanyeTotal');
        const btnCheckout = document.getElementById('ecomBtnCheckout');
        if (!konteneur) return;

        if (panyeKliyan.length === 0) {
            konteneur.innerHTML = '<p style="color:var(--text-muted); font-size:13px;">Panye vid.</p>';
            if (totalEl) totalEl.textContent = '0 HTG';
            if (btnCheckout) btnCheckout.disabled = true;
            return;
        }

        konteneur.innerHTML = panyeKliyan.map(a => `
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; margin-bottom:6px;">
                <span>${escHtml(a.non)} × ${a.kantite}</span>
                <button data-id="${a.pwodwiId}" class="ecom-retire-panye" style="background:none; border:none; color:#DC2626; cursor:pointer;">✕</button>
            </div>
        `).join('');

        const total = panyeKliyan.reduce((s, a) => s + a.kantite * a.priInite, 0);
        if (totalEl) totalEl.textContent = total.toLocaleString('fr-HT') + ' HTG';
        if (btnCheckout) btnCheckout.disabled = false;

        konteneur.querySelectorAll('.ecom-retire-panye').forEach(btn => {
            btn.addEventListener('click', () => retirePanye(btn.dataset.id));
        });
    }

    async function checkout() {
        if (!kliyanKonekteAktyèl) {
            alert('Ou dwe konekte (13.9) anvan w kòmande.');
            return;
        }
        if (panyeKliyan.length === 0) return;

        try {
            await window.CommandesService.createOrder({
                kliyanId: kliyanKonekteAktyèl.id,
                kliyanNon: kliyanKonekteAktyèl.non,
                kliyanAuthUid: kliyanKonekteAktyèl.authUid,
                atik: panyeKliyan,
                adrèsLivrezon: kliyanKonekteAktyèl.adrès || '',
                canal: 'web'
            });
            panyeKliyan = [];
            sovgadPanye();
            renderPanye();
            alert('Kòmand ou kreye — n ap kontakte w pou konfime.');
            await renderPòtayKonekte();
        } catch (e) {
            alert('Erè: ' + e.message);
        }
    }

    // ================= 13.3 KATALÒG PWODWI =================

    let toutPwodwiKache = [];
    let pajCatalogAktyèl = 1;
    const KATALOG_PA_PAJ = 10;

    function badgeStock(p) {
        const stock = p.kantiteStock || 0;
        const minimum = p.stockMinimum || 5;
        if (stock === 0) return '<span class="ged-status" style="background:#FEE2E2; color:#DC2626;">🔴 Ripti</span>';
        if (stock <= minimum) return '<span class="ged-status" style="background:#FEF3C7; color:#B45309;">⚠️ Stock Fèb</span>';
        return '<span class="ged-status" style="background:#D1FAE5; color:#047857;">🟢 Disponib</span>';
    }

    async function chajeKatalòg() {
        toutPwodwiKache = await window.ProductsService.getProducts(true);

        const kategoriUnik = [...new Set(toutPwodwiKache.map(p => p.kategori).filter(Boolean))];
        const selectKategori = document.getElementById('ecomCatKategori');
        if (selectKategori && selectKategori.children.length <= 1) {
            kategoriUnik.forEach(k => {
                const opt = document.createElement('option');
                opt.value = k; opt.textContent = k;
                selectKategori.appendChild(opt);
            });
        }

        renderKatalòg();
    }

    function renderKatalòg() {
        const rechèch = (document.getElementById('ecomCatSearch')?.value || '').toLowerCase().trim();
        const kategori = document.getElementById('ecomCatKategori')?.value || '';
        const tri = document.getElementById('ecomCatTri')?.value || 'non_asc';

        let filtre = toutPwodwiKache.filter(p => {
            const matchRechèch = !rechèch ||
                p.non.toLowerCase().includes(rechèch) ||
                (p.sku || '').toLowerCase().includes(rechèch);
            const matchKategori = !kategori || p.kategori === kategori;
            return matchRechèch && matchKategori;
        });

        filtre.sort((a, b) => {
            if (tri === 'non_asc') return a.non.localeCompare(b.non);
            if (tri === 'pri_asc') return (a.priVente || 0) - (b.priVente || 0);
            if (tri === 'pri_desc') return (b.priVente || 0) - (a.priVente || 0);
            if (tri === 'stock_asc') return (a.kantiteStock || 0) - (b.kantiteStock || 0);
            return 0;
        });

        const totalPaj = Math.max(1, Math.ceil(filtre.length / KATALOG_PA_PAJ));
        if (pajCatalogAktyèl > totalPaj) pajCatalogAktyèl = totalPaj;
        const depi = (pajCatalogAktyèl - 1) * KATALOG_PA_PAJ;
        const paDeAfiche = filtre.slice(depi, depi + KATALOG_PA_PAJ);

        const conteneur = document.getElementById('ecomCatListe');
        if (!conteneur) return;

        if (paDeAfiche.length === 0) {
            conteneur.innerHTML = '<p style="color:var(--text-muted); font-size:13px; text-align:center; padding:20px;">Pa gen pwodwi ki matche rechèch la.</p>';
            const pag = document.getElementById('ecomCatPagination');
            if (pag) pag.innerHTML = '';
            return;
        }

        conteneur.innerHTML = `
            <table class="fin-table">
                <tr><th>SKU</th><th>Non Pwodwi</th><th>Kategori</th><th>Pri</th><th>Stock</th><th>Estati</th><th></th></tr>
                ${paDeAfiche.map(p => `
                    <tr>
                        <td>${escHtml(p.sku || '—')}</td>
                        <td>${escHtml(p.non)}</td>
                        <td>${escHtml(p.kategori || '—')}</td>
                        <td style="text-align:right;">${(p.priVente || 0).toLocaleString('fr-HT')} HTG</td>
                        <td style="text-align:right;">${p.kantiteStock || 0}</td>
                        <td>${badgeStock(p)}</td>
                        <td><button class="ecom-cat-edit" data-id="${p.id}" style="background:none; border:1px solid #E2E8F0; border-radius:6px; padding:4px 8px; font-size:12px; cursor:pointer;">✏️</button></td>
                    </tr>
                `).join('')}
            </table>
        `;

        conteneur.querySelectorAll('.ecom-cat-edit').forEach(btn => {
            btn.addEventListener('click', () => ouvriModalEdisyonPwodwi(btn.dataset.id));
        });

        const pagination = document.getElementById('ecomCatPagination');
        if (pagination) {
            let html = '';
            for (let i = 1; i <= totalPaj; i++) {
                const aktif = i === pajCatalogAktyèl;
                html += `<button class="ecom-cat-paj" data-paj="${i}" style="padding:6px 12px; border-radius:6px; border:1px solid ${aktif ? 'var(--primary)' : '#E2E8F0'}; background:${aktif ? 'var(--primary)' : 'white'}; color:${aktif ? 'white' : 'var(--text-dark)'}; font-size:12px; cursor:pointer;">${i}</button>`;
            }
            pagination.innerHTML = html;
            pagination.querySelectorAll('.ecom-cat-paj').forEach(btn => {
                btn.addEventListener('click', () => { pajCatalogAktyèl = parseInt(btn.dataset.paj); renderKatalòg(); });
            });
        }
    }

    function ouvriModalEdisyonPwodwi(productId) {
        const p = toutPwodwiKache.find(pp => pp.id === productId);
        if (!p) return;

        window.ModalService.open({
            title: 'Modifye Pwodwi',
            bodyHtml: `
                <div style="display:flex; flex-direction:column; gap:10px;">
                    <label>Non<input type="text" id="edPwodwiNon" value="${escHtml(p.non)}" style="width:100%; padding:8px; border:1px solid #E2E8F0; border-radius:6px;"></label>
                    <label>Pri Vann<input type="number" id="edPwodwiPri" value="${p.priVente || 0}" style="width:100%; padding:8px; border:1px solid #E2E8F0; border-radius:6px;"></label>
                    <label>Stock Minimum<input type="number" id="edPwodwiStockMin" value="${p.stockMinimum || 5}" style="width:100%; padding:8px; border:1px solid #E2E8F0; border-radius:6px;"></label>
                </div>
            `,
            footerHtml: `<button onclick="EcommerceUI._sovgadPwodwi('${p.id}')" style="background:var(--primary); color:white; border:none; padding:8px 16px; border-radius:8px;">Sovgade</button>`
        });
    }

    async function sovgadPwodwi(productId) {
        try {
            await window.ProductsService.updateProduct(productId, {
                non: document.getElementById('edPwodwiNon').value.trim(),
                priVente: parseFloat(document.getElementById('edPwodwiPri').value),
                stockMinimum: parseInt(document.getElementById('edPwodwiStockMin').value)
            });
            window.ModalService.close();
            await chajeKatalòg();
        } catch (e) {
            window.ModalService.showError(e.message);
        }
    }

    // ================= 13.4 JESYON KÒMAND + 13.10 LIVREZON =================

    let toutKòmandKache = [
