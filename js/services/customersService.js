// js/services/customersService.js
// Depann de window.db (inisyalize nan config.js) ak window.currentCompanyId, window.AdminService

const CustomersService = (() => {

    function getBizRef() {
        if (!window.currentCompanyId) throw new Error("Pa gen biznis aktif chwazi.");
        return window.db.collection('biznis').doc(window.currentCompanyId);
    }

    // ---------- KREYE KLIYAN ----------

    /**
     * @param {Object} data
     *   data.non         - non konplè oswa non antrepriz
     *   data.telefòn     - nimewo telefòn
     *   data.imèl        - imèl (opsyonèl)
     *   data.adrès       - adrès (opsyonèl)
     *   data.kategori    - 'Particulier' | 'PME' | 'Grande Entreprise' | 'VIP'
     *   data.limitKredi  - limit kredi otorize (default 0 = pa gen kredi)
     */
    async function createCustomer(data) {
        if (!data.non || !data.non.trim()) {
            throw new Error("Non kliyan an obligatwa.");
        }

        const bizRef = getBizRef();
        const kliyanRef = bizRef.collection('kliyan').doc();

        await kliyanRef.set({
            non: data.non.trim(),
            telefòn: data.telefòn || null,
            imèl: data.imèl || null,
            adrès: data.adrès || null,
            kategori: data.kategori || 'Particulier',
            limitKredi: data.limitKredi || 0,
            dèt: 0,
            aktif: true,
            dat: firebase.firestore.FieldValue.serverTimestamp()
        });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId,
                'Ventes',
                'Kreye Kliyan',
                '—',
                data.non.trim()
            ).catch(err => console.warn('Audit log echwe:', err));
        }

        return { id: kliyanRef.id };
    }

    // ---------- LI KLIYAN YO ----------

    async function getCustomers(onlyActive = true) {
        const bizRef = getBizRef();
        let query = bizRef.collection('kliyan').orderBy('non', 'asc');
        if (onlyActive) {
            query = query.where('aktif', '==', true);
        }
        const snapshot = await query.get();
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    async function getCustomerById(customerId) {
        const bizRef = getBizRef();
        const doc = await bizRef.collection('kliyan').doc(customerId).get();
        if (!doc.exists) throw new Error("Kliyan sa a pa egziste.");
        return { id: doc.id, ...doc.data() };
    }

    // ---------- MODIFYE KLIYAN (enfòmasyon jeneral, PA dèt) ----------

    async function updateCustomer(customerId, updates) {
        const bizRef = getBizRef();
        const allowedFields = ['non', 'telefòn', 'imèl', 'adrès', 'kategori', 'limitKredi'];
        const cleanUpdates = {};
        allowedFields.forEach(f => {
            if (updates[f] !== undefined) cleanUpdates[f] = updates[f];
        });
        if (Object.keys(cleanUpdates).length === 0) {
            throw new Error("Pa gen chan valid pou modifye.");
        }
        await bizRef.collection('kliyan').doc(customerId).update(cleanUpdates);

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId,
                'Ventes',
                'Modifye Kliyan',
                customerId,
                JSON.stringify(cleanUpdates)
            ).catch(err => console.warn('Audit log echwe:', err));
        }
    }

    // ---------- VERIFYE LIMIT KREDI (itilize pa salesService anvan yon vant kredi) ----------

    async function checkCreditLimit(customerId, montanNouvo) {
        const kliyan = await getCustomerById(customerId);
        const dètApre = (kliyan.dèt || 0) + montanNouvo;
        if (kliyan.limitKredi > 0 && dètApre > kliyan.limitKredi) {
            throw new Error(`Vant sa a depase limit kredi kliyan an (Limit: ${kliyan.limitKredi} HTG, Dèt apre vant: ${dètApre} HTG).`);
        }
        return true;
    }

    // ---------- ANREJISTRE PEMAN (RECOUVREMENT) ----------

    /**
     * @param {string} customerId
     * @param {number} montan - montan peman an (pozitif)
     * @param {string} mòdPeman - 'kach' | 'moncash' | 'kat' | 'transfè'
     */
    async function recordPayment(customerId, montan, mòdPeman) {
        if (!montan || montan <= 0) {
            throw new Error("Montan peman an dwe pi gran pase 0.");
        }

        const bizRef = getBizRef();

        const rezilta = await window.db.runTransaction(async (transaction) => {
            const kliyanRef = bizRef.collection('kliyan').doc(customerId);
            const kliyanDoc = await transaction.get(kliyanRef);
            if (!kliyanDoc.exists) throw new Error("Kliyan sa a pa egziste.");

            const dètAktyèl = kliyanDoc.data().dèt || 0;
            const nouvoDèt = Math.max(0, dètAktyèl - montan);

            transaction.update(kliyanRef, { dèt: nouvoDèt });

            // Ekriti jounal: Débit Kès/Bank, Crédit Kliyan (1030)
            const journalRef = bizRef.collection('jounal').doc();
            const kontDebit = mòdPeman === 'transfè' ? '1020' : '1010'; // Bank oswa Kès
            transaction.set(journalRef, {
                dat: firebase.firestore.FieldValue.serverTimestamp(),
                liy: [
                    { kont: kontDebit, débit: montan, crédit: 0 },
                    { kont: '1030', débit: 0, crédit: montan }
                ],
                referans: customerId,
                sous: 'recouvrement'
            });

            // Anrejistreman istorik peman
            const pemanRef = bizRef.collection('peman_kliyan').doc();
            transaction.set(pemanRef, {
                kliyanId: customerId,
                kliyanNon: kliyanDoc.data().non,
                montan: montan,
                mòdPeman: mòdPeman,
                dètAvan: dètAktyèl,
                dètApre: nouvoDèt,
                dat: firebase.firestore.FieldValue.serverTimestamp()
            });

            return { dètAvan: dètAktyèl, dètApre: nouvoDèt, kliyanNon: kliyanDoc.data().non };
        });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId,
                'Ventes',
                'Peman Kliyan (Recouvrement)',
                `${rezilta.kliyanNon} — dèt ${rezilta.dètAvan.toLocaleString()} HTG`,
                `dèt ${rezilta.dètApre.toLocaleString()} HTG (peye ${montan.toLocaleString()} HTG, ${mòdPeman})`
            ).catch(err => console.warn('Audit log echwe:', err));
        }

        return { dètAvan: rezilta.dètAvan, dètApre: rezilta.dètApre };
    }

    // ---------- DEZAKTIVE (JAMAIS DELETE) ----------

    async function deactivateCustomer(customerId) {
        const bizRef = getBizRef();
        await bizRef.collection('kliyan').doc(customerId).update({ aktif: false });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId,
                'Ventes',
                'Dezaktive Kliyan',
                'aktif',
                'dezaktive'
            ).catch(err => console.warn('Audit log echwe:', err));
        }
    }

    async function reactivateCustomer(customerId) {
        const bizRef = getBizRef();
        await bizRef.collection('kliyan').doc(customerId).update({ aktif: true });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId,
                'Ventes',
                'Reaktive Kliyan',
                'dezaktive',
                'aktif'
            ).catch(err => console.warn('Audit log echwe:', err));
        }
    }

    // ---------- KLIYAN KI GEN DÈT (pou rapò Recouvrement) ----------

    async function getCustomersWithDebt() {
        const bizRef = getBizRef();
        const snapshot = await bizRef.collection('kliyan')
            .where('dèt', '>', 0)
            .orderBy('dèt', 'desc')
            .get();
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    // ---------- API PIBLIK ----------
    return {
        createCustomer,
        getCustomers,
        getCustomerById,
        updateCustomer,
        checkCreditLimit,
        recordPayment,
        deactivateCustomer,
        reactivateCustomer,
        getCustomersWithDebt
    };
})();

window.CustomersService = CustomersService;
