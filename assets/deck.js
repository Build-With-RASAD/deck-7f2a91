/* Rafal Altaif — deck runtime
   - scroll-snap active-slide detection
   - entrance stagger assignment
   - keyboard navigation
   - progress rail + counter
   - no dependencies, works from file://
*/
(function () {
  var deck = document.querySelector(".deck");
  if (!deck) return;

  var slides = Array.prototype.slice.call(document.querySelectorAll(".slide"));
  var counter = document.querySelector("[data-counter]");
  var rail = document.querySelector(".rail__fill");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* assign stagger indices */
  slides.forEach(function (slide) {
    slide.querySelectorAll("[data-anim]").forEach(function (el, i) {
      el.style.setProperty("--i", Math.min(i, 12));
    });
    slide.querySelectorAll(".strip__bar").forEach(function (el, i) {
      el.style.setProperty("--i", i);
    });
    slide.querySelectorAll(".seg i").forEach(function (el, i) {
      el.style.setProperty("--i", i);
    });
  });

  /* count-up on first activation — respects reduced motion */
  function countUp(el) {
    var raw = el.getAttribute("data-count") || "";
    var target = parseFloat(raw.replace(/,/g, ""));
    if (!isFinite(target) || reduce.matches) return;
    var dec = (raw.split(".")[1] || "").length;
    var grouped = el.hasAttribute("data-group");
    var t0 = performance.now();
    var dur = 900;
    function frame(t) {
      var p = Math.min(1, (t - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      var v = (target * e).toFixed(dec);
      el.textContent = grouped
        ? Number(v).toLocaleString("en-US", {
            minimumFractionDigits: dec,
            maximumFractionDigits: dec,
          })
        : v;
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = raw;
    }
    requestAnimationFrame(frame);
  }
  function activateCounts(slide) {
    slide.querySelectorAll("[data-count]").forEach(function (el) {
      if (el.getAttribute("data-counted")) return;
      el.setAttribute("data-counted", "1");
      countUp(el);
    });
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function setActive(slide) {
    if (!slide || slide.classList.contains("is-active")) return;
    slides.forEach(function (s) {
      s.classList.remove("is-active");
    });
    slide.classList.add("is-active", "is-seen");
    activateCounts(slide);

    var i = slides.indexOf(slide) + 1;
    if (counter) counter.textContent = pad(i);
    document.body.classList.toggle(
      "on-ink",
      slide.classList.contains("slide--ink") || slide.classList.contains("slide--copper")
    );
    if (window.history && history.replaceState) {
      history.replaceState(null, "", "#" + (slide.id || "s" + i));
    }
  }

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          setActive(entry.target);
        }
      });
    },
    { root: deck, threshold: [0.5, 0.75] }
  );
  slides.forEach(function (s) {
    io.observe(s);
  });

  function progress() {
    var max = deck.scrollHeight - deck.clientHeight;
    var p = max > 0 ? deck.scrollTop / max : 0;
    if (rail) rail.style.setProperty("--p", p.toFixed(4));
  }
  deck.addEventListener("scroll", progress, { passive: true });
  window.addEventListener("resize", progress);
  progress();

  function current() {
    var idx = slides.findIndex(function (s) {
      return s.classList.contains("is-active");
    });
    return idx < 0 ? 0 : idx;
  }

  function go(idx) {
    var target = slides[Math.max(0, Math.min(slides.length - 1, idx))];
    if (!target) return;
    target.scrollIntoView({
      behavior: reduce.matches ? "auto" : "smooth",
      block: "start",
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var k = e.key;
    if (k === "ArrowDown" || k === "PageDown" || k === " ") {
      e.preventDefault();
      go(current() + 1);
    } else if (k === "ArrowUp" || k === "PageUp") {
      e.preventDefault();
      go(current() - 1);
    } else if (k === "ArrowLeft") {
      e.preventDefault();
      go(current() + 1);
    } else if (k === "ArrowRight") {
      e.preventDefault();
      go(current() - 1);
    } else if (k === "Home") {
      e.preventDefault();
      go(0);
    } else if (k === "End") {
      e.preventDefault();
      go(slides.length - 1);
    }
  });

  /* ---- v2: stagger indices for new components ---- */
  slides.forEach(function (slide) {
    slide.querySelectorAll(".pwall button").forEach(function (el, i) {
      el.style.setProperty("--i", i);
    });
    slide.querySelectorAll(".bar").forEach(function (el, i) {
      el.style.setProperty("--i", i);
    });
    slide.querySelectorAll(".step").forEach(function (el, i) {
      el.style.setProperty("--i", i);
    });
  });

  /* ---- v2: lightbox for the page wall ---- */
  var lb = null;
  function ensureLb() {
    if (lb) return lb;
    lb = document.createElement("div");
    lb.className = "lightbox";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("aria-label", "معاينة الصفحة");
    lb.innerHTML =
      '<button class="lightbox__x" type="button" aria-label="إغلاق">&times;</button>' +
      '<div class="lb-stack"><img alt=""><p class="lightbox__cap"></p></div>';
    document.body.appendChild(lb);
    lb.addEventListener("click", function (e) {
      if (e.target === lb || e.target.classList.contains("lightbox__x")) closeLb();
    });
    return lb;
  }
  function openLb(src, cap, alt) {
    var box = ensureLb();
    box.querySelector("img").src = src;
    box.querySelector("img").alt = alt || "";
    box.querySelector(".lightbox__cap").textContent = cap || "";
    box.classList.add("is-open");
  }
  function closeLb() {
    if (lb) lb.classList.remove("is-open");
  }
  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest("[data-full]");
    if (!btn) return;
    e.preventDefault();
    openLb(btn.getAttribute("data-full"), btn.getAttribute("data-cap"), btn.getAttribute("data-alt"));
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeLb();
  });

  /* ---- v2: cue that jumps to a target slide ---- */
  function jumpTo(sel) {
    var t = sel && document.querySelector(sel);
    if (!t || !t.classList.contains("slide")) return;
    go(slides.indexOf(t));
  }
  document.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest("[data-goto]");
    if (!el) return;
    e.preventDefault();
    jumpTo(el.getAttribute("data-goto"));
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    var el = e.target.closest && e.target.closest("[data-goto]");
    if (!el) return;
    e.preventDefault();
    jumpTo(el.getAttribute("data-goto"));
  });

  /* ---- v2: before/after comparison sliders ---- */
  document.querySelectorAll(".cmp__range").forEach(function (r) {
    var wrap = r.closest(".cmp");
    if (!wrap) return;
    var sync = function () {
      wrap.style.setProperty("--x", r.value + "%");
    };
    r.addEventListener("input", sync);
    sync();
  });

  /* deep link */
  if (location.hash) {
    var target = document.querySelector(location.hash);
    if (target && target.classList.contains("slide")) {
      requestAnimationFrame(function () {
        target.scrollIntoView({ block: "start" });
      });
    }
  }

  /* first paint */
  setActive(slides[0]);
})();
