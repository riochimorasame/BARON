/**
 * Le Baron — création d'un nouvel accès gérant depuis creer-admin.html.
 *
 * Piège classique de Firebase Auth : appeler createUserWithEmailAndPassword
 * sur l'app "principale" connecte automatiquement le navigateur avec ce
 * NOUVEAU compte, et déconnecte donc la session du gérant en train de le
 * créer. Pour l'éviter, on crée le compte sur une seconde instance Firebase
 * ("Secondary"), isolée de la session principale, puis on la déconnecte
 * aussitôt — la session du gérant connecté sur admin.html n'est jamais
 * touchée.
 */
(function () {
  var form = document.getElementById("createAdminForm");
  if (!form) return; // page pas encore affichée (pas connecté) : rien à faire

  var err = document.getElementById("createError");
  var conf = document.getElementById("createConfirm");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    err.classList.remove("show");
    conf.classList.remove("show");

    var email = document.getElementById("newEmail").value.trim();
    var pass = document.getElementById("newPass").value;
    var passConfirm = document.getElementById("newPassConfirm").value;

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

    // Instance secondaire, indépendante de la session admin en cours.
    var secondaryName = "AdminCreation-" + Date.now();
    var secondaryApp = firebase.initializeApp(firebaseConfig, secondaryName);

    secondaryApp.auth().createUserWithEmailAndPassword(email, pass)
      .then(function () {
        return secondaryApp.auth().signOut();
      })
      .then(function () {
        return secondaryApp.delete();
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
        secondaryApp.delete().catch(function () {});
      });
  });
})();
