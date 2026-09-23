/**
 * Le Baron — couche d'accès aux données (Firebase Firestore).
 *
 * ÉTAPE 1 — créer le projet :
 *   1. https://console.firebase.google.com → "Ajouter un projet".
 *   2. Dans le projet : "Firestore Database" → "Créer une base de données"
 *      → démarrer en mode test (règles ouvertes 30 jours, à durcir avant le
 *      vrai lancement, voir ÉTAPE 3 plus bas).
 *   3. "Paramètres du projet" (⚙️) → onglet "Général" → section "Vos
 *      applications" → icône "</>" (Web) → donnez-lui un nom → Firebase
 *      vous affiche un objet firebaseConfig : copiez-le ci-dessous.
 *
 * ÉTAPE 2 — collez votre config :
 */
const firebaseConfig = {
  apiKey: "AIzaSyD2SprVVEONv4GexCBTHZFSJVP2_h2si_o",
  authDomain: "baron-dd224.firebaseapp.com",
  projectId: "baron-dd224",
  storageBucket: "baron-dd224.firebasestorage.app",
  messagingSenderId: "535363708824",
  appId: "1:535363708824:web:128186bf18732ab4c2eded",
};

/**
 * ÉTAPE 3 — avant l'ouverture, remplacez les règles Firestore (mode test)
 * par celles du fichier `firestore.rules` à la racine du projet (à
 * copier-coller dans la console Firebase → Firestore Database → Règles).
 * Elles laissent l'agenda public en lecture, réservent les écritures
 * sensibles à une session gérant connectée (voir js/auth.js et le README),
 * et permettent aux formulaires du site public de créer des demandes sans
 * pouvoir les relire.
 *
 * Interface inchangée pour le reste du site : main.js et admin.js
 * continuent d'appeler LB_DB.add/list/get/update/remove/seedIfEmpty/clearAll
 * exactement comme avant, sans rien savoir de Firestore.
 */

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const LB_DB = (function () {
  const COLLECTIONS = ["events", "reservations", "guestlist", "tickets", "privatizations", "newsletter", "clients", "boissons", "depenses", "ventesBoissons", "produits"];
  const cache = {};   // col -> array (rempli en direct par Firestore)
  const watching = {}; // col -> true une fois l'écoute temps réel lancée

  function notify() {
    window.dispatchEvent(new CustomEvent("lebaron:update"));
  }

  // Sur admin.html (qui charge firebase-auth-compat.js), on attend que
  // Firebase ait déterminé l'état de connexion (utilisateur ou non) avant
  // d'ouvrir la moindre écoute temps réel — sinon les collections protégées
  // par les règles Firestore (voir firestore.rules) échouent une fois pour
  // toutes avant même que la session admin soit reconnue. Sur index.html
  // (pas de SDK auth chargé), ça se résout immédiatement.
  let authReady = Promise.resolve();
  if (typeof firebase.auth === "function") {
    authReady = new Promise(function (resolve) {
      firebase.auth().onAuthStateChanged(function () { resolve(); }, function () { resolve(); });
    });
  }

  function watch(col) {
    if (watching[col]) return;
    watching[col] = true;
    cache[col] = cache[col] || [];
    authReady.then(function () {
      db.collection(col).onSnapshot(
        function (snap) {
          cache[col] = snap.docs.map(function (d) {
            return Object.assign({ id: d.id }, d.data());
          });
          notify();
        },
        function (err) {
          console.error("[LB_DB] lecture temps réel impossible sur '" + col + "' — vérifiez les règles Firestore (accès admin requis ?).", err);
        }
      );
    });
  }

  // Remarque : on ne s'abonne plus à toutes les collections au chargement.
  // Chaque page ne s'abonne qu'à ce dont elle a réellement besoin (via
  // list()/get()), ce qui évite à index.html (site public) de tenter de lire
  // des collections réservées à l'admin comme "clients".

  return {
    // Écrit dans Firestore. La liste locale se met à jour dès que Firestore
    // confirme (en général quelques dizaines de ms) via l'écoute temps réel,
    // et déclenche "lebaron:update" — pas besoin d'attendre une Promise ici,
    // main.js/admin.js se raccrochent à cet évènement pour se redessiner.
    // add() n'a pas besoin de s'abonner à la collection : écrire ne requiert
    // pas de l'écouter (et sur le site public, ça évite d'ouvrir une écoute
    // sur des collections que les règles Firestore lui interdisent de lire).
    add(col, data) {
      const doc = Object.assign({ createdAt: Date.now() }, data);
      db.collection(col).add(doc).catch(function (err) {
        console.error("[LB_DB] add('" + col + "') a échoué", err);
      });
      return doc;
    },
    list(col, opts) {
      watch(col);
      opts = opts || {};
      let arr = (cache[col] || []).slice();
      if (opts.sortBy) {
        arr.sort(function (a, b) { return (a[opts.sortBy] || "") > (b[opts.sortBy] || "") ? 1 : -1; });
        if (opts.dir === "desc") arr.reverse();
      }
      return arr;
    },
    get(col, id) {
      watch(col);
      return (cache[col] || []).find(function (d) { return d.id === id; }) || null;
    },
    update(col, id, patch) {
      db.collection(col).doc(id).update(Object.assign({}, patch, { updatedAt: Date.now() })).catch(function (err) {
        console.error("[LB_DB] update('" + col + "', '" + id + "') a échoué", err);
      });
    },
    remove(col, id) {
      db.collection(col).doc(id).delete().catch(function (err) {
        console.error("[LB_DB] remove('" + col + "', '" + id + "') a échoué", err);
      });
    },
    seedIfEmpty(col, seedArr) {
      db.collection(col).limit(1).get().then(function (snap) {
        if (snap.empty) {
          seedArr.forEach(function (d) {
            db.collection(col).add(Object.assign({ createdAt: Date.now() }, d)).catch(function (err) {
              console.error("[LB_DB] seed('" + col + "') a échoué", err);
            });
          });
        }
      }).catch(function (err) {
        console.error("[LB_DB] seedIfEmpty('" + col + "') n'a pas pu vérifier la collection", err);
      });
    },
    clearAll() {
      COLLECTIONS.forEach(function (col) {
        db.collection(col).get().then(function (snap) {
          snap.forEach(function (doc) { doc.ref.delete(); });
        });
      });
    },
  };
})();

// Données de démonstration — n'écrit que si la collection "events" est
// encore vide côté Firestore (donc sans risque de doublons au rechargement).
LB_DB.seedIfEmpty("events", [
  {
    nom: "Ouverture — Nuit Afrobeat",
    date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    heure: "23h00",
    genre: "Afrobeat / Amapiano",
    description: "Soirée d'inauguration du Baron. Guestlist limitée, DJ invité.",
  },
  {
    nom: "Baron Sessions — Hip-Hop/RnB",
    date: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
    heure: "22h30",
    genre: "Hip-Hop / RnB",
    description: "Résidents du club aux platines, ambiance club US.",
  },
  {
    nom: "Électro Nights",
    date: new Date(Date.now() + 17 * 86400000).toISOString().slice(0, 10),
    heure: "23h00",
    genre: "Électro / House",
    description: "DJ invité international, billetterie ouverte.",
  },
]);
