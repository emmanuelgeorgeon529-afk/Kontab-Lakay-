// js/services/kesService.js
// Depann de window.db, window.currentCompanyId, window.AdminService,
// window.SalesService, window.PurchasesService
// Modèl: sesyon_kes (louvri/fèmen chak jou) + kes_mouvman (antre/sòti manyèl)

const KesService = (() => {

    function getBizRef() {
        if (!window.currentCompanyId) throw new Error("Pa gen biznis aktif chwazi.");
        return window.db.collection('biznis').doc(window.currentCompanyId);
    }

    const KONT_KES = '1010';
    const KONT_EKAR_DEFAVORAB = '658'; // Charges diverses — ekar kès negatif (manke lajan)
    const KONT_EKAR_FAVORAB = '758';   // Produits divers — ekar kès pozitif (twòp lajan)

    // ---------- SESYON KÈS ----------

    /**
     * Louvri yon nouvo sesyon kès. Refize si gen yon sesyon ouvè deja.
     * @param {number} montanOuvèti - kach konte nan men lè sesyon an kòmanse
     */
    async function ouvriSesyon(montanOuvèti) {
        if (montanOuvèti == null || montanOuvèti < 0) {
            throw new Error("Montan ouvèti dwe pi gran oswa egal a 0.");
        }

        const bizRef = getBizRef();

        const sesyonEnkou = await getSesyonAktif();
        if (sesyonEnkou) {
            throw new Error(`Gen yon sesyon kès deja ouvè depi ${sesyonEnkou.dateOuvèti?.toDate?.().toLocaleString('fr-HT') || '—'}. Fèmen l anvan ou louvri yon lòt.`);
        }

        const sesyonRef = bizRef.collection('sesyon_kes').doc();
        await sesyonRef.set({
            montanOuvèti,
            estati: 'ouvè',
            dateOuvèti: firebase.firestore.FieldValue.serverTimestamp(),
            itilizateId: window.auth?.currentUser?.uid || null,
            itilizateNon: window.auth?.currentUser?.displayName || 'Enkoni'
        });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Kès', 'Louvri Sesyon Kès', '—',
                `Montan ouvèti: ${montanOuvèti.toLocaleString()} HTG`
            ).catch(err => console.warn('Audit log echwe:', err));
        }

        return { id: sesyonRef.id };
    }

    async function getSesyonAktif() {
        const bizRef = getBizRef();
        const snapshot = await bizRef.collection('sesyon_kes')
            .where('estati', '==', 'ouvè')
            .limit(1)
            .get();
        if (snapshot.empty) return null;
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    }

    async function getSesyons(limitCount = 30) {
        const bizRef = getBizRef();
        const snapshot = await bizRef.collection('sesyon_kes')
            .orderBy('dateOuvèti', 'desc')
            .limit(limitCount)
            .get();
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    /**
     * Kalkile balans teyorik + fèmen sesyon an, ak ekriti jounal otomatik si gen ekar.
     * @param {string} sesyonId
     * @param {number} montanFèmtiReyèl - kach konte fizikman nan men lè fèmti a
     */
    async function fèmenSesyon(sesyonId, montanFèmtiReyèl) {
        if (montanFèmtiReyèl == null || montanFèmtiReyèl < 0) {
            throw new Error("Montan fèmti reyèl dwe pi gran oswa egal a 0.");
        }

        const bizRef = getBizRef();
        const sesyonRef = bizRef.collection('sesyon_kes').doc(sesyonId);
        const sesyonDoc = await sesyonRef.get();
        if (!sesyonDoc.exists) throw new Error("Sesyon kès sa a pa egziste.");
        const sesyon = sesyonDoc.data();
        if (sesyon.estati !== 'ouvè') throw new Error("Sesyon sa a deja fèmen.");

        const dateOuvèti = sesyon.dateOuvèti.toDate();

        // ---- 1. Mouvman manyèl (antre/sòti) pandan sesyon an ----
        const mouvmanSnap = await bizRef.collection('kes_mouvman')
            .where('sesyonId', '==', sesyonId)
            .get();
        let mouvmanAntre = 0, mouvmanSòti = 0;
        mouvmanSnap.docs.forEach(d => {
            const m = d.data();
            if (m.tip === 'antre') mouvmanAntre += m.montan;
            else if (m.tip === 'sòti') mouvmanSòti += m.montan;
        });

        // ---- 2. Vant kach pandan sesyon an ----
        let vantKach = 0;
        if (window.SalesService) {
            const toutVant = await window.SalesService.getSales(500);
            vantKach = toutVant
                .filter(v => v.estati !== 'anile' && v.mòdPeman === 'kach' &&
                    v.dat?.toDate && v.dat.toDate() >= dateOuvèti)
                .reduce((s, v) => s + (v.total || 0), 0);
        }

        // ---- 3. Acha kach pandan sesyon an (sòti lajan nan kès) ----
        let achatKach = 0;
        if (window.PurchasesService) {
            const toutAcha = await window.PurchasesService.getPurchases(500);
            achatKach = toutAcha
                .filter(a => a.estati !== 'anile' && a.mòdPeman === 'kach' &&
                    a.dat?.toDate && a.dat.toDate() >= dateOuvèti)
                .reduce((s, a) => s + (a.total || 0), 0);
        }

        // ---- 3b. Depans kach pandan sesyon an (sòti lajan nan kès) ----
        let depansKach = 0;
        if (window.DepansService) {
            const toutDepans = await window.DepansService.getDepans(500);
            depansKach = toutDepans
                .filter(d => d.mòdPeman === 'kach' &&
                    d.dat?.toDate && d.dat.toDate() >= dateOuvèti)
                .reduce((s, d) => s + (d.montan || 0), 0);
        }

        const montanFèmtiTeyorik = sesyon.montanOuvèti + mouvmanAntre - mouvmanSòti + vantKach - achatKach - depansKach;
        const ekar = montanFèmtiReyèl - montanFèmtiTeyorik;

        // ---- 4. LOCK + fèmen sesyon an nan yon transaksyon ----
        await window.db.runTransaction(async (transaction) => {
            const freshDoc = await transaction.get(sesyonRef);
            if (!freshDoc.exists) throw new Error("Sesyon kès sa a pa egziste.");
            if (freshDoc.data().estati !== 'ouvè') throw new Error("Sesyon sa a deja fèmen.");

            transaction.update(sesyonRef, {
                estati: 'fèmen',
                mouvmanAntre, mouvmanSòti, vantKach, achatKach, depansKach,
                montanFèmtiTeyorik, montanFèmtiReyèl, ekar,
                dateFèmti: firebase.firestore.FieldValue.serverTimestamp(),
                fèmenPa: window.auth?.currentUser?.uid || null
            });

            if (Math.abs(ekar) > 0.01) {
                const journalRef = bizRef.collection('jounal').doc();
                const liy = ekar < 0
                    ? [
                        { kont: KONT_EKAR_DEFAVORAB, débit: Math.abs(ekar), crédit: 0 },
                        { kont: KONT_KES, débit: 0, crédit: Math.abs(ekar) }
                    ]
                    : [
                        { kont: KONT_KES, débit: ekar, crédit: 0 },
                        { kont: KONT_EKAR_FAVORAB, débit: 0, crédit: ekar }
                    ];
                transaction.set(journalRef, {
                    dat: firebase.firestore.FieldValue.serverTimestamp(),
                    liy,
                    referans: sesyonId,
                    sous: 'ekar_kes'
                });
            }
        });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Kès', 'Fèmen Sesyon Kès',
                `Teyorik: ${montanFèmtiTeyorik.toLocaleString()} HTG`,
                `Reyèl: ${montanFèmtiReyèl.toLocaleString()} HTG (ekar: ${ekar.toLocaleString()} HTG)`
            ).catch(err => console.warn('Audit log echwe:', err));
        }

        return { montanFèmtiTeyorik, montanFèmtiReyèl, ekar };
    }

    // ---------- MOUVMAN MANYÈL (antre/sòti kach ki pa vant/acha) ----------

    /**
     * @param {Object} data
     *   data.tip - 'antre' | 'sòti'
     *   data.montan
     *   data.kontContrepati - kont ki kontrekare Kès la (ex: '108' Kont Pwopriyete, '601' Acha)
     *   data.rezon - deskripsyon
     */
    async function anrejistreMouvman(data) {
        if (!['antre', 'sòti'].includes(data.tip)) throw new Error("Tip mouvman pa valid.");
        if (!data.montan || data.montan <= 0) throw new Error("Montan dwe pi gran pase 0.");
        if (!data.kontContrepati || !data.kontContrepati.trim()) {
            throw new Error("Kont kontrepati a obligatwa (ex: 108 pou retrè pwopriyetè).");
        }
        if (!data.rezon || !data.rezon.trim()) throw new Error("Rezon an obligatwa.");

        const sesyonAktif = await getSesyonAktif();
        if (!sesyonAktif) throw new Error("Pa gen sesyon kès ouvè. Louvri yon sesyon anvan.");

        const bizRef = getBizRef();

        const rezilta = await window.db.runTransaction(async (transaction) => {
            const mouvmanRef = bizRef.collection('kes_mouvman').doc();
            transaction.set(mouvmanRef, {
                sesyonId: sesyonAktif.id,
                tip: data.tip,
                montan: data.montan,
                kontContrepati: data.kontContrepati.trim(),
                rezon: data.rezon.trim(),
                dat: firebase.firestore.FieldValue.serverTimestamp(),
                itilizateId: window.auth?.currentUser?.uid || null
            });

            const journalRef = bizRef.collection('jounal').doc();
            const liy = data.tip === 'antre'
                ? [
                    { kont: KONT_KES, débit: data.montan, crédit: 0 },
                    { kont: data.kontContrepati.trim(), débit: 0, crédit: data.montan }
                ]
                : [
                    { kont: data.kontContrepati.trim(), débit: data.montan, crédit: 0 },
                    { kont: KONT_KES, débit: 0, crédit: data.montan }
                ];
            transaction.set(journalRef, {
                dat: firebase.firestore.FieldValue.serverTimestamp(),
                liy,
                referans: mouvmanRef.id,
                sous: 'mouvman_kes_manyèl'
            });

            return { id: mouvmanRef.id };
        });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Kès', `Mouvman Kès (${data.tip})`,
                '—', `${data.montan.toLocaleString()} HTG — ${data.rezon.trim()}`
            ).catch(err => console.warn('Audit log echwe:', err));
        }

        return rezilta;
    }

    async function getMouvmanBySession(sesyonId) {
        const bizRef = getBizRef();
        const snapshot = await bizRef.collection('kes_mouvman')
            .where('sesyonId', '==', sesyonId)
            .orderBy('dat', 'desc')
            .get();
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    return {
        KONT_KES,
        ouvriSesyon, getSesyonAktif, getSesyons, fèmenSesyon,
        anrejistreMouvman, getMouvmanBySession
    };
})();

window.KesService = KesService;
