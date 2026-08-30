// js/modules/bi_ui.js
// Konekte seksyon "Business Intelligence & Executive Dashboard" (11.1-11.7)
// ak BiService. Rès sou-seksyon yo (11.8-11.14) rete mockup pou kounye a.

(function () {
    let chartSalesTrend, chartProfit, chartRevenueGrowth, chartClientRadar;

    function fmtHTG(n) {
        return Math.round(n || 0).toLocaleString('fr-HT') + ' HTG';
    }

    function setText(id, txt) {
        const el = document.getElementById(id);
        if (el) el.textContent = txt;
    }

    function rannChanjman(id, valèAktyèl, valèPase) {
        const el = document.getElementById(id);
        if (!el) return;
        if (!valèPase) { el.textContent = ''; return; }
        const pousantaj = Math.round(((valèAktyèl - valèPase) / Math.abs(valèPase)) * 100);
        const monte = pousantaj >= 0;
        el.textContent = `${monte ? '↑' : '↓'} ${Math.abs(pousantaj)}%`;
        el.className = 'change ' + (monte ? 'up' : 'down');
    }

    // ================= 11.1 DASHBOARD EGZEKITIF =================

    async function rannKpiPrensipal() {
        try {
            const s = await window.BiService.getDashboardStats();
            setText('kpiBiKesDisponib', fmtHTG(s.kesDisponib));
            setText('kpiBiRevniMwa', fmtHTG(s.revniMwa));
            rannChanjman('kpiBiRevniMwaChange', s.revniMwa, s.revniMwaPase);
            setText('kpiBiDepansMwa', fmtHTG(s.depansMwa));
            rannChanjman('kpiBiDepansMwaChange', s.depansMwa, s.depansMwaPase);
            setText('kpiBiBenefisNet', fmtHTG(s.benefisNèt));
            rannChanjman('kpiBiBenefisNetChange', s.benefisNèt, s.benefisMwaPase);
            setText('kpiBiKliyanAktif', s.kliyanAktif);
            setText('kpiBiPwodwiVann', s.pwodwiVannMwa.toLocaleString('fr-HT'));
            setText('kpiBiLavantJodi', fmtHTG(s.lavantJodi));
            setText('kpiBiKòmandAnKour', s.kòmandAnKour);
        } catch (e) {
            console.warn('BiUI: rannKpiPrensipal echwe', e);
        }
    }

    async function rannGrafikSalesTrend() {
        const canvas = document.getElementById('biSalesTrendChart');
        if (!canvas || typeof Chart === 'undefined') return;
        const { labels, revni } = await window.BiService.getSeriMensuel(6);
        if (chartSalesTrend) chartSalesTrend.destroy();
        chartSalesTrend = new Chart(canvas, {
            type: 'line',
            data: { labels, datasets: [{ label: 'Lavant (HTG)', data: revni, borderColor: '#4F46E5', backgroundColor: 'rgba(79,70,229,0.1)', fill: true, tension: 0.3 }] },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });
    }

    async function rannGrafikProfit() {
        const canvas = document.getElementById('biProfitChart');
        if (!canvas || typeof Chart === 'undefined') return;
        const { labels, benefis } = await window.BiService.getSeriMensuel(6);
        if (chartProfit) chartProfit.destroy();
        chartProfit = new Chart(canvas, {
            type: 'bar',
            data: { labels, datasets: [{ label: 'Benefis (HTG)', data: benefis, backgroundColor: benefis.map(v => v >= 0 ? '#10B981' : '#EF4444'), borderRadius: 4 }] },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });
    }

    async function rannGrafikRevenueGrowth() {
        const canvas = document.getElementById('biRevenueGrowthChart');
        if (!canvas || typeof Chart === 'undefined') return;
        const { labels, kwasans } = await window.BiService.getSeriMensuel(6);
        if (chartRevenueGrowth) chartRevenueGrowth.destroy();
        chartRevenueGrowth = new Chart(canvas, {
            type: 'line',
            data: { labels, datasets: [{ label: 'Kwasans (%)', data: kwasans, borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.1)', fill: true, tension: 0.3 }] },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });
    }

    async function rannGrafikClientRadar() {
        const canvas = document.getElementById('biDeptRadarChart');
        if (!canvas || typeof Chart === 'undefined') return;
        const { labels, valè } = await window.BiService.getKliyanParKategori();
        if (chartClientRadar) chartClientRadar.destroy();
        chartClientRadar = new Chart(canvas, {
            type: 'radar',
            data: { labels, datasets: [{ label: 'Kliyan pa Kategori', data: valè, borderColor: '#6366F1', backgroundColor: 'rgba(99,102,241,0.2)' }] },
            options: { responsive: true }
        });
    }

    // ================= 11.2 / 11.3 FINANCIER =================

    async function rannAnaliseFinanciere() {
        try {
            const s = await window.BiService.getFinancialAnalysis();
            setText('kpiBiCaMwa', fmtHTG(s.chifAfèMwa));
            setText('kpiBiCaMwaPase', fmtHTG(s.chifAfèMwaPase));
            setText('kpiBiCaAnePase', fmtHTG(s.chifAfèAnePase));
            setText('kpiBiMargeBrute', s.margeBrute.toFixed(0) + '%');
            setText('kpiBiMargeNette', s.margeNette.toFixed(1).replace('.', ',') + '%');
            setText('kpiBiLiquidite', s.liquidité != null ? s.liquidité.toFixed(1) + 'x' : '—');
        } catch (e) {
            console.warn('BiUI: rannAnaliseFinanciere echwe', e);
        }
    }

    async function rannPrevisionsTresorerie() {
        try {
            const s = await window.BiService.getCashFlowForecast();
            const setValSigné = (id, n) => {
                const el = document.getElementById(id);
                if (!el) return;
                el.textContent = (n >= 0 ? '+' : '') + Math.round(n).toLocaleString('fr-HT');
                el.style.color = n >= 0 ? 'var(--secondary)' : 'var(--danger)';
            };
            setValSigné('kpiBiCash7j', s.j7);
            setValSigné('kpiBiCash30j', s.j30);
            setValSigné('kpiBiCash90j', s.j90);
            setValSigné('kpiBiCash1an', s.an1);
        } catch (e) {
            console.warn('BiUI: rannPrevisionsTresorerie echwe', e);
        }
    }

    // ================= 11.4 STOCK =================

    async function rannAnaliseStock() {
        try {
            const s = await window.BiService.getStockAnalysis();
            setText('kpiBiStockValè', fmtHTG(s.valèStòk));
            setText('kpiBiStockFaible', s.stockFèb);
            setText('kpiBiStockRotation', s.rotasyon.toFixed(1) + 'x/an');
            setText('kpiBiStockTopVente', s.topVente);
            setText('kpiBiStockPaDeplase', s.paDeplase);
        } catch (e) {
            console.warn('BiUI: rannAnaliseStock echwe', e);
        }
    }

    // ================= 11.5 CLIENT =================

    async function rannAnaliseClient() {
        try {
            const [s, kat] = await Promise.all([
                window.BiService.getClientAnalysis(),
                window.BiService.getKliyanParKategori()
            ]);
            setText('kpiBiNouvoKliyan', s.nouvoKliyan);
            setText('kpiBiPiBonKliyan', s.piBonKliyan);
            setText('kpiBiRevniPaKliyan', fmtHTG(s.revniPaKliyan));
            setText('kpiBiFrekansAcha', s.frekansAcha.toFixed(1) + 'x/mwa');

            const kontenè = document.getElementById('biKliyanBadges');
            if (kontenè) {
                const badges = kat.labels.map((l, i) =>
                    `<span class="ged-status" style="background:#F1F5F9;">${l}: ${kat.valè[i]}</span>`
                ).join('');
                kontenè.innerHTML = badges +
                    `<span class="ged-status" style="background:#FEE2E2; color:#B91C1C;">Inactif: ${s.inaktif}</span>`;
            }
        } catch (e) {
            console.warn('BiUI: rannAnaliseClient echwe', e);
        }
    }

    // ================= 11.6 FOUNISÈ =================

    async function rannAnaliseFounise() {
        try {
            const s = await window.BiService.getSuppliersAnalysis();
            setText('kpiBiFounise', s.founiseAktif);
            setText('kpiBiMontanAcha', fmtHTG(s.montanAchaMwa));
            setText('kpiBiTopFounise', s.topFounise);
        } catch (e) {
            console.warn('BiUI: rannAnaliseFounise echwe', e);
        }
    }

    // ================= 11.7 RH =================

    async function rannAnaliseRH() {
        try {
            const s = await window.BiService.getHrAnalysis();
            setText('kpiBiTotalAnplwaye', s.totalAnplwaye);
            setText('kpiBiKoutSalè', fmtHTG(s.koutSalè));
            setText('kpiBiAbsans', s.absans);
            setText('kpiBiKonje', s.konje);
        } catch (e) {
            console.warn('BiUI: rannAnaliseRH echwe', e);
        }
    }

    // ================= INISYALIZASYON =================

    async function chajeSeksyonBi() {
        if (!window.currentCompanyId) {
            console.warn('bi_ui.js: pa gen biznis aktif chwazi');
            return;
        }
        await rannKpiPrensipal();
        await Promise.all([
            rannGrafikSalesTrend(),
            rannGrafikProfit(),
            rannGrafikRevenueGrowth(),
            rannGrafikClientRadar(),
            rannAnaliseFinanciere(),
            rannPrevisionsTresorerie(),
            rannAnaliseStock(),
            rannAnaliseFounise(),
            rannAnaliseRH(),
            rannAnaliseClient()
        ]);
    }

    window.BiUI = { chajeSeksyonBi };

    document.addEventListener('DOMContentLoaded', () => {
        const biNavItem = document.querySelector('[data-target="bi"]');
        if (biNavItem) {
            biNavItem.addEventListener('click', () => window.BiUI.chajeSeksyonBi());
        }
    });
})();
