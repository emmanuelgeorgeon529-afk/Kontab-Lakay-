// js/modules/saas_ui.js
// Konekte HTML seksyon #saas (10.1-10.14) ak saasService.js, adminService.js
// Depann de window.SaasService, window.AdminService, window.ModalService

const SaasUI = (() => {

    let peyiKache = [];       // katalòg global peyi/deviz/lang
    let lokalizasyonKache = { langAktif: [] };
    let tauxKache = [];
    let abònmanAktyèlKache = { plan: 'Starter' };
    let integrasyonKache = {};
    let pèmisyonKache = {};

    let biznisAbònmanOff = null;
    let succursaleAbònmanOff = null;
    let abònmanOff = null;
    let lisansOff = null;
    let integrasyonOff = null;
    let pèmisyonOff = null;

    // ==================================================================
    // ORKESTRATÈ PRENSIPAL (rele pa navigate() nan index.html)
    // ==================================================================

    async function chajeSeksyonSaas() {
        await chajePeyiEtLang();
        chajeDashboardSaas();
        chajePeyiTable();
        chajeLangSection();
        await chaje10_4Et10_5();
        chajeMoteurFiscal();
        await chajeMultiEntrepriz();
        chajeSuccursale();
        chajeAbònman();
        chajeLisans();
        chajeIntegrasyon();
        await chajeParamInterface();
        await chajeNotifikasyonKanal();
        chajePèmisyonSection();
    }

    // ==================================================================
    // 10.1 — DASHBOARD
    // ==================================================================

    async function chajeDashboardSaas() {
        const bizId = window.currentBizId;
        if (!bizId) return;

        const kpiPeyi = document.getElementById('saasKpiPeyi');
        const kpiDeviz = document.getElementById('saasKpiDeviz');
        const kpiLang = document.getElementById('saasKpiLang');
        const kpiItilizate = document.getElementById('saasKpiItilizate');

        if (kpiPeyi) kpiPeyi.textContent = peyiKache.length;
        if (kpiDeviz) kpiDeviz.textContent = new Set(peyiKache.map(p => p.deviz?.kod).filter(Boolean)).size;
        if (kpiLang) kpiLang.textContent = new Set(peyiKache.map(p => p.lang).filter(Boolean)).size;

        try {
            window.AdminService?.abònmanItilizate(bizId, (lis) => {
                if (kpiItilizate) kpiItilizate.textContent = lis.filter(u => u.estati === 'aktif').length;
            });
        } catch (err) {
            console.error('Erè KPI itilizatè:', err);
        }
    }

    // ==================================================================
    // 10.2 — GESTION DES PAYS  /  10.3 — GESTION DES LANGUES
    // ==================================================================

    async function chajePeyiEtLang() {
        try {
            peyiKache = await window.SaasService.getPeyiGlobalList();
            lokalizasyonKache = await window.SaasService.getLokalizasyonBiznis(window.currentBizId);
        } catch (err) {
            console.error('Erè chajman peyi/lokalizasyon:', err);
            peyiKache = [];
        }
    }

    function chajePeyiTable() {
        const tbody = document.getElementById('saasPeyiTableBody');
        if (!tbody) return;

        if (peyiKache.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">Pa gen peyi konfigire nan katalòg global la ankò.</td></tr>';
            return;
        }

        tbody.innerHTML = peyiKache.map(p => `
            <tr>
                <td>${p.nonPeyi || p.id}</td>
                <td>${p.kodISO || p.id}</td>
                <td>${p.deviz?.kod || '—'}</td>
                <td>${p.lang || '—'}</td>
            </tr>
        `).join('');
    }

    function ouvriInfoAjoutePeyi() {
        window.ModalService.open({
            title: '🌎 Ajoute yon Peyi',
            bodyHtml: `
                <p style="font-size:13px; line-height:1.6;">
                    Katalòg Peyi/Deviz/Lang la se <strong>done global</strong> pataje ant tout biznis
                    sou platfòm nan (pa espesifik a yon sèl konpayi). Pou rezon sekirite, li jere
                    sèlman via <strong>Firebase Console</strong> (koleksyon <code>paramet_fiskal_global</code>),
                    paske aplikasyon an sou plan Spark — pa gen Cloud Functions pou valide chanjman global sa yo.
                </p>
            `,
            footerHtml: `<button onclick="ModalService.close()" style="background:var(--primary); color:white; border:none; padding:8px 16px; border-radius:8px; font-weight:600;">Konpri</button>`
        });
    }

    function chajeLangSection() {
        const container = document.getElementById('saasLangBadges');
        if (!container) return;

        const langDisponib = [...new Set(peyiKache.map(p => p.lang).filter(Boolean))];
        const langAktif = lokalizasyonKache.langAktif || [];

        if (langDisponib.length === 0) {
            container.innerHTML = '<span style="font-size:12px; color:var(--text-muted);">Pa gen lang nan katalòg global la ankò.</span>';
            return;
        }

        container.innerHTML = langDisponib.map(lang => {
            const aktif = langAktif.includes(lang);
            const bg = aktif ? '#D1FAE5' : '#F1F5F9';
            const color = aktif ? '#047857' : 'inherit';
            return `<span onclick="SaasUI.toggleLang('${lang}', ${!aktif})" class="ged-status" style="background:${bg}; color:${color}; cursor:pointer;">${aktif ? '✅' : '⬜'} ${lang}</span>`;
        }).join('');
    }

    async function toggleLang(lang, nouvoEtati) {
        try {
            await window.SaasService.aktyalizeLangAktifBiznis(window.currentBizId, lang, nouvoEtati);
            lokalizasyonKache = await window.SaasService.getLokalizasyonBiznis(window.currentBizId);
            chajeLangSection();
        } catch (err) {
            alert('Erè: ' + err.message);
        }
    }

    // ==================================================================
    // 10.4 — MULTI-DEVISES  /  10.5 — TAUX DE CHANGE
    // ==================================================================

    async function chaje10_4Et10_5() {
        try {
            tauxKache = await window.SaasService.getTauxChangeIstorik(window.currentBizId, 10);
        } catch (err) {
            console.error('Erè chajman taux chanj:', err);
            tauxKache = [];
        }
        chajeDevizTable();
        chajeDevizSwitches();
        chajeTauxTable();
    }

    function toChanjAktyèlPou(kodDeviz) {
        const antre = tauxKache.find(t => t.devizSous === kodDeviz && t.devizDestinasyon === 'HTG');
        return antre ? antre.to : null;
    }

    function chajeDevizTable() {
        const tbody = document.getElementById('saasDevizTableBody');
        if (!tbody) return;

        const devizList = [];
        const vi = new Set();
        peyiKache.forEach(p => {
            if (p.deviz?.kod && !vi.has(p.deviz.kod)) {
                vi.add(p.deviz.kod);
                devizList.push(p.deviz);
            }
        });

        if (devizList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">Pa gen deviz nan katalòg la ankò.</td></tr>';
            return;
        }

        tbody.innerHTML = devizList.map(d => {
            const to = d.kod === 'HTG' ? 1 : toChanjAktyèlPou(d.kod);
            return `
                <tr>
                    <td>${d.kod}</td>
                    <td>${d.non}</td>
                    <td>${d.senbol}</td>
                    <td style="text-align:right;">${to ? to.toLocaleString('fr-HT') : '—'}</td>
                </tr>
            `;
        }).join('');
    }

    function chajeDevizSwitches() {
        const p = lokalizasyonKache.devizPa || {};
        ['kliyan', 'founise', 'fakti', 'kontLabank'].forEach(kle => {
            const el = document.getElementById('saasDevizPa_' + kle);
            if (!el) return;
            const aktif = p[kle] !== false; // default true
            el.style.background = aktif ? '#D1FAE5' : '#F1F5F9';
            el.style.color = aktif ? '#047857' : 'inherit';
            el.dataset.aktif = aktif;
        });
    }

    async function toggleDevizPa(kle) {
        const el = document.getElementById('saasDevizPa_' + kle);
        const nouvo = !(el.dataset.aktif === 'true');
        try {
            await window.SaasService.aktyalizeDevizParamBiznis(window.currentBizId, { [kle]: nouvo });
            lokalizasyonKache = await window.SaasService.getLokalizasyonBiznis(window.currentBizId);
            chajeDevizSwitches();
        } catch (err) {
            alert('Erè: ' + err.message);
        }
    }

    function chajeTauxTable() {
        const tbody = document.getElementById('saasTauxTableBody');
        if (!tbody) return;

        if (tauxKache.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">Pa gen to chanj anrejistre ankò.</td></tr>';
            return;
        }

        tbody.innerHTML = tauxKache.map(t => {
            const dat = t.dat?.toDate?.().toLocaleDateString('fr-HT') || '—';
            return `
                <tr>
                    <td>${dat}</td>
                    <td>${t.devizSous}</td>
                    <td>${t.devizDestinasyon}</td>
                    <td style="text-align:right;">${t.to?.toLocaleString('fr-HT')}</td>
                </tr>
            `;
        }).join('');
    }

    function ouvriModalTauxManyèl() {
        const devizOpsyon = [...new Set(peyiKache.map(p => p.deviz?.kod).filter(k => k && k !== 'HTG'))];
        window.ModalService.open({
            title: '✍️ Ajoute Taux Chanj Manyèl',
            bodyHtml: `
                <div style="display:flex; flex-direction:column; gap:12px;">
                    <div>
                        <label style="font-size:13px; font-weight:600;">Deviz Sous</label>
                        <select id="tauxDevizSous" style="width:100%; padding:8px; border:1px solid #E2E8F0; border-radius:6px; margin-top:4px;">
                            ${devizOpsyon.map(k => `<option value="${k}">${k}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="font-size:13px; font-weight:600;">To Chanj (1 deviz sous = X HTG)</label>
                        <input type="number" id="tauxValè" step="0.0001" style="width:100%; padding:8px; border:1px solid #E2E8F0; border-radius:6px; margin-top:4px;">
                    </div>
                </div>
            `,
            footerHtml: `
                <button onclick="ModalService.close()" style="background:var(--bg-white); border:1px solid #E2E8F0; padding:8px 16px; border-radius:8px; font-weight:600;">Anile</button>
                <button onclick="SaasUI.konfimeTauxManyèl()" style="background:var(--primary); color:white; border:none; padding:8px 16px; border-radius:8px; font-weight:600;">Anrejistre</button>
            `
        });
    }

    async function konfimeTauxManyèl() {
        window.ModalService.hideError();
        const devizSous = document.getElementById('tauxDevizSous').value;
        const to = document.getElementById('tauxValè').value;
        try {
            await window.SaasService.ajouteTauxChangeManyèl(window.currentBizId, devizSous, 'HTG', to);
            window.ModalService.close();
            await chaje10_4Et10_5();
        } catch (err) {
            window.ModalService.showError(err.message);
        }
    }

    async function chaJeAPIOtomatik() {
        const devizOpsyon = [...new Set(peyiKache.map(p => p.deviz?.kod).filter(k => k && k !== 'HTG'))];
        if (devizOpsyon.length === 0) return;
        try {
            const rezilta = await window.SaasService.ajouteTauxChangeAPI(window.currentBizId, devizOpsyon);
            await chaje10_4Et10_5();
            alert(`To chanj mete ajou pou: ${rezilta.join(', ')}`);
        } catch (err) {
            alert('Erè API to chanj: ' + err.message);
        }
    }

    function ouvriIstorikTaux() {
        window.SaasService.getTauxChangeIstorik(window.currentBizId, 50).then(lis => {
            const rows = lis.map(t => {
                const dat = t.dat?.toDate?.().toLocaleDateString('fr-HT') || '—';
                return `<tr><td>${dat}</td><td>${t.devizSous}</td><td>${t.devizDestinasyon}</td><td style="text-align:right;">${t.to}</td><td>${t.sous}</td></tr>`;
            }).join('');
            window.ModalService.open({
                title: '📜 Istorik Konplè Taux de Change',
                bodyHtml: `<div style="max-height:320px; overflow-y:auto;"><table class="fin-table"><tr><th>Dat</th><th>Sous</th><th>Destinasyon</th><th>To</th><th>Orijin</th></tr>${rows}</table></div>`,
                footerHtml: `<button onclick="ModalService.close()" style="background:var(--primary); color:white; border:none; padding:8px 16px; border-radius:8px; font-weight:600;">Fèmen</button>`
            });
        });
    }

    // ==================================================================
    // 10.6 — MOTEUR FISCAL INTERNATIONAL
    // ==================================================================

    function chajeMoteurFiscal() {
        const tbody = document.getElementById('saasFiscalTableBody');
        if (!tbody) return;

        const liyTaks = [];
        peyiKache.forEach(p => {
            (p.taks || []).forEach(t => {
                liyTaks.push({ peyi: p.nonPeyi || p.id, ...t });
            });
        });

        if (liyTaks.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">Pa gen taks konfigire nan katalòg global la ankò.</td></tr>';
            return;
        }

        tbody.innerHTML = liyTaks.map(t => `
            <tr>
                <td>${t.peyi}</td>
                <td>${t.non}</td>
                <td style="text-align:right;">${t.to}%</td>
                <td>${t.kalite}</td>
            </tr>
        `).join('');
    }

    // ==================================================================
    // 10.7 — MULTI-ENTREPRISES
    // ==================================================================

    async function chajeMultiEntrepriz() {
        const tbody = document.getElementById('saasBiznisTableBody');
        if (!tbody) return;

        const uid = window.auth?.currentUser?.uid;
        if (biznisAbònmanOff) biznisAbònmanOff();

        if (!uid) {
            // Otantifikasyon dezaktive tanporèman (mòd demo) — montre sèl biznis aktyèl la
            try {
                const snap = await window.db.collection('biznis').doc(window.currentBizId).get();
                const done = snap.exists ? snap.data() : {};
                tbody.innerHTML = `
                    <tr>
                        <td>${done.nonAntrepriz || window.currentBizId} <span style="font-size:11px; color:var(--text-muted);">(demo)</span></td>
                        <td style="text-align:right;"><span style="color:var(--text-muted); font-size:12px;">Aktif</span></td>
                    </tr>
                `;
            } catch (err) {
                tbody.innerHTML = `<tr><td colspan="2" style="color:var(--danger);">Erè: ${err.message}</td></tr>`;
            }
            return;
        }

        biznisAbònmanOff = window.AdminService.abònmanBiznisPa(uid, (lis) => {
            if (lis.length === 0) {
                tbody.innerHTML = '<tr><td colspan="2" style="text-align:center; color:var(--text-muted);">Ou pa gen okenn antrepriz ankò.</td></tr>';
                return;
            }
            tbody.innerHTML = lis.map(b => `
                <tr>
                    <td>${b.nonAntrepriz} ${b.id === window.currentBizId ? '✅' : ''}</td>
                    <td style="text-align:right;">
                        <a href="#" onclick="SaasUI.chanjeBiznisAktif('${b.id}'); return false;" style="color:var(--primary); font-weight:600;">Chanje →</a>
                    </td>
                </tr>
            `).join('');
        });
    }

    function chanjeBiznisAktif(bizId) {
        window.currentBizId = bizId;
        window.currentCompanyId = bizId;
        window.navigate?.('saas');
    }

    function ouvriModalKreyeBiznis() {
        const uid = window.auth?.currentUser?.uid;
        if (!uid) {
            alert('Kreyasyon nouvo antrepriz mande otantifikasyon aktive (li dezaktive kounye a nan mòd demo).');
            return;
        }
        window.ModalService.open({
            title: '🏢 Nouvo Antrepriz',
            bodyHtml: `
                <div>
                    <label style="font-size:13px; font-weight:600;">Non Antrepriz *</label>
                    <input type="text" id="biznisNouvoNon" style="width:100%; padding:8px; border:1px solid #E2E8F0; border-radius:6px; margin-top:4px;">
                </div>
            `,
            footerHtml: `
                <button onclick="ModalService.close()" style="background:var(--bg-white); border:1px solid #E2E8F0; padding:8px 16px; border-radius:8px; font-weight:600;">Anile</button>
                <button onclick="SaasUI.konfimeKreyeBiznis()" style="background:var(--primary); color:white; border:none; padding:8px 16px; border-radius:8px; font-weight:600;">Kreye</button>
            `
        });
    }

    async function konfimeKreyeBiznis() {
        window.ModalService.hideError();
        const non = document.getElementById('biznisNouvoNon').value.trim();
        if (!non) {
            window.ModalService.showError('Non antrepriz la obligatwa.');
            return;
        }
        try {
            const uid = window.auth.currentUser.uid;
            await window.AdminService.kreyeBiznis(uid, { nonAntrepriz: non });
            window.ModalService.close();
        } catch (err) {
            window.ModalService.showError(err.message);
        }
    }

    // ==================================================================
    // 10.8 — MULTI-SUCCURSALES
    // ==================================================================

    function chajeSuccursale() {
        const container = document.getElementById('saasSuccursaleBadges');
        if (!container) return;

        if (succursaleAbònmanOff) succursaleAbònmanOff();
        succursaleAbònmanOff = window.AdminService.abònmanSuccursale(window.currentBizId, (lis) => {
            if (lis.length === 0) {
                container.innerHTML = '<span style="font-size:12px; color:var(--text-muted);">Pa gen succursale kreye ankò.</span>';
                return;
            }
            container.innerHTML = lis.filter(s => s.estati === 'aktif').map(s =>
                `<span class="ged-status" style="background:#F1F5F9;">${s.non}</span>`
            ).join('');
        });
    }

    function ouvriModalKreyeSuccursale() {
        window.ModalService.open({
            title: '🏬 Nouvo Succursale',
            bodyHtml: `
                <div style="display:flex; flex-direction:column; gap:12px;">
                    <div>
                        <label style="font-size:13px; font-weight:600;">Non *</label>
                        <input type="text" id="succNon" style="width:100%; padding:8px; border:1px solid #E2E8F0; border-radius:6px; margin-top:4px;">
                    </div>
                    <div>
                        <label style="font-size:13px; font-weight:600;">Adrès</label>
                        <input type="text" id="succAdrès" style="width:100%; padding:8px; border:1px solid #E2E8F0; border-radius:6px; margin-top:4px;">
                    </div>
                </div>
            `,
            footerHtml: `
                <button onclick="ModalService.close()" style="background:var(--bg-white); border:1px solid #E2E8F0; padding:8px 16px; border-radius:8px; font-weight:600;">Anile</button>
                <button onclick="SaasUI.konfimeKreyeSuccursale()" style="background:var(--primary); color:white; border:none; padding:8px 16px; border-radius:8px; font-weight:600;">Kreye</button>
            `
        });
    }

    async function konfimeKreyeSuccursale() {
        window.ModalService.hideError();
        const non = document.getElementById('succNon').value.trim();
        const adrès = document.getElementById('succAdrès').value.trim();
        if (!non) {
            window.ModalService.showError('Non succursale a obligatwa.');
            return;
        }
        try {
            await window.AdminService.kreyeSuccursale(window.currentBizId, { non, adrès });
            window.ModalService.close();
        } catch (err) {
            window.ModalService.showError(err.message);
        }
    }

    // ==================================================================
    // 10.9 — ABÒNMAN SAAS
    // ==================================================================

    function chajeAbònman() {
        if (abònmanOff) abònmanOff();
        abònmanOff = window.SaasService.abònmanAbònmanBiznis(window.currentBizId, (done) => {
            abònmanAktyèlKache = done;
            renderAbònmanCards();
        });
    }

    function renderAbònmanCards() {
        const container = document.getElementById('saasAbònmanCards');
        if (container) {
            const ICON = { Starter: '🥉', Professional: '🥈', Enterprise: '🥇' };
            container.innerHTML = window.SaasService.PLAN_VALID.map(plan => {
                const aktif = plan === abònmanAktyèlKache.plan;
                const stil = aktif
                    ? 'border:2px solid var(--primary); border-radius:12px; padding:14px; text-align:center; background:#EEF2FF;'
                    : 'border:1px solid #E2E8F0; border-radius:12px; padding:14px; text-align:center; cursor:pointer;';
                return `
                    <div style="${stil}" ${!aktif ? `onclick="SaasUI.konfimeChanjePlan('${plan}')"` : ''}>
                        ${ICON[plan]}<br><strong>${plan}</strong>
                        ${aktif ? '<br><span style="font-size:11px; color:var(--primary);">Plan Aktyèl</span>' : '<br><span style="font-size:11px; color:var(--text-muted);">Klike pou chanje</span>'}
                    </div>
                `;
            }).join('');
        }
        const kpiAbònman = document.getElementById('saasKpiAbònman');
        if (kpiAbònman) kpiAbònman.textContent = abònmanAktyèlKache.plan || '—';
    }

    async function konfimeChanjePlan(nouvoPlan) {
        if (!confirm(`Chanje plan abònman pou "${nouvoPlan}"?`)) return;
        try {
            await window.SaasService.chanjePlanAbònman(window.currentBizId, nouvoPlan);
        } catch (err) {
            alert('Erè: ' + err.message);
        }
    }

    // ==================================================================
    // 10.10 — GESTION DES LICENCES
    // ==================================================================

    function chajeLisans() {
        if (lisansOff) lisansOff();
        lisansOff = window.SaasService.abònmanLisansBiznis(window.currentBizId, (lisans) => {
            renderLisansTable(lisans);
        });
    }

    function renderLisansTable(lisans) {
        const tbody = document.getElementById('saasLisansTableBody');
        const kpiLisans = document.getElementById('saasKpiLisans');

        if (!lisans) {
            if (kpiLisans) kpiLisans.textContent = '—';
            if (tbody) {
                tbody.innerHTML = `
                    <tr><td colspan="4" style="text-align:center; color:var(--text-muted);">
                        Pa gen lisans jenere ankò.
                        <button onclick="SaasUI.jenereLisansUI()" style="margin-left:8px; background:var(--primary); color:white; border:none; padding:4px 10px; border-radius:6px; font-size:12px;">Jenere Lisans</button>
                    </td></tr>`;
            }
            return;
        }

        if (kpiLisans) kpiLisans.textContent = lisans.estati === 'aktif' ? '🟢 Active' : '🔴 Ekspire';

        if (!tbody) return;
        const badge = lisans.estati === 'aktif'
            ? '<span class="ged-status" style="background:#D1FAE5; color:#047857;">🟢 Active</span>'
            : '<span class="ged-status" style="background:#FEE2E2; color:#B91C1C;">🔴 Ekspire</span>';

        tbody.innerHTML = `
            <tr>
                <td>${lisans.nimewo}</td>
                <td>${lisans.plan}</td>
                <td>${lisans.dateEkspirasyon}</td>
                <td>${badge}</td>
            </tr>
        `;
    }

    async function jenereLisansUI() {
        try {
            await window.SaasService.jenereLisans(window.currentBizId, abònmanAktyèlKache.plan || 'Starter');
        } catch (err) {
            alert('Erè: ' + err.message);
        }
    }

    // ==================================================================
    // 10.11 — INTÉGRATION API
    // ==================================================================

    function chajeIntegrasyon() {
        if (integrasyonOff) integrasyonOff();
        integrasyonOff = window.SaasService.abònmanIntegrasyon(window.currentBizId, (done) => {
            integrasyonKache = done;
            renderIntegrasyonTable();
            const kpiApi = document.getElementById('saasKpiApi');
            if (kpiApi) kpiApi.textContent = Object.values(done).filter(d => d.konekte).length;
        });
    }

    function renderIntegrasyonTable() {
        const tbody = document.getElementById('saasIntegrasyonTableBody');
        if (!tbody) return;

        tbody.innerHTML = window.SaasService.SÈVIS_API_DISPONIB.map(s => {
            const konekte = integrasyonKache[s.id]?.konekte;
            const badge = konekte
                ? '<span class="ged-status" style="background:#D1FAE5; color:#047857;">Connecté</span>'
                : '<span class="ged-status" style="background:#F1F5F9;">Non Connecté</span>';
            const lyen = konekte
                ? `<a href="#" onclick="SaasUI.dekonekteIntegrasyonUI('${s.id}'); return false;" style="color:var(--danger); font-weight:600;">Déconnecter</a>`
                : `<a href="#" onclick="SaasUI.konekteIntegrasyonUI('${s.id}','${s.non}'); return false;" style="color:var(--primary); font-weight:600;">Connecter</a>`;
            return `<tr><td>${s.non}</td><td>${badge}</td><td style="text-align:right;">${lyen}</td></tr>`;
        }).join('');
    }

    async function konekteIntegrasyonUI(sèvisId, non) {
        try {
            await window.SaasService.konekteIntegrasyon(window.currentBizId, sèvisId, non);
        } catch (err) {
            alert('Erè: ' + err.message);
        }
    }

    async function dekonekteIntegrasyonUI(sèvisId) {
        if (!confirm('Dekonekte entegrasyon sa a?')) return;
        try {
            await window.SaasService.dekonekteIntegrasyon(window.currentBizId, sèvisId);
        } catch (err) {
            alert('Erè: ' + err.message);
        }
    }

    // ==================================================================
    // 10.12 — PARAMÈTRES INTERFACE
    // ==================================================================

    async function chajeParamInterface() {
        const done = await window.SaasService.getParamInterface(window.currentBizId);
        ['light', 'dark', 'system'].forEach(t => {
            const el = document.getElementById('saasTèm_' + t);
            if (!el) return;
            const aktif = (done.tèm || 'light') === t;
            el.style.background = aktif ? '#EEF2FF' : '#F1F5F9';
            el.style.color = aktif ? 'var(--primary)' : 'inherit';
        });
        const inputNon = document.getElementById('saasInterfaceNon');
        const inputKoulè = document.getElementById('saasInterfaceKoulè');
        if (inputNon) inputNon.value = done.nonAntrepriz || '';
        if (inputKoulè) inputKoulè.value = done.koulèPrimè || '#4F46E5';
    }

    async function chanjeTèm(tèm) {
        try {
            await window.SaasService.aktyalizeParamInterface(window.currentBizId, { tèm });
            await chajeParamInterface();
            if (typeof window.applyTheme === 'function') window.applyTheme(tèm);
        } catch (err) {
            alert('Erè: ' + err.message);
        }
    }

    async function anrejistreParamInterface() {
        const nonAntrepriz = document.getElementById('saasInterfaceNon')?.value.trim();
        const koulèPrimè = document.getElementById('saasInterfaceKoulè')?.value;
        try {
            await window.SaasService.aktyalizeParamInterface(window.currentBizId, { nonAntrepriz, koulèPrimè });
            alert('Paramèt entèfas anrejistre.');
        } catch (err) {
            alert('Erè: ' + err.message);
        }
    }

    // ==================================================================
    // 10.13 — NOTIFICATIONS GLOBALES
    // ==================================================================

    async function chajeNotifikasyonKanal() {
        const done = await window.SaasService.getNotifikasyonKanal(window.currentBizId);
        ['email', 'push', 'whatsapp', 'sms'].forEach(k => {
            const el = document.getElementById('saasNotif_' + k);
            if (!el) return;
            const aktif = !!done[k];
            el.style.background = aktif ? '#D1FAE5' : '#F1F5F9';
            el.style.color = aktif ? '#047857' : 'inherit';
            el.dataset.aktif = aktif;
        });
    }

    async function toggleNotifikasyonKanal(kanal) {
        const el = document.getElementById('saasNotif_' + kanal);
        const nouvo = !(el.dataset.aktif === 'true');
        try {
            await window.SaasService.aktyalizeNotifikasyonKanal(window.currentBizId, kanal, nouvo);
            await chajeNotifikasyonKanal();
        } catch (err) {
            alert('Erè: ' + err.message);
        }
    }

    // ==================================================================
    // 10.14 — RAPPORTS ADMINISTRATIFS (ekspòtasyon CSV kote-kliyan)
    // ==================================================================

    function telechajeCSV(nonFichye, tèt, liy) {
        const contni = [tèt.join(','), ...liy.map(l => l.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob(['\uFEFF' + contni], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = nonFichye;
        a.click();
        URL.revokeObjectURL(url);
    }

    async function ekspòteRapòDeviz() {
        telechajeCSV('deviz.csv', ['Kòd', 'Non', 'Senbòl'],
            peyiKache.map(p => [p.deviz?.kod, p.deviz?.non, p.deviz?.senbol]));
    }

    async function ekspòteRapòTaux() {
        const lis = await window.SaasService.getTauxChangeIstorik(window.currentBizId, 200);
        telechajeCSV('taux_de_change.csv', ['Dat', 'Sous', 'Destinasyon', 'To', 'Orijin'],
            lis.map(t => [t.dat?.toDate?.().toLocaleDateString('fr-HT') || '', t.devizSous, t.devizDestinasyon, t.to, t.sous]));
    }

    async function ekspòteRapòIntegrasyon() {
        telechajeCSV('integrations_api.csv', ['Sèvis', 'Estati'],
            window.SaasService.SÈVIS_API_DISPONIB.map(s => [s.non, integrasyonKache[s.id]?.konekte ? 'Connecté' : 'Non Connecté']));
    }

    // ==================================================================
    // PÈMISYON (reyitilize AdminService konplètman — pa gen nouvo koleksyon)
    // ==================================================================

    function chajePèmisyonSection() {
        if (pèmisyonOff) pèmisyonOff();
        pèmisyonOff = window.AdminService.abònmanPèmisyon(window.currentBizId, (done) => {
            pèmisyonKache = done;
        });
    }

    function ouvriModalPèmisyon(wol) {
        const kouran = pèmisyonKache[wol] || {};
        window.ModalService.open({
            title: `🔐 Pèmisyon — ${wol}`,
            bodyHtml: `
                <div style="display:flex; flex-direction:column; gap:8px;">
                    <label style="font-size:13px;">
                        <input type="checkbox" id="pTout" ${kouran.tout ? 'checked' : ''}> Tout dwa (Super Admin)
                    </label>
                    ${window.AdminService.MODIL_LIS.map(m => `
                        <label style="font-size:13px;">
                            <select id="pModil_${m}" style="margin-right:8px;">
                                <option value="">— Okenn —</option>
                                <option value="li" ${kouran[m] === 'li' ? 'selected' : ''}>Lekti</option>
                                <option value="ekri" ${kouran[m] === 'ekri' ? 'selected' : ''}>Ekri</option>
                            </select>${m}
                        </label>
                    `).join('')}
                </div>
            `,
            footerHtml: `
                <button onclick="ModalService.close()" style="background:var(--bg-white); border:1px solid #E2E8F0; padding:8px 16px; border-radius:8px; font-weight:600;">Anile</button>
                <button onclick="SaasUI.konfimePèmisyon('${wol}')" style="background:var(--primary); color:white; border:none; padding:8px 16px; border-radius:8px; font-weight:600;">Anrejistre</button>
            `
        });
    }

    async function konfimePèmisyon(wol) {
        const tout = document.getElementById('pTout').checked;
        const pèmisyonObj = tout ? { tout: true } : {};
        if (!tout) {
            window.AdminService.MODIL_LIS.forEach(m => {
                const v = document.getElementById('pModil_' + m).value;
                if (v) pèmisyonObj[m] = v;
            });
        }
        try {
            await window.AdminService.aktyaliizePèmisyonWol(window.currentBizId, wol, pèmisyonObj);
            window.ModalService.close();
        } catch (err) {
            alert('Erè: ' + err.message);
        }
    }

    return {
        chajeSeksyonSaas, ouvriInfoAjoutePeyi, toggleLang,
        toggleDevizPa, ouvriModalTauxManyèl, konfimeTauxManyèl, chaJeAPIOtomatik, ouvriIstorikTaux,
        chanjeBiznisAktif, ouvriModalKreyeBiznis, konfimeKreyeBiznis,
        ouvriModalKreyeSuccursale, konfimeKreyeSuccursale,
        konfimeChanjePlan, jenereLisansUI,
        konekteIntegrasyonUI, dekonekteIntegrasyonUI,
        chanjeTèm, anrejistreParamInterface,
        toggleNotifikasyonKanal,
        ekspòteRapòDeviz, ekspòteRapòTaux, ekspòteRapòIntegrasyon,
        ouvriModalPèmisyon, konfimePèmisyon
    };
})();

window.SaasUI = SaasUI;
