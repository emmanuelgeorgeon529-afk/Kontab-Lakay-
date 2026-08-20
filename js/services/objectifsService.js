// js/services/objectifsService.js
// Depann de window.db, window.currentCompanyId, window.AdminService, window.SalesService

const ObjectifsService = (() => {

    function getBizRef() {
        if (!window.currentCompanyId) throw new Error("Pa gen biznis aktif chwazi.");
        return window.db.collection('biznis').doc(window.currentCompanyId);
    }

    /**
     * Kreye yon objektif komèsyal pou yon vandè, sou yon peryòd bay.
     * @param {Object} data
     *   data.vandèId, vandèNon
     *   data.montanObjektif
     *   data.dateDebut, dateFen - ISO date strings (peryòd objektif la)
     */
    async function createObjective(data) {
        if (!data.vandèId) throw new Error("Vandè a obligatwa.");
        if (!data.montanObjektif || data.montanObjektif <= 0) {
            throw new Error("Montan objektif la dwe pi gran pase 0.");
        }
        if (!data.dateDebut || !data.dateFen) throw new Error("Peryòd la obligatwa.");

        const bizRef = getBizRef();
        const objRef = bizRef.collection('objectif_vandè').doc();

        await objRef.set({
            vandèId: data.vandèId,
            vandèNon: data.vandèNon || 'Enkoni',
            montanObjektif: data.montanObjektif,
            dateDebut: firebase.firestore.Timestamp.fromDate(new Date(data.dateDebut)),
            dateFen: firebase.firestore.Timestamp.fromDate(new Date(data.dateFen)),
            dat: firebase.firestore.FieldValue.serverTimestamp()
        });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Ventes', 'Kreye Objektif Komèsyal',
                '—', `${data.vandèNon}: ${data.montanObjektif.toLocaleString()} HTG`
            ).catch(err => console.warn('Audit log echwe:', err));
        }

        return { id: objRef.id };
    }

    async function getObjectives(limitCount = 50) {
        const bizRef = getBizRef();
        const snapshot = await bizRef.collection('objectif_vandè')
            .orderBy('dat', 'desc').limit(limitCount).get();
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    // ---------- KALKILE REYALIZASYON (sèvi ak vant reyèl SalesService) ----------

    async function getObjectiveProgress(objectiveId) {
        const bizRef = getBizRef();
        const doc = await bizRef.collection('objectif_vandè').doc(objectiveId).get();
        if (!doc.exists) throw new Error("Objektif sa a pa egziste.");
        const obj = doc.data();

        const toutVant = await window.SalesService.getSales(1000);
        const dateDebut = obj.dateDebut.toDate();
        const dateFen = obj.dateFen.toDate();

        const vantVandè = toutVant.filter(v => {
            if (v.estati === 'anile' || v.vandèId !== obj.vandèId) return false;
            const dat = v.dat?.toDate ? v.dat.toDate() : null;
            return dat && dat >= dateDebut && dat <= dateFen;
        });

        const totalReyalize = vantVandè.reduce((s, v) => s + (v.total || 0), 0);
        const pousantaj = obj.montanObjektif > 0
            ? Math.min(100, Math.round((totalReyalize / obj.montanObjektif) * 100))
            : 0;

        return {
            vandèNon: obj.vandèNon,
            montanObjektif: obj.montanObjektif,
            totalReyalize,
            pousantaj,
            nòmbVant: vantVandè.length
        };
    }

    // ---------- REYALIZASYON TOUT VANDÈ POU YON PERYÒD (pou dashboard) ----------

    async function getAllProgress() {
        const objectifs = await getObjectives(100);
        const rezilta = [];
        for (const obj of objectifs) {
            const progress = await getObjectiveProgress(obj.id);
            rezilta.push({ id: obj.id, ...progress });
        }
        return rezilta;
    }

    return { createObjective, getObjectives, getObjectiveProgress, getAllProgress };
})();

window.ObjectifsService = ObjectifsService;
