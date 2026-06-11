/* =========================================================
   rho (Robotics Harness Optimization) - FINAL build
   Synthesis: Variant C narrative shell + Variant B task
   explorer + Variant A lazy-load discipline.
   No external dependencies, no CDN, no build step.
   All numbers are faithful to the paper copy deck; rollout
   rewards come straight from the rollout filenames; per-task
   status (strength / tradeoff / hardest) comes from the paper's
   honesty note.
   ========================================================= */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var V = "static/videos/";
  var P = "static/images/";

  /* ========== Robosuite task data (ported from Variant B) ========== */
  var TASKS = [
    {
      id: "cube_lifting", name: "Cube lift", tag: "saturates", status: "win",
      video: V + "cube_lifting_reward1.000.mp4",
      poster: P + "poster_cube_lifting_reward1.000.jpg",
      reward: "reward 1.000",
      caption: "A single execution of the candidate repository, no VDM, and no LLM code-generation calls.",
      vs: "70.0% (490/700) under single-turn S4 deployment.",
      nearMiss: { video: V + "cube_lifting_best_failed_reward_0p546_trial_39.mp4", poster: P + "poster_cube_lifting_best_failed_reward_0p546_trial_39.jpg", reward: "reward 0.546", caption: "RHO inherits the spatial-reasoning limits of the LLM that drives its search." }
    },
    {
      id: "cube_stack", name: "Cube stack", tag: "win", status: "win",
      video: V + "cube_stack_reward1.000.mp4",
      poster: P + "poster_cube_stack_reward1.000.jpg",
      reward: "reward 1.000",
      caption: "A single execution of the candidate repository, no VDM, and no LLM code-generation calls.",
      vs: "70.0% (490/700) under single-turn S4 deployment.",
      nearMiss: { video: V + "cube_stack_best_failed_reward_0p008_trial_22.mp4", poster: P + "poster_cube_stack_best_failed_reward_0p008_trial_22.jpg", reward: "reward 0.008", caption: "RHO inherits the spatial-reasoning limits of the LLM that drives its search." }
    },
    {
      id: "cube_restack", name: "Cube restack", tag: "below baseline", status: "lose",
      video: V + "cube_restack_reward1.000.mp4",
      poster: P + "poster_cube_restack_reward1.000.jpg",
      reward: "reward 1.000",
      caption: "A single execution of the candidate repository, no VDM, and no LLM code-generation calls.",
      vs: "",
      nearMiss: { video: V + "cube_restack_best_failed_reward_0p009_trial_88.mp4", poster: P + "poster_cube_restack_best_failed_reward_0p009_trial_88.jpg", reward: "reward 0.009", caption: "RHO inherits the spatial-reasoning limits of the LLM that drives its search." }
    },
    {
      id: "spill_wipe", name: "Spill wipe", tag: "saturates", status: "win",
      video: V + "spill_wipe_reward1.000.mp4",
      poster: P + "poster_spill_wipe_reward1.000.jpg",
      reward: "reward 1.000",
      caption: "A single execution of the candidate repository, no VDM, and no LLM code-generation calls.",
      vs: "70.0% (490/700) under single-turn S4 deployment."
    },
    {
      id: "two_arm_handover", name: "Two-arm handover", tag: "best win", status: "win",
      video: V + "two_arm_handover_reward1.000.mp4",
      poster: P + "poster_two_arm_handover_reward1.000.jpg",
      reward: "reward 1.000",
      caption: "A single execution of the candidate repository, no VDM, and no LLM code-generation calls.",
      vs: "70.0% (490/700) under single-turn S4 deployment.",
      nearMiss: { video: V + "two_arm_handover_best_failed_reward_0p068_trial_50.mp4", poster: P + "poster_two_arm_handover_best_failed_reward_0p068_trial_50.jpg", reward: "reward 0.068", caption: "RHO inherits the spatial-reasoning limits of the LLM that drives its search." }
    },
    {
      id: "two_arm_lift", name: "Two-arm lift", tag: "below baseline", status: "lose",
      video: V + "two_arm_lift_reward1.000.mp4",
      poster: P + "poster_two_arm_lift_reward1.000.jpg",
      reward: "reward 1.000",
      caption: "A single execution of the candidate repository, no VDM, and no LLM code-generation calls.",
      vs: "",
      nearMiss: { video: V + "two_arm_lift_best_failed_reward_0p330_trial_47.mp4", poster: P + "poster_two_arm_lift_best_failed_reward_0p330_trial_47.jpg", reward: "reward 0.330", caption: "RHO inherits the spatial-reasoning limits of the LLM that drives its search." }
    },
    {
      id: "nut_assembly", name: "Nut assembly", tag: "hardest", status: "hard",
      video: V + "nut_assembly_success_reward_1p000_trial_56.mp4",
      poster: P + "poster_nut_assembly_success_reward_1p000_trial_56.jpg",
      reward: "reward 1.000",
      caption: "A single execution of the candidate repository, no VDM, and no LLM code-generation calls.",
      vs: "RHO inherits the spatial-reasoning limits of the LLM that drives its search.",
      nearMiss: { video: V + "nut_assembly_best_failed_reward_0p006_trial_11.mp4", poster: P + "poster_nut_assembly_best_failed_reward_0p006_trial_11.jpg", reward: "reward 0.006", caption: "RHO inherits the spatial-reasoning limits of the LLM that drives its search." }
    }
  ];

  /* ========== Lazy-load + autoplay videos (from Variant A) ========== */
  var lazyVideos = Array.prototype.slice.call(document.querySelectorAll("video[data-lazy]"));

  function loadVideo(video) {
    if (video.dataset.loaded) {
      var pp = video.play();
      if (pp && typeof pp.catch === "function") { pp.catch(function () {}); }
      return;
    }
    var src = video.getAttribute("data-src");
    if (!src) { return; }
    var source = document.createElement("source");
    source.src = src;
    source.type = "video/mp4";
    video.appendChild(source);
    video.load();
    video.dataset.loaded = "1";
    var p = video.play();
    if (p && typeof p.catch === "function") { p.catch(function () {}); }
  }

  if ("IntersectionObserver" in window) {
    var vidObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var v = entry.target;
        if (entry.isIntersecting) {
          loadVideo(v);
        } else if (v.dataset.loaded && !v.paused) {
          v.pause();
        }
      });
    }, { rootMargin: "200px 0px", threshold: 0.1 });
    lazyVideos.forEach(function (v) { vidObs.observe(v); });
  } else {
    lazyVideos.forEach(loadVideo);
  }

  /* ========== Task explorer (grafted from Variant B) ========== */
  var rail = document.getElementById("task-rail");
  var stageVideo = document.getElementById("stage-video");
  var stageName = document.getElementById("stage-name");
  var stageReward = document.getElementById("stage-reward");
  var stageCaption = document.getElementById("stage-caption");
  var stageVs = document.getElementById("stage-vs");
  var nutToggle = document.getElementById("nut-toggle");
  var currentTask = null;

  function swapStageVideo(src, poster, doLoad) {
    if (!stageVideo) { return; }
    stageVideo.setAttribute("poster", poster);
    // Replace the lazily-injected <source> (if any) and reset load state.
    var existing = stageVideo.querySelector("source");
    if (existing) { existing.parentNode.removeChild(existing); }
    stageVideo.setAttribute("data-src", src);
    stageVideo.dataset.loaded = "";
    // On init we only prepare the source; the IntersectionObserver loads it
    // when the explorer scrolls into view. On user interaction we load now.
    if (doLoad) { loadVideo(stageVideo); }
  }

  function setVs(text, status) {
    if (!stageVs) { return; }
    if (!text) {
      stageVs.hidden = true;
      stageVs.textContent = "";
      stageVs.className = "vs-line";
      return;
    }
    stageVs.hidden = false;
    stageVs.textContent = text;
    stageVs.className = "vs-line " + (status === "lose" ? "lose" : (status === "hard" ? "hard" : "win"));
  }

  function findTask(id) {
    for (var k = 0; k < TASKS.length; k++) { if (TASKS[k].id === id) { return TASKS[k]; } }
    return null;
  }

  function selectTask(id, doLoad) {
    var t = findTask(id);
    if (!t) { return; }
    currentTask = t;

    if (rail) {
      var btns = rail.querySelectorAll(".tab");
      btns.forEach(function (btn) {
        var on = btn.dataset.task === id;
        btn.classList.toggle("is-active", on);
        btn.setAttribute("aria-selected", on ? "true" : "false");
      });
    }

    if (stageName) { stageName.textContent = t.name; }
    if (stageReward) { stageReward.textContent = t.reward; stageReward.className = "reward-badge"; }
    if (stageCaption) { stageCaption.innerHTML = t.caption; }
    setVs(t.vs, t.status);
    swapStageVideo(t.video, t.poster, doLoad);

    if (nutToggle) {
      if (t.nearMiss) {
        nutToggle.hidden = false;
        nutToggle.querySelectorAll(".seg").forEach(function (s) {
          s.classList.toggle("is-active", s.dataset.nut === "success");
        });
      } else {
        nutToggle.hidden = true;
      }
    }
  }

  if (rail) {
    TASKS.forEach(function (t, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "tab" + (i === 0 ? " is-active" : "");
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", i === 0 ? "true" : "false");
      b.dataset.task = t.id;
      var dotClass = t.status === "lose" ? "lose" : (t.status === "hard" ? "hard" : "win");
      b.innerHTML =
        '<span class="tab-dot ' + dotClass + '"></span>' +
        '<span class="tab-name">' + t.name + "</span>" +
        '<span class="tab-tag">' + t.tag + "</span>";
      b.addEventListener("click", function () { selectTask(t.id, true); });
      b.addEventListener("keydown", function (ev) {
        var tabs = Array.prototype.slice.call(rail.querySelectorAll(".tab"));
        var idx = tabs.indexOf(b);
        if (ev.key === "ArrowDown" || ev.key === "ArrowRight") {
          ev.preventDefault(); var n = tabs[(idx + 1) % tabs.length]; n.focus(); selectTask(n.dataset.task, true);
        } else if (ev.key === "ArrowUp" || ev.key === "ArrowLeft") {
          ev.preventDefault(); var p = tabs[(idx - 1 + tabs.length) % tabs.length]; p.focus(); selectTask(p.dataset.task, true);
        }
      });
      rail.appendChild(b);
    });
  }

  if (nutToggle) {
    nutToggle.querySelectorAll(".seg").forEach(function (s) {
      s.addEventListener("click", function () {
        var t = currentTask;
        if (!t || !t.nearMiss) { return; }
        var isFail = s.dataset.nut === "fail";
        var data = isFail ? t.nearMiss : { video: t.video, poster: t.poster, reward: t.reward, caption: t.caption };
        nutToggle.querySelectorAll(".seg").forEach(function (x) {
          x.classList.toggle("is-active", x === s);
        });
        if (stageReward) { stageReward.textContent = data.reward; stageReward.className = "reward-badge " + (isFail ? "fail" : ""); }
        if (stageCaption) { stageCaption.innerHTML = data.caption; }
        swapStageVideo(data.video, data.poster, true);
      });
    });
  }

  // Initialize explorer to first task (without forcing an immediate load;
  // the lazy observer plays it once the section scrolls into view).
  selectTask(TASKS[0].id);
  if (stageVideo) { stageVideo.dataset.loaded = ""; }

  /* ========== Scroll reveal (from Variant C) ========== */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  } else {
    var revObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); revObs.unobserve(e.target); }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) { revObs.observe(el); });
  }

  /* ========== Count-up numbers (from Variant C) ========== */
  function formatNum(value, decimals) {
    return decimals > 0 ? value.toFixed(decimals) : String(Math.round(value));
  }
  function animateCount(el) {
    var raw = el.getAttribute("data-count");
    var target = parseFloat(raw);
    if (isNaN(target)) { return; }
    var suffix = el.getAttribute("data-suffix") || "";
    var decimals = (raw.split(".")[1] || "").length;
    if (reduceMotion) { el.textContent = formatNum(target, decimals) + suffix; return; }
    var duration = 1100, start = null;
    function frame(ts) {
      if (start === null) { start = ts; }
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = formatNum(target * eased, decimals) + suffix;
      if (p < 1) { requestAnimationFrame(frame); }
      else { el.textContent = formatNum(target, decimals) + suffix; }
    }
    requestAnimationFrame(frame);
  }
  var countEls = Array.prototype.slice.call(document.querySelectorAll("[data-count]"));
  if (!("IntersectionObserver" in window)) {
    countEls.forEach(animateCount);
  } else {
    var cntObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { animateCount(e.target); cntObs.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    countEls.forEach(function (el) { cntObs.observe(el); });
  }

  /* ========== Animated comparison bars (grafted from Variant B) ========== */
  var barWrap = document.getElementById("struct-bars");
  function fillBars() {
    if (!barWrap) { return; }
    barWrap.querySelectorAll(".bar-fill").forEach(function (bf) {
      var w = bf.getAttribute("data-w");
      bf.style.width = reduceMotion ? (w + "%") : "0%";
      if (!reduceMotion) {
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { bf.style.width = w + "%"; });
        });
      }
    });
  }
  if (barWrap) {
    if (!("IntersectionObserver" in window)) {
      fillBars();
    } else {
      var barObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { fillBars(); barObs.unobserve(e.target); }
        });
      }, { threshold: 0.35 });
      barObs.observe(barWrap);
    }
  }

  /* ========== Sticky nav + scroll progress (from Variant C) ========== */
  var topnav = document.getElementById("topnav");
  var progressFill = document.getElementById("progress-fill");
  var ticking = false;
  function onScroll() {
    var y = window.pageYOffset || document.documentElement.scrollTop;
    if (topnav) { topnav.classList.toggle("scrolled", y > 60); }
    if (progressFill) {
      var docH = document.documentElement.scrollHeight - window.innerHeight;
      var pct = docH > 0 ? (y / docH) * 100 : 0;
      progressFill.style.width = pct.toFixed(2) + "%";
    }
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  /* ========== Disabled "soon" links ========== */
  Array.prototype.slice.call(document.querySelectorAll('[data-soon]')).forEach(function (el) {
    el.addEventListener("click", function (e) { e.preventDefault(); });
  });

  /* ========== Copy BibTeX ========== */
  var copyBtn = document.getElementById("copy-bib");
  var bibBlock = document.getElementById("bibtex-block");
  if (copyBtn && bibBlock) {
    copyBtn.addEventListener("click", function () {
      var text = bibBlock.innerText || bibBlock.textContent;
      function done() {
        copyBtn.textContent = "Copied";
        copyBtn.classList.add("copied");
        setTimeout(function () { copyBtn.textContent = "Copy"; copyBtn.classList.remove("copied"); }, 1800);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text, done); });
      } else {
        fallbackCopy(text, done);
      }
    });
  }
  function fallbackCopy(text, cb) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "absolute";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
    if (cb) { cb(); }
  }
})();
