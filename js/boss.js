(function () {
  function esc(s) { return (s || "").toString().replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

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

  function renderDepartement(dep) {
    var rows = LB_DB.list("produits", { sortBy: "createdAt", dir: "desc" }).filter(function (p) { return p.departement === dep.id; });
    var total = rows.reduce(function (sum, p) { return sum + Number(p.prix || 0) * Number(p.quantite || 0); }, 0);
    document.getElementById("ca-" + dep.id).textContent = total.toLocaleString("fr-FR") + " F CFA";
    document.getElementById("body-" + dep.id).innerHTML = rows.map(function (p) {
      var montant = Number(p.prix || 0) * Number(p.quantite || 0);
      return "<tr><td>" + esc(p.nom) + "</td><td>" + Number(p.quantite || 0) + "</td><td>" +
        Number(p.prix || 0).toLocaleString("fr-FR") + " F</td><td>" + montant.toLocaleString("fr-FR") + " F</td></tr>";
    }).join("") || '<tr><td colspan="4" style="color:var(--smoke)">Aucun produit enregistré.</td></tr>';
    return total;
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
})();
