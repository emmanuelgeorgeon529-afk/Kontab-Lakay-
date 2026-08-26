// js/services/veyikilSevis.js
// Sèvis pou jere Flòt Veyikil (Modil 5 — Logistique, Transport & Distribution)
// Patwon: biznis/{bizId}/veyikil/{veyikilId}
// Depann de window.db, window.currentCompanyId, window.AdminService

const VeyikilSevis = (() => {

    function getBizRef() {
        if (!window.currentCompanyId) throw new Error("Pa gen biznis aktif chwazi.");
        return window.db.collection('biznis').doc(window.currentCompanyId);
    }

    // ---------- KREYE ----------
    async function kreyeVeyikil(done) {
        if (!done.plak) throw new Error('Plak veyikil la obligatwa.');

        const bizRef = getBizRef();
        const nouvoVeyikil = {
            plak: done.plak.trim().toUpperCase(),
            mak: done.mak || '',
            modelVeyikil: done.modelVeyikil || '',
            ane: done.ane || null,
            kilometraj: Number(done.kilometraj) || 0,
            estati: done.estati || 'Aktif',              // 'Aktif' | 'Antretyen' | 'Enaktif'
            asiransDatEkspirasyon: done.asiransDatEkspirasyon || null,
            antretyenPwochenDat: done.antretyenPwochenDat || null,
            depoAsiyeId: done.depoAsiyeId || null,
            aktif: true,
            dateKreye: firebase.firestore.FieldValue.serverTimestamp()
        };

        const ref = await bizRef.collection('veyikil').add(nouvoVeyikil);

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Veyikil', 'Kreye Veyikil', '—', nouvoVeyikil.plak
            ).catch(err => console.warn('Audit log echwe:', err));
        }

        return { id: ref.id };
    }

    // ---------- LI ----------
    async function jwennTouVeyikil(onlyActive = true) {
        const bizRef = getBizRef();
        let query = bizRef.collection('veyikil').orderBy('plak', 'asc');
        if (onlyActive) query = query.where('aktif', '==', true);
        const snap = await query.get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    async function jwennVeyikilPaId(veyikilId) {
        const bizRef = getBizRef();
        const doc = await bizRef.collection('veyikil').doc(veyikilId).get();
        if (!doc.exists) throw new Error("Veyikil sa a pa egziste.");
        return { id: doc.id, ...doc.data() };
    }

    // ---------- MODIFYE ----------
    async function modifyeVeyikil(veyikilId, done) {
        const bizRef = getBizRef();
        const allowedFields = ['plak', 'mak', 'modelVeyikil', 'ane', 'kilometraj',
            'estati', 'asiransDatEkspirasyon', 'antretyenPwochenDat', 'depoAsiyeId'];
        const cleanUpdates = {};
        allowedFields.forEach(f => {
            if (done[f] !== undefined) cleanUpdates[f] = done[f];
        });
        if (Object.keys(cleanUpdates).length === 0) {
            throw new Error("Pa gen chan valid pou modifye.");
        }
        await bizRef.collection('veyikil').doc(veyikilId).update(cleanUpdates);

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Veyikil', 'Modifye Veyikil', veyikilId, JSON.stringify(cleanUpdates)
            ).catch(err => console.warn('Audit log echwe:', err));
        }
    }

    // ---------- DEZAKTIVE (soft delete) ----------
    async function dezaktiveVeyikil(veyikilId) {
        const bizRef = getBizRef();
        await bizRef.collection('veyikil').doc(veyikilId).update({
            aktif: false,
            estati: 'Enaktif'
        });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Veyikil', 'Dezaktive Veyikil', 'aktif', 'dezaktive'
            ).catch(err => console.warn('Audit log echwe:', err));
        }
    }

    return {
        kreyeVeyikil,
        jwennTouVeyikil,
        jwennVeyikilPaId,
        modifyeVeyikil,
        dezaktiveVeyikil
    };
})();

window.VeyikilSevis = VeyikilSevis;
