// js/services/bonLivrezonSevis.js
// Depann de window.db, window.currentCompanyId, window.AdminService
//
// BL (Bon de Livraison) se yon dokiman LOJISTIK/TRASABILITE — li PA touche
// stock, li PA modifye Vant lan, e chanjman estati BL pa kreye okenn
// mouvman stock ni ekriti jounal. Sèl operasyon ki touche stock rete
// salesService.createSale() / cancelSale().
//
// Chak Vant gen MAKSIMÒM 1 BL — ID dokiman BL a se DIRÈKTEMAN venteId la,
// sa garanti inisite san bezwen kèri anndan transaction. kreyeBL() se
// IDOMPOTAN: si l rele 2 fwa pou menm venteId, li retounen BL ki egziste
// a olye leve yon erè (pwoteje kont retry/doub-klik/offline sync).

const BonLivrezonSevis = (() => {

    function getBizRef() {
        if (!window.currentCompanyId) throw new Error("Pa gen biznis aktif chwazi.");
        return window.db.collection('biznis').doc(window.currentCompanyId);
    }

    const ESTATI_VALID = ['preparasyon', 'en_route', 'livre', 'anile'];

    const TRANZISYON_VALID = {
        preparasyon: ['en_route', 'anile'],
        en_route: ['livre', 'anile'],
        livre: [],
        anile: []
    };

    async function getNextBLNumber(transaction, bizRef) {
        const counterRef = bizRef.collection('konte').doc('bonlivrezon');
        const counterDoc = await transaction.get(counterRef);
        let nextNum = 1;
        if (counterDoc.exists) {
            nextNum = (counterDoc.data().dènyeNimewo || 0) + 1;
        }
        transaction.set(counterRef, { dènyeNimewo: nextNum }, { merge: true });
        return 'BL-' + String(nextNum).padStart(6, '0');
    }

    /**
     * Kreye yon BL ki lye ak yon Vant ki deja egziste. Idompotan.
     * @param {string} venteId
     * @param {Object} opsyon
     *   opsyon.chofeId    - opsyonèl
     *   opsyon.veyikilId  - opsyonèl
     *   opsyon.adrèsLivrezon - opsyonèl
     */
    async function kreyeBL(venteId, opsyon = {}) {
        const bizRef = getBizRef();

        const rezilta = await window.db.runTransaction(async (transaction) => {
            // ============ FAZ 1 : TOUT LEKTI ============
            const venteRef = bizRef.collection('lavant').doc(venteId);
            const venteDoc = await transaction.get(venteRef);
            if (!venteDoc.exists) throw new Error("Vant sa a pa egziste.");

            const blRef = bizRef.collection('bon_livrezon').doc(venteId);
            const blDoc = await transaction.get(blRef);
            if (blDoc.exists) {
                // Idompotans : BL a deja egziste (retry, offline sync, doub-apèl).
                // Retounen enfòmasyon ki egziste a, pa kreye yon dezyèm.
                return {
                    id: blDoc.id,
                    nimewoBL: blDoc.data().nimewoBL,
                    nimewoFakti: blDoc.data().nimewoFakti,
                    _dejaEgziste: true
                };
            }

            let chofeDoc = null;
            if (opsyon.chofeId) {
                chofeDoc = await transaction.get(bizRef.collection('chofe').doc(opsyon.chofeId));
                if (!chofeDoc.exists) throw new Error("Chofè sa a pa egziste.");
            }

            let veyikilDoc = null;
            if (opsyon.veyikilId) {
                veyikilDoc = await transaction.get(bizRef.collection('veyikil').doc(opsyon.veyikilId));
                if (!veyikilDoc.exists) throw new Error("Veyikil sa a pa egziste.");
            }

            // ============ FAZ 2 : VERIFYE REGleman ============
            const vente = venteDoc.data();
            if (vente.estati !== 'aktif') {
                throw new Error(`Pa ka kreye BL pou yon vant ki gen estati "${vente.estati}".`);
            }

            const nimewoBL = await getNextBLNumber(transaction, bizRef);

            // ============ FAZ 3 : TOUT EKRITI ============
            transaction.set(blRef, {
                nimewoBL,
                venteId,
                nimewoFakti: vente.nimewoFakti,
                kliyanId: vente.kliyanId || null,
                kliyanNon: vente.kliyanNon || 'Kliyan Divès',
                kliyanAuthUid: vente.kliyanAuthUid || null,
                chofeId: opsyon.chofeId || null,
                chofeNon: chofeDoc ? chofeDoc.data().non : null,
                veyikilId: opsyon.veyikilId || null,
                veyikilPlak: veyikilDoc ? veyikilDoc.data().plak : null,
                atik: vente.atik,
                adrèsLivrezon: opsyon.adrèsLivrezon || null,
                estati: 'preparasyon',
                dat: firebase.firestore.FieldValue.serverTimestamp(),
                dateDepa: null,
                datLivrezonReyèl: null,
                kreyePaId: window.auth?.currentUser?.uid ?? null
            });

            return { id: blRef.id, nimewoBL, nimewoFakti: vente.nimewoFakti, _dejaEgziste: false };
        });

        if (rezilta._dejaEgziste) return rezilta;

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Logistique', 'Kreye BL', '—',
                `${rezilta.nimewoBL} — Vant ${rezilta.nimewoFakti}`
            ).catch(err => console.warn('Audit log echwe:', err));
        }

        return rezilta;
    }

    /**
     * Chanje estati yon BL. AUKENN efè sou stock ni sou Vant lan.
     * Preparasyon → En route → Livré / Annulé (chemen valid sèlman).
     */
    async function avanseEstati(blId, nouvoEstati) {
        if (!ESTATI_VALID.includes(nouvoEstati)) {
            throw new Error(`Estati "${nouvoEstati}" pa valid.`);
        }

        const bizRef = getBizRef();

        const rezilta = await window.db.runTransaction(async (transaction) => {
            const blRef = bizRef.collection('bon_livrezon').doc(blId);
            const blDoc = await transaction.get(blRef);
            if (!blDoc.exists) throw new Error("BL sa a pa egziste.");

            const bl = blDoc.data();
            const chemenValid = TRANZISYON_VALID[bl.estati] || [];
            if (!chemenValid.includes(nouvoEstati)) {
                throw new Error(`Pa ka pase BL a soti "${bl.estati}" pou rive "${nouvoEstati}".`);
            }

            const updates = { estati: nouvoEstati };
            if (nouvoEstati === 'en_route') {
                updates.dateDepa = firebase.firestore.FieldValue.serverTimestamp();
            }
            if (nouvoEstati === 'livre') {
                updates.datLivrezonReyèl = firebase.firestore.FieldValue.serverTimestamp();
            }

            transaction.update(blRef, updates);

            return { nimewoBL: bl.nimewoBL, ansyenEstati: bl.estati };
        });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Logistique', 'Chanje Estati BL', rezilta.nimewoBL,
                `${rezilta.ansyenEstati} → ${nouvoEstati}`
            ).catch(err => console.warn('Audit log echwe:', err));
        }
    }

    async function getBLs(limitCount = 50) {
        const bizRef = getBizRef();
        const snapshot = await bizRef.collection('bon_livrezon')
            .orderBy('dat', 'desc')
            .limit(limitCount)
            .get();
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    async function getBLById(blId) {
        const bizRef = getBizRef();
        const doc = await bizRef.collection('bon_livrezon').doc(blId).get();
        if (!doc.exists) throw new Error("BL sa a pa egziste.");
        return { id: doc.id, ...doc.data() };
    }

    async function getBLByVenteId(venteId) {
        return getBLById(venteId);
    }

    return {
        ESTATI_VALID,
        kreyeBL, avanseEstati,
        getBLs, getBLById, getBLByVenteId
    };
})();

window.BonLivrezonSevis = BonLivrezonSevis;
                
