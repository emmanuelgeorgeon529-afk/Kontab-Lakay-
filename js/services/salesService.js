// js/services/salesService.js
// Depann de window.db (inisyalize nan config.js) ak window.currentCompanyId

const SalesService = (() => {

    // ---------- ITILITÈ ENTÈN ----------

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

    // ---------- KREYE VANT (CRUD PRENSIPAL) ----------

    /**
     * Kreye yon nouvo vant. Fè baisse stock otomatikman, verifye limit kredi
     * si mòd peman se 'kredi', epi kreye yon ekriti jounal double-entry.
     *
     * @param {Object} saleData
     *   saleData.kliyanId    - ID kliyan (oswa null pou "kliyan divès")
     *   saleData.kliyanNon   - non kliyan pou afichaj rapid
     *   saleData.mòdPeman    - 'kach' | 'kredi' | 'moncash' | 'kat' | 'transfè' | 'melanje'
     *   saleData.atik        - [{ pwodwiId, non, kantite, priInite }]
     *   saleData.vandèId     - ID itilizatè k ap fè vant lan
     */
    async function createSale(saleData) {
        const bizRef = getBizRef();

        return window.db.runTransaction(async (transaction) => {
            // ---- 1. TOUT LEKTI DWE FÈT ANVAN NENPÒT EKRITI ----
            const productRefs = saleData.atik.map(a => bizRef.collection('pwodwi').doc(a.pwodwiId));
            const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

            // Lekti dosye kliyan si vant lan se sou kredi (bezwen pou verifye limit)
            let kliyanRef = null;
            let kliyanDoc = null;
            if (saleData.mòdPeman === 'kredi' && saleData.kliyanId) {
                kliyanRef = bizRef.collection('kliyan').doc(saleData.kliyanId);
                kliyanDoc = await transaction.get(kliyanRef);
                if (!kliyanDoc.exists) {
                    throw new Error("Kliyan sa a pa egziste.");
                }
            }

            // Verifye stock disponib AVAN nou ekri anyen
            let total = 0;
            const stockUpdates = [];
            productDocs.forEach((doc, i) => {
                if (!doc.exists) {
                    throw new Error(`Pwodwi "${saleData.atik[i].non}" pa egziste.`);
                }
                const data = doc.data();
                const kantiteDemande = saleData.atik[i].kantite;
                if ((data.kantiteStock || 0) < kantiteDemande) {
                    throw new Error(`Stock pa sifi pou "${data.non}". Rete: ${data.kantiteStock}, mande: ${kantiteDemande}`);
                }
                const sousTotal = kantiteDemande * saleData.atik[i].priInite;
                total += sousTotal;
                stockUpdates.push({
                    ref: productRefs[i],
                    nouvoKantite: data.kantiteStock - kantiteDemande
                });
            });

            // ---- VERIFYE LIMIT KREDI (si aplikab) ----
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

            // ---- 2. NIMEWO FAKTI SEKANSYÈL (dwe fèt anvan lòt ekriti) ----
            const nimewoFakti = await getNextInvoiceNumber(transaction, bizRef);

            // ---- 3. KOUNYA KÒMANSE EKRITI ----

            // 3a. Diminye stock pou chak pwodwi
            stockUpdates.forEach(u => {
                transaction.update(u.ref, { kantiteStock: u.nouvoKantite });
            });

            // 3b. Kreye dokiman vant lan
            const venteRef = bizRef.collection('lavant').doc();
            transaction.set(venteRef, {
                nimewoFakti: nimewoFakti,
                kliyanId: saleData.kliyanId || null,
                kliyanNon: saleData.kliyanNon || 'Kliyan Divès',
                mòdPeman: saleData.mòdPeman,
                atik: saleData.atik,
                total: total,
                estati: 'aktif',
                dat: firebase.firestore.FieldValue.serverTimestamp(),
                vandèId: saleData.vandèId || (window.auth?.currentUser?.uid ?? null)
            });

            // 3c. Ekriti jounal double-entry
            const journalRef = bizRef.collection('jounal').doc();
            const kontDebit = saleData.mòdPeman === 'kredi' ? '1030' : '1010'; // Kliyan oswa Kès
            transaction.set(journalRef, {
                nimewoEkriti: nimewoFakti,
                dat: firebase.firestore.FieldValue.serverTimestamp(),
                liy: [
                    { kont: kontDebit, débit: total, crédit: 0 },
                    { kont: '4010', débit: 0, crédit: total }
                ],
                referans: venteRef.id,
                sous: 'automatique'
            });

            // 3d. Si kredi, mete ajou dèt kliyan (valè kalkile, PA increment,
            //     paske nou deja li dosye a pi wo pou verifye limit lan)
            if (kliyanRef) {
                transaction.update(kliyanRef, { dèt: dètApre });
            }

            return { id: venteRef.id, nimewoFakti, total };
        });
    }

    // ---------- LI LIS VANT YO ----------

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

    // ---------- ANILE VANT (JAMAIS DELETE — REVERSAL ENTRY) ----------

    async function cancelSale(saleId, rezon) {
        const bizRef = getBizRef();

        return window.db.runTransaction(async (transaction) => {
            const venteRef = bizRef.collection('lavant').doc(saleId);
            const venteDoc = await transaction.get(venteRef);
            if (!venteDoc.exists) throw new Error("Vant sa a pa egziste.");
            const vente = venteDoc.data();
            if (vente.estati === 'anile') throw new Error("Vant sa a deja anile.");

            // Li stock aktyèl pwodwi yo AVAN nou ekri (remèt yo nan stock)
            const productRefs = vente.atik.map(a => bizRef.collection('pwodwi').doc(a.pwodwiId));
            const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

            // Si vant lan te kredi, li dosye kliyan an tou (pou retire dèt)
            let kliyanRef = null;
            let kliyanDoc = null;
            if (vente.mòdPeman === 'kredi' && vente.kliyanId) {
                kliyanRef = bizRef.collection('kliyan').doc(vente.kliyanId);
                kliyanDoc = await transaction.get(kliyanRef);
            }

            // Remèt stock
            productDocs.forEach((doc, i) => {
                if (doc.exists) {
                    const nouvoKantite = (doc.data().kantiteStock || 0) + vente.atik[i].kantite;
                    transaction.update(productRefs[i], { kantiteStock: nouvoKantite });
                }
            });

            // Make vant lan anile (pa efase l)
            transaction.update(venteRef, {
                estati: 'anile',
                rezonAnilasyon: rezon,
                datAnilasyon: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Kreye Reversal Entry (RV-######)
            const rvRef = bizRef.collection('jounal').doc();
            const kontDebit = vente.mòdPeman === 'kredi' ? '1030' : '1010';
            transaction.set(rvRef, {
                nimewoEkriti: 'RV-' + vente.nimewoFakti.replace('LV-', ''),
                dat: firebase.firestore.FieldValue.serverTimestamp(),
                liy: [
                    { kont: '4010', débit: vente.total, crédit: 0 },
                    { kont: kontDebit, débit: 0, crédit: vente.total }
                ],
                referans: saleId,
                sous: 'anilasyon',
                rezon: rezon
            });

            // Si te kredi, retire dèt kliyan (valè kalkile, pa increment)
            if (kliyanRef && kliyanDoc && kliyanDoc.exists) {
                const dètAktyèl = kliyanDoc.data().dèt || 0;
                const nouvoDèt = Math.max(0, dètAktyèl - vente.total);
                transaction.update(kliyanRef, { dèt: nouvoDèt });
            }
        });
    }

    // ---------- API PIBLIK ----------
    return {
        createSale,
        getSales,
        getSaleById,
        cancelSale
    };
})();

window.SalesService = SalesService;
