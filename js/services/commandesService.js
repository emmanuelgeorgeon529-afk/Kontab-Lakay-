// js/services/commandesService.js
// Depann de window.db, window.currentCompanyId, window.AdminService, window.ProductsService

const CommandesService = (() => {

    function getBizRef() {
        if (!window.currentCompanyId) throw new Error("Pa gen biznis aktif chwazi.");
        return window.db.collection('biznis').doc(window.currentCompanyId);
    }

    const ESTATI_VALID = ['brouillon', 'confirmée', 'en_préparation', 'expédiée', 'livrée', 'annulée'];

    const PWOCHEN_ESTATI = {
        brouillon: 'confirmée',
        confirmée: 'en_préparation',
        en_préparation: 'expédiée',
        expédiée: 'livrée'
    };

    async function getNextOrderNumber(transaction, bizRef) {
        const counterRef = bizRef.collection('konte').doc('commande');
        const counterDoc = await transaction.get(counterRef);
        let nextNum = 1;
        if (counterDoc.exists) {
            nextNum = (counterDoc.data().dènyeNimewo || 0) + 1;
        }
        transaction.set(counterRef, { dènyeNimewo: nextNum }, { merge: true });
        return 'CMD-' + String(nextNum).padStart(6, '0');
    }

    /**
     * Kreye yon kòmand kliyan. Pa touche stock — sa fèt lè li konvèti an vant
     * apre livrezon (evite bloke stock pou kòmand ki ka anile).
     * @param {Object} data
     *   data.kliyanId, kliyanNon
     *   data.atik - [{ pwodwiId, non, kantite, priInite }]
     *   data.adrèsLivrezon
     */
    async function createOrder(data) {
        if (!data.atik || data.atik.length === 0) {
            throw new Error("Kòmand lan dwe gen pou pi piti yon atik.");
        }

        const bizRef = getBizRef();
        const total = data.atik.reduce((s, a) => s + (a.kantite * a.priInite), 0);

        const rezilta = await window.db.runTransaction(async (transaction) => {
            const nimewoCommande = await getNextOrderNumber(transaction, bizRef);
            const cmdRef = bizRef.collection('commande').doc();

            transaction.set(cmdRef, {
                nimewoCommande,
                kliyanId: data.kliyanId || null,
                kliyanNon: data.kliyanNon || 'Kliyan Divès',
                atik: data.atik,
                total,
                adrèsLivrezon: data.adrèsLivrezon || '',
                estati: 'brouillon',
                istorik: [{ etap: 'brouillon', dat: new Date().toISOString() }],
                dat: firebase.firestore.FieldValue.serverTimestamp()
            });

            return { id: cmdRef.id, nimewoCommande, total };
        });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Ventes', 'Kreye Kòmand Kliyan', '—',
                `${rezilta.nimewoCommande} (${rezilta.total.toLocaleString()} HTG)`
            ).catch(err => console.warn('Audit log echwe:', err));
        }

        return rezilta;
    }

    async function getOrders(limitCount = 50) {
        const bizRef = getBizRef();
        const snapshot = await bizRef.collection('commande')
            .orderBy('dat', 'desc').limit(limitCount).get();
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    async function getOrderById(orderId) {
        const bizRef = getBizRef();
        const doc = await bizRef.collection('commande').doc(orderId).get();
        if (!doc.exists) throw new Error("Kòmand sa a pa egziste.");
        return { id: doc.id, ...doc.data() };
    }

    // ---------- AVANSE NAN PWOCHEN ETAP WORKFLOW LA ----------

    async function advanceOrderStatus(orderId) {
        const bizRef = getBizRef();
        const ref = bizRef.collection('commande').doc(orderId);

        const rezilta = await window.db.runTransaction(async (transaction) => {
            const doc = await transaction.get(ref);
            if (!doc.exists) throw new Error("Kòmand sa a pa egziste.");
            const cmd = doc.data();

            if (cmd.estati === 'annulée' || cmd.estati === 'livrée') {
                throw new Error(`Kòmand sa a deja ${cmd.estati}, pa ka avanse ankò.`);
            }

            const nouvoEstati = PWOCHEN_ESTATI[cmd.estati];
            if (!nouvoEstati) throw new Error("Pa gen pwochen etap pou estati sa a.");

            transaction.update(ref, {
                estati: nouvoEstati,
                istorik: firebase.firestore.FieldValue.arrayUnion({
                    etap: nouvoEstati, dat: new Date().toISOString()
                })
            });

            return { nimewoCommande: cmd.nimewoCommande, ansyenEstati: cmd.estati, nouvoEstati };
        });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Ventes', 'Avanse Estati Kòmand',
                `${rezilta.nimewoCommande}: ${rezilta.ansyenEstati}`, rezilta.nouvoEstati
            ).catch(err => console.warn('Audit log echwe:', err));
        }

        return rezilta;
    }

    // ---------- ANILE KÒMAND ----------

    async function cancelOrder(orderId, rezon) {
        const bizRef = getBizRef();
        const ref = bizRef.collection('commande').doc(orderId);

        const cmdInfo = await window.db.runTransaction(async (transaction) => {
            const doc = await transaction.get(ref);
            if (!doc.exists) throw new Error("Kòmand sa a pa egziste.");
            const cmd = doc.data();
            if (cmd.estati === 'livrée') throw new Error("Pa ka anile yon kòmand ki deja livre.");
            if (cmd.estati === 'annulée') throw new Error("Kòmand sa a deja anile.");

            transaction.update(ref, {
                estati: 'annulée',
                rezonAnilasyon: rezon,
                istorik: firebase.firestore.FieldValue.arrayUnion({
                    etap: 'annulée', dat: new Date().toISOString(), rezon
                })
            });

            return { nimewoCommande: cmd.nimewoCommande };
        });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Ventes', 'Anile Kòmand', cmdInfo.nimewoCommande, `rezon: ${rezon}`
            ).catch(err => console.warn('Audit log echwe:', err));
        }
    }

    // ---------- KONVÈTI AN VANT LÈ LIVRE (touche stock + jounal) ----------

    // FIKS: lock kòmand la nan yon transaksyon AVAN kreye vant lan, pou anpeche
    // doub-konvèsyon si etap 2 (mete ajou venteId sou kòmand la) echwe apre vant lan deja kreye.
    async function convertOrderToSale(orderId, mòdPeman) {
        const bizRef = getBizRef();
        const cmdRef = bizRef.collection('commande').doc(orderId);

        // ETAP 1: verifye + lock AVAN kreye vant — anpeche doub-konvèsyon
        const commande = await window.db.runTransaction(async (transaction) => {
            const doc = await transaction.get(cmdRef);
            if (!doc.exists) throw new Error("Kòmand sa a pa egziste.");
            const c = doc.data();
            if (c.estati !== 'livrée') {
                throw new Error("Kòmand lan dwe nan estati 'livrée' anvan konvèsyon an vant.");
            }
            if (c.venteId) throw new Error("Kòmand sa a deja konvèti an vant.");
            if (c.konvèsyonAnKou) throw new Error("Konvèsyon deja an kou pou kòmand sa a.");

            transaction.update(cmdRef, { konvèsyonAnKou: true }); // lock
            return { id: doc.id, ...c };
        });

        // ETAP 2: kreye vant lan
        let vant;
        try {
            vant = await window.SalesService.createSale({
                kliyanId: commande.kliyanId,
                kliyanNon: commande.kliyanNon,
                mòdPeman: mòdPeman || 'kach',
                atik: commande.atik
            });
        } catch (e) {
            // Vant echwe → retire lock la pou moun ka eseye ankò
            await cmdRef.update({ konvèsyonAnKou: false }).catch(() => {});
            throw e;
        }

        await cmdRef.update({ venteId: vant.id, konvèsyonAnKou: false });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Ventes', 'Konvèti Kòmand an Vant',
                commande.nimewoCommande, vant.nimewoFakti
            ).catch(err => console.warn('Audit log echwe:', err));
        }

        return vant;
    }

    return {
        ESTATI_VALID,
        createOrder, getOrders, getOrderById,
        advanceOrderStatus, cancelOrder, convertOrderToSale
    };
})();

window.CommandesService = CommandesService;
