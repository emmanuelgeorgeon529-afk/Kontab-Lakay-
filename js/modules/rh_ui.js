const RhUI = (() => {
  function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = String(str ?? '');
    return d.innerHTML;
  }

  // Anile/Konfime rebati chak fwa yon modal ouvri (ModalService ranplase tout bodyHtml/footerHtml la),
  // kidonk yo dwe re-branche chak fwa apre ModalService.open()
  function wireGenericFooter(onConfirm) {
    document.getElementById('gm-btn-cancel')?.addEventListener('click', () => ModalService.close());
    document.getElementById('gm-btn-confirm')?.addEventListener('click', onConfirm);
  }

  const FOOTER_ANILE_KONFIME = (libeleConfime = 'Anrejistre') => `
    <button id="gm-btn-cancel" style="flex:1; background:var(--bg-white); border:1px solid #E2E8F0; padding:10px; border-radius:8px; font-weight:600;">Anile</button>
    <button id="gm-btn-confirm" style="flex:1; background:var(--primary); color:white; border:none; padding:10px; border-radius:8px; font-weight:600;">${libeleConfime}</button>
  `;

  function anplwayeOptionsHtml() {
    if (_cacheAnplwaye.length === 0) return `<option value="">— Pa gen anplwaye —</option>`;
    return _cacheAnplwaye.map(a => `<option value="${a.id}">${escHtml(a.non)}</option>`).join('');
  }

  function badgeKontra(tip) {
    return tip === 'CDI'
      ? `<span class="ged-status" style="background:#EEF2FF; color:var(--primary);">CDI</span>`
      : `<span class="ged-status" style="background:#F1F5F9;">CDD</span>`;
  }
  let _cacheAnplwaye = [];
  let _cacheDepatman = [];
  let _cachePos = [];
  let _deviz = '';   // Deviz biznis la (soti nan paramet_fiskal_global oswa override) — jamè kodifye an dur

  async function chajeDeviz(bizId) {
    try {
      const param = await PayrollService.chajeParamFiskal(bizId);
      _deviz = param.deviz || '';
    } catch (err) {
      _deviz = '';   // Peyi pa konfigire — pa gen deviz pou afiche, pa kraze UI a
    }
  }
  async function renderAnplwayeTable() {
    const bizId = window.currentCompanyId;
    const tbody = document.getElementById('rh-tab-anplwaye-body');
    if (!bizId || !tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:20px;">⏳ Chajman...</td></tr>`;
    try {
      _cacheAnplwaye = await RhService.listeAnplwayeAktif(bizId);
    } catch (err) {
      console.error('Erè chajman anplwaye:', err);
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--danger); padding:20px;">Erè pandan chajman done yo.</td></tr>`;
      return;
    }
    if (_cacheAnplwaye.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:20px;">Pa gen anplwaye ankò.</td></tr>`;
      return;
    }
    tbody.innerHTML = _cacheAnplwaye.map((a, i) => `
      <tr>
        <td>EMP-${String(i + 1).padStart(3, '0')}</td>
        <td>${escHtml(a.non)}</td>
        <td>${escHtml(a.depatman) || '—'}</td>
        <td>${escHtml(a.pozisyon) || '—'}</td>
        <td style="white-space:nowrap;">${badgeKontra(a.tipKontra)}</td>
        <td style="text-align:right; white-space:nowrap;">${(a.salèBaz || 0).toLocaleString('fr-HT')} ${_deviz}</td>
        <td style="text-align:right;">
          <button class="rh-btn-modifye" data-id="${a.id}" style="background:none; border:none; cursor:pointer;">✏️</button>
          <button class="rh-btn-dezaktive" data-id="${a.id}" style="background:none; border:none; cursor:pointer;">🗑️</button>
        </td>
      </tr>
    `).join('');
    tbody.querySelectorAll('.rh-btn-modifye').forEach(btn =>
      btn.addEventListener('click', () => ouvriModalAnplwaye(btn.dataset.id))
    );
    tbody.querySelectorAll('.rh-btn-dezaktive').forEach(btn =>
      btn.addEventListener('click', () => dezaktiveAnplwayeUI(btn.dataset.id))
    );
  }
  function ouvriModalAnplwaye(anplwayeId) {
    const a = anplwayeId ? _cacheAnplwaye.find(x => x.id === anplwayeId) : null;

    const orèOptions = `<option value="">— Pa asiyen —</option>` +
      _cacheOrè.map(o => `<option value="${o.id}" ${a && a.orèTravayId === o.id ? 'selected' : ''}>${o.flexible ? '🔄 ' + escHtml(o.non) : `${escHtml(o.non)} (${escHtml(o.lèDebi)}-${escHtml(o.lèFen)})`}</option>`).join('');

    // Si Modil 1 (Structure) gen depatman/pòs konfigire, itilize yon <select> pou evite
    // dòb/typo; sinon rekile sou tèks lib pou pa bloke kreyasyon anplwaye.
    const depatmanField = _cacheDepatman.length > 0
      ? `<select id="ma-depatman" style="width:100%; padding:8px; margin:4px 0 12px; border:1px solid #E2E8F0; border-radius:8px;">
          <option value="">— Chwazi —</option>
          ${_cacheDepatman.map(d => `<option value="${escHtml(d.non)}" ${a && a.depatman === d.non ? 'selected' : ''}>${escHtml(d.non)}</option>`).join('')}
        </select>`
      : `<input id="ma-depatman" type="text" value="${a ? escHtml(a.depatman || '') : ''}" style="width:100%; padding:8px; margin:4px 0 12px; border:1px solid #E2E8F0; border-radius:8px;">`;

    const pozisyonField = _cachePos.length > 0
      ? `<select id="ma-pozisyon" style="width:100%; padding:8px; margin:4px 0 12px; border:1px solid #E2E8F0; border-radius:8px;">
          <option value="">— Chwazi —</option>
          ${_cachePos.map(p => `<option value="${escHtml(p.non)}" ${a && a.pozisyon === p.non ? 'selected' : ''}>${escHtml(p.non)}</option>`).join('')}
        </select>`
      : `<input id="ma-pozisyon" type="text" value="${a ? escHtml(a.pozisyon || '') : ''}" style="width:100%; padding:8px; margin:4px 0 12px; border:1px solid #E2E8F0; border-radius:8px;">`;

    const bodyHtml = `
      <input type="hidden" id="ma-id" value="${a ? a.id : ''}">
      <label style="font-size:13px; color:var(--text-muted);">Non Konplè</label>
      <input id="ma-non" type="text" value="${a ? escHtml(a.non) : ''}" style="width:100%; padding:8px; margin:4px 0 12px; border:1px solid #E2E8F0; border-radius:8px;">

      <label style="font-size:13px; color:var(--text-muted);">Depatman</label>
      ${depatmanField}

      <label style="font-size:13px; color:var(--text-muted);">Pozisyon</label>
      ${pozisyonField}

      <label style="font-size:13px; color:var(--text-muted);">Tip Kontra</label>
      <select id="ma-kontra" style="width:100%; padding:8px; margin:4px 0 12px; border:1px solid #E2E8F0; border-radius:8px;">
        <option value="CDI" ${(!a || a.tipKontra === 'CDI') ? 'selected' : ''}>CDI</option>
        <option value="CDD" ${a && a.tipKontra === 'CDD' ? 'selected' : ''}>CDD</option>
      </select>

      <div id="ma-dat-fen-wrap" style="display:${a && a.tipKontra === 'CDD' ? 'block' : 'none'};">
        <label style="font-size:13px; color:var(--text-muted);">Dat Fen Kontra (CDD)</label>
        <input id="ma-dat-fen" type="date" value="${a ? (a.datFenKontra || '') : ''}" style="width:100%; padding:8px; margin:4px 0 12px; border:1px solid #E2E8F0; border-radius:8px;">
      </div>

      <label style="font-size:13px; color:var(--text-muted);">Orè Travay</label>
      <select id="ma-orè" style="width:100%; padding:8px; margin:4px 0 12px; border:1px solid #E2E8F0; border-radius:8px;">${orèOptions}</select>

      <label style="font-size:13px; color:var(--text-muted);">Salè Baz (${_deviz})</label>
      <input id="ma-salè" type="number" min="0" value="${a ? a.salèBaz : ''}" style="width:100%; padding:8px; margin:4px 0 12px; border:1px solid #E2E8F0; border-radius:8px;">

      <label style="font-size:13px; color:var(--text-muted);">NIF</label>
      <input id="ma-nif" type="text" value="${a ? escHtml(a.niFiskal || '') : ''}" style="width:100%; padding:8px; margin:4px 0 12px; border:1px solid #E2E8F0; border-radius:8px;">

      <label style="font-size:13px; color:var(--text-muted);">Nimewo ONA</label>
      <input id="ma-ona" type="text" value="${a ? escHtml(a.niONA || '') : ''}" style="width:100%; padding:8px; margin:4px 0 16px; border:1px solid #E2E8F0; border-radius:8px;">
    `;

    ModalService.open({
      title: a ? 'Modifye Anplwaye' : 'Nouvo Anplwaye',
      bodyHtml,
      footerHtml: FOOTER_ANILE_KONFIME('Anrejistre')
    });

    document.getElementById('ma-kontra').addEventListener('change', (e) => {
      document.getElementById('ma-dat-fen-wrap').style.display = e.target.value === 'CDD' ? 'block' : 'none';
    });

    wireGenericFooter(anrejistreAnplwayeUI);
  }

  async function anrejistreAnplwayeUI() {
    const bizId = window.currentCompanyId;
    const anplwayeId = document.getElementById('ma-id').value;
    const done = {
      non: document.getElementById('ma-non').value.trim(),
      depatman: document.getElementById('ma-depatman').value.trim(),
      pozisyon: document.getElementById('ma-pozisyon').value.trim(),
      tipKontra: document.getElementById('ma-kontra').value,
      datFenKontra: document.getElementById('ma-dat-fen')?.value || null,
      salèBaz: Number(document.getElementById('ma-salè').value) || 0,
      niFiskal: document.getElementById('ma-nif').value.trim(),
      niONA: document.getElementById('ma-ona').value.trim(),
      orèTravayId: document.getElementById('ma-orè').value || null
    };
    if (!done.non) { ModalService.showError('Antre non anplwaye a.'); return; }
    if (done.salèBaz <= 0) { ModalService.showError('Antre yon salè valid.'); return; }

    const btn = document.getElementById('gm-btn-confirm');
    if (btn) btn.disabled = true;
    try {
      if (anplwayeId) {
        await RhService.modifyeAnplwaye(bizId, anplwayeId, done);
      } else {
        await RhService.kreyeAnplwaye(bizId, done, null);
      }
      ModalService.close();
      renderAnplwayeTable();
    } catch (err) {
      console.error('Erè anrejistreman anplwaye:', err);
      ModalService.showError('Erè: ' + err.message);
    } finally {
      if (btn) btn.disabled = false;
    }
  }
  async function dezaktiveAnplwayeUI(anplwayeId) {
    if (!confirm('Ou sèten ou vle dezaktive anplwaye sa a?')) return;
    try {
      await RhService.dezaktiveAnplwaye(window.currentCompanyId, anplwayeId, 'Dezaktive via UI');
      renderAnplwayeTable();
    } catch (err) {
      console.error('Erè dezaktivasyon:', err);
      alert('Erè: ' + err.message);
    }
  }
  function badgeEstatiKonje(estati) {
    // "An Atant" an vyolèt — diferan de "An Reta" (jòn/oranj) pou evite konfizyon vizyèl
    if (estati === 'AnAtant') return `<span class="ged-status" style="background:#EDE9FE; color:#6D28D9;">An Atant RH</span>`;
    if (estati === 'Apwouve') return `<span class="ged-status" style="background:#D1FAE5; color:#047857;">Apwouve</span>`;
    if (estati === 'Rejte') return `<span class="ged-status" style="background:#FEE2E2; color:#B91C1C;">Rejte</span>`;
    return `<span class="ged-status" style="background:#F1F5F9;">${estati}</span>`;
  }

  async function renderDashboard() {
    const bizId = window.currentCompanyId;
    if (!bizId) return;

    const setVal = (id, val) => {
      const el = document.querySelector(`#${id} .value`);
      if (el) el.textContent = val;
    };

    try {
      const [touAnplwaye, aktif, kontraExpire, anKonje, pewolMwa] = await Promise.all([
        RhService.listeTouAnplwaye(bizId),
        RhService.listeAnplwayeAktif(bizId),
        RhService.listeKontraKapExpire(bizId),
        RhService.listeAnplwayeAnKonjeKounyeya(bizId),
        PayrollService.jwennPewolPaPeryòd(bizId, pèryòdKounyeya())
      ]);
      setVal('kpi-rh-total-anplwaye', touAnplwaye.length);
      setVal('kpi-rh-anplwaye-aktif', aktif.length);
      setVal('kpi-rh-anplwaye-konje', anKonje);
      setVal('kpi-rh-kontra-ekspire', kontraExpire.length);
      setVal('kpi-rh-pewol-mwa', pewolMwa ? pewolMwa.totaux.net.toLocaleString('fr-HT') + ' ' + _deviz : '—');
    } catch (err) {
      console.error('Erè chajman dashboard RH:', err);
    }
  }

  async function renderKonjeTable() {
    const bizId = window.currentCompanyId;
    const tbody = document.getElementById('rh-tab-konje-body');
    if (!bizId || !tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:20px;">⏳ Chajman...</td></tr>`;

    let demann;
    try {
      demann = await RhService.listeTouDemandKonje(bizId);
    } catch (err) {
      console.error('Erè chajman demann konje:', err);
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--danger); padding:20px;">Erè pandan chajman done yo.</td></tr>`;
      return;
    }

    if (demann.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:20px;">Pa gen demann konje ankò.</td></tr>`;
      return;
    }

    tbody.innerHTML = demann.map(k => {
      const anplwaye = _cacheAnplwaye.find(a => a.id === k.anplwayeId);
      const nonAnplwaye = anplwaye ? anplwaye.non : k.anplwayeId;
      const aksyon = k.estati === 'AnAtant'
        ? `<button class="rh-btn-apwouve" data-id="${k.id}" style="background:none; border:none; cursor:pointer;">✅</button>
           <button class="rh-btn-rejte" data-id="${k.id}" style="background:none; border:none; cursor:pointer;">❌</button>`
        : '';
      return `
        <tr>
          <td>${escHtml(nonAnplwaye)}</td>
          <td>Konje ${escHtml(k.tip)}</td>
          <td>${escHtml(k.datDebi)} - ${escHtml(k.datFen)}</td>
          <td style="white-space:nowrap;">${badgeEstatiKonje(k.estati)}</td>
          <td style="text-align:right;">${aksyon}</td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('.rh-btn-apwouve').forEach(btn =>
      btn.addEventListener('click', () => tretDemandKonjeUI(btn.dataset.id, 'Apwouve'))
    );
    tbody.querySelectorAll('.rh-btn-rejte').forEach(btn =>
      btn.addEventListener('click', () => tretDemandKonjeUI(btn.dataset.id, 'Rejte'))
    );
  }

  async function tretDemandKonjeUI(demanId, deSizyon) {
    const uid = firebase.auth().currentUser?.uid || null;
    try {
      await RhService.tretDemandKonje(window.currentCompanyId, demanId, deSizyon, uid, '');
      renderKonjeTable();
      renderDashboard(); // "Anplwaye an Konje" ka chanje apre yon apwobasyon
    } catch (err) {
      console.error('Erè tretman demann konje:', err);
      alert('Erè: ' + err.message);
    }
  }

  function ouvriModalKonje() {
    const bodyHtml = `
      <label style="font-size:13px; color:var(--text-muted);">Anplwaye</label>
      <select id="mk-anplwaye" style="width:100%; padding:8px; margin:4px 0 12px; border:1px solid #E2E8F0; border-radius:8px;">${anplwayeOptionsHtml()}</select>

      <label style="font-size:13px; color:var(--text-muted);">Tip Konje</label>
      <select id="mk-tip" style="width:100%; padding:8px; margin:4px 0 12px; border:1px solid #E2E8F0; border-radius:8px;">
        <option value="Anyèl">Konje Anyèl</option>
        <option value="Maladi">Konje Maladi</option>
        <option value="Matènite">Konje Matènite</option>
        <option value="Fòmasyon">Konje Fòmasyon</option>
        <option value="Espesyal">Konje Espesyal</option>
      </select>

      <label style="font-size:13px; color:var(--text-muted);">Dat Debi</label>
      <input id="mk-dat-debi" type="date" style="width:100%; padding:8px; margin:4px 0 12px; border:1px solid #E2E8F0; border-radius:8px;">

      <label style="font-size:13px; color:var(--text-muted);">Dat Fen</label>
      <input id="mk-dat-fen" type="date" style="width:100%; padding:8px; margin:4px 0 12px; border:1px solid #E2E8F0; border-radius:8px;">

      <label style="font-size:13px; color:var(--text-muted);">Rezon (opsyonèl)</label>
      <input id="mk-rezon" type="text" style="width:100%; padding:8px; margin:4px 0 16px; border:1px solid #E2E8F0; border-radius:8px;">
    `;

    ModalService.open({ title: 'Nouvo Demann Konje', bodyHtml, footerHtml: FOOTER_ANILE_KONFIME('Soumèt') });
    wireGenericFooter(soumetKonjeUI);
  }

  async function soumetKonjeUI() {
    const bizId = window.currentCompanyId;
    const anplwayeId = document.getElementById('mk-anplwaye').value;
    const done = {
      tip: document.getElementById('mk-tip').value,
      datDebi: document.getElementById('mk-dat-debi').value,
      datFen: document.getElementById('mk-dat-fen').value,
      rezon: document.getElementById('mk-rezon').value.trim()
    };

    if (!anplwayeId) { ModalService.showError('Pa gen anplwaye disponib — kreye yon anplwaye anvan.'); return; }
    if (!done.datDebi || !done.datFen) { ModalService.showError('Antre dat debi ak dat fen.'); return; }
    if (done.datFen < done.datDebi) { ModalService.showError('Dat fen pa ka anvan dat debi.'); return; }

    const uid = firebase.auth().currentUser?.uid || null;
    const btn = document.getElementById('gm-btn-confirm');
    if (btn) btn.disabled = true;
    try {
      await RhService.soumetDemandKonje(bizId, uid, anplwayeId, done);
      ModalService.close();
      renderKonjeTable();
    } catch (err) {
      console.error('Erè soumèt konje:', err);
      ModalService.showError('Erè: ' + err.message);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function pèryòdKounyeya() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  async function renderPewolTable() {
    const bizId = window.currentCompanyId;
    const tbody = document.getElementById('rh-tab-pewol-body');
    if (!bizId || !tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:20px;">⏳ Chajman...</td></tr>`;

    let pewolList;
    try {
      pewolList = await PayrollService.listeTouPewol(bizId);
    } catch (err) {
      console.error('Erè chajman pewòl:', err);
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--danger); padding:20px;">Erè pandan chajman done yo.</td></tr>`;
      return;
    }

    if (pewolList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:20px;">Pa gen pewòl jenere ankò.</td></tr>`;
      return;
    }

    const liy = [];
    pewolList.forEach(p => {
      p.fichSale.forEach(f => {
        liy.push(`
          <tr>
            <td>${escHtml(p.nimewoPewol || p.peryòd)}</td>
            <td>${escHtml(f.non)}</td>
            <td style="text-align:right; white-space:nowrap;">${(f.salèBrit || 0).toLocaleString('fr-HT')}</td>
            <td style="text-align:right; color:var(--danger); white-space:nowrap;">-${(f.totalDediksyon || 0).toLocaleString('fr-HT')}</td>
            <td style="text-align:right; font-weight:600; white-space:nowrap;">${(f.salèNet || 0).toLocaleString('fr-HT')} ${_deviz}</td>
          </tr>`);
      });
    });
    tbody.innerHTML = liy.join('');
  }

  function badgeEstatiAvans(a) {
    if (a.estati === 'AnAtant') return `<span class="ged-status" style="background:#EDE9FE; color:#6D28D9;">An Atant</span>`;
    if (a.estati === 'Rejte') return `<span class="ged-status" style="background:#FEE2E2; color:#B91C1C;">Rejte</span>`;
    // Apwouve
    return a.rekipere
      ? `<span class="ged-status" style="background:#D1FAE5; color:#047857;">Rekipere</span>`
      : `<span class="ged-status" style="background:#DBEAFE; color:#1D4ED8;">Apwouve — an atant pewòl</span>`;
  }

  async function renderAvansTable() {
    const bizId = window.currentCompanyId;
    const tbody = document.getElementById('rh-tab-avans-body');
    if (!bizId || !tbody) return;

    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:20px;">⏳ Chajman...</td></tr>`;

    let avans;
    try {
      avans = await RhService.listeTouAvansSale(bizId);
    } catch (err) {
      console.error('Erè chajman avans:', err);
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--danger); padding:20px;">Erè pandan chajman done yo.</td></tr>`;
      return;
    }

    if (avans.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:20px;">Pa gen demann avans ankò.</td></tr>`;
      return;
    }

    tbody.innerHTML = avans.map(a => {
      const aksyon = a.estati === 'AnAtant'
        ? `<button class="rh-btn-avans-apwouve" data-id="${a.id}" style="background:none; border:none; cursor:pointer;">✅</button>
           <button class="rh-btn-avans-rejte" data-id="${a.id}" style="background:none; border:none; cursor:pointer;">❌</button>`
        : '';
      return `
        <tr>
          <td>${escHtml(a.non)}</td>
          <td style="text-align:right; white-space:nowrap;">${(a.montan || 0).toLocaleString('fr-HT')} ${_deviz}</td>
          <td style="white-space:nowrap;">${badgeEstatiAvans(a)}</td>
          <td style="text-align:right;">${aksyon}</td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('.rh-btn-avans-apwouve').forEach(btn =>
      btn.addEventListener('click', () => tretAvansUI(btn.dataset.id, 'Apwouve'))
    );
    tbody.querySelectorAll('.rh-btn-avans-rejte').forEach(btn =>
      btn.addEventListener('click', () => tretAvansUI(btn.dataset.id, 'Rejte'))
    );
  }

  async function tretAvansUI(avansId, deSizyon) {
    const uid = firebase.auth().currentUser?.uid || null;
    try {
      await RhService.tretAvansSale(window.currentCompanyId, avansId, deSizyon, uid);
      renderAvansTable();
    } catch (err) {
      console.error('Erè tretman avans:', err);
      alert('Erè: ' + err.message);
    }
  }

  function ouvriModalAvans() {
    const bodyHtml = `
      <label style="font-size:13px; color:var(--text-muted);">Anplwaye</label>
      <select id="mv-anplwaye" style="width:100%; padding:8px; margin:4px 0 12px; border:1px solid #E2E8F0; border-radius:8px;">${anplwayeOptionsHtml()}</select>

      <label style="font-size:13px; color:var(--text-muted);">Montan (${_deviz})</label>
      <input id="mv-montan" type="number" min="0" style="width:100%; padding:8px; margin:4px 0 16px; border:1px solid #E2E8F0; border-radius:8px;">
    `;
    ModalService.open({ title: 'Nouvo Demann Avans', bodyHtml, footerHtml: FOOTER_ANILE_KONFIME('Soumèt') });
    wireGenericFooter(soumetAvansUI);
  }

  async function soumetAvansUI() {
    const bizId = window.currentCompanyId;
    const anplwayeId = document.getElementById('mv-anplwaye').value;
    const montan = Number(document.getElementById('mv-montan').value) || 0;

    if (!anplwayeId) { ModalService.showError('Pa gen anplwaye disponib — kreye yon anplwaye anvan.'); return; }
    if (montan <= 0) { ModalService.showError('Antre yon montan valid.'); return; }

    const anplwaye = _cacheAnplwaye.find(a => a.id === anplwayeId);
    const uid = firebase.auth().currentUser?.uid || null;

    const btn = document.getElementById('gm-btn-confirm');
    if (btn) btn.disabled = true;
    try {
      await RhService.soumetAvansSale(bizId, uid, anplwayeId, anplwaye ? anplwaye.non : '', montan);
      ModalService.close();
      renderAvansTable();
    } catch (err) {
      console.error('Erè soumèt avans:', err);
      ModalService.showError('Erè: ' + err.message);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  // ---------- Modal Woule Pewòl (6.7) ----------
  let _previzyonAnplwaye = null;
  let _previzyonPeryòd = null;
  let _previzyonAvansIds = null;

  async function ouvriModalKonfigKontPewol() {
    const bizId = window.currentCompanyId;
    let kont = {};
    let param = null;
    let erèParam = null;

    try {
      kont = await RhService.jwennKontPewòl(bizId);
    } catch (err) {
      console.error('Erè chajman kont pewòl:', err);
    }
    try {
      param = await PayrollService.chajeParamFiskal(bizId);
    } catch (err) {
      erèParam = err.message;
    }

    const kotizasyon = kont.kotizasyon || {};

    // Yon chan pou chak kotizasyon PEYI AKTYÈL biznis la itilize — jenerik, pa "ona"/"ofatma" kodifye
    const kotizasyonFields = param
      ? param.kotizasyon.map(k => `
          <label style="font-size:13px; color:var(--text-muted);">${escHtml(k.non)} à Payer</label>
          <input class="mkp-kotizasyon" data-kotizasyon-id="${k.id}" type="text" value="${escHtml(kotizasyon[k.id] || '')}" placeholder="Kòd kont" style="width:100%; padding:8px; margin:4px 0 12px; border:1px solid #E2E8F0; border-radius:8px;">
        `).join('')
      : `<p style="font-size:13px; color:var(--danger);">⚠️ ${escHtml(erèParam || 'Peyi biznis la poko konfigire.')}</p>`;

    const bodyHtml = `
      <p style="font-size:12px; color:var(--text-muted); margin-bottom:14px;">Antre kòd kont ki soti nan plan_comptes biznis ou a. Chan ki rete vid ap itilize non deskriptif nan ekriti kontab la olye yon kòd.</p>

      <label style="font-size:13px; color:var(--text-muted);">Depans Salè (Brit)</label>
      <input id="mkp-salè-brit" type="text" value="${escHtml(kont.salèBrit || '')}" placeholder="Kòd kont" style="width:100%; padding:8px; margin:4px 0 12px; border:1px solid #E2E8F0; border-radius:8px;">

      <label style="font-size:13px; color:var(--text-muted);">Kès (peman kach)</label>
      <input id="mkp-kach" type="text" value="${escHtml(kont.kach || '')}" placeholder="Kòd kont" style="width:100%; padding:8px; margin:4px 0 12px; border:1px solid #E2E8F0; border-radius:8px;">

      <label style="font-size:13px; color:var(--text-muted);">Bank (peman transfè)</label>
      <input id="mkp-bank" type="text" value="${escHtml(kont.bank || '')}" placeholder="Kòd kont" style="width:100%; padding:8px; margin:4px 0 12px; border:1px solid #E2E8F0; border-radius:8px;">

      <label style="font-size:13px; color:var(--text-muted);">IRI / Enpo sou Revni à Payer</label>
      <input id="mkp-enpo" type="text" value="${escHtml(kont.enpo || '')}" placeholder="Kòd kont" style="width:100%; padding:8px; margin:4px 0 12px; border:1px solid #E2E8F0; border-radius:8px;">

      <label style="font-size:13px; color:var(--text-muted);">Avans Salè à Recouvre</label>
      <input id="mkp-avans" type="text" value="${escHtml(kont.avansARecouvre || '')}" placeholder="Kòd kont" style="width:100%; padding:8px; margin:4px 0 12px; border:1px solid #E2E8F0; border-radius:8px;">

      <label style="font-size:13px; color:var(--text-muted);">Charj Patwonal (depans)</label>
      <input id="mkp-chaj" type="text" value="${escHtml(kont.chajPatwonal || '')}" placeholder="Kòd kont" style="width:100%; padding:8px; margin:4px 0 16px; border:1px solid #E2E8F0; border-radius:8px;">

      <hr style="border:none; border-top:1px solid #E2E8F0; margin:16px 0;">
      <p style="font-size:12px; font-weight:600; color:var(--text-muted); margin-bottom:10px;">Kotizasyon Sosyal (${param ? escHtml(param.peyiNon || '') : 'peyi pa konfigire'})</p>
      ${kotizasyonFields}
    `;
    ModalService.open({ title: 'Konfigire Kòd Kont Pewòl', bodyHtml, footerHtml: FOOTER_ANILE_KONFIME('Anrejistre') });
    wireGenericFooter(anrejistreKontPewolUI);
  }

  async function anrejistreKontPewolUI() {
    const bizId = window.currentCompanyId;
    const kotizasyon = {};
    document.querySelectorAll('.mkp-kotizasyon').forEach(input => {
      const val = input.value.trim();
      if (val) kotizasyon[input.dataset.kotizasyonId] = val;
    });

    const kont = {
      salèBrit: document.getElementById('mkp-salè-brit').value.trim() || null,
      kach: document.getElementById('mkp-kach').value.trim() || null,
      bank: document.getElementById('mkp-bank').value.trim() || null,
      enpo: document.getElementById('mkp-enpo').value.trim() || null,
      avansARecouvre: document.getElementById('mkp-avans').value.trim() || null,
      chajPatwonal: document.getElementById('mkp-chaj').value.trim() || null,
      kotizasyon
    };

    const btn = document.getElementById('gm-btn-confirm');
    if (btn) btn.disabled = true;
    try {
      await RhService.sovgadeKontPewòl(bizId, kont);
      ModalService.close();
    } catch (err) {
      console.error('Erè anrejistreman kont pewòl:', err);
      ModalService.showError('Erè: ' + err.message);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function ouvriModalPewol() {
    const bodyHtml = `
      <label style="font-size:13px; color:var(--text-muted);">Peryòd</label>
      <input id="mp-peryòd" type="month" value="${pèryòdKounyeya()}" style="width:100%; padding:8px; margin:4px 0 14px; border:1px solid #E2E8F0; border-radius:8px;">

      <label style="font-size:13px; color:var(--text-muted);">Metòd Peman</label>
      <select id="mp-metòd-peman" style="width:100%; padding:8px; margin:4px 0 14px; border:1px solid #E2E8F0; border-radius:8px;">
        <option value="kach">💵 Kach</option>
        <option value="transfè">🏦 Transfè Bank</option>
      </select>

      <button id="mp-previzyalize" style="width:100%; background:var(--bg-white); border:1px solid #E2E8F0; padding:10px; border-radius:8px; font-weight:600; margin-bottom:14px;">👁️ Previzyalize Kalkil la</button>

      <div id="mp-avètisman" style="display:none; background:#FEF3C7; color:#B45309; padding:10px; border-radius:8px; font-size:13px; margin-bottom:14px;"></div>

      <div id="mp-previzyon" style="display:none;">
        <table class="fin-table" style="font-size:12px;">
          <tr><th>Anplwaye</th><th>Brit</th><th>Nèt</th></tr>
          <tbody id="mp-previzyon-body"></tbody>
        </table>
        <p style="font-weight:600; text-align:right; margin-top:10px; font-size:14px;">Total Net: <span id="mp-total-net">—</span></p>
      </div>
    `;
    const footerHtml = FOOTER_ANILE_KONFIME('Konfime & Jenere');

    ModalService.open({ title: 'Woule Pewòl', bodyHtml, footerHtml });

    document.getElementById('gm-btn-confirm').disabled = true;
    document.getElementById('mp-previzyalize').addEventListener('click', previzyalizePewolUI);
    wireGenericFooter(konfimePewolUI);
  }

  async function previzyalizePewolUI() {
    const bizId = window.currentCompanyId;
    const peryòd = document.getElementById('mp-peryòd').value; // "YYYY-MM"
    const avètisman = document.getElementById('mp-avètisman');
    const previzyon = document.getElementById('mp-previzyon');
    const btnKonfime = document.getElementById('gm-btn-confirm');

    avètisman.style.display = 'none';
    previzyon.style.display = 'none';
    btnKonfime.disabled = true;
    _previzyonAnplwaye = null;
    _previzyonPeryòd = null;
    _previzyonAvansIds = null;

    if (!peryòd) { ModalService.showError('Chwazi yon peryòd.'); return; }
    ModalService.hideError();

    try {
      const dejaGenyen = await PayrollService.egzisteDejaPourPeryòd(bizId, peryòd);
      if (dejaGenyen) {
        avètisman.textContent = `⚠️ Yon pewòl deja jenere pou peryòd ${peryòd}. Ou pa ka jenere l ankò.`;
        avètisman.style.display = 'block';
        return;
      }

      const aktif = await RhService.listeAnplwayeAktif(bizId);
      if (aktif.length === 0) {
        avètisman.textContent = `⚠️ Pa gen anplwaye aktif pou jenere yon pewòl.`;
        avètisman.style.display = 'block';
        return;
      }

      const fichSale = [];
      const tousAvansIds = [];

      for (const a of aktif) {
        const avansNonRekipire = await RhService.listeAvansNonRekipirePaAnplwaye(bizId, a.id);
        const totalAvans = avansNonRekipire.reduce((s, av) => s + (av.montan || 0), 0);
        avansNonRekipire.forEach(av => tousAvansIds.push(av.id));

        const f = await PayrollService.kalkileFichSale(bizId, a.salèBaz, { avansADediwi: totalAvans });
        fichSale.push({
          anplwayeId: a.id, non: a.non, salèBaz: a.salèBaz,
          avantaj: { avansADediwi: totalAvans }, ...f
        });
      }

      const totalNet = fichSale.reduce((s, f) => s + f.salèNet, 0);

      document.getElementById('mp-previzyon-body').innerHTML = fichSale.map(f => `
        <tr>
          <td>${escHtml(f.non)}${f.avansADediwi > 0 ? ` <span style="color:var(--text-muted); font-size:11px;">(-${f.avansADediwi.toLocaleString('fr-HT')} avans)</span>` : ''}</td>
          <td style="text-align:right;">${f.salèBrit.toLocaleString('fr-HT')}</td>
          <td style="text-align:right;">${f.salèNet.toLocaleString('fr-HT')}</td>
        </tr>`).join('');
      document.getElementById('mp-total-net').textContent = totalNet.toLocaleString('fr-HT') + ' ' + _deviz;

      previzyon.style.display = 'block';
      btnKonfime.disabled = false;
      _previzyonAnplwaye = fichSale.map(f => ({ anplwayeId: f.anplwayeId, non: f.non, salèBaz: f.salèBaz, avantaj: f.avantaj }));
      _previzyonPeryòd = peryòd;
      _previzyonAvansIds = tousAvansIds;
    } catch (err) {
      console.error('Erè previzyon pewòl:', err);
      avètisman.textContent = '⚠️ ' + err.message;
      avètisman.style.display = 'block';
    }
  }

  async function konfimePewolUI() {
    if (!_previzyonAnplwaye || !_previzyonPeryòd) return;
    const bizId = window.currentCompanyId;
    const uid = firebase.auth().currentUser?.uid || null;

    if (!confirm(`Konfime jenerasyon pewòl pou ${_previzyonPeryòd}? Aksyon sa a kreye ekriti kontab — li PA ka anile.`)) return;

    const mòdPeman = document.getElementById('mp-metòd-peman')?.value || 'kach';
    const btn = document.getElementById('gm-btn-confirm');
    if (btn) btn.disabled = true;
    try {
      await PayrollService.jenerePewol(bizId, _previzyonPeryòd, _previzyonAnplwaye, uid, mòdPeman);

      if (_previzyonAvansIds && _previzyonAvansIds.length > 0) {
        await RhService.markeAvansRekipere(bizId, _previzyonAvansIds);
      }

      ModalService.close();
      _previzyonAnplwaye = null;
      _previzyonPeryòd = null;
      _previzyonAvansIds = null;
      await Promise.all([renderPewolTable(), renderDashboard(), renderAvansTable()]);
    } catch (err) {
      console.error('Erè jenerasyon pewòl:', err);
      ModalService.showError('Erè: ' + err.message);
      if (btn) btn.disabled = false;
    }
  }

  // ---------- 6.6 ORÈ TRAVAY ----------

  let _cacheOrè = [];

  async function renderOrèList() {
    const bizId = window.currentCompanyId;
    const wrap = document.getElementById('rh-lis-orè');
    if (!bizId || !wrap) return;

    try {
      _cacheOrè = await RhService.listeOrèTravay(bizId);
    } catch (err) {
      console.error('Erè chajman orè travay:', err);
      wrap.innerHTML = `<span style="color:var(--danger); font-size:13px;">Erè pandan chajman.</span>`;
      return;
    }

    if (_cacheOrè.length === 0) {
      wrap.innerHTML = `<span style="color:var(--text-muted); font-size:13px;">Pa gen orè konfigire ankò.</span>`;
      return;
    }

    wrap.innerHTML = _cacheOrè.map(o => {
      const lib = o.flexible ? '🔄 Flexible' : `${escHtml(o.non)} (${escHtml(o.lèDebi)}-${escHtml(o.lèFen)})`;
      return `<span class="ged-status" style="background:#F1F5F9; display:inline-flex; align-items:center; gap:6px;">
        ${lib}
        <button class="rh-btn-orè-retire" data-id="${o.id}" style="background:none; border:none; cursor:pointer; color:var(--danger); font-weight:700;">×</button>
      </span>`;
    }).join('');

    wrap.querySelectorAll('.rh-btn-orè-retire').forEach(btn =>
      btn.addEventListener('click', () => retireOrèUI(btn.dataset.id))
    );
  }

  async function retireOrèUI(orèId) {
    if (!confirm('Retire orè sa a? Anplwaye ki asiyen ladan l ap pèdi deteksyon "An Reta".')) return;
    const bizId = window.currentCompanyId;
    const nouvelList = _cacheOrè.filter(o => o.id !== orèId);
    try {
      await RhService.sovgadeOrèTravay(bizId, nouvelList);
      renderOrèList();
    } catch (err) {
      console.error('Erè retire orè:', err);
      alert('Erè: ' + err.message);
    }
  }

  function ouvriModalOrè() {
    const bodyHtml = `
      <label style="font-size:13px; color:var(--text-muted);">Non (ex: Maten, Aprèmidi)</label>
      <input id="mo-non" type="text" style="width:100%; padding:8px; margin:4px 0 12px; border:1px solid #E2E8F0; border-radius:8px;">

      <label style="font-size:13px; color:var(--text-muted);">
        <input id="mo-flexible" type="checkbox"> Orè Flexible (pa gen lè fiks, pa gen deteksyon "An Reta")
      </label>

      <div id="mo-lè-wrap" style="margin-top:12px;">
        <label style="font-size:13px; color:var(--text-muted);">Lè Debi</label>
        <input id="mo-lè-debi" type="time" style="width:100%; padding:8px; margin:4px 0 12px; border:1px solid #E2E8F0; border-radius:8px;">

        <label style="font-size:13px; color:var(--text-muted);">Lè Fen</label>
        <input id="mo-lè-fen" type="time" style="width:100%; padding:8px; margin:4px 0 12px; border:1px solid #E2E8F0; border-radius:8px;">

        <label style="font-size:13px; color:var(--text-muted);">Tolerans Reta (minit)</label>
        <input id="mo-tolerans" type="number" min="0" value="15" style="width:100%; padding:8px; margin:4px 0 16px; border:1px solid #E2E8F0; border-radius:8px;">
      </div>
    `;
    ModalService.open({ title: 'Nouvo Orè Travay', bodyHtml, footerHtml: FOOTER_ANILE_KONFIME('Anrejistre') });

    document.getElementById('mo-flexible').addEventListener('change', (e) => {
      document.getElementById('mo-lè-wrap').style.display = e.target.checked ? 'none' : 'block';
    });
    wireGenericFooter(anrejistreOrèUI);
  }

  async function anrejistreOrèUI() {
    const bizId = window.currentCompanyId;
    const flexible = document.getElementById('mo-flexible').checked;
    const non = document.getElementById('mo-non').value.trim();
    if (!non) { ModalService.showError('Antre yon non pou orè a.'); return; }

    const nouvoOrè = {
      id: 'orè_' + Date.now(),
      non,
      flexible,
      lèDebi: flexible ? null : document.getElementById('mo-lè-debi').value,
      lèFen: flexible ? null : document.getElementById('mo-lè-fen').value,
      toleransMinit: flexible ? 0 : (Number(document.getElementById('mo-tolerans').value) || 0)
    };

    if (!flexible && (!nouvoOrè.lèDebi || !nouvoOrè.lèFen)) {
      ModalService.showError('Antre lè debi ak lè fen, oswa kòche "Flexible".');
      return;
    }

    const btn = document.getElementById('gm-btn-confirm');
    if (btn) btn.disabled = true;
    try {
      await RhService.sovgadeOrèTravay(bizId, [..._cacheOrè, nouvoOrè]);
      ModalService.close();
      renderOrèList();
    } catch (err) {
      console.error('Erè anrejistreman orè:', err);
      ModalService.showError('Erè: ' + err.message);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function fòmatèLè(timestamp) {
    if (!timestamp) return '—';
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return d.toLocaleTimeString('fr-HT', { hour: '2-digit', minute: '2-digit' });
  }

  // Konpare lèAntre reyèl ak orè asiyen anplwaye a — retounen true si "An Reta"
  function seAnReta(anplwaye, rec) {
    if (!rec || !rec.lèAntre) return false;
    if (!anplwaye.orèTravayId) return false;
    const orè = _cacheOrè.find(o => o.id === anplwaye.orèTravayId);
    if (!orè || orè.flexible) return false;

    const lèAntre = rec.lèAntre.toDate ? rec.lèAntre.toDate() : new Date(rec.lèAntre);
    const [h, m] = orè.lèDebi.split(':').map(Number);
    const limit = new Date(lèAntre);
    limit.setHours(h, m + (orè.toleransMinit || 0), 0, 0);

    return lèAntre > limit;
  }

  async function renderPrezansTable() {
    const bizId = window.currentCompanyId;
    const tbody = document.getElementById('rh-tab-prezans-body');
    if (!bizId || !tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:20px;">⏳ Chajman...</td></tr>`;

    try {
      const [aktif, prezansJodiya] = await Promise.all([
        RhService.listeAnplwayeAktif(bizId),
        RhService.listePrezansJodiya(bizId)
      ]);

      if (aktif.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:20px;">Pa gen anplwaye aktif ankò.</td></tr>`;
        return;
      }

      tbody.innerHTML = aktif.map(a => {
        const rec = prezansJodiya.find(p => p.anplwayeId === a.id);
        let estati;
        if (!rec) {
          estati = `<span class="ged-status" style="background:#FEE2E2; color:#B91C1C;">Absan</span>`;
        } else if (seAnReta(a, rec)) {
          estati = `<span class="ged-status" style="background:#FEF3C7; color:#B45309;">An Reta</span>`;
        } else {
          estati = `<span class="ged-status" style="background:#D1FAE5; color:#047857;">Prezan</span>`;
        }

        let aksyon;
        if (!rec) {
          aksyon = `<button class="rh-btn-antre" data-id="${a.id}" data-non="${escHtml(a.non)}" style="background:var(--primary); color:white; border:none; padding:4px 10px; border-radius:6px; font-size:12px;">Antre</button>`;
        } else if (!rec.lèSòti) {
          aksyon = `<button class="rh-btn-soti" data-id="${a.id}" data-non="${escHtml(a.non)}" style="background:var(--bg-white); border:1px solid #E2E8F0; padding:4px 10px; border-radius:6px; font-size:12px;">Sòti</button>`;
        } else {
          aksyon = `<span style="color:var(--text-muted); font-size:12px;">✓ Fini</span>`;
        }

        return `
          <tr>
            <td>${escHtml(a.non)}</td>
            <td>${rec ? fòmatèLè(rec.lèAntre) : '—'}</td>
            <td>${rec ? fòmatèLè(rec.lèSòti) : '—'}</td>
            <td style="white-space:nowrap;">${estati}</td>
            <td style="text-align:right;">${aksyon}</td>
          </tr>`;
      }).join('');

      tbody.querySelectorAll('.rh-btn-antre').forEach(btn =>
        btn.addEventListener('click', () => pwenteAntreUI(btn.dataset.id, btn.dataset.non))
      );
      tbody.querySelectorAll('.rh-btn-soti').forEach(btn =>
        btn.addEventListener('click', () => pwenteSòtiUI(btn.dataset.id, btn.dataset.non))
      );
    } catch (err) {
      console.error('Erè chajman prezans:', err);
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--danger); padding:20px;">Erè pandan chajman done yo.</td></tr>`;
    }
  }

  async function pwenteAntreUI(anplwayeId, non) {
    const uid = firebase.auth().currentUser?.uid || null;
    try {
      await RhService.pwenteAntre(window.currentCompanyId, uid, anplwayeId, non);
      renderPrezansTable();
    } catch (err) {
      console.error('Erè pwente antre:', err);
      alert('Erè: ' + err.message);
    }
  }

  async function pwenteSòtiUI(anplwayeId, non) {
    try {
      await RhService.pwenteSòti(window.currentCompanyId, anplwayeId, non);
      renderPrezansTable();
    } catch (err) {
      console.error('Erè pwente sòti:', err);
      alert('Erè: ' + err.message);
    }
  }

  // ---------- 6.9 EVALYASYON PÈFÒMANS ----------

  function badgeRezilta(nòt) {
    if (nòt >= 5) return `<span class="ged-status" style="background:#D1FAE5; color:#047857;">Ekselan</span>`;
    if (nòt === 4) return `<span class="ged-status" style="background:#DBEAFE; color:#1D4ED8;">Bon</span>`;
    if (nòt === 3) return `<span class="ged-status" style="background:#FEF3C7; color:#B45309;">Satisfezan</span>`;
    return `<span class="ged-status" style="background:#FEE2E2; color:#B91C1C;">Fèb</span>`;
  }

  async function renderEvalyasyonTable() {
    const bizId = window.currentCompanyId;
    const tbody = document.getElementById('rh-tab-evalyasyon-body');
    if (!bizId || !tbody) return;

    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-muted); padding:20px;">⏳ Chajman...</td></tr>`;

    try {
      const list = await RhService.listeEvalyasyon(bizId);
      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-muted); padding:20px;">Pa gen evalyasyon ankò.</td></tr>`;
        return;
      }
      tbody.innerHTML = list.map(e => `
        <tr>
          <td>${escHtml(e.non)}</td>
          <td style="text-align:right;">${'⭐'.repeat(e.nòt)}</td>
          <td>${badgeRezilta(e.nòt)}</td>
        </tr>`).join('');
    } catch (err) {
      console.error('Erè chajman evalyasyon:', err);
      tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--danger); padding:20px;">Erè pandan chajman done yo.</td></tr>`;
    }
  }

  function ouvriModalEvalyasyon() {
    const bodyHtml = `
      <label style="font-size:13px; color:var(--text-muted);">Anplwaye</label>
      <select id="me-anplwaye" style="width:100%; padding:8px; margin:4px 0 12px; border:1px solid #E2E8F0; border-radius:8px;">${anplwayeOptionsHtml()}</select>

      <label style="font-size:13px; color:var(--text-muted);">Nòt (1-5)</label>
      <select id="me-nòt" style="width:100%; padding:8px; margin:4px 0 12px; border:1px solid #E2E8F0; border-radius:8px;">
        <option value="5">⭐⭐⭐⭐⭐ (5 — Ekselan)</option>
        <option value="4">⭐⭐⭐⭐ (4 — Bon)</option>
        <option value="3">⭐⭐⭐ (3 — Satisfezan)</option>
        <option value="2">⭐⭐ (2 — Fèb)</option>
        <option value="1">⭐ (1 — Fèb)</option>
      </select>

      <label style="font-size:13px; color:var(--text-muted);">Komantè (opsyonèl)</label>
      <input id="me-komantè" type="text" style="width:100%; padding:8px; margin:4px 0 16px; border:1px solid #E2E8F0; border-radius:8px;">
    `;
    ModalService.open({ title: 'Nouvo Evalyasyon', bodyHtml, footerHtml: FOOTER_ANILE_KONFIME('Anrejistre') });
    wireGenericFooter(anrejistreEvalyasyonUI);
  }

  async function anrejistreEvalyasyonUI() {
    const bizId = window.currentCompanyId;
    const anplwayeId = document.getElementById('me-anplwaye').value;
    const nòt = document.getElementById('me-nòt').value;
    const komantè = document.getElementById('me-komantè').value.trim();

    if (!anplwayeId) { ModalService.showError('Pa gen anplwaye disponib — kreye yon anplwaye anvan.'); return; }
    const anplwaye = _cacheAnplwaye.find(a => a.id === anplwayeId);

    const btn = document.getElementById('gm-btn-confirm');
    if (btn) btn.disabled = true;
    try {
      await RhService.kreyeEvalyasyon(bizId, anplwaye, nòt, komantè);
      ModalService.close();
      renderEvalyasyonTable();
    } catch (err) {
      console.error('Erè kreyasyon evalyasyon:', err);
      ModalService.showError('Erè: ' + err.message);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  // ---------- 6.10 FÒMASYON ----------

  async function renderFòmasyonTable() {
    const bizId = window.currentCompanyId;
    const tbody = document.getElementById('rh-tab-fòmasyon-body');
    if (!bizId || !tbody) return;

    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-muted); padding:20px;">⏳ Chajman...</td></tr>`;

    try {
      const list = await RhService.listeFòmasyon(bizId);
      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-muted); padding:20px;">Pa gen fòmasyon ankò.</td></tr>`;
        return;
      }
      tbody.innerHTML = list.map(f => `
        <tr>
          <td>${escHtml(f.non)}</td>
          <td>${escHtml(f.dat)}</td>
          <td style="text-align:right;">${(f.patisipan || []).length}</td>
        </tr>`).join('');
    } catch (err) {
      console.error('Erè chajman fòmasyon:', err);
      tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--danger); padding:20px;">Erè pandan chajman done yo.</td></tr>`;
    }
  }

  function patisipanCheckboxesHtml() {
    return _cacheAnplwaye.map(a => `
      <label style="display:block; font-size:13px; padding:2px 0;">
        <input type="checkbox" class="mf-check-patisipan" value="${a.id}"> ${escHtml(a.non)}
      </label>`).join('') || `<span style="color:var(--text-muted); font-size:13px;">Pa gen anplwaye.</span>`;
  }

  function ouvriModalFòmasyon() {
    const bodyHtml = `
      <label style="font-size:13px; color:var(--text-muted);">Non Fòmasyon</label>
      <input id="mf-non" type="text" style="width:100%; padding:8px; margin:4px 0 12px; border:1px solid #E2E8F0; border-radius:8px;">

      <label style="font-size:13px; color:var(--text-muted);">Dat</label>
      <input id="mf-dat" type="date" style="width:100%; padding:8px; margin:4px 0 12px; border:1px solid #E2E8F0; border-radius:8px;">

      <label style="font-size:13px; color:var(--text-muted);">Patisipan</label>
      <div id="mf-patisipan" style="max-height:150px; overflow-y:auto; border:1px solid #E2E8F0; border-radius:8px; padding:8px; margin:4px 0 16px;">${patisipanCheckboxesHtml()}</div>
    `;
    ModalService.open({ title: 'Nouvo Fòmasyon', bodyHtml, footerHtml: FOOTER_ANILE_KONFIME('Anrejistre') });
    wireGenericFooter(anrejistreFòmasyonUI);
  }

  async function anrejistreFòmasyonUI() {
    const bizId = window.currentCompanyId;
    const non = document.getElementById('mf-non').value.trim();
    const dat = document.getElementById('mf-dat').value;
    const patisipan = Array.from(document.querySelectorAll('.mf-check-patisipan:checked')).map(c => c.value);

    if (!non) { ModalService.showError('Antre non fòmasyon an.'); return; }
    if (!dat) { ModalService.showError('Chwazi yon dat.'); return; }

    const btn = document.getElementById('gm-btn-confirm');
    if (btn) btn.disabled = true;
    try {
      await RhService.kreyeFòmasyon(bizId, { non, dat, patisipan });
      ModalService.close();
      renderFòmasyonTable();
    } catch (err) {
      console.error('Erè kreyasyon fòmasyon:', err);
      ModalService.showError('Erè: ' + err.message);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  // ---------- 6.11 RAPÒ RH (export CSV) ----------

  function exportèCSV(nonFichye, tèt, liy) {
    const echapeLiy = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const contenu = [tèt.map(echapeLiy).join(',')]
      .concat(liy.map(r => r.map(echapeLiy).join(',')))
      .join('\r\n');
    // BOM UTF-8 pou Excel li aksan Kreyòl/Fransè yo kòrèkteman
    const blob = new Blob(['\ufeff' + contenu], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nonFichye;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function exporteRapòAnplwayeUI() {
    const bizId = window.currentCompanyId;
    try {
      const list = await RhService.listeTouAnplwaye(bizId);
      const liy = list.map(a => [a.non, a.depatman, a.pozisyon, a.tipKontra, a.salèBaz, a.aktif ? 'Aktif' : 'Inaktif']);
      exportèCSV('rapò_anplwaye.csv', ['Non', 'Depatman', 'Pozisyon', 'Kontra', 'Salè Baz', 'Estati'], liy);
    } catch (err) {
      console.error('Erè export anplwaye:', err);
      alert('Erè: ' + err.message);
    }
  }

  async function exporteRapòAbsansUI() {
    const bizId = window.currentCompanyId;
    try {
      const [aktif, prezansJodiya] = await Promise.all([
        RhService.listeAnplwayeAktif(bizId),
        RhService.listePrezansJodiya(bizId)
      ]);
      const absan = aktif.filter(a => !prezansJodiya.find(p => p.anplwayeId === a.id));
      const jodiya = new Date().toISOString().slice(0, 10);
      const liy = absan.map(a => [a.non, a.depatman, jodiya]);
      exportèCSV('rapò_absans.csv', ['Non', 'Depatman', 'Dat'], liy);
    } catch (err) {
      console.error('Erè export absans:', err);
      alert('Erè: ' + err.message);
    }
  }

  async function exporteRapòPrezansUI() {
    const bizId = window.currentCompanyId;
    try {
      const list = await RhService.listePrezansJodiya(bizId);
      const liy = list.map(p => [p.non, p.dat, fòmatèLè(p.lèAntre), fòmatèLè(p.lèSòti)]);
      exportèCSV('rapò_prezans.csv', ['Non', 'Dat', 'Lè Antre', 'Lè Sòti'], liy);
    } catch (err) {
      console.error('Erè export prezans:', err);
      alert('Erè: ' + err.message);
    }
  }

  async function exporteRapòKonjeUI() {
    const bizId = window.currentCompanyId;
    try {
      const list = await RhService.listeTouDemandKonje(bizId, 100);
      const liy = list.map(k => {
        const a = _cacheAnplwaye.find(x => x.id === k.anplwayeId);
        return [a ? a.non : k.anplwayeId, k.tip, k.datDebi, k.datFen, k.estati];
      });
      exportèCSV('rapò_konje.csv', ['Anplwaye', 'Tip', 'Dat Debi', 'Dat Fen', 'Estati'], liy);
    } catch (err) {
      console.error('Erè export konje:', err);
      alert('Erè: ' + err.message);
    }
  }

  async function exporteRapòPewòlUI() {
    const bizId = window.currentCompanyId;
    try {
      const list = await PayrollService.listeTouPewol(bizId, 100);
      const liy = [];
      list.forEach(p => p.fichSale.forEach(f => {
        liy.push([p.peryòd, f.non, f.salèBrit, f.totalDediksyon, f.salèNet]);
      }));
      exportèCSV('rapò_pewòl.csv', ['Peryòd', 'Anplwaye', 'Salè Brit', 'Dediksyon', 'Salè Nèt'], liy);
    } catch (err) {
      console.error('Erè export pewòl:', err);
      alert('Erè: ' + err.message);
    }
  }

  async function exporteRapòEvalyasyonUI() {
    const bizId = window.currentCompanyId;
    try {
      const list = await RhService.listeEvalyasyon(bizId, 100);
      const liy = list.map(e => [e.non, e.nòt, e.dat, e.komantè]);
      exportèCSV('rapò_evalyasyon.csv', ['Anplwaye', 'Nòt', 'Dat', 'Komantè'], liy);
    } catch (err) {
      console.error('Erè export evalyasyon:', err);
      alert('Erè: ' + err.message);
    }
  }

  // Konbine 2 sous: depans manyèl kategori "Salaires" (DepansService) + pewòl otomatik (PayrollService).
  // Kolòn "Sous" make chak liy klèman — sa ekspoze risk doub-konte a olye kache l,
  // pou biznis la ka verifye li menm si gen chevochman ant 2 sistèm yo.
  async function exporteRapòDepansSaleUI() {
    const bizId = window.currentCompanyId;
    try {
      const [depansList, pewolList] = await Promise.all([
        window.DepansService ? window.DepansService.getDepans(100) : Promise.resolve([]),
        PayrollService.listeTouPewol(bizId, 100)
      ]);

      const liyDepans = depansList
        .filter(d => d.kategori === 'Salaires')
        .map(d => {
          const dat = d.dat?.toDate ? d.dat.toDate().toISOString().slice(0, 10) : '—';
          return ['Depans Manyèl', d.nimewoDepans || d.id, dat, d.deskripsyon || '', d.montan];
        });

      const liyPewol = [];
      pewolList.forEach(p => {
        liyPewol.push(['Pewòl Otomatik', p.nimewoPewol || p.id, p.peryòd, `${p.fichSale.length} anplwaye`, p.totaux.brit]);
      });

      const liy = [...liyDepans, ...liyPewol];

      if (!window.DepansService) {
        console.warn('DepansService pa chaje — rapò a gen sèlman done pewòl otomatik.');
      }

      exportèCSV('rapò_depans_salè.csv', ['Sous', 'Referans', 'Dat/Peryòd', 'Deskripsyon', 'Montan Brit'], liy);
    } catch (err) {
      console.error('Erè export depans salè:', err);
      alert('Erè: ' + err.message);
    }
  }

  // ---------- Òkestratè ----------

  async function chajeSeksyonRH() {
    const bizId = window.currentCompanyId;
    await chajeDeviz(bizId);
    await renderOrèList();
    try {
      [_cacheDepatman, _cachePos] = await Promise.all([
        RhService.listeDepatmanAktif(bizId),
        RhService.listePosAktif(bizId)
      ]);
    } catch (err) {
      console.error('Erè chajman depatman/pos:', err);
      _cacheDepatman = [];
      _cachePos = [];
    }
    await renderAnplwayeTable();
    await Promise.all([
      renderDashboard(), renderKonjeTable(), renderPewolTable(), renderAvansTable(),
      renderPrezansTable(), renderEvalyasyonTable(), renderFòmasyonTable(),
      window.RekritmanUI?.renderKandidaTable()
    ]);
  }

  function initListeners() {
    document.getElementById('btn-nouvo-anplwaye')?.addEventListener('click', () => ouvriModalAnplwaye(null));
    document.getElementById('btn-nouvo-konje')?.addEventListener('click', ouvriModalKonje);
    document.getElementById('btn-nouvo-avans')?.addEventListener('click', ouvriModalAvans);
    document.getElementById('btn-woule-pewol')?.addEventListener('click', ouvriModalPewol);
    document.getElementById('btn-konfig-kont-pewol')?.addEventListener('click', ouvriModalKonfigKontPewol);
    document.getElementById('btn-nouvo-orè')?.addEventListener('click', ouvriModalOrè);
    document.getElementById('btn-nouvo-evalyasyon')?.addEventListener('click', ouvriModalEvalyasyon);
    document.getElementById('btn-nouvo-fòmasyon')?.addEventListener('click', ouvriModalFòmasyon);

    document.getElementById('btn-rapò-anplwaye')?.addEventListener('click', exporteRapòAnplwayeUI);
    document.getElementById('btn-rapò-absans')?.addEventListener('click', exporteRapòAbsansUI);
    document.getElementById('btn-rapò-prezans')?.addEventListener('click', exporteRapòPrezansUI);
    document.getElementById('btn-rapò-konje')?.addEventListener('click', exporteRapòKonjeUI);
    document.getElementById('btn-rapò-pewòl')?.addEventListener('click', exporteRapòPewòlUI);
    document.getElementById('btn-rapò-depans-sale')?.addEventListener('click', exporteRapòDepansSaleUI);
    document.getElementById('btn-rapò-evalyasyon')?.addEventListener('click', exporteRapòEvalyasyonUI);
  }

  return { renderAnplwayeTable, chajeSeksyonRH, initListeners };
})();
window.RhUI = RhUI;   // FIKS: san sa, navigate() (window.RhUI?.chajeSeksyonRH()) pa jwenn RhUI
document.addEventListener('DOMContentLoaded', () => { RhUI.initListeners(); });
