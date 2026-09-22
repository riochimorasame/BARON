/**
 * Le Baron — "Mon compte" (admin.html, panneau Paramètres).
 *
 * Changer un mot de passe ou supprimer un compte sont des opérations
 * "sensibles" pour Firebase Auth : il exige une connexion récente. On
 * redemande donc le mot de passe actuel avant d'agir (reauthentication),
 * plutôt que de se fier à la session déjà ouverte.
 */
(function () {
  var emailLabel = document.getElementById("myAccountEmail");
  var changeForm = document.getElementById("changePassForm");
  var changeErr = document.getElementById("changePassError");
  var changeConf = document.getElementById("changePassConfirm");
  var deleteBtn = document.getElementById("deleteMyAccount");
  var deleteErr = document.getElementById("deleteAccountError");

  firebase.auth().onAuthStateChanged(function (user) {
    emailLabel.textContent = user ? user.email : "—";
  });

  function reauth(currentPassword) {
    var user = firebase.auth().currentUser;
    var cred = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
    return user.reauthenticateWithCredential(cred);
  }

  changeForm.addEventListener("submit", function (e) {
    e.preventDefault();
    changeErr.classList.remove("show");
    changeConf.classList.remove("show");

    var curPass = document.getElementById("curPass").value;
    var newPass = document.getElementById("newPass2").value;
    if (newPass.length < 6) {
      changeErr.textContent = "Le nouveau mot de passe doit faire au moins 6 caractères.";
      changeErr.classList.add("show");
      return;
    }

    reauth(curPass)
      .then(function () { return firebase.auth().currentUser.updatePassword(newPass); })
      .then(function () {
        changeConf.classList.add("show");
        changeForm.reset();
      })
      .catch(function (err) {
        var messages = {
          "auth/wrong-password": "Mot de passe actuel incorrect.",
          "auth/weak-password": "Mot de passe trop faible (6 caractères minimum).",
        };
        changeErr.textContent = messages[err.code] || ("Erreur : " + err.message);
        changeErr.classList.add("show");
      });
  });

  deleteBtn.addEventListener("click", function () {
    deleteErr.classList.remove("show");

    if (!confirm("Supprimer définitivement ce compte gérant ? Assurez-vous qu'un autre compte existe déjà — sinon vous perdrez l'accès à l'espace gérant.")) return;

    var pass = prompt("Confirmez votre mot de passe actuel pour supprimer ce compte :");
    if (!pass) return;

    reauth(pass)
      .then(function () { return firebase.auth().currentUser.delete(); })
      .then(function () {
        alert("Compte supprimé. Vous allez être redirigé vers l'accueil.");
        location.href = "index.html";
      })
      .catch(function (err) {
        var messages = {
          "auth/wrong-password": "Mot de passe incorrect — compte non supprimé.",
        };
        deleteErr.textContent = messages[err.code] || ("Erreur : " + err.message);
        deleteErr.classList.add("show");
      });
  });
})();
