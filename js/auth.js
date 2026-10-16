/**
 * Le Baron — accès à l'espace gérant (Firebase Authentication).
 *
 * Cet écran ne fait qu'une chose : n'afficher le contenu d'admin.html que
 * si un compte gérant est connecté. La protection réelle des données se
 * fait côté serveur, dans les règles Firestore (voir firestore.rules) —
 * ce script seul ne suffirait pas à protéger quoi que ce soit si les
 * règles restaient ouvertes.
 *
 * Créer un compte gérant (une seule fois, depuis la console Firebase) :
 *   1. console.firebase.google.com → votre projet → "Authentication".
 *   2. Onglet "Sign-in method" → activez le fournisseur "E-mail/Mot de passe".
 *   3. Onglet "Users" → "Add user" → renseignez l'e-mail et le mot de passe
 *      du gérant. Répétez pour chaque personne qui doit avoir accès.
 *   4. Ces identifiants sont ceux à utiliser sur l'écran de connexion ici.
 */
(function () {
  var gate = document.getElementById("authGate");
  var shell = document.getElementById("adminShell");
  var loginForm = document.getElementById("loginForm");
  var loginError = document.getElementById("loginError");
  var logoutBtn = document.getElementById("logoutBtn");

  firebase.auth().onAuthStateChanged(function (user) {
    if (user) {
      gate.style.display = "none";
      shell.style.display = "flex";
    } else {
      gate.style.display = "flex";
      shell.style.display = "none";
    }
  });

  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    loginError.classList.remove("show");
    var email = document.getElementById("loginEmail").value;
    var pass = document.getElementById("loginPass").value;
    firebase.auth().signInWithEmailAndPassword(email, pass)
      .then(function () {
        // Recharge la page : les écoutes temps réel de data.js se rouvrent
        // proprement avec la session désormais authentifiée.
        location.reload();
      })
      .catch(function () {
        loginError.classList.add("show");
      });
  });

  logoutBtn.addEventListener("click", function (e) {
    e.preventDefault();
    firebase.auth().signOut().then(function () { location.reload(); });
  });
})();
