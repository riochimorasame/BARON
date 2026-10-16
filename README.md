# Le Baron — site du club (version de test locale)

## Lancer en local

Le plus simple : double-cliquer sur `index.html`, il s'ouvre dans le navigateur.

Pour un rendu 100% fidèle (certaines choses, comme le stockage entre
`index.html` et `admin.html`, se comportent mieux servies en HTTP plutôt
qu'en `file://`), lancez un petit serveur local depuis ce dossier :

```
python3 -m http.server 8000
```

puis ouvrez http://localhost:8000/index.html

## Pages

- `index.html` — site public (accueil, agenda, carte, galerie, infos
  pratiques, contact, newsletter). Les anciens formulaires de
  réservation, guestlist, billetterie et privatisation ont été retirés
  pour le moment (le contact se fait par WhatsApp) — à réintroduire plus
  tard si besoin, une fois qu'un endroit les gérera côté admin.
- `admin.html` — espace gérant, protégé par connexion : gestion de
  l'**agenda** des soirées, et suivi de stock détaillé pour **4
  départements** (Boîte, Salle VIP, Cigar Hall, Bar). Pour chaque
  département : un formulaire **"Ajouter du stock"** (crée le produit ou
  réapprovisionne un produit existant du même nom), un formulaire
  **"Enregistrer une vente"** (sortie de stock, avec vérification que la
  quantité vendue ne dépasse pas le stock disponible), un tableau
  **stock actuel** (total entré, total vendu, stock restant, chiffre
  d'affaires par produit) et un **historique des mouvements** — plus les
  Paramètres du compte. Rien n'est jamais écrasé : chaque entrée et
  chaque vente reste tracée individuellement, le stock et le chiffre
  d'affaires sont recalculés automatiquement à partir de cet historique.
  Le gérant peut librement modifier ou supprimer un mouvement dans les
  **10 minutes** suivant sa saisie ; passé ce délai, il lui faut une
  autorisation du boss (accordée depuis `boss.html`) pour agir une fois
  de plus sur ce mouvement précis. Chaque modification ou suppression —
  qu'elle soit faite dans le délai ou après autorisation — est
  enregistrée dans le **journal des modifications** (avant/après, qui l'a
  autorisée).
- `boss.html` — vue du boss : mêmes identifiants gérant. Affiche en
  temps réel, pour chaque département, le stock actuel, le chiffre
  d'affaires, l'historique complet des mouvements et le journal des
  modifications. Sur un mouvement verrouillé (saisi il y a plus de 10
  minutes), un bouton **"Autoriser une modification"** permet au boss de
  débloquer une correction ponctuelle, que le gérant effectuera ensuite
  depuis `admin.html`.
- `compte-gerant.html` — page unique pour la gestion des comptes gérant
  (remplace les anciennes `creer-gerant.html`, `creer-admin.html` et
  `ajouter-admin.html`) : crée le tout premier compte si aucun n'existe
  encore, sinon demande de se connecter avec un compte gérant existant
  avant d'en créer un nouveau (plus d'accès libre et réutilisable).

## Où sont stockées les données ?

Dans **Firebase Firestore**. Toute la logique de lecture/écriture passe par
`js/data.js`, avec des noms de fonctions calqués sur Firestore (`add`,
`list`, `update`, `remove`) — `main.js` et `admin.js` n'ont pas eu besoin
d'être réécrits.

### Mise en route (5 minutes)

1. Créez un projet sur [console.firebase.google.com](https://console.firebase.google.com).
2. Activez **Firestore Database** (mode test pour commencer).
3. Paramètres du projet ⚙️ → Général → "Vos applications" → icône Web
   `</>` → copiez l'objet `firebaseConfig` généré.
4. Collez-le en haut de `js/data.js`, à la place des valeurs
   `REMPLACE_MOI`.
5. Ouvrez `index.html` — le site se connecte à votre projet, les 3
   soirées de démo se créent automatiquement au premier chargement (une
   seule fois, si la collection `events` est vide).
6. Depuis `admin.html`, tout ce que vous ajoutez/validez apparaît en
   direct sur `index.html` (et inversement) — plus besoin de recharger la
   page, ni même d'être sur le même navigateur : c'est du temps réel
   partagé entre tous les visiteurs.

### Sécurité : règles Firestore + connexion à l'espace gérant

C'est fait. Deux choses à activer côté Firebase (5 minutes) :

**1. Publier les règles Firestore.** Le fichier `firestore.rules` à la
racine du projet contient les règles à copier-coller dans
console.firebase.google.com → votre projet → **Firestore Database** →
onglet **Règles** → coller → **Publier**. Elles font en sorte que :
- l'agenda (`events`) reste lisible par tout le monde, mais seule une
  session gérant connectée peut y écrire ;
- n'importe qui peut *envoyer* une réservation/demande guestlist/billet/
  privatisation/newsletter (c'est ce que font les formulaires du site
  public), mais seule une session gérant peut les *relire*, les
  confirmer/refuser ou les supprimer ;
- le CRM clients (`clients`) est entièrement réservé aux comptes gérants.

**2. Activer la connexion par e-mail/mot de passe.**
console.firebase.google.com → votre projet → **Authentication** → onglet
**Sign-in method** → activez **E-mail/Mot de passe**. Sans ça, les deux
pages ci-dessous ne pourront créer aucun compte.

**3. Créer le tout premier compte gérant : `compte-gerant.html`.**
Tant qu'aucun compte gérant n'existe, cette page affiche un formulaire
avec un e-mail et un mot de passe pré-remplis par défaut
(`admin@lebaron.com` / `LeBaron123`, modifiables dans
`js/compte-gerant.js` ou directement dans le formulaire) — un clic sur
"Créer" suffit. Le verrou est posé côté Firestore (document
`_setup/adminCreated`, voir `firestore.rules`) : une fois un premier
compte créé, cette même page ne proposera plus jamais d'en créer un sans
connexion — il faudra être connecté (voir point 4).

**4. Changer le mot de passe par défaut, ou en créer d'autres.**
Une fois connecté sur `admin.html`, allez dans **Paramètres → Mon
compte** pour changer votre mot de passe ou supprimer ce compte
(assurez-vous qu'un autre compte existe avant de supprimer celui-ci, sinon
vous perdez l'accès). Pour ajouter des collègues, **Paramètres → Comptes
gérant → Créer un accès gérant** (ou `compte-gerant.html` directement,
en étant connecté) : ce sont les mêmes identifiants qui donnent accès à
`boss.html`, la vue lecture seule du boss.

Ce sont ces identifiants qui sont utilisés sur l'écran de connexion de
`admin.html` et de `boss.html`. Note : `compte-gerant.html` ne bloque
pas la création de compte au niveau du projet Firebase lui-même
(au-delà de son propre verrou et de l'exigence de connexion pour les
comptes suivants) — une protection complète nécessiterait un contrôle
côté serveur (Cloud Function), à mettre en place avant l'ouverture
réelle si vous le souhaitez.

Sans l'étape 1, l'écran de connexion protège l'affichage mais pas les
données elles-mêmes (n'importe qui pourrait encore lire/écrire dans
Firestore directement) — les deux étapes vont ensemble.

### Reste à faire avant l'ouverture réelle

Rien n'est encore envoyé par SMS ou e-mail pour de vrai, et il n'y a pas
de vrai paiement en ligne — ces deux points restent à brancher
séparément. Dites-le si vous voulez qu'on mette ça en place.

