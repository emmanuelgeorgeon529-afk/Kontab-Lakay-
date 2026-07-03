import { auth } from "./firebase.js";

import {
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const form = document.getElementById("loginForm");

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {

        document.querySelector(".btn-login").textContent = "Connexion...";

        await signInWithEmailAndPassword(auth, email, password);

        alert("Connexion réussie !");

        window.location.href = "dashboard.html";

    } catch (error) {

        switch(error.code){

            case "auth/user-not-found":
                alert("Aucun compte trouvé.");
                break;

            case "auth/wrong-password":
                alert("Mot de passe incorrect.");
                break;

            case "auth/invalid-email":
                alert("Adresse e-mail invalide.");
                break;

            default:
                alert(error.message);

        }

    }

    document.querySelector(".btn-login").textContent="Se connecter";

});
