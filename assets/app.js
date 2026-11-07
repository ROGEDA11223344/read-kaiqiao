/* 读开窍 · 站点逻辑（经典脚本，ES2017 兼容基线：不使用 ?. ?? replaceAll Object.fromEntries flat） */
(function () {
  'use strict';
  var T = window.KAIQIAO_TEXT;
  var S = window.KAIQIAO_SITE;
  if (!T || !S) { document.body.innerHTML = '<p style="padding:40px">数据未加载：请确认 assets/data.js 与页面在同一目录。</p>'; return; }

  /* ---------------- 基础工具 ---------------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function num(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function reduceMotion() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }

  var CH = [], CIDX = {};
  T.books.forEach(function (b) {
    b.parts.forEach(function (p) {
      p.chapters.forEach(function (c) {
        var o = {
          id: c.id, title: c.title, paras: c.paras, chars: c.chars, group: c.group || '',
          book: b.id, bookNo: b.no, bookTitle: b.title, part: p.title
        };
        CH.push(o); CIDX[o.id] = o;
      });
    });
  });
  var TINDEX = {};
  S.timeline.forEach(function (t) { TINDEX[t.id] = t; });
  var QINDEX = {};
  S.quotes.forEach(function (q) { QINDEX[q.chap] = q.text; });
  var GINDEX = {};
  S.glossary.forEach(function (g) { GINDEX[g.term] = g; });
  var FINDEX = {};
  S.figures.forEach(function (f) { FINDEX[f.name] = f; });

  /* ---------------- 主题 ---------------- */
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    var btn = $('themeBtn');
    if (btn) btn.textContent = t === 'dark' ? '浅色' : '深色';
    if (window.__kqChartReady) renderChart();
    renderGraph();
  }
  function initTheme() {
    var t = store('kq_theme') || 'light';
    applyTheme(t);
    $('themeBtn').addEventListener('click', function () {
      var n = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      store('kq_theme', n); applyTheme(n);
    });
  }

  /* ---------------- 路由 ---------------- */
  var VIEWS = [
    ['home', '首页'], ['guide', '导读'], ['axis', '脉络'], ['graph', '关系'],
    ['glossary', '词典'], ['figures', '人物'], ['reader', '原文']
  ];
  function buildNav() {
    var nav = $('nav');
    nav.innerHTML = VIEWS.map(function (v) {
      return '<a href="#view-' + v[0] + '" data-v="' + v[0] + '">' + v[1] + '</a>';
    }).join('');
  }
  function currentView() {
    var h = location.hash.replace(/^#view-/, '');
    for (var i = 0; i < VIEWS.length; i++) if (VIEWS[i][0] === h) return h;
    return 'home';
  }
  function route() {
    var v = currentView();
    VIEWS.forEach(function (x) {
      var sec = $('view-' + x[0]);
      if (sec) sec.className = 'view' + (x[0] === v ? ' on' : '');
    });
    var links = document.querySelectorAll('#nav a');
    for (var i = 0; i < links.length; i++) {
      links[i].className = links[i].getAttribute('data-v') === v ? 'on' : '';
    }
    if (v === 'axis') { renderChart(); renderAxisList(); }
    if (v === 'graph') renderGraph();
    window.scrollTo(0, 0);
  }
  function go(v) { location.hash = '#view-' + v; }

  /* ---------------- 访问计数（本机降级） ---------------- */
  function initVisit() {
    var n = parseInt(store('kq_visits') || '0', 10);
    if (isNaN(n)) n = 0;
    n += 1; store('kq_visits', String(n));
    $('visit').textContent = '本机访问 · 第 ' + n + ' 次（仅本机记录，非全网统计）';
  }

  /* ---------------- Hero 动态背景 ---------------- */
  var rafId = 0, particles = [], heroCtx = null, heroW = 0, heroH = 0, dpr = 1;
  function initHero() {
    var cv = $('heroCanvas');
    if (!cv) return;
    heroCtx = cv.getContext('2d');
    if (!heroCtx) return;
    var reduced = reduceMotion();
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      heroW = cv.clientWidth; heroH = cv.clientHeight;
      cv.width = Math.round(heroW * dpr); cv.height = Math.round(heroH * dpr);
      heroCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.max(34, Math.min(96, Math.round(heroW * heroH / 16000)));
      particles = [];
      for (var i = 0; i < n; i++) {
        particles.push({
          x: Math.random() * heroW, y: Math.random() * heroH,
          vx: (Math.random() - .5) * .22, vy: (Math.random() - .5) * .22,
          r: .6 + Math.random() * 1.5
        });
      }
      draw();
    }
    function draw() {
      if (!heroCtx) return;
      var fg = cssVar('--fg3') || '#888', accent = cssVar('--accent') || '#b0442c';
      heroCtx.clearRect(0, 0, heroW, heroH);
      var i, j, a, b, dx, dy, d;
      for (i = 0; i < particles.length; i++) {
        a = particles[i];
        for (j = i + 1; j < particles.length; j++) {
          b = particles[j]; dx = a.x - b.x; dy = a.y - b.y; d = dx * dx + dy * dy;
          if (d < 11000) {
            heroCtx.strokeStyle = fg; heroCtx.globalAlpha = (1 - d / 11000) * .17;
            heroCtx.lineWidth = .6; heroCtx.beginPath(); heroCtx.moveTo(a.x, a.y); heroCtx.lineTo(b.x, b.y); heroCtx.stroke();
          }
        }
      }
      heroCtx.globalAlpha = 1;
      for (i = 0; i < particles.length; i++) {
        a = particles[i];
        heroCtx.fillStyle = (i % 11 === 0) ? accent : fg;
        heroCtx.globalAlpha = (i % 11 === 0) ? .75 : .45;
        heroCtx.beginPath(); heroCtx.arc(a.x, a.y, a.r, 0, Math.PI * 2); heroCtx.fill();
      }
      heroCtx.globalAlpha = 1;
    }
    function step() {
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > heroW) p.vx *= -1;
        if (p.y < 0 || p.y > heroH) p.vy *= -1;
      }
      draw(); rafId = requestAnimationFrame(step);
    }
    function pause() { if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } }
    function resume() { if (!rafId && !reduceMotion() && !document.hidden) rafId = requestAnimationFrame(step); }
    size();
    window.addEventListener('resize', function () { size(); if (reduced) draw(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); else resume(); });
    if (!reduced) resume();
    window.__kqRedrawHero = draw;
  }

  /* ---------------- Hero 统计与入口 ---------------- */
  function initHeroContent() {
    var m = S.meta;
    var rows = [
      [m.books, '册原件'], [m.parts, '部'], [m.chapters, '章 / 篇'], [num(m.chars), '字正文']
    ];
    $('heroStats').innerHTML = rows.map(function (r) {
      return '<div class="stat"><b>' + r[0] + '</b><span>' + r[1] + '</span></div>';
    }).join('');
    $('btnRead').addEventListener('click', function () { go('reader'); });
    $('btnGuide').addEventListener('click', function () { go('guide'); });
    $('btnGloss').addEventListener('click', function () { go('glossary'); });
  }

  /* ---------------- 打开章节（全站统一跳转） ---------------- */
  var pendingChap = null;
  function openChapter(id) {
    if (!CIDX[id]) return;
    pendingChap = id;
    if (currentView() === 'reader') { loadChapter(id); }
    else { location.hash = '#view-reader'; }
  }

  /* ---------------- 导读 ---------------- */
  function renderGuide() {
    var host = $('guideBody');
    host.innerHTML = S.guide.map(function (g, gi) {
      var pts = g.points.map(function (p) {
        var refs = p.refs.map(function (id) {
          var c = CIDX[id];
          return c ? '<a class="minilink" href="#view-reader" data-chap="' + id + '">' + esc(c.title.slice(0, 18)) + '</a>' : '';
        }).join('');
        return '<div class="card"><h3>' + esc(p.title) + '</h3><p>' + esc(p.desc) + '</p>' +
          '<div class="linkline">' + (refs || '<span class="chip">原件未覆盖该标题</span>') + '</div></div>';
      }).join('');
      return '<section class="guide-group"><h2 class="guide-q"><i>Q' + (gi + 1) + '</i>' + esc(g.q) + '</h2>' +
        '<p class="guide-lead">' + esc(g.lead) + '</p><div class="grid g2">' + pts + '</div></section>';
    }).join('');
    bindChapterLinks(host);
  }
  function bindChapterLinks(root) {
    var as = root.querySelectorAll('[data-chap]');
    for (var i = 0; i < as.length; i++) {
      (function (a) {
        a.addEventListener('click', function (e) { e.preventDefault(); openChapter(a.getAttribute('data-chap')); });
      })(as[i]);
    }
  }

  /* ---------------- 脉络轴（ECharts 优先，SVG 降级） ---------------- */
  var axisFilter = 'all';
  function axisParts() {
    var seen = [], out = [];
    S.timeline.forEach(function (t) {
      var k = t.book + '|' + t.part;
      if (seen.indexOf(k) < 0) { seen.push(k); out.push({ key: k, title: t.part, bookNo: t.bookNo }); }
    });
    return out;
  }
  function initAxis() {
    var bar = $('axisFilters');
    var parts = axisParts();
    bar.innerHTML = '<button class="fbtn on" data-f="all">总览 · 全部</button>' + parts.map(function (p, i) {
      return '<button class="fbtn" data-f="' + esc(p.key) + '">' + esc(p.bookNo + ' · ' + p.title) + '</button>';
    }).join('');
    var bs = bar.querySelectorAll('[data-f]');
    for (var i = 0; i < bs.length; i++) {
      (function (b) {
        b.addEventListener('click', function () {
          axisFilter = b.getAttribute('data-f');
          for (var j = 0; j < bs.length; j++) bs[j].className = 'fbtn';
          b.className = 'fbtn on';
          renderChart(); renderAxisList();
        });
      })(bs[i]);
    }
  }
  function filteredTimeline() {
    if (axisFilter === 'all') return S.timeline;
    return S.timeline.filter(function (t) { return (t.book + '|' + t.part) === axisFilter; });
  }
  function partShades() {
    var parts = axisParts(), fg = cssVar('--fg') || '#17181a', dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return parts.map(function (p, i) {
      return dark ? 'rgba(236,232,224,' + (0.95 - i * 0.075).toFixed(2) + ')'
                  : 'rgba(23,24,26,' + (0.92 - i * 0.078).toFixed(2) + ')';
    });
  }
  function renderChart() {
    var box = $('chart');
    if (!box || box.clientWidth < 20) return;   // 窄屏隐藏容器时不初始化
    var data = filteredTimeline();
    if (window.echarts && !window.__kqNoEcharts) {
      renderChartECharts(box, data);
    } else {
      renderChartSVG(box, data);
    }
  }
  function renderChartECharts(box, data) {
    var chart = window.echarts.getInstanceByDom(box) || window.echarts.init(box);
    window.__kqChart = chart;
    window.__kqChartReady = true;
    var parts = axisParts(), shades = partShades(), fg = cssVar('--fg2') || '#888', accent = cssVar('--accent') || '#b0442c';
    var series = parts.map(function (p, i) {
      var arr = data.filter(function (t) { return (t.book + '|' + t.part) === p.key; })
        .map(function (t) { return { value: [t.x, t.chars, t.id, t.title, t.bookNo], name: t.title }; });
      return {
        name: p.bookNo + ' · ' + p.title, type: 'scatter', data: arr,
        symbolSize: function (v) { return Math.max(6, Math.min(20, 5 + Math.sqrt(v[1]) / 7)); },
        itemStyle: { color: shades[i], opacity: .85 },
        emphasis: { itemStyle: { color: accent, borderColor: accent, borderWidth: 2 } }
      };
    });
    chart.setOption({
      backgroundColor: 'transparent',
      animation: !reduceMotion(),
      grid: { left: 58, right: 18, top: 26, bottom: 62 },
      tooltip: {
        trigger: 'item',
        formatter: function (p) {
          var v = p.value;
          return '<b>' + esc(v[3]) + '</b><br/>' + esc(v[4]) + ' · 第 ' + v[0] + ' 章<br/>' +
            num(v[1]) + ' 字 · 点击阅读全文';
        }
      },
      xAxis: { type: 'value', name: '章节序号', min: 1, max: S.timeline.length,
        nameTextStyle: { color: fg, fontSize: 11 }, axisLabel: { color: fg, fontSize: 10 },
        axisLine: { lineStyle: { color: cssVar('--line') } }, splitLine: { lineStyle: { color: cssVar('--line'), type: 'dashed' } } },
      yAxis: { type: 'value', name: '字数', nameTextStyle: { color: fg, fontSize: 11 },
        axisLabel: { color: fg, fontSize: 10 }, axisLine: { lineStyle: { color: cssVar('--line') } },
        splitLine: { lineStyle: { color: cssVar('--line'), type: 'dashed' } } },
      dataZoom: [
        { type: 'inside', xAxisIndex: 0, filterMode: 'none' },
        { type: 'slider', xAxisIndex: 0, height: 16, bottom: 14, borderColor: cssVar('--line'),
          fillerColor: 'rgba(176,68,44,.10)', handleStyle: { color: accent }, textStyle: { color: fg, fontSize: 10 } }
      ],
      series: series
    }, true);
    chart.off('click');
    chart.on('click', function (p) { if (p.value && p.value[2]) openChapter(p.value[2]); });
    setTimeout(function () { chart.resize(); }, 30);
  }
  function renderChartSVG(box, data) {
    window.__kqChartReady = false;
    var W = box.clientWidth || 700, H = box.clientHeight || 320, pad = { l: 44, r: 14, t: 18, b: 34 };
    var maxC = 1;
    data.forEach(function (t) { if (t.chars > maxC) maxC = t.chars; });
    var shades = partShades(), parts = axisParts();
    var svg = ['<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="100%" role="img" aria-label="章节字数分布散点图">'];
    var i, gx, gy;
    for (i = 0; i <= 4; i++) {
      gy = pad.t + (H - pad.t - pad.b) * i / 4;
      svg.push('<line x1="' + pad.l + '" y1="' + gy + '" x2="' + (W - pad.r) + '" y2="' + gy + '" stroke="' + cssVar('--line') + '" stroke-dasharray="3 4"/>');
      svg.push('<text x="' + (pad.l - 6) + '" y="' + (gy + 3) + '" text-anchor="end" font-size="9" fill="' + cssVar('--fg3') + '">' + Math.round(maxC * (4 - i) / 4) + '</text>');
    }
    svg.push('<line x1="' + pad.l + '" y1="' + (H - pad.b) + '" x2="' + (W - pad.r) + '" y2="' + (H - pad.b) + '" stroke="' + cssVar('--fg2') + '"/>');
    data.forEach(function (t) {
      var parts_i = 0;
      for (var k = 0; k < parts.length; k++) if ((t.book + '|' + t.part) === parts[k].key) parts_i = k;
      gx = pad.l + (W - pad.l - pad.r) * (t.x - 1) / Math.max(1, S.timeline.length - 1);
      gy = H - pad.b - (H - pad.t - pad.b) * t.chars / maxC;
      var r = Math.max(2.6, Math.min(7, 2.6 + Math.sqrt(t.chars) / 12));
      svg.push('<circle class="svgpt" data-id="' + t.id + '" cx="' + gx.toFixed(1) + '" cy="' + gy.toFixed(1) + '" r="' + r.toFixed(1) +
        '" fill="' + shades[parts_i] + '" stroke="none" style="cursor:pointer"><title>' + esc(t.title) + ' · ' + num(t.chars) + ' 字</title></circle>');
    });
    svg.push('<text x="' + (W - pad.r) + '" y="' + (H - 8) + '" text-anchor="end" font-size="10" fill="' + cssVar('--fg3') + '">章节序号 →　点圆点读全文</text>');
    svg.push('</svg>');
    box.innerHTML = svg.join('');
    var pts = box.querySelectorAll('.svgpt');
    for (i = 0; i < pts.length; i++) {
      (function (el) { el.addEventListener('click', function () { openChapter(el.getAttribute('data-id')); }); })(pts[i]);
    }
  }
  function renderAxisList() {
    var data = filteredTimeline();
    var host = $('axisList');
    host.innerHTML = data.map(function (t) {
      var w = Math.max(2, Math.round(t.chars / 90));
      return '<div class="axisrow" data-id="' + t.id + '"><span class="n">' + t.x + '</span>' +
        '<span class="t">' + esc(t.title) + '</span>' +
        '<span class="b" style="width:' + Math.min(90, w) + 'px"></span>' +
        '<span class="c">' + num(t.chars) + ' 字</span></div>';
    }).join('');
    var rows = host.querySelectorAll('.axisrow');
    for (var i = 0; i < rows.length; i++) {
      (function (el) { el.addEventListener('click', function () { openChapter(el.getAttribute('data-id')); }); })(rows[i]);
    }
    $('axisCount').textContent = '当前显示 ' + data.length + ' 章 / 共 ' + S.timeline.length + ' 章；点选任一章进入原文阅读器。';
  }

  /* ---------------- 概念关系图（内联 SVG） ---------------- */
  var graphSel = null;
  function renderGraph() {
    var box = $('relSvg');
    if (!box) return;
    var W = box.clientWidth || 760, H = box.clientHeight || 470;
    var cats = ['认知底层', '关系与自我', '财富与阶层', '内容与变现'];
    var nodes = S.graph.nodes.slice(), edges = S.graph.links;
    var pos = {}, byCat = {}, centers = [];
    cats.forEach(function (c) { byCat[c] = []; });
    nodes.forEach(function (n) { (byCat[n.cat] || byCat[cats[0]]).push(n); });
    // 四个类别各成一个椭圆簇，节点沿簇周排布，标签一律朝外，避免文字互相压叠
    var rx = Math.min(W * 0.155, 152), ry = Math.min(H * 0.20, 106);
    centers = [
      { x: W * 0.27, y: H * 0.27 }, { x: W * 0.73, y: H * 0.27 },
      { x: W * 0.27, y: H * 0.73 }, { x: W * 0.73, y: H * 0.73 }
    ];
    cats.forEach(function (c, ci) {
      var arr = byCat[c], cc = centers[ci];
      arr.forEach(function (n, i) {
        var a = -Math.PI / 2 + 2 * Math.PI * i / Math.max(1, arr.length);
        pos[n.term] = {
          x: cc.x + Math.cos(a) * rx, y: cc.y + Math.sin(a) * ry,
          dir: Math.cos(a) >= 0 ? 1 : -1, cat: n.cat, count: n.count
        };
      });
    });
    var maxc = 1;
    nodes.forEach(function (n) { if (n.count > maxc) maxc = n.count; });
    var out = ['<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="100%" role="img" aria-label="概念共现关系图">'];
    edges.forEach(function (e) {
      var a = pos[e.s], b = pos[e.t];
      if (!a || !b) return;
      out.push('<line class="gedge" data-s="' + esc(e.s) + '" data-t="' + esc(e.t) + '" x1="' + a.x.toFixed(1) + '" y1="' + a.y.toFixed(1) +
        '" x2="' + b.x.toFixed(1) + '" y2="' + b.y.toFixed(1) + '" stroke-width="' + Math.min(2.2, .5 + e.w / 14).toFixed(2) + '"/>');
    });
    cats.forEach(function (c, ci) {
      var cc = centers[ci];
      out.push('<text x="' + cc.x.toFixed(1) + '" y="' + (cc.y + 3).toFixed(1) +
        '" text-anchor="middle" font-size="11" fill="' + cssVar('--fg3') + '" letter-spacing="2" opacity=".75">' + c + '</text>');
    });
    nodes.forEach(function (n) {
      var p = pos[n.term];
      if (!p) return;
      var r = Math.max(4.5, Math.min(12, 4.5 + Math.sqrt(n.count / maxc) * 7.5));
      var tx = p.x + p.dir * (r + 5), anchor = p.dir > 0 ? 'start' : 'end';
      out.push('<g class="gnode" data-term="' + esc(n.term) + '"><circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + r.toFixed(1) + '"/>' +
        '<text x="' + tx.toFixed(1) + '" y="' + (p.y + 3.5).toFixed(1) + '" text-anchor="' + anchor + '">' + esc(n.term) + '</text></g>');
    });
    out.push('</svg>');
    box.innerHTML = out.join('');
    var gs = box.querySelectorAll('.gnode');
    for (var i = 0; i < gs.length; i++) {
      (function (g) {
        var term = g.getAttribute('data-term');
        g.addEventListener('mouseenter', function (e) { hoverGraph(term, e); });
        g.addEventListener('mousemove', function (e) { moveTip(e); });
        g.addEventListener('mouseleave', function () { leaveGraph(); });
        g.addEventListener('click', function () { gotoGlossary(term); });
      })(gs[i]);
    }
    if (graphSel) markGraph(graphSel);
  }
  function markGraph(term) {
    var box = $('relSvg');
    if (!box) return;
    var gs = box.querySelectorAll('.gnode'), es = box.querySelectorAll('.gedge');
    var i, el, related = {};
    related[term] = true;
    for (i = 0; i < es.length; i++) {
      var s = es[i].getAttribute('data-s'), t = es[i].getAttribute('data-t'), on = (s === term || t === term);
      es[i].className.baseVal = 'gedge' + (on ? ' hi' : (graphSel ? ' lo' : ''));
      if (on) { related[s] = true; related[t] = true; }
    }
    for (i = 0; i < gs.length; i++) {
      el = gs[i];
      el.className.baseVal = 'gnode' + (el.getAttribute('data-term') === term ? ' sel' : '');
    }
  }
  function hoverGraph(term, e) {
    var g = GINDEX[term], tip = $('gtip');
    if (!g) return;
    tip.innerHTML = '<b>' + esc(term) + '</b>' + esc(g.cat) + ' · 出现 ' + g.count + ' 次 / ' + g.chapters + ' 章<br/>' +
      esc(g.def.slice(0, 62)) + '…<br/><span style="opacity:.7">点击查看词条与出处</span>';
    tip.style.display = 'block';
    moveTip(e);
    graphSel = term; markGraph(term);
  }
  function moveTip(e) {
    var tip = $('gtip'), host = $('graphBox');
    if (!tip || !host) return;
    var r = host.getBoundingClientRect();
    var x = e.clientX - r.left + 14, y = e.clientY - r.top + 14;
    if (x + 270 > r.width) x = r.width - 275;
    if (y + 110 > r.height) y = r.height - 115;
    tip.style.left = Math.max(4, x) + 'px'; tip.style.top = Math.max(4, y) + 'px';
  }
  function leaveGraph() { $('gtip').style.display = 'none'; graphSel = null; markGraph(null); }
  function gotoGlossary(term) {
    go('glossary');
    // 保持词典总览完整，只定位并高亮目标词条，避免把全库过滤成一条
    $('glossSearch').value = '';
    glossCat = '全部';
    var bs = $('glossCats').querySelectorAll('[data-c]');
    for (var j = 0; j < bs.length; j++) {
      bs[j].className = 'fbtn' + (bs[j].getAttribute('data-c') === '全部' ? ' on' : '');
    }
    renderGlossary();
    setTimeout(function () {
      var cards = $('glossBody').querySelectorAll('.card[data-term]');
      for (var i = 0; i < cards.length; i++) {
        if (cards[i].getAttribute('data-term') === term) {
          cards[i].style.borderColor = cssVar('--accent');
          try { cards[i].scrollIntoView({ block: 'center' }); } catch (e) {}
          break;
        }
      }
    }, 60);
  }

  /* ---------------- 词典 ---------------- */
  var glossCat = '全部';
  function initGlossary() {
    var bar = $('glossCats');
    var cats = ['全部'].concat(S.glossary.map(function (g) { return g.cat; }).filter(function (c, i, a) { return a.indexOf(c) === i; }));
    bar.innerHTML = cats.map(function (c) {
      return '<button class="fbtn' + (c === '全部' ? ' on' : '') + '" data-c="' + esc(c) + '">' + esc(c) + '</button>';
    }).join('');
    var bs = bar.querySelectorAll('[data-c]');
    for (var i = 0; i < bs.length; i++) {
      (function (b) {
        b.addEventListener('click', function () {
          glossCat = b.getAttribute('data-c');
          for (var j = 0; j < bs.length; j++) bs[j].className = 'fbtn';
          b.className = 'fbtn on'; renderGlossary();
        });
      })(bs[i]);
    }
    $('glossSearch').addEventListener('input', renderGlossary);
    renderGlossary();
  }
  function renderGlossary() {
    var q = ($('glossSearch').value || '').trim();
    var list = S.glossary.filter(function (g) {
      if (glossCat !== '全部' && g.cat !== glossCat) return false;
      if (!q) return true;
      return g.term.indexOf(q) >= 0 || g.def.indexOf(q) >= 0 || (g.quote && g.quote.indexOf(q) >= 0);
    });
    $('glossMeta').textContent = '共 ' + list.length + ' 条 / 全库 ' + S.glossary.length + ' 条；「出现次数」与「关联章节」由正文逐字统计得出。';
    $('glossBody').innerHTML = list.length ? list.map(function (g) {
      var refs = g.refs.slice(0, 3).map(function (id) {
        var c = CIDX[id];
        return c ? '<a class="minilink" href="#view-reader" data-chap="' + id + '">' + esc(c.title.slice(0, 16)) + '</a>' : '';
      }).join('');
      return '<article class="card" data-term="' + esc(g.term) + '"><h3 class="gterm">' + esc(g.term) +
        (g.caution ? '<em>辨析</em>' : '') + '<span class="gcount">' + g.count + ' 次 / ' + g.chapters + ' 章</span></h3>' +
        '<div><span class="chip">' + esc(g.cat) + '</span></div>' +
        '<p style="margin-top:10px">' + esc(g.def) + '</p>' +
        (g.quote ? '<div class="gquote">原文：' + esc(g.quote) + '</div>' : '') +
        (g.caution ? '<div class="caution">辨析：' + esc(g.caution) + '</div>' : '') +
        '<div class="linkline">' + (refs || '<span class="chip">无关联章节</span>') + '</div></article>';
    }).join('') : '<p class="chart-empty">没有匹配的词条，换个关键词试试。</p>';
    bindChapterLinks($('glossBody'));
  }

  /* ---------------- 人物 / 角色谱 ---------------- */
  function renderFigures() {
    var groups = {}, order = [];
    S.figures.forEach(function (f) {
      var k = f.cat.indexOf('类型角色') === 0 ? '类型角色（书中反复出现的行动位置）' : f.cat;
      if (!groups[k]) { groups[k] = []; order.push(k); }
      groups[k].push(f);
    });
    $('figBody').innerHTML = order.map(function (k) {
      var cards = groups[k].map(function (f) {
        var first = f.refs[0];
        return '<article class="card figcard"><div class="nm">' + esc(f.name) + '</div>' +
          '<div class="ct">' + esc(f.cat) + ' · 出现 ' + f.count + ' 次 / ' + f.chapters + ' 章</div>' +
          (f.desc ? '<div class="ds">' + esc(f.desc) + '</div>' : '<div class="ds">按原文逐字统计，点击可回到首次出现的章节。</div>') +
          '<div class="linkline">' + (first ? '<a class="minilink" href="#view-reader" data-chap="' + first + '">看原文出处</a>' : '') + '</div></article>';
      }).join('');
      return '<section class="figgroup"><h3>' + esc(k) + '　<span style="font-size:12px;color:var(--fg3);font-family:var(--sans)">' + groups[k].length + ' 位</span></h3>' +
        '<div class="grid g3">' + cards + '</div></section>';
    }).join('');
    bindChapterLinks($('figBody'));
  }

  /* ---------------- 注疏高亮 ---------------- */
  var PLACES = ['香港', '云南', '北京', '上海', '广州', '深圳', '美国', '中国', '环京', '环沪', '环深',
    '晋阳', '台湾', '大陆', '东南亚', '欧洲', '日本', '韩国', '中东', '东北', '西北', '江南'];
  var KW = [];
  function buildKW() {
    S.glossary.forEach(function (g) { KW.push({ w: g.term, t: 'c', d: g }); });
    S.figures.forEach(function (f) { KW.push({ w: f.name, t: 'p', d: f }); });
    PLACES.forEach(function (p) { KW.push({ w: p, t: 'l', d: { term: p, cat: '地名' } }); });
    KW.sort(function (a, b) { return b.w.length - a.w.length; });
  }
  function highlight(text) {
    var out = '', i = 0, hit = null, k;
    while (i < text.length) {
      hit = null;
      for (k = 0; k < KW.length; k++) {
        if (text.substr(i, KW[k].w.length) === KW[k].w) { hit = KW[k]; break; }
      }
      if (hit) {
        out += '<span class="hl-' + hit.t + '" data-w="' + esc(hit.w) + '" data-t="' + hit.t + '">' + esc(hit.w) + '</span>';
        i += hit.w.length;
      } else { out += esc(text.charAt(i)); i += 1; }
    }
    return out;
  }

  /* ---------------- 原文阅读器 ---------------- */
  var curId = null, fontSize = 16, treeQuery = '', collapsed = {};
  function initReader() {
    buildKW();
    var saved = parseInt(store('kq_fsize') || '16', 10);
    if (saved === 15 || saved === 16 || saved === 18 || saved === 20) fontSize = saved;
    $('rsizeDown').addEventListener('click', function () { setFontSize(fontSize - 2); });
    $('rsizeUp').addEventListener('click', function () { setFontSize(fontSize + 2); });
    $('rprev').addEventListener('click', function () { stepChapter(-1); });
    $('rnext').addEventListener('click', function () { stepChapter(1); });
    $('treeSearch').addEventListener('input', function (e) { treeQuery = e.target.value.trim(); renderTree(); });
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.className && String(t.className).indexOf('hl-') === 0) { showPop(t); return; }
      if (!$('popover').contains(t)) hidePop();
    });
    window.addEventListener('scroll', onReaderScroll, { passive: true });
    renderTree();
    var last = null;
    try { last = JSON.parse(store('kq_last') || 'null'); } catch (e) { last = null; }
    var restored = !!(last && last.id && CIDX[last.id]);
    loadChapter(restored ? last.id : CH[0].id, restored ? (last.pct || 0) : 0);
  }
  function setFontSize(n) {
    fontSize = Math.max(14, Math.min(21, n));
    store('kq_fsize', String(fontSize));
    $('rtext').style.setProperty('--rsize', fontSize + 'px');
    $('rsizeLabel').textContent = fontSize + 'px';
  }
  function renderTree() {
    var host = $('tree'), html = [];
    T.books.forEach(function (b) {
      var bk = b.id, closed = collapsed[bk] ? ' closed' : '';
      var chs = [];
      b.parts.forEach(function (p) {
        var items = p.chapters.filter(function (c) {
          return !treeQuery || c.title.indexOf(treeQuery) >= 0 || p.title.indexOf(treeQuery) >= 0;
        });
        if (!items.length) return;
        chs.push('<div class="treepart">' + esc(p.title) + '</div>');
        items.forEach(function (c) {
          chs.push('<a class="treech' + (c.id === curId ? ' on' : '') + '" data-id="' + c.id + '">' + esc(c.title) + '</a>');
        });
      });
      if (treeQuery && !chs.length) return;
      html.push('<div class="treebk' + closed + '" data-bk="' + bk + '">' + esc(b.no) + '<span class="ar">▾</span></div>');
      if (!collapsed[bk] || treeQuery) html.push(chs.join(''));
    });
    host.innerHTML = html.join('') || '<div style="padding:16px;color:var(--fg3);font-size:12px">没有匹配的章节</div>';
    var bs = host.querySelectorAll('.treebk'), as = host.querySelectorAll('.treech'), i;
    for (i = 0; i < bs.length; i++) {
      (function (el) {
        el.addEventListener('click', function () {
          var k = el.getAttribute('data-bk'); collapsed[k] = !collapsed[k]; renderTree();
        });
      })(bs[i]);
    }
    for (i = 0; i < as.length; i++) {
      (function (el) { el.addEventListener('click', function (e) { e.preventDefault(); loadChapter(el.getAttribute('data-id')); }); })(as[i]);
    }
  }
  function saveProgress() {
    if (!curId) return;
    var body = $('rbody');
    var max = Math.max(1, body.scrollHeight - window.innerHeight + 200);
    var pct = Math.max(0, Math.min(1, window.scrollY / max));
    try { store('kq_last', JSON.stringify({ id: curId, pct: pct })); } catch (e) {}
    $('rprog').style.width = (pct * 100).toFixed(1) + '%';
  }
  var scrollTid = 0;
  function onReaderScroll() {
    if (currentView() !== 'reader') return;
    if (scrollTid) return;
    scrollTid = setTimeout(function () { scrollTid = 0; saveProgress(); }, 180);
  }
  function loadChapter(id, pct) {
    var c = CIDX[id];
    if (!c) return;
    if (curId && curId !== id) saveProgress();
    curId = id;
    var i = 0;
    for (i = 0; i < CH.length; i++) if (CH[i].id === id) break;
    var t = TINDEX[id] || {};
    $('rcrumb').textContent = c.bookNo + '　/　' + c.part + (c.group ? '　/　' + c.group : '');
    $('rtitle').textContent = c.title;
    $('rmeta').innerHTML = '第 ' + (i + 1) + ' / ' + CH.length + ' 章　·　' + num(c.chars) + ' 字　·　' + c.paras.length + ' 段' +
      (t.tags && t.tags.length ? '　·　' + t.tags.map(function (x) { return '<span class="chip">' + esc(x) + '</span>'; }).join('') : '');
    var cv = S.caveats[id];
    $('rnotice').style.display = cv ? 'block' : 'none';
    if (cv) $('rnotice').textContent = '阅读提示：本章标题涉及' + cv + '。以下为作者原文与个人观点，本站仅作整理，不推荐、不背书；请结合法律、伦理与自身处境独立判断。';
    $('rquote').style.display = QINDEX[id] ? 'block' : 'none';
    if (QINDEX[id]) $('rquote').textContent = '原文摘句：' + QINDEX[id];
    $('rtext').innerHTML = c.paras.map(function (p) { return '<p>' + highlight(p) + '</p>'; }).join('');
    $('rprev').disabled = (i === 0);
    $('rnext').disabled = (i === CH.length - 1);
    setFontSize(fontSize);
    renderTree();
    var node = $('tree').querySelector('.treech.on');
    if (node && node.scrollIntoView) { try { node.scrollIntoView({ block: 'nearest' }); } catch (e) {} }
    if (pct && pct > 0) {
      setTimeout(function () {
        var max = Math.max(1, $('rbody').scrollHeight - window.innerHeight + 200);
        window.scrollTo(0, max * pct);
      }, 40);
    } else { window.scrollTo(0, 0); }
    setTimeout(saveProgress, 120);
  }
  function stepChapter(d) {
    var i = 0;
    for (i = 0; i < CH.length; i++) if (CH[i].id === curId) break;
    var n = i + d;
    if (n >= 0 && n < CH.length) loadChapter(CH[n].id, 0);
  }
  function showPop(el) {
    var w = el.getAttribute('data-w'), t = el.getAttribute('data-t'), pop = $('popover');
    var title = w, sub = '', body = '', tail = '';
    if (t === 'c' && GINDEX[w]) {
      var g = GINDEX[w];
      sub = '概念 · ' + g.cat + ' · 出现 ' + g.count + ' 次 / ' + g.chapters + ' 章';
      body = g.def;
      tail = '<a class="minilink" id="popGo" href="#view-glossary">查看完整词条与出处 →</a>';
    } else if (t === 'p' && FINDEX[w]) {
      var f = FINDEX[w];
      sub = f.cat + ' · 出现 ' + f.count + ' 次 / ' + f.chapters + ' 章';
      body = f.desc || '书中反复出现的行动主体，点击可在人物谱中查看分组与出处。';
      tail = '<a class="minilink" id="popGo" href="#view-figures">在人物谱中查看 →</a>';
    } else {
      sub = '地名 · 原文出现的地理指称';
      body = '同一地名在全站正文中统一使用点线下划标注，便于与人名、概念区分。';
      tail = '';
    }
    pop.innerHTML = '<span class="pclose" id="popClose">×</span><b>' + esc(title) + '</b><span class="pk">' + esc(sub) + '</span>' +
      '<div>' + esc(body) + '</div><div style="margin-top:10px">' + tail + '</div>';
    pop.style.display = 'block';
    var r = el.getBoundingClientRect();
    var x = Math.min(window.innerWidth - 300, Math.max(8, r.left));
    var y = r.bottom + 8;
    if (y + 190 > window.innerHeight) y = Math.max(8, r.top - 195);
    pop.style.left = x + 'px'; pop.style.top = y + 'px';
    $('popClose').addEventListener('click', hidePop);
    var pg = $('popGo');
    if (pg) pg.addEventListener('click', function () { hidePop(); });
  }
  function hidePop() { var p = $('popover'); if (p) p.style.display = 'none'; }

  /* ---------------- 免责声明 / 资料说明 ---------------- */
  function renderAbout() {
    $('aboutBooks').innerHTML = S.books.map(function (b) {
      return '<div style="margin-bottom:10px"><b>' + esc(b.no) + '</b>　' + esc(b.src) + '<br/><span style="color:var(--fg3)">' + esc(b.note) + '</span></div>';
    }).join('');
    $('aboutMeta').textContent = '本次整理覆盖 ' + S.meta.books + ' 册 / ' + S.meta.parts + ' 部 / ' +
      S.meta.chapters + ' 章篇 / ' + S.meta.paras + ' 段 / ' + num(S.meta.chars) + ' 字。' + S.meta.missing;
    $('disclaimText').textContent =
      '本站点收录的正文仅用于个人阅读、学习与文本整理，著作权归原作者与出版方所有；禁止商用、禁止转载与公开传播。' +
      '第三、四部由影印件经本机 OCR 识别，可能存在个别错字；正文文字逐字保留，仅去除目录页与页码、并按句读重排段落边界，未作润色或改写。' +
      '书中观点为作者个人表述，涉及争议性手法与价值判断的内容已标注阅读提示，本站不作推荐、不构成任何建议。';
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    buildNav(); initTheme(); initVisit(); initHero(); initHeroContent();
    renderGuide(); initAxis(); renderAxisList(); initGlossary(); renderFigures();
    renderGraph(); renderAbout(); initReader();
    window.addEventListener('hashchange', function () {
      route();
      if (pendingChap) { var id = pendingChap; pendingChap = null; loadChapter(id, 0); }
    });
    window.addEventListener('resize', function () {
      if (currentView() === 'graph') renderGraph();
      if (currentView() === 'axis') { renderChart(); }
      if (window.__kqChart) window.__kqChart.resize();
    });
    route();
    if (pendingChap) { var id = pendingChap; pendingChap = null; loadChapter(id, 0); }
    if (window.__kqRedrawHero) window.__kqRedrawHero();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
