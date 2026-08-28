// rekritman_ui.js — UI 6.3 Rekritman, chaje pa RhUI.chajeSeksyonRH() (menm seksyon "rh")

const RekritmanUI = (() => {

  function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = String(str ?? '');
    return d.innerHTML;
  }

  function badgeEtap(etap) {
    const map = {
      'Kandida':    { bg: '#F1F5F9', fg: 'var(--text-dark)' },
      'Entèvyou':   { bg: '#DBEAFE', fg: '#1D4ED8' },
      'Evalyasyon': { bg: '#FEF3C7', fg: '#B45309' },
      'Aksepte':    { bg: '#D1FAE5', fg: '#047857' },
      'Rejte':      { bg: '#FEE2E2', fg: '#B91C1C' }
    };
    const c = map[etap] || map['Kandida'];
    return `<span class="ged-status" style="background:${c.bg}; color:${c.fg};">${etap}</span>`;
  }

  let _cacheKandida = [];

  async function renderKandidaTable() {
    const bizId = window.currentCompanyId;
    const tbody = document.getElementById('rh-tab-kandida-body');
    if (!bizId || !tbody) return;

    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:20px;">⏳ Chajman...</td></tr>`;

    try {
      _cacheKandida = await RekritmanService.listeKandida(bizId);
    } catch (err) {
      console.error('Erè chajman kandida:', err);
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--danger); padding:20px;">Erè pandan chajman done yo.</td></tr>`;
      return;
    }

    if (_cacheKandida.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:20px;">Pa gen kandida ankò.</td></tr>`;
      return;
    }

    tbody.innerHTML = _cacheKandida.map(k => `
      <tr>
        <td>${escHtml(k.non)}</td>
        <td>${escHtml(k.pozisyon) || '—'}</td>
        <td>
          <select class="rk-select-etap" data-id="${k.id}" style="border:1px solid #E2E8F0; border-radius:6px; padding:2px 4px; font-size:12px;">
            ${['Kandida', 'Entèvyou', 'Evalyasyon', 'Aksepte', 'Rejte'].map(e =>
              `<option value="${e}" ${e === k.etap ? 'selected' : ''}>${e}</option>`).join('')}
          </select>
        </td>
        <td style="text-align:right;">
          ${k.cvUrl
            ? `<a href="${k.cvUrl}" target="_blank" style="text-decoration:none;">📄 Wè CV</a>`
            : `<button class="rk-btn-cv" data-id="${k.id}" style="background:none; border:none; cursor:pointer; font-size:12px;">📤 CV</button>`
          }
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.rk-select-etap').forEach(sel =>
      sel.addEventListener('change', () => chanjeEtapUI(sel.dataset.id, sel.value))
    );
    tbody.querySelectorAll('.rk-btn-cv').forEach(btn =>
      btn.addEventListener('click', () => ouvriSelectèCV(btn.dataset.id))
    );
  }

  async function chanjeEtapUI(kandidaId, nouvelEtap) {
    try {
      await RekritmanService.modifyeEtapKandida(window.currentCompanyId, kandidaId, nouvelEtap);
      renderKandidaTable();
    } catch (err) {
      console.error('Erè chanjman etap:', err);
      alert('Erè: ' + err.message);
    }
  }

  function ouvriSelectèCV(kandidaId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        await RekritmanService.telechajeCV(window.currentCompanyId, kandidaId, file);
        renderKandidaTable();
      } catch (err) {
        console.error('Erè upload CV:', err);
        alert('Erè: ' + err.message);
      }
    };
    input.click();
  }

  function ouvriModalKandida() {
    const bodyHtml = `
      <label style="font-size:13px; color:var(--text-muted);">Non</label>
      <input id="rk-non" type="text" style="width:100%; padding:8px; margin:4px 0 12px; border:1px solid #E2E8F0; border-radius:8px;">

      <label style="font-size:13px; color:var(--text-muted);">Pozisyon</label>
      <input id="rk-pozisyon" type="text" style="width:100%; padding:8px; margin:4px 0 16px; border:1px solid #E2E8F0; border-radius:8px;">
    `;
    const footerHtml = `
      <button id="gm-btn-cancel" style="flex:1; background:var(--bg-white); border:1px solid #E2E8F0; padding:10px; border-radius:8px; font-weight:600;">Anile</button>
      <button id="gm-btn-confirm" style="flex:1; background:var(--primary); color:white; border:none; padding:10px; border-radius:8px; font-weight:600;">Anrejistre</button>
    `;
    ModalService.open({ title: 'Nouvo Kandida', bodyHtml, footerHtml });
    document.getElementById('gm-btn-cancel').addEventListener('click', () => ModalService.close());
    document.getElementById('gm-btn-confirm').addEventListener('click', anrejistreKandidaUI);
  }

  async function anrejistreKandidaUI() {
    const bizId = window.currentCompanyId;
    const done = {
      non: document.getElementById('rk-non').value.trim(),
      pozisyon: document.getElementById('rk-pozisyon').value.trim()
    };
    if (!done.non) { ModalService.showError('Antre non kandida a.'); return; }

    const btn = document.getElementById('gm-btn-confirm');
    if (btn) btn.disabled = true;
    try {
      await RekritmanService.kreyeKandida(bizId, done);
      ModalService.close();
      renderKandidaTable();
    } catch (err) {
      console.error('Erè kreyasyon kandida:', err);
      ModalService.showError('Erè: ' + err.message);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function initListeners() {
    document.getElementById('btn-nouvo-kandida')?.addEventListener('click', ouvriModalKandida);
  }

  return { renderKandidaTable, initListeners };
})();
document.addEventListener('DOMContentLoaded', () => { RekritmanUI.initListeners(); });
