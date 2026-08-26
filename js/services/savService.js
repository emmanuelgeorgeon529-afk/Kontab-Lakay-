// js/services/savService.js
// Depann de window.db, window.currentCompanyId, window.AdminService,
// window.SalesService, window.ProductsService, window.StockService

const SavService = (() => {

    function getBizRef() {
        if (!window.currentCompanyId) throw new Error("Pa gen biznis aktif chwazi.");
        return window.db.collection('biznis').doc(window.currentCompanyId);
    }

    const TIP_SAV_VALID = ['réclamation', 'retour', 'échange', 'garantie'];
    const ETAP_RETOUR = ['retour_demandé', 'inspection', 'remboursement', 'échange_effectué', 'rejeté'];

    async function getNextTicketNumber(transaction, bizRef) {
        const counterRef = bizRef.collection('konte').doc('sav');
        const counterDoc = await transaction.get(counterRef);
        let nextNum = 1;
        if (counterDoc.exists) {
            nextNum = (counterDoc.data().dènyeNimewo || 0) + 1;
        }
        transaction.set(counterRef, { dènyeNimewo: nextNum }, { merge: true });
        return 'SAV-' + String(nextNum).padStart(6, '0');
    }

    async function getNextAvoirNumber(transaction, bizRef) {
        const counterRef = bizRef.collection('konte').doc('avoir');
        const counterDoc = await transaction.get(counterRef);
        let nextNum = 1;
        if (counterDoc.exists) {
            nextNum = (counterDoc.data().dènyeNimewo || 0) + 1;
        }
        transaction.set(counterRef, { dènyeNimewo: nextNum }, { merge: true });
        return 'AV-' + String(nextNum).padStart(6, '0');
    }

    /**
     * Kreye yon tikè SAV (Réclamation, Retour, Échange, oswa Garantie).
     * @param {Object} data
     *   data.tip - youn nan TIP_SAV_VALID
     *   data.venteId - ID vant orijinal la (obligatwa pou retour/échange/garantie)
     *   data.kliyanId, kliyanNon
     *   data.deskripsyon - rezon/deskripsyon pwoblèm nan
     *   data.atik - [{ pwodwiId, non, kantite }] pou retour/échange
     */
    async function createTicket(data) {
        if (!TIP_SAV_VALID.includes(data.tip)) throw new Error("Tip SAV pa valid.");
        if (!data.deskripsyon || !data.deskripsyon.trim()) {
            throw new Error("Deskripsyon an obligatwa.");
        }
        if (['retour', 'échange', 'garantie'].includes(data.tip) && !data.venteId) {
            throw new Error("Referans vant orijinal la obligatwa pou " + data.tip + ".");
        }

        const bizRef = getBizRef();

        const rezilta = await window.db.runTransaction(async (transaction) => {
            const nimewoTikè = await getNextTicketNumber(transaction, bizRef);
            const tikèRef = bizRef.collection('sav').doc();

            transaction.set(tikèRef, {
                nimewoTikè,
                tip: data.tip,
                venteId: data.venteId || null,
                kliyanId: data.kliyanId || null,
                kliyanNon: data.kliyanNon || 'Kliyan Divès',
                deskripsyon: data.deskripsyon.trim(),
                atik: data.atik || [],
                estati: data.tip === 'retour' ? 'retour_demandé' : 'ouvert',
                istorik: [{ etap: 'kreye', dat: new Date().toISOString() }],
                dat: firebase.firestore.FieldValue.serverTimestamp()
            });

            return { id: tikèRef.id, nimewoTikè };
        });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Ventes', `Kreye Tikè ${data.tip}`, '—', rezilta.nimewoTikè
            ).catch(err => console.warn('Audit log echwe:', err));
        }

        return rezilta;
    }

    async function getTickets(limitCount = 50) {
        const bizRef = getBizRef();
        const snapshot = await bizRef.collection('sav')
            .orderBy('dat', 'desc').limit(limitCount).get();
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    async function getTicketById(ticketId) {
        const bizRef = getBizRef();
        const doc = await bizRef.collection('sav').doc(ticketId).get();
        if (!doc.exists) throw new Error("Tikè sa a pa egziste.");
        return { id: doc.id, ...doc.data() };
    }

    // ---------- WORKFLOW RETOUR: retour_demandé → inspection → remboursement/échange_effectué/rejeté ----------

    // MIZAJOU MULTI-DÉPÔT: retabli stock la kounye a pase pa
    // StockService (stock/{pwodwiId}__{depoId}) ANPLIS pwodwi.kantiteStock.
    // depoId jwenn sou VANT ORIJINAL la (lavant/{venteId}.depoId), PA sou
    // Dépôt Principal fikse — sa asire retou a retabli nan MENM depo kote
    // machandiz la te sòti orijinèlman. Si vant lan pa gen depoId (vant
    // ki te fèt anvan Multi-Dépôt), fallback sou DEPO_PRINCIPAL_ID.
    //
    // MIZAJOU AVOIR (Modil 5.9): lè nouvoEstati === 'remboursement', fonksyon
    // sa a kreye AVOSI yon dokiman 'avoir' + yon ekriti jounal remboursement,
    // ANNDAN MENM transaksyon an ak retabli stock la — tout atomik.
    // Avoir/{avoirId} itilize MENM ID ak tikè SAV la (ref.id), menm patwon
    // ak bon_livrezon/venteId — sa anpeche kreye 2 Avoir pou menm SAV la.
    // Anplis, 'remboursement' se yon eta TÈMINAL (blòk anba a), kidonk yon
    // dezyèm apèl ap refize AVAN menm rive nan kreyasyon Avoir a — doub
    // pwoteksyon san bezwen kèri anndan transaction.
    //
    // Sekans strik: FAZ 1 (tout GET) → FAZ 2 (kalkil, san Firestore)
    // → FAZ 3 (tout WRITE). Menm patwon ak createSale()/createPurchase().
    /**
     * @param {string} ticketId
     * @param {string} nouvoEstati
     * @param {Object} opsyon
     *   opsyon.modRemboursman - 'kach' | 'transfè' | 'kont_kliyan' (sèlman itilize si nouvoEstati === 'remboursement')
     *                            'kont_kliyan' = diminye dèt kliyan an olye peye kach/transfè imedya
     */
    async function advanceReturnStatus(ticketId, nouvoEstati, opsyon = {}) {
        if (!ETAP_RETOUR.includes(nouvoEstati)) throw new Error("Etap pa valid.");

        const bizRef = getBizRef();
        const ref = bizRef.collection('sav').doc(ticketId);
        const modRemboursman = opsyon.modRemboursman || 'kach';

        const rezilta = await window.db.runTransaction(async (transaction) => {
            // ============ FAZ 1 : TOUT LEKTI ============
            const doc = await transaction.get(ref);
            if (!doc.exists) throw new Error("Tikè sa a pa egziste.");
            const tikè = doc.data();

            if (['remboursement', 'échange_effectué', 'rejeté'].includes(tikè.estati)) {
                throw new Error("Tikè sa a deja fèmen.");
            }

            const dwèRetabliStock = (nouvoEstati === 'remboursement' || nouvoEstati === 'échange_effectué');
            const dwèKreyeAvoir = (nouvoEstati === 'remboursement');
            const atikLis = dwèRetabliStock ? (tikè.atik || []) : [];

            // Jwenn Vant orijinal la — bezwen pou depoId (retabli stock) EPI
            // pou pri/rabè/taks (kalkil montan Avoir)
            let venteDoc = null;
            if ((dwèRetabliStock || dwèKreyeAvoir) && tikè.venteId) {
                const venteRef = bizRef.collection('lavant').doc(tikè.venteId);
                venteDoc = await transaction.get(venteRef);
            }

            let depoId = window.DEPO_PRINCIPAL_ID;
            if (venteDoc && venteDoc.exists && venteDoc.data().depoId) {
                depoId = venteDoc.data().depoId;
            }

            let kliyanRef = null;
            let kliyanDoc = null;
            if (dwèKreyeAvoir && modRemboursman === 'kont_kliyan' && tikè.kliyanId) {
                kliyanRef = bizRef.collection('kliyan').doc(tikè.kliyanId);
                kliyanDoc = await transaction.get(kliyanRef);
            }

            const productRefs = atikLis.map(a => bizRef.collection('pwodwi').doc(a.pwodwiId));
            const productDocs = await Promise.all(productRefs.map(r => transaction.get(r)));

            const stockAvanParLiy = [];
            if (dwèRetabliStock) {
                for (const atik of atikLis) {
                    const stockAvan = await window.StockService.liStokPouTransaction(atik.pwodwiId, depoId, transaction);
                    stockAvanParLiy.push(stockAvan);
                }
            }

            // ---- Nimewo Avoir (GET+WRITE konte — dwe rive anvan lòt write yo) ----
            let nimewoAvoir = null;
            if (dwèKreyeAvoir) {
                nimewoAvoir = await getNextAvoirNumber(transaction, bizRef);
            }

            // ============ FAZ 2 : KALKIL (san Firestore) ============
            // NÒT sou apwoksimasyon: pri inite pou chak liy soti nan Vant
            // orijinal la (vente.atik), men rabè/ristourne PA rekalkile liy
            // pa liy — mwen aplike RAPÒ global Vant lan (netCommercial/prixBrut
            // ak montanTaks/netCommercial) sou pri brit liy retou a. Sa se yon
            // apwoksimasyon rezonab pou retou pasyèl, pa yon rekalkil egzat.
            let montantHT = 0, tca = 0, montantTTC = 0, lignesAvoir = [];
            if (dwèKreyeAvoir && venteDoc && venteDoc.exists) {
                const vente = venteDoc.data();
                const ratioNet = vente.prixBrut > 0 ? (vente.netCommercial / vente.prixBrut) : 1;
                const ratioTaks = vente.netCommercial > 0 ? (vente.montanTaks / vente.netCommercial) : 0;

                lignesAvoir = atikLis.map(atikRetou => {
                    const atikOrijinal = (vente.atik || []).find(a => a.pwodwiId === atikRetou.pwodwiId);
                    const priInite = atikOrijinal ? atikOrijinal.priInite : 0;
                    const brutLiy = priInite * atikRetou.kantite;
                    const netLiy = brutLiy * ratioNet;
                    return {
                        pwodwiId: atikRetou.pwodwiId,
                        non: atikRetou.non,
                        kantite: atikRetou.kantite,
                        priInite,
                        montantHT: netLiy
                    };
                });

                montantHT = lignesAvoir.reduce((s, l) => s + l.montantHT, 0);
                tca = montantHT * ratioTaks;
                montantTTC = montantHT + tca;
            }

            // ============ FAZ 3 : TOUT EKRITI ============
            transaction.update(ref, {
                estati: nouvoEstati,
                avoirId: dwèKreyeAvoir ? ref.id : (tikè.avoirId || null),  // menm ID ak tikè a, pa bezwen kèri pou lye yo
                istorik: firebase.firestore.FieldValue.arrayUnion({
                    etap: nouvoEstati, dat: new Date().toISOString()
                })
            });

            productDocs.forEach((pDoc, i) => {
                if (!pDoc.exists) return; // pwodwi disparèt — pa bloke fèmti tikè a pou sa
                const stockAvan = pDoc.data().kantiteStock || 0;
                const stockApre = stockAvan + atikLis[i].kantite;
                transaction.update(productRefs[i], { kantiteStock: stockApre });

                window.StockService.ekriStokPouTransaction(
                    atikLis[i].pwodwiId, depoId, stockAvanParLiy[i], atikLis[i].kantite, transaction
                );

                const ajistmanRef = bizRef.collection('ajistman_stock').doc();
                transaction.set(ajistmanRef, {
                    pwodwiId: atikLis[i].pwodwiId,
                    pwodwiNon: atikLis[i].non || pDoc.data().non,
                    depoId,
                    stockAvan,
                    kantiteChanjman: atikLis[i].kantite,
                    stockApre,
                    rezon: `Retour SAV ${tikè.nimewoTikè}`,
                    dat: firebase.firestore.FieldValue.serverTimestamp(),
                    itilizatèId: window.auth?.currentUser?.uid || null
                });
            });

            // ---- Kreye Avoir + Ekriti Jounal (sèlman lè 'remboursement') ----
            if (dwèKreyeAvoir) {
                const avoirRef = bizRef.collection('avoir').doc(ref.id);  // menm ID ak tikè SAV la
                transaction.set(avoirRef, {
                    numeroAvoir: nimewoAvoir,
                    ticketSavId: ref.id,
                    clientId: tikè.kliyanId || null,
                    clientNon: tikè.kliyanNon || 'Kliyan Divès',
                    venteId: tikè.venteId || null,
                    motif: tikè.deskripsyon || '',
                    montantHT,
                    tca,
                    montantTTC,
                    modRemboursman,
                    statut: 'émis',
                    lignes: lignesAvoir,
                    dat: firebase.firestore.FieldValue.serverTimestamp()
                });

                const kontDebit = '4010'; // Ventes — annulation partielle
                const liyJournal = [{ kont: kontDebit, débit: montantHT, crédit: 0 }];
                if (tca > 0) liyJournal.push({ kont: '4457', débit: tca, crédit: 0 });

                if (modRemboursman === 'kont_kliyan') {
                    liyJournal.push({ kont: '1030', débit: 0, crédit: montantTTC }); // Client
                    if (kliyanRef && kliyanDoc && kliyanDoc.exists) {
                        const dètAktyèl = kliyanDoc.data().dèt || 0;
                        transaction.update(kliyanRef, { dèt: Math.max(0, dètAktyèl - montantTTC) });
                    }
                } else {
                    const kontKrèdi = modRemboursman === 'transfè' ? '1020' : '1010'; // Bank oswa Kès
                    liyJournal.push({ kont: kontKrèdi, débit: 0, crédit: montantTTC });
                }

                const journalRef = bizRef.collection('jounal').doc();
                transaction.set(journalRef, {
                    nimewoEkriti: nimewoAvoir,
                    dat: firebase.firestore.FieldValue.serverTimestamp(),
                    liy: liyJournal,
                    referans: avoirRef.id,
                    sous: 'avoir_remboursement'
                });
            }

            return { nimewoTikè: tikè.nimewoTikè, nimewoAvoir, montantTTC };
        });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Ventes', 'Avanse Estati Retour SAV',
                rezilta.nimewoTikè, nouvoEstati + (rezilta.nimewoAvoir ? ` — Avoir ${rezilta.nimewoAvoir} (${rezilta.montantTTC.toLocaleString()} HTG)` : '')
            ).catch(err => console.warn('Audit log echwe:', err));
        }

        return rezilta;
    }

    // ---------- FÈMEN TIKÈ (réclamation/garantie sèlman) ----------

    async function closeTicket(ticketId, rezolisyon) {
        const bizRef = getBizRef();
        const ref = bizRef.collection('sav').doc(ticketId);

        await ref.update({
            estati: 'fèmen',
            rezolisyon: rezolisyon || '',
            dateFèmen: firebase.firestore.FieldValue.serverTimestamp()
        });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Ventes', 'Fèmen Tikè SAV', ticketId, rezolisyon || ''
            ).catch(err => console.warn('Audit log echwe:', err));
        }
    }

    // ---------- AVOIRS (lekti) ----------

    async function getAvoirs(limitCount = 50) {
        const bizRef = getBizRef();
        const snapshot = await bizRef.collection('avoir')
            .orderBy('dat', 'desc').limit(limitCount).get();
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    async function getAvoirById(avoirId) {
        const bizRef = getBizRef();
        const doc = await bizRef.collection('avoir').doc(avoirId).get();
        if (!doc.exists) throw new Error("Avoir sa a pa egziste.");
        return { id: doc.id, ...doc.data() };
    }

    return {
        TIP_SAV_VALID, ETAP_RETOUR,
        createTicket, getTickets, getTicketById,
        advanceReturnStatus, closeTicket,
        getAvoirs, getAvoirById
    };
})();

window.SavService = SavService;
