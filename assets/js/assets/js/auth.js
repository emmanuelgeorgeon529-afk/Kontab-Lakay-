// ==========================
// AUTH.JS
// ==========================

function login(){

    const email=document.getElementById("email").value.trim();

    const password=document.getElementById("password").value.trim();

    if(email==="" || password===""){

        toast("Veuillez remplir tous les champs.");

        return;

    }

    toast("Connexion réussie.");

}
