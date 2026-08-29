// js/services/gedService.js
// Sèvis pou Modil 8 — GED, Archivage & Gestion Documentaire
// Depann de window.db, window.storage, window.currentCompanyId, window.AdminService

const GedService = (() => {

    const KATEGORI_VALID = ['Fakti', 'Devis', 'Kontra', 'RH', 'Finans', 'Logistique', 'Production', 'Juridique', 'Divers'];
    const KONFIDANSYALITE_VALID = ['Public', 'Interne', 'Confidentiel', 'Strictement Confidentiel'];
    const ETAP_SIYATI = ['creation', 'validation', 'signature', 'archivage'];
    const TAG_FISKAL_VALID = ['TVA', 'TCA', 'Déclarations Fiscales', 'États Financiers', 'Audit'];

    function getBizRef() {
        if (!window.currentCompanyId) throw new Error("Pa gen biznis aktif chwazi.");
        return window.db.collection('biznis').doc(window.currentCompanyId);
    }

    // ---------- 8.3 — UPLOAD DOKIMAN ----------

    /**
     * @param {File} file - fichye HTML File object (soti nan <input type="file">)
     * @param {Object} meta - { tit, kategori, konfidansyalite, dateEkspirasyon }
     */
    async function uploadDokiman(file, meta) {
        if (!file) throw new Error("Chwazi yon fichye anvan.");
        if (file.size >= 15 * 1024 * 1024) {
            throw new Error('Fichye a twò gwo (limit: 15 MB).');
        }
        if (!meta?.tit?.trim()) throw new Error("Tit dokiman an obligatwa.");
        if (!KATEGORI_VALID.includes(meta.kategori)) throw new Error("Kategori pa valid.");

        const bizRef = getBizRef();
        const dokimanRef = bizRef.collection('dokiman').doc();
        const nonSekirize = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `biznis/${window.currentCompanyId}/documents/${dokimanRef.id}_v1_${nonSekirize}`;
        const storageRef = window.storage.ref(storagePath);

        await storageRef.put(file);
        const downloadURL = await storageRef.getDownloadURL();

        await dokimanRef.set({
            tit: meta.tit.trim(),
            kategori: meta.kategori,
            konfidansyalite: meta.konfidansyalite || 'Interne',
            vèsyonAktyèl: 1,
            storagePath, downloadURL,
            size: file.size,
            tipFichye: file.type || file.name.split('.').pop(),
            responsabId: window.auth?.currentUser?.uid || null,
            responsabNon: window.auth?.currentUser?.displayName || 'Sistèm',
            dateEkspirasyon: meta.dateEkspirasyon || null,
            etapSiyati: 'creation',
            tagFiskal: [],
            estati: 'aktif',
            dat: firebase.firestore.FieldValue.serverTimestamp(),
            dateModifikasyon: firebase.firestore.FieldValue.serverTimestamp()
        });

        await dokimanRef.collection('vèsyon').doc('v1').set({
            nimewo: 1, storagePath, downloadURL, size: file.size,
            modifyePa: window.auth?.currentUser?.displayName || 'Sistèm',
            dat: firebase.firestore.FieldValue.serverTimestamp()
        });

        await window.AdminService?.anrejistreLog(window.currentCompanyId, 'GED', 'Upload Dokiman', '—', meta.tit.trim());
        return { id: dokimanRef.id, downloadURL };
    }

    // ---------- 8.2 — BIBLIYOTÈK ----------

    async function getDokiman(onlyActive = true) {
        const bizRef = getBizRef();
        let query = bizRef.collection('dokiman').orderBy('dat', 'desc');
        if (onlyActive) query = query.where('estati', '==', 'aktif');
        const snap = await query.get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    function abònmanDokiman(callback) {
        return getBizRef().collection('dokiman')
            .orderBy('dat', 'desc')
            .onSnapshot(snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    }

    async function getDokimanById(dokimanId) {
        const doc = await getBizRef().collection('dokiman').doc(dokimanId).get();
        if (!doc.exists) throw new Error("Dokiman sa a pa egziste.");
        return { id: doc.id, ...doc.data() };
    }

    // ---------- 8.5 — VERSIONING ----------

    async function uploadNouvoVèsyon(dokimanId, file) {
        if (!file) throw new Error("Chwazi yon fichye.");
        if (file.size >= 15 * 1024 * 1024) {
            throw new Error('Fichye a twò gwo (limit: 15 MB).');
        }
        const bizRef = getBizRef();
        const dokimanRef = bizRef.collection('dokiman').doc(dokimanId);
        const dokimanSnap = await dokimanRef.get();
        if (!dokimanSnap.exists) throw new Error("Dokiman pa jwenn.");

        const nouvoNimewo = (dokimanSnap.data().vèsyonAktyèl || 1) + 1;
        const nonSekirize = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `biznis/${window.currentCompanyId}/documents/${dokimanId}_v${nouvoNimewo}_${nonSekirize}`;
        const storageRef = window.storage.ref(storagePath);
        await storageRef.put(file);
        const downloadURL = await storageRef.getDownloadURL();

        await dokimanRef.collection('vèsyon').doc('v' + nouvoNimewo).set({
            nimewo: nouvoNimewo, storagePath, downloadURL, size: file.size,
            modifyePa: window.auth?.currentUser?.displayName || 'Sistèm',
            dat: firebase.firestore.FieldValue.serverTimestamp()
        });

        await dokimanRef.update({
            vèsyonAktyèl: nouvoNimewo, storagePath, downloadURL, size: file.size,
            dateModifikasyon: firebase.firestore.FieldValue.serverTimestamp()
        });

        await window.AdminService?.anrejistreLog(window.currentCompanyId, 'GED', 'Nouvo Vèsyon Dokiman', 'v' + (nouvoNimewo - 1), 'v' + nouvoNimewo);
    }

    async function getVèsyonIstorik(dokimanId) {
        const snap = await getBizRef().collection('dokiman').doc(dokimanId)
            .collection('vèsyon').orderBy('nimewo', 'desc').get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    async function retabliVèsyon(dokimanId, vèsyonNimewo) {
        const bizRef = getBizRef();
        const vèsyonSnap = await bizRef.collection('dokiman').doc(dokimanId)
            .collection('vèsyon').doc('v' + vèsyonNimewo).get();
        if (!vèsyonSnap.exists) throw new Error("Vèsyon sa a pa jwenn.");
        const v = vèsyonSnap.data();

        await bizRef.collection('dokiman').doc(dokimanId).update({
            storagePath: v.storagePath, downloadURL: v.downloadURL, size: v.size,
            vèsyonAktyèl: v.nimewo,
            dateModifikasyon: firebase.firestore.FieldValue.serverTimestamp()
        });
        await window.AdminService?.anrejistreLog(window.currentCompanyId, 'GED', 'Retabli Vèsyon', '—', 'v' + vèsyonNimewo);
    }

    // ---------- 8.6 — NIVO AKSÈ (reyitilize konfidansyalite ki deja egziste) ----------

    async function konteDokimanPaKonfidansyalite() {
        const lis = await getDokiman(true);
        const konte = {};
        KONFIDANSYALITE_VALID.forEach(k => konte[k] = 0);
        lis.forEach(d => { if (konte[d.konfidansyalite] !== undefined) konte[d.konfidansyalite]++; });
        return konte;
    }

    // ---------- 8.7 — SIGNATURE ÉLECTRONIQUE ----------

    async function avanseEtapSiyati(dokimanId) {
        const ref = getBizRef().collection('dokiman').doc(dokimanId);
        const snap = await ref.get();
        if (!snap.exists) throw new Error('Dokiman pa jwenn.');

        const etapAktyèl = snap.data().etapSiyati || 'creation';
        const idx = ETAP_SIYATI.indexOf(etapAktyèl);
        if (idx === -1 || idx === ETAP_SIYATI.length - 1) {
            throw new Error('Dokiman sa a deja rive nan dènye etap la.');
        }
        const pwochenEtap = ETAP_SIYATI[idx + 1];

        await ref.update({ etapSiyati: pwochenEtap, dateModifikasyon: firebase.firestore.FieldValue.serverTimestamp() });
        await window.AdminService?.anrejistreLog(window.currentCompanyId, 'GED', 'Avanse Etap Siyati', etapAktyèl, pwochenEtap);
        return pwochenEtap;
    }

    // ---------- 8.9 — ARCHIVAGE AUTOMATIQUE ----------

    async function archiveDokimanPaAne(ane) {
        const bizRef = getBizRef();
        const debiAne = new Date(ane, 0, 1);
        const finAne = new Date(ane, 11, 31, 23, 59, 59);

        const snap = await bizRef.collection('dokiman').where('estati', '==', 'aktif').get();
        const aArchive = snap.docs.filter(d => {
            const dat = d.data().dat?.toDate?.();
            return dat && dat >= debiAne && dat <= finAne;
        });
        if (aArchive.length === 0) return 0;

        const batch = window.db.batch();
        aArchive.forEach(d => {
            batch.update(d.ref, {
                estati: 'achive', etapSiyati: 'archivage',
                dateArchivage: firebase.firestore.FieldValue.serverTimestamp()
            });
        });
        await batch.commit();

        await window.AdminService?.anrejistreLog(window.currentCompanyId, 'GED', 'Archivage Otomatik', `Egzèsis ${ane}`, `${aArchive.length} dokiman achive`);
        return aArchive.length;
    }

    // ---------- 8.10 — ARCHIVAGE FISCAL (tag sou dokiman ki egziste yo) ----------

    async function tagDokimanFiskal(dokimanId, tag) {
        if (!TAG_FISKAL_VALID.includes(tag)) throw new Error('Tag fiskal pa valid.');
        await getBizRef().collection('dokiman').doc(dokimanId)
            .update({ tagFiskal: firebase.firestore.FieldValue.arrayUnion(tag) });
        await window.AdminService?.anrejistreLog(window.currentCompanyId, 'GED', 'Tag Fiskal', '—', tag);
    }

    async function getDokimanPaTagFiskal(tag) {
        const lis = await getDokiman(true);
        return lis.filter(d => (d.tagFiskal || []).includes(tag));
    }

    // ---------- 8.11 — LIAISON AUTOMATIQUE ERP (mapping enfòmatif) ----------

    const LIAISON_ERP = [
        { kategori: 'Fakti', modil: 'Finance' },
        { kategori: 'Devis', modil: 'Ventes' },
        { kategori: 'Kontra', modil: 'RH / Juridique' },
        { kategori: 'RH', modil: 'RH' },
        { kategori: 'Logistique', modil: 'Logistique' }
    ];

    // ---------- 8.12 — ALERTES DOCUMENTAIRES (baze sou dateEkspirasyon reyèl) ----------

    async function getAlètDokiman() {
        const lis = await getDokiman(true);
        const jodia = Date.now();
        const jou = 24 * 60 * 60 * 1000;

        return lis
            .filter(d => d.dateEkspirasyon)
            .map(d => {
                const ekspDat = new Date(d.dateEkspirasyon).getTime();
                const joursRestan = Math.ceil((ekspDat - jodia) / jou);
                return { ...d, joursRestan };
            })
            .filter(d => d.joursRestan <= 30 && d.joursRestan >= 0)
            .sort((a, b) => a.joursRestan - b.joursRestan);
    }

    // ---------- 8.13 — AUDIT TRAIL (filtre AdminService.abònmanAuditLog sou modil='GED') ----------

    function abònmanAuditGed(callback, limit = 30) {
        return window.AdminService.abònmanAuditLog(window.currentCompanyId, (lis) => {
            callback(lis.filter(l => l.modil === 'GED').slice(0, limit));
        }, 200);
    }

    // ---------- 8.14 — RAPÒ GED ----------

    async function getRapòPaKategori() {
        const lis = await getDokiman(true);
        const konte = {};
        lis.forEach(d => { konte[d.kategori] = (konte[d.kategori] || 0) + 1; });
        return Object.entries(konte).map(([kategori, kantite]) => ({ kategori, kantite }));
    }

    async function getRapòKontraAktif() {
        const lis = await getDokiman(true);
        return lis.filter(d => d.kategori === 'Kontra');
    }

    // ---------- API PIBLIK ----------
    return {
        KATEGORI_VALID, KONFIDANSYALITE_VALID, ETAP_SIYATI, TAG_FISKAL_VALID,
        uploadDokiman, getDokiman, abònmanDokiman, getDokimanById,
        uploadNouvoVèsyon, getVèsyonIstorik, retabliVèsyon,
        konteDokimanPaKonfidansyalite,
        avanseEtapSiyati,
        archiveDokimanPaAne,
        tagDokimanFiskal, getDokimanPaTagFiskal,
        LIAISON_ERP,
        getAlètDokiman,
        abònmanAuditGed,
        getRapòPaKategori, getRapòKontraAktif
    };
})();

window.GedService = GedService;
