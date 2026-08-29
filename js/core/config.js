// js/core/config.js
(function () {
    const firebaseConfig = {
        apiKey: "AIzaSyCloroCtw8hrdVQH-Cj1aIbJpb-HG5UhMI",
        authDomain: "kontab-lakay-5b169.firebaseapp.com",
        databaseURL: "https://kontab-lakay-5b169-default-rtdb.firebaseio.com",
        projectId: "kontab-lakay-5b169",
        storageBucket: "kontab-lakay-5b169.firebasestorage.app",
        messagingSenderId: "221994063902",
        appId: "1:221994063902:web:5248558df3775341d6f60f",
        measurementId: "G-CXH1G88X4D"
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    window.db = firebase.firestore();
    window.auth = firebase.auth();
    window.storage = firebase.storage(); // AJOUTE — nesesè pou Modil 8 (GED, upload/download dokiman)

    // Multi-Dépôt: ID fikse pou depo default la (kreye manyèlman nan
    // Firebase Console — biznis/{bizId}/depo/depo_principal).
    // Tout sèvis (Vant, Acha, Ajistman, SAV) referanse MENM konstan sa a.
    window.DEPO_PRINCIPAL_ID = 'depo_principal';

    console.log('config.js: window.db, window.auth ak window.storage pare.');
})();
