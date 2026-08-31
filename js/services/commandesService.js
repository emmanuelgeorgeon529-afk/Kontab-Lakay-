// js/services/commandesService.js
// Depann de window.db, window.currentCompanyId, window.AdminService,
// window.ProductsService, window.SalesService, window.BonLivrezonSevis
//
// Commande = entansyon/validasyon acha kliyan an SÈLMAN.
// Vente = tranzaksyon ki konfime (jounal + stock).
// BonLivrezon = egzekisyon fizik livrezon an.
// commande.estati PA gen okenn etap livrezon — se bon_livrezon.estati
// ki sèl sous verite pou sa (gade getOrderDisplayStatus() pi ba).

const CommandesService = (() => {

    function getBizRef() {
        if (!window.currentCompanyId) throw new Error("Pa gen biznis aktif chwazi.");
        return window.db.collection('biznis').doc(window.currentCompanyId);
    }

    const ESTATI_VALID = ['brouillon', 'confirmée', 'annulée'];

    const TRANZISYON_VALID = {
        brouillon: ['confirmée', 'annulée'],
        confirmée: [],   // apre konfimasyon, se convertOrderToSale() ki pran men l
        annulée: []
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
     * Kreye yon kòmand kliyan. Pa touche stock — sa fèt sèlman lè li
     * konfime (estati 'confirmée') e konvèti an vant.
     *
     * @param {Object} data
     *   data.kliyanId, kliyanNon, kliyanAuthUid (opsyonèl, si kliyan konekte)
     *   data.atik - [{ pwodwiId, non, kantite, priInite }]
     *   data.adrèsLivrezon
     *   data.canal - 'magazen'|'web'|'whatsapp'|'facebook'|'marketplace'
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
                kliyanAuthUid: data.kliyanAuthUid || null,
                atik: data.atik,
                total,
                adrèsLivrezon: data.adrèsLivrezon || '',
                canal: data.canal || 'magazen',
                estati: 'brouillon',
                venteId: null,
                bonLivraisonId: null,
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

    // ---------- ANILE KÒMAND (sèlman anvan konvèsyon an vant) ----------

    async function cancelOrder(orderId, rezon) {
        const bizRef = getBizRef();
        const ref = bizRef.collection('commande').doc(orderId);

        const cmdInfo = await window.db.runTransaction(async (transaction) => {
            const doc = await transaction.get(ref);
            if (!doc.exists) throw new Error("Kòmand sa a pa egziste.");
            const cmd = doc.data();

            if (cmd.estati === 'annulée') throw new Error("Kòmand sa a deja anile.");
            if (cmd.venteId) {
                throw new Error(
                    "Kòmand sa a deja konvèti an vant — " +
                    "sèvi ak SalesService.cancelSale() pou anile vant lan."
                );
            }

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

    // ---------- KONFIME KÒMAND → KREYE VANT + BL (idompotan) ----------

    /**
     * Konfime yon kòmand: kreye Vant lan (jounal + stock), epi kreye
     * BonLivrezon ki lye a otomatikman. Idompotan — si rele 2 fwa
     * (doub-klik, retry, offline sync), pa gen doublon.
     *
     * @param {string} orderId
     * @param {string} mòdPeman - 'kach'|'kredi'|'moncash'|'natcash'|'kat'|'vèman'
     * @param {Object} opsyonLivrezon - { chofeId, veyikilId, adrèsLivrezon } (opsyonèl, pou BL a)
     */
    async function convertOrderToSale(orderId, mòdPeman, opsyonLivrezon = {}) {
        const bizRef = getBizRef();
        const cmdRef = bizRef.collection('commande').doc(orderId);

        // ETAP 1 : lock + verifye — idompotan sou venteId
        const commande = await window.db.runTransaction(async (transaction) => {
            const doc = await transaction.get(cmdRef);
            if (!doc.exists) throw new Error("Kòmand sa a pa egziste.");
            const c = doc.data();

            if (c.venteId) {
                return { ...c, id: doc.id, _dejaKonvèti: true };
            }
            if (c.estati === 'annulée') {
                throw new Error("Kòmand sa a anile, li pa ka konvèti an vant.");
            }
            if (c.konvèsyonAnKou) {
                throw new Error("Konvèsyon deja an kou pou kòmand sa a.");
            }

            transaction.update(cmdRef, {
                estati: 'confirmée',
                konvèsyonAnKou: true,
                istorik: firebase.firestore.FieldValue.arrayUnion({
                    etap: 'confirmée', dat: new Date().toISOString()
                })
            });

            return { ...c, id: doc.id, _dejaKonvèti: false };
        });

        if (commande._dejaKonvèti) {
            return window.SalesService.getSaleById(commande.venteId);
        }

        // ETAP 2 : kreye vant lan (transaksyon separe — SalesService gen pwòp li)
        let vant;
        try {
            vant = await window.SalesService.createSale({
                kliyanId: commande.kliyanId,
                kliyanNon: commande.kliyanNon,
                kliyanAuthUid: commande.kliyanAuthUid || null,
                mòdPeman: mòdPeman || 'kach',
                canal: commande.canal || 'magazen',
                atik: commande.atik
            });
        } catch (e) {
            await cmdRef.update({ konvèsyonAnKou: false }).catch(() => {});
            throw e;
        }

        await cmdRef.update({ venteId: vant.id, konvèsyonAnKou: false });

        // ETAP 3 : kreye BL a (idompotan — id BL a se venteId)
        let bl = null;
        try {
            bl = await window.BonLivrezonSevis.kreyeBL(vant.id, opsyonLivrezon);
        } catch (e) {
            console.warn('Kreyasyon BL echwe apre vant konfime:', e);
            // Pa relanse — vant lan REYÈL e konfime; BL a ka kreye apre manyèlman
        }

        if (bl) {
            await cmdRef.update({ bonLivraisonId: bl.id });
        }

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Ventes', 'Konfime Kòmand → Vant + BL',
                commande.nimewoCommande, vant.nimewoFakti
            ).catch(err => console.warn('Audit log echwe:', err));
        }

        return vant;
    }

    // ---------- ESTATI AFICHAJ INIFYE (commande + BL, san 2èm source of truth) ----------

    /**
     * @param {Object} commande - dokiman kòmand
     * @param {Object|null} bonLivraison - dokiman BL ki lye a (si genyen)
     * @returns {string} youn nan: brouillon | annulée | confirmée | preparasyon | en_route | livre
     */
    function getOrderDisplayStatus(commande, bonLivraison) {
        if (commande.estati === 'annulée') return 'annulée';
        if (commande.estati === 'brouillon') return 'brouillon';
        // estati === 'confirmée'
        if (!bonLivraison) return 'confirmée'; // vant kreye, BL poko kreye
        return bonLivraison.estati; // preparasyon | en_route | livre
    }

    return {
        ESTATI_VALID, TRANZISYON_VALID,
        createOrder, getOrders, getOrderById,
        cancelOrder, convertOrderToSale,
        getOrderDisplayStatus
    };
})();

window.CommandesService = CommandesService;
                                                       
