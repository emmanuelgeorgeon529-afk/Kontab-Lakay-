// js/services/salesService.js
// Depann de window.db, window.currentCompanyId, window.DiscountEngine, window.AdminService

const SalesService = (() => {

    function getBizRef() {
        if (!window.currentCompanyId) throw new Error("Pa gen biznis aktif chwazi.");
        return window.db.collection('biznis').doc(window.currentCompanyId);
    }

    async function getNextInvoiceNumber(transaction, bizRef) {
        const counterRef = bizRef.collection('konte').doc('lavant');
        const counterDoc = await transaction.get(counterRef);
        let nextNum = 1;
        if (counterDoc.exists) {
            nextNum = (counterDoc.data().dènyeNimewo || 0) + 1;
        }
        transaction.set(counterRef, { dènyeNimewo: nextNum }, { merge: true });
        return 'LV-' + String(nextNum).padStart(6, '0');
    }

    /**
     * Kreye yon nouvo vant, ak mòtè rediksyon konplè (Rabais/Remise/Ristourne
     * an kaskad + Escompte separe), stock, limit kredi, ak ekriti jounal.
     *
     * @param {Object} saleData
     *   saleData.kliyanId, kliyanNon, mòdPeman, vandèId
     *   saleData.atik - [{ pwodwiId, non, kantite, priInite,
     *                       rabais?, remise?, ristourne?, tauxTaks? }]
     *     rabais/remise/ristourne: { valeur, estPousantaj } (opsyonèl)
     *   saleData.tauxEscompte - % escompte si peman kach imedya (opsyonèl)
     *   saleData.canal - 'magazen'|'web'|'whatsapp'|'facebook'|'marketplace' (opsyonèl, default 'magazen')
     *   saleData.kliyanAuthUid - Firebase Auth uid kliyan an, si vant lan soti nan kont kliyan konekte (opsyonèl)
     *   saleData.kòdPromoAplike - kòd pwomosyon ki te aplike sou vant lan (opsyonèl)
     */
    async function createSale(saleData) {
        const bizRef = getBizRef();

        const rezilta = await window.db.runTransaction(async (transaction) => {
            // ---- 1. TOUT LEKTI ANVAN NENPÒT EKRITI ----
            const productRefs = saleData.atik.map(a => bizRef.collection('pwodwi').doc(a.pwodwiId));
            const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

            let kliyanRef = null;
            let kliyanDoc = null;
            if (saleData.mòdPeman === 'kredi' && saleData.kliyanId) {
                kliyanRef = bizRef.collection('kliyan').doc(saleData.kliyanId);
                kliyanDoc = await transaction.get(kliyanRef);
                if (!kliyanDoc.exists) throw new Error("Kliyan sa a pa egziste.");
            }

            // ---- 2. VERIFYE STOCK + KALKILE PRI (DiscountEngine) ----
            const stockUpdates = [];
            const liyPourCalcul = [];

            productDocs.forEach((doc, i) => {
                const atikSaisie = saleData.atik[i];
                if (!doc.exists) {
                    throw new Error(`Pwodwi "${atikSaisie.non}" pa egziste.`);
                }
                const data = doc.data();
                if ((data.kantiteStock || 0) < atikSaisie.kantite) {
                    throw new Error(`Stock pa sifi pou "${data.non}". Rete: ${data.kantiteStock}, mande: ${atikSaisie.kantite}`);
                }

                stockUpdates.push({
                    ref: productRefs[i],
                    nouvoKantite: data.kantiteStock - atikSaisie.kantite
                });

                liyPourCalcul.push({
                    prixBrut: atikSaisie.kantite * atikSaisie.priInite,
                    rabais: atikSaisie.rabais,
                    remise: atikSaisie.remise,
                    ristourne: atikSaisie.ristourne,
                    tauxTaks: atikSaisie.tauxTaks || 0,
                    tauxEscompte: saleData.tauxEscompte || 0
                });
            });

            const kalkil = window.DiscountEngine.calculeFakti(liyPourCalcul);
            const total = kalkil.totaux.netAPayer; // <- sa a rete "Net à Payer" sou fakti a

            // ---- 3. VERIFYE LIMIT KREDI (sou vrè total apre rediksyon) ----
            let dètAvan = 0;
            let dètApre = 0;
            if (kliyanDoc) {
                dètAvan = kliyanDoc.data().dèt || 0;
                dètApre = dètAvan + total;
                const limitKredi = kliyanDoc.data().limitKredi || 0;
                if (limitKredi > 0 && dètApre > limitKredi) {
                    throw new Error(
                        `Vant sa a depase limit kredi kliyan an. ` +
                        `Limit: ${limitKredi.toLocaleString()} HTG, ` +
                        `Dèt aktyèl: ${dètAvan.toLocaleString()} HTG, ` +
                        `Dèt apre vant: ${dètApre.toLocaleString()} HTG.`
                    );
                }
            }

            // ---- 4. NIMEWO FAKTI SEKANSYÈL ----
            const nimewoFakti = await getNextInvoiceNumber(transaction, bizRef);

            // ---- 5. EKRITI ----

            stockUpdates.forEach(u => {
                transaction.update(u.ref, { kantiteStock: u.nouvoKantite });
            });

            const venteRef = bizRef.collection('lavant').doc();
            transaction.set(venteRef, {
                nimewoFakti,
                kliyanId: saleData.kliyanId || null,
                kliyanNon: saleData.kliyanNon || 'Kliyan Divès',
                kliyanAuthUid: saleData.kliyanAuthUid || null,
                mòdPeman: saleData.mòdPeman,
                canal: saleData.canal || 'magazen',
                kòdPromoAplike: saleData.kòdPromoAplike || null,
                atik: saleData.atik,
                detayKalkil: kalkil.liy,      // detay pa liy: rabais/remise/ristourne/net
                prixBrut: kalkil.totaux.prixBrut,
                totalRRR: kalkil.totaux.totalRRR,
                netCommercial: kalkil.totaux.netCommercial,
                montanTaks: kalkil.totaux.montanTaks,
                montanEscompte: kalkil.totaux.montanEscompte,
                total,                          // Net à Payer — chif ofisyèl fakti a
                estati: 'aktif',
                dat: firebase.firestore.FieldValue.serverTimestamp(),
                vandèId: saleData.vandèId || (window.auth?.currentUser?.uid ?? null)
            });

            // ---- 5a. Ekriti jounal prensipal: Débit Kès/Kliyan, Crédit Ventes + Taxes ----
            const journalRef = bizRef.collection('jounal').doc();
            const kontDebit = saleData.mòdPeman === 'kredi' ? '1030' : '1010';
            const liyJournal = [
                { kont: kontDebit, débit: total, crédit: 0 },
                { kont: '4010', débit: 0, crédit: kalkil.totaux.netCommercial }
            ];
            if (kalkil.totaux.montanTaks > 0) {
                liyJournal.push({ kont: '4457', débit: 0, crédit: kalkil.totaux.montanTaks });
            }
            transaction.set(journalRef, {
                nimewoEkriti: nimewoFakti,
                dat: firebase.firestore.FieldValue.serverTimestamp(),
                liy: liyJournal,
                referans: venteRef.id,
                sous: 'automatique'
            });

            // ---- 5b. Escompte (si genyen) — ekriti jounal SEPARE, kont finansye ----
            if (kalkil.totaux.montanEscompte > 0) {
                const escompteRef = bizRef.collection('jounal').doc();
                transaction.set(escompteRef, {
                    nimewoEkriti: nimewoFakti + '-ESC',
                    dat: firebase.firestore.FieldValue.serverTimestamp(),
                    liy: [
                        { kont: '665', débit: kalkil.totaux.montanEscompte, crédit: 0 }, // Charges Financières
                        { kont: kontDebit, débit: 0, crédit: kalkil.totaux.montanEscompte }
                    ],
                    referans: venteRef.id,
                    sous: 'escompte_accordé'
                });
            }

            // ---- 5c. Si kredi, mete ajou dèt kliyan ----
            if (kliyanRef) {
                transaction.update(kliyanRef, { dèt: dètApre });
            }

            return { id: venteRef.id, nimewoFakti, total, kalkil: kalkil.totaux };
        });

        // ---- 6. AUDIT LOG (apre transaksyon an konfime, san blòke vant si sa echwe) ----
        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId,
                'Ventes',
                'Kreye Vant',
                '—',
                `${rezilta.nimewoFakti} (${rezilta.total.toLocaleString()} HTG)`
            ).catch(err => console.warn('Audit log echwe:', err));
        }

        // ---- 7. PWEN FIDÉLITÉ (apre vant konfime, san blòke vant si sa echwe) ----
        if (saleData.kliyanId && window.FideliteService?.ajoutePwenApreVant) {
            window.FideliteService.ajoutePwenApreVant(saleData.kliyanId, rezilta.total)
                .catch(err => console.warn('Ajoute pwen fidélité echwe:', err));
        }

        return rezilta;
    }

    async function getSales(limitCount = 50) {
        const bizRef = getBizRef();
        const snapshot = await bizRef.collection('lavant')
            .orderBy('dat', 'desc')
            .limit(limitCount)
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async function getSaleById(saleId) {
        const bizRef = getBizRef();
        const doc = await bizRef.collection('lavant').doc(saleId).get();
        if (!doc.exists) throw new Error("Vant sa a pa egziste.");
        return { id: doc.id, ...doc.data() };
    }

    async function cancelSale(saleId, rezon) {
        const bizRef = getBizRef();

        const vanteAnile = await window.db.runTransaction(async (transaction) => {
            const venteRef = bizRef.collection('lavant').doc(saleId);
            const venteDoc = await transaction.get(venteRef);
            if (!venteDoc.exists) throw new Error("Vant sa a pa egziste.");
            const vente = venteDoc.data();
            if (vente.estati === 'anile') throw new Error("Vant sa a deja anile.");

            const productRefs = vente.atik.map(a => bizRef.collection('pwodwi').doc(a.pwodwiId));
            const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

            let kliyanRef = null;
            let kliyanDoc = null;
            if (vente.mòdPeman === 'kredi' && vente.kliyanId) {
                kliyanRef = bizRef.collection('kliyan').doc(vente.kliyanId);
                kliyanDoc = await transaction.get(kliyanRef);
            }

            productDocs.forEach((doc, i) => {
                if (doc.exists) {
                    const nouvoKantite = (doc.data().kantiteStock || 0) + vente.atik[i].kantite;
                    transaction.update(productRefs[i], { kantiteStock: nouvoKantite });
                }
            });

            transaction.update(venteRef, {
                estati: 'anile',
                rezonAnilasyon: rezon,
                datAnilasyon: firebase.firestore.FieldValue.serverTimestamp()
            });

            const rvRef = bizRef.collection('jounal').doc();
            const kontDebit = vente.mòdPeman === 'kredi' ? '1030' : '1010';
            const liyRV = [
                { kont: '4010', débit: vente.netCommercial || vente.total, crédit: 0 },
                { kont: kontDebit, débit: 0, crédit: vente.total }
            ];
            if (vente.montanTaks > 0) {
                liyRV.push({ kont: '4457', débit: vente.montanTaks, crédit: 0 });
            }
            transaction.set(rvRef, {
                nimewoEkriti: 'RV-' + vente.nimewoFakti.replace('LV-', ''),
                dat: firebase.firestore.FieldValue.serverTimestamp(),
                liy: liyRV,
                referans: saleId,
                sous: 'anilasyon',
                rezon
            });

            if (kliyanRef && kliyanDoc && kliyanDoc.exists) {
                const dètAktyèl = kliyanDoc.data().dèt || 0;
                const nouvoDèt = Math.max(0, dètAktyèl - vente.total);
                transaction.update(kliyanRef, { dèt: nouvoDèt });
            }

            return { nimewoFakti: vente.nimewoFakti, total: vente.total };
        });

        // ---- AUDIT LOG ----
        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId,
                'Ventes',
                'Anile Vant',
                vanteAnile.nimewoFakti,
                `RV — rezon: ${rezon}`
            ).catch(err => console.warn('Audit log echwe:', err));
        }
    }

    return { createSale, getSales, getSaleById, cancelSale };
})();

window.SalesService = SalesService;
                
