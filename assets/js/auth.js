import { auth } from "./firebase.js";

import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const form = document.getElementById("loginForm");
const email = document.getElementById("email");
const password = document.getElementById("password");
const remember = document.getElementById("rememberMe");
const loginButton = document.getElementById("loginButton");
const togglePassword = document.getElementById("togglePassword");
const forgotPassword = document.getElementById("forgotPassword");
const fingerprint = document.getElementById("fingerprintLogin");

// Afficher / masquer le mot de passe
togglePassword.addEventListener("click", () => {

    if (password.type === "password") {
        password.type = "text";
        togglePassword.textContent = "🙈";
    } else {
        password.type = "password";
        togglePassword.textContent = "👁";
    }

});

// Connexion
form.addEventListener("submit", async (e) => {

    e.preventDefault();

    loginButton.disabled = true;
    loginButton.textContent = "Connexion...";

    try {

        await setPersistence(
            auth,
            remember.checked
                ? browserLocalPersistence
                : browserSessionPersistence
        );

        await signInWithEmailAndPassword(
            auth,
            email.value.trim(),
            password.value
        );

        alert("Connexion réussie.");

        window.location.href = "dashboard.html";

    } catch (error) {

        switch (error.code) {

            case "auth/invalid-email":
                alert("Adresse e-mail invalide.");
                break;

            case "auth/user-not-found":
                alert("Utilisateur introuvable.");
                break;

            case "auth/wrong-password":
                alert("Mot de passe incorrect.");
                break;

            case "auth/invalid-credential":
                alert("Adresse e-mail ou mot de passe incorrect.");
                break;

            case "auth/too-many-requests":
                alert("Trop de tentatives. Réessayez plus tard.");
                break;

            default:
                alert(error.message);

        }

    }

    loginButton.disabled = false;
    loginButton.textContent = "Se connecter";

});

// Mot de passe oublié
forgotPassword.addEventListener("click", async (e) => {

    e.preventDefault();

    if (email.value.trim() === "") {
        alert("Entrez votre adresse e-mail.");
        return;
    }

    try {

        await sendPasswordResetEmail(auth, email.value.trim());

        alert("Un e-mail de réinitialisation a été envoyé.");

    } catch (error) {

        alert(error.message);

    }

});

// Empreinte
fingerprint.addEventListener("click", () => {

    alert("Connexion par empreinte bientôt disponible.");

});
