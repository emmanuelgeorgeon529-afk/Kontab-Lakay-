// js/services/purchasesService.js
// Depann de window.db, window.currentCompanyId, window.AdminService, window.StockService
const PurchasesService = (() => {

    function getBizRef() {
        if (!window.currentCompanyId) throw new Error("Pa gen biznis aktif chwazi.");
        return window.db.collection('biznis').doc(window.currentCompanyId);
    }

    async function getNextPurchaseNumber(transaction, bizRef) {
        const counterRef = bizRef.collection('konte').doc('acha');
        const counterDoc = await transaction.get(counterRef);
        let nextNum = 1;
        if (counterDoc.exists) {
            nextNum = (counterDoc.data().dènyeNimewo || 0) + 1;
        }
        transaction.set(counterRef, { dènyeNimewo: nextNum }, { merge: true });
        return 'ACH-' + String(nextNum).padStart(6, '0');
    }

    /**
     * @param {Object} purchaseData
     *   purchaseData.founiseId, founiseNon, mòdPeman
     *   purchaseData.depoId - OPSYONÈL, default window.DEPO_PRINCIPAL_ID
     *     (kote machandiz la ap antre — yon sèl depo pou tout panye a)
     *   purchaseData.atik - [{ pwodwiId, non, kantite, priInite, rabaisPousantaj? }]
     *   purchaseData.fraisAccessoires - transpò/dwàn kapitalize nan kou envantè a (opsyonèl)
     */
    async function createPurchase(purchaseData) {
        if (!purchaseData.founiseId) {
            throw new Error("Founisè a obligatwa pou yon acha.");
        }

        const bizRef = getBizRef();
        const fraisAccessoires = purchaseData.fraisAccessoires || 0;
        const depoId = purchaseData.depoId || window.DEPO_PRINCIPAL_ID;
        if (!depoId) {
            throw new Error("depoId obligatwa (DEPO_PRINCIPAL_ID pa defini — verifye config.js).");
        }

        const rezilta = await window.db.runTransaction(async (transaction) => {
            // ============ FAZ 1 : TOUT GET (pwodwi + founisè + stock pa depo) ============
            const productRefs = purchaseData.atik.map(a => bizRef.collection('pwodwi').doc(a.pwodwiId));
            const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

            const founiseRef = bizRef.collection('founise').doc(purchaseData.founiseId);
            const founiseDoc = await transaction.get(founiseRef);
            if (!founiseDoc.exists) throw new Error("Founisè sa a pa egziste.");

            // GET stock pa depo, pou CHAK liy — sekans, anvan okenn write
            const stockAvanParLiy = [];
            for (const atik of purchaseData.atik) {
                const stockAvan = await window.StockService.liStokPouTransaction(atik.pwodwiId, depoId, transaction);
                stockAvanParLiy.push(stockAvan);
            }

            // ============ FAZ 2 : KALKIL (san Firestore) ============
            let totalMarchandiz = 0;
            const stockUpdates = [];
            productDocs.forEach((doc, i) => {
                if (!doc.exists) {
                    throw new Error(`Pwodwi "${purchaseData.atik[i].non}" pa egziste.`);
                }
                const data = doc.data();
                const atikSaisie = purchaseData.atik[i];
                const kantite = atikSaisie.kantite;

                const brutLiy = kantite * atikSaisie.priInite;
                const rabaisPousantaj = atikSaisie.rabaisPousantaj || 0;
                const sousTotal = brutLiy * (1 - rabaisPousantaj / 100);

                totalMarchandiz += sousTotal;
                stockUpdates.push({
                    pwodwiRef: productRefs[i],
                    pwodwiId: atikSaisie.pwodwiId,
                    kantite,
                    nouvoKantiteTotal: (data.kantiteStock || 0) + kantite
                });
            });

            const total = totalMarchandiz + fraisAccessoires;
            const nimewoAcha = await getNextPurchaseNumber(transaction, bizRef); // GET + WRITE (konte) — dwe rete anvan lòt write yo

            // ============ FAZ 3 : TOUT WRITE (okenn GET apre isit la) ============

            // 3a. Stock pa depo, pou chak liy (WRITE sèlman, itilize stockAvanParLiy deja jwenn)
            stockUpdates.forEach((u, i) => {
                window.StockService.ekriStokPouTransaction(
                    u.pwodwiId, depoId, stockAvanParLiy[i], u.kantite, transaction
                );
            });

            // 3b. Total agrégé pwodwi.kantiteStock
            stockUpdates.forEach(u => {
                transaction.update(u.pwodwiRef, { kantiteStock: u.nouvoKantiteTotal });
            });

            const achatRef = bizRef.collection('acha').doc();
            transaction.set(achatRef, {
                nimewoAcha,
                founiseId: purchaseData.founiseId,
                founiseNon: purchaseData.founiseNon || founiseDoc.data().non,
                mòdPeman: purchaseData.mòdPeman,
                depoId,
                atik: purchaseData.atik,
                totalMarchandiz,
                fraisAccessoires,
                total,
                estati: 'aktif',
                dat: firebase.firestore.FieldValue.serverTimestamp()
            });

            const journalRef = bizRef.collection('jounal').doc();
            const kontCredit = purchaseData.mòdPeman === 'kredi' ? '2010' : '1010';
            transaction.set(journalRef, {
                nimewoEkriti: nimewoAcha,
                dat: firebase.firestore.FieldValue.serverTimestamp(),
                liy: [
                    { kont: '1040', débit: total, crédit: 0 },
                    { kont: kontCredit, débit: 0, crédit: total }
                ],
                referans: achatRef.id,
                sous: 'automatique'
            });

            if (purchaseData.mòdPeman === 'kredi') {
                const dètAktyèl = founiseDoc.data().dèt || 0;
                transaction.update(founiseRef, { dèt: dètAktyèl + total });
            }

            return { id: achatRef.id, nimewoAcha, total };
        });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId,
                'Achat',
                'Kreye Acha',
                '—',
                `${rezilta.nimewoAcha} (${rezilta.total.toLocaleString()} HTG)`
            ).catch(err => console.warn('Audit log echwe:', err));
        }

        return rezilta;
    }

    async function getPurchases(limitCount = 50) {
        const bizRef = getBizRef();
        const snapshot = await bizRef.collection('acha')
            .orderBy('dat', 'desc')
            .limit(limitCount)
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async function getPurchaseById(purchaseId) {
        const bizRef = getBizRef();
        const doc = await bizRef.collection('acha').doc(purchaseId).get();
        if (!doc.exists) throw new Error("Acha sa a pa egziste.");
        return { id: doc.id, ...doc.data() };
    }

    /**
     * NÒT: acha ki te kreye AVAN Multi-Dépôt (san chan "depoId") ap
     * itilize window.DEPO_PRINCIPAL_ID kòm fallback — sa sipoze
     * migrasyon deja mete tout ansyen stock nan Dépôt Principal.
     */
    async function cancelPurchase(purchaseId, rezon) {
        const bizRef = getBizRef();

        const achaAnile = await window.db.runTransaction(async (transaction) => {
            // ============ FAZ 1 : TOUT GET ============
            const achatRef = bizRef.collection('acha').doc(purchaseId);
            const achatDoc = await transaction.get(achatRef);
            if (!achatDoc.exists) throw new Error("Acha sa a pa egziste.");
            const acha = achatDoc.data();
            if (acha.estati === 'anile') throw new Error("Acha sa a deja anile.");

            const depoId = acha.depoId || window.DEPO_PRINCIPAL_ID;

            const productRefs = acha.atik.map(a => bizRef.collection('pwodwi').doc(a.pwodwiId));
            const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

            let founiseRef = null;
            let founiseDoc = null;
            if (acha.mòdPeman === 'kredi') {
                founiseRef = bizRef.collection('founise').doc(acha.founiseId);
                founiseDoc = await transaction.get(founiseRef);
            }

            const stockAvanParLiy = [];
            for (const atik of acha.atik) {
                const stockAvan = await window.StockService.liStokPouTransaction(atik.pwodwiId, depoId, transaction);
                stockAvanParLiy.push(stockAvan);
            }

            // ============ FAZ 2 : VERIFYE (san write) ============
            productDocs.forEach((doc, i) => {
                if (doc.exists) {
                    const stockAktyèl = doc.data().kantiteStock || 0;
                    const nouvoKantite = stockAktyèl - acha.atik[i].kantite;
                    if (nouvoKantite < 0) {
                        throw new Error(`Pa ka anile: stock "${acha.atik[i].non}" ta vin negatif (deja itilize/vann).`);
                    }
                }
            });

            // ============ FAZ 3 : TOUT WRITE ============
            productDocs.forEach((doc, i) => {
                if (doc.exists) {
                    const stockAktyèl = doc.data().kantiteStock || 0;
                    const nouvoKantite = stockAktyèl - acha.atik[i].kantite;
                    transaction.update(productRefs[i], { kantiteStock: nouvoKantite });

                    window.StockService.ekriStokPouTransaction(
                        acha.atik[i].pwodwiId, depoId, stockAvanParLiy[i], -acha.atik[i].kantite, transaction
                    );
                }
            });

            transaction.update(achatRef, {
                estati: 'anile',
                rezonAnilasyon: rezon,
                datAnilasyon: firebase.firestore.FieldValue.serverTimestamp()
            });

            const rvRef = bizRef.collection('jounal').doc();
            const kontCredit = acha.mòdPeman === 'kredi' ? '2010' : '1010';
            transaction.set(rvRef, {
                nimewoEkriti: 'RV-' + acha.nimewoAcha.replace('ACH-', ''),
                dat: firebase.firestore.FieldValue.serverTimestamp(),
                liy: [
                    { kont: kontCredit, débit: acha.total, crédit: 0 },
                    { kont: '1040', débit: 0, crédit: acha.total }
                ],
                referans: purchaseId,
                sous: 'anilasyon',
                rezon
            });

            if (founiseRef && founiseDoc && founiseDoc.exists) {
                const dètAktyèl = founiseDoc.data().dèt || 0;
                const nouvoDèt = Math.max(0, dètAktyèl - acha.total);
                transaction.update(founiseRef, { dèt: nouvoDèt });
            }

            return { nimewoAcha: acha.nimewoAcha, total: acha.total };
        });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId,
                'Achat',
                'Anile Acha',
                achaAnile.nimewoAcha,
                `RV — rezon: ${rezon}`
            ).catch(err => console.warn('Audit log echwe:', err));
        }
    }

    return { createPurchase, getPurchases, getPurchaseById, cancelPurchase };
})();
window.PurchasesService = PurchasesService;
                    
