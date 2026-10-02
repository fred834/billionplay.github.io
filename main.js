(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------------------------------------------------------- 언어 전환 */
  (function language() {
    var buttons = Array.prototype.slice.call(document.querySelectorAll(".lang-btn"));
    if (!buttons.length) return;

    function setLang(lang) {
      root.setAttribute("data-lang", lang);
      root.setAttribute("lang", lang);
      buttons.forEach(function (b) {
        b.setAttribute("aria-pressed", String(b.dataset.setLang === lang));
      });
      try { localStorage.setItem("bp-lang", lang); } catch (e) {}
    }

    var fromQuery = null;
    try {
      var q = new URLSearchParams(window.location.search).get("lang");
      if (q === "ko" || q === "kr") fromQuery = "ko";
      if (q === "en") fromQuery = "en";
    } catch (e) {}

    var saved = null;
    try { saved = localStorage.getItem("bp-lang"); } catch (e) {}

    var initial = fromQuery || saved;
    if (!initial) {
      initial = (navigator.language || "ko").toLowerCase().indexOf("ko") === 0 ? "ko" : "en";
    }
    setLang(initial);

    buttons.forEach(function (b) {
      b.addEventListener("click", function () { setLang(b.dataset.setLang); });
    });
  })();

  /* ------------------------------------------------------- 모바일 내비 */
  (function nav() {
    var toggle = document.querySelector(".nav-toggle");
    var menu = document.getElementById("primary-nav");
    if (!toggle || !menu) return;

    function close() {
      menu.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    }

    toggle.addEventListener("click", function () {
      var open = menu.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });

    menu.addEventListener("click", function (e) {
      if (e.target.tagName === "A") close();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 1023) close();
    });
  })();

  /* ---------------------------------------------------------- 갤러리 */
  (function gallery() {
    var el = document.querySelector("[data-gallery]");
    if (!el) return;

    var grid = el.querySelector(".gallery__grid");
    var items = Array.prototype.slice.call(grid.querySelectorAll(".gallery__item"));
    var nav = el.querySelector(".gallery__nav");
    var status = el.querySelector(".gallery__status");

    function perPage() {
      return window.innerWidth <= 767 ? 6 : 6;
    }

    var pages = Math.ceil(items.length / perPage());

    // 한 페이지뿐이면 내비게이션 자체를 제거한다.
    if (pages <= 1) {
      if (nav) nav.remove();
      return;
    }

    var prev = el.querySelector("[data-gallery-prev]");
    var next = el.querySelector("[data-gallery-next]");
    var dotsWrap = el.querySelector(".gallery__dots");
    var current = 0;

    function render(index) {
      var size = perPage();
      pages = Math.ceil(items.length / size);
      current = Math.max(0, Math.min(index, pages - 1));

      items.forEach(function (item, i) {
        var visible = Math.floor(i / size) === current;
        item.hidden = !visible;
      });

      if (prev) prev.setAttribute("aria-disabled", String(current === 0));
      if (next) next.setAttribute("aria-disabled", String(current === pages - 1));

      if (dotsWrap) {
        dotsWrap.innerHTML = "";
        for (var p = 0; p < pages; p++) {
          var dot = document.createElement("button");
          dot.type = "button";
          dot.className = "gallery__dot";
          dot.setAttribute("aria-current", String(p === current));
          dot.setAttribute("aria-label", (p + 1) + " / " + pages);
          (function (target) {
            dot.addEventListener("click", function () { render(target); });
          })(p);
          dotsWrap.appendChild(dot);
        }
      }

      if (status) status.textContent = (current + 1) + " / " + pages;
    }

    if (prev) prev.addEventListener("click", function () {
      if (prev.getAttribute("aria-disabled") !== "true") render(current - 1);
    });
    if (next) next.addEventListener("click", function () {
      if (next.getAttribute("aria-disabled") !== "true") render(current + 1);
    });

    grid.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { render(current + 1); }
      if (e.key === "ArrowLeft") { render(current - 1); }
    });

    /* 모바일 스와이프 — 수평 의도일 때만 반응 */
    var sx = 0, sy = 0, tracking = false;
    grid.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 1) return;
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
      tracking = true;
    }, { passive: true });

    grid.addEventListener("touchend", function (e) {
      if (!tracking) return;
      tracking = false;
      var t = e.changedTouches[0];
      var dx = t.clientX - sx;
      var dy = t.clientY - sy;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      render(dx < 0 ? current + 1 : current - 1);
    }, { passive: true });

    var lastWidth = window.innerWidth;
    window.addEventListener("resize", function () {
      if (window.innerWidth === lastWidth) return;
      lastWidth = window.innerWidth;
      render(current);
    });

    render(0);
  })();

  /* ------------------------------------------- 영상: 모션 축소 대응 */
  (function video() {
    var v = document.querySelector("[data-ua-video]");
    if (!v) return;

    function apply() {
      if (reduceMotion.matches) {
        v.removeAttribute("autoplay");
        v.pause();
        v.setAttribute("controls", "");
      } else {
        v.removeAttribute("controls");
        var p = v.play();
        if (p && typeof p.catch === "function") p.catch(function () {});
      }
    }
    apply();
    if (reduceMotion.addEventListener) reduceMotion.addEventListener("change", apply);
  })();

  /* ----------------------------------------------------- 진입 애니메이션 */
  (function reveal() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
    if (!nodes.length) return;

    if (reduceMotion.matches || !("IntersectionObserver" in window)) {
      nodes.forEach(function (n) { n.classList.add("is-in"); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    }, { threshold: 0.05, rootMargin: "0px 0px -8% 0px" });

    nodes.forEach(function (n, i) {
      n.style.setProperty("--d", (i % 4) * 60 + "ms");
      io.observe(n);
    });
  })();

  /* ------------------------------------------------- 현재 연도 자동 표기 */
  (function year() {
    var nodes = document.querySelectorAll("[data-year]");
    var y = new Date().getFullYear();
    Array.prototype.forEach.call(nodes, function (n) { n.textContent = y; });
  })();
})();
