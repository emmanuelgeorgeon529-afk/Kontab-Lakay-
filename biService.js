// js/services/biService.js
// Agrège done ki soti nan SalesService, CustomersService, KesService,
// DepansService, ProductsService, CommandesService, SuppliersService,
// RhService, PayrollService pou Dashboard BI (Modil 11 — Business
// Intelligence & Executive Dashboard).
// Pa gen okenn ekriti Firestore isit — sèvis sa a li sèlman.

const BiService = (() => {

    function getBizRef() {
        if (!window.currentCompanyId) throw new Error("Pa gen biznis aktif chwazi.");
        return window.db.collection('biznis').doc(window.currentCompanyId);
    }

    function premyeJouMwa(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
    function premyeJouMwaPase(d) { return new Date(d.getFullYear(), d.getMonth() - 1, 1); }

    // ================= 11.1 DASHBOARD EGZEKITIF =================

    /**
     * Balans Kès "an tan reyèl" — repwodui menm lojik ak KesService.fèmenSesyon(),
     * men san fèmen sesyon an. Si pa gen sesyon ouvè, itilize balans dènye
     * sesyon fèmen kòm apwoksimasyon.
     */
    async function getKesDisponib() {
        const bizRef = getBizRef();
        const sesyonAktif = await window.KesService.getSesyonAktif();

        if (!sesyonAktif) {
            const dènyeSesyons = await window.KesService.getSesyons(1);
            return dènyeSesyons[0]?.montanFèmtiReyèl || 0;
        }

        const dateOuvèti = sesyonAktif.dateOuvèti.toDate();

        const mouvmanSnap = await bizRef.collection('kes_mouvman')
            .where('sesyonId', '==', sesyonAktif.id).get();
        let mouvmanAntre = 0, mouvmanSòti = 0;
        mouvmanSnap.docs.forEach(d => {
            const m = d.data();
            if (m.tip === 'antre') mouvmanAntre += m.montan;
            else if (m.tip === 'sòti') mouvmanSòti += m.montan;
        });

        const [toutVant, toutAcha, toutDepans] = await Promise.all([
            window.SalesService.getSales(500),
            window.PurchasesService?.getPurchases(500) ?? Promise.resolve([]),
            window.DepansService.getDepans(500)
        ]);

        const vantKach = toutVant.filter(v => v.estati !== 'anile' && v.mòdPeman === 'kach' &&
            v.dat?.toDate && v.dat.toDate() >= dateOuvèti).reduce((s, v) => s + (v.total || 0), 0);
        const achatKach = toutAcha.filter(a => a.estati !== 'anile' && a.mòdPeman === 'kach' &&
            a.dat?.toDate && a.dat.toDate() >= dateOuvèti).reduce((s, a) => s + (a.total || 0), 0);
        const depansKach = toutDepans.filter(d => d.mòdPeman === 'kach' &&
            d.dat?.toDate && d.dat.toDate() >= dateOuvèti).reduce((s, d) => s + (d.montan || 0), 0);

        return sesyonAktif.montanOuvèti + mouvmanAntre - mouvmanSòti + vantKach - achatKach - depansKach;
    }

    /**
     * Estatistik prensipal Dashboard Egzekitif (11.1).
     * NÒT — "Benefis Nèt" isit se yon apwoksimasyon senp: Revni Mwa a − Depans Mwa a.
     * Li PA soustrè kout machandiz vann (COGS), paske sa mande yon rapò pri
     * kouvran (priAchat pa atik vandi) ki poko konfime. Konfime ak Emmanuel
     * si l vle yon kalkil pi presi (Revni − COGS − Depans).
     */
    async function getDashboardStats() {
        const jodiA = new Date(); jodiA.setHours(0, 0, 0, 0);
        const kòmansmanMwa = premyeJouMwa(new Date());
        const kòmansmanMwaPase = premyeJouMwaPase(new Date());

        const [sales, clients, depans, produits, kòmand, kesDisponib] = await Promise.all([
            window.SalesService.getSales(500),
            window.CustomersService.getCustomers(true),
            window.DepansService.getDepans(500),
            window.ProductsService.getProducts(true),
            window.CommandesService?.getOrders(200) ?? Promise.resolve([]),
            getKesDisponib()
        ]);

        const salesActives = sales.filter(s => s.estati !== 'anile');

        let lavantJodi = 0, revniMwa = 0, revniMwaPase = 0, pwodwiVannMwa = 0;
        salesActives.forEach(s => {
            const dat = s.dat?.toDate ? s.dat.toDate() : null;
            if (!dat) return;
            if (dat >= jodiA) lavantJodi += (s.total || 0);
            if (dat >= kòmansmanMwa) {
                revniMwa += (s.total || 0);
                pwodwiVannMwa += (s.atik || []).reduce((n, a) => n + (a.kantite || 0), 0);
            } else if (dat >= kòmansmanMwaPase && dat < kòmansmanMwa) {
                revniMwaPase += (s.total || 0);
            }
        });

        // NÒT: getDepans() retounen sèlman depans ki deja finalize/peye
        // (depans ki depase sèy apwobasyon pa parèt la a paske yo poko egzekite).
        let depansMwa = 0, depansMwaPase = 0;
        depans.forEach(d => {
            const dat = d.dat?.toDate ? d.dat.toDate() : null;
            if (!dat) return;
            if (dat >= kòmansmanMwa) depansMwa += (d.montan || 0);
            else if (dat >= kòmansmanMwaPase && dat < kòmansmanMwa) depansMwaPase += (d.montan || 0);
        });

        const benefisNèt = revniMwa - depansMwa;
        const benefisMwaPase = revniMwaPase - depansMwaPase;

        const kòmandAnKour = kòmand.filter(c => !['livrée', 'annulée'].includes(c.estati)).length;

        return {
            kesDisponib,
            lavantJodi,
            revniMwa, revniMwaPase,
            depansMwa, depansMwaPase,
            benefisNèt, benefisMwaPase,
            kliyanAktif: clients.length,
            pwodwiVannMwa,
            kòmandAnKour
        };
    }

    /** Chif Revni/Depans/Benefis/Kwasans pa mwa, N dènye mwa (pou grafik). */
    async function getSeriMensuel(nMwa = 6) {
        const [sales, depans] = await Promise.all([
            window.SalesService.getSales(1000),
            window.DepansService.getDepans(1000)
        ]);

        const kle = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const revniParMwa = {}, depansParMwa = {};

        sales.filter(s => s.estati !== 'anile').forEach(s => {
            const dat = s.dat?.toDate ? s.dat.toDate() : null;
            if (!dat) return;
            const k = kle(dat);
            revniParMwa[k] = (revniParMwa[k] || 0) + (s.total || 0);
        });
        depans.forEach(d => {
            const dat = d.dat?.toDate ? d.dat.toDate() : null;
            if (!dat) return;
            const k = kle(dat);
            depansParMwa[k] = (depansParMwa[k] || 0) + (d.montan || 0);
        });

        const jodiA = new Date();
        const labels = [];
        for (let i = nMwa - 1; i >= 0; i--) {
            const d = new Date(jodiA.getFullYear(), jodiA.getMonth() - i, 1);
            labels.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }

        const revni = labels.map(k => revniParMwa[k] || 0);
        const depansArr = labels.map(k => depansParMwa[k] || 0);
        const benefis = labels.map((k, i) => revni[i] - depansArr[i]);
        const kwasans = labels.map((k, i) => {
            if (i === 0 || revni[i - 1] === 0) return 0;
            return Math.round(((revni[i] - revni[i - 1]) / revni[i - 1]) * 100);
        });

        return { labels, revni, depans: depansArr, benefis, kwasans };
    }

    /**
     * Distribisyon kliyan pa kategori (pou grafik Radar 11.1 ak badges 11.5).
     * Kategori yo dwe idantik ak seleksyon 'custKategori' nan modal Nouvo Kliyan.
     */
    async function getKliyanParKategori() {
        const clients = await window.CustomersService.getCustomers(true);
        const kategoriList = ['Particulier', 'PME', 'Grande Entreprise', 'VIP'];
        const konte = Object.fromEntries(kategoriList.map(k => [k, 0]));
        clients.forEach(k => {
            if (konte.hasOwnProperty(k.kategori)) konte[k.kategori]++;
        });
        return { labels: kategoriList, valè: kategoriList.map(k => konte[k]) };
    }

    // ================= 11.2 / 11.3 FINANCIER =================

    async function getRevniMenmMwaAnePase() {
        const jodiA = new Date();
        const kòmansman = new Date(jodiA.getFullYear() - 1, jodiA.getMonth(), 1);
        const fen = new Date(jodiA.getFullYear() - 1, jodiA.getMonth() + 1, 1);
        const sales = await window.SalesService.getSales(2000);
        return sales.filter(s => s.estati !== 'anile' && s.dat?.toDate &&
            s.dat.toDate() >= kòmansman && s.dat.toDate() < fen)
            .reduce((sum, s) => sum + (s.total || 0), 0);
    }

    /**
     * Analyse Financière (11.2) — CA, Marge Brute, Marge Nette, Liquidité.
     * NÒT — Marge Brute/Nette itilize priAchat AKTYÈL pwodwi a, pa yon kout
     * istorik reyèl nan moman vant lan (menm limit ak getStockAnalysis()).
     */
    async function getFinancialAnalysis() {
        const [dashStats, produits, sales, founise, clients, revniAnePase] = await Promise.all([
            getDashboardStats(),
            window.ProductsService.getProducts(true),
            window.SalesService.getSales(1000),
            window.SuppliersService.getSuppliers(true),
            window.CustomersService.getCustomers(true),
            getRevniMenmMwaAnePase()
        ]);

        const kòmansmanMwa = premyeJouMwa(new Date());
        const kantiteVannParPwodwiMwa = {};
        sales.filter(s => s.estati !== 'anile' && s.dat?.toDate && s.dat.toDate() >= kòmansmanMwa)
            .forEach(s => (s.atik || []).forEach(a => {
                kantiteVannParPwodwiMwa[a.pwodwiId] = (kantiteVannParPwodwiMwa[a.pwodwiId] || 0) + (a.kantite || 0);
            }));
        let coutMwa = 0;
        produits.forEach(p => { coutMwa += (kantiteVannParPwodwiMwa[p.id] || 0) * (p.priAchat || 0); });

        const margeBrute = dashStats.revniMwa > 0 ? ((dashStats.revniMwa - coutMwa) / dashStats.revniMwa) * 100 : 0;
        const margeNette = dashStats.revniMwa > 0 ? (dashStats.benefisNèt / dashStats.revniMwa) * 100 : 0;

        const dètClients = clients.reduce((s, k) => s + (k.dèt || 0), 0);
        const dètFounise = founise.reduce((s, f) => s + (f.dèt || 0), 0);
        const liquidité = dètFounise > 0 ? (dashStats.kesDisponib + dètClients) / dètFounise : null;

        return {
            chifAfèMwa: dashStats.revniMwa,
            chifAfèMwaPase: dashStats.revniMwaPase,
            chifAfèAnePase: revniAnePase,
            margeBrute, margeNette, liquidité
        };
    }

    /**
     * Prévisions Trésorerie (11.3) — pwojeksyon LINEYÈ SENP baze sou mwayèn
     * netKotidyen 30 dènye jou (Lavant − Depans − Acha − Pewòl). Sa se yon
     * apwoksimasyon debaz, PA yon modèl estatistik/prédiktif — konfime ak
     * Emmanuel si li vle yon apwòch pi sofistike pita.
     * NÒT — Pewòl konte SEPAREMAN paske PayrollService.jenerePewol() PA
     * ekri nan koleksyon 'depans' (li ekri dirèkteman nan 'pewol'/'jounal').
     */
    async function getCashFlowForecast() {
        const jodiA = new Date();
        const trantJouPase = new Date(jodiA.getTime() - 30 * 24 * 60 * 60 * 1000);

        const [sales, depans, acha, pewolList] = await Promise.all([
            window.SalesService.getSales(1000),
            window.DepansService.getDepans(1000),
            window.PurchasesService?.getPurchases(1000) ?? Promise.resolve([]),
            window.PayrollService?.listeTouPewol(window.currentCompanyId, 20) ?? Promise.resolve([])
        ]);

        const revni30j = sales.filter(s => s.estati !== 'anile' && s.dat?.toDate && s.dat.toDate() >= trantJouPase)
            .reduce((s, v) => s + (v.total || 0), 0);
        const depans30j = depans.filter(d => d.dat?.toDate && d.dat.toDate() >= trantJouPase)
            .reduce((s, d) => s + (d.montan || 0), 0);
        const acha30j = acha.filter(a => a.estati !== 'anile' && a.dat?.toDate && a.dat.toDate() >= trantJouPase)
            .reduce((s, a) => s + (a.total || 0), 0);
        const pewol30j = pewolList.filter(p => p.jenereNan?.toDate && p.jenereNan.toDate() >= trantJouPase)
            .reduce((s, p) => s + (p.totaux?.net || 0), 0);

        const netKotidyen = (revni30j - depans30j - acha30j - pewol30j) / 30;

        return {
            j7: Math.round(netKotidyen * 7),
            j30: Math.round(netKotidyen * 30),
            j90: Math.round(netKotidyen * 90),
            an1: Math.round(netKotidyen * 365)
        };
    }

    // ================= 11.4 STOCK =================

    /** Analiz Stock (11.4) — valè, alèt, rotasyon apwoksimatif, top/pa deplase. */
    async function getStockAnalysis() {
        const [produits, sales] = await Promise.all([
            window.ProductsService.getProducts(true),
            window.SalesService.getSales(1000)
        ]);

        const valèStòk = produits.reduce((s, p) => s + (p.kantiteStock || 0) * (p.priAchat || 0), 0);
        const lowStock = await window.ProductsService.getLowStockProducts();
        const stockFèb = lowStock.length;

        const jodiA = new Date();
        const douzMwaPase = new Date(jodiA.getFullYear(), jodiA.getMonth() - 11, 1);
        const kantiteVannParPwodwi = {};
        sales.filter(s => s.estati !== 'anile').forEach(s => {
            const dat = s.dat?.toDate ? s.dat.toDate() : null;
            if (!dat || dat < douzMwaPase) return;
            (s.atik || []).forEach(a => {
                kantiteVannParPwodwi[a.pwodwiId] = (kantiteVannParPwodwi[a.pwodwiId] || 0) + (a.kantite || 0);
            });
        });

        let koutMachandizVandi = 0;
        produits.forEach(p => {
            koutMachandizVandi += (kantiteVannParPwodwi[p.id] || 0) * (p.priAchat || 0);
        });
        // NÒT: apwoksimasyon — divize pa valè stòk AKTYÈL, pa yon mwayèn sou peryòd la.
        const rotasyon = valèStòk > 0 ? (koutMachandizVandi / valèStòk) : 0;

        let topVente = '—', topKantite = 0;
        Object.entries(kantiteVannParPwodwi).forEach(([pwodwiId, kantite]) => {
            if (kantite > topKantite) {
                const p = produits.find(pp => pp.id === pwodwiId);
                if (p) { topKantite = kantite; topVente = p.non; }
            }
        });

        const paDeplase = produits.filter(p => !kantiteVannParPwodwi[p.id]).length;

        return { valèStòk, stockFèb, rotasyon, topVente, paDeplase };
    }

    // ================= 11.5 CLIENT =================

    /** Analiz Client (11.5) — nouvo kliyan, top kliyan, revni/frekans mwayèn, inaktif. */
    async function getClientAnalysis() {
        const kòmansmanMwa = premyeJouMwa(new Date());

        const [clientsAktif, tousClients, sales] = await Promise.all([
            window.CustomersService.getCustomers(true),
            window.CustomersService.getCustomers(false),
            window.SalesService.getSales(1000)
        ]);

        const nouvoKliyan = clientsAktif.filter(k =>
            k.dat?.toDate && k.dat.toDate() >= kòmansmanMwa).length;

        const salesActives = sales.filter(s => s.estati !== 'anile' && s.kliyanId);
        const revniParKliyan = {};
        salesActives.forEach(s => {
            revniParKliyan[s.kliyanId] = (revniParKliyan[s.kliyanId] || 0) + (s.total || 0);
        });

        let piBonKliyan = '—', piBonRevni = 0;
        Object.entries(revniParKliyan).forEach(([kliyanId, revni]) => {
            if (revni > piBonRevni) {
                const k = tousClients.find(c => c.id === kliyanId);
                if (k) { piBonRevni = revni; piBonKliyan = k.non; }
            }
        });

        const kliyanAvecVant = Object.keys(revniParKliyan).length;
        const totalRevni = Object.values(revniParKliyan).reduce((s, v) => s + v, 0);
        const revniPaKliyan = kliyanAvecVant > 0 ? totalRevni / kliyanAvecVant : 0;

        // Frekans Acha: mwayèn kantite vant pa kliyan pa mwa, sou 6 dènye mwa
        const jodiA = new Date();
        const sisMwaPase = new Date(jodiA.getFullYear(), jodiA.getMonth() - 5, 1);
        const vantSisMwa = salesActives.filter(s => s.dat?.toDate && s.dat.toDate() >= sisMwaPase);
        const kliyanUnikSisMwa = new Set(vantSisMwa.map(s => s.kliyanId)).size;
        const frekansAcha = kliyanUnikSisMwa > 0 ? (vantSisMwa.length / kliyanUnikSisMwa / 6) : 0;

        const inaktif = tousClients.filter(k => k.aktif === false).length;

        return { nouvoKliyan, piBonKliyan, revniPaKliyan, frekansAcha, inaktif };
    }

    // ================= 11.6 FOUNISÈ =================

    /** Analiz Founisè (11.6) — kantite aktif, montan acha mwa a, top founisè. */
    async function getSuppliersAnalysis() {
        const [founise, acha] = await Promise.all([
            window.SuppliersService.getSuppliers(true),
            window.PurchasesService.getPurchases(500)
        ]);

        const kòmansmanMwa = premyeJouMwa(new Date());
        let montanAchaMwa = 0;
        const achaParFounise = {};

        acha.filter(a => a.estati !== 'anile').forEach(a => {
            const dat = a.dat?.toDate ? a.dat.toDate() : null;
            if (dat && dat >= kòmansmanMwa) montanAchaMwa += (a.total || 0);
            const kle = a.founiseNon || 'Enkoni';
            achaParFounise[kle] = (achaParFounise[kle] || 0) + (a.total || 0);
        });

        let topFounise = '—', topMontan = 0;
        Object.entries(achaParFounise).forEach(([non, montan]) => {
            if (montan > topMontan) { topMontan = montan; topFounise = non; }
        });

        return { founiseAktif: founise.length, montanAchaMwa, topFounise };
    }

    // ================= 11.7 RH =================

    /**
     * Analiz RH (11.7) — total anplwaye, kout salè, absans, konje.
     * NÒT — "Absans" konpare anplwaye aktif ki PA pwente antre jodi a. Sa PA
     * eskli moun ki an konje jodi a. "Kout Salè" se dènye pewòl JENERE, pa
     * nesesèman mwa kalandriye kouran an.
     */
    async function getHrAnalysis() {
        const bizId = window.currentCompanyId;
        if (!bizId) throw new Error("Pa gen biznis aktif chwazi.");

        const [anplwayeAktif, prezansJodiya, anKonjeKounyeya, pewolList] = await Promise.all([
            window.RhService.listeAnplwayeAktif(bizId),
            window.RhService.listePrezansJodiya(bizId),
            window.RhService.listeAnplwayeAnKonjeKounyeya(bizId),
            window.PayrollService.listeTouPewol(bizId, 1)
        ]);

        const totalAnplwaye = anplwayeAktif.length;

        const anplwayeIdPwente = new Set(prezansJodiya.map(p => p.anplwayeId));
        const absans = anplwayeAktif.filter(a => !anplwayeIdPwente.has(a.id)).length;

        const koutSalè = pewolList[0]?.totaux?.brit || 0;

        return { totalAnplwaye, koutSalè, absans, konje: anKonjeKounyeya };
    }

    return {
        getKesDisponib, getDashboardStats, getSeriMensuel, getKliyanParKategori,
        getFinancialAnalysis, getCashFlowForecast,
        getStockAnalysis, getClientAnalysis, getSuppliersAnalysis, getHrAnalysis
    };
})();

window.BiService = BiService;
          
