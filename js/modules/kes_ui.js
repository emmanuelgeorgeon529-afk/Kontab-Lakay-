// js/modules/kes_ui.js
// Konekte sou-seksyon "2.6 — Gestion de Trésorerie (Kès)" ak KesService
// NÒT: modil sa a chaje otomatikman lè seksyon #finance prezan nan DOM
// (menm modèl ak admin_ui.js pou Structure), paske pa gen lòt UI Finance
// ki ta deja deklanche yon chajman lazy pou seksyon sa a.

(function () {
    // Mapping rezon prefabrike → { tip, kont, libeleDefo }
    const REZON_PRESET = {
        'retrè_pwopriyetè': { tip: 'sòti', kont: '108', libele: 'Retrè Pwopriyetè' },
        'depo_kapital':     { tip: 'antre', kont: '108', libele: 'Depo Kapital Pwopriyetè' },
        'ranbousman':        { tip: 'sòti', kont: '628', libele: 'Ranbousman Depans' },
        'depo_bank':         { tip: 'sòti', kont: '1020', libele: 'Depo nan Bank' },
        'retrè_bank':        { tip: 'antre', kont: '1020', libele: 'Retrè nan Bank' }
        // 'lòt' jere apa — kont antre manyèlman
    };

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

    // ---------- STATUS CARD + BOUTON ----------

    async function rannStatusCard() {
        const card = document.querySelector('#kesStatusCard');
        const btnLouvri = document.querySelector('#kesBtnLouvri');
        const btnFèmen = document.querySelector('#kesBtnFèmen');
        const btnMouvman = document.querySelector('#kesBtnMouvman');
        if (!card) return null;

        try {
            const sesyon = await window.KesService.getSesyonAktif();

            if (!sesyon) {
                card.innerHTML = `<p style="color:var(--text-muted); font-size:13px;">🔒 Pa gen sesyon kès ouvè kounye a.</p>`;
                if (btnLouvri) btnLouvri.style.display = 'inline-block';
                if (btnFèmen) btnFèmen.style.display = 'none';
                if (btnMouvman) btnMouvman.style.display = 'none';
                rannMouvmanTable([]);
                return null;
            }

            const dateOuvèti = sesyon.dateOuvèti?.toDate ? sesyon.dateOuvèti.toDate().toLocaleString('fr-HT') : '—';
            card.innerHTML = `
                <p style="font-size:13px;"><strong>🟢 Sesyon Ouvè</strong> — depi ${escHtml(dateOuvèti)}</p>
                <p style="font-size:13px; color:var(--text-muted); margin-top:4px;">Montan ouvèti: ${fmtHTG(sesyon.montanOuvèti)} · ${escHtml(sesyon.itilizateNon || 'Enkoni')}</p>
            `;
            if (btnLouvri) btnLouvri.style.display = 'none';
            if (btnFèmen) btnFèmen.style.display = 'inline-block';
            if (btnMouvman) btnMouvman.style.display = 'inline-block';

            return sesyon;
        } catch (e) {
            card.innerHTML = `<p style="color:var(--danger); font-size:13px;">Erè chajman sesyon kès.</p>`;
            console.warn('KesUI: rannStatusCard echwe', e);
            return null;
        }
    }

    // ---------- MOUVMAN SESYON AKTYÈL ----------

    function rannMouvmanTable(lis) {
        const tbody = document.querySelector('#kesMouvmanTableBody');
        if (!tbody) return;
        if (lis.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:16px;">Pa gen mouvman ankò</td></tr>`;
            return;
        }
        tbody.innerHTML = lis.map(m => {
            const lè = m.dat?.toDate ? m.dat.toDate().toLocaleTimeString('fr-HT', { hour: '2-digit', minute: '2-digit' }) : '—';
            const badge = m.tip === 'antre'
                ? `<span class="ged-status" style="background:#D1FAE5; color:#047857;">Antre</span>`
                : `<span class="ged-status" style="background:#FEE2E2; color:#B91C1C;">Sòti</span>`;
            return `<tr>
                <td>${lè}</td>
                <td>${badge}</td>
                <td>${escHtml(m.rezon)}</td>
                <td style="text-align:right;">${fmtHTG(m.montan)}</td>
            </tr>`;
        }).join('');
    }

    async function chajeMouvmanSiSesyonOuvè(sesyon) {
        if (!sesyon) return;
        try {
            const mouvman = await window.KesService.getMouvmanBySession(sesyon.id);
            rannMouvmanTable(mouvman);
        } catch (e) {
            console.warn('KesUI: chajeMouvman echwe', e);
        }
    }

    // ---------- ISTORIK SESYON ----------

    function rannSesyonTable(lis) {
        const tbody = document.querySelector('#kesSesyonTableBody');
        if (!tbody) return;
        if (lis.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:16px;">Pa gen sesyon fèmen ankò</td></tr>`;
            return;
        }
        tbody.innerHTML = lis.map(s => {
            const dat = s.dateOuvèti?.toDate ? s.dateOuvèti.toDate().toLocaleDateString('fr-HT') : '—';
            if (s.estati === 'ouvè') {
                return `<tr><td>${dat}</td><td colspan="3" style="color:var(--secondary); font-weight:600;">🟢 Ankò Ouvè</td></tr>`;
            }
            const ekarKoulè = Math.abs(s.ekar || 0) < 0.01 ? 'var(--secondary)' : 'var(--danger)';
            return `<tr>
                <td>${dat}</td>
                <td style="text-align:right;">${fmtHTG(s.montanFèmtiTeyorik)}</td>
                <td style="text-align:right;">${fmtHTG(s.montanFèmtiReyèl)}</td>
                <td style="text-align:right; color:${ekarKoulè}; font-weight:600;">${(s.ekar || 0) > 0 ? '+' : ''}${fmtHTG(s.ekar)}</td>
            </tr>`;
        }).join('');
    }

    async function chajeSesyonHistorik() {
        try {
            const sesyons = await window.KesService.getSesyons(15);
            rannSesyonTable(sesyons);
        } catch (e) {
            console.warn('KesUI: chajeSesyonHistorik echwe', e);
        }
    }

    // ---------- AKSYON: LOUVRI / FÈMEN SESYON ----------

    async function ouvriSesyon() {
        const montanStr = prompt('Montan kach nan men kounye a (HTG):', '0');
        if (montanStr === null) return;
        const montan = Number(montanStr);
        if (isNaN(montan) || montan < 0) return alert('Montan pa valid.');

        try {
            await window.KesService.ouvriSesyon(montan);
            await rafrechiTou();
        } catch (e) {
            alert('Erè: ' + e.message);
        }
    }

    async function fèmenSesyon() {
        const sesyon = await window.KesService.getSesyonAktif();
        if (!sesyon) return alert('Pa gen sesyon ouvè.');

        const montanStr = prompt('Konte kach fizik nan men kounye a (HTG):', '0');
        if (montanStr === null) return;
        const montan = Number(montanStr);
        if (isNaN(montan) || montan < 0) return alert('Montan pa valid.');

        try {
            const rezilta = await window.KesService.fèmenSesyon(sesyon.id, montan);
            const mesajEkar = Math.abs(rezilta.ekar) < 0.01
                ? 'Kès la ekilib pafètman ✅'
                : `Ekar: ${rezilta.ekar > 0 ? '+' : ''}${rezilta.ekar.toLocaleString('fr-HT')} HTG (yon ekriti jounal otomatik kreye)`;
            alert(`Sesyon fèmen.\nTeyorik: ${rezilta.montanFèmtiTeyorik.toLocaleString('fr-HT')} HTG\nReyèl: ${rezilta.montanFèmtiReyèl.toLocaleString('fr-HT')} HTG\n${mesajEkar}`);
            await rafrechiTou();
        } catch (e) {
            alert('Erè: ' + e.message);
        }
    }

    // ---------- MODAL: NOUVO MOUVMAN ----------

    function openMouvmanModal() {
        document.querySelector('#kesMouvmanRezonSelect').value = 'retrè_pwopriyetè';
        document.querySelector('#kesMouvmanKontManyèl').value = '';
        document.querySelector('#kesMouvmanDeskripsyon').value = '';
        document.querySelector('#kesMouvmanMontan').value = 0;
        onRezonChange();
        hideError('kesMouvmanError');
        document.querySelector('#kesMouvmanModal').style.display = 'flex';
    }

    function closeMouvmanModal() {
        document.querySelector('#kesMouvmanModal').style.display = 'none';
    }

    function onRezonChange() {
        const rezonKle = document.querySelector('#kesMouvmanRezonSelect').value;
        const wrap = document.querySelector('#kesMouvmanKontManyèlWrap');
        wrap.style.display = (rezonKle === 'lòt') ? 'block' : 'none';
    }

    async function submitMouvman() {
        const rezonKle = document.querySelector('#kesMouvmanRezonSelect').value;
        const deskripsyon = document.querySelector('#kesMouvmanDeskripsyon').value.trim();
        const montan = Number(document.querySelector('#kesMouvmanMontan').value);

        if (!montan || montan <= 0) return showError('kesMouvmanError', 'Montan dwe pi gran pase 0.');

        let tip, kont, libele;
        if (rezonKle === 'lòt') {
            const kontManyèl = document.querySelector('#kesMouvmanKontManyèl').value.trim();
            if (!kontManyèl) return showError('kesMouvmanError', 'Antre kòd kont kontrepati a.');
            kont = kontManyèl;
            tip = document.querySelector('#kesMouvmanTipManyèl').value;
            libele = deskripsyon || 'Mouvman manyèl';
        } else {
            const preset = REZON_PRESET[rezonKle];
            if (!preset) return showError('kesMouvmanError', 'Rezon pa valid.');
            tip = preset.tip;
            kont = preset.kont;
            libele = deskripsyon ? `${preset.libele} — ${deskripsyon}` : preset.libele;
        }

        const btn = document.querySelector('#kesMouvmanSubmitBtn');
        btn.disabled = true;
        try {
            await window.KesService.anrejistreMouvman({ tip, montan, kontContrepati: kont, rezon: libele });
            closeMouvmanModal();
            await rafrechiTou();
        } catch (e) {
            showError('kesMouvmanError', e.message);
        } finally {
            btn.disabled = false;
        }
    }

    // ---------- INISYALIZASYON ----------

    async function rafrechiTou() {
        const sesyon = await rannStatusCard();
        await Promise.all([
            chajeMouvmanSiSesyonOuvè(sesyon),
            chajeSesyonHistorik()
        ]);
    }

    function inisyaliseKesUI() {
        if (!window.currentCompanyId) {
            console.warn('kes_ui.js: pa gen bizId disponib');
            return;
        }
        rafrechiTou();
    }

    window.KesUI = {
        ouvriSesyon, fèmenSesyon,
        openMouvmanModal, closeMouvmanModal, onRezonChange, submitMouvman,
        inisyaliseKesUI
    };

    document.addEventListener('DOMContentLoaded', () => {
        if (document.querySelector('#finance')) inisyaliseKesUI();
    });
})();
