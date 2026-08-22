// js/services/accountingService.js
// Depann de window.db ak window.currentCompanyId, window.AdminService

const AccountingService = (() => {

    function getBizRef() {
        if (!window.currentCompanyId) throw new Error("Pa gen biznis aktif chwazi.");
        return window.db.collection('biznis').doc(window.currentCompanyId);
    }

    // ---------- PLAN DE COMPTES ----------

    async function getChartOfAccounts() {
        const bizRef = getBizRef();
        const snapshot = await bizRef.collection('plan_comptes').orderBy('kòd', 'asc').get();
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    // ---------- EKRITI JOUNAL MANYÈL ----------

    /**
     * @param {Object} entryData
     *   entryData.liy - [{ kont, débit, crédit }] — total débit dwe egal total crédit
     *   entryData.libellé - deskripsyon ekriti a
     *   entryData.referans - referans dokiman sous (obligatwa pa firestore.rules)
     *   entryData.sous - 'manuel' | 'automatique'
     */
    // FIKS: ajoute `referans` — firestore.rules egzije hasAll(['liy','dat','referans','sous'])
    // pou nenpòt ekriti nan koleksyon 'jounal'; san li, chak ekriti manyèl te refize.
    async function addJournalEntry(entryData) {
        if (!entryData.referans || !String(entryData.referans).trim()) {
            throw new Error("Yon referans obligatwa pou chak ekriti jounal (dokiman sous, oswa 'manuel-' + dat si pa gen okenn).");
        }

        const totalDébit = entryData.liy.reduce((s, l) => s + (l.débit || 0), 0);
        const totalCrédit = entryData.liy.reduce((s, l) => s + (l.crédit || 0), 0);

        if (Math.abs(totalDébit - totalCrédit) > 0.01) {
            throw new Error(`Ekriti pa balanse: Débit ${totalDébit} ≠ Crédit ${totalCrédit}`);
        }

        const bizRef = getBizRef();
        const journalRef = bizRef.collection('jounal').doc();

        await journalRef.set({
            liy: entryData.liy,
            libellé: entryData.libellé || '',
            sous: entryData.sous || 'manuel',
            referans: entryData.referans,
            dat: firebase.firestore.FieldValue.serverTimestamp(),
            itilizatèId: window.auth?.currentUser?.uid || null
        });

        // ---- AUDIT LOG (apre ekriti konfime, pa blòke si l echwe) ----
        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId,
                'Kontabilite',
                'Ekriti Jounal Manyèl',
                '—',
                `${entryData.libellé || 'San libellé'} (${totalDébit.toLocaleString()} HTG)`
            ).catch(err => console.warn('Audit log echwe:', err));
        }

        return { id: journalRef.id };
    }

    // ---------- BALANCE GÉNÉRALE (soti nan tout ekriti jounal) ----------

    async function getBalanceSheet(asOfDate) {
        const bizRef = getBizRef();
        let query = bizRef.collection('jounal').orderBy('dat', 'asc');
        if (asOfDate) {
            query = query.where('dat', '<=', asOfDate);
        }
        const snapshot = await query.get();

        const soldeParKont = {};
        snapshot.docs.forEach(doc => {
            const entry = doc.data();
            (entry.liy || []).forEach(l => {
                if (!soldeParKont[l.kont]) soldeParKont[l.kont] = { débit: 0, crédit: 0 };
                soldeParKont[l.kont].débit += l.débit || 0;
                soldeParKont[l.kont].crédit += l.crédit || 0;
            });
        });

        const totalDébit = Object.values(soldeParKont).reduce((s, k) => s + k.débit, 0);
        const totalCrédit = Object.values(soldeParKont).reduce((s, k) => s + k.crédit, 0);

        return {
            soldeParKont,
            totalDébit,
            totalCrédit,
            ekilib: Math.abs(totalDébit - totalCrédit) < 0.01
        };
    }

    // ---------- COMPTE DE RÉSULTAT (Revenus - Charges) ----------

    async function getProfitAndLoss(startDate, endDate) {
        const bizRef = getBizRef();
        let query = bizRef.collection('jounal').orderBy('dat', 'asc');
        if (startDate) query = query.where('dat', '>=', startDate);
        if (endDate) query = query.where('dat', '<=', endDate);
        const snapshot = await query.get();

        let revenue = 0;
        let expenses = 0;

        snapshot.docs.forEach(doc => {
            const entry = doc.data();
            (entry.liy || []).forEach(l => {
                // Kont 4xxx = Revenus (kredite pou ogmante)
                if (l.kont && l.kont.startsWith('4')) {
                    revenue += (l.crédit || 0) - (l.débit || 0);
                }
                // Kont 6xxx = Charges (debite pou ogmante)
                if (l.kont && l.kont.startsWith('6')) {
                    expenses += (l.débit || 0) - (l.crédit || 0);
                }
            });
        });

        return {
            revenue,
            expenses,
            netProfit: revenue - expenses
        };
    }

    // ---------- API PIBLIK ----------
    return {
        getChartOfAccounts,
        addJournalEntry,
        getBalanceSheet,
        getProfitAndLoss
    };
})();

window.AccountingService = AccountingService;
