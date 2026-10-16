/* La carte du Baron — prix en FCFA.
   Pour changer un prix ou ajouter une bouteille : modifiez simplement ce
   tableau (nom, prix). Les prix sont triés du plus cher au moins cher. */
(function () {
  var MENU = [
    {
      id: "champagnes", label: "Champagnes",
      sections: [
        { items: [
          ["Cristal", 390000],
          ["Armand de Brignac (Ace of Spades)", 390000],
          ["Dom Pérignon", 340000],
          ["Ruinart Blanc de Blancs", 290000],
          ["Ruinart Brut", 270000],
          ["Moët Impérial", 240000],
          ["Moët Nectar Impérial", 75000],
          ["Veuve Clicquot Brut", 70000],
          ["Veuve Clicquot Rosé", 60000],
          ["Laurent-Perrier", 55000],
          ["Luc Belaire", 40000]
        ]}
      ]
    },
    {
      id: "tequilas-vodkas", label: "Tequilas & Vodkas",
      sections: [
        { title: "Tequilas", items: [
          ["Clase Azul Reposado", 340000],
          ["Don Julio 1942", 270000],
          ["Casamigos Blanco", 190000],
          ["Don Julio Reposado", 80000],
          ["Don Julio Blanco", 65000]
        ]},
        { title: "Vodkas", items: [
          ["Cîroc Apple & Passion", 75000],
          ["Cîroc Vodka", 55000],
          ["Belvedere Vodka", 50000],
          ["Grey Goose Vodka", 50000]
        ]},
        { title: "Au verre", items: [["Le verre", 4000]] }
      ]
    },
    {
      id: "whisky", label: "Whisky",
      sections: [
        { items: [
          ["Glenfiddich 18 ans", 85000],
          ["Chivas Regal 18 ans", 75000],
          ["Togouchi", 70000],
          ["Chivas Regal XV (15 ans)", 65000],
          ["Glenfiddich 15 ans", 65000],
          ["Johnnie Walker Double Black", 60000],
          ["Glenfiddich 12 ans", 55000],
          ["Chivas Regal 12 ans", 50000],
          ["Johnnie Walker Black Label", 45000],
          ["Jack Daniel's", 40000],
          ["Johnnie Walker Red Label", 30000]
        ]},
        { title: "Au verre", items: [["Le verre", 4000]] }
      ]
    },
    {
      id: "cognac-rhum", label: "Cognac & Rhum",
      sections: [
        { title: "Cognac", items: [
          ["Hennessy VSOP", 80000],
          ["Rémy Martin 1738", 60000],
          ["Hennessy XO", 50000]
        ]},
        { title: "Rhum & liqueurs", items: [
          ["Bumbu Rum", 50000],
          ["Jägermeister", 30000]
        ]},
        { title: "Au verre", items: [["Le verre", 4000]] }
      ]
    }
  ];

  var POSTERS = [
    ["Champagnes", "assets/menu/champagnes.jpg"],
    ["Tequilas / Vodka", "assets/menu/tequilas-vodka.jpg"],
    ["Whisky & Cognac", "assets/menu/whisky-cognac.jpg"],
    ["Liqueurs", "assets/menu/liqueurs.jpg"]
  ];

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " F"; }

  var tabs = document.getElementById("menuTabs");
  var panel = document.getElementById("menuPanel");
  if (!tabs || !panel) return;

  function render(id) {
    var cat = MENU.filter(function (c) { return c.id === id; })[0] || MENU[0];
    Array.prototype.forEach.call(tabs.children, function (b) {
      var on = b.dataset.id === cat.id;
      b.classList.toggle("on", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
      b.tabIndex = on ? 0 : -1;
    });
    panel.setAttribute("aria-labelledby", "tab-" + cat.id);
    panel.innerHTML = cat.sections.map(function (s) {
      return '<div class="menuBlock">' + (s.title ? "<h3>" + esc(s.title) + "</h3>" : "") +
        '<ul class="menuList">' + s.items.map(function (it) {
          return "<li><span>" + esc(it[0]) + "</span><span>" + fmt(it[1]) + "</span></li>";
        }).join("") + "</ul></div>";
    }).join("");
  }

  tabs.innerHTML = MENU.map(function (c) {
    return '<button role="tab" id="tab-' + c.id + '" data-id="' + c.id + '" aria-controls="menuPanel">' + esc(c.label) + "</button>";
  }).join("");
  tabs.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (b) render(b.dataset.id);
  });
  tabs.addEventListener("keydown", function (e) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    var list = Array.prototype.slice.call(tabs.children);
    var i = list.indexOf(document.activeElement);
    if (i < 0) return;
    var next = list[(i + (e.key === "ArrowRight" ? 1 : list.length - 1)) % list.length];
    render(next.dataset.id); next.focus();
  });
  render(MENU[0].id);

  // affiches de la carte + visionneuse plein écran
  var strip = document.getElementById("posterStrip");
  var box = document.getElementById("lightbox");
  var boxImg = box.querySelector("img");
  strip.innerHTML = POSTERS.map(function (p, i) {
    return '<button type="button" data-i="' + i + '" aria-label="Agrandir l\'affiche ' + esc(p[0]) + '"><img src="' + p[1] + '" alt="Affiche de la carte — ' + esc(p[0]) + '" loading="lazy"></button>';
  }).join("");
  var cur = 0;
  function show(i) { cur = (i + POSTERS.length) % POSTERS.length; boxImg.src = POSTERS[cur][1]; boxImg.alt = "Affiche de la carte — " + POSTERS[cur][0]; box.hidden = false; document.body.style.overflow = "hidden"; box.querySelector(".close").focus(); }
  function hide() { box.hidden = true; document.body.style.overflow = ""; }
  strip.addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) show(+b.dataset.i); });
  box.addEventListener("click", function (e) {
    if (e.target.classList.contains("prev")) show(cur - 1);
    else if (e.target.classList.contains("next")) show(cur + 1);
    else if (e.target !== boxImg) hide();
  });
  document.addEventListener("keydown", function (e) {
    if (box.hidden) return;
    if (e.key === "Escape") hide();
    else if (e.key === "ArrowRight") show(cur + 1);
    else if (e.key === "ArrowLeft") show(cur - 1);
  });
})();
