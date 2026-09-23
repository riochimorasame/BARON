(function () {
  document.getElementById("year").textContent = new Date().getFullYear();

  // header scroll state
  var header = document.getElementById("siteHeader");
  window.addEventListener("scroll", function () {
    header.classList.toggle("scrolled", window.scrollY > 8);
  });

  // hero video fallback if the file is missing (normal on first local test)
  var video = document.getElementById("heroVideo");
  var fallback = document.getElementById("heroFallback");
  fallback.style.display = "none";
  video.addEventListener("error", function () { fallback.style.display = "block"; video.style.display = "none"; });
  video.addEventListener("stalled", function () { fallback.style.display = "block"; });
  setTimeout(function () { if (video.readyState === 0) fallback.style.display = "block"; }, 1500);

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
      grid.innerHTML = '<div class="emptyState"><strong>Le programme arrive bientôt</strong>Ajoutez des soirées depuis l\'espace gérant.</div>';
      document.getElementById("heroNext").style.display = "none";
      return;
    }
    events.sort(function (a, b) { return (a.date || "").localeCompare(b.date || ""); });
    grid.innerHTML = events.map(function (ev) {
      var img = ev.affiche
        ? '<img class="posterImg" src="' + esc(ev.affiche) + '" alt="Affiche — ' + esc(ev.nom || "Soirée") + '">'
        : '<div class="posterImg placeholder"></div>';
      return '<div class="poster">' + img +
        '<div class="posterOverlay"><span class="when">' + esc(fmtDate(ev.date)) + (ev.heure ? " · " + esc(ev.heure) : "") + "</span>" +
        "<h3>" + esc(ev.nom || "Soirée") + "</h3>" +
        "<p>" + esc(ev.description || "") + "</p>" +
        (ev.genre ? '<span class="tag">' + esc(ev.genre) + "</span>" : "") +
        '<div class="actions"><a href="https://wa.me/22890000000" class="btn small" target="_blank" rel="noopener">Contacter sur WhatsApp</a></div></div></div>';
    }).join("");
    var next = events[0];
    document.getElementById("heroNext").style.display = "flex";
    document.getElementById("heroNextName").textContent = next.nom || "Prochaine soirée";
    document.getElementById("heroNextDate").textContent = fmtDate(next.date) + (next.heure ? " · " + next.heure : "");
  }

  function refreshAll() {
    var events = LB_DB.list("events");
    renderAgenda(events);
  }
  refreshAll();

  // se met à jour en direct dès que Firestore renvoie de nouvelles données
  window.addEventListener("lebaron:update", refreshAll);
})();
