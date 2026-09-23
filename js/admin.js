(function () {
  function esc(s) { return (s || "").toString().replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmtDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
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

  // ---- départements (Boîte / Salle VIP / Cigar Hall / Bar) ----
  var DEPARTEMENTS = [
    { id: "boite", label: "Boîte" },
    { id: "vip", label: "Salle VIP" },
    { id: "cigare", label: "Cigar Hall" },
    { id: "bar", label: "Bar" },
  ];

  function renderDepartement(dep) {
    var rows = LB_DB.list("produits", { sortBy: "createdAt", dir: "desc" }).filter(function (p) { return p.departement === dep.id; });
    var total = rows.reduce(function (sum, p) { return sum + Number(p.prix || 0) * Number(p.quantite || 0); }, 0);
    var caEl = document.getElementById("ca-" + dep.id);
    if (caEl) caEl.textContent = total.toLocaleString("fr-FR") + " F CFA";
    var body = document.getElementById("body-" + dep.id);
    if (!body) return;
    body.innerHTML = rows.map(function (p) {
      var montant = Number(p.prix || 0) * Number(p.quantite || 0);
      return "<tr><td>" + esc(p.nom) + "</td><td>" + Number(p.quantite || 0) + "</td><td>" +
        Number(p.prix || 0).toLocaleString("fr-FR") + " F</td><td>" + montant.toLocaleString("fr-FR") + " F</td>" +
        '<td><button class="btn ghost small" data-del-produit="' + p.id + '">Supprimer</button></td></tr>';
    }).join("") || '<tr><td colspan="5" style="color:var(--smoke)">Aucun produit enregistré.</td></tr>';
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

  // clics : suppression (soirée / produit)
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
      LB_DB.remove("produits", delProduit.dataset.delProduit);
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

  // formulaires "Ajouter un produit" de chaque département
  DEPARTEMENTS.forEach(function (dep) {
    var form = document.getElementById("form-" + dep.id);
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      LB_DB.add("produits", {
        departement: dep.id,
        nom: document.getElementById("nom-" + dep.id).value,
        quantite: Number(document.getElementById("qte-" + dep.id).value || 0),
        prix: Number(document.getElementById("prix-" + dep.id).value || 0),
      });
      e.target.reset();
      document.getElementById("qte-" + dep.id).value = 1;
      renderAll();
    });
  });

  // reset all data
  document.getElementById("resetData").addEventListener("click", function () {
    if (confirm("Effacer toutes les données de test (agenda, produits par département, et toutes les demandes envoyées par le site public) ?")) {
      LB_DB.clearAll();
      location.reload();
    }
  });
})();
