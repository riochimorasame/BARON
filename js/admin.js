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

  function statusPill(status) {
    var labels = { en_attente: "En attente", confirme: "Confirmé", refuse: "Refusé", valide: "Valide", utilise: "Utilisé" };
    return '<span class="statusPill ' + status + '">' + (labels[status] || status) + "</span>";
  }

  function renderDashboard() {
    var res = LB_DB.list("reservations"), gl = LB_DB.list("guestlist"), tk = LB_DB.list("tickets"), priv = LB_DB.list("privatizations");
    var stats = [
      { num: res.length, lbl: "Réservations" },
      { num: res.filter(function (r) { return r.status === "en_attente"; }).length, lbl: "En attente" },
      { num: gl.length, lbl: "Demandes guestlist" },
      { num: tk.length, lbl: "Billets vendus" },
      { num: priv.length, lbl: "Demandes privatisation" },
    ];
    document.getElementById("statGrid").innerHTML = stats.map(function (s) {
      return '<div class="statCard"><div class="num">' + s.num + '</div><div class="lbl">' + s.lbl + "</div></div>";
    }).join("");

    var all = res.map(function (r) { return { type: "Réservation", nom: r.nom, date: r.date, status: r.status, createdAt: r.createdAt }; })
      .concat(gl.map(function (r) { return { type: "Guestlist", nom: r.nom, date: r.date, status: r.status, createdAt: r.createdAt }; }))
      .concat(tk.map(function (r) { return { type: "Billet", nom: r.nom, date: r.soiree, status: r.status, createdAt: r.createdAt }; }));
    all.sort(function (a, b) { return b.createdAt - a.createdAt; });
    var tbody = document.querySelector("#recentTable tbody");
    tbody.innerHTML = all.slice(0, 8).map(function (r) {
      return "<tr><td>" + esc(r.type) + "</td><td>" + esc(r.nom) + "</td><td>" + esc(r.date || "") + "</td><td>" + statusPill(r.status) + "</td></tr>";
    }).join("") || '<tr><td colspan="4" style="color:var(--smoke)">Aucune donnée pour l\'instant.</td></tr>';
  }

  function actionButtons(col, id, status) {
    if (status !== "en_attente") return "";
    return '<button class="btn small" data-act="confirme" data-col="' + col + '" data-id="' + id + '">Confirmer</button> ' +
      '<button class="btn ghost small" data-act="refuse" data-col="' + col + '" data-id="' + id + '">Refuser</button>';
  }

  function renderReservations() {
    var rows = LB_DB.list("reservations", { sortBy: "createdAt", dir: "desc" });
    document.getElementById("reservationsBody").innerHTML = rows.map(function (r) {
      return "<tr><td>" + esc(r.nom) + "</td><td>" + esc(r.tel) + "<br><span style='color:var(--smoke);font-size:.78rem'>" + esc(r.email) + "</span></td>" +
        "<td>" + fmtDate(r.date) + "</td><td>" + r.personnes + "</td><td>" + esc(r.carre) + "</td><td>" + esc(r.package) + "</td>" +
        "<td>" + statusPill(r.status) + "</td><td>" + actionButtons("reservations", r.id, r.status) + "</td></tr>";
    }).join("") || '<tr><td colspan="8" style="color:var(--smoke)">Aucune réservation.</td></tr>';
  }

  function renderGuestlist() {
    var rows = LB_DB.list("guestlist", { sortBy: "createdAt", dir: "desc" });
    document.getElementById("guestlistBody").innerHTML = rows.map(function (r) {
      return "<tr><td>" + esc(r.nom) + "</td><td>" + esc(r.tel) + "<br><span style='color:var(--smoke);font-size:.78rem'>" + esc(r.email) + "</span></td>" +
        "<td>" + fmtDate(r.date) + "</td><td>" + r.personnes + "</td><td>" + statusPill(r.status) + "</td><td>" + actionButtons("guestlist", r.id, r.status) + "</td></tr>";
    }).join("") || '<tr><td colspan="6" style="color:var(--smoke)">Aucune demande.</td></tr>';
  }

  function renderPrivatisations() {
    var rows = LB_DB.list("privatizations", { sortBy: "createdAt", dir: "desc" });
    document.getElementById("privBody").innerHTML = rows.map(function (r) {
      return "<tr><td>" + esc(r.nom) + "</td><td>" + esc(r.tel) + "<br><span style='color:var(--smoke);font-size:.78rem'>" + esc(r.email) + "</span></td>" +
        "<td>" + fmtDate(r.date) + "</td><td>" + r.personnes + "</td><td>" + esc(r.note || "") + "</td>" +
        "<td>" + statusPill(r.status) + "</td><td>" + actionButtons("privatizations", r.id, r.status) + "</td></tr>";
    }).join("") || '<tr><td colspan="7" style="color:var(--smoke)">Aucune demande.</td></tr>';
  }

  function renderTickets() {
    var rows = LB_DB.list("tickets", { sortBy: "createdAt", dir: "desc" });
    document.getElementById("ticketsBody").innerHTML = rows.map(function (r) {
      return "<tr><td>" + esc(r.code) + "</td><td>" + esc(r.nom) + "</td><td>" + esc(r.soiree) + "</td><td>" + r.qte + "</td><td>" + statusPill(r.status) + "</td></tr>";
    }).join("") || '<tr><td colspan="5" style="color:var(--smoke)">Aucun billet vendu.</td></tr>';
  }

  function renderEvents() {
    var rows = LB_DB.list("events", { sortBy: "date" });
    document.getElementById("eventsBody").innerHTML = rows.map(function (r) {
      return "<tr><td>" + esc(r.nom) + "</td><td>" + fmtDate(r.date) + "</td><td>" + esc(r.genre || "") + "</td>" +
        '<td><button class="btn ghost small" data-del-event="' + r.id + '">Supprimer</button></td></tr>';
    }).join("") || '<tr><td colspan="4" style="color:var(--smoke)">Aucune soirée programmée.</td></tr>';
  }

  function renderClients() {
    var rows = LB_DB.list("clients", { sortBy: "createdAt", dir: "desc" });
    document.getElementById("clientsBody").innerHTML = rows.map(function (r) {
      return "<tr><td>" + esc(r.nom) + "</td><td>" + esc(r.tel || "") + "</td><td>" + fmtDate(r.anniversaire) + "</td>" +
        "<td>" + Number(r.depense || 0).toLocaleString("fr-FR") + " F</td><td>" + esc(r.note || "") + "</td></tr>";
    }).join("") || '<tr><td colspan="5" style="color:var(--smoke)">Aucun client enregistré.</td></tr>';
  }

  function renderAll() {
    renderDashboard(); renderReservations(); renderGuestlist(); renderPrivatisations();
    renderTickets(); renderEvents(); renderClients();
  }
  renderAll();
  window.addEventListener("lebaron:update", renderAll);

  // validate / refuse actions (event delegation)
  document.querySelector("main").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-act]");
    if (btn) {
      LB_DB.update(btn.dataset.col, btn.dataset.id, { status: btn.dataset.act });
      renderAll();
      return;
    }
    var del = e.target.closest("[data-del-event]");
    if (del) {
      LB_DB.remove("events", del.dataset.delEvent);
      renderAll();
    }
  });

  // add event
  document.getElementById("eventForm").addEventListener("submit", function (e) {
    e.preventDefault();
    LB_DB.add("events", {
      nom: document.getElementById("eNom").value,
      genre: document.getElementById("eGenre").value,
      date: document.getElementById("eDate").value,
      heure: document.getElementById("eHeure").value,
      description: document.getElementById("eDesc").value,
    });
    e.target.reset();
    renderAll();
  });

  // add client (CRM)
  document.getElementById("clientForm").addEventListener("submit", function (e) {
    e.preventDefault();
    LB_DB.add("clients", {
      nom: document.getElementById("cNom").value,
      tel: document.getElementById("cTel").value,
      anniversaire: document.getElementById("cAnniv").value,
      depense: Number(document.getElementById("cDepense").value || 0),
      note: document.getElementById("cNote").value,
    });
    e.target.reset();
    renderAll();
  });

  // reset all data
  document.getElementById("resetData").addEventListener("click", function () {
    if (confirm("Effacer toutes les données de test (réservations, guestlist, billets, agenda, clients) ?")) {
      LB_DB.clearAll();
      location.reload();
    }
  });

  // ---- validation de billet (manuel) ----
  function checkCode(code) {
    var result = document.getElementById("scanResult");
    var tickets = LB_DB.list("tickets");
    var t = tickets.find(function (x) { return x.code === code.trim().toUpperCase(); });
    if (!t) {
      result.innerHTML = '<div class="scanResult bad">Code inconnu : ' + esc(code) + "</div>";
      return;
    }
    if (t.status === "utilise") {
      result.innerHTML = '<div class="scanResult bad">Billet déjà utilisé — ' + esc(t.nom) + "</div>";
      return;
    }
    LB_DB.update("tickets", t.id, { status: "utilise" });
    result.innerHTML = '<div class="scanResult ok">Accès validé — ' + esc(t.nom) + " (" + t.qte + " pers.)</div>";
    renderTickets();
  }
  document.getElementById("manualCheck").addEventListener("click", function () {
    var v = document.getElementById("manualCode").value;
    if (v) checkCode(v);
  });

  // ---- scan caméra (jsQR) ----
  var video = document.getElementById("scanVideo");
  var stream = null;
  var scanCanvas = document.createElement("canvas");
  var scanCtx = scanCanvas.getContext("2d");
  var scanning = false;

  function scanLoop() {
    if (!scanning) return;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      scanCanvas.width = video.videoWidth;
      scanCanvas.height = video.videoHeight;
      scanCtx.drawImage(video, 0, 0, scanCanvas.width, scanCanvas.height);
      var imageData = scanCtx.getImageData(0, 0, scanCanvas.width, scanCanvas.height);
      var code = window.jsQR ? window.jsQR(imageData.data, imageData.width, imageData.height) : null;
      if (code && code.data) {
        checkCode(code.data);
      }
    }
    requestAnimationFrame(scanLoop);
  }

  document.getElementById("scanStart").addEventListener("click", function () {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then(function (s) {
      stream = s;
      video.srcObject = stream;
      scanning = true;
      document.getElementById("scanStart").style.display = "none";
      document.getElementById("scanStop").style.display = "inline-flex";
      scanLoop();
    }).catch(function () {
      document.getElementById("scanResult").innerHTML = '<div class="scanResult bad">Caméra indisponible — utilisez la saisie manuelle.</div>';
    });
  });
  document.getElementById("scanStop").addEventListener("click", function () {
    scanning = false;
    if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
    document.getElementById("scanStart").style.display = "inline-flex";
    document.getElementById("scanStop").style.display = "none";
  });
})();
