// js/services/purchasesService.js
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

    async function createPurchase(purchaseData) {
        if (!purchaseData.founiseId) {
            throw new Error("Founisè a obligatwa pou yon acha.");
        }

        const bizRef = getBizRef();

        const rezilta = await window.db.runTransaction(async (transaction) => {
            const productRefs = purchaseData.atik.map(a => bizRef.collection('pwodwi').doc(a.pwodwiId));
            const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

            const founiseRef = bizRef.collection('founise').doc(purchaseData.founiseId);
            const founiseDoc = await transaction.get(founiseRef);
            if (!founiseDoc.exists) throw new Error("Founisè sa a pa egziste.");

            let total = 0;
            const stockUpdates = [];
            productDocs.forEach((doc, i) => {
                if (!doc.exists) {
                    throw new Error(`Pwodwi "${purchaseData.atik[i].non}" pa egziste.`);
                }
                const data = doc.data();
                const kantite = purchaseData.atik[i].kantite;
                const sousTotal = kantite * purchaseData.atik[i].priInite;
                total += sousTotal;
                stockUpdates.push({
                    ref: productRefs[i],
                    nouvoKantite: (data.kantiteStock || 0) + kantite
                });
            });

            const nimewoAcha = await getNextPurchaseNumber(transaction, bizRef);

            stockUpdates.forEach(u => {
                transaction.update(u.ref, { kantiteStock: u.nouvoKantite });
            });

            const achatRef = bizRef.collection('acha').doc();
            transaction.set(achatRef, {
                nimewoAcha,
                founiseId: purchaseData.founiseId,
                founiseNon: purchaseData.founiseNon || founiseDoc.data().non,
                mòdPeman: purchaseData.mòdPeman,
                atik: purchaseData.atik,
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

    async function cancelPurchase(purchaseId, rezon) {
        const bizRef = getBizRef();

        const achaAnile = await window.db.runTransaction(async (transaction) => {
            const achatRef = bizRef.collection('acha').doc(purchaseId);
            const achatDoc = await transaction.get(achatRef);
            if (!achatDoc.exists) throw new Error("Acha sa a pa egziste.");
            const acha = achatDoc.data();
            if (acha.estati === 'anile') throw new Error("Acha sa a deja anile.");

            const productRefs = acha.atik.map(a => bizRef.collection('pwodwi').doc(a.pwodwiId));
            const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

            let founiseRef = null;
            let founiseDoc = null;
            if (acha.mòdPeman === 'kredi') {
                founiseRef = bizRef.collection('founise').doc(acha.founiseId);
                founiseDoc = await transaction.get(founiseRef);
            }

            productDocs.forEach((doc, i) => {
                if (doc.exists) {
                    const stockAktyèl = doc.data().kantiteStock || 0;
                    const nouvoKantite = stockAktyèl - acha.atik[i].kantite;
                    if (nouvoKantite < 0) {
                        throw new Error(`Pa ka anile: stock "${acha.atik[i].non}" ta vin negatif (deja itilize/vann).`);
                    }
                    transaction.update(productRefs[i], { kantiteStock: nouvoKantite });
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
