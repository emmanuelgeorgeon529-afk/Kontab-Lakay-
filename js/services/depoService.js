// js/services/depoService.js
// Jere Depo yo (Modil 4.3 — Multi-Dépôts).
// NÒT: sèvis sa a jere sèlman done depo a (kreye/modifye/dezaktive).
// Li PA touche stock — sa se travay stockService.js, ki itilize
// koleksyon "stock/{pwodwiId}__{depoId}" separeman.
// Depann de window.db, window.currentCompanyId, window.AdminService

const DepoService = (() => {

    function getBizRef() {
        if (!window.currentCompanyId) throw new Error("Pa gen biznis aktif chwazi.");
        return window.db.collection('biznis').doc(window.currentCompanyId);
    }

    // ---------- KREYE DEPO ----------

    /**
     * @param {Object} data
     *   data.non        - non depo a (egzanp: "Dépôt Principal")
     *   data.adrès      - adrès depo a
     *   data.responsab  - non moun ki responsab depo a (tèks lib pou kounye a)
     * @param {string} [idFikse] - ID manyèl opsyonèl (egzanp 'depo_principal').
     *   Si pa bay, Firestore jenere yon auto-ID nòmal.
     */
    async function createDepo(data, idFikse) {
        if (!data.non || !data.non.trim()) {
            throw new Error("Non depo a obligatwa.");
        }

        const bizRef = getBizRef();
        const depoRef = idFikse
            ? bizRef.collection('depo').doc(idFikse)
            : bizRef.collection('depo').doc();

        await depoRef.set({
            non: data.non.trim(),
            adrès: data.adrès || null,
            responsab: data.responsab || null,
            aktif: true,
            dat: firebase.firestore.FieldValue.serverTimestamp()
        });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId,
                'Depo',
                'Kreye Depo',
                '—',
                data.non.trim()
            ).catch(err => console.warn('Audit log echwe:', err));
        }

        return { id: depoRef.id };
    }

    // ---------- LI DEPO YO ----------

    async function getDepos(onlyActive = true) {
        const bizRef = getBizRef();
        let query = bizRef.collection('depo').orderBy('non', 'asc');
        if (onlyActive) {
            query = query.where('aktif', '==', true);
        }
        const snapshot = await query.get();
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    async function getDepoById(depoId) {
        const bizRef = getBizRef();
        const doc = await bizRef.collection('depo').doc(depoId).get();
        if (!doc.exists) throw new Error("Depo sa a pa egziste.");
        return { id: doc.id, ...doc.data() };
    }

    // ---------- MODIFYE DEPO ----------

    async function updateDepo(depoId, updates) {
        const bizRef = getBizRef();
        const allowedFields = ['non', 'adrès', 'responsab'];
        const cleanUpdates = {};
        allowedFields.forEach(f => {
            if (updates[f] !== undefined) cleanUpdates[f] = updates[f];
        });
        if (Object.keys(cleanUpdates).length === 0) {
            throw new Error("Pa gen chan valid pou modifye.");
        }
        await bizRef.collection('depo').doc(depoId).update(cleanUpdates);

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId,
                'Depo',
                'Modifye Depo',
                depoId,
                JSON.stringify(cleanUpdates)
            ).catch(err => console.warn('Audit log echwe:', err));
        }
    }

    // ---------- DEZAKTIVE (JAMAIS DELETE) ----------
    // NÒT: dezaktive yon depo PA transfere/efase stock ki nan li.
    // Sa se yon desizyon ki pou pran separeman lè logic transferDepo()
    // vin egziste — pa yon bagay pou dezaktivasyon senp lan fè otomatikman.

    async function deactivateDepo(depoId) {
        const bizRef = getBizRef();
        await bizRef.collection('depo').doc(depoId).update({ aktif: false });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId,
                'Depo',
                'Dezaktive Depo',
                'aktif',
                'dezaktive'
            ).catch(err => console.warn('Audit log echwe:', err));
        }
    }

    async function reactivateDepo(depoId) {
        const bizRef = getBizRef();
        await bizRef.collection('depo').doc(depoId).update({ aktif: true });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId,
                'Depo',
                'Reaktive Depo',
                'dezaktive',
                'aktif'
            ).catch(err => console.warn('Audit log echwe:', err));
        }
    }

    // ---------- API PIBLIK ----------
    return {
        createDepo,
        getDepos,
        getDepoById,
        updateDepo,
        deactivateDepo,
        reactivateDepo
    };
})();

window.DepoService = DepoService;
