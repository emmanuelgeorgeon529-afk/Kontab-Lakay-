// ia_ui.js — Wiring Modil 12 (IA/Anti-Fwod) sou UI a
// Depann de window.AntiFraudService, window.currentCompanyId
// Konvansyon: window.IaUI.chajeSeksyonIa() rele nan navigate() (js/core/app.js)

const IaUI = (function () {

  const _alèteCache = {};

  function _fòmateDat(dat) {
    if (!dat) return '—';
    const d = dat.toDate ? dat.toDate() : new Date(dat);
    return d.toLocaleDateString('fr-HT', { day: '2-digit', month: '2-digit', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('fr-HT', { hour: '2-digit', minute: '2-digit' });
  }

  function _renderKatAlèt(a) {
    const bg = a.severite === 'ijan' ? '#FEE2E2' : '#FEF3C7';
    const boutonBloke = a.severite === 'ijan' && a.aksyon !== 'Ranbousman Repetitif'
      ? `<button class="ia-bloke-btn" data-id="${a.id}" style="background:var(--danger); border:none; color:white; padding:6px 10px; border-radius:6px; font-size:12px; font-weight:600; white-space:nowrap;">⛔ Bloke</button>`
      : '';
    const bòdKoulè = a.severite === 'ijan' ? 'var(--danger)' : '#B45309';
    const kiMoun = a.kliyanNon && a.kliyanNon !== '—' ? `Kliyan: ${a.kliyanNon}` : (a.itilizateNon && a.itilizateNon !== '—' ? `${a.itilizateNon}` : '');

    return `
      <div class="ia-fraud-row" style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-radius:8px; background:${bg}; gap:10px; flex-wrap:wrap;">
        <span style="flex:1; min-width:0;">
          ${a.icon} <b>${a.aksyon}</b>${kiMoun ? ' — ' + kiMoun : ''} — ${a.rezon}
          <span style="color:${bòdKoulè}; font-weight:600;"> (${a.risk})</span>
          <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">${_fòmateDat(a.dat)} · ${a.ansyenValè} → ${a.nouvoValè}</div>
        </span>
        <div class="ia-fraud-actions" style="display:flex; gap:6px; flex-shrink:0;">
          <button class="ia-enspekte-btn" data-id="${a.id}" data-modil="lavant" style="background:white; border:1px solid ${bòdKoulè}; color:${bòdKoulè}; padding:6px 10px; border-radius:6px; font-size:12px; font-weight:600; white-space:nowrap;">🔍 Enspekte</button>
          ${boutonBloke}
        </div>
      </div>`;
  }

  function _renderKatVid(mesaj) {
    return `<div style="padding:20px; text-align:center; color:var(--text-muted); font-size:13px;">✅ ${mesaj}</div>`;
  }

  async function chajeAlètAntiFwod() {
    const konteneur = document.getElementById('ia122FraudList');
    if (!konteneur) return;
    try {
      const alèt = await window.AntiFraudService.getAlètAntiFwod(30);
      Object.keys(_alèteCache).forEach(k => delete _alèteCache[k]);
      alèt.forEach(a => { _alèteCache[a.id] = a; });
      if (!alèt.length) {
        konteneur.innerHTML = _renderKatVid('Pa gen alèt fwod detekte nan 30 dènye jou yo.');
        return;
      }
      konteneur.innerHTML = alèt.map(_renderKatAlèt).join('');
    } catch (err) {
      console.error('Erè chajman alèt anti-fwod:', err);
      konteneur.innerHTML = `<div style="padding:20px; text-align:center; color:var(--danger); font-size:13px;">⚠️ Pa t kapab chaje alèt yo. ${err.message || ''}</div>`;
    }
  }

  function _nivoKlas(nivo) {
    return { background: nivo.bg, color: nivo.color };
  }

  async function chajeRiskScoreItilizate() {
    const tbody = document.getElementById('ia123RiskTable');
    if (!tbody) return;
    try {
      const risks = await window.AntiFraudService.getRiskScoreParItilizate(30);
      if (!risks.length) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-muted);">Pa gen aktivite risk detekte.</td></tr>`;
        return;
      }
      tbody.innerHTML = risks.map(u => {
        const nivo = window.AntiFraudService.getNivoRisk(u.score);
        return `
          <tr>
            <td>${u.itilizateNon || u.itilizateId}</td>
            <td>${(u.detay || []).slice(0, 2).join(', ') || '—'}</td>
            <td><span class="ged-status" style="background:${nivo.bg}; color:${nivo.color};">${u.score} — ${nivo.label}</span></td>
          </tr>`;
      }).join('');
    } catch (err) {
      console.error('Erè chajman risk score:', err);
      tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--danger);">⚠️ Pa t kapab chaje risk score.</td></tr>`;
    }
  }

  function _nivoStockLabel(nivo) {
    switch (nivo) {
      case 'kritik': return { txt: 'color:var(--danger); font-weight:600;', badge: null };
      case 'atansyon': return { txt: 'color:#B45309; font-weight:600;', badge: null };
      case 'san_done': return { txt: 'color:var(--text-muted);', badge: null };
      default: return { txt: 'color:var(--secondary);', badge: null };
    }
  }

  async function chajePrevisionStock() {
    const tbody = document.getElementById('ia124StockForecast');
    if (!tbody) return;
    try {
      const previzyon = await window.StockForecastService.getPrevisionStock(30, 14);
      const kritikOuAtansyon = previzyon.filter(p => p.nivo === 'kritik' || p.nivo === 'atansyon');
      if (!kritikOuAtansyon.length) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-muted);">✅ Pa gen pwodwi ki pre fini nan 21 pwochen jou yo.</td></tr>`;
        return;
      }
      tbody.innerHTML = kritikOuAtansyon.slice(0, 10).map(p => {
        const stil = _nivoStockLabel(p.nivo);
        return `
          <tr>
            <td>${p.non}</td>
            <td style="${stil.txt}">${p.jouRete} jou</td>
            <td style="text-align:right;">${p.rekòmande} ${p.inite}</td>
          </tr>`;
      }).join('');
    } catch (err) {
      console.error('Erè chajman prevision stock:', err);
      tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--danger);">⚠️ Pa t kapab chaje prevision stock.</td></tr>`;
    }
  }

  function _koulèNèt(valè) {
    return valè >= 0 ? 'var(--secondary)' : 'var(--danger)';
  }

  function _fòmateHTG(valè) {
    const sign = valè >= 0 ? '+' : '';
    return sign + Math.round(valè).toLocaleString() + ' HTG';
  }

  async function chajePrevisionTrezorri() {
    const konteneur = document.getElementById('ia125CashForecast');
    if (!konteneur) return;
    if (!window.BiService?.getCashFlowForecast) {
      console.warn('BiService.getCashFlowForecast pa disponib — 12.5 pa ka chaje.');
      return;
    }
    try {
      const previzyon = await window.BiService.getCashFlowForecast();
      const items = [
        { label: '7 jou', valè: previzyon.j7 },
        { label: '30 jou', valè: previzyon.j30 },
        { label: '90 jou', valè: previzyon.j90 },
        { label: '365 jou', valè: previzyon.an1 }
      ];
      konteneur.innerHTML = items.map(it => `
        <div class="kpi-card">
          <div class="label">${it.label}</div>
          <div class="value" style="color:${_koulèNèt(it.valè)}; font-size:16px;">${_fòmateHTG(it.valè)}</div>
        </div>`).join('');
    } catch (err) {
      console.error('Erè chajman prevision trezorri:', err);
      konteneur.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:var(--danger); font-size:13px; padding:10px;">⚠️ Pa t kapab chaje prevision trezorri.</div>`;
    }
  }

  function _nivoKolèkKoulè(nivo) {
    switch (nivo) {
      case 'ijan': return { bg: '#FEE2E2', color: '#B91C1C' };
      case 'atansyon': return { bg: '#FEF3C7', color: '#B45309' };
      default: return { bg: '#F1F5F9', color: 'var(--text-muted)' };
    }
  }

  async function chajeSmartCollection() {
    const tbody = document.getElementById('ia126Collection');
    if (!tbody) return;
    try {
      const rekòmandasyon = await window.SmartCollectionService.getRekòmandasyonKolèk(15);
      if (!rekòmandasyon.length) {
        tbody.innerHTML = `<tr><td colspan="2" style="text-align:center; color:var(--text-muted);">✅ Pa gen kliyan ki bezwen relans kounye a.</td></tr>`;
        return;
      }
      tbody.innerHTML = rekòmandasyon.slice(0, 10).map(r => {
        const koulè = _nivoKolèkKoulè(r.nivo);
        const jouTxt = r.jouDepi != null ? `${r.jouDepi}j` : '—';
        const boutonWa = r.lyenWhatsapp
          ? `<a href="${r.lyenWhatsapp}" target="_blank" rel="noopener" style="text-decoration:none; background:#25D366; color:white; padding:4px 8px; border-radius:6px; font-size:11px; font-weight:600;">📱 WhatsApp</a>`
          : '';
        const boutonTel = r.lyenTel
          ? `<a href="${r.lyenTel}" style="text-decoration:none; background:white; border:1px solid #CBD5E1; color:var(--text-dark); padding:4px 8px; border-radius:6px; font-size:11px; font-weight:600;">📞 Rele</a>`
          : '';
        return `
          <tr>
            <td>${r.kliyanNon}<div style="font-size:11px; color:var(--text-muted);">${Math.round(r.dèt).toLocaleString()} HTG · ${jouTxt} depi dènye tranzaksyon</div></td>
            <td>
              <div style="display:flex; flex-direction:column; gap:4px; align-items:flex-start;">
                <span class="ged-status" style="background:${koulè.bg}; color:${koulè.color};">${r.aksyon}</span>
                <div style="display:flex; gap:6px;">${boutonWa}${boutonTel}</div>
              </div>
            </td>
          </tr>`;
      }).join('');
    } catch (err) {
      console.error('Erè chajman smart collection:', err);
      tbody.innerHTML = `<tr><td colspan="2" style="text-align:center; color:var(--danger);">⚠️ Pa t kapab chaje rekòmandasyon kolèksyon.</td></tr>`;
    }
  }

  async function chajeSmartPurchasing() {
    const tbody = document.getElementById('ia127Purchasing');
    if (!tbody) return;
    try {
      const rekòmandasyon = await window.SmartPurchasingService.getRekòmandasyonAcha(5, 180);
      if (!rekòmandasyon.length) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-muted);">Pa gen istorik acha ase pou fè rekòmandasyon (oswa pa gen pwodwi stock ba).</td></tr>`;
        return;
      }
      tbody.innerHTML = rekòmandasyon.map(r => `
        <tr>
          <td>${r.pwodwiNon}<div style="font-size:11px; color:var(--text-muted);">Stock: ${r.stockAktyèl}</div></td>
          <td>${r.founiseRekòmande.founiseNon}${r.touFounise.length > 1 ? ` <span style="font-size:11px; color:var(--text-muted);">(+${r.touFounise.length - 1} lòt)</span>` : ''}</td>
          <td style="text-align:right;">${Math.round(r.founiseRekòmande.priMoyen).toLocaleString()} HTG</td>
        </tr>`).join('');
    } catch (err) {
      console.error('Erè chajman smart purchasing:', err);
      tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--danger);">⚠️ Pa t kapab chaje rekòmandasyon acha.</td></tr>`;
    }
  }

  async function chajeExecutiveDashboard() {
    const konteneur = document.getElementById('ia1211Dashboard');
    if (!konteneur) return;
    if (!window.BiService?.getDashboardStats) {
      console.warn('BiService.getDashboardStats pa disponib — 12.11 pa ka chaje.');
      return;
    }
    try {
      const [stats, alèt, kliyanAnalyse] = await Promise.all([
        window.BiService.getDashboardStats(),
        window.AntiFraudService?.getAlètAntiFwod ? window.AntiFraudService.getAlètAntiFwod(30) : Promise.resolve([]),
        window.BiService.getClientAnalysis ? window.BiService.getClientAnalysis() : Promise.resolve({ nouvoKliyan: 0 })
      ]);
      const alètIjan = alèt.filter(a => a.severite === 'ijan').length;

      const items = [
        { label: '💰 Cash Disponib', valè: `${Math.round(stats.kesDisponib).toLocaleString()} HTG`, koulè: null },
        { label: "📈 Chif Afè (mwa)", valè: `${Math.round(stats.revniMwa).toLocaleString()} HTG`, koulè: null },
        { label: '📉 Depans (mwa)', valè: `${Math.round(stats.depansMwa).toLocaleString()} HTG`, koulè: null },
        { label: '🏆 Benefis Nèt', valè: `${Math.round(stats.benefisNèt).toLocaleString()} HTG`, koulè: stats.benefisNèt >= 0 ? 'var(--secondary)' : 'var(--danger)' },
        { label: '⚠️ Alèt Risk (30j)', valè: String(alètIjan), koulè: alètIjan > 0 ? 'var(--danger)' : 'var(--secondary)' },
        { label: '🎯 Nouvo Kliyan (mwa)', valè: String(kliyanAnalyse.nouvoKliyan || 0), koulè: 'var(--secondary)' }
      ];

      konteneur.innerHTML = items.map(it => `
        <div class="kpi-card">
          <div class="label">${it.label}</div>
          <div class="value"${it.koulè ? ` style="color:${it.koulè};"` : ''}>${it.valè}</div>
        </div>`).join('');
    } catch (err) {
      console.error('Erè chajman executive dashboard:', err);
      konteneur.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:var(--danger); font-size:13px; padding:10px;">⚠️ Pa t kapab chaje dashboard egzekitif.</div>`;
    }
  }

  function _flèch(pousantaj) {
    if (pousantaj == null) return '—';
    const ikòn = pousantaj >= 0 ? '↑' : '↓';
    const koulè = pousantaj >= 0 ? 'var(--secondary)' : 'var(--danger)';
    return `<span style="color:${koulè}; font-weight:600;">${ikòn} ${Math.abs(pousantaj).toFixed(0)}%</span>`;
  }

  async function _jenereRapòAnalize() {
    const panèl = document.getElementById('ia128Rapò');
    const btn = document.getElementById('ia128BtnAnalize');
    if (!panèl || !window.AiReportService) return;

    if (panèl.style.display === 'block') { panèl.style.display = 'none'; return; }

    panèl.style.display = 'block';
    panèl.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:16px; font-size:13px;">Chajman analiz...</div>`;
    if (btn) btn.disabled = true;

    try {
      const r = await window.AiReportService.jenereRapòEgzekitif();
      panèl.innerHTML = `
        <div style="background:#F8FAFC; border-radius:10px; padding:16px; font-size:13px; line-height:1.7;">
          <div style="font-weight:600; margin-bottom:8px;">📋 Rapò Egzekitif — Mwa sa a</div>
          <div>Chif Afè: <b>${Math.round(r.chifAfèMwa).toLocaleString()} HTG</b> ${_flèch(r.kwasansCA)}</div>
          <div>Marge Brite: <b>${r.margeBrite.toFixed(1)}%</b> · Marge Nèt: <b>${r.margeNette.toFixed(1)}%</b></div>
          <div>Depans: <b>${Math.round(r.depansMwa).toLocaleString()} HTG</b> ${_flèch(r.kwasansDepans)}</div>
          <div>Benefis Nèt: <b>${Math.round(r.benefisNèt).toLocaleString()} HTG</b> ${_flèch(r.kwasansBenefis)}</div>
          <div>Stock Kritik: <b>${r.stockKritik} pwodwi</b> · Trezorri Disponib: <b>${Math.round(r.trezorriDisponib).toLocaleString()} HTG</b></div>
          <div style="margin-top:10px; padding-top:10px; border-top:1px solid #E2E8F0;">
            <div style="font-weight:600; margin-bottom:6px;">🔎 Analiz</div>
            ${r.eksplikasyon.map(e => `<div style="margin-bottom:4px;">• ${e}</div>`).join('')}
          </div>
        </div>`;
    } catch (err) {
      console.error('Erè jenerasyon rapò:', err);
      panèl.innerHTML = `<div style="color:var(--danger); text-align:center; padding:16px; font-size:13px;">⚠️ Pa t kapab jenere rapò a.</div>`;
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function _fòmateDatSimple(d) {
    if (!d) return '—';
    const dat = d.toDate ? d.toDate() : new Date(d);
    return dat.toLocaleDateString('fr-HT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  async function chajeWorkflow() {
    const tbody = document.getElementById('ia1212Workflow');
    if (!tbody || !window.WorkflowService) return;
    try {
      const workflow = await window.WorkflowService.getWorkflowAktif();
      if (!workflow.length) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-muted);">Pa gen workflow aktif kounye a.</td></tr>`;
        return;
      }
      tbody.innerHTML = workflow.map(w => `
        <tr>
          <td>${w.kliyanNon}</td>
          <td style="text-align:right;">${Math.round(w.montanDeklanche).toLocaleString()} HTG</td>
          <td>${_fòmateDatSimple(w.pwochenVerifikasyon)}</td>
        </tr>`).join('');
    } catch (err) {
      console.error('Erè chajman workflow:', err);
      tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--danger);">⚠️ Pa t kapab chaje workflow yo.</td></tr>`;
    }
  }

  async function _egzekiteWorkflowMannyèl() {
    const btn = document.getElementById('ia1212BtnEgzekite');
    const reziltaDiv = document.getElementById('ia1212Rezilta');
    if (!window.WorkflowService) return;
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Egzekisyon...'; }

    try {
      const { nbKreye, rezilta } = await window.WorkflowService.egzekiteSiklKonplè();
      if (reziltaDiv) {
        const lignes = [];
        if (nbKreye > 0) lignes.push(`✅ ${nbKreye} nouvo workflow kreye.`);
        rezilta.forEach(r => lignes.push(`${r.aksyon === 'fèmen' ? '✅' : '🔔'} ${r.kliyanNon}: ${r.detay}`));
        if (!lignes.length) lignes.push('Pa gen aksyon pou egzekite kounye a.');
        reziltaDiv.innerHTML = lignes.map(l => `<div>${l}</div>`).join('');
      }
      await chajeWorkflow();
    } catch (err) {
      console.error('Erè egzekisyon workflow:', err);
      if (reziltaDiv) reziltaDiv.innerHTML = `<div style="color:var(--danger);">⚠️ Erè: ${err.message || err}</div>`;
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '▶️ Egzekite Kounye a'; }
    }
  }

  function _branchèWorkflow() {
    const btn = document.getElementById('ia1212BtnEgzekite');
    if (!btn || btn.dataset.branche) return;
    btn.dataset.branche = '1';
    btn.addEventListener('click', _egzekiteWorkflowMannyèl);
  }

  async function chajeGovernance() {
    const tbody = document.getElementById('ia1213Governance');
    if (!tbody || !window.AiGovernanceService) return;
    try {
      const istorik = await window.AiGovernanceService.getIstorikRekòmandasyon(30);
      if (!istorik.length) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">Pa gen istorik IA kounye a.</td></tr>`;
        return;
      }
      tbody.innerHTML = istorik.map(r => {
        const d = r.dat?.toDate ? r.dat.toDate() : (r.dat ? new Date(r.dat) : null);
        const datTxt = d ? d.toLocaleDateString('fr-HT', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('fr-HT', { hour: '2-digit', minute: '2-digit' }) : '—';
        const sousLabel = r.sous === 'copilot' ? '💬 Co-Pilot' : '📎 Chat Doc';
        return `
          <tr>
            <td style="font-size:12px;">${datTxt}</td>
            <td style="font-size:12px;">${sousLabel}</td>
            <td style="font-size:12px;">${(r.kesyon || '').slice(0, 60)}${(r.kesyon || '').length > 60 ? '...' : ''}</td>
            <td style="font-size:12px;">${r.itilizateNon || '—'}</td>
          </tr>`;
      }).join('');
    } catch (err) {
      console.error('Erè chajman governance:', err);
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--danger);">⚠️ Pa t kapab chaje istorik la.</td></tr>`;
    }
  }

  async function chajeAnalizRh() {
    const kpiKonteneur = document.getElementById('ia1210RhKpi');
    const tbody = document.getElementById('ia1210RhAbsans');
    const rekòmandasyonDiv = document.getElementById('ia1210RhRekòmandasyon');
    if (!kpiKonteneur || !tbody) return;
    if (!window.AiRhService) { console.warn('AiRhService pa disponib.'); return; }

    try {
      const r = await window.AiRhService.getAnalizRh(14);

      kpiKonteneur.innerHTML = [
        { label: '👥 Anplwaye Aktif', valè: r.totalAnplwaye },
        { label: '🏖️ An Konje', valè: r.anKonje },
        { label: '📄 Kontra Ap Ekspire', valè: r.kontraKapExpire, koulè: r.kontraKapExpire > 0 ? 'var(--danger)' : null },
        { label: `📅 Absans (${r.jouAnalize}j)`, valè: r.totalAbsans, koulè: r.totalAbsans > 0 ? '#B45309' : null }
      ].map(it => `
        <div class="kpi-card">
          <div class="label">${it.label}</div>
          <div class="value"${it.koulè ? ` style="color:${it.koulè};"` : ''}>${it.valè}</div>
        </div>`).join('');

      if (!r.absansParAnplwaye.length) {
        tbody.innerHTML = `<tr><td colspan="3" style=
