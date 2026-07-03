// =============================
// KONTAPRO AUTH.JS
// =============================

document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("loginForm");
    const toggle = document.getElementById("togglePassword");
    const password = document.getElementById("password");
    const fingerprint = document.getElementById("fingerprintLogin");

    // Montrer / Cacher le mot de passe
    if (toggle) {
        toggle.addEventListener("click", () => {
            if (password.type === "password") {
                password.type = "text";
                toggle.textContent = "🙈";
            } else {
                password.type = "password";
                toggle.textContent = "👁";
            }
        });
    }

    // Connexion
    if (form) {
        form.addEventListener("submit", function (e) {

            e.preventDefault();

            const gmail = document.getElementById("gmail").value.trim();
            const pass = document.getElementById("password").value.trim();

            if (gmail === "" || pass === "") {
                alert("Veuillez remplir tous les champs.");
                return;
            }

        console.log(gmail);

alert("Connexion réussie !");
            

            alert("Connexion réussie !");
            // Plus tard :
            // window.location.href="dashboard.html";

        });
    }

    // Empreinte
    if (fingerprint) {

        fingerprint.addEventListener("click", () => {

            alert("Connexion par empreinte disponible dans une prochaine version.");

        });

    }

});

// Mot de passe oublié
document.getElementById("forgotPassword")?.addEventListener("click", function(e){

    e.preventDefault();

    alert("La récupération du mot de passe sera disponible prochainement.");

});
