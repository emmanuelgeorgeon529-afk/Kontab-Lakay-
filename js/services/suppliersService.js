// js/services/suppliersService.js
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
        const founisèRef = bizRef.collection('founisè').doc();
        await founisèRef.set({
            non: data.non.trim(),
            telefòn: data.telefòn || null,
            imèl: data.imèl || null,
            adrès: data.adrès || null,
            aktif: true,
            dèt: 0,
            dat: firebase.firestore.FieldValue.serverTimestamp()
        });
        return { id: founisèRef.id };
    }

    async function getSuppliers(onlyActive = true) {
        const bizRef = getBizRef();
        let query = bizRef.collection('founisè').orderBy('non', 'asc');
        if (onlyActive) query = query.where('aktif', '==', true);
        const snapshot = await query.get();
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    async function getSupplierById(supplierId) {
        const bizRef = getBizRef();
        const doc = await bizRef.collection('founisè').doc(supplierId).get();
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
        await bizRef.collection('founisè').doc(supplierId).update(cleanUpdates);
    }

    // Peman nou fè bay founisè a (diminye dèt nou dwe l)
    async function recordSupplierPayment(supplierId, montan, mòdPeman) {
        if (!montan || montan <= 0) {
            throw new Error("Montan peman an dwe pi gran pase 0.");
        }
        const bizRef = getBizRef();

        return window.db.runTransaction(async (transaction) => {
            const founisèRef = bizRef.collection('founisè').doc(supplierId);
            const founisèDoc = await transaction.get(founisèRef);
            if (!founisèDoc.exists) throw new Error("Founisè sa a pa egziste.");

            const dètAktyèl = founisèDoc.data().dèt || 0;
            const nouvoDèt = Math.max(0, dètAktyèl - montan);

            transaction.update(founisèRef, { dèt: nouvoDèt });

            const journalRef = bizRef.collection('jounal').doc();
            const kontCredit = mòdPeman === 'transfè' ? '1020' : '1010';
            transaction.set(journalRef, {
                dat: firebase.firestore.FieldValue.serverTimestamp(),
                liy: [
                    { kont: '2010', débit: montan, crédit: 0 },
                    { kont: kontCredit, débit: 0, crédit: montan }
                ],
                referans: supplierId,
                sous: 'peman_founisè'
            });

            const pemanRef = bizRef.collection('peman_founisè').doc();
            transaction.set(pemanRef, {
                founisèId: supplierId,
                founisèNon: founisèDoc.data().non,
                montan, mòdPeman,
                dètAvan: dètAktyèl,
                dètApre: nouvoDèt,
                dat: firebase.firestore.FieldValue.serverTimestamp()
            });

            return { dètAvan: dètAktyèl, dètApre: nouvoDèt };
        });
    }

    async function deactivateSupplier(supplierId) {
        const bizRef = getBizRef();
        await bizRef.collection('founisè').doc(supplierId).update({ aktif: false });
    }

    async function reactivateSupplier(supplierId) {
        const bizRef = getBizRef();
        await bizRef.collection('founisè').doc(supplierId).update({ aktif: true });
    }

    async function getSuppliersWithDebt() {
        const bizRef = getBizRef();
        const snapshot = await bizRef.collection('founisè')
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
