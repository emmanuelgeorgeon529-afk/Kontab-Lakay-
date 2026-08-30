// js/services/assetsService.js
// Depann de window.db, window.currentCompanyId, window.AdminService
// Modèl: immobilisations (registre) + amortisman_istorik (1 dok pa byen pa mwa,
// evite doub-konte, menm patrón ak stock_istorik nan operations_ui.js)

const AssetsService = (() => {

    function getBizRef() {
        if (!window.currentCompanyId) throw new Error("Pa gen biznis aktif chwazi.");
        return window.db.collection('biznis').doc(window.currentCompanyId);
    }

    // ---------- KONT KONTAB (konfigirab pa biznis, menm patrón ak kont_pewol) ----------

    async function jwennKontImmobilisation() {
        const bizRef = getBizRef();
        const snap = await bizRef.collection('paramet').doc('kont_immobilisation').get();
        return snap.exists ? snap.data() : {};
    }

    async function sovgadeKontImmobilisation(kont) {
        const bizRef = getBizRef();
        await bizRef.collection('paramet').doc('kont_immobilisation')
            .set({ ...kont, modifyeNan: firebase.firestore.FieldValue.serverTimestamp() });
        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Actifs', 'Konfigire Kont Immobilisation', '—', 'Kòd kont mete ajou'
            ).catch(err => console.warn('Audit log echwe:', err));
        }
    }

    // ---------- 7.1 REGISTRE IMMOBILISATIONS ----------

    async function getNextAssetNumber(transaction, bizRef) {
        const counterRef = bizRef.collection('konte').doc('immobilisations');
        const counterDoc = await transaction.get(counterRef);
        let nextNum = 1;
        if (counterDoc.exists) nextNum = (counterDoc.data().dènyeNimewo || 0) + 1;
        transaction.set(counterRef, { dènyeNimewo: nextNum }, { merge: true });
        return 'IMB-' + String(nextNum).padStart(6, '0');
    }

    /**
     * @param {Object} data
     *   data.non, data.kategori, data.dateAcha ('YYYY-MM-DD'), data.priAcha
     *   data.dirèDeVi (nan ane), data.valèResiduelle (opsyonèl, default 0)
     *   data.sit (kote byen an ye)
     */
    async function createAsset(data) {
        if (!data.non || !data.non.trim()) throw new Error("Non byen an obligatwa.");
        if (!data.priAcha || data.priAcha <= 0) throw new Error("Pri acha dwe pi gran pase 0.");
        if (!data.dirèDeVi || data.dirèDeVi <= 0) throw new Error("Dirè de vi dwe pi gran pase 0.");
        if (!data.dateAcha) throw new Error("Dat acha a obligatwa.");

        const bizRef = getBizRef();

        const rezilta = await window.db.runTransaction(async (transaction) => {
            const nimewoByen = await getNextAssetNumber(transaction, bizRef);
            const byenRef = bizRef.collection('immobilisations').doc();
            transaction.set(byenRef, {
                nimewoByen,
                non: data.non.trim(),
                kategori: data.kategori || 'Divès',
                dateAcha: data.dateAcha,
                priAcha: data.priAcha,
                dirèDeVi: data.dirèDeVi,
                valèResiduelle: data.valèResiduelle || 0,
                sit: data.sit || '',
                aktif: true,
                siprime: false,
                dat: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { id: byenRef.id, nimewoByen };
        });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Actifs', 'Kreye Immobilisation', '—',
                `${rezilta.nimewoByen} — ${data.non.trim()} (${data.priAcha.toLocaleString()} HTG)`
            ).catch(err => console.warn('Audit log echwe:', err));
        }

        return rezilta;
    }

    async function getRegistre(includeInactive = false) {
        const bizRef = getBizRef();
        let query = bizRef.collection('immobilisations').where('siprime', '==', false);
        if (!includeInactive) query = query.where('aktif', '==', true);
        const snapshot = await query.get();
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    async function dezaktiveAsset(assetId, rezon) {
        const bizRef = getBizRef();
        await bizRef.collection('immobilisations').doc(assetId).update({
            aktif: false, rezonDezaktivasyon: rezon || '',
            dezaktivenNan: firebase.firestore.FieldValue.serverTimestamp()
        });
        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Actifs', 'Dezaktive Immobilisation', 'aktif',
                rezon ? `dezaktive: ${rezon}` : 'dezaktive'
            ).catch(err => console.warn('Audit log echwe:', err));
        }
    }

    // ---------- 7.2 AMORTISMAN (Linéaire sèlman pou kounye a) ----------

    function moisEcoules(dateAchaStr, dateRef = new Date()) {
        const dateAcha = new Date(dateAchaStr);
        let mois = (dateRef.getFullYear() - dateAcha.getFullYear()) * 12 +
            (dateRef.getMonth() - dateAcha.getMonth());
        if (dateRef.getDate() < dateAcha.getDate()) mois -= 1;
        return Math.max(0, mois);
    }

    /** Kalkil amortisman pou YON byen, jiska yon dat done (default: jodi a). */
    function calculAmortissement(byen, dateRef = new Date()) {
        const baz = byen.priAcha - (byen.valèResiduelle || 0);
        const amortisManyèl = baz / byen.dirèDeVi / 12;
        const mois = moisEcoules(byen.dateAcha, dateRef);
        const amortismanAkimile = Math.min(mois * amortisManyèl, baz);
        const valèNette = byen.priAcha - amortismanAkimile;
        const amòti = amortismanAkimile >= baz - 0.01;
        return { amortisManyèl, amortismanAkimile, valèNette, amòti };
    }

    /** Rezime tout registre a — pou dashboard 7 (Valè Total, Amortisman Akimile, Valè Nèt). */
    async function getAmortissementSummary() {
        const byenYo = await getRegistre(true);
        let priTotal = 0, amortismanTotal = 0, valèNetteTotal = 0, byenAmòti = 0;
        const detay = byenYo.map(b => {
            const calc = calculAmortissement(b);
            priTotal += b.priAcha;
            amortismanTotal += calc.amortismanAkimile;
            valèNetteTotal += calc.valèNette;
            if (calc.amòti) byenAmòti++;
            return { ...b, ...calc };
        });
        return { priTotal, amortismanTotal, valèNetteTotal, byenAmòti, detay };
    }

    /**
     * Egzekite ekriti jounal amortisman pou tout byen aktif ki poko fin amòti,
     * pou mwa aktyèl la SÈLMAN (evite doub-ekriti si deja fèt mwa sa a).
     * Dwe rele MANYÈLMAN (pa gen Cloud Function — Firebase Spark).
     */
    async function egzekiteAmortisMwa() {
        const bizRef = getBizRef();
        const byenYo = await getRegistre(false);
        const kont = await jwennKontImmobilisation();
        const kontDotation = kont.dotationAmortissement || 'Dotations aux Amortissements';

        const jodiA = new Date();
        const kleMwa = `${jodiA.getFullYear()}-${String(jodiA.getMonth() + 1).padStart(2, '0')}`;

        let nimewoEkriti = 0;
        const rezilta = [];

        for (const byen of byenYo) {
            const calc = calculAmortissement(byen);
            if (calc.amòti) continue;

            const istorikId = `${byen.id}_${kleMwa}`;
            const istorikRef = bizRef.collection('amortisman_istorik').doc(istorikId);
            const dejaFèt = await istorikRef.get();
            if (dejaFèt.exists) continue; // deja anrejistre pou mwa sa a

            const montanMwa = Math.round(calc.amortisManyèl);
            if (montanMwa <= 0) continue;

            const kontCumulé = kont.amortissementCumulé?.[byen.kategori]
                || kont.amortissementCumulé?.défaut
                || `Amortissement Cumulé — ${byen.kategori}`;

            await bizRef.runTransaction(async (transaction) => {
                transaction.set(istorikRef, {
                    actifId: byen.id, actifNon: byen.non, mwa: kleMwa,
                    montan: montanMwa, dat: firebase.firestore.FieldValue.serverTimestamp()
                });
                const journalRef = bizRef.collection('jounal').doc();
                transaction.set(journalRef, {
                    dat: firebase.firestore.FieldValue.serverTimestamp(),
                    liy: [
                        { kont: kontDotation, débit: montanMwa, crédit: 0 },
                        { kont: kontCumulé, débit: 0, crédit: montanMwa }
                    ],
                    referans: byen.id,
                    sous: 'amortisman_mansyèl'
                });
            });

            nimewoEkriti++;
            rezilta.push({ byen: byen.non, montan: montanMwa });
        }

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Actifs', 'Egzekite Amortisman Mansyèl', '—',
                `${kleMwa}: ${nimewoEkriti} byen amòti`
            ).catch(err => console.warn('Audit log echwe:', err));
        }

        return { kleMwa, nimewoEkriti, rezilta };
    }

    return {
        createAsset, getRegistre, dezaktiveAsset,
        calculAmortissement, getAmortissementSummary, egzekiteAmortisMwa,
        jwennKontImmobilisation, sovgadeKontImmobilisation
    };
})();

window.AssetsService = AssetsService;
