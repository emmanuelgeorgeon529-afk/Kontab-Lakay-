// js/services/purchasesService.js
// Depann de window.db, window.currentCompanyId, window.DiscountEngine

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
     * Kreye yon acha, ak mòtè rediksyon konplè (Rabais/Remise/Ristourne
     * an kaskad + Escompte separe si nou peye kach imedya).
     *
     * @param {Object} purchaseData
     *   purchaseData.founisèId, founisèNon, mòdPeman
     *   purchaseData.atik - [{ pwodwiId, non, kantite, priInite,
     *                           rabais?, remise?, ristourne?, tauxTaks? }]
     *   purchaseData.fraisAccessoires - frè transpò/dwàn (opsyonèl, ajoute apre RRR)
     *   purchaseData.tauxEscompte - % escompte nou jwenn si nou peye kach rapid
     */
    async function createPurchase(purchaseData) {
        if (!purchaseData.founisèId) {
            throw new Error("Founisè a obligatwa pou yon acha.");
        }

        const bizRef = getBizRef();

        return window.db.runTransaction(async (transaction) => {
            // ---- 1. TOUT LEKTI ANVAN NENPÒT EKRITI ----
            const productRefs = purchaseData.atik.map(a => bizRef.collection('pwodwi').doc(a.pwodwiId));
            const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

            const founisèRef = bizRef.collection('founisè').doc(purchaseData.founisèId);
            const founisèDoc = await transaction.get(founisèRef);
            if (!founisèDoc.exists) throw new Error("Founisè sa a pa egziste.");

            // ---- 2. KALKILE PRI (DiscountEngine) + PREPARE STOCK ----
            const stockUpdates = [];
            const liyPourCalcul = [];

            productDocs.forEach((doc, i) => {
                const atikSaisie = purchaseData.atik[i];
                if (!doc.exists) {
                    throw new Error(`Pwodwi "${atikSaisie.non}" pa egziste.`);
                }
                const data = doc.data();

                stockUpdates.push({
                    ref: productRefs[i],
                    nouvoKantite: (data.kantiteStock || 0) + atikSaisie.kantite
                });

                liyPourCalcul.push({
                    prixBrut: atikSaisie.kantite * atikSaisie.priInite,
                    rabais: atikSaisie.rabais,
                    remise: atikSaisie.remise,
                    ristourne: atikSaisie.ristourne,
                    tauxTaks: atikSaisie.tauxTaks || 0,
                    tauxEscompte: purchaseData.tauxEscompte || 0
                });
            });

            const kalkil = window.DiscountEngine.calculeFakti(liyPourCalcul);
            const fraisAccessoires = purchaseData.fraisAccessoires || 0;
            const total = kalkil.totaux.netAPayer + fraisAccessoires;

            // ---- 3. NIMEWO ACHA SEKANSYÈL ----
            const nimewoAcha = await getNextPurchaseNumber(transaction, bizRef);

            // ---- 4. EKRITI ----

            stockUpdates.forEach(u => {
                transaction.update(u.ref, { kantiteStock: u.nouvoKantite });
            });

            const achatRef = bizRef.collection('acha').doc();
            transaction.set(achatRef, {
                nimewoAcha,
                founisèId: purchaseData.founisèId,
                founisèNon: purchaseData.founisèNon || founisèDoc.data().non,
                mòdPeman: purchaseData.mòdPeman,
                atik: purchaseData.atik,
                detayKalkil: kalkil.liy,
                prixBrut: kalkil.totaux.prixBrut,
                totalRRR: kalkil.totaux.totalRRR,
                netCommercial: kalkil.totaux.netCommercial,
                montanTaks: kalkil.totaux.montanTaks,
                montanEscompte: kalkil.totaux.montanEscompte,
                fraisAccessoires,
                total,
                estati: 'aktif',
                dat: firebase.firestore.FieldValue.serverTimestamp()
            });

            // ---- 4a. Ekriti jounal: Débit Stock (+ Frais), Crédit Kès/Founisè ----
            const journalRef = bizRef.collection('jounal').doc();
            const kontCredit = purchaseData.mòdPeman === 'kredi' ? '2010' : '1010';
            const liyJournal = [
                { kont: '1040', débit: kalkil.totaux.netCommercial + fraisAccessoires, crédit: 0 },
                { kont: kontCredit, débit: 0, crédit: total }
            ];
            if (kalkil.totaux.montanTaks > 0) {
                liyJournal.push({ kont: '4456', débit: kalkil.totaux.montanTaks, crédit: 0 }); // TCA déductible
            }
            transaction.set(journalRef, {
                nimewoEkriti: nimewoAcha,
                dat: firebase.firestore.FieldValue.serverTimestamp(),
                liy: liyJournal,
                referans: achatRef.id,
                sous: 'automatique'
            });

            // ---- 4b. Escompte OBTENU (nou jwenn li, se yon pwodwi finansye pou nou) ----
            if (kalkil.totaux.montanEscompte > 0) {
                const escompteRef = bizRef.collection('jounal').doc();
                transaction.set(escompteRef, {
                    nimewoEkriti: nimewoAcha + '-ESC',
                    dat: firebase.firestore.FieldValue.serverTimestamp(),
                    liy: [
                        { kont: kontCredit, débit: kalkil.totaux.montanEscompte, crédit: 0 },
                        { kont: '765', débit: 0, crédit: kalkil.totaux.montanEscompte } // Produits Financiers
                    ],
                    referans: achatRef.id,
                    sous: 'escompte_obtenu'
                });
            }

            // ---- 4c. Si kredi, ogmante dèt founisè ----
            if (purchaseData.mòdPeman === 'kredi') {
                const dètAktyèl = founisèDoc.data().dèt || 0;
                transaction.update(founisèRef, { dèt: dètAktyèl + total });
            }

            return { id: achatRef.id, nimewoAcha, total, kalkil: kalkil.totaux };
        });
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

        return window.db.runTransaction(async (transaction) => {
            const achatRef = bizRef.collection('acha').doc(purchaseId);
            const achatDoc = await transaction.get(achatRef);
            if (!achatDoc.exists) throw new Error("Acha sa a pa egziste.");
            const acha = achatDoc.data();
            if (acha.estati === 'anile') throw new Error("Acha sa a deja anile.");

            const productRefs = acha.atik.map(a => bizRef.collection('pwodwi').doc(a.pwodwiId));
            const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

            let founisèRef = null;
            let founisèDoc = null;
            if (acha.mòdPeman === 'kredi') {
                founisèRef = bizRef.collection('founisè').doc(acha.founisèId);
                founisèDoc = await transaction.get(founisèRef);
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
            const liyRV = [
                { kont: kontCredit, débit: acha.total, crédit: 0 },
                { kont: '1040', débit: 0, crédit: (acha.netCommercial || acha.total) + (acha.fraisAccessoires || 0) }
            ];
            if (acha.montanTaks > 0) {
                liyRV.push({ kont: '4456', débit: 0, crédit: acha.montanTaks });
            }
            transaction.set(rvRef, {
                nimewoEkriti: 'RV-' + acha.nimewoAcha.replace('ACH-', ''),
                dat: firebase.firestore.FieldValue.serverTimestamp(),
                liy: liyRV,
                referans: purchaseId,
                sous: 'anilasyon',
                rezon
            });

            if (founisèRef && founisèDoc && founisèDoc.exists) {
                const dètAktyèl = founisèDoc.data().dèt || 0;
                const nouvoDèt = Math.max(0, dètAktyèl - acha.total);
                transaction.update(founisèRef, { dèt: nouvoDèt });
            }
        });
    }

    return { createPurchase, getPurchases, getPurchaseById, cancelPurchase };
})();

window.PurchasesService = PurchasesService;
