(function () {
  function esc(s) { return (s || "").toString().replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmtDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  }
  function fmtDateTime(ts) {
    if (!ts) return "—";
    return new Date(ts).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  // navigation
  var links = document.querySelectorAll(".navlink");
  links.forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      links.forEach(function (l) { l.classList.remove("active"); });
      link.classList.add("active");
      document.querySelectorAll(".panel").forEach(function (p) { p.style.display = "none"; });
      document.getElementById("panel-" + link.dataset.target).style.display = "block";
    });
  });

  var DEPARTEMENTS = [
    { id: "boite", label: "Boîte" },
    { id: "vip", label: "Salle VIP" },
    { id: "cigare", label: "Cigar Hall" },
    { id: "bar", label: "Bar" },
  ];

  // même fenêtre de modification libre que côté gérant (voir js/admin.js) :
  // sert uniquement ici à savoir quoi afficher (délai en cours / verrouillé
  // / déjà autorisé), le boss n'a besoin d'agir que sur les mouvements
  // verrouillés.
  var FENETRE_MODIF_MS = 10 * 60 * 1000;
  function statutModification(m) {
    var restantMs = FENETRE_MODIF_MS - (Date.now() - (m.createdAt || 0));
    if (restantMs > 0) return { raison: "delai", minutesRestantes: Math.ceil(restantMs / 60000) };
    if (m.modificationAutorisee) return { raison: "autorise" };
    return { raison: "verrouille" };
  }

  function renderDepartement(dep) {
    var produits = LB_DB.list("produits").filter(function (p) { return p.departement === dep.id; });
    var mouvements = LB_DB.list("mouvements", { sortBy: "createdAt", dir: "desc" }).filter(function (m) { return m.departement === dep.id; });

    var stats = {};
    produits.forEach(function (p) { stats[p.id] = { entree: 0, vente: 0, montant: 0 }; });
    mouvements.forEach(function (m) {
      if (!stats[m.produitId]) stats[m.produitId] = { entree: 0, vente: 0, montant: 0 };
      if (m.type === "entree") {
        stats[m.produitId].entree += Number(m.quantite || 0);
      } else {
        stats[m.produitId].vente += Number(m.quantite || 0);
        stats[m.produitId].montant += Number(m.montant || 0);
      }
    });

    var ca = 0;
    Object.keys(stats).forEach(function (id) { ca += stats[id].montant; });
    document.getElementById("ca-" + dep.id).textContent = ca.toLocaleString("fr-FR") + " F CFA";

    document.getElementById("body-" + dep.id).innerHTML = produits.map(function (p) {
      var s = stats[p.id] || { entree: 0, vente: 0, montant: 0 };
      var stockActuel = s.entree - s.vente;
      return "<tr><td>" + esc(p.nom) + "</td><td>" + Number(p.prix || 0).toLocaleString("fr-FR") + " F</td>" +
        "<td>" + s.entree + "</td><td>" + s.vente + "</td><td><strong>" + stockActuel + "</strong></td>" +
        "<td>" + s.montant.toLocaleString("fr-FR") + " F</td></tr>";
    }).join("") || '<tr><td colspan="6" style="color:var(--smoke)">Aucun produit enregistré.</td></tr>';

    document.getElementById("hist-" + dep.id).innerHTML = mouvements.map(function (m) {
      var label = m.type === "entree"
        ? '<span style="color:var(--emerald)">+ Entrée</span>'
        : '<span style="color:var(--riot)">− Vente</span>';
      var st = statutModification(m);
      var statut;
      if (st.raison === "delai") {
        statut = '<span style="font-size:.75rem;color:var(--smoke)">Délai en cours (' + st.minutesRestantes + ' min)</span>';
      } else if (st.raison === "autorise") {
        statut = '<span style="font-size:.75rem;color:var(--gold-bright)">✓ Autorisé — en attente du gérant</span>';
      } else {
        statut = '<button class="btn ghost small" data-authorize="' + m.id + '">Autoriser une modification</button>';
      }
      return "<tr><td>" + fmtDate(m.date) + "</td><td>" + esc(m.produitNom) + "</td><td>" + label + "</td>" +
        "<td>" + Number(m.quantite || 0) + "</td><td>" + (m.type === "vente" ? Number(m.montant || 0).toLocaleString("fr-FR") + " F" : "—") + "</td>" +
        "<td>" + statut + "</td></tr>";
    }).join("") || '<tr><td colspan="6" style="color:var(--smoke)">Aucun mouvement.</td></tr>';

    var mods = LB_DB.list("historique_modifications", { sortBy: "createdAt", dir: "desc" }).filter(function (h) { return h.departement === dep.id; });
    document.getElementById("modhist-" + dep.id).innerHTML = mods.map(function (h) {
      var actionLabel = h.action === "suppression" ? "Suppression" : "Modification";
      var avant = "Qté " + h.avant.quantite + (h.type === "vente" ? " · " + Number(h.avant.montant || 0).toLocaleString("fr-FR") + " F" : "");
      var apres = h.apres ? "Qté " + h.apres.quantite + (h.type === "vente" ? " · " + Number(h.apres.montant || 0).toLocaleString("fr-FR") + " F" : "") : "—";
      var autorise = h.autorisePar === "boss" ? "Boss" : "Délai 10 min";
      return "<tr><td>" + fmtDateTime(h.createdAt) + "</td><td>" + esc(h.produitNom) + "</td><td>" + actionLabel + "</td>" +
        "<td>" + avant + "</td><td>" + apres + "</td><td>" + autorise + "</td></tr>";
    }).join("") || '<tr><td colspan="6" style="color:var(--smoke)">Aucune modification enregistrée.</td></tr>';

    return ca;
  }

  function renderAll() {
    var totals = DEPARTEMENTS.map(renderDepartement);
    var grandTotal = totals.reduce(function (a, b) { return a + b; }, 0);
    document.getElementById("caTotal").textContent = grandTotal.toLocaleString("fr-FR") + " F CFA";
    document.getElementById("statGrid").innerHTML = DEPARTEMENTS.map(function (dep, i) {
      return '<div class="statCard"><div class="num">' + totals[i].toLocaleString("fr-FR") + ' F</div><div class="lbl">' + esc(dep.label) + "</div></div>";
    }).join("");
  }

  renderAll();
  window.addEventListener("lebaron:update", renderAll);
  setInterval(renderAll, 30000);

  document.querySelector("main").addEventListener("click", function (e) {
    var auth = e.target.closest("[data-authorize]");
    if (!auth) return;
    if (!confirm("Autoriser le gérant à modifier ou supprimer une fois ce mouvement, la prochaine fois qu'il s'y connecte ?")) return;
    LB_DB.update("mouvements", auth.dataset.authorize, { modificationAutorisee: true });
    renderAll();
  });
})();
