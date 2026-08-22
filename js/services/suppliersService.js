// js/services/suppliersService.js
// NÒT: koleksyon "founise" (san aksan) pou matche firestore.rules ak purchasesService.js
const SuppliersService = (() => {

    function getBizRef() {
        if (!window.currentCompanyId) throw new Error("Pa gen biznis aktif chwazi.");
        return window.db.collection('biznis').doc(window.currentCompanyId);
    }

    async function createSupplier(data) {
        if (!data.non || !data.non.trim()) {
            throw new Error("Non founisè a obligatwa.");
        }
        const bizRef = getBizRef();
        const founiseRef = bizRef.collection('founise').doc();
        await founiseRef.set({
            non: data.non.trim(),
            telefòn: data.telefòn || null,
            imèl: data.imèl || null,
            adrès: data.adrès || null,
            aktif: true,
            dèt: 0,
            dat: firebase.firestore.FieldValue.serverTimestamp()
        });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Founise', 'Kreye Founise', '—', data.non.trim()
            ).catch(err => console.warn('Audit log echwe:', err));
        }

        return { id: founiseRef.id };
    }

    async function getSuppliers(onlyActive = true) {
        const bizRef = getBizRef();
        let query = bizRef.collection('founise').orderBy('non', 'asc');
        if (onlyActive) query = query.where('aktif', '==', true);
        const snapshot = await query.get();
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    async function getSupplierById(supplierId) {
        const bizRef = getBizRef();
        const doc = await bizRef.collection('founise').doc(supplierId).get();
        if (!doc.exists) throw new Error("Founisè sa a pa egziste.");
        return { id: doc.id, ...doc.data() };
    }

    async function updateSupplier(supplierId, updates) {
        const bizRef = getBizRef();
        const allowedFields = ['non', 'telefòn', 'imèl', 'adrès'];
        const cleanUpdates = {};
        allowedFields.forEach(f => {
            if (updates[f] !== undefined) cleanUpdates[f] = updates[f];
        });
        if (Object.keys(cleanUpdates).length === 0) {
            throw new Error("Pa gen chan valid pou modifye.");
        }
        await bizRef.collection('founise').doc(supplierId).update(cleanUpdates);

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Founise', 'Modifye Founise', supplierId, JSON.stringify(cleanUpdates)
            ).catch(err => console.warn('Audit log echwe:', err));
        }
    }

    // Peman nou fè bay founisè a (diminye dèt nou dwe l)
    async function recordSupplierPayment(supplierId, montan, mòdPeman) {
        if (!montan || montan <= 0) {
            throw new Error("Montan peman an dwe pi gran pase 0.");
        }
        const bizRef = getBizRef();

        const rezilta = await window.db.runTransaction(async (transaction) => {
            const founiseRef = bizRef.collection('founise').doc(supplierId);
            const founiseDoc = await transaction.get(founiseRef);
            if (!founiseDoc.exists) throw new Error("Founisè sa a pa egziste.");

            const dètAktyèl = founiseDoc.data().dèt || 0;
            const nouvoDèt = Math.max(0, dètAktyèl - montan);

            transaction.update(founiseRef, { dèt: nouvoDèt });

            const journalRef = bizRef.collection('jounal').doc();
            const kontCredit = mòdPeman === 'transfè' ? '1020' : '1010';
            transaction.set(journalRef, {
                dat: firebase.firestore.FieldValue.serverTimestamp(),
                liy: [
                    { kont: '2010', débit: montan, crédit: 0 },
                    { kont: kontCredit, débit: 0, crédit: montan }
                ],
                referans: supplierId,
                sous: 'peman_founise'
            });

            const pemanRef = bizRef.collection('peman_founise').doc();
            transaction.set(pemanRef, {
                founiseId: supplierId,
                founiseNon: founiseDoc.data().non,
                montan, mòdPeman,
                dètAvan: dètAktyèl,
                dètApre: nouvoDèt,
                dat: firebase.firestore.FieldValue.serverTimestamp()
            });

            return { dètAvan: dètAktyèl, dètApre: nouvoDèt, founiseNon: founiseDoc.data().non };
        });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Founise', 'Peman Founise',
                `${rezilta.founiseNon} — dèt ${rezilta.dètAvan.toLocaleString()} HTG`,
                `dèt ${rezilta.dètApre.toLocaleString()} HTG (peye ${montan.toLocaleString()} HTG, ${mòdPeman})`
            ).catch(err => console.warn('Audit log echwe:', err));
        }

        return { dètAvan: rezilta.dètAvan, dètApre: rezilta.dètApre };
    }

    async function deactivateSupplier(supplierId) {
        const bizRef = getBizRef();
        await bizRef.collection('founise').doc(supplierId).update({ aktif: false });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Founise', 'Dezaktive Founise', 'aktif', 'dezaktive'
            ).catch(err => console.warn('Audit log echwe:', err));
        }
    }

    async function reactivateSupplier(supplierId) {
        const bizRef = getBizRef();
        await bizRef.collection('founise').doc(supplierId).update({ aktif: true });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Founise', 'Reaktive Founise', 'dezaktive', 'aktif'
            ).catch(err => console.warn('Audit log echwe:', err));
        }
    }

    async function getSuppliersWithDebt() {
        const bizRef = getBizRef();
        const snapshot = await bizRef.collection('founise')
            .where('dèt', '>', 0)
            .orderBy('dèt', 'desc')
            .get();
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    return {
        createSupplier, getSuppliers, getSupplierById, updateSupplier,
        recordSupplierPayment, deactivateSupplier, reactivateSupplier,
        getSuppliersWithDebt
    };
})();
window.SuppliersService = SuppliersService;
