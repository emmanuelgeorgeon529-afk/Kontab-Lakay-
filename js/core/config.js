// js/core/config.js
// SÈL fichye ki inisyalize Firebase epi kreye window.db ak window.auth.
// Okenn lòt fichye pa dwe fè "const db = firebase.firestore()" ankò.

(function () {
    const firebaseConfig = {
        apiKey: "REMPLASE_AK_KLE_OU",
        authDomain: "REMPLASE.firebaseapp.com",
        projectId: "REMPLASE",
        storageBucket: "REMPLASE.appspot.com",
        messagingSenderId: "REMPLASE",
        appId: "REMPLASE"
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    window.db = firebase.firestore();
    window.auth = firebase.auth();

    console.log('✅ config.js: window.db ak window.auth pare.');
})();
