/**
 * Le Baron — rôles.
 *
 * Le boss est identifié par son e-mail de connexion Firebase. Tout autre
 * compte connecté est un compte gérant. Cette liste doit rester identique
 * à celle de firestore.rules (fonction isBoss) : c'est là que la règle est
 * réellement appliquée côté serveur ; ici elle ne sert qu'à l'affichage.
 *
 * Astuce Gmail : "LEBARON+boss@gmail.com" arrive dans la même boîte que
 * "LEBARON@gmail.com" mais Firebase le voit comme un compte distinct, avec
 * son propre mot de passe. Les e-mails sont en minuscules.
 */
var LB_BOSS_EMAILS = ["lebaron+boss@gmail.com"];
function LB_IS_BOSS(user) {
  return !!(user && user.email && LB_BOSS_EMAILS.indexOf(user.email.toLowerCase()) !== -1);
}
