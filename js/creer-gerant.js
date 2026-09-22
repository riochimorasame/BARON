/**
 * Le Baron — creer-gerant.html (page à usage unique).
 *
 * Le verrou réel n'est PAS ce script : c'est la règle Firestore sur
 * _setup/adminCreated (voir firestore.rules), qui n'autorise la création
 * de ce document qu'une seule fois, pour toujours. Ce script se contente
 * de refléter cet état à l'écran et d'orchestrer la création du compte.
 *
 * Ordre volontaire : on crée d'abord le compte Firebase Auth, PUIS on pose
 * le verrou Firestore. Ainsi, si la création du compte échoue (mot de
 * passe refusé, etc.), la page reste utilisable — on ne "brûle" pas
 * l'usage unique pour rien.
 */
(function () {
  // Identifiants par défaut proposés sur cette page — modifiables ici en un
  // seul endroit, ou directement dans le formulaire avant de valider.
  var DEFAULT_EMAIL = "admin@lebaron.com";
  var DEFAULT_PASSWORD = "LeBaron123";

  var checking = document.getElementById("setupChecking");
  var form = document.getElementById("setupForm");
  var done = document.getElementById("setupDone");
  var locked = document.getElementById("setupLocked");
  var err = document.getElementById("setupError");

  document.getElementById("setupEmail").value = DEFAULT_EMAIL;
  document.getElementById("setupPass").value = DEFAULT_PASSWORD;

  function show(el) {
    [checking, form, done, locked].forEach(function (e) { e.style.display = "none"; });
    el.style.display = "block";
  }

  var lockRef = db.collection("_setup").doc("adminCreated");

  lockRef.get().then(function (snap) {
    show(snap.exists ? locked : form);
  }).catch(function () {
    // Si la lecture échoue (règles pas encore publiées, etc.), on montre
    // quand même le formulaire plutôt que de bloquer sans explication ;
    // le verrou côté serveur s'appliquera de toute façon à l'écriture.
    show(form);
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    err.classList.remove("show");

    var email = document.getElementById("setupEmail").value.trim();
    var pass = document.getElementById("setupPass").value;

    if (pass.length < 6) {
      err.textContent = "Le mot de passe doit faire au moins 6 caractères.";
      err.classList.add("show");
      return;
    }

    firebase.auth().createUserWithEmailAndPassword(email, pass)
      .then(function () {
        return lockRef.set({ createdAt: Date.now(), email: email });
      })
      .then(function () {
        document.getElementById("setupDoneEmail").textContent = email;
        document.getElementById("setupDonePass").textContent = pass;
        show(done);
      })
      .catch(function (fbErr) {
        var messages = {
          "auth/email-already-in-use": "Cet e-mail a déjà un compte.",
          "auth/invalid-email": "Adresse e-mail invalide.",
          "auth/weak-password": "Mot de passe trop faible (6 caractères minimum).",
          "permission-denied": "Cette page a déjà été utilisée entre-temps par quelqu'un d'autre.",
        };
        if (fbErr.code === "permission-denied") {
          show(locked);
          return;
        }
        err.textContent = messages[fbErr.code] || ("Erreur : " + fbErr.message);
        err.classList.add("show");
      });
  });
})();
