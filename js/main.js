(function () {
  document.getElementById("year").textContent = new Date().getFullYear();

  // header scroll state
  var header = document.getElementById("siteHeader");
  window.addEventListener("scroll", function () {
    header.classList.toggle("scrolled", window.scrollY > 8);
  });

  // hero video fallback if the file is missing (normal on first local test)
  var video = document.getElementById("heroVideo");
  // grand écran : version paysage de la vidéo ; mobile : version verticale (déjà dans le HTML)
  if (window.matchMedia("(min-width: 900px)").matches) {
    video.src = "assets/hero-wide.mp4";
    video.load();
    var pp = video.play(); if (pp && pp.catch) pp.catch(function () {});
  }
  var fallback = document.getElementById("heroFallback");
  fallback.style.display = "none";
  video.addEventListener("error", function () { fallback.style.display = "block"; video.style.display = "none"; });
  video.addEventListener("loadeddata", function () { fallback.style.display = "none"; });
  video.addEventListener("playing", function () { fallback.style.display = "none"; });
  setTimeout(function () { if (video.readyState === 0) fallback.style.display = "block"; }, 6000);

  // mobile menu
  var toggle = document.getElementById("menuToggle");
  var navScroll = document.getElementById("navScroll");
  function setMenu(open) {
    navScroll.classList.toggle("open", open);
    toggle.textContent = open ? "✕" : "☰";
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  }
  toggle.addEventListener("click", function () {
    setMenu(!navScroll.classList.contains("open"));
  });
  navScroll.addEventListener("click", function (e) {
    if (e.target.tagName === "A") setMenu(false);
  });

  // audio widget
  var audio = document.getElementById("ambianceAudio");
  var audioBtn = document.getElementById("audioToggle");
  var audioWidget = document.getElementById("audioWidget");
  audio.preload = "auto";

  function setPlayingUI(playing) {
    audioBtn.textContent = playing ? "❚❚" : "▶";
    audioWidget.classList.toggle("paused", !playing);
  }

  function tryAutoplay() {
    // Les navigateurs bloquent le son automatique tant que la personne n'a
    // pas encore interagi avec la page — on tente quand même au chargement...
    var p = audio.play();
    if (p && typeof p.then === "function") {
      p.then(function () { setPlayingUI(true); }).catch(function () {
        // ...et sinon, on démarre au tout premier geste (clic, appui, scroll,
        // touche) n'importe où sur la page, une seule fois.
        var start = function () {
          audio.play().then(function () { setPlayingUI(true); }).catch(function () {});
          ["click", "touchstart", "keydown", "scroll"].forEach(function (evt) {
            document.removeEventListener(evt, start);
          });
        };
        ["click", "touchstart", "keydown", "scroll"].forEach(function (evt) {
          document.addEventListener(evt, start, { once: true, passive: true });
        });
      });
    }
  }

  audioBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    if (audio.paused) {
      audio.play().then(function () { setPlayingUI(true); }).catch(function () { /* fichier assets/ambiance.mp3 absent pour l'instant */ });
    } else {
      audio.pause();
      setPlayingUI(false);
    }
  });

  setPlayingUI(false);
  tryAutoplay();

  function esc(s) { return (s || "").toString().replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmtDate(iso) {
    if (!iso) return "";
    var d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  }


  document.getElementById("newsForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var email = document.getElementById("newsEmail").value;
    LB_DB.add("newsletter", { email: email });
    document.getElementById("newsConfirm").classList.add("show");
    e.target.reset();
  });

  // ---- agenda (affiches) ----
  function renderAgenda(events) {
    var grid = document.getElementById("agendaGrid");
    if (!events.length) {
      grid.innerHTML = '<div class="emptyState"><strong>Le programme arrive bientôt</strong>Suivez-nous ou écrivez-nous sur WhatsApp pour connaître les prochaines soirées.</div>';
      document.getElementById("heroNext").style.display = "none";
      return;
    }
    events.sort(function (a, b) { return (a.date || "").localeCompare(b.date || ""); });
    grid.innerHTML = events.map(function (ev, idx) {
      var fb = ["assets/gallery/video-4.jpg", "assets/gallery/video-1.jpg", "assets/gallery/video-5.jpg", "assets/gallery/video-3.jpg"];
      var src = ev.affiche || fb[idx % fb.length];
      var img = '<img class="posterImg" src="' + esc(src) + '" alt="Affiche — ' + esc(ev.nom || "Soirée") + '" loading="lazy">';
      return '<div class="poster">' + img +
        '<div class="posterOverlay"><span class="when">' + esc(fmtDate(ev.date)) + (ev.heure ? " · " + esc(ev.heure) : "") + "</span>" +
        "<h3>" + esc(ev.nom || "Soirée") + "</h3>" +
        "<p>" + esc(ev.description || "") + "</p>" +
        (ev.genre ? '<span class="tag">' + esc(ev.genre) + "</span>" : "") +
        '<div class="actions"><a href="https://wa.me/22870228564" class="btn small" target="_blank" rel="noopener">Contacter sur WhatsApp</a></div></div></div>';
    }).join("");

  }

  function refreshAll() {
    var today = new Date().toISOString().slice(0, 10);
    var demo = ["Ouverture — Nuit Afrobeat", "Baron Sessions — Hip-Hop/RnB", "Électro Nights"];
    // on n'affiche que les soirées à venir, et jamais les soirées de démonstration
    var events = LB_DB.list("events").filter(function (e) {
      return (!e.date || e.date >= today) && demo.indexOf(e.nom) < 0;
    });
    renderAgenda(events);
  }
  refreshAll();

  // se met à jour en direct dès que Firestore renvoie de nouvelles données
  window.addEventListener("lebaron:update", refreshAll);
})();
