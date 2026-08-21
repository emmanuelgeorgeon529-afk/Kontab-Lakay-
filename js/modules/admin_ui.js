// js/modules/admin_ui.js
// Konekte seksyon "Structure, Gouvernance & Administration" ak AdminService
// NÒT: itilizate/wol/pos san aksan pou match ak firestore.rules
// Depann de window.AdminService (adminService.js) ak yon bizId global

(function () {
  let unsubItilizate = null;
  let itilizateKouranLis = [];
  let unsubPèmisyon = null;
  let unsubDemand = null;
  let unsubProfil, unsubBiznis, unsubSucc, unsubSessions, unsubAuditLog, unsubNotif;
  let unsubDepatman, unsubPos;
  let depatmanCache = [];

  function getBizId() {
    return window.currentBizId || localStorage.getItem('bizId');
  }

  function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  }

  function badgeEstati(estati) {
    const styles = {
      aktif:     'background:#D1FAE5; color:#047857;',
      sispann:   'background:#FEF3C7; color:#B45309;',
      dezaktive: 'background:#FEE2E2; color:#B91C1C;'
    };
    const label = { aktif: 'Actif', sispann: 'Suspendu', dezaktive: 'Désactivé' };
    return `<span class="ged-status" style="${styles[estati] || ''}">${label[estati] || estati}</span>`;
  }

  // ---------- 1.7 GESTION UTILISATEURS ----------

  function rannTabloItilizate(lis) {
    const tbody = document.querySelector('#tablo-itilizatè tbody');
    if (!tbody) return;

    if (lis.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">Pa gen itilizate ankò</td></tr>`;
      return;
    }

    tbody.innerHTML = lis.map(u => {
      const badge = badgeEstati(u.estati);
      return `
        <tr data-id="${u.id}">
          <td>${escHtml(u.non || '—')}</td>
          <td>${escHtml(u.imèl || '—')}</td>
          <td>${escHtml(u.depatman || '—')}</td>
          <td>${escHtml(u.wol || '—')}</td>
          <td>${badge}
            <div style="display:flex; gap:6px; margin-top:6px;">
              <button class="btn-chanje-wol" data-id="${u.id}" style="font-size:11px; padding:4px 8px; border-radius:6px; border:1px solid #E2E8F0; background:var(--bg-white);">Chanje Wòl</button>
              ${u.estati === 'aktif'
                ? `<button class="btn-sispann" data-id="${u.id}" style="font-size:11px; padding:4px 8px; border-radius:6px; border:none; background:#FEF3C7; color:#B45309;">Sispann</button>`
                : `<button class="btn-reaktive" data-id="${u.id}" style="font-size:11px; padding:4px 8px; border-radius:6px; border:none; background:#D1FAE5; color:#047857;">Reaktive</button>`}
            </div>
          </td>
        </tr>`;
    }).join('');

    mèteAjouKpi(lis);
    branchEvènmanTablo();
  }

  function mèteAjouKpi(lis) {
    const totalEl = document.querySelector('#kpi-total-itilizatè .value');
    const aktifEl = document.querySelector('#kpi-itilizatè-aktif .value');
    const inaktifEl = document.querySelector('#kpi-itilizatè-inaktif .value');
    if (totalEl) totalEl.textContent = lis.length;
    if (aktifEl) aktifEl.textContent = lis.filter(u => u.estati === 'aktif').length;
    if (inaktifEl) inaktifEl.textContent = lis.filter(u => u.estati !== 'aktif').length;
  }

  function branchEvènmanTablo() {
    document.querySelectorAll('.btn-sispann').forEach(btn => {
      btn.onclick = () => aksyonEstati(btn.dataset.id, 'sispann');
    });
    document.querySelectorAll('.btn-reaktive').forEach(btn => {
      btn.onclick = () => aksyonEstati(btn.dataset.id, 'aktif');
    });
    document.querySelectorAll('.btn-chanje-wol').forEach(btn => {
      btn.onclick = () => ouvriModalWol(btn.dataset.id);
    });
  }

  async function aksyonEstati(itilizateId, nouvoEstati) {
    try {
      await window.AdminService.chanjeEstatiItilizate(getBizId(), itilizateId, nouvoEstati);
    } catch (e) {
      alert('Erè: ' + e.message);
    }
  }

  function ouvriModalWol(itilizateId) {
    const itilizate = itilizateKouranLis.find(u => u.id === itilizateId);
    if (!itilizate) return;

    const wolChwazi = prompt(
      `Nouvo wòl pou ${itilizate.non} (opsyon: ${window.AdminService.WOL_VALID.join(', ')})`,
      itilizate.wol
    );
    if (!wolChwazi) return;

    window.AdminService.chanjeWolItilizate(getBizId(), itilizateId, wolChwazi.trim())
      .catch(e => alert('Erè: ' + e.message));
  }

  function branchBotonNouvoItilizate() {
    const btn = document.querySelector('#btn-nouvo-itilizatè');
    if (!btn) return;
    btn.onclick = async () => {
      const non = prompt('Non konplè:');
      if (!non) return;
      const imèl = prompt('Imèl:');
      if (!imèl) return;
      const wol = prompt(`Wòl (${window.AdminService.WOL_VALID.join(', ')}):`, 'Vande');
      if (!wol) return;

      try {
        await window.AdminService.kreyeItilizate(getBizId(), { non, imèl, wol: wol.trim() });
      } catch (e) {
        alert('Erè: ' + e.message);
      }
    };
  }

  // ---------- 1.8 WÒL & PÈMISYON ----------

  function rannKadWol(pèmisyonDone) {
    const kontenè = document.querySelector('#kad-wòl-pèmisyon');
    if (!kontenè) return;

    kontenè.innerHTML = window.AdminService.WOL_VALID.map(wol => {
      const p = pèmisyonDone[wol] || {};
      const kaz = window.AdminService.MODIL_LIS.map(modil => {
        const val = p[modil] || (p.tout ? true : false);
        const chwazi = val === true ? 'checked' : '';
        return `
          <label style="display:flex; align-items:center; gap:6px; font-size:12px;">
            <input type="checkbox" class="chk-pèmisyon" data-wol="${wol}" data-modil="${modil}" ${chwazi}>
            ${modil}
          </label>`;
      }).join('');

      return `
        <div style="border:1px solid #E2E8F0; border-radius:12px; padding:14px;">
          <strong>${wol}</strong>
          <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:6px; margin-top:10px;">
            ${kaz}
          </div>
          <button class="btn-sove-pèmisyon" data-wol="${wol}" style="margin-top:12px; font-size:11px; padding:6px 12px; border-radius:6px; border:none; background:var(--primary); color:white;">💾 Sove</button>
        </div>`;
    }).join('');

    document.querySelectorAll('.btn-sove-pèmisyon').forEach(btn => {
      btn.onclick = () => sovePèmisyonWol(btn.dataset.wol);
    });
  }

  async function sovePèmisyonWol(wol) {
    const chèk = document.querySelectorAll(`.chk-pèmisyon[data-wol="${wol}"]`);
    const pèmisyonObj = {};
    chèk.forEach(c => {
      if (c.checked) pèmisyonObj[c.dataset.modil] = true;
    });

    try {
      await window.AdminService.aktyaliizePèmisyonWol(getBizId(), wol, pèmisyonObj);
      alert(`Pèmisyon "${wol}" sove.`);
    } catch (e) {
      alert('Erè: ' + e.message);
    }
  }

  function inisyaliizeSeksyonPèmisyon() {
    const bizId = getBizId();
    if (!bizId) return;
    if (unsubPèmisyon) unsubPèmisyon();
    unsubPèmisyon = window.AdminService.abònmanPèmisyon(bizId, rannKadWol);
  }

  // ---------- 1.9 WORKFLOW APWOBASYON ----------

  const ETIKÈT_ETAP = {
    an_atant: { txt: 'An Atant', bg: '#F1F5F9', koulè: 'var(--text-dark)' },
    apwouve_manadjè: { txt: 'Apwouve Manadjè', bg: '#FEF3C7', koulè: '#B45309' },
    apwouve_direktè: { txt: 'Apwouve Direktè', bg: '#DBEAFE', koulè: '#1D4ED8' },
    egzekite: { txt: 'Egzekite', bg: '#D1FAE5', koulè: '#047857' },
    rejte: { txt: 'Rejte', bg: '#FEE2E2', koulè: '#B91C1C' }
  };

  function rannWorkflowApwobasyon(lis) {
    const kontenè = document.querySelector('#lis-demand-apwobasyon');
    if (!kontenè) return;

    const anAtant = lis.filter(d => ['an_atant', 'apwouve_manadjè', 'apwouve_direktè'].includes(d.estati));

    if (anAtant.length === 0) {
      kontenè.innerHTML = `<p style="text-align:center; color:var(--text-muted); font-size:13px;">Pa gen demand an atant</p>`;
      return;
    }

    kontenè.innerHTML = anAtant.map(d => {
      const et = ETIKÈT_ETAP[d.estati];
      let aksyon = '';
      if (d.estati === 'an_atant') {
        aksyon = `<button class="btn-apwouve" data-id="${d.id}" data-etap="manadjè" style="background:var(--primary); color:white; border:none; padding:6px 12px; border-radius:6px; font-size:11px;">Apwouve (Manadjè)</button>`;
      } else if (d.estati === 'apwouve_manadjè') {
        aksyon = `<button class="btn-apwouve" data-id="${d.id}" data-etap="direktè" style="background:var(--primary); color:white; border:none; padding:6px 12px; border-radius:6px; font-size:11px;">Apwouve (Direktè)</button>`;
      } else if (d.estati === 'apwouve_direktè') {
        aksyon = `<button class="btn-egzekite" data-id="${d.id}" style="background:#047857; color:white; border:none; padding:6px 12px; border-radius:6px; font-size:11px;">✓ Egzekite</button>`;
      }

      return `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border:1px solid #E2E8F0; border-radius:10px; margin-bottom:8px;">
          <div>
            <strong>${escHtml(d.tip)}</strong> — ${Number(d.montan).toLocaleString()} HTG
            <div style="font-size:12px; color:var(--text-muted);">${escHtml(d.deskripsyon || '')}</div>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="ged-status" style="background:${et.bg}; color:${et.koulè};">${et.txt}</span>
            ${aksyon}
            <button class="btn-rejte" data-id="${d.id}" style="background:#FEE2E2; color:#B91C1C; border:none; padding:6px 12px; border-radius:6px; font-size:11px;">✗ Rejte</button>
          </div>
        </div>`;
    }).join('');

    branchEvènmanWorkflow();
  }

  function branchEvènmanWorkflow() {
    document.querySelectorAll('.btn-apwouve').forEach(btn => {
      btn.onclick = () => window.AdminService
        .apwouveDemand(getBizId(), btn.dataset.id, btn.dataset.etap)
        .catch(e => alert('Erè: ' + e.message));
    });
    document.querySelectorAll('.btn-egzekite').forEach(btn => {
      btn.onclick = () => window.AdminService
        .egzekiteDemand(getBizId(), btn.dataset.id)
        .catch(e => alert('Erè: ' + e.message));
    });
    document.querySelectorAll('.btn-rejte').forEach(btn => {
      btn.onclick = () => {
        const rezon = prompt('Rezon rejè a:');
        if (rezon === null) return;
        window.AdminService
          .rejteDemand(getBizId(), btn.dataset.id, rezon)
          .catch(e => alert('Erè: ' + e.message));
      };
    });
  }

  function inisyaliizeSeksyonWorkflow() {
    const bizId = getBizId();
    if (!bizId) return;
    if (unsubDemand) unsubDemand();
    unsubDemand = window.AdminService.abònmanDemandApwobasyon(bizId, rannWorkflowApwobasyon);
  }

  // ---------- 1.1 PROFIL ANTREPRIZ ----------

  function rannProfilAntrepriz(done) {
    const el = document.querySelector('#profil-antrepriz-non');
    if (el) el.textContent = done.nonAntrepriz || '—';
  }

  // ---------- 1.2 MULTI-BIZNIS ----------

  function rannTabloBiznis(lis) {
    const tbody = document.querySelector('#tablo-multi-biznis tbody');
    if (!tbody) return;
    tbody.innerHTML = lis.map(b => `
      <tr>
        <td>${escHtml(b.nonAntrepriz)}</td>
        <td>${badgeEstati(b.estati === 'aktif' ? 'aktif' : 'dezaktive')}</td>
        <td style="text-align:right;">
          <a href="#" class="lien-chanje-biz" data-id="${b.id}" style="color:var(--primary); font-weight:600;">Chanje →</a>
        </td>
      </tr>`).join('');

    document.querySelectorAll('.lien-chanje-biz').forEach(a => {
      a.onclick = (e) => {
        e.preventDefault();
        localStorage.setItem('bizId', a.dataset.id);
        window.currentBizId = a.dataset.id;
        location.reload();
      };
    });
  }

  // ---------- 1.3 MULTI-SUCCURSALES ----------

  function rannTabloSuccursale(lis) {
    const tbody = document.querySelector('#tablo-succursale tbody');
    if (!tbody) return;
    tbody.innerHTML = lis.map(s => `
      <tr><td>${escHtml(s.non)}</td><td>${escHtml(s.adrès || '—')}</td><td>${badgeEstati(s.estati)}</td></tr>
    `).join('');
  }

  // ---------- 1.4 ORGANIGRAMME (dérive de 1.5 Depatman) ----------

  function rannOrganigramme(lis) {
    const kontenè = document.querySelector('#organigramme-kontenè');
    if (!kontenè) return;

    const rasin = lis.filter(d => !d.parantId);
    if (rasin.length === 0) {
      kontenè.innerHTML = `<p style="color:var(--text-muted); font-size:13px;">Pa gen depatman defini</p>`;
      return;
    }

    function branch(depatman, nivo) {
      const pitit = lis.filter(d => d.parantId === depatman.id);
      const koulè = nivo === 0 ? 'background:#EEF2FF; color:var(--primary); font-weight:600;' : 'background:#F1F5F9;';
      let html = `<div style="${koulè} border-radius:8px; padding:8px; margin-bottom:4px;">${escHtml(depatman.non)}</div>`;
      if (pitit.length > 0) {
        html += `<div>⬇</div>`;
        pitit.forEach(p => { html += branch(p, nivo + 1); });
      }
      return html;
    }

    kontenè.innerHTML = `<div style="text-align:center; font-size:13px; line-height:1.8;">${rasin.map(r => branch(r, 0)).join('')}</div>`;
  }

  // ---------- 1.5 DEPATMAN ----------

  function rannDepatmanList(lis) {
    depatmanCache = lis;
    const kontenè = document.querySelector('#depatman-kontenè');
    if (kontenè) {
      kontenè.innerHTML = lis.map(d => `
        <span class="ged-status" style="background:#EEF2FF; color:var(--primary); cursor:pointer;" onclick="AdminUI.dezaktiveDepatman('${d.id}')" title="Klike pou dezaktive">${escHtml(d.non)} ✕</span>
      `).join('');
    }
    rannOrganigramme(lis);
  }

  async function ajouteDepatman() {
    const non = prompt('Non depatman an:');
    if (!non || !non.trim()) return;
    const parantOptions = depatmanCache.map(d => `${d.id} = ${d.non}`).join('\n');
    const parantId = depatmanCache.length > 0
      ? prompt(`ID depatman paran (vid = nivo pi wo):\n${parantOptions}`)
      : null;
    try {
      await window.AdminService.kreyeDepatman(getBizId(), { non: non.trim(), parantId: parantId || null });
    } catch (e) { alert('Erè: ' + e.message); }
  }

  async function dezaktiveDepatman(depatmanId) {
    if (!confirm('Dezaktive depatman sa a?')) return;
    try { await window.AdminService.dezaktiveDepatman(getBizId(), depatmanId); }
    catch (e) { alert('Erè: ' + e.message); }
  }

  // ---------- 1.6 POS ----------

  function rannPosList(lis) {
    const kontenè = document.querySelector('#pòs-kontenè');
    if (!kontenè) return;
    kontenè.innerHTML = lis.map(p => `
      <span class="ged-status" style="background:#F1F5F9; color:var(--text-dark); cursor:pointer;" onclick="AdminUI.dezaktivePos('${p.id}')" title="Klike pou dezaktive">${escHtml(p.non)} ✕</span>
    `).join('');
  }

  async function ajoutePos() {
    const non = prompt('Non pòs la:');
    if (!non || !non.trim()) return;
    const depatmanOptions = depatmanCache.map(d => `${d.id} = ${d.non}`).join('\n');
    const depatmanId = depatmanCache.length > 0
      ? prompt(`ID depatman (vid = pa gen):\n${depatmanOptions}`)
      : null;
    try {
      await window.AdminService.kreyePos(getBizId(), { non: non.trim(), depatmanId: depatmanId || null });
    } catch (e) { alert('Erè: ' + e.message); }
  }

  async function dezaktivePos(posId) {
    if (!confirm('Dezaktive pòs sa a?')) return;
    try { await window.AdminService.dezaktivePos(getBizId(), posId); }
    catch (e) { alert('Erè: ' + e.message); }
  }

  function inisyaliizeSeksyonOrganizasyon() {
    const bizId = getBizId();
    if (!bizId) return;
    if (unsubDepatman) unsubDepatman();
    unsubDepatman = window.AdminService.abònmanDepatman(bizId, rannDepatmanList);
    if (unsubPos) unsubPos();
    unsubPos = window.AdminService.abònmanPos(bizId, rannPosList);
  }

  // ---------- 1.10 SESSIONS AKTIF ----------

  function rannTabloSessions(lis) {
    const tbody = document.querySelector('#tablo-sessions tbody');
    if (!tbody) return;
    if (lis.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">Pa gen sesyon aktif</td></tr>`;
      return;
    }
    tbody.innerHTML = lis.map(s => {
      const dat = s.dateKoneksyon?.toDate ? s.dateKoneksyon.toDate().toLocaleString('fr-HT') : '—';
      return `<tr><td>${escHtml(s.itilizateNon)}</td><td>${escHtml(s.aparèy)}</td><td>${escHtml(s.navigatè)}</td><td>${dat}</td></tr>`;
    }).join('');
  }

  // ---------- 1.11 AUDIT LOGS ----------

  function rannTabloAuditLog(lis) {
    const tbody = document.querySelector('#tablo-audit-log tbody');
    if (!tbody) return;
    if (lis.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">Pa gen aktivite ankò</td></tr>`;
      return;
    }
    tbody.innerHTML = lis.map(l => {
      const dat = l.dat?.toDate ? l.dat.toDate().toLocaleString('fr-HT') : '—';
      return `<tr><td>${escHtml(l.itilizateNon)}</td><td>${dat}</td><td>${escHtml(l.modil)}</td><td>${escHtml(l.aksyon)}</td><td>${escHtml(l.ansyenValè)}</td><td>${escHtml(l.nouvoValè)}</td></tr>`;
    }).join('');
  }

  // ---------- 1.12 NOTIFIKASYON ----------

  function rannNotifikasyon(lis) {
    const kontenè = document.querySelector('#lis-notifikasyon-admin');
    if (!kontenè) return;
    const koulè = { ijan: '#FEE2E2', atansyon: '#FEF3C7', enfo: '#DBEAFE' };
    const tèks = { ijan: 'var(--danger)', atansyon: '#B45309', enfo: '#1D4ED8' };
    kontenè.innerHTML = lis.map(n => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-radius:8px; background:${koulè[n.severite] || '#F1F5F9'};">
        <span>${escHtml(n.mesaj)}</span>
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="color:${tèks[n.severite] || 'var(--text-dark)'}; font-weight:600;">${n.severite}</span>
          <button class="btn-rezoud-notif" data-id="${n.id}" style="border:none; background:none; cursor:pointer;">✓</button>
        </div>
      </div>`).join('');

    document.querySelectorAll('.btn-rezoud-notif').forEach(btn => {
      btn.onclick = () => window.AdminService.rezoudNotifikasyon(getBizId(), btn.dataset.id);
    });
  }

  function inisyaliizeRèsSeksyon() {
    const bizId = getBizId();
    if (!bizId) return;

    if (unsubProfil) unsubProfil();
    unsubProfil = window.AdminService.abònmanProfilAntrepriz(bizId, rannProfilAntrepriz);

    if (unsubSucc) unsubSucc();
    unsubSucc = window.AdminService.abònmanSuccursale(bizId, rannTabloSuccursale);

    if (unsubSessions) unsubSessions();
    unsubSessions = window.AdminService.abònmanSessionsAktif(bizId, rannTabloSessions);

    if (unsubAuditLog) unsubAuditLog();
    unsubAuditLog = window.AdminService.abònmanAuditLog(bizId, rannTabloAuditLog);

    if (unsubNotif) unsubNotif();
    unsubNotif = window.AdminService.abònmanNotifikasyon(bizId, rannNotifikasyon);

    const pwopId = window.auth?.currentUser?.uid;
    if (pwopId) {
      if (unsubBiznis) unsubBiznis();
      unsubBiznis = window.AdminService.abònmanBiznisPa(pwopId, rannTabloBiznis);
    }
  }

  // ---------- INISYALIZASYON KONPLE ----------

  function inisyaliseAdminUI() {
    const bizId = getBizId();
    if (!bizId) {
      console.warn('admin_ui.js: pa gen bizId disponib');
      return;
    }
    if (unsubItilizate) unsubItilizate();

    unsubItilizate = window.AdminService.abònmanItilizate(bizId, (lis) => {
      itilizateKouranLis = lis;
      rannTabloItilizate(lis);
    });

    branchBotonNouvoItilizate();
    inisyaliizeSeksyonPèmisyon();
    inisyaliizeSeksyonWorkflow();
    inisyaliizeRèsSeksyon();
    inisyaliizeSeksyonOrganizasyon();
  }

  window.AdminUI = {
    inisyaliseAdminUI,
    ajouteDepatman, dezaktiveDepatman,
    ajoutePos, dezaktivePos
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('#structure')) inisyaliseAdminUI();
  });
})();
