// js/services/marketingService.js
// Depann de window.db, window.currentCompanyId, window.AdminService, window.CustomersService

const MarketingService = (() => {

    function getBizRef() {
        if (!window.currentCompanyId) throw new Error("Pa gen biznis aktif chwazi.");
        return window.db.collection('biznis').doc(window.currentCompanyId);
    }

    const KANAL_VALID = ['email', 'sms', 'whatsapp', 'rezo_sosyal'];

    /**
     * Kreye yon kanpay maketing. Sa a se anrejistreman/planifikasyon —
     * anvwa reyèl la (Email/SMS/WhatsApp API) mande entegrasyon tyès pati
     * apa (pa gen nan Firestore sèlman).
     *
     * @param {Object} data
     *   data.non          - non kanpay la
     *   data.kanal         - youn nan KANAL_VALID
     *   data.mesaj         - kontni mesaj la
     *   data.sègman        - 'tout' | 'vip' | 'dèt' | 'nouvo' (segman kliyan)
     *   data.dateEnvwa     - ISO date string, oswa null pou imedya
     */
    async function createCampaign(data) {
        if (!data.non || !data.non.trim()) throw new Error("Non kanpay la obligatwa.");
        if (!KANAL_VALID.includes(data.kanal)) throw new Error("Kanal pa valid.");
        if (!data.mesaj || !data.mesaj.trim()) throw new Error("Mesaj la obligatwa.");

        const bizRef = getBizRef();
        const kanpayRef = bizRef.collection('kanpay_maketing').doc();

        await kanpayRef.set({
            non: data.non.trim(),
            kanal: data.kanal,
            mesaj: data.mesaj.trim(),
            sègman: data.sègman || 'tout',
            estati: data.dateEnvwa ? 'planifye' : 'brouillon',
            dateEnvwa: data.dateEnvwa ? firebase.firestore.Timestamp.fromDate(new Date(data.dateEnvwa)) : null,
            nòmbDestinatè: 0,
            dat: firebase.firestore.FieldValue.serverTimestamp()
        });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Ventes', 'Kreye Kanpay Maketing', '—',
                `${data.non.trim()} (${data.kanal})`
            ).catch(err => console.warn('Audit log echwe:', err));
        }

        return { id: kanpayRef.id };
    }

    async function getCampaigns(limitCount = 50) {
        const bizRef = getBizRef();
        const snapshot = await bizRef.collection('kanpay_maketing')
            .orderBy('dat', 'desc').limit(limitCount).get();
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    // ---------- KALKILE DESTINATÈ SELON SÈGMAN (sèvi ak CustomersService) ----------

    async function getRecipientsForSegment(sègman) {
        const toutKliyan = await window.CustomersService.getCustomers(true);

        switch (sègman) {
            case 'vip':
                return toutKliyan.filter(k => k.kategori === 'VIP');
            case 'dèt':
                return toutKliyan.filter(k => (k.dèt || 0) > 0);
            case 'nouvo': {
                const trantJouPase = new Date();
                trantJouPase.setDate(trantJouPase.getDate() - 30);
                return toutKliyan.filter(k => k.dat?.toDate && k.dat.toDate() >= trantJouPase);
            }
            default:
                return toutKliyan;
        }
    }

    // ---------- MAKE KANPAY LA KÒM VOYE (apre entegrasyon tyès pati konfime anvwa) ----------

    async function markCampaignSent(campaignId, nòmbDestinatè) {
        const bizRef = getBizRef();
        await bizRef.collection('kanpay_maketing').doc(campaignId).update({
            estati: 'voye',
            nòmbDestinatè: nòmbDestinatè || 0,
            dateVoyeReyèl: firebase.firestore.FieldValue.serverTimestamp()
        });

        if (window.AdminService?.anrejistreLog) {
            window.AdminService.anrejistreLog(
                window.currentCompanyId, 'Ventes', 'Voye Kanpay Maketing', campaignId,
                `${nòmbDestinatè} destinatè`
            ).catch(err => console.warn('Audit log echwe:', err));
        }
    }

    return {
        KANAL_VALID,
        createCampaign, getCampaigns,
        getRecipientsForSegment, markCampaignSent
    };
})();

window.MarketingService = MarketingService;
