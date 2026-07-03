document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("loginForm");

    form.addEventListener("submit", function(e){

        e.preventDefault();

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        if(email === "" || password === ""){
            alert("Ranpli tout chan yo.");
            return;
        }

        alert("Login OK !");
        window.location.href = "dashboard.html";

    });

});
