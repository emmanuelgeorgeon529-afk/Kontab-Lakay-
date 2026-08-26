// js/modules/logistique_ui.js
// Konekte HTML seksyon #logistique (5.2-5.10) ak bonLivrezonSevis.js,
// veyikilSevis.js, chofeSevis.js, depansService.js, savService.js
// Depann de window.BonLivrezonSevis, window.SalesService, window.VeyikilSevis,
// window.ChofeSevis, window.DepansService, window.SavService, window.ModalService

const LogistiqueUI = (() => {

    let venteDisponibKache = [];   // { id, nimewoFakti, kliyanNon, total }
    let venteChwazi = null;         // vante chwazi pou nouvo BL
    let venteChwaziPouRetour = null; // vant chwazi (objè konplè) pou nouvo Retou

    const BADGE_ESTATI = {
        preparasyon: { bg: '#F1F5F9', color: '#475569', label: 'Préparation' },
        en_route:    { bg: '#DBEAFE', color: '#1D4ED8', label: 'En route' },
        livre:       { bg: '#D1FAE5', color: '#047857', label: 'Livré' },
        anile:       { bg: '#FEE2E2', color: '#B91C1C', label: 'Annulé' }
    };

    function badgeHtml(estati) {
        const b = BADGE_ESTATI[estati] || BADGE_ESTATI.preparasyon;
        return `<span class="ged-status" style="background:${b.bg}; color:${b.color};">${b.label}</span>`;
    }

    // ==================================================================
    // 5.2 — BON DE LIVRAISON
    // ==================================================================

    async function chajeBL() {
        const tbody = document.getElementById('blTableBody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">Ap chaje...</td></tr>';

        try {
            const bls = await window.BonLivrezonSevis.getBLs(50);
            if (bls.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">Pa gen BL kreye ankò.</td></tr>';
                return;
            }

            tbody.innerHTML = bls.map(bl => {
                const aksyonBtns = aksyonPouEstati(bl);
                return `
                    <tr>
                        <td data-label="N° BL">${bl.nimewoBL}</td>
                        <td data-label="Kliyan">${bl.kliyanNon || '—'}</td>
                        <td data-label="Chofè">${bl.chofeNon || '—'}</td>
                        <td data-label="Veyikil">${bl.veyikilPlak || '—'}</td>
                        <td data-label="Estati">${badgeHtml(bl.estati)} ${aksyonBtns}</td>
                    </tr>
                `;
            }).join('');
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="5" style="color:var(--danger);">Erè: ${err.message}</td></tr>`;
        }
    }

    function aksyonPouEstati(bl) {
        if (bl.estati === 'preparasyon') {
            return `
                <button onclick="LogistiqueUI.chanjeEstati('${bl.id}','en_route')" style="font-size:11px; padding:3px 8px; border-radius:6px; border:1px solid #E2E8F0; background:white; margin-left:6px;">→ En route</button>
                <button onclick="LogistiqueUI.chanjeEstati('${bl.id}','anile')" style="font-size:11px; padding:3px 8px; border-radius:6px; border:1px solid var(--danger); color:var(--danger); background:white;">Anile</button>
            `;
        }
        if (bl.estati === 'en_route') {
            return `
                <button onclick="LogistiqueUI.chanjeEstati('${bl.id}','livre')" style="font-size:11px; padding:3px 8px; border-radius:6px; border:1px solid #E2E8F0; background:white; margin-left:6px;">→ Livré</button>
                <button onclick="LogistiqueUI.chanjeEstati('${bl.id}','anile')" style="font-size:11px; padding:3px 8px; border-radius:6px; border:1px solid var(--danger); color:var(--danger); background:white;">Anile</button>
            `;
        }
        return '';
    }

    async function chanjeEstati(blId, nouvoEstati) {
        try {
            await window.BonLivrezonSevis.avanseEstati(blId, nouvoEstati);
            await chajeBL();
            await chajeExpeditions();
        } catch (err) {
            alert('Erè: ' + err.message);
        }
    }

    // ---- Modal "Nouvo BL" ----

    async function ouvriModalKreyeBL() {
        window.ModalService.open({
            title: '📄 Nouvo Bon de Livraison',
            bodyHtml: `
                <div style="display:flex; flex-direction:column; gap:12px;">
                    <div>
                        <label style="font-size:13px; font-weight:600;">Chèche Vant pa N° Facture</label>
                        <input type="text" id="blRechèchVant" placeholder="Ekri N° Facture oswa non kliyan..." style="width:100%; padding:8px; border:1px solid #E2E8F0; border-radius:6px; margin-top:4px;" oninput="LogistiqueUI.filtreVant(this.value)">
                        <div id="blRezilta" style="max-height:160px; overflow-y:auto; margin-top:8px; display:flex; flex-direction:column; gap:4px;"></div>
                        <div id="blVanteChwazi" style="margin-top:8px; font-size:13px;"></div>
                    </div>
                    <div>
                        <label style="font-size:13px; font-weight:600;">Chofè (opsyonèl)</label>
                        <select id="blChofeSelect" style="width:100%; padding:8px; border:1px solid #E2E8F0; border-radius:6px; margin-top:4px;">
                            <option value="">— Pa chwazi —</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-size:13px; font-weight:600;">Veyikil (opsyonèl)</label>
                        <select id="blVeyikilSelect" style="width:100%; padding:8px; border:1px solid #E2E8F0; border-radius:6px; margin-top:4px;">
                            <option value="">— Pa chwazi —</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-size:13px; font-weight:600;">Adrès Livrezon (opsyonèl)</label>
                        <input type="text" id="blAdrès" style="width:100%; padding:8px; border:1px solid #E2E8F0; border-radius:6px; margin-top:4px;">
                    </div>
                </div>
            `,
            footerHtml: `
                <button onclick="ModalService.close()" style="background:var(--bg-white); border:1px solid #E2E8F0; padding:8px 16px; border-radius:8px; font-weight:600;">Anile</button>
                <button onclick="LogistiqueUI.konfimeKreyeBL()" style="background:var(--primary); color:white; border:none; padding:8px 16px; border-radius:8px; font-weight:600;">Kreye BL</button>
            `
        });

        venteChwazi = null;
        await chajeVantDisponib();
        await chajeChofeEVeyikilSelects();
    }

    async function chajeVantDisponib() {
        try {
            const [ventes, bls] = await Promise.all([
                window.SalesService.getSales(100),
                window.BonLivrezonSevis.getBLs(100)
            ]);
            const idAvekBL = new Set(bls.map(bl => bl.venteId));
            venteDisponibKache = ventes
                .filter(v => v.estati === 'aktif' && !idAvekBL.has(v.id))
                .map(v => ({ id: v.id, nimewoFakti: v.nimewoFakti, kliyanNon: v.kliyanNon, total: v.total }));
        } catch (err) {
            window.ModalService.showError('Pa t ka chaje lis Vant: ' + err.message);
        }
    }

    async function chajeChofeEVeyikilSelects() {
        try {
            const [chofè, veyikil] = await Promise.all([
                window.ChofeSevis.jwennTouChofe(),
                window.VeyikilSevis.jwennTouVeyikil()
            ]);
            const chofeSelect = document.getElementById('blChofeSelect');
            chofè.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.non;
                chofeSelect.appendChild(opt);
            });
            const veyikilSelect = document.getElementById('blVeyikilSelect');
            veyikil.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v.id;
                opt.textContent = `${v.plak} — ${v.mak || ''} ${v.modelVeyikil || ''}`.trim();
                veyikilSelect.appendChild(opt);
            });
        } catch (err) {
            window.ModalService.showError('Pa t ka chaje chofè/veyikil: ' + err.message);
        }
    }

    function filtreVant(tèks) {
        const rezilta = document.getElementById('blRezilta');
        if (!tèks || tèks.trim().length === 0) {
            rezilta.innerHTML = '';
            return;
        }
        const t = tèks.toLowerCase();
        const match = venteDisponibKache.filter(v =>
            (v.nimewoFakti || '').toLowerCase().includes(t) ||
            (v.kliyanNon || '').toLowerCase().includes(t)
        ).slice(0, 8);

        if (match.length === 0) {
            rezilta.innerHTML = '<div style="font-size:12px; color:var(--text-muted);">Pa gen rezilta (sèlman Vant aktif san BL deja parèt isit la).</div>';
            return;
        }

        rezilta.innerHTML = match.map(v => `
            <div onclick="LogistiqueUI.chwaziVant('${v.id}')" style="padding:8px; border:1px solid #E2E8F0; border-radius:6px; cursor:pointer; font-size:13px;">
                <strong>${v.nimewoFakti}</strong> — ${v.kliyanNon} (${(v.total || 0).toLocaleString()} HTG)
            </div>
        `).join('');
    }

    function chwaziVant(venteId) {
        venteChwazi = venteDisponibKache.find(v => v.id === venteId) || null;
        const affichage = document.getElementById('blVanteChwazi');
        const rezilta = document.getElementById('blRezilta');
        if (venteChwazi) {
            affichage.innerHTML = `✅ Vant chwazi: <strong>${venteChwazi.nimewoFakti}</strong> — ${venteChwazi.kliyanNon}`;
            rezilta.innerHTML = '';
            document.getElementById('blRechèchVant').value = venteChwazi.nimewoFakti;
        }
    }

    async function konfimeKreyeBL() {
        window.ModalService.hideError();

        if (!venteChwazi) {
            window.ModalService.showError('Chwazi yon Vant nan lis rezilta yo anvan.');
            return;
        }

        const chofeId = document.getElementById('blChofeSelect').value || null;
        const veyikilId = document.getElementById('blVeyikilSelect').value || null;
        const adrèsLivrezon = document.getElementById('blAdrès').value.trim() || null;

        try {
            await window.BonLivrezonSevis.kreyeBL(venteChwazi.id, { chofeId, veyikilId, adrèsLivrezon });
            window.ModalService.close();
            await chajeBL();
        } catch (err) {
            window.ModalService.showError(err.message);
        }
    }

    // ==================================================================
    // 5.3 — GESTION DES EXPÉDITIONS (vi filtre sou menm BL yo)
    // ==================================================================

    async function chajeExpeditions() {
        const tbody = document.getElementById('expeditionTableBody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">Ap chaje...</td></tr>';

        try {
            const bls = await window.BonLivrezonSevis.getBLs(100);
            // Sèlman BL ki deja kite "preparasyon" — yon ekspedisyon reyèl gen tan pati
            const expeditions = bls.filter(bl => bl.estati !== 'preparasyon');

            if (expeditions.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">Pa gen ekspedisyon an kou oswa fini.</td></tr>';
                return;
            }

            tbody.innerHTML = expeditions.map(bl => {
                const datDepa = bl.dateDepa?.toDate?.().toLocaleDateString('fr-HT') || '—';
                return `
                    <tr>
                        <td data-label="Kliyan">${bl.kliyanNon || '—'}</td>
                        <td data-label="BL">${bl.nimewoBL}</td>
                        <td data-label="Chofè">${bl.chofeNon || '—'}</td>
                        <td data-label="Dat Depa">${datDepa}</td>
                        <td data-label="Estati">${badgeHtml(bl.estati)}</td>
                    </tr>
                `;
            }).join('');
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="5" style="color:var(--danger);">Erè: ${err.message}</td></tr>`;
        }
    }

    // ==================================================================
    // 5.4 — GESTION DE FLOTTE
    // ==================================================================

    const ESTATI_VEYIKIL_BADGE = {
        Aktif:     { bg: '#D1FAE5', color: '#047857' },
        Antretyen: { bg: '#FEF3C7', color: '#B45309' },
        Enaktif:   { bg: '#F1F5F9', color: '#64748B' }
    };

    async function chajeFlotte() {
        const tbody = document.getElementById('flotteTableBody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">Ap chaje...</td></tr>';

        try {
            const veyikilLis = await window.VeyikilSevis.jwennTouVeyikil(true);

            if (veyikilLis.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">Pa gen veyikil kreye ankò.</td></tr>';
                return;
            }

            tbody.innerHTML = veyikilLis.map(v => {
                const badge = ESTATI_VEYIKIL_BADGE[v.estati] || ESTATI_VEYIKIL_BADGE.Aktif;
                return `
                    <tr>
                        <td>${v.plak}</td>
                        <td>${v.mak || '—'} ${v.modelVeyikil || ''}</td>
                        <td>${v.ane || '—'}</td>
                        <td style="text-align:right;">${(v.kilometraj || 0).toLocaleString()} km</td>
                        <td><span class="ged-status" style="background:${badge.bg}; color:${badge.color};">${v.estati}</span></td>
                        <td><button onclick="LogistiqueUI.ouvriModalVeyikil('${v.id}')" style="font-size:11px; padding:3px 8px; border-radius:6px; border:1px solid #E2E8F0; background:white;">Modifye</button></td>
                    </tr>
                `;
            }).join('');
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="6" style="color:var(--danger);">Erè: ${err.message}</td></tr>`;
        }
    }

    async function ouvriModalVeyikil(veyikilId = null) {
        let veyikil = null;
        if (veyikilId) {
            try {
                veyikil = await window.VeyikilSevis.jwennVeyikilPaId(veyikilId);
            } catch (err) {
                alert('Erè: ' + err.message);
                return;
            }
        }

        window.ModalService.open({
            title: veyikilId ? '🚛 Modifye Veyikil' : '🚛 Nouvo Veyikil',
            bodyHtml: `
                <div style="display:flex; flex-direction:column; gap:12px;">
                    <div>
                        <label style="font-size:13px; font-weight:600;">Plak *</label>
                        <input type="text" id="vPlak" value="${veyikil?.plak || ''}" style="width:100%; padding:8px; border:1px solid #E2E8F0; border-radius:6px; margin-top:4px;">
                    </div>
                    <div style="display:flex; gap:8px;">
                        <div style="flex:1;">
                            <label style="font-size:13px; font-weight:600;">Mak</label>
                            <input type="text" id="vMak" value="${veyikil?.mak || ''}" style="width:100%; padding:8px; border:1px solid #E2E8F0; border-radius:6px; margin-top:4px;">
                        </div>
                        <div style="flex:1;">
                            <label style="font-size:13px; font-weight:600;">Modèl</label>
                            <input type="text" id="vModel" value="${veyikil?.modelVeyikil || ''}" style="width:100%; padding:8px; border:1px solid #E2E8F0; border-radius:6px; margin-top:4px;">
                        </div>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <div style="flex:1;">
                            <label style="font-size:13px; font-weight:600;">Ane</label>
                            <input type="number" id="vAne" value="${veyikil?.ane || ''}" style="width:100%; padding:8px; border:1px solid #E2E8F0; border-radius:6px; margin-top:4px;">
                        </div>
                        <div style="flex:1;">
                            <label style="font-size:13px; font-weight:600;">Kilométrage</label>
                            <input type="number" id="vKilometraj" value="${veyikil?.kilometraj || 0}" style="width:100%; padding:8px; border:1px solid #E2E8F0; border-radius:6px; margin-top:4px;">
                        </div>
                    </div>
                    <div>
                        <label style="font-size:13px; font-weight:600;">Estati</label>
                        <select id="vEstati" style="width:100%; padding:8px; border:1px solid #E2E8F0; border-radius:6px; margin-top:4px;">
                            <option value="Aktif" ${veyikil?.estati === 'Aktif' ? 'selected' : ''}>Aktif</option>
                            <option value="Antretyen" ${veyikil?.estati === 'Antretyen' ? 'selected' : ''}>Antretyen</option>
                            <option value="Enaktif" ${veyikil?.estati === 'Enaktif' ? 'selected' : ''}>Enaktif</option>
                        </select>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <div style="flex:1;">
                            <label style="font-size:13px; font-weight:600;">Asirans ekspire</label>
                            <input type="date" id="vAsirans" value="${veyikil?.asiransDatEkspirasyon || ''}" style="width:100%; padding:8px; border:1px solid #E2E8F0; border-radius:6px; margin-top:4px;">
                        </div>
                        <div style="flex:1;">
                            <label style="font-size:13px; font-weight:600;">Pwochen antretyen</label>
                            <input type="date" id="vAntretyen" value="${veyikil?.antretyenPwochenDat || ''}" style="width:100%; padding:8px; border:1px solid #E2E8F0; border-radius:6px; margin-top:4px;">
                        </div>
                    </div>
                </div>
            `,
            footerHtml: `
                <button onclick="ModalService.close()" style="background:var(--bg-white); border:1px solid #E2E8F0; padding:8px 16px; border-radius:8px; font-weight:600;">Anile</button>
                <button onclick="LogistiqueUI.konfimeVeyikil('${veyikilId || ''}')" style="background:var(--primary); color:white; border:none; padding:8px 16px; border-radius:8px; font-weight:600;">${veyikilId ? 'Anrejistre' : 'Kreye'}</button>
            `
        });
    }

    async function konfimeVeyikil(veyikilId) {
        window.ModalService.hideError();

        const done = {
            plak: document.getElementById('vPlak').value.trim(),
            mak: document.getElementById('vMak').value.trim(),
            modelVeyikil: document.getElementById('vModel').value.trim(),
            ane: document.getElementById('vAne').value ? Number(document.getElementById('vAne').value) : null,
            kilometraj: Number(document.getElementById('vKilometraj').value) || 0,
            estati: document.getElementById('vEstati').value,
            asiransDatEkspirasyon: document.getElementById('vAsirans').value || null,
            antretyenPwochenDat: document.getElementById('vAntretyen').value || null
        };

        if (!done.plak) {
            window.ModalService.showError('Plak veyikil la obligatwa.');
            return;
        }

        try {
            if (veyikilId) {
                await window.VeyikilSevis.modifyeVeyikil(veyikilId, done);
            } else {
                await window.VeyikilSevis.kreyeVeyikil
