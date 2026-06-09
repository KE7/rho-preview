/* ============================================================
   charts.js, the three native interactive charts for the live
   RHO project page, plus the structural-bars tooltip upgrade.

   Each chart is an independent IIFE (no globals leak, no clash
   with script.js). All data is embedded; no CDN, no build step;
   opens over file://. Numbers are faithful to the paper:
   verified against notes/thread-inputs/results.md, experiments
   .tex, experiments-appendix.tex, and .fig-sources state.json.

     1. LIBERO-PRO grouped bars   -> #libero-host
     2. Evolution trajectory      -> #evo-chart
     3. Per-task progression      -> #pertask-host
     4. Structural-prior bars     -> #struct-bars (enhance only)
   ============================================================ */

/* ============================================================
   1. LIBERO-PRO grouped bar chart (inline SVG from real numbers)
   ============================================================ */
(function () {
  "use strict";

  var host = document.getElementById("libero-host");
  if (!host) { return; }

  // Cells = (object/goal/spatial) x (swap/task). 500 trials/cell, 3,000 total.
  var CELLS = [
    { key: "obj-swap",  suite: "Object",  kind: "Swap" },
    { key: "obj-task",  suite: "Object",  kind: "Task" },
    { key: "goal-swap", suite: "Goal",    kind: "Swap" },
    { key: "goal-task", suite: "Goal",    kind: "Task" },
    { key: "spat-swap", suite: "Spatial", kind: "Swap" },
    { key: "spat-task", suite: "Spatial", kind: "Task" }
  ];

  var SERIES = [
    { id: "rho",     label: "RHO",  color: "#5cf2a0", avg: 45.0,
      vals: [12.2, 37.2, 50.6, 55.6, 53.0, 61.6] },
    { id: "agent0",  label: "CaP-Agent0",    color: "#ffcf5c", avg: 18.17,
      vals: [21.8, 18.2, 25.6, 16.8, 11.8, 14.0] },
    { id: "pi05",    label: "π₀.₅", color: "#38bdf8", avg: 12.83,
      vals: [17.0, 1.0, 38.0, 0.0, 20.0, 1.0] },
    { id: "openvla", label: "OpenVLA",       color: "#ff6b5c", avg: 0.0,
      vals: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0] }
  ];

  var NOTES = {
    "rho:obj-swap":   "RHO's weakest cell, below Agent0's 21.8% here",
    "pi05:obj-swap":  "π₀.₅ lives on swap cells only",
    "pi05:goal-swap": "π₀.₅ lives on swap cells only",
    "pi05:spat-swap": "π₀.₅ lives on swap cells only",
    "openvla:obj-swap": "0.0% on every cell"
  };

  var Y_MAX = 70;
  var SVGNS = "http://www.w3.org/2000/svg";

  var W = 820, H = 440;
  var M = { top: 24, right: 18, bottom: 70, left: 46 };
  var plotW = W - M.left - M.right;
  var plotH = H - M.top - M.bottom;
  var x0 = M.left, y0 = M.top;
  var baseY = y0 + plotH;

  var groupW = plotW / CELLS.length;
  var groupInner = groupW * 0.74;
  var groupPad = (groupW - groupInner) / 2;

  function yOf(v) { return baseY - (v / Y_MAX) * plotH; }

  function el(name, attrs) {
    var n = document.createElementNS(SVGNS, name);
    if (attrs) { for (var k in attrs) n.setAttribute(k, attrs[k]); }
    return n;
  }

  var active = {};
  SERIES.forEach(function (s) { active[s.id] = true; });

  var tip = document.getElementById("libero-tip");
  var svg;

  function render() {
    if (svg) { svg.remove(); }
    svg = el("svg", {
      "class": "chart-svg",
      viewBox: "0 0 " + W + " " + H,
      role: "img",
      "aria-labelledby": "libero-title"
    });

    var shown = SERIES.filter(function (s) { return active[s.id]; });
    var nb = shown.length || 1;
    var barW = groupInner / nb;

    for (var t = 0; t <= Y_MAX; t += 10) {
      var gy = yOf(t);
      svg.appendChild(el("line", { "class": "grid-line", x1: x0, y1: gy, x2: x0 + plotW, y2: gy }));
      var lbl = el("text", { "class": "tick-label", x: x0 - 8, y: gy + 4, "text-anchor": "end" });
      lbl.textContent = t;
      svg.appendChild(lbl);
    }
    svg.appendChild(el("line", { "class": "axis-base", x1: x0, y1: baseY, x2: x0 + plotW, y2: baseY }));

    var rho = SERIES[0];
    if (active[rho.id]) {
      var ry = yOf(rho.avg);
      svg.appendChild(el("line", { "class": "ref-line", x1: x0, y1: ry, x2: x0 + plotW, y2: ry }));
      var rt = el("text", { "class": "ref-tag", x: x0 + plotW, y: ry - 5, "text-anchor": "end" });
      rt.textContent = "RHO avg 45.0%";
      svg.appendChild(rt);
    }

    CELLS.forEach(function (cell, ci) {
      var gx = x0 + ci * groupW + groupPad;

      shown.forEach(function (s, si) {
        var v = s.vals[ci];
        var bx = gx + si * barW;
        var isZero = v <= 0;
        var h = isZero ? 3 : Math.max(2, (v / Y_MAX) * plotH);
        var by = isZero ? baseY - 3 : yOf(v);

        var rect = el("rect", {
          "class": "bar" + (isZero ? " zero-mark" : ""),
          x: bx + 1, y: by, width: Math.max(1, barW - 2), height: h,
          rx: 2,
          fill: isZero ? "#2d3647" : s.color,
          tabindex: "0",
          role: "img",
          "aria-label": s.label + ", " + cell.suite + " " + cell.kind + ": " + v.toFixed(1) + "%"
        });
        rect.dataset.series = s.id;
        rect.dataset.cell = cell.key;
        rect.dataset.val = v;

        rect.addEventListener("mouseenter", function () { showTip(rect, s, cell, v); });
        rect.addEventListener("mouseleave", hideTip);
        rect.addEventListener("focus", function () { showTip(rect, s, cell, v); });
        rect.addEventListener("blur", hideTip);

        svg.appendChild(rect);
      });

      var cx = x0 + ci * groupW + groupW / 2;
      var t1 = el("text", { "class": "cell-label", x: cx, y: baseY + 20, "text-anchor": "middle" });
      t1.textContent = cell.suite;
      svg.appendChild(t1);
      var t2 = el("text", { "class": "cell-sub", x: cx, y: baseY + 35, "text-anchor": "middle" });
      t2.textContent = cell.kind;
      svg.appendChild(t2);
    });

    var yt = el("text", {
      "class": "tick-label", x: -(y0 + plotH / 2), y: 14,
      transform: "rotate(-90)", "text-anchor": "middle"
    });
    yt.textContent = "success %";
    svg.appendChild(yt);

    host.insertBefore(svg, tip);
  }

  function showTip(rect, s, cell, v) {
    var note = NOTES[s.id + ":" + cell.key];
    tip.innerHTML =
      '<div class="tip-sys"><span class="swatch" style="background:' + s.color + '"></span>' + s.label + '</div>' +
      '<div class="tip-cell">' + cell.suite + " · " + cell.kind + '</div>' +
      '<div class="tip-val">' + v.toFixed(1) + '%</div>' +
      (note ? '<div class="tip-note">' + note + '</div>' : '');
    tip.hidden = false;
    positionTipToRect(rect);
    host.querySelectorAll(".bar.is-active").forEach(function (b) { b.classList.remove("is-active"); });
    rect.classList.add("is-active");
  }

  function positionTipToRect(rect) {
    var hb = host.getBoundingClientRect();
    var rb = rect.getBoundingClientRect();
    var cx = rb.left + rb.width / 2 - hb.left;
    var cy = rb.top - hb.top - 8;
    // clamp so the (-50%) tooltip never runs off the card edges
    var tw = tip.offsetWidth || 140;
    cx = Math.max(tw / 2 + 2, Math.min(hb.width - tw / 2 - 2, cx));
    tip.style.left = cx + "px";
    tip.style.top = cy + "px";
  }

  function hideTip() {
    tip.hidden = true;
    host.querySelectorAll(".bar.is-active").forEach(function (b) { b.classList.remove("is-active"); });
  }

  function buildLegend() {
    var lg = document.getElementById("libero-legend");
    SERIES.forEach(function (s) {
      var chip = document.createElement("button");
      chip.className = "legend-chip";
      chip.type = "button";
      chip.setAttribute("aria-pressed", "true");
      chip.innerHTML = '<span class="swatch" style="background:' + s.color + '"></span>' +
        '<span class="label">' + s.label + '</span>' +
        '<span class="avg"> ' + s.avg.toFixed(1) + '%</span>';
      chip.addEventListener("click", function () {
        active[s.id] = !active[s.id];
        chip.setAttribute("aria-pressed", active[s.id] ? "true" : "false");
        hideTip();
        render();
      });
      lg.appendChild(chip);
    });
  }

  function buildTable() {
    var tbl = document.getElementById("libero-table");
    var head = "<thead><tr><th>System</th>";
    CELLS.forEach(function (c) { head += "<th>" + c.suite + "<br>" + c.kind + "</th>"; });
    head += "<th>Avg</th></tr></thead>";
    var body = "<tbody>";
    SERIES.forEach(function (s) {
      body += "<tr><td>" + s.label + "</td>";
      s.vals.forEach(function (v) { body += "<td>" + v.toFixed(1) + "</td>"; });
      body += "<td><strong>" + s.avg.toFixed(1) + "</strong></td></tr>";
    });
    body += "</tbody>";
    tbl.innerHTML = head + body;
  }

  buildLegend();
  buildTable();
  render();
  window.addEventListener("resize", function () { if (!tip.hidden) { hideTip(); } });
})();

/* ============================================================
   2. Evolution trajectory (inline-SVG scatter + best-by-train)
   ============================================================ */
(function () {
  "use strict";

  if (!document.getElementById("evo-chart")) { return; }

  // gen, id, reward (mean validation reward), best (running max).
  var DATA = [
    {gen:0,id:"g0-s0",reward:0.0932,best:0.0932},
    {gen:1,id:"g1-s1",reward:0.1067,best:0.1067},
    {gen:3,id:"g3-s3",reward:0.2658,best:0.2658},
    {gen:4,id:"g4-s4",reward:0.1079,best:0.2658},
    {gen:5,id:"g5-s5",reward:0.1907,best:0.2658},
    {gen:6,id:"g6-s6",reward:0.3354,best:0.3354},
    {gen:8,id:"g8-s8",reward:0.4046,best:0.4046},
    {gen:9,id:"g9-s9",reward:0.4343,best:0.4343},
    {gen:11,id:"g11-s11",reward:0.4174,best:0.4343},
    {gen:12,id:"g12-s12",reward:0.176,best:0.4343},
    {gen:13,id:"g13-s13",reward:0.124,best:0.4343},
    {gen:14,id:"g14-s14",reward:0.435,best:0.435},
    {gen:16,id:"g16-s16",reward:0.2447,best:0.435},
    {gen:19,id:"g19-s19",reward:0.5536,best:0.5536},
    {gen:26,id:"g26-s26",reward:0.3634,best:0.5536},
    {gen:28,id:"g28-s28",reward:0.6007,best:0.6007},
    {gen:32,id:"g32-s32",reward:0.571,best:0.6007},
    {gen:37,id:"g37-s37",reward:0.5658,best:0.6007},
    {gen:38,id:"g38-s38",reward:0.6412,best:0.6412},
    {gen:39,id:"g39-s39",reward:0.3404,best:0.6412},
    {gen:40,id:"g40-s40",reward:0.3732,best:0.6412},
    {gen:41,id:"g41-s41",reward:0.5965,best:0.6412},
    {gen:42,id:"g42-s42",reward:0.6487,best:0.6487},
    {gen:44,id:"g44-s44",reward:0.6465,best:0.6487},
    {gen:46,id:"g46-s46",reward:0.6337,best:0.6487},
    {gen:50,id:"g50-s50",reward:0.5648,best:0.6487},
    {gen:52,id:"g52-s52",reward:0.6222,best:0.6487},
    {gen:54,id:"g54-s54",reward:0.6291,best:0.6487},
    {gen:55,id:"g55-s55",reward:0.6523,best:0.6523},
    {gen:57,id:"g57-s57",reward:0.6006,best:0.6523},
    {gen:58,id:"g58-s58",reward:0.5336,best:0.6523},
    {gen:60,id:"g60-s60",reward:0.5638,best:0.6523},
    {gen:61,id:"g61-s61",reward:0.6654,best:0.6654},
    {gen:62,id:"g62-s62",reward:0.5763,best:0.6654},
    {gen:64,id:"g64-s64",reward:0.7059,best:0.7059},
    {gen:65,id:"g65-s65",reward:0.607,best:0.7059},
    {gen:66,id:"g66-s66",reward:0.5899,best:0.7059},
    {gen:69,id:"g69-s69",reward:0.6672,best:0.7059},
    {gen:70,id:"g70-s70",reward:0.6779,best:0.7059},
    {gen:72,id:"g72-s72",reward:0.6381,best:0.7059},
    {gen:73,id:"g73-s73",reward:0.5894,best:0.7059},
    {gen:74,id:"g74-s74",reward:0.6002,best:0.7059},
    {gen:75,id:"g75-s75",reward:0.4917,best:0.7059},
    {gen:77,id:"g77-s77",reward:0.6638,best:0.7059},
    {gen:81,id:"g81-s81",reward:0.6403,best:0.7059},
    {gen:83,id:"g83-s83",reward:0.6416,best:0.7059},
    {gen:85,id:"g85-s85",reward:0.5483,best:0.7059},
    {gen:88,id:"g88-s88",reward:0.499,best:0.7059},
    {gen:90,id:"g90-s90",reward:0.595,best:0.7059},
    {gen:91,id:"g91-s91",reward:0.6341,best:0.7059},
    {gen:92,id:"g92-s92",reward:0.6159,best:0.7059},
    {gen:94,id:"g94-s94",reward:0.5669,best:0.7059},
    {gen:96,id:"g96-s96",reward:0.6103,best:0.7059},
    {gen:98,id:"g98-s98",reward:0.5547,best:0.7059},
    {gen:101,id:"g101-s101",reward:0.641,best:0.7059},
    {gen:102,id:"g102-s102",reward:0.5895,best:0.7059},
    {gen:104,id:"g104-s104",reward:0.6379,best:0.7059},
    {gen:106,id:"g106-s106",reward:0.5642,best:0.7059},
    {gen:107,id:"g107-s107",reward:0.5683,best:0.7059},
    {gen:108,id:"g108-s108",reward:0.7096,best:0.7096},
    {gen:111,id:"g111-s111",reward:0.5992,best:0.7096},
    {gen:113,id:"g113-s113",reward:0.6524,best:0.7096},
    {gen:114,id:"g114-s114",reward:0.6136,best:0.7096},
    {gen:115,id:"g115-s115",reward:0.6542,best:0.7096},
    {gen:116,id:"g116-s116",reward:0.6043,best:0.7096},
    {gen:117,id:"g117-s117",reward:0.6396,best:0.7096},
    {gen:119,id:"g119-s119",reward:0.6465,best:0.7096},
    {gen:127,id:"g127-s127",reward:0.7136,best:0.7136},
    {gen:129,id:"g129-s129",reward:0.6655,best:0.7136},
    {gen:130,id:"g130-s130",reward:0.5998,best:0.7136},
    {gen:131,id:"g131-s131",reward:0.6539,best:0.7136},
    {gen:133,id:"g133-s133",reward:0.617,best:0.7136},
    {gen:134,id:"g134-s134",reward:0.731,best:0.731},
    {gen:139,id:"g139-s139",reward:0.6823,best:0.731},
    {gen:142,id:"g142-s142",reward:0.658,best:0.731},
    {gen:146,id:"g146-s146",reward:0.6553,best:0.731},
    {gen:147,id:"g147-s147",reward:0.6345,best:0.731},
    {gen:150,id:"g150-s150",reward:0.5979,best:0.731},
    {gen:154,id:"g154-s154",reward:0.6799,best:0.731},
    {gen:159,id:"g159-s159",reward:0.6266,best:0.731},
    {gen:161,id:"g161-s161",reward:0.5459,best:0.731},
    {gen:165,id:"g165-s165",reward:0.5369,best:0.731},
    {gen:166,id:"g166-s166",reward:0.5756,best:0.731},
    {gen:168,id:"g168-s168",reward:0.5676,best:0.731},
    {gen:169,id:"g169-s169",reward:0.6906,best:0.731},
    {gen:171,id:"g171-s171",reward:0.6783,best:0.731},
    {gen:172,id:"g172-s172",reward:0.4839,best:0.731}
  ];

  var META = {
    selectedId: "g134-s134",
    seedId: "g0-s0",
    baselineId: "g1-s1",
    totalGenerations: 200,
    accepted: DATA.length,
    selectedReward: 0.731,
    baselineReward: 0.107,
    seedReward: 0.0932,
    taskSuccessFrom: "0/70",
    taskSuccessTo: "49/70"
  };

  var SVGNS = "http://www.w3.org/2000/svg";
  function el(name, attrs) {
    var n = document.createElementNS(SVGNS, name);
    if (attrs) { for (var k in attrs) { n.setAttribute(k, attrs[k]); } }
    return n;
  }
  function fmt(x, d) { return Number(x).toFixed(d == null ? 3 : d); }

  function EvolutionChart(host) {
    this.host = host;
    this.svg = null;
    this.tip = null;
    this.points = [];
    this.focusIdx = -1;
    this.live = null;
    this._build();
    this._render();
    this._bindResize();
  }

  EvolutionChart.prototype._build = function () {
    var h = this.host;
    h.innerHTML = "";
    h.classList.add("evo-host");

    this.svg = el("svg", { "class": "evo-svg", role: "group", "aria-roledescription": "scatter chart" });
    this.svg.setAttribute("aria-label",
      "Evolution trajectory: mean validation reward of accepted candidates over generations, " +
      "with a best-by-train step line. Starts near " + fmt(META.seedReward, 3) +
      " and the selected solver g134-s134 reaches " + fmt(META.selectedReward, 3) + ".");
    h.appendChild(this.svg);

    this.tip = document.createElement("div");
    this.tip.className = "evo-tip";
    this.tip.setAttribute("role", "status");
    h.appendChild(this.tip);

    this.live = document.createElement("div");
    this.live.className = "evo-sr";
    this.live.setAttribute("aria-live", "polite");
    h.appendChild(this.live);
  };

  EvolutionChart.prototype._dims = function () {
    var w = this.host.clientWidth || 700;
    var mobile = w < 480;
    var W = Math.max(300, w);
    var H = mobile ? Math.round(W * 0.86) : Math.round(Math.min(460, Math.max(320, W * 0.56)));
    return {
      W: W, H: H, mobile: mobile,
      mL: mobile ? 40 : 52,
      mR: mobile ? 14 : 22,
      mT: 16,
      mB: mobile ? 42 : 46
    };
  };

  EvolutionChart.prototype._render = function () {
    var d = this._dims();
    var svg = this.svg;
    while (svg.firstChild) { svg.removeChild(svg.firstChild); }
    svg.setAttribute("viewBox", "0 0 " + d.W + " " + d.H);
    svg.setAttribute("width", d.W);
    svg.setAttribute("height", d.H);

    var plotL = d.mL, plotR = d.W - d.mR, plotT = d.mT, plotB = d.H - d.mB;
    var pw = plotR - plotL, ph = plotB - plotT;

    var xMax = META.totalGenerations;
    var yMax = 0.8;
    var sx = function (g) { return plotL + (g / xMax) * pw; };
    var sy = function (v) { return plotB - (v / yMax) * ph; };

    this.sx = sx; this.sy = sy;

    var yTicks = [0, 0.2, 0.4, 0.6, 0.8];
    for (var i = 0; i < yTicks.length; i++) {
      var yy = sy(yTicks[i]);
      svg.appendChild(el("line", { "class": "evo-grid", x1: plotL, y1: yy, x2: plotR, y2: yy }));
      var t = el("text", { "class": "evo-tick", x: plotL - 7, y: yy + 3.5, "text-anchor": "end" });
      t.textContent = yTicks[i].toFixed(1);
      svg.appendChild(t);
    }

    var xTicks = d.mobile ? [0, 50, 100, 150, 200] : [0, 25, 50, 75, 100, 125, 150, 175, 200];
    for (var j = 0; j < xTicks.length; j++) {
      var xx = sx(xTicks[j]);
      svg.appendChild(el("line", { "class": "evo-grid-soft", x1: xx, y1: plotT, x2: xx, y2: plotB }));
      var tx = el("text", { "class": "evo-tick", x: xx, y: plotB + 16, "text-anchor": "middle" });
      tx.textContent = xTicks[j];
      svg.appendChild(tx);
    }

    svg.appendChild(el("line", { "class": "evo-axis", x1: plotL, y1: plotB, x2: plotR, y2: plotB }));
    svg.appendChild(el("line", { "class": "evo-axis", x1: plotL, y1: plotT, x2: plotL, y2: plotB }));

    var xt = el("text", { "class": "evo-axtitle", x: plotL + pw / 2, y: d.H - 6, "text-anchor": "middle" });
    xt.textContent = "generation";
    svg.appendChild(xt);
    var yt = el("text", { "class": "evo-axtitle", x: 13, y: plotT + ph / 2, "text-anchor": "middle",
      transform: "rotate(-90 13 " + (plotT + ph / 2) + ")" });
    yt.textContent = "mean validation reward";
    svg.appendChild(yt);

    var dStr = "";
    for (var k = 0; k < DATA.length; k++) {
      var px = sx(DATA[k].gen), py = sy(DATA[k].best);
      if (k === 0) { dStr += "M" + px + "," + py; }
      else { dStr += " L" + px + "," + py; }
      if (k < DATA.length - 1) {
        var nx = sx(DATA[k + 1].gen);
        dStr += " L" + nx + "," + py;
      }
    }
    var lastBestY = sy(DATA[DATA.length - 1].best);
    dStr += " L" + sx(xMax) + "," + lastBestY;
    svg.appendChild(el("path", { "class": "evo-bestline", d: dStr }));

    var sel = DATA.filter(function (p) { return p.id === META.selectedId; })[0];
    if (sel) {
      svg.appendChild(el("circle", { "class": "evo-sel-halo", cx: sx(sel.gen), cy: sy(sel.reward), r: d.mobile ? 16 : 19 }));
    }

    this.points = [];
    var self = this;
    var rNorm = d.mobile ? 4 : 4.2;

    DATA.forEach(function (p, idx) {
      var cx = sx(p.gen), cy = sy(p.reward);
      var isSel = p.id === META.selectedId;
      var isSeed = p.id === META.seedId;
      var isBase = p.id === META.baselineId;

      var ring = el("circle", { "class": "evo-focusring", cx: cx, cy: cy, r: (isSel ? (d.mobile ? 11 : 13) : rNorm + 4) });

      var marker;
      if (isSel) {
        marker = self._star(cx, cy, d.mobile ? 10 : 12);
        marker.setAttribute("class", "evo-sel-star evo-pt");
      } else {
        var cls = "evo-pt " + (isSeed ? "evo-pt-seed" : isBase ? "evo-pt-baseline" : "evo-pt-frontier");
        marker = el("circle", { "class": cls, cx: cx, cy: cy, r: (isSeed || isBase) ? rNorm + 1.4 : rNorm });
      }

      marker.setAttribute("tabindex", "0");
      marker.setAttribute("role", "button");
      var role = isSel ? "selected solver" : isSeed ? "seed program" : isBase ? "first mutation (baseline)" : "accepted candidate";
      marker.setAttribute("aria-label",
        role + " " + p.id + ", generation " + p.gen + ", mean validation reward " + fmt(p.reward, 3) +
        ", best so far " + fmt(p.best, 3));

      var rec = { data: p, marker: marker, ring: ring, cx: cx, cy: cy, idx: idx };
      self.points.push(rec);

      var show = function () { self._focusPoint(idx, false); };
      var hide = function () { self._hideTip(); ring.classList.remove("on"); };
      marker.addEventListener("mouseenter", show);
      marker.addEventListener("mousemove", show);
      marker.addEventListener("mouseleave", hide);
      marker.addEventListener("focus", function () { self._focusPoint(idx, true); });
      marker.addEventListener("blur", hide);
      marker.addEventListener("keydown", function (e) { self._onKey(e, idx); });

      svg.appendChild(ring);
      svg.appendChild(marker);
    });

    if (sel && !d.mobile) {
      this._drawSelLabel(svg, sx(sel.gen), sy(sel.reward), d);
    }
  };

  EvolutionChart.prototype._star = function (cx, cy, r) {
    var pts = [], spikes = 5, inner = r * 0.45;
    var rot = -Math.PI / 2;
    for (var i = 0; i < spikes * 2; i++) {
      var rad = (i % 2 === 0) ? r : inner;
      var a = rot + (i * Math.PI) / spikes;
      pts.push((cx + Math.cos(a) * rad).toFixed(2) + "," + (cy + Math.sin(a) * rad).toFixed(2));
    }
    return el("polygon", { points: pts.join(" ") });
  };

  EvolutionChart.prototype._drawSelLabel = function (svg, cx, cy, d) {
    var txt = "g134-s134 · selected · " + fmt(META.selectedReward, 3);
    var sub = "task success " + META.taskSuccessFrom + " → " + META.taskSuccessTo;
    var padX = 9, lineH = 14, boxH = lineH * 2 + 8;
    var approxW = Math.max(txt.length, sub.length) * (d.mobile ? 6.4 : 7.2) + padX * 2;
    // Drop the box into the empty lower band so it never covers the points:
    // centered under the star, clamped to the plot, with a leader line up to the star.
    var plotL = d.mL, plotR = d.W - d.mR, ph = (d.H - d.mB) - d.mT;
    var lx = cx - approxW / 2;
    if (lx < plotL + 4) { lx = plotL + 4; }
    if (lx + approxW > plotR - 4) { lx = plotR - 4 - approxW; }
    var ly = d.mT + ph * 0.56;

    var g = el("g", { "aria-hidden": "true" });
    g.appendChild(el("line", { x1: cx, y1: cy + 7, x2: lx + approxW / 2, y2: ly, stroke: "#ffcf5c", "stroke-width": 1, "stroke-dasharray": "2 2", opacity: 0.6 }));
    g.appendChild(el("rect", { "class": "evo-sel-label-bg", x: lx, y: ly, width: approxW, height: boxH, rx: 7 }));
    var t1 = el("text", { "class": "evo-sel-label-tx", x: lx + padX, y: ly + 15 });
    t1.textContent = txt;
    g.appendChild(t1);
    var t2 = el("text", { "class": "evo-anchor-tx", x: lx + padX, y: ly + 15 + lineH });
    t2.textContent = sub;
    g.appendChild(t2);
    svg.appendChild(g);
  };

  EvolutionChart.prototype._focusPoint = function (idx, fromKeyboard) {
    var rec = this.points[idx];
    if (!rec) { return; }
    this.focusIdx = idx;
    for (var i = 0; i < this.points.length; i++) { this.points[i].ring.classList.remove("on"); }
    rec.ring.classList.add("on");
    this._showTip(rec);
    if (fromKeyboard && this.live) {
      this.live.textContent = rec.data.id + ", generation " + rec.data.gen +
        ", reward " + fmt(rec.data.reward, 3);
    }
  };

  EvolutionChart.prototype._showTip = function (rec) {
    var p = rec.data;
    var isSel = p.id === META.selectedId;
    var isBase = p.id === META.baselineId;
    var isSeed = p.id === META.seedId;
    var idCls = isSel ? " sel" : isBase ? " base" : "";
    var tag = "";
    if (isSel) { tag = '<span class="tip-tag sel">selected solver</span>'; }
    else if (isBase) { tag = '<span class="tip-tag base">first mutation</span>'; }
    else if (isSeed) { tag = '<span class="tip-tag base">seed program</span>'; }

    this.tip.innerHTML =
      '<div class="tip-id' + idCls + '">' + p.id + '</div>' +
      '<div class="tip-row"><span class="k">generation</span><span class="v">' + p.gen + '</span></div>' +
      '<div class="tip-row"><span class="k">mean reward</span><span class="v">' + fmt(p.reward, 3) + '</span></div>' +
      '<div class="tip-row"><span class="k">best-by-train</span><span class="v">' + fmt(p.best, 3) + '</span></div>' +
      tag;

    var hostRect = this.host.getBoundingClientRect();
    var mRect = rec.marker.getBoundingClientRect();
    var px = mRect.left - hostRect.left + mRect.width / 2;
    var py = mRect.top - hostRect.top + mRect.height / 2;

    this.tip.classList.add("on");
    var tw = this.tip.offsetWidth, th = this.tip.offsetHeight;
    var left = px - tw / 2;
    var top = py - th - 14;
    if (top < 2) { top = py + 16; }
    if (left < 2) { left = 2; }
    if (left + tw > hostRect.width - 2) { left = hostRect.width - tw - 2; }
    this.tip.style.left = left + "px";
    this.tip.style.top = top + "px";
  };

  EvolutionChart.prototype._hideTip = function () {
    this.tip.classList.remove("on");
  };

  EvolutionChart.prototype._onKey = function (e, idx) {
    var next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") { next = idx + 1; }
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") { next = idx - 1; }
    else if (e.key === "Home") { next = 0; }
    else if (e.key === "End") { next = this.points.length - 1; }
    else if (e.key === "Escape") { this._hideTip(); e.target.blur(); return; }
    else { return; }
    e.preventDefault();
    if (next < 0) { next = 0; }
    if (next > this.points.length - 1) { next = this.points.length - 1; }
    this.points[next].marker.focus();
  };

  EvolutionChart.prototype._bindResize = function () {
    var self = this;
    var raf = null;
    var redraw = function () {
      if (raf) { cancelAnimationFrame(raf); }
      raf = requestAnimationFrame(function () { self._hideTip(); self._render(); });
    };
    if (window.ResizeObserver) {
      this._ro = new ResizeObserver(redraw);
      this._ro.observe(this.host);
    } else {
      window.addEventListener("resize", redraw);
    }
  };

  function fillTable(tbody) {
    var rows = "";
    for (var i = 0; i < DATA.length; i++) {
      var p = DATA[i];
      var cls = p.id === META.selectedId ? ' class="is-selected"' :
                p.id === META.baselineId ? ' class="is-baseline"' : "";
      var note = p.id === META.selectedId ? "selected solver" :
                 p.id === META.seedId ? "seed program" :
                 p.id === META.baselineId ? "first mutation" : "accepted";
      rows += "<tr" + cls + "><td>" + p.id + "</td><td>" + p.gen + "</td><td>" +
        fmt(p.reward, 3) + "</td><td>" + fmt(p.best, 3) + "</td><td>" + note + "</td></tr>";
    }
    tbody.innerHTML = rows;
  }

  function init() {
    var host = document.getElementById("evo-chart");
    if (host) { new EvolutionChart(host); }
    var tbody = document.getElementById("evo-tbody");
    if (tbody) { fillTable(tbody); }
  }
  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", init); }
  else { init(); }
})();

/* ============================================================
   3. Per-task progression (interactive multi-line chart)
   ============================================================ */
(function () {
  "use strict";

  var host = document.getElementById("pertask-host");
  if (!host) { return; }

  var GENS = [0,1,3,4,5,6,8,9,11,12,13,14,16,19,26,28,32,37,38,39,40,41,42,44,46,50,52,54,55,57,58,60,61,62,64,65,66,69,70,72,73,74,75,77,81,83,85,88,90,91,92,94,96,98,101,102,104,106,107,108,111,113,114,115,116,117,119,127,129,130,131,133,134,139,142,146,147,150,154,159,161,165,166,168,169,171,172];

  var SERIES = {
    cube_lifting:     [0.4782,0.4896,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    cube_stack:       [0.0037,0.046,0.703,0.703,0.703,0.703,0.703,0.9002,0.9002,0.9002,0.9002,0.9002,0.9002,0.9006,0.9007,0.9007,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    cube_restack:     [0.003,0.0557,0.0557,0.0766,0.0766,0.0766,0.0766,0.0766,0.0766,0.0766,0.0766,0.0766,0.0766,0.6021,0.6021,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    spill_wipe:       [0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    two_arm_lift:     [0.0678,0.0678,0.0678,0.0718,0.1698,0.1698,0.1698,0.1698,0.1698,0.1698,0.1698,0.1698,0.1698,0.2372,0.2372,0.2372,0.2372,0.2372,0.445,0.445,0.445,0.445,0.445,0.445,0.4905,0.4905,0.5724,0.5724,0.5724,0.5724,0.5724,0.5724,0.5724,0.5724,0.5724,0.5724,0.5724,0.5724,0.5724,0.5724,0.5724,0.618,0.618,0.618,0.618,0.618,0.618,0.618,0.618,0.618,0.618,0.618,0.618,0.618,0.618,0.618,0.618,0.618,0.618,0.618,0.618,0.618,0.618,0.618,0.618,0.618,0.618,0.6336,0.6336,0.6336,0.6336,0.6336,0.6336,0.7261,0.7261,0.7261,0.7261,0.7261,0.7261,0.7261,0.7261,0.7261,0.7261,0.7261,0.7261,0.7261,0.7261],
    two_arm_handover: [0.099,0.099,0.099,0.099,0.53,0.53,0.53,0.53,0.598,0.5984,0.5984,0.5984,0.5984,0.6247,0.6247,0.6247,0.6247,0.6247,0.6247,0.6247,0.6247,0.6521,0.6521,0.6521,0.6521,0.6521,0.6521,0.6521,0.6521,0.6521,0.6521,0.6521,0.6521,0.6521,0.6521,0.6521,0.6521,0.6521,0.6521,0.6521,0.6521,0.6521,0.6521,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    nut_assembly:     [0.0004,0.0004,0.0004,0.0004,0.0004,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.0094,0.0094,0.0146,0.0146,0.0146,0.0146,0.0146,0.0146,0.0146,0.0152,0.0152,0.0152,0.0152,0.0152,0.0152,0.0152,0.0152,0.0481,0.0481,0.0481,0.0481,0.0481,0.0481,0.0481,0.0481,0.0481,0.0481,0.0481,0.0481,0.0481,0.0481,0.0481,0.0481,0.0481,0.0481,0.0481,0.0481,0.0481,0.0481,0.0481,0.0481,0.0481,0.0481,0.0481,0.0481,0.0481,0.0481,0.0481,0.0481,0.0481,0.0481,0.0481,0.0481,0.0587,0.0587,0.0587,0.0587,0.0587,0.0587,0.0587,0.0587,0.0587,0.0587]
  };

  var SELECTED_GEN = 134;

  var TASKS = [
    { key: "cube_lifting",     label: "cube_lifting",     css: "--t-cube-lifting"     },
    { key: "cube_stack",       label: "cube_stack",       css: "--t-cube-stack"       },
    { key: "cube_restack",     label: "cube_restack",     css: "--t-cube-restack"     },
    { key: "spill_wipe",       label: "spill_wipe",       css: "--t-spill-wipe"       },
    { key: "two_arm_lift",     label: "two_arm_lift",     css: "--t-two-arm-lift"     },
    { key: "two_arm_handover", label: "two_arm_handover", css: "--t-two-arm-handover" },
    { key: "nut_assembly",     label: "nut_assembly",     css: "--t-nut-assembly"     }
  ];

  var rootStyle = getComputedStyle(document.documentElement);
  function colorOf(t) { return rootStyle.getPropertyValue(t.css).trim() || "#888"; }

  var SVG_W = 720, SVG_H = 430;
  var M = { top: 18, right: 18, bottom: 52, left: 52 };
  var PW = SVG_W - M.left - M.right;
  var PH = SVG_H - M.top - M.bottom;
  var X_MIN = 0, X_MAX = 180;
  var Y_MIN = 0, Y_MAX = 1;
  var X_TICKS = [0,25,50,75,100,125,150,175];
  var Y_TICKS = [0,0.2,0.4,0.6,0.8,1.0];

  function xPix(g) { return M.left + (g - X_MIN) / (X_MAX - X_MIN) * PW; }
  function yPix(v) { return M.top + (1 - (v - Y_MIN) / (Y_MAX - Y_MIN)) * PH; }

  var SVGNS = "http://www.w3.org/2000/svg";
  function el(name, attrs) {
    var n = document.createElementNS(SVGNS, name);
    if (attrs) { for (var k in attrs) { n.setAttribute(k, attrs[k]); } }
    return n;
  }

  var POINTS = {};
  TASKS.forEach(function (t) {
    var arr = SERIES[t.key];
    POINTS[t.key] = GENS.map(function (g, i) {
      return { gen: g, val: arr[i], x: xPix(g), y: yPix(arr[i]) };
    });
  });

  var hidden = {};

  var svg = el("svg", {
    "class": "chart-svg",
    viewBox: "0 0 " + SVG_W + " " + SVG_H,
    role: "img",
    "aria-label": "Per-task best-by-train mean reward over generations. Five of seven tasks reach reward 1.0; two_arm_lift plateaus at 0.73; nut_assembly stays near 0.06. Full values are in the data table below."
  });

  Y_TICKS.forEach(function (v) {
    var y = yPix(v);
    svg.appendChild(el("line", { "class": "grid-line" + (v === 0 ? " zero" : ""), x1: M.left, y1: y, x2: M.left + PW, y2: y }));
    var lbl = el("text", { "class": "tick-label", x: M.left - 8, y: y + 3.5, "text-anchor": "end" });
    lbl.textContent = v.toFixed(1);
    svg.appendChild(lbl);
  });
  X_TICKS.forEach(function (g) {
    var x = xPix(g);
    svg.appendChild(el("line", { "class": "grid-line", x1: x, y1: M.top, x2: x, y2: M.top + PH }));
    var lbl = el("text", { "class": "tick-label", x: x, y: M.top + PH + 16, "text-anchor": "middle" });
    lbl.textContent = g;
    svg.appendChild(lbl);
  });
  svg.appendChild(el("line", { "class": "axis-base", x1: M.left, y1: M.top + PH, x2: M.left + PW, y2: M.top + PH }));
  svg.appendChild(el("line", { "class": "axis-base", x1: M.left, y1: M.top, x2: M.left, y2: M.top + PH }));
  var xt = el("text", { "class": "axis-title", x: M.left + PW / 2, y: SVG_H - 8, "text-anchor": "middle" });
  xt.textContent = "generation";
  svg.appendChild(xt);
  var yt = el("text", { "class": "axis-title", x: 14, y: M.top + PH / 2, "text-anchor": "middle", transform: "rotate(-90 14 " + (M.top + PH / 2) + ")" });
  yt.textContent = "best-by-train mean reward";
  svg.appendChild(yt);

  var selX = xPix(SELECTED_GEN);
  svg.appendChild(el("line", { "class": "sel-line", x1: selX, y1: M.top, x2: selX, y2: M.top + PH }));
  var selTag = el("text", { "class": "sel-tag", x: selX, y: M.top - 5, "text-anchor": "middle" });
  selTag.textContent = "selected g" + SELECTED_GEN;
  svg.appendChild(selTag);

  var seriesG = {};
  function pathD(pts) {
    return pts.map(function (p, i) { return (i ? "L" : "M") + p.x.toFixed(2) + " " + p.y.toFixed(2); }).join(" ");
  }
  var SERIES_DASH = ["none", "7 4", "2 3", "11 5", "7 3 2 3", "1 4", "13 4 2 4"];
  TASKS.forEach(function (t, ti) {
    var col = colorOf(t);
    var pts = POINTS[t.key];
    var g = el("g", { "class": "series-g", "data-key": t.key, style: "color:" + col });
    var d = pathD(pts);
    g.appendChild(el("path", { "class": "series-line", d: d, stroke: col, "stroke-dasharray": SERIES_DASH[ti % SERIES_DASH.length] }));
    pts.forEach(function (p) {
      g.appendChild(el("circle", { "class": "series-dot", cx: p.x.toFixed(2), cy: p.y.toFixed(2), r: 2.1, fill: col }));
    });
    var last = pts[pts.length - 1];
    var hit = el("path", {
      "class": "series-hit", d: d, tabindex: "0", role: "img",
      "aria-label": t.label + ": best-by-train mean reward reaches " + last.val.toFixed(3) + " by generation " + last.gen + "."
    });
    hit.addEventListener("focus", function () { emphasize(t.key); showTipAt(t.key, peakIndex(t.key)); });
    hit.addEventListener("blur", function () { deEmphasize(); hideTip(); });
    g.appendChild(hit);
    seriesG[t.key] = g;
    svg.appendChild(g);
  });

  var guide = el("line", { "class": "hover-guide", x1: 0, y1: M.top, x2: 0, y2: M.top + PH });
  svg.appendChild(guide);
  var marker = el("circle", { "class": "hover-marker", r: 5, fill: "#fff", stroke: "#04060a", "stroke-width": 2 });
  svg.appendChild(marker);

  var overlay = el("rect", { x: M.left, y: M.top, width: PW, height: PH, fill: "transparent", style: "cursor:crosshair" });
  svg.appendChild(overlay);

  host.appendChild(svg);

  var tip = document.getElementById("pertask-tip");

  function peakIndex(key) {
    var arr = SERIES[key], mx = Math.max.apply(null, arr);
    for (var i = 0; i < arr.length; i++) { if (arr[i] >= mx - 1e-9) { return i; } }
    return arr.length - 1;
  }

  function svgToHostXY(px, py) {
    var rect = svg.getBoundingClientRect();
    var hostRect = host.getBoundingClientRect();
    var sx = rect.width / SVG_W, sy = rect.height / SVG_H;
    return {
      left: (rect.left - hostRect.left) + px * sx,
      top: (rect.top - hostRect.top) + py * sy
    };
  }

  function meta(key) { for (var i = 0; i < TASKS.length; i++) { if (TASKS[i].key === key) { return TASKS[i]; } } }

  function showTipAt(key, idx) {
    var p = POINTS[key][idx];
    var t = meta(key), col = colorOf(t);
    guide.setAttribute("x1", p.x); guide.setAttribute("x2", p.x);
    guide.style.opacity = 1;
    marker.setAttribute("cx", p.x); marker.setAttribute("cy", p.y);
    marker.setAttribute("stroke", col); marker.style.opacity = 1;

    tip.innerHTML =
      '<div class="tip-sys"><span class="swatch" style="background:' + col + '"></span>' + t.label + '</div>' +
      '<div class="tip-cell">generation ' + p.gen + '</div>' +
      '<div class="tip-val">' + p.val.toFixed(3) + ' <span class="unit">mean reward</span></div>';
    var pos = svgToHostXY(p.x, p.y);
    var hostW = host.getBoundingClientRect().width;
    var left = Math.max(82, Math.min(hostW - 82, pos.left));
    var below = pos.top < 70;
    tip.classList.toggle("tip-below", below);
    tip.style.left = left + "px";
    tip.style.top = (pos.top + (below ? 14 : -12)) + "px";
    tip.classList.add("is-on");
  }
  function hideTip() {
    tip.classList.remove("is-on");
    guide.style.opacity = 0;
    marker.style.opacity = 0;
  }

  function nearestPoint(evt) {
    var rect = svg.getBoundingClientRect();
    var ux = (evt.clientX - rect.left) / rect.width * SVG_W;
    var uy = (evt.clientY - rect.top) / rect.height * SVG_H;
    var best = null, bestD = Infinity;
    TASKS.forEach(function (t) {
      if (hidden[t.key]) { return; }
      var pts = POINTS[t.key];
      for (var i = 0; i < pts.length; i++) {
        var dx = pts[i].x - ux, dy = pts[i].y - uy;
        var dd = dx * dx + dy * dy;
        if (dd < bestD) { bestD = dd; best = { key: t.key, idx: i }; }
      }
    });
    return best;
  }

  overlay.addEventListener("pointermove", function (evt) {
    var n = nearestPoint(evt);
    if (n) { emphasize(n.key); showTipAt(n.key, n.idx); }
  });
  overlay.addEventListener("pointerleave", function () { deEmphasize(); hideTip(); });
  window.addEventListener("resize", function () { deEmphasize(); hideTip(); });
  overlay.addEventListener("pointerdown", function (evt) {
    var n = nearestPoint(evt);
    if (n) { emphasize(n.key); showTipAt(n.key, n.idx); }
  });

  function emphasize(key) {
    TASKS.forEach(function (t) {
      var g = seriesG[t.key];
      if (hidden[t.key]) { return; }
      g.classList.toggle("is-emph", t.key === key);
      g.classList.toggle("is-dim", t.key !== key);
    });
    if (chips[key]) { chips[key].classList.add("is-emph"); }
  }
  function deEmphasize() {
    TASKS.forEach(function (t) {
      seriesG[t.key].classList.remove("is-emph", "is-dim");
      if (chips[t.key]) { chips[t.key].classList.remove("is-emph"); }
    });
  }

  var legend = document.getElementById("pertask-legend");
  var chips = {};
  TASKS.forEach(function (t) {
    var pts = POINTS[t.key];
    var finalVal = pts[pts.length - 1].val;
    var col = colorOf(t);
    var btn = document.createElement("button");
    btn.className = "legend-chip";
    btn.type = "button";
    btn.setAttribute("aria-pressed", "true");
    btn.dataset.key = t.key;
    btn.innerHTML =
      '<span class="swatch" style="background:' + col + '"></span>' +
      '<span class="label">' + t.label + '</span>' +
      '<span class="val">' + finalVal.toFixed(2) + '</span>';
    btn.addEventListener("click", function () { toggle(t.key); });
    btn.addEventListener("mouseenter", function () { if (!hidden[t.key]) { emphasize(t.key); } });
    btn.addEventListener("mouseleave", function () { deEmphasize(); });
    btn.addEventListener("focus", function () { if (!hidden[t.key]) { emphasize(t.key); } });
    btn.addEventListener("blur", function () { deEmphasize(); });
    legend.appendChild(btn);
    chips[t.key] = btn;
  });

  function setHidden(key, isHidden) {
    hidden[key] = isHidden;
    if (isHidden) { seriesG[key].setAttribute("hidden", ""); }
    else { seriesG[key].removeAttribute("hidden"); }
    chips[key].setAttribute("aria-pressed", String(!isHidden));
    var hit = seriesG[key].querySelector(".series-hit");
    if (hit) { hit.setAttribute("tabindex", isHidden ? "-1" : "0"); }
  }
  function toggle(key) { setHidden(key, !hidden[key]); deEmphasize(); hideTip(); }

  document.getElementById("pt-show-all").addEventListener("click", function () {
    TASKS.forEach(function (t) { setHidden(t.key, false); });
  });
  document.getElementById("pt-hide-all").addEventListener("click", function () {
    TASKS.forEach(function (t) { setHidden(t.key, true); });
  });
  document.getElementById("pt-only-climbers").addEventListener("click", function () {
    var keep = { two_arm_handover: 1, two_arm_lift: 1, nut_assembly: 1 };
    TASKS.forEach(function (t) { setHidden(t.key, !keep[t.key]); });
  });

  (function buildTable() {
    var thead = document.querySelector("#pertask-table thead tr");
    var th0 = document.createElement("th"); th0.textContent = "generation"; thead.appendChild(th0);
    TASKS.forEach(function (t) {
      var th = document.createElement("th"); th.textContent = t.label; thead.appendChild(th);
    });
    var tbody = document.querySelector("#pertask-table tbody");
    GENS.forEach(function (g, i) {
      var tr = document.createElement("tr");
      var td0 = document.createElement("td"); td0.textContent = g; tr.appendChild(td0);
      TASKS.forEach(function (t) {
        var td = document.createElement("td");
        td.textContent = SERIES[t.key][i].toFixed(3);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  })();
})();

/* ============================================================
   4. Structural-prior inline bars (#struct-bars), ENHANCE.
   Adds hover/focus tooltips + exact-value aria-labels to the
   existing native HTML/CSS bars. Does NOT replace them.
   ============================================================ */
(function () {
  "use strict";

  var wrap = document.getElementById("struct-bars");
  if (!wrap) { return; }

  var NOTES = {
    "70.0%":  "Best ceiling with the smallest budget (200 generations).",
    "63.86%": "A single-file stub needs more budget (250 generations) and still trails.",
    "33.86%": "Behavior trees: a rigid scaffold caps far below free-form code.",
    "18.14%": "Finite state machines: the most rigid scaffold, the lowest ceiling."
  };

  var tip = document.createElement("div");
  tip.className = "sb-tip";
  tip.setAttribute("role", "status");
  tip.setAttribute("aria-live", "polite");
  tip.hidden = true;
  wrap.appendChild(tip);

  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var fills = Array.prototype.slice.call(wrap.querySelectorAll(".bar-fill"));

  function labelFor(fill) {
    var row = fill.closest(".bar-row");
    var lab = row ? row.querySelector(".bar-label") : null;
    return lab ? lab.textContent.trim() : "";
  }
  function valueFor(fill) {
    var span = fill.querySelector("span");
    return span ? span.textContent.trim() : "";
  }

  function show(fill) {
    var label = labelFor(fill);
    var val = valueFor(fill);
    var note = NOTES[val];
    tip.innerHTML =
      '<div class="sb-tip-label">' + label + '</div>' +
      '<div class="sb-tip-val">' + val + '</div>' +
      (note ? '<div class="sb-tip-note">' + note + '</div>' : '');
    tip.hidden = false;
    // anchor centered above the fill, clamped inside the bars container
    var wb = wrap.getBoundingClientRect();
    var fb = fill.getBoundingClientRect();
    var cx = fb.left + fb.width / 2 - wb.left;
    var cy = fb.top - wb.top - 6;
    var tw = tip.offsetWidth || 140;
    cx = Math.max(tw / 2 + 2, Math.min(wb.width - tw / 2 - 2, cx));
    if (cy < tip.offsetHeight + 2) { cy = fb.bottom - wb.top + tip.offsetHeight + 6; }
    tip.style.left = cx + "px";
    tip.style.top = cy + "px";
    tip.classList.add("is-on");
    fills.forEach(function (f) { f.classList.remove("is-active"); });
    fill.classList.add("is-active");
  }
  function hide() {
    tip.classList.remove("is-on");
    tip.hidden = true;
    fills.forEach(function (f) { f.classList.remove("is-active"); });
  }

  fills.forEach(function (fill) {
    var label = labelFor(fill);
    var val = valueFor(fill);
    var note = NOTES[val];
    fill.setAttribute("tabindex", "0");
    fill.setAttribute("role", "img");
    fill.setAttribute("aria-label", label + ": " + val + (note ? ". " + note : ""));
    fill.addEventListener("mouseenter", function () { show(fill); });
    fill.addEventListener("mouseleave", hide);
    fill.addEventListener("focus", function () { show(fill); });
    fill.addEventListener("blur", hide);
  });

  window.addEventListener("resize", hide);
})();
