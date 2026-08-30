// js/modules/actifs_ui.js
// Konekte seksyon "Actifs & Maintenance" (7.1-7.6) ak AssetsService,
// MaintenanceService, epi li VeyikilSevis/ChofeSevis pou Flotte (7.5,
// vi lekti sèl — jesyon CRUD veyikil/chofè fèt nan Modil 5, Logistique).

(function () {
    let byenCache = [];
    let chartActifValue, chartMaintenanceCost, chartAssetCategory;

    function escHtml(str) {
        const d = document.createElement('div');
        d.textContent = String(str ?? '');
        return d.innerHTML;
    }
    function fmtHTG(n) { return Math.round(n || 0).toLocaleString('fr-HT') + ' HTG'; }
    function setText(id, txt) { const el = document.getElementById(id); if (el) el.textContent = txt; }

    // ================= DASHBOARD MODIL 7 =================

    async function rannDashboardActifs() {
        try {
            const [amortSummary, veyikilYo] = await Promise.all([
                window.AssetsService.getAmortissementSummary(),
                window.VeyikilSevis?.jwennTouVeyikil(true) ?? Promise.resolve([])
            ]);

            setText('kpiActifsValèTotal', fmtHTG(amortSummary.priTotal));
            setText('kpiActifsAmortAkimile', fmtHTG(amortSummary.amortismanTotal));
            setText('kpiActifsValèNette', fmtHTG(amortSummary.valèNetteTotal));

            const ekipman = amortSummary.detay.filter(b => b.aktif).length;
            setText('kpiActifsEkipman', ekipman);
            setText('kpiActifsMachin', veyikilYo.length);

            const plans = await window.MaintenanceService.getPlansPreventifs();
            const pwograme = plans.filter(p => p.estatiKalkile === 'pwograme').length;
            const anReta = plans.filter(p => p.estatiKalkile === 'anreta').length;
            setText('kpiActifsAntretyenPwograme', pwograme);
            setText('kpiActifsAntretyenReta', anReta);

            const jodiA = new Date();
            const kòmansmanAne = new Date(jodiA.getFullYear(), 0, 1);
            const tickets = await window.MaintenanceService.getTicketsCorrectifs(500);
            const depansAntretyenAne = tickets
                .filter(t => t.estati === 'fèmen' && t.dateFèmti?.toDate && t.dateFèmti.toDate() >= kòmansmanAne)
                .reduce((s, t) => s + (t.kout || 0), 0);
            setText('kpiActifsDepansAntretyenAne', fmtHTG(depansAntretyenAne));
        } catch (e) {
            console.warn('ActifsUI: rannDashboardActifs echwe', e);
        }
    }

    async function rannGrafikActifs() {
        if (typeof Chart === 'undefined') return;
        const amortSummary = await window.AssetsService.getAmortissementSummary();

        // Repartisyon pa kategori
        const canvasCat = document.getElementById('assetCategoryChart');
        if (canvasCat) {
            const parKategori = {};
            amortSummary.detay.forEach(b => {
                parKategori[b.kategori] = (parKategori[b.kategori] || 0) + b.priAcha;
            });
            if (chartAssetCategory) chartAssetCategory.destroy();
            chartAssetCategory = new Chart(canvasCat, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(parKategori),
                    datasets: [{ data: Object.values(parKategori), backgroundColor: ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'] }]
                },
                options: { responsive: true }
            });
        }

        // Depans antretyen pa mwa (6 dènye mwa)
        const canvasCost = document.getElementById('maintenanceCostChart');
        if (canvasCost) {
            const tickets = await window.MaintenanceService.getTicketsCorrectifs(500);
            const kle = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const parMwa = {};
            tickets.filter(t => t.estati === 'fèmen' && t.dateFèmti?.toDate).forEach(t => {
                const k = kle(t.dateFèmti.toDate());
                parMwa[k] = (parMwa[k] || 0) + (t.kout || 0);
            });
            const jodiA = new Date();
            const labels = [];
            for (let i = 5; i >= 0; i--) {
                const d = new Date(jodiA.getFullYear(), jodiA.getMonth() - i, 1);
                labels.push(kle(d));
            }
            if (chartMaintenanceCost) chartMaintenanceCost.destroy();
            chartMaintenanceCost = new Chart(canvasCost, {
                type: 'bar',
                data: { labels, datasets: [{ label: 'Depans Antretyen (HTG)', data: labels.map(k => parMwa[k] || 0), backgroundColor: '#F59E0B', borderRadius: 4 }] },
                options: { responsive: true, plugins: { legend: { display: false } } }
            });
        }

        // Evolisyon valè byen (Valè Nèt total, apwoksimasyon lineyè sou 6 dènye mwa)
        const canvasVal = document.getElementById('actifValueChart');
        if (canvasVal) {
            const jodiA = new Date();
            const labels = [], valè = [];
            for (let i = 5; i >= 0; i--) {
                const d = new Date(jodiA.getFullYear(), jodiA.getMonth() - i, 1);
                labels.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                let vNette = 0;
                amortSummary.detay.forEach(b => { vNette += window.AssetsService.calculAmortissement(b, d).valèNette; });
                valè.push(Math.round(vNette));
            }
            if (chartActifValue) chartActifValue.destroy();
            chartActifValue = new Chart(canvasVal, {
                type: 'line',
                data: { labels, datasets: [{ label: 'Valè Nèt (HTG)', data: valè, borderColor: '#4F46E5', backgroundColor: 'rgba(79,70,229,0.1)', fill: true, tension: 0.3 }] },
                options: { responsive: true, plugins: { legend: { display: false } } }
            });
        }
    }

    // ================= 7.1 REGISTRE IMMOBILISATIONS =================

    async function chajeRegistre() {
        byenCache = await window.AssetsService.getRegistre(true);
        rannTabloRegistre();
        remliSelectByen();
    }

    function rannTabloRegistre() {
        const tbody = document.querySelector('#registreImmobTableBody');
        if (!tbody) return;
        if (byenCache.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">Pa gen byen ankò</td></tr>`;
            return;
        }
        tbody.innerHTML = byenCache.map(b => `
            <tr>
                <td>${escHtml(b.nimewoByen)}</td>
                <td>${escHtml(b.non)}</td>
                <td>${escHtml(b.kategori)}</td>
                <td>${escHtml(b.dateAcha)}</td>
                <td style="text-align:right;">${fmtHTG(b.priAcha)}</td>
                <td>${escHtml(b.sit || '—')}</td>
            </tr>`).join('');
    }

    function openNewAssetModal() {
        ['assetNon', 'assetSit'].forEach(id => document.getElementById(id).value = '');
        document.getElementById('assetKategori').value = '';
        document.getElementById('assetDateAcha').value = '';
        document.getElementById('assetPriAcha').value = 0;
        document.getElementById('assetDirèDeVi').value = 5;
        document.getElementById('assetValèResiduelle').value = 0;
        document.getElementById('newAssetError').style.display = 'none';
        document.getElementById('newAssetModal').style.display = 'flex';
    }
    function closeNewAssetModal() {
        document.getElementById('newAssetModal').style.display = 'none';
    }

    async function submitNewAsset() {
        const btn = document.getElementById('assetSubmitBtn');
        const errEl = document.getElementById('newAssetError');
        errEl.style.display = 'none';
        btn.disabled = true;
        try {
            await window.AssetsService.createAsset({
                non: document.getElementById('assetNon').value.trim(),
                kategori: document.getElementById('assetKategori').value.trim(),
                dateAcha: document.getElementById('assetDateAcha').value,
                priAcha: Number(document.getElementById('assetPriAcha').value),
                dirèDeVi: Number(document.getElementById('assetDirèDeVi').value),
                valèResiduelle: Number(document.getElementById('assetValèResiduelle').value) || 0,
                sit: document.getElementById('assetSit').value.trim()
            });
            closeNewAssetModal();
            await Promise.all([chajeRegistre(), rannDashboardActifs(), rannGrafikActifs(), rannTabloAmortissement()]);
        } catch (e) {
            errEl.textContent = e.message;
            errEl.style.display = 'block';
        } finally {
            btn.disabled = false;
        }
    }

    // ================= 7.2 AMORTISSEMENT =================

    let filtreAmortStatut = 'tout'; // 'tout' | 'aktif' | 'amòti'

    async function rannTabloAmortissement() {
        const tbody = document.querySelector('#amortissementTableBody');
        if (!tbody) return;
        const summary = await window.AssetsService.getAmortissementSummary();
        let lis = summary.detay;
        if (filtreAmortStatut === 'aktif') lis = lis.filter(b => !b.amòti);
        if (filtreAmortStatut === 'amòti') lis = lis.filter(b => b.amòti);

        if (lis.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">Pa gen byen pou wè</td></tr>`;
            return;
        }
        tbody.innerHTML = lis.map(b => `
            <tr>
                <td>${escHtml(b.non)}</td>
                <td style="text-align:right;">${fmtHTG(b.priAcha)}</td>
                <td>${b.dirèDeVi} ans</td>
                <td style="text-align:right;">${fmtHTG(b.amortisManyèl * 12)}</td>
                <td style="text-align:right; font-weight:600;">${fmtHTG(b.valèNette)}${b.amòti ? ' <span class="ged-status" style="background:#D1FAE5; color:#047857;">Amòti</span>' : ''}</td>
            </tr>`).join('');
    }

    function filtreByenAmòti() { filtreAmortStatut = 'amòti'; rannTabloAmortissement(); }
    function filtreByenAktif() { filtreAmortStatut = 'aktif'; rannTabloAmortissement(); }
    function filtreByenTout() { filtreAmortStatut = 'tout'; rannTabloAmortissement(); }

    async function egzekiteAmortisMwa() {
        if (!confirm('Egzekite ekriti jounal amortisman pou mwa sa a? Aksyon sa a kreye ekriti kontab pou tout byen ki poko fin amòti.')) return;
        try {
            const rezilta = await window.AssetsService.egzekiteAmortisMwa();
            if (rezilta.nimewoEkriti === 0) {
                alert(`Pa gen okenn nouvo ekriti — swa tout byen deja amòti, swa amortisman mwa (${rezilta.kleMwa}) deja egzekite.`);
            } else {
                alert(`✅ ${rezilta.nimewoEkriti} ekriti jounal kreye pou ${rezilta.kleMwa}.`);
            }
            await Promise.all([rannDashboardActifs(), rannGrafikActifs(), rannTabloAmortissement()]);
        } catch (e) {
            alert('Erè: ' + e.message);
        }
    }

    // ================= 7.3 MAINTENANCE PRÉVENTIVE =================

    function remliSelectByen() {
        const sel = document.getElementById('planByenSelect');
        if (!sel) return;
        const veyikilOptions = (window._veyikilCachePourPlan || [])
            .map(v => `<option value="veyikil::${v.id}">🚚 ${escHtml(v.plak)} (${escHtml(v.mak)})</option>`).join('');
        const byenOptions = byenCache
            .map(b => `<option value="immobilisation::${b.id}">🏗️ ${escHtml(b.non)}</option>`).join('');
        sel.innerHTML = `<option value="">— Chwazi byen —</option>` + byenOptions + veyikilOptions;
    }

    async function chajeVeyikilPourSelects() {
        try {
            window._veyikilCachePourPlan = window.VeyikilSevis ? await window.VeyikilSevis.jwennTouVeyikil(true) : [];
            remliSelectByen();
        } catch (e) { console.warn('ActifsUI: chaje veyikil echwe', e); }
    }

    function rannTabloPreventif(lis) {
        const tbody = document.querySelector('#antretyenPreventifTableBody');
        if (!tbody) return;
        if (lis.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">Pa gen plan antretyen ankò</td></tr>`;
            return;
        }
        const badges = { pwograme: ['#EEF2FF', 'var(--primary)'], anreta: ['#FEE2E2', '#B91C1C'], fèt: ['#D1FAE5', '#047857'] };
        tbody.innerHTML = lis.map(p => {
            const [bg, koulè] = badges[p.estatiKalkile] || ['#F1F5F9', 'var(--text-dark)'];
            const aksyon = p.estatiKalkile !== 'fèt'
                ? `<span onclick="ActifsUI.marquePlanFèt('${p.id}')" style="color:var(--primary); cursor:pointer; font-size:12px; font-weight:600;">✅ Fèt</span>`
                : '';
            return `<tr>
                <td>${escHtml(p.byenNon)}</td>
                <td>${escHtml(p.kalite)}</td>
                <td>${escHtml(p.dateProgram)}</td>
                <td>${escHtml(p.frekans || '—')}</td>
                <td>${escHtml(p.responsab || '—')}</td>
                <td><span class="ged-status" style="background:${bg}; color:${koulè};">${p.estatiKalkile}</span> ${aksyon}</td>
            </tr>`;
        }).join('');
    }

    async function chajePreventif() {
        const plans = await window.MaintenanceService.getPlansPreventifs();
        rannTabloPreventif(plans);
    }

    function openNewPlanModal() {
        document.getElementById('planKalite').value = '';
        document.getElementById('planDateProgram').value = '';
        document.getElementById('planFrekans').value = '';
        document.getElementById('planResponsab').value = '';
        document.getElementById('planByenSelect').value = '';
        document.getElementById('newPlanError').style.display = 'none';
        document.getElementById('newPlanModal').style.display = 'flex';
    }
    function closeNewPlanModal() { document.getElementById('newPlanModal').style.display = 'none'; }

    async function submitNewPlan() {
        const errEl = document.getElementById('newPlanError');
        errEl.style.display = 'none';
        const [byenTip, byenId] = (document.getElementById('planByenSelect').value || '').split('::');
        if (!byenTip || !byenId) { errEl.textContent = 'Chwazi yon byen.'; errEl.style.display = 'block'; return; }

        const selText = document.getElementById('planByenSelect').selectedOptions[0]?.textContent.replace(/^[^\s]+\s/, '') || '';
        const btn = document.getElementById('planSubmitBtn');
        btn.disabled = true;
        try {
            await window.MaintenanceService.kreyePlanPreventif({
                byenTip, byenId, byenNon: selText,
                kalite: document.getElementById('planKalite').value.trim(),
                dateProgram: document.getElementById('planDateProgram').value,
                frekans: document.getElementById('planFrekans').value.trim(),
                responsab: document.getElementById('planResponsab').value.trim()
            });
            closeNewPlanModal();
            await Promise.all([chajePreventif(), rannDashboardActifs()]);
        } catch (e) {
            errEl.textContent = e.message;
            errEl.style.display = 'block';
        } finally {
            btn.disabled = false;
        }
    }

    async function marquePlanFèt(planId) {
        try {
            await window.MaintenanceService.marquePlanFèt(planId);
            await Promise.all([chajePreventif(), rannDashboardActifs()]);
        } catch (e) { alert('Erè: ' + e.message); }
    }

    // ================= 7.4 MAINTENANCE CORRECTIVE =================

    function rannTabloCorrectif(lis) {
        const tbody = document.querySelector('#antretyenCorrectifTableBody');
        if (!tbody) return;
        if (lis.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">Pa gen tikè ankò</td></tr>`;
            return;
        }
        const ijansBadges = { kritik: ['#FEE2E2', '#B91C1C'], mwayen: ['#FEF3C7', '#B45309'], ba: ['#F1F5F9', 'var(--text-dark)'] };
        const estatiBadges = { ouvè: ['#FEF3C7', '#B45309'], anReparasyon: ['#FFEDD5', '#C2410C'], fèmen: ['#D1FAE5', '#047857'] };
        tbody.innerHTML = lis.map(t => {
            const [ibg, ikoulè] = ijansBadges[t.ijans] || ijansBadges.mwayen;
            const [ebg, ekoulè] = estatiBadges[t.estati] || estatiBadges.ouvè;
            let aksyon = '';
            if (t.estati === 'ouvè') {
                aksyon = `<span onclick="ActifsUI.avanseTicket('${t.id}')" style="color:var(--primary); cursor:pointer; font-size:12px; font-weight:600;">🔧 Kòmanse</span>`;
            } else if (t.estati === 'anReparasyon') {
                aksyon = `<span onclick="ActifsUI.ouvriFèmenTicketModal('${t.id}')" style="color:#047857; cursor:pointer; font-size:12px; font-weight:600;">✅ Fèmen</span>`;
            }
            return `<tr>
                <td>${escHtml(t.nimewoTicket)}</td>
                <td>${escHtml(t.byenNon)}</td>
                <td>${escHtml(t.pwoblèm)}</td>
                <td><span class="ged-status" style="background:${ibg}; color:${ikoulè};">${t.ijans}</span></td>
                <td><span class="ged-status" style="background:${ebg}; color:${ekoulè};">${t.estati}</span> ${aksyon}</td>
            </tr>`;
        }).join('');
    }

    async function chajeCorrectif() {
        const tickets = await window.MaintenanceService.getTicketsCorrectifs(50);
        rannTabloCorrectif(tickets);
    }

    function openNewTicketModal() {
        document.getElementById('ticketPwoblèm').value = '';
        document.getElementById('ticketIjans').value = 'mwayen';
        document.getElementById('ticketByenSelect').innerHTML = document.getElementById('planByenSelect')?.innerHTML || '';
        document.getElementById('newTicketError').style.display = 'none';
        document.getElementById('newTicketModal').style.display = 'flex';
    }
    function closeNewTicketModal() { document.getElementById('newTicketModal').style.display = 'none'; }

    async function submitNewTicket() {
        const errEl = document.getElementById('newTicketError');
        errEl.style.display = 'none';
        const [byenTip, byenId] = (document.getElementById('ticketByenSelect').value || '').split('::');
        if (!byenTip || !byenId) { errEl.textContent = 'Chwazi yon byen.'; errEl.style.display = 'block'; return; }
        const selText = document.getElementById('ticketByenSelect').selectedOptions[0]?.textContent.replace(/^[^\s]+\s/, '') || '';

        const btn = document.getElementById('ticketSubmitBtn');
        btn.disabled = true;
        try {
            await window.MaintenanceService.kreyeTicketCorrectif({
                byenTip, byenId, byenNon: selText,
                pwoblèm: document.getElementById('ticketPwoblèm').value.trim(),
                ijans: document.getElementById('ticketIjans').value
            });
            closeNewTicketModal();
            await Promise.all([chajeCorrectif(), rannDashboardActifs()]);
        } catch (e) {
            errEl.textContent = e.message;
            errEl.style.display = 'block';
        } finally {
            btn.disabled = false;
        }
    }

    async function avanseTicket(ticketId) {
        try {
            await window.MaintenanceService.avanseTicket(ticketId, 'anReparasyon');
            await chajeCorrectif();
        } catch (e) { alert('Erè: ' + e.message); }
    }

    // Fèmen ticket + anrejistre kou — flux rapid ak prompt() (2 done sèlman)
    async function ouvriFèmenTicketModal(ticketId) {
        const koutStr = prompt('Kou reparasyon an (HTG):');
        if (!koutStr) return;
        const kout = Number(koutStr);
        if (!kout || kout <= 0 || isNaN(kout)) return alert('Kou pa valid.');

        const mòdPeman = prompt('Mòd peman (kach / transfè / kredi):', 'kach');
        if (!mòdPeman || !['kach', 'transfè', 'kredi'].includes(mòdPeman.trim())) {
       
