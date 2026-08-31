// js/services/customerAuthService.js
// Otantifikasyon kliyan (self-service), separe de kont anplwaye (AdminService).
// Yon kliyan gen yon fich diferan pou chak biznis li patwone (multi-tenant).

const CustomerAuthService = (() => {

    function getBizRef() {
        if (!window.currentCompanyId) throw new Error("Pa gen biznis aktif chwazi.");
        return window.db.collection('biznis').doc(window.currentCompanyId);
    }

    /** Kreye kont Firebase Auth + fich kliyan lye a, pou biznis kouran an. */
    async function enskri({ imèl, motDPas, non, telefòn }) {
        const cred = await window.auth.createUserWithEmailAndPassword(imèl, motDPas);
        const bizRef = getBizRef();
        const kliyanRef = bizRef.collection('kliyan').doc();

        await kliyanRef.set({
            non: non || 'Kliyan',
            imèl,
            telefòn: telefòn || '',
            adrès: '',
            authUid: cred.user.uid,
            dèt: 0,
            limitKredi: 0,
            kategori: 'Particulier',
            aktif: true,
            dat: firebase.firestore.FieldValue.serverTimestamp()
        });

        return { uid: cred.user.uid, kliyanId: kliyanRef.id };
    }

    async function konekte(imèl, motDPas) {
        const cred = await window.auth.signInWithEmailAndPassword(imèl, motDPas);
        return cred.user;
    }

    async function dekonekte() {
        await window.auth.signOut();
    }

    /** Jwenn fich kliyan lye ak kont Auth aktyèl la, pou biznis kouran an. */
    async function getMwenMenmKliyan() {
        const uid = window.auth?.currentUser?.uid;
        if (!uid) return null;
        const bizRef = getBizRef();
        const snapshot = await bizRef.collection('kliyan')
            .where('authUid', '==', uid).limit(1).get();
        if (snapshot.empty) return null;
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    }

    async function modifyeMwenMenmKliyan(kliyanId, updates) {
        const bizRef = getBizRef();
        const allowedFields = ['non', 'telefòn', 'adrès', 'imèl'];
        const cleanUpdates = {};
        allowedFields.forEach(f => { if (updates[f] !== undefined) cleanUpdates[f] = updates[f]; });
        await bizRef.collection('kliyan').doc(kliyanId).update(cleanUpdates);
    }

    async function getMwenMenmKòmand(kliyanAuthUid) {
        const bizRef = getBizRef();
        const snapshot = await bizRef.collection('commande')
            .where('kliyanAuthUid', '==', kliyanAuthUid)
            .orderBy('dat', 'desc').limit(50).get();
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    return { enskri, konekte, dekonekte, getMwenMenmKliyan, modifyeMwenMenmKliyan, getMwenMenmKòmand };
})();

window.CustomerAuthService = CustomerAuthService;
