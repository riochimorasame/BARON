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
  var today = new Date().toISOString().slice(0, 10);

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

  function renderEvents() {
    var rows = LB_DB.list("events", { sortBy: "date" });
    document.getElementById("eventsBody").innerHTML = rows.map(function (r) {
      var thumb = r.affiche
        ? '<img src="' + esc(r.affiche) + '" alt="" style="width:38px;height:50px;object-fit:cover;border:1px solid var(--line-soft)">'
        : '<span style="color:var(--smoke)">—</span>';
      return "<tr><td>" + thumb + "</td><td>" + esc(r.nom) + "</td><td>" + fmtDate(r.date) + "</td><td>" + esc(r.genre || "") + "</td>" +
        '<td style="display:flex;gap:6px"><button class="btn ghost small" data-edit-event="' + r.id + '">Modifier</button>' +
        '<button class="btn ghost small" data-del-event="' + r.id + '">Supprimer</button></td></tr>';
    }).join("") || '<tr><td colspan="5" style="color:var(--smoke)">Aucune soirée programmée.</td></tr>';
  }

  // ---- départements : stock (entrées/ventes) + chiffre d'affaires ----
  var DEPARTEMENTS = [
    { id: "boite", label: "Boîte" },
    { id: "vip", label: "Salle VIP" },
    { id: "cigare", label: "Cigar Hall" },
    { id: "bar", label: "Bar" },
  ];

  // Fenêtre de modification libre après une saisie : 10 minutes. Passé ce
  // délai, seul le boss peut autoriser (depuis boss.html) une modification
  // ponctuelle du mouvement — via son champ "modificationAutorisee".
  var FENETRE_MODIF_MS = 10 * 60 * 1000;

  function statutModification(m) {
    var restantMs = FENETRE_MODIF_MS - (Date.now() - (m.createdAt || 0));
    if (restantMs > 0) return { peut: true, raison: "delai", minutesRestantes: Math.ceil(restantMs / 60000) };
    if (m.modificationAutorisee) return { peut: true, raison: "boss" };
    return { peut: false, raison: "verrouille" };
  }

  function journaliserModification(m, action, apres, autorisePar) {
    LB_DB.add("historique_modifications", {
      departement: m.departement,
      produitId: m.produitId,
      produitNom: m.produitNom,
      mouvementId: m.id,
      action: action,
      type: m.type,
      avant: { quantite: m.quantite, prixUnitaire: m.prixUnitaire, montant: m.montant, date: m.date },
      apres: apres,
      autorisePar: autorisePar,
    });
  }

  function computeStats(dep, produits, mouvements) {
    var stats = {};
    produits.forEach(function (p) { stats[p.id] = { entree: 0, vente: 0, montant: 0 }; });
    mouvements.forEach(function (m) {
      if (m.departement !== dep.id) return;
      if (!stats[m.produitId]) stats[m.produitId] = { entree: 0, vente: 0, montant: 0 };
      if (m.type === "entree") {
        stats[m.produitId].entree += Number(m.quantite || 0);
      } else {
        stats[m.produitId].vente += Number(m.quantite || 0);
        stats[m.produitId].montant += Number(m.montant || 0);
      }
    });
    return stats;
  }

  function renderDepartement(dep) {
    var produits = LB_DB.list("produits").filter(function (p) { return p.departement === dep.id; });
    var mouvements = LB_DB.list("mouvements", { sortBy: "createdAt", dir: "desc" }).filter(function (m) { return m.departement === dep.id; });
    var stats = computeStats(dep, produits, mouvements);

    var ca = 0;
    Object.keys(stats).forEach(function (id) { ca += stats[id].montant; });
    var caEl = document.getElementById("ca-" + dep.id);
    if (caEl) caEl.textContent = ca.toLocaleString("fr-FR") + " F CFA";

    // tableau stock actuel
    var body = document.getElementById("body-" + dep.id);
    if (body) {
      body.innerHTML = produits.map(function (p) {
        var s = stats[p.id] || { entree: 0, vente: 0, montant: 0 };
        var stockActuel = s.entree - s.vente;
        return "<tr><td>" + esc(p.nom) + "</td><td>" + Number(p.prix || 0).toLocaleString("fr-FR") + " F</td>" +
          "<td>" + s.entree + "</td><td>" + s.vente + "</td><td><strong>" + stockActuel + "</strong></td>" +
          "<td>" + s.montant.toLocaleString("fr-FR") + " F</td>" +
          '<td><button class="btn ghost small" data-del-produit="' + p.id + '">Supprimer</button></td></tr>';
      }).join("") || '<tr><td colspan="7" style="color:var(--smoke)">Aucun produit enregistré.</td></tr>';
    }

    // options du <select> "enregistrer une vente"
    var select = document.getElementById("vente-produit-" + dep.id);
    if (select) {
      var current = select.value;
      select.innerHTML = '<option value="">— Choisir un produit —</option>' + produits.map(function (p) {
        var s = stats[p.id] || { entree: 0, vente: 0 };
        var stockActuel = s.entree - s.vente;
        return '<option value="' + p.id + '" data-prix="' + Number(p.prix || 0) + '" data-nom="' + esc(p.nom) + '" data-stock="' + stockActuel + '"' +
          (stockActuel <= 0 ? " disabled" : "") + '>' + esc(p.nom) + " — stock : " + stockActuel + "</option>";
      }).join("");
      if (current) select.value = current;
    }

    // historique des mouvements, avec statut de modification
    var hist = document.getElementById("hist-" + dep.id);
    if (hist) {
      hist.innerHTML = mouvements.slice(0, 15).map(function (m) {
        var label = m.type === "entree"
          ? '<span style="color:var(--emerald)">+ Entrée</span>'
          : '<span style="color:var(--riot)">− Vente</span>';
        var s = statutModification(m);
        var actions;
        if (s.peut && s.raison === "delai") {
          actions = '<button class="btn ghost small" data-mod-edit="' + m.id + '">Modifier</button> ' +
            '<button class="btn ghost small" data-mod-del="' + m.id + '">Supprimer</button>' +
            '<div style="font-size:.72rem;color:var(--smoke);margin-top:3px">Encore ' + s.minutesRestantes + ' min</div>';
        } else if (s.peut && s.raison === "boss") {
          actions = '<button class="btn ghost small" data-mod-edit="' + m.id + '">Modifier</button> ' +
            '<button class="btn ghost small" data-mod-del="' + m.id + '">Supprimer</button>' +
            '<div style="font-size:.72rem;color:var(--gold-bright)">✓ Autorisé par le boss</div>';
        } else {
          actions = '<span style="font-size:.78rem;color:var(--smoke)">🔒 Verrouillé — demandez au boss</span>';
        }
        return "<tr><td>" + fmtDate(m.date) + "</td><td>" + esc(m.produitNom) + "</td><td>" + label + "</td>" +
          "<td>" + Number(m.quantite || 0) + "</td><td>" + (m.type === "vente" ? Number(m.montant || 0).toLocaleString("fr-FR") + " F" : "—") + "</td>" +
          "<td>" + actions + "</td></tr>";
      }).join("") || '<tr><td colspan="6" style="color:var(--smoke)">Aucun mouvement.</td></tr>';
    }

    // journal des modifications
    var modHist = document.getElementById("modhist-" + dep.id);
    if (modHist) {
      var mods = LB_DB.list("historique_modifications", { sortBy: "createdAt", dir: "desc" }).filter(function (h) { return h.departement === dep.id; });
      modHist.innerHTML = mods.map(function (h) {
        var actionLabel = h.action === "suppression" ? "Suppression" : "Modification";
        var avant = "Qté " + h.avant.quantite + (h.type === "vente" ? " · " + Number(h.avant.montant || 0).toLocaleString("fr-FR") + " F" : "");
        var apres = h.apres ? "Qté " + h.apres.quantite + (h.type === "vente" ? " · " + Number(h.apres.montant || 0).toLocaleString("fr-FR") + " F" : "") : "—";
        var autorise = h.autorisePar === "boss" ? "Boss" : "Délai 10 min";
        return "<tr><td>" + fmtDateTime(h.createdAt) + "</td><td>" + esc(h.produitNom) + "</td><td>" + actionLabel + "</td>" +
          "<td>" + avant + "</td><td>" + apres + "</td><td>" + autorise + "</td></tr>";
      }).join("") || '<tr><td colspan="6" style="color:var(--smoke)">Aucune modification enregistrée.</td></tr>';
    }
  }

  function renderDepartements() {
    DEPARTEMENTS.forEach(renderDepartement);
  }

  function renderAll() {
    renderEvents();
    renderDepartements();
  }
  renderAll();
  window.addEventListener("lebaron:update", renderAll);
  // le statut (délai de 10 min) évolue avec le temps même sans nouvelle
  // donnée : on rafraîchit l'affichage régulièrement.
  setInterval(renderDepartements, 30000);

  // clics : suppression / modification
  document.querySelector("main").addEventListener("click", function (e) {
    var del = e.target.closest("[data-del-event]");
    if (del) {
      LB_DB.remove("events", del.dataset.delEvent);
      if (editingEventId === del.dataset.delEvent) exitEventEditMode();
      renderAll();
      return;
    }
    var editEv = e.target.closest("[data-edit-event]");
    if (editEv) {
      var ev = LB_DB.get("events", editEv.dataset.editEvent);
      if (!ev) return;
      editingEventId = ev.id;
      document.getElementById("eNom").value = ev.nom || "";
      document.getElementById("eGenre").value = ev.genre || "";
      document.getElementById("eDate").value = ev.date || "";
      document.getElementById("eHeure").value = ev.heure || "";
      document.getElementById("eDesc").value = ev.description || "";
      document.getElementById("eAffiche").value = ev.affiche || "";
      document.getElementById("eventFormTitle").textContent = "Modifier la soirée";
      document.getElementById("eventFormSubmit").textContent = "Mettre à jour la soirée";
      document.getElementById("eventFormCancel").style.display = "inline-flex";
      document.getElementById("eventForm").scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    var delProduit = e.target.closest("[data-del-produit]");
    if (delProduit) {
      if (!confirm("Supprimer ce produit et tout son historique de stock (entrées et ventes) ?")) return;
      var pid = delProduit.dataset.delProduit;
      LB_DB.list("mouvements").filter(function (m) { return m.produitId === pid; }).forEach(function (m) {
        LB_DB.remove("mouvements", m.id);
      });
      LB_DB.remove("produits", pid);
      renderAll();
      return;
    }

    // ---- modifier un mouvement (dans le délai de 10 min, ou après autorisation boss) ----
    var editMod = e.target.closest("[data-mod-edit]");
    if (editMod) {
      var mid = editMod.dataset.modEdit;
      var m = LB_DB.get("mouvements", mid);
      if (!m) return;
      var s = statutModification(m);
      if (!s.peut) {
        alert("Cette saisie ne peut plus être modifiée directement. Demandez au boss de l'autoriser depuis son espace.");
        renderAll();
        return;
      }
      var nouvelleQteStr = prompt("Nouvelle quantité pour « " + m.produitNom + " » :", m.quantite);
      if (nouvelleQteStr === null) return;
      var nouvelleQte = Number(nouvelleQteStr);
      if (!nouvelleQte || nouvelleQte <= 0) { alert("Quantité invalide."); return; }

      var nouveauPrix = Number(m.prixUnitaire || 0);
      if (m.type === "vente") {
        var prixStr = prompt("Nouveau prix unitaire (F CFA) :", m.prixUnitaire);
        if (prixStr === null) return;
        nouveauPrix = Number(prixStr);
        if (isNaN(nouveauPrix) || nouveauPrix < 0) { alert("Prix invalide."); return; }
      }
      var nouveauMontant = m.type === "vente" ? nouvelleQte * nouveauPrix : 0;
      var apres = { quantite: nouvelleQte, prixUnitaire: nouveauPrix, montant: nouveauMontant, date: m.date };
      var autorisePar = s.raison === "boss" ? "boss" : "delai_10min";

      journaliserModification(m, "modification", apres, autorisePar);
      LB_DB.update("mouvements", mid, { quantite: nouvelleQte, prixUnitaire: nouveauPrix, montant: nouveauMontant, modificationAutorisee: false });
      renderAll();
      return;
    }

    // ---- supprimer un mouvement (dans le délai de 10 min, ou après autorisation boss) ----
    var delMod = e.target.closest("[data-mod-del]");
    if (delMod) {
      var mid2 = delMod.dataset.modDel;
      var m2 = LB_DB.get("mouvements", mid2);
      if (!m2) return;
      var s2 = statutModification(m2);
      if (!s2.peut) {
        alert("Cette saisie ne peut plus être supprimée directement. Demandez au boss de l'autoriser depuis son espace.");
        renderAll();
        return;
      }
      if (!confirm("Supprimer ce mouvement (" + m2.produitNom + ", quantité " + m2.quantite + ") ? L'action sera tracée dans le journal des modifications.")) return;
      var autorisePar2 = s2.raison === "boss" ? "boss" : "delai_10min";
      journaliserModification(m2, "suppression", null, autorisePar2);
      LB_DB.remove("mouvements", mid2);
      renderAll();
    }
  });

  // add / edit event
  var editingEventId = null;
  function exitEventEditMode() {
    editingEventId = null;
    document.getElementById("eventFormTitle").textContent = "Ajouter une soirée";
    document.getElementById("eventFormSubmit").textContent = "Publier la soirée";
    document.getElementById("eventFormCancel").style.display = "none";
    document.getElementById("eventForm").reset();
  }
  document.getElementById("eventForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var data = {
      nom: document.getElementById("eNom").value,
      genre: document.getElementById("eGenre").value,
      date: document.getElementById("eDate").value,
      heure: document.getElementById("eHeure").value,
      description: document.getElementById("eDesc").value,
      affiche: document.getElementById("eAffiche").value,
    };
    if (editingEventId) {
      LB_DB.update("events", editingEventId, data);
    } else {
      LB_DB.add("events", data);
    }
    exitEventEditMode();
    renderAll();
  });
  document.getElementById("eventFormCancel").addEventListener("click", exitEventEditMode);

  // ---- formulaires de chaque département ----
  DEPARTEMENTS.forEach(function (dep) {
    var stockDateField = document.getElementById("vente-date-" + dep.id);
    if (stockDateField) stockDateField.value = today;

    var stockForm = document.getElementById("stock-form-" + dep.id);
    if (stockForm) {
      stockForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var nomRaw = document.getElementById("stock-nom-" + dep.id).value.trim();
        var qte = Number(document.getElementById("stock-qte-" + dep.id).value || 0);
        var prix = Number(document.getElementById("stock-prix-" + dep.id).value || 0);
        if (!nomRaw || qte <= 0) return;

        function ajouterMouvementEntree(produitId, produitNom) {
          LB_DB.add("mouvements", {
            departement: dep.id,
            produitId: produitId,
            produitNom: produitNom,
            type: "entree",
            quantite: qte,
            prixUnitaire: prix,
            montant: 0,
            date: today,
          });
          stockForm.reset();
          document.getElementById("stock-qte-" + dep.id).value = 1;
          renderAll();
        }

        var existant = LB_DB.list("produits").find(function (p) {
          return p.departement === dep.id && p.nom.trim().toLowerCase() === nomRaw.toLowerCase();
        });
        if (existant) {
          if (prix && prix !== existant.prix) LB_DB.update("produits", existant.id, { prix: prix });
          ajouterMouvementEntree(existant.id, existant.nom);
        } else {
          LB_DB.add("produits", { departement: dep.id, nom: nomRaw, prix: prix }).then(function (ref) {
            if (ref) ajouterMouvementEntree(ref.id, nomRaw);
          });
        }
      });
    }

    var venteForm = document.getElementById("vente-form-" + dep.id);
    if (venteForm) {
      venteForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var select = document.getElementById("vente-produit-" + dep.id);
        var opt = select.options[select.selectedIndex];
        if (!opt || !opt.value) return;
        var qte = Number(document.getElementById("vente-qte-" + dep.id).value || 0);
        var stockDispo = Number(opt.dataset.stock || 0);
        if (qte <= 0) return;
        if (qte > stockDispo) {
          alert("Stock insuffisant : il ne reste que " + stockDispo + " en stock pour ce produit.");
          return;
        }
        var prixUnitaire = Number(opt.dataset.prix || 0);
        LB_DB.add("mouvements", {
          departement: dep.id,
          produitId: opt.value,
          produitNom: opt.dataset.nom,
          type: "vente",
          quantite: qte,
          prixUnitaire: prixUnitaire,
          montant: prixUnitaire * qte,
          date: document.getElementById("vente-date-" + dep.id).value,
        });
        venteForm.reset();
        document.getElementById("vente-date-" + dep.id).value = today;
        renderAll();
      });
    }
  });

  // reset all data
  document.getElementById("resetData").addEventListener("click", function () {
    if (confirm("Effacer toutes les données de test (agenda, produits, stock, ventes, journal des modifications, et toutes les demandes envoyées par le site public) ?")) {
      LB_DB.clearAll();
      location.reload();
    }
  });
})();
