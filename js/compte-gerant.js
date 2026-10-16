/**
 * Le Baron — compte-gerant.html (fusion de creer-gerant.html, creer-admin.html
 * et ajouter-admin.html en une seule page).
 *
 * Logique :
 *  - Si aucun compte gérant n'existe encore (verrou Firestore _setup/adminCreated
 *    absent) : formulaire de création du tout premier compte, sans connexion
 *    requise. Une fois créé, le verrou se pose et cette page ne recréera plus
 *    jamais de premier compte.
 *  - Si un compte existe déjà : il faut se connecter avec un compte gérant
 *    existant avant de pouvoir en créer un nouveau (fini l'accès libre et
 *    réutilisable de l'ancienne ajouter-admin.html).
 */
(function () {
  var DEFAULT_EMAIL = "admin@lebaron.com";
  var DEFAULT_PASSWORD = "LeBaron123";

  var stateChecking = document.getElementById("stateChecking");
  var firstForm = document.getElementById("firstForm");
  var firstDone = document.getElementById("firstDone");
  var loginForm = document.getElementById("loginForm");
  var newAccountBlock = document.getElementById("newAccountBlock");

  function show(el) {
    [stateChecking, firstForm, firstDone, loginForm, newAccountBlock].forEach(function (e) { e.style.display = "none"; });
    el.style.display = "block";
  }

  document.getElementById("firstEmail").value = DEFAULT_EMAIL;
  document.getElementById("firstPass").value = DEFAULT_PASSWORD;

  var lockRef = db.collection("_setup").doc("adminCreated");

  function boot() {
    lockRef.get().then(function (snap) {
      if (!snap.exists) {
        show(firstForm);
        return;
      }
      // un compte existe déjà : il faut être connecté pour en créer un autre
      firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
          document.getElementById("myEmail").textContent = user.email;
          show(newAccountBlock);
        } else {
          show(loginForm);
        }
      });
    }).catch(function () {
      show(firstForm);
    });
  }
  boot();

  // ---- cas 1 : créer le tout premier compte ----
  firstForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var err = document.getElementById("firstError");
    err.classList.remove("show");

    var email = document.getElementById("firstEmail").value.trim();
    var pass = document.getElementById("firstPass").value;

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
        document.getElementById("firstDoneEmail").textContent = email;
        document.getElementById("firstDonePass").textContent = pass;
        show(firstDone);
      })
      .catch(function (fbErr) {
        var messages = {
          "auth/email-already-in-use": "Cet e-mail a déjà un compte.",
          "auth/invalid-email": "Adresse e-mail invalide.",
          "auth/weak-password": "Mot de passe trop faible (6 caractères minimum).",
          "permission-denied": "Un premier compte vient d'être créé entre-temps par quelqu'un d'autre — connectez-vous plutôt.",
        };
        if (fbErr.code === "permission-denied") {
          boot();
          return;
        }
        err.textContent = messages[fbErr.code] || ("Erreur : " + fbErr.message);
        err.classList.add("show");
      });
  });

  // ---- cas 2a : connexion à un compte existant ----
  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var err = document.getElementById("loginError");
    err.classList.remove("show");
    var email = document.getElementById("loginEmail").value;
    var pass = document.getElementById("loginPass").value;
    firebase.auth().signInWithEmailAndPassword(email, pass)
      .then(function () { location.reload(); })
      .catch(function () { err.classList.add("show"); });
  });

  // ---- cas 2b : créer un accès gérant additionnel (session admin préservée) ----
  document.getElementById("newForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var err = document.getElementById("newError");
    var conf = document.getElementById("newConfirm");
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

    // Instance Firebase secondaire, indépendante de la session admin en cours,
    // pour ne pas déconnecter la personne qui crée ce nouveau compte.
    var secondaryName = "AdminCreation-" + Date.now();
    var secondaryApp = firebase.initializeApp(firebaseConfig, secondaryName);

    secondaryApp.auth().createUserWithEmailAndPassword(email, pass)
      .then(function () { return secondaryApp.auth().signOut(); })
      .then(function () { return secondaryApp.delete(); })
      .then(function () {
        conf.classList.add("show");
        e.target.reset();
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

  document.getElementById("logoutBtn").addEventListener("click", function (e) {
    e.preventDefault();
    firebase.auth().signOut().then(function () { location.reload(); });
  });
})();
