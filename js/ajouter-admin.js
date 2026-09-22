/**
 * Le Baron — ajouter-admin.html.
 *
 * Pas de connexion requise, pas de verrou "usage unique" : cette page
 * reste utilisable tant qu'elle existe dans le dossier. C'est
 * volontairement laissé à la charge de la personne qui déploie le site
 * (supprimer le fichier une fois les comptes créés) plutôt qu'imposé ici.
 *
 * On se déconnecte après chaque création : créer un compte connecte
 * automatiquement le navigateur avec ce nouveau compte (comportement
 * Firebase), et on ne veut pas laisser cette page "connectée" entre deux
 * créations.
 */
(function () {
  var form = document.getElementById("addAdminForm");
  var err = document.getElementById("addAdminError");
  var conf = document.getElementById("addAdminConfirm");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    err.classList.remove("show");
    conf.classList.remove("show");

    var email = document.getElementById("aEmail").value.trim();
    var pass = document.getElementById("aPass").value;
    var passConfirm = document.getElementById("aPassConfirm").value;

    if (pass !== passConfirm) {
      err.textContent = "Les deux mots de passe ne correspondent pas.";
      err.classList.add("show");
      return;
    }
    if (pass.length < 6) {
      err.textContent = "Le mot de passe doit faire au moins 6 caractères.";
      err.classList.add("show");
      return;
    }

    firebase.auth().createUserWithEmailAndPassword(email, pass)
      .then(function () {
        return firebase.auth().signOut();
      })
      .then(function () {
        conf.classList.add("show");
        form.reset();
      })
      .catch(function (fbErr) {
        var messages = {
          "auth/email-already-in-use": "Cet e-mail a déjà un compte.",
          "auth/invalid-email": "Adresse e-mail invalide.",
          "auth/weak-password": "Mot de passe trop faible (6 caractères minimum).",
        };
        err.textContent = messages[fbErr.code] || ("Erreur : " + fbErr.message);
        err.classList.add("show");
      });
  });
})();
