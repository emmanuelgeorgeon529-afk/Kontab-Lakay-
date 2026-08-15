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

    console.log('config.js: window.db ak window.auth pare.');
})();
