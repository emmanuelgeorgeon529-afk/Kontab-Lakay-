// js/modules/ged_ui.js — Modil 8, konplè (8.1-8.14)
// Depann de window.GedService, window.AdminService, window.ModalService

const GedUI = (() => {

    let dokimanKache = [];
    let dokimanChwaziPouVèsyon = null;
    let dokimanChwaziPouSiyati = null;
    let filtreKategoriAktif = null;
    let gedOff = null;
    let auditGedOff = null;

    async function chajeSeksyonGed() {
        if (gedOff) gedOff();
        gedOff = window.GedService.abònmanDokiman((lis) => {
            dokimanKache = lis;
            chajeDashboardGed();
            chajeBibliyotèk();
            chajeLiaisonErp();
        });
        await chajeNivoAksè();
        await chajeArchivageFiskal();
        await chajeAlètes();
        chajeAuditTrail();
    }

    // ==================================================================
    // 8.1 — DASHBOARD
    // ==================================================================

    function chajeDashboardGed() {
        const aktif = dokimanKache.filter(d => d.estati === 'aktif');
        const konfidansyèl = aktif.filter(d => d.konfidansyalite === 'Confidentiel' || d.konfidansyalite === 'Strictement Confidentiel');
        const totalSize = aktif.reduce((s, d) => s + (d.size || 0), 0);
        const yonMwaAvan = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const mwaSa = aktif.filter(d => (d.dat?.toMillis?.() || 0) >= yonMwaAvan);

        setTxt('gedKpiTotal', aktif.length);
        setTxt('gedKpiMwaSa', mwaSa.length);
        setTxt('gedKpiEspas', (totalSize / (1024 * 1024)).toFixed(1) + ' MB');
        setTxt('gedKpiKonfidansyèl', konfidansyèl.length);
    }

    function setTxt(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    // ==================================================================
    // 8.2 — BIBLIYOTÈK
    // ==================================================================

    function chajeBibliyotèk() {
        const tbody = document.getElementById('gedBibliyotèkTableBody');
        if (!tbody) return;

        let lis = dokimanKache.filter(d => d.estati === 'aktif');
        if (filtreKategoriAktif) lis = lis.filter(d => d.kategori === filtreKategoriAktif);

        if (lis.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">Pa gen dokiman ankò.</td></tr>';
            return;
        }

        tbody.innerHTML = lis.map(d => {
            const dat = d.dat?.toDate?.().toLocaleDateString('fr-HT') || '—';
            return `
                <tr>
                    <td>${d.tit}</td>
                    <td>${d.kategori}</td>
                    <td>${dat}</td>
                    <td>${d.responsabNon || '—'}</td>
                    <td>
                        <span class="ged-status" style="background:#D1FAE5; color:#047857;">Aktif</span>
                        <a href="${d.downloadURL}" target="_blank" style="margin-left:8px; font-size:12px; color:var(--primary); font-weight:600;">⬇️</a>
                        <a href="#" onclick="GedUI.ouvriVèsyonManaj('${d.id}'); return false;" style="margin-left:6px; font-size:12px; color:var(--text-muted); font-weight:600;">🔄</a>
                        <a href="#" onclick="GedUI.ouvriSignatureWorkflow('${d.id}'); return false;" style="margin-left:6px; font-size:12px; color:var(--text-muted); font-weight:600;">🖊️</a>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function filtreKategori(kategori) {
        filtreKategoriAktif = filtreKategoriAktif === kategori ? null : kategori;
        chajeBibliyotèk();
    }

    // ==================================================================
    // 8.3 — UPLOAD
    // ==================================================================

    async function soumèTUpload() {
        const fileInput = document.getElementById('gedUploadFile');
        const tit = document.getElementById('gedUploadTit')?.value;
        const kategori = document.getElementById('gedUploadKategori')?.value;
        const konfidansyalite = document.getElementById('gedUploadKonfidansyalite')?.value;
        const btn = document.getElementById('gedUploadBtn');

        if (!fileInput?.files?.[0]) { alert('Chwazi yon fichye anvan.'); return; }

        if (btn) { btn.disabled = true; btn.textContent = '⏳ Ap voye...'; }
        try {
            await window.GedService.uploadDokiman(fileInput.files[0], { tit, kategori, konfidansyalite });
            fileInput.value = '';
            document.getElementById('gedUploadTit').value = '';
            alert('Dokiman voye avèk siksè.');
        } catch (err) {
            alert('Erè: ' + err.message);
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = '📤 Voye Dokiman'; }
        }
    }

    // ==================================================================
    // 8.4 — RECHÈCH AVANSE
    // ==================================================================

    function rechèchAvanse() {
        const motKle = (document.getElementById('gedRechèchMotKle')?.value || '').toLowerCase();
        const kategori = document.getElementById('gedRechèchKategori')?.value;

        let lis = dokimanKache.filter(d => d.estati === 'aktif');
        if (motKle) lis = lis.filter(d => d.tit.toLowerCase().includes(motKle));
        if (kategori) lis = lis.filter(d => d.kategori === kategori);

        const tbody = document.getElementById('gedBibliyotèkTableBody');
        if (!tbody) return;
        if (lis.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">Pa gen rezilta.</td></tr>';
            return;
        }
        tbody.innerHTML = lis.map(d => `
            <tr><td>${d.tit}</td><td>${d.kategori}</td><td>${d.dat?.toDate?.().toLocaleDateString('fr-HT') || '—'}</td><td>${d.responsabNon || '—'}</td>
            <td><a href="${d.downloadURL}" target="_blank" style="color:var(--primary); font-weight:600;">⬇️</a></td></tr>
        `).join('');
    }

    // ==================================================================
    // 8.5 — VERSIONING
    // ==================================================================

    async function ouvriVèsyonManaj(dokimanId) {
        dokimanChwaziPouVèsyon = dokimanId;
        const dok = dokimanKache.find(d => d.id === dokimanId);
        const istorik = await window.GedService.getVèsyonIstorik(dokimanId);

        window.ModalService.open({
            title: `🔄 Versioning — ${dok?.tit || ''}`,
            bodyHtml: `
                <table class="fin-table">
                    <tr><th>Vèsyon</th><th>Dat</th><th>Modifye pa</th><th></th></tr>
                    ${istorik.map(v => `
                        <tr>
                            <td>Version ${v.nimewo}</td>
                            <td>${v.dat?.toDate?.().toLocaleDateString('fr-HT') || '—'}</td>
                            <td>${v.modifyePa}</td>
                            <td>${v.nimewo !== dok.vèsyonAktyèl ? `<a href="#" onclick="GedUI.retabliVèsyonUI(${v.nimewo}); return false;" style="color:var(--primary); font-weight:600;">↩️ Retabli</a>` : '✅'}</td>
                        </tr>
                    `).join('')}
                </table>
                <div style="margin-top:14px;">
                    <label style="font-size:13px; font-weight:600;">Voye nouvo vèsyon</label>
                    <input type="file" id="gedNouvoVèsyonFile" style="width:100%; margin-top:6px;">
                </div>
            `,
            footerHtml: `
                <button onclick="ModalService.close()" style="background:var(--bg-white); border:1px solid #E2E8F0; padding:8px 16px; border-radius:8px; font-weight:600;">Fèmen</button>
                <button onclick="GedUI.konfimeNouvoVèsyon()" style="background:var(--primary); color:white; border:none; padding:8px 16px; border-radius:8px; font-weight:600;">📤 Voye Vèsyon</button>
            `
        });
    }

    async function konfimeNouvoVèsyon() {
        const file = document.getElementById('gedNouvoVèsyonFile')?.files?.[0];
        if (!file) { window.ModalService.showError('Chwazi yon fichye.'); return; }
        try {
            await window.GedService.uploadNouvoVèsyon(dokimanChwaziPouVèsyon, file);
            window.ModalService.close();
        } catch (err) {
            window.ModalService.showError(err.message);
        }
    }

    async function retabliVèsyonUI(nimewo) {
        if (!confirm(`Retabli vèsyon ${nimewo}?`)) return;
        try {
            await window.GedService.retabliVèsyon(dokimanChwaziPouVèsyon, nimewo);
            window.ModalService.close();
        } catch (err) {
            alert('Erè: ' + err.message);
        }
    }

    // ==================================================================
    // 8.6 — NIVO AKSÈ
    // ==================================================================

    async function chajeNivoAksè() {
        try {
            const konte = await window.GedService.konteDokimanPaKonfidansyalite();
            window.GedService.KONFIDANSYALITE_VALID.forEach(k => {
                const el = document.getElementById('gedNivoAksè_' + k.replace(/[^a-zA-Z]/g, ''));
                if (el) el.textContent = konte[k] + ' dokiman';
            });
        } catch (err) { console.error('Erè nivo aksè:', err); }
    }

    // ==================================================================
    // 8.7 — SIGNATURE ÉLECTRONIQUE
    // ==================================================================

    function ouvriSignatureWorkflow(dokimanId) {
        dokimanChwaziPouSiyati = dokimanId;
        renderSignatureWorkflow(dokimanKache.find(d => d.id === dokimanId));
    }

    function renderSignatureWorkflow(dok) {
        const container = document.getElementById('gedSignatureWorkflow');
        if (!container || !dok) return;
        const ETAP_LABEL = { creation: 'Création', validation: 'Validation', signature: 'Signature', archivage: 'Archivage' };
        const idx = window.GedService.ETAP_SIYATI.indexOf(dok.etapSiyati || 'creation');
        container.innerHTML = `
            <p style="font-size:13px; font-weight:600; margin-bottom:10px;">${dok.tit}</p>
            ${window.GedService.ETAP_SIYATI.map((e, i) => {
                const stil = i < idx ? 'background:#D1FAE5; color:#047857;' : (i === idx ? 'background:#EEF2FF; color:var(--primary);' : 'background:#F1F5F9; color:var(--text-muted);');
                return `<div style="${stil} border-radius:8px; padding:8px; display:inline-block; min-width:180px; margin-bottom:4px;">${ETAP_LABEL[e]}</div>${i < 3 ? '<div>⬇</div>' : ''}`;
            }).join('')}
            ${idx < 3 ? `<div style="margin-top:12px;"><button onclick="GedUI.avanseSignature()" style="background:var(--primary); color:white; border:none; padding:8px 16px; border-radius:8px; font-weight:600;">→ Avanse pwochen etap</button></div>` : '<p style="margin-top:12px; color:#047857; font-weight:600;">✅ Achive</p>'}
        `;
    }

    async function avanseSignature() {
        try {
            await window.GedService.avanseEtapSiyati(dokimanChwaziPouSiyati);
            renderSignatureWorkflow(await window.GedService.getDokimanById(dokimanChwaziPouSiyati));
        } catch (err) { alert('Erè: ' + err.message); }
    }

    // ==================================================================
    // 8.9 — ARCHIVAGE AUTOMATIQUE
    // ==================================================================

    async function lanseArchivageAne() {
        const ane = document.getElementById('gedArchivageAne')?.value || new Date().getFullYear();
        if (!confirm(`Achive tout dokiman ${ane}? Aksyon sa a mete yo an lekti sèlman.`)) return;
        try {
            const kantite = await window.GedService.archiveDokimanPaAne(Number(ane));
            alert(`${kantite} dokiman achive pou egzèsis ${ane}.`);
        } catch (err) { alert('Erè: ' + err.message); }
    }

    // ==================================================================
    // 8.10 — ARCHIVAGE FISCAL
    // ==================================================================

    async function chajeArchivageFiskal() {
        const container = document.getElementById('gedFiskalBadges');
        if (!container) return;
        const badges = await Promise.all(window.GedService.TAG_FISKAL_VALID.map(async (tag) => {
            const lis = await window.GedService.getDokimanPaTagFiskal(tag);
            return `<span class="ged-status" style="background:#F1F5F9; cursor:pointer;" onclick="GedUI.ouvriTagFiskalModal('${tag}')">${tag} (${lis.length})</span>`;
        }));
        container.innerHTML = badges.join('');
    }

    function ouvriTagFiskalModal(tag) {
        const opsyon = dokimanKache.filter(d => d.estati === 'aktif').map(d => `<option value="${d.id}">${d.tit}</option>`).join('');
        window.ModalService.open({
            title: `📚 Tag "${tag}"`,
            bodyHtml: `<label style="font-size:13px; font-weight:600;">Chwazi yon dokiman</label>
                <select id="gedTagDokimanSelect" style="width:100%; padding:8px; border:1px solid #E2E8F0; border-radius:6px; margin-top:6px;">${opsyon}</select>`,
            footerHtml: `
                <button onclick="ModalService.close()" style="background:var(--bg-white); border:1px solid #E2E8F0; padding:8px 16px; border-radius:8px; font-weight:600;">Anile</button>
                <button onclick="GedUI.konfimeTagFiskal('${tag}')" style="background:var(--primary); color:white; border:none; padding:8px 16px; border-radius:8px; font-weight:600;">Tag</button>`
        });
    }

    async function konfimeTagFiskal(tag) {
        const dokimanId = document.getElementById('gedTagDokimanSelect')?.value;
        try {
            await window.GedService.tagDokimanFiskal(dokimanId, tag);
            window.ModalService.close();
            await chajeArchivageFiskal();
        } catch (err) { alert('Erè: ' + err.message); }
    }

    // ==================================================================
    // 8.11 — LIAISON AUTOMATIQUE ERP
    // ==================================================================

    function chajeLiaisonErp() {
        const tbody = document.getElementById('gedLiaisonTableBody');
        if (!tbody) return;
        tbody.innerHTML = window.GedService.LIAISON_ERP.map(l => {
            const kantite = dokimanKache.filter(d => d.kategori === l.kategori && d.estati === 'aktif').length;
            return `<tr><td>${l.kategori} (${kantite})</td><td>${l.modil}</td></tr>`;
        }).join('');
    }

    // ==================================================================
    // 8.12 — ALERTES
    // ==================================================================

    async function chajeAlètes() {
        const container = document.getElementById('gedAlètesContainer');
        if (!container) return;
        try {
            const alèt = await window.GedService.getAlètDokiman();
            if (alèt.length === 0) {
                container.innerHTML = '<p style="font-size:13px; color:var(--text-muted);">Pa gen dokiman ki pral ekspire nan 30 jou k ap vini.</p>';
                return;
            }
            container.innerHTML = alèt.map(d => {
                const ijan = d.joursRestan <= 15;
                const bg = ijan ? '#FEE2E2' : '#FEF3C7';
                const color = ijan ? 'var(--danger)' : '#B45309';
                return `<div style="display:flex; justify-content:space-between; padding:10px; border-radius:8px; background:${bg}; margin-bottom:8px;">
                    <span>⚠️ ${d.tit} pral ekspire nan ${d.joursRestan} jou</span>
                    <span style="color:${color}; font-weight:600;">${ijan ? 'Ijan' : 'Atansyon'}</span>
                </div>`;
            }).join('');
        } catch (err) { console.error('Erè alèt:', err); }
    }

    // ==================================================================
    // 8.13 — AUDIT TRAIL
    // ==================================================================

    function chajeAuditTrail() {
        const tbody = document.getElementById('gedAuditTableBody');
        if (!tbody) return;
        if (auditGedOff) auditGedOff();
        auditGedOff = window.GedService.abònmanAuditGed((lis) => {
            if (lis.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">Pa gen aktivite GED anrejistre ankò.</td></tr>';
                return;
            }
            tbody.innerHTML = lis.map(l => {
                const dat = l.dat?.toDate?.().toLocaleString('fr-HT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) || '—';
                return `<tr><td>${dat}</td><td>${l.itilizateNon}</td><td>${l.aksyon}</td><td>${l.nouvoValè}</td></tr>`;
            }).join('');
        });
    }

    // ==================================================================
    // 8.14 — RAPÒ (ekspòtasyon CSV kote-kliyan)
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

    async function ekspòteRapòKategori() {
        const rapò = await window.GedService.getRapòPaKategori();
        telechajeCSV('dokiman_pa_kategori.csv', ['Kategori', 'Kantite'], rapò.map(r => [r.kategori, r.kantite]));
    }

    async function ekspòteRapòKontraAktif() {
        const lis = await window.GedService.getRapòKontraAktif();
        telechajeCSV('kontra_aktif.csv', ['Tit', 'Dat', 'Responsab'],
            lis.map(d => [d.tit, d.dat?.toDate?.().toLocaleDateString('fr-HT') || '', d.responsabNon]));
    }

    async function ekspòteRapòEspasCloud() {
        const totalSize = dokimanKache.filter(d => d.estati === 'aktif').reduce((s, d) => s + (d.size || 0), 0);
        telechajeCSV('espas_cloud.csv', ['Total Dokiman', 'Espas Itilize (MB)'],
            [[dokimanKache.filter(d => d.estati === 'aktif').length, (totalSize / (1024 * 1024)).toFixed(2)]]);
    }

    return {
        chajeSeksyonGed, filtreKategori, soumèTUpload, rechèchAvanse,
        ouvriVèsyonManaj, konfimeNouvoVèsyon, retabliVèsyonUI,
        ouvriSignatureWorkflow, avanseSignature,
        lanseArchivageAne, ouvriTagFiskalModal, konfimeTagFiskal,
        ekspòteRapòKategori, ekspòteRapòKontraAktif, ekspòteRapòEspasCloud
    };
})();

window.GedUI = GedUI;
