// js/services/chofeSevis.js
// Sèvis pou jere Chofè yo (Modil 5 — Logistique, Transport & Distribution)
// Patwon: biznis/{bizId}/chofe/{chofeId}
// NÒT: non fichye a san aksan (ASCII-safe), aksan rete nan tèks afichaj sèlman.
// Depann de window.db, window.currentCompanyId, window.AdminService

const ChofeSevis = (() => {

    function getBizRef() {
        if (!window.currentCompanyId) throw new Error("Pa gen biznis aktif chwazi.");
        return window.db.collection('biznis').doc(window.currentCompanyId);
    }

    // ---------- KREYE ----------
    async function kreyeChofe(done) {
        if (!done.non) throw new Error('Non chofè a obligatwa.');

        const bizRef = getBizRef();
        const nouvoChofe = {
            non: done.non.trim(),
            telefon: done.telefon || '',
            nimewoLisans: done.nimewoLisans || '',
            lisansDatEkspirasyon: done.lisansDatEkspirasyon || null,
            veyikilAsiyeId: done.veyikilAsiyeId || null,
            estati: done.estati || 'Aktif',              // 'Aktif' | 'Enaktif'
            aktif: true,
            dateKreye: firebase.firestore.FieldValue.serverTimestamp()
        };

        const ref = await bizRef.collection('chofe').add(nouvoChofe);

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Chofe', 'Kreye Chofe', '—', nouvoChofe.non
            ).catch(err => console.warn('Audit log echwe:', err));
        }

        return { id: ref.id };
    }

    // ---------- LI ----------
    async function jwennTouChofe(onlyActive = true) {
        const bizRef = getBizRef();
        let query = bizRef.collection('chofe').orderBy('non', 'asc');
        if (onlyActive) query = query.where('aktif', '==', true);
        const snap = await query.get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    async function jwennChofePaId(chofeId) {
        const bizRef = getBizRef();
        const doc = await bizRef.collection('chofe').doc(chofeId).get();
        if (!doc.exists) throw new Error("Chofè sa a pa egziste.");
        return { id: doc.id, ...doc.data() };
    }

    // ---------- MODIFYE ----------
    async function modifyeChofe(chofeId, done) {
        const bizRef = getBizRef();
        const allowedFields = ['non', 'telefon', 'nimewoLisans', 'lisansDatEkspirasyon',
            'veyikilAsiyeId', 'estati'];
        const cleanUpdates = {};
        allowedFields.forEach(f => {
            if (done[f] !== undefined) cleanUpdates[f] = done[f];
        });
        if (Object.keys(cleanUpdates).length === 0) {
            throw new Error("Pa gen chan valid pou modifye.");
        }
        await bizRef.collection('chofe').doc(chofeId).update(cleanUpdates);

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Chofe', 'Modifye Chofe', chofeId, JSON.stringify(cleanUpdates)
            ).catch(err => console.warn('Audit log echwe:', err));
        }
    }

    // ---------- DEZAKTIVE (soft delete) ----------
    async function dezaktiveChofe(chofeId) {
        const bizRef = getBizRef();
        await bizRef.collection('chofe').doc(chofeId).update({
            aktif: false,
            estati: 'Enaktif'
        });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Chofe', 'Dezaktive Chofe', 'aktif', 'dezaktive'
            ).catch(err => console.warn('Audit log echwe:', err));
        }
    }

    return {
        kreyeChofe,
        jwennTouChofe,
        jwennChofePaId,
        modifyeChofe,
        dezaktiveChofe
    };
})();

window.ChofeSevis = ChofeSevis;
