/* China GDP Nowcast dashboard */
const COL = {
  GDP: '#0B2566', IP: '#DA6814', Electr: '#F7AF4A', Constr: '#A53425',
  Freight: '#84623E', Exports: '#682D82', Imports: '#AF7EC7',
  PMInbs: '#227E45', PMImkt: '#52A9DB', BCI: '#D4A928',
  Retail: '#D96B8C', PMInm: '#66B373', FAI: '#1A8C8C', TB: '#7B5EA7',   /* paper slide palette: rose / light forest / teal */
  red: '#C8452A', band: 'rgba(31,78,156,0.18)', navy: '#1F4E9C', gray: '#8A93A2'
};
const SER_LABEL = {
  N924GDXY: 'IP', N924OVU: 'Electricity', Y924HSAT: 'Construction',
  N924IXD: 'Exports', N924IMD: 'Imports', N924TTH: 'Freight',
  S924VM: 'NBS PMI', S924VPMM: 'Markit PMI', S924M: 'Markit PMI',
  cntrad0715: 'Retail sales', cnsurv0013: 'Non-mfg PMI', cnnaac2066: 'FAI', cntrad1415: 'Trade balance',
  N924VB: 'BCI', N924NGPY: 'GDP'
};
const LABEL_COL = {
  'GDP': '#0B2566', 'Industrial production': '#DA6814',
  'Electricity production': '#F7AF4A', 'New constructions': '#A53425',
  'Freight traffic': '#84623E', 'Exports': '#682D82', 'Imports': '#AF7EC7',
  'NBS PMI': '#227E45', 'Markit PMI': '#52A9DB',
  'Retail sales': '#D96B8C', 'Non-mfg PMI': '#66B373',
  'Fixed asset investment': '#1A8C8C', 'Trade balance': '#7B5EA7',
  'Business climate Index': '#D4A928', 'Revisions & other': '#C7C7C7',
  'Undecomposed quarters, revisions & other': '#DCDCDC'
};
const SER_COL = {
  N924GDXY: COL.IP, N924OVU: COL.Electr, Y924HSAT: COL.Constr,
  N924IXD: COL.Exports, N924IMD: COL.Imports, N924TTH: COL.Freight,
  S924VM: COL.PMInbs, S924VPMM: COL.PMImkt, S924M: COL.PMImkt,
  cntrad0715: COL.Retail, cnsurv0013: COL.PMInm, cnnaac2066: COL.FAI, cntrad1415: COL.TB,
  N924VB: COL.BCI, N924NGPY: COL.GDP
};
// symmetric y-range for stacked impact bars: the largest positive / negative stack, padded
// (top: the upper end in units of the largest stack; the larger it is, the lower the bars end)
const barRange = (byLab, top = 1.9) => {
  const ls = Object.keys(byLab); let m = 0.02;
  const n = ls.length ? byLab[ls[0]].length : 0;
  for (let i = 0; i < n; i++) { let u = 0, d = 0; ls.forEach(l => { const v = byLab[l][i] || 0; if (v > 0) u += v; else d += v; }); m = Math.max(m, u, -d); }
  return [-1.15 * m, top * m];
};
// right-axis range that keeps the level line in the upper third of the panel, above the bars
const lineRange = vals => {
  const v = vals.filter(x => x != null && isFinite(x)); if (!v.length) return undefined;
  const lo = Math.min(...v), hi = Math.max(...v), span = Math.max(hi - lo, 0.4);
  return [lo - 3.2 * span, hi + 0.15 * span];
};
const LAYOUT = {
  font: { family: 'DM Sans, sans-serif', size: 13, color: '#1c2430' },
  paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(255,255,255,0)',
  margin: { l: 55, r: 25, t: 10, b: 45 },
  hovermode: 'x unified',
  legend: { orientation: 'h', y: -0.18 }
};
const qDate = (y, q) => `${y}-${String(3 * q).padStart(2, '0')}-15`;
const today = new Date();
const RANGE0 = ['2011-01-01', new Date(today.getTime() + 45*86400000).toISOString().slice(0,10)];
const XTIME = () => ({
  type: 'date', range: RANGE0.slice(),
  rangeslider: { visible: true, thickness: 0.07 },
  fixedrange: true          // period is set by the range slider; drag/box zoom acts on the values (y) only
});
// toolbar buttons that zoom the VALUES (y-axis) only; Plotly drops its own
// zoom buttons once the x-axis is fixed
const yZoom = f => gd => {
  const r = gd._fullLayout.yaxis.range, c = (r[0] + r[1]) / 2, h = (r[1] - r[0]) / 2 * f;
  Plotly.relayout(gd, { 'yaxis.range': [c - h, c + h] });
};
const TIMECFG = () => ({ responsive: true, displaylogo: false,
  modeBarButtonsToRemove: ['zoom2d', 'pan2d', 'select2d', 'lasso2d', 'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'resetScale2d'],
  modeBarButtonsToAdd: [
    { name: 'Zoom in (values)',  icon: Plotly.Icons.zoom_plus,  click: yZoom(0.6) },
    { name: 'Zoom out (values)', icon: Plotly.Icons.zoom_minus, click: yZoom(1 / 0.6) },
    { name: 'Reset values',      icon: Plotly.Icons.autoscale,  click: gd => Plotly.relayout(gd, { 'yaxis.autorange': true }) }
  ] });
// Values axis of the two history charts (quarterly and annual): by default the narrow range,
// from NARROW_FLOOR (the pandemic negatives stay off the chart) to a ceiling that follows the
// period chosen with the range slider: the largest value drawn in that period (lines, bands,
// benchmarks that are switched on; 2020-2021 aside), rounded up.  The whole sample gets a
// ceiling of 18, the last few years one of 8.  The button in the card title (btnId) switches
// to the full range and back.
const NARROW_FLOOR = 0;
const X_MS = new WeakMap();                    // x values of a trace in milliseconds, computed once
const xms = v => typeof v === 'number' ? v : Date.parse(String(v).replace(' ', 'T'));
const xmsArr = xs => { let a = X_MS.get(xs); if (!a) { a = xs.map(v => v == null ? NaN : xms(v)); X_MS.set(xs, a); } return a; };
// 2020 and 2021 do not count towards the ceiling: the rebound of 2021:Q1 (18.9 percent, a base
// effect) and the wide bands of 2020 are pandemic extremes, like the negatives the floor cuts
// (a period inside those two years falls back on all its points)
const PANDEMIC = [Date.parse('2020-01-01'), Date.parse('2022-01-01')];
const narrowY = gd => {
  const xr = gd._fullLayout.xaxis.range.map(xms);
  const topOf = skip => {
    let top = -Infinity;
    gd.data.forEach(t => {
      if (!Array.isArray(t.x) || !Array.isArray(t.y) || t.visible === false || t.visible === 'legendonly') return;
      const X = xmsArr(t.x);
      for (let i = 0; i < X.length; i++) {
        const y = t.y[i];
        if (y == null || !isFinite(y) || !(X[i] >= xr[0] && X[i] <= xr[1])) continue;
        if (skip && X[i] >= PANDEMIC[0] && X[i] < PANDEMIC[1]) continue;
        if (y > top) top = y;
      }
    });
    return top;
  };
  let top = topOf(true);
  if (!isFinite(top)) top = topOf(false);
  return [NARROW_FLOOR, isFinite(top) ? Math.max(2, Math.ceil(top + 0.25)) : 8];
};
const rangeToggle = (gd, btnId) => {
  const btn = document.getElementById(btnId);
  let mode = 'narrow';
  const label = () => { if (btn) { btn.textContent = mode === 'narrow' ? 'Show full range' : 'Narrow range'; btn.setAttribute('aria-pressed', mode === 'full'); } };
  const apply = () => {
    if (mode === 'full') return Plotly.relayout(gd, { 'yaxis.autorange': true });
    const r = narrowY(gd), cur = gd._fullLayout.yaxis.range;
    if (cur[0] !== r[0] || cur[1] !== r[1]) Plotly.relayout(gd, { 'yaxis.range': r });
  };
  if (btn) btn.addEventListener('click', () => { mode = mode === 'narrow' ? 'full' : 'narrow'; label(); apply(); });
  gd.on('plotly_relayout', e => {
    if (!e) return;
    if (e['yaxis.autorange'] === true && mode !== 'full') { mode = 'full'; label(); return; }   // the toolbar's "Reset values"
    if (mode === 'narrow' && Object.keys(e).some(k => k.indexOf('xaxis.') === 0)) apply();      // the range slider moved
  });
  gd.on('plotly_restyle', () => { if (mode === 'narrow') apply(); });                           // a benchmark switched on or off
  label(); apply();
};

// The hover text is written on a line ABOVE the chart, never on the chart itself (Plotly's own box
// follows the mouse and covers the lines).  A trace that reports carries hoverinfo 'none' (no box;
// the hover events and the vertical marker line stay) and its text per point in customdata; meta
// 'upd' marks the model's line, listed first.  hoverLine(gd) is called after every newPlot.
const HOVER_HINT = 'move the mouse over the chart to read the values';
const hoverLine = gd => {
  let el = gd.previousElementSibling;
  if (!el || !el.classList.contains('hover-line')) {
    el = document.createElement('div');  el.className = 'hover-line';
    gd.parentNode.insertBefore(el, gd);
  }
  const idle = () => { el.textContent = HOVER_HINT; el.classList.add('idle'); };
  idle();
  gd.on('plotly_hover', ev => {
    const pts = ((ev && ev.points) || []).filter(p => typeof p.customdata === 'string' && p.customdata);
    if (!pts.length) return;
    const rank = p => p.data.meta === 'upd' ? 0 : 1;
    pts.sort((a, b) => rank(a) - rank(b) || a.curveNumber - b.curveNumber);
    el.textContent = '';  el.classList.remove('idle');
    pts.forEach(p => { const s = document.createElement('span'); s.textContent = p.customdata; el.appendChild(s); });
  });
  gd.on('plotly_unhover', idle);
};

// ---- pieces shared by the charts: institution markers, government target ----
let IS_PUBLIC = false, DASH = null;
// institutions, paper markers: IMF triangle / OECD diamond / ADB square / WB circle
const INST = {
  IMF:  { sym: 'triangle-up', col: '#E68C1A', label: 'IMF WEO' },
  OECD: { sym: 'diamond',     col: '#D926A6', label: 'OECD EO' },
  ADB:  { sym: 'square',      col: '#7340A6', label: 'ADB ADO' },
  WB:   { sym: 'circle',      col: '#2170D1', label: 'WB GEP' }
};
// their marker on both annual charts: solid, with a black edge, at 75% opacity so the blue line
// still shows through (Wei's choice, 19 Nov 2026)
const instMarker = (k, size) => ({ symbol: INST[k].sym, size, color: INST[k].col, opacity: 0.75,
                                   line: { color: '#000', width: 0.8 } });
// the round points of the model line on the two progression charts: navy with a dark blue edge
const NOW_EDGE = '#0B2566';
const nowMarker = size => ({ size, color: COL.navy, line: { color: NOW_EDGE, width: 1.2 } });
const GOV_COL = '#BF1426';
const MK_SHAPE = {
  'triangle-up': '<path d="M6 1.2 L11 10.6 L1 10.6 Z"/>',
  'diamond':     '<path d="M6 0.8 L11.2 6 L6 11.2 L0.8 6 Z"/>',
  'square':      '<rect x="1.6" y="1.6" width="8.8" height="8.8"/>',
  'circle':      '<circle cx="6" cy="6" r="4.6"/>',
  'star':        '<path d="M6 0.6 L7.5 4.3 L11.5 4.5 L8.4 7 L9.4 10.9 L6 8.7 L2.6 10.9 L3.6 7 L0.5 4.5 L4.5 4.3 Z"/>'
};
// the marker a chart uses for an institution or the target, as an inline SVG (chips and legends)
const markSvg = (sym, col) => `<svg class="mk" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">` +
  `<g fill="${col}" stroke="#000" stroke-width="${sym === 'star' ? 0.5 : 0.8}">${MK_SHAPE[sym]}</g></svg>`;
// a government target as announced: "around 5%", "above 6%", "4.5–5%"
const tgtText = g => g.type === 'range' ? `${g.lo}–${g.hi}% (range)`
                   : g.type === 'floor' ? `above ${g.v}%` : `around ${g.v}%`;

fetch('data/dashboard.json?t=' + Date.now()).then(r => r.json()).then(D => {
  // public build (python/export_public.py): D.public is set; whether the released values of the
  // indicators are in the file depends on public.include_releases (see flowHTML)
  DASH = D;
  if (D.public) { IS_PUBLIC = true; document.body.classList.add('public'); }
  if (D.paper) { const pb = document.getElementById('paper-btn'); if (pb) { pb.href = D.paper; pb.hidden = false; } }
  document.getElementById('last-updated').textContent =
    (D.latest_vintage ? 'vintage ' + D.latest_vintage + ' · built ' : '') + D.generated;
  tabNowcast(D); renderQuarters(D); tabAnnual(D); renderYears(D); renderCalendar(D);
});

// ---- FAQ tab: the release calendar of the year (dashboard.json: calendar) ----
const CAL_SERIES = [['N924GDXY', 'Industrial prod.'], ['cntrad0715', 'Retail sales'], ['N924OVU', 'Electricity'],
  ['Y924HSAT', 'Construc&shy;tion'], ['N924IXD', 'Exports'], ['N924TTH', 'Freight'], ['S924VM', 'NBS PMI'],
  ['cnsurv0013', 'Non-mfg PMI'], ['S924VPMM', 'RatingDog PMI'], ['N924VB', 'Business climate'], ['N924NGPY', 'GDP']];
function renderCalendar(D) {
  const C = D.calendar;  const el = document.getElementById('faq-calendar');
  if (!C || !C.rows || !el) return;
  document.getElementById('faq-cal-year').textContent = C.year;
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmt = s => { const d = new Date(s + 'T00:00:00'); return d.getDate() + ' ' + MON[d.getMonth()]; };
  const today = new Date().toISOString().slice(0, 10);
  const by = {}, approx = {};  C.rows.forEach(r => { by[r.series + '|' + r.ref] = r.release; if (r.approx) approx[r.series + '|' + r.ref] = true; });
  let h = '<thead><tr><th>Data for</th>' + CAL_SERIES.map(s => `<th>${s[1]}</th>`).join('') + '</tr></thead><tbody>';
  for (let m = 1; m <= 12; m++) {
    const ref = C.year + '-' + String(m).padStart(2, '0');
    h += `<tr><td>${MON[m - 1]}${m % 3 === 0 ? ' / Q' + m / 3 : ''}</td>`;
    CAL_SERIES.forEach(s => {
      const d = by[s[0] + '|' + ref];
      const ap = approx[s[0] + '|' + ref];
      h += d ? `<td class="${d > today ? 'sched' : 'past'}${ap ? ' approx' : ''}"${ap ? ' title="approximate: not yet on a published schedule"' : ''}>${ap ? '~' : ''}${fmt(d)}</td>` : '<td class="ref">&ndash;</td>';
    });
    h += '</tr>';
  }
  el.innerHTML = h + '</tbody>';
}

document.querySelectorAll('.tab-button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    window.dispatchEvent(new Event('resize'));
  });
});

function tabNowcast(D) {
  const ev = D.eval, wk = D.weekly, tr = [];
  const nowTxt = d => d.med == null ? '' : `${d.y} Q${d.q}: ${d.med.toFixed(2)}% (update ${fmtDY(d.date)})`;
  tr.push({ x: ev.map(d => d.date), y: ev.map(d => d.hi), mode: 'lines',
    line: { width: 0 }, hoverinfo: 'skip', showlegend: false });
  tr.push({ x: ev.map(d => d.date), y: ev.map(d => d.lo), mode: 'lines',
    line: { width: 0 }, fill: 'tonexty', fillcolor: COL.band,
    hoverinfo: 'skip', name: '68% band' });
  tr.push({ x: ev.map(d => d.date), y: ev.map(d => d.med), mode: 'lines',
    line: { color: COL.navy, width: 2.4 }, name: 'Nowcast (evaluation)',
    // hover lines read "2026 Q3: 4.30% (update Aug 3, 2026)", on the line above the chart (hoverLine)
    hoverinfo: 'none', meta: 'upd', customdata: ev.map(nowTxt) });
  tr.push({ x: D.realized.map(d => qDate(d.y, d.q)), y: D.realized.map(d => d.v),
    mode: 'lines+markers', line: { color: COL.gray, width: 2.0, shape: 'hv' },
    marker: { size: 5 }, name: 'Realized GDP', hoverinfo: 'none',
    customdata: D.realized.map(d => `Official GDP ${d.y} Q${d.q}: ${d.v.toFixed(1)}%`) });
  if (wk.length) {
    tr.push({ x: wk.map(d => d.date), y: wk.map(d => d.med), mode: 'lines+markers',
      line: { color: COL.red, width: 2.2, dash: 'dot' }, marker: { size: 6 },
      name: 'Nowcast (weekly updates)', hoverinfo: 'none', meta: 'upd', customdata: wk.map(nowTxt) });
  }
  const last = wk.length ? wk[wk.length - 1] : ev[ev.length - 1];
  tr.push({ x: [last.date], y: [last.med], mode: 'markers',
    marker: { symbol: 'square', size: 13, color: COL.red,
              line: { color: '#fff', width: 1.5 } },
    name: 'Current nowcast', hoverinfo: 'skip' });
  D.weo.forEach(w => {});
  const weoApr = D.weo.filter(w => w.vintage === 'April WEO');
  const weoOct = D.weo.filter(w => w.vintage === 'October WEO');
  // WEO Q4/Q4: horizontal orange segments spanning Q4 only (paper style);
  // April vintage dashed, October vintage solid; null gaps break the years.
  const weoCol = 'rgba(230,140,26,0.85)';
  const weoSeg = arr => ({
    x: arr.flatMap(w => [`${w.year}-10-01`, `${w.year}-12-31`, null]),
    y: arr.flatMap(w => [w.v, w.v, null])
  });
  if (weoApr.length) { const g = weoSeg(weoApr);
    tr.push({ x: g.x, y: g.y, mode: 'lines', connectgaps: false,
      line: { color: weoCol, width: 2.8, dash: 'dash' }, hoverinfo: 'skip',   // hover: data and nowcast only
      name: 'IMF WEO Q4/Q4 (Apr)' }); }
  if (weoOct.length) { const g = weoSeg(weoOct);
    tr.push({ x: g.x, y: g.y, mode: 'lines', connectgaps: false,
      line: { color: weoCol, width: 2.8 }, hoverinfo: 'skip',
      name: 'IMF WEO Q4/Q4 (Oct)' }); }

  const layout = Object.assign({}, LAYOUT, {
    yaxis: { title: 'GDP growth, % YoY', zeroline: true, range: [NARROW_FLOOR, 8] },   // rangeToggle sets the ceiling
    xaxis: XTIME(),
    legend: { orientation: 'h', x: 0, y: -0.38, yanchor: 'top' },
    margin: { l: 55, r: 25, t: 10, b: 20 },
    annotations: [{
      x: last.date, y: last.med, ax: 0, ay: -42,
      text: `<b>${last.med.toFixed(1)}%</b><br>${last.y}Q${last.q}`,
      font: { size: 14, color: COL.red }, arrowcolor: COL.red, arrowwidth: 1.4
    }]
  });
  Plotly.newPlot('fig-nowcast', tr, layout, TIMECFG()).then(gd => { rangeToggle(gd, 'nowcast-yrange'); hoverLine(gd); });
}

/* ---------------- per-quarter section (NY Fed style) ---------------- */
const SER_FULL = {
  N924NGPY: 'GDP', N924GDXY: 'Industrial production', N924OVU: 'Electricity production',
  Y924HSAT: 'New constructions', N924TTH: 'Freight traffic', N924IXD: 'Exports',
  N924IMD: 'Imports', S924VM: 'NBS PMI', S924VPMM: 'Markit PMI', S924M: 'Markit PMI',
  cntrad0715: 'Retail sales', cnsurv0013: 'Non-mfg PMI', cnnaac2066: 'Fixed asset investment', cntrad1415: 'Trade balance',
  N924VB: 'Business climate Index'
};
const STACK_ORDER = ['GDP', 'Industrial production', 'Electricity production', 'New constructions',
  'Freight traffic', 'Exports', 'Imports', 'Trade balance', 'Retail sales', 'Fixed asset investment',
  'NBS PMI', 'Non-mfg PMI', 'Markit PMI', 'Business climate Index', 'Revisions & other'];
const fmtD = s => { const d = new Date(s + 'T00:00:00'); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
const fmtDY = s => { const d = new Date(s + 'T00:00:00'); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };
// an impact in pp with two decimals for the hover boxes (never '-0.00')
const pp2 = v => { const s = (Math.round((v || 0) * 100) / 100).toFixed(2); return s === '-0.00' ? '0.00' : s; };
const fmtRef = r => { const [y, m] = r.split('-'); return new Date(+y, +m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); };
const signed = v => (v > 0 ? '+' : '') + v.toFixed(2);
/* ---------------- pieces shared by the per-quarter and per-year sections ---------------- */
// a weight: three decimals, four when it is below 0.01
const fmtW = v => v == null ? '' : (Math.abs(v) < 0.0095 ? v.toFixed(4) : v.toFixed(3));
const clsPP = v => v > 0.0005 ? 'num pos' : (v < -0.0005 ? 'num neg' : 'num');
// bar positions on a date axis: noon of the update's day; updates one or two days apart would
// overlap, so a bar that would touch the previous one is moved just to its right (the slides' rule)
const barX = (dates, barw, gapw) => {
  const pos = [];
  dates.forEach((d, i) => {
    let t = Date.parse(d + 'T12:00:00Z');
    if (i > 0 && t - pos[i - 1] < barw + gapw) t = pos[i - 1] + barw + gapw;
    pos.push(t);
  });
  return pos.map(t => new Date(t).toISOString().slice(0, 16).replace('T', ' '));
};
// density of update i of a path: its own (dens: the pdf on an even grid from x0 to x1), else the
// section's latest density when it is that update's
const densOf = (obj, i) => {
  const p = obj.path[i], d = p.dens;
  if (d && d.p && d.p.length > 1) {
    const n = d.p.length;
    return { x: d.p.map((_, k) => d.x0 + (d.x1 - d.x0) * k / (n - 1)), pdf: d.p };
  }
  return obj.density && obj.density.date === p.date ? obj.density : null;
};
// one x-range for every update of the path (where a density exceeds 1% of its peak), so that
// stepping through the updates shows the density move and narrow on a fixed axis
const densRange = (obj, extra) => {
  let lo = Infinity, hi = -Infinity;
  obj.path.forEach((p, i) => {
    const d = densOf(obj, i);  if (!d) return;
    const m = 0.01 * Math.max.apply(null, d.pdf);
    d.pdf.forEach((v, k) => { if (v >= m) { if (d.x[k] < lo) lo = d.x[k]; if (d.x[k] > hi) hi = d.x[k]; } });
  });
  (extra || []).forEach(v => { if (v != null) { lo = Math.min(lo, v - 0.15); hi = Math.max(hi, v + 0.15); } });
  return isFinite(lo) && isFinite(hi) ? [lo, hi] : undefined;
};
// the part of a density between a and b (the pdf is interpolated at the two ends, like the curve)
const densSeg = (dt, a, b) => {
  const x = dt.x, n = x.length;
  const at = v => {
    if (v <= x[0]) return dt.pdf[0];
    if (v >= x[n - 1]) return dt.pdf[n - 1];
    let k = 1;  while (x[k] < v) k++;
    return dt.pdf[k - 1] + (v - x[k - 1]) / (x[k] - x[k - 1]) * (dt.pdf[k] - dt.pdf[k - 1]);
  };
  a = Math.max(a, x[0]);  b = Math.min(b, x[n - 1]);
  const X = [a], Y = [at(a)];
  x.forEach((v, k) => { if (v > a && v < b) { X.push(v); Y.push(dt.pdf[k]); } });
  X.push(b);  Y.push(at(b));
  return { x: X, y: Y };
};
// shades of the density: the whole curve, the 80% interval and the 68% interval, the same two
// intervals as the bands of the history chart.  The layers are drawn one over the other, so
// DENS_ADD holds what each layer adds and DENS_TONE the tone the reader sees (legend swatches).
const DENS_TONE = { all: 0.08, p80: 0.21, p68: 0.38 };
const DENS_ADD = { all: 0.08, p80: 0.14, p68: 0.215 };
const densFill = a => `rgba(31,78,156,${a})`;
// the density chart of update i.  o: fig, title (element ids), xtitle, ref ({v, text}: the official
// number, when published), range (x-range; undefined = fitted to this density)
function drawDensity(obj, i, o) {
  const p = obj.path[i], dt = densOf(obj, i), el = document.getElementById(o.fig);
  document.getElementById(o.title).textContent = 'Probability density' + (dt ? ' (' + fmtD(p.date) + ')' : '');
  if (!dt) {
    Plotly.purge(el);
    el.innerHTML = '<p style="color:#6b7482;padding:12px">No density stored for this update.</p>';
    const hl = el.previousElementSibling;
    if (hl && hl.classList.contains('hover-line')) hl.textContent = '';
    const lgOld = el.nextElementSibling;
    if (lgOld && lgOld.classList.contains('dens-legend')) lgOld.innerHTML = '';
    return;
  }
  // the 68% and 80% intervals of this update (quantiles of the posterior draws, as in the text
  // above the chart), shaded under the curve and listed below the chart
  const bandTr = [], lgItems = [];
  [['p80', p.lo80, p.hi80, '80%'], ['p68', p.lo, p.hi, '68%']].forEach(([key, a, b, lab]) => {
    if (a == null || b == null || !(b > a)) return;
    bandTr.push(Object.assign(densSeg(dt, a, b), { mode: 'lines', line: { width: 0 }, fill: 'tozeroy',
      fillcolor: densFill(DENS_ADD[key]), hoverinfo: 'skip', showlegend: false }));
    lgItems.unshift(`<span class="item"><span class="sq" style="background:${densFill(DENS_TONE[key])}"></span>` +
      `${lab} interval [${a.toFixed(1)}, ${b.toFixed(1)}]%</span>`);
  });
  let lg = el.nextElementSibling;
  if (!lg || !lg.classList.contains('dens-legend')) {
    lg = document.createElement('div');  lg.className = 'q-legend dens-legend';
    el.parentNode.insertBefore(lg, el.nextSibling);
  }
  lg.innerHTML = lgItems.join('');
  if (!el.querySelector('.plot-container')) el.innerHTML = '';
  const ref = o.ref, refLeft = ref && ref.v < p.med;
  const shapes = [{ type: 'line', x0: p.med, x1: p.med, y0: 0, y1: 1, yref: 'paper',
                    line: { color: COL.red, width: 1.5, dash: 'dot' } }];
  if (ref) shapes.push({ type: 'line', x0: ref.v, x1: ref.v, y0: 0, y1: 1, yref: 'paper',
                         line: { color: COL.gray, width: 1.5 } });
  // labels sit ABOVE the plot area, each on the far side of its line from the other label, so
  // they never overlap the curve or each other
  const ann = [{ x: p.med, y: 1, yref: 'paper', text: '<b>' + p.med.toFixed(1) + '%</b>', showarrow: false,
                 xanchor: refLeft ? 'left' : 'right', yanchor: 'bottom', yshift: 2,
                 xshift: refLeft ? 3 : -3, font: { color: COL.red, size: 12 } }];
  if (ref) ann.push({ x: ref.v, y: 1, yref: 'paper', text: ref.text, showarrow: false,
                      xanchor: refLeft ? 'right' : 'left', yanchor: 'bottom', yshift: 2,
                      xshift: refLeft ? -3 : 3, font: { color: COL.gray, size: 11 } });
  Plotly.newPlot(el, bandTr.concat([{ x: dt.x, y: dt.pdf, mode: 'lines', fill: 'tozeroy', fillcolor: densFill(DENS_ADD.all),
                        line: { color: COL.navy, width: 2 }, name: 'density', hoverinfo: 'none',
                        customdata: dt.x.map((x, k) => `${x.toFixed(2)}%: density ${dt.pdf[k].toFixed(3)}`) }]),
    Object.assign({}, LAYOUT, {
      showlegend: false, shapes, margin: { l: 45, r: 15, t: 24, b: 35 }, hovermode: 'x',
      xaxis: Object.assign({ title: o.xtitle, zeroline: false }, o.range ? { range: o.range.slice() } : {}),
      yaxis: { title: 'density', rangemode: 'tozero' }, annotations: ann
    }), { responsive: true, displaylogo: false }).then(hoverLine);
}
// The data-flow table of both sections, with the whole algebra of the news on every release row:
// actual and model forecast, news = actual - forecast, weight, impact (the posterior mean of
// weight x news).  The public build has the same columns since public.include_releases is on
// (pipeline_config.json, Wei's decision of 18 Nov 2026).  With that switch off its file has the
// actual of the GDP rows only (gdp_official: the NBS number; the release values of the other
// series are vendor data, and forecast = actual - news, so the two are left out together): its
// tables then get the two columns when one of the listed rows has them, and a line saying so.  The row of an update (bold date) carries the change in the
// estimate since the previous update, which the rows below it add up to, and the new level; the
// rows of its releases carry their release date in the same first column.
//   P     the path, oldest update first;  idx  the updates to list, in display order
//   o     hdrImpact, hdrLevel (column titles), tag(p), label(it), revLabel(p), empty(p), borrowed,
//         sel (true: one picked update, followed by the row of the update before it)
const actOf = it => it.actual != null ? it.actual : (it.gdp_official != null ? it.gdp_official : null);
function flowHTML(P, idx, o) {
  const AF = !IS_PUBLIC || idx.some(i => P[i].items.some(it => actOf(it) != null));   // actual and forecast columns
  const NC = AF ? 5 : 3;                             // numeric columns between the series and the level
  const blank = n => '<td></td>'.repeat(n);
  let h = '<thead><tr><th>Update,<br>release</th><th>Data series</th>' +
          (AF ? '<th class="num">Actual</th><th class="num">Forecast</th>' : '') +
          '<th class="num">News</th><th class="num">Weight</th>' +
          `<th class="num">${o.hdrImpact}</th><th class="num">${o.hdrLevel}</th></tr></thead><tbody>`;
  idx.forEach(i => {
    const p = P[i], chg = i > 0 ? p.med - P[i - 1].med : null;
    h += `<tr class="q-update"><td>${fmtD(p.date)}</td><td class="ref">${o.tag(p)}</td>${blank(NC - 1)}` +
         `<td class="${chg == null ? 'num' : clsPP(chg)}">${chg == null ? '' : signed(chg)}</td>` +
         `<td class="num">${p.med.toFixed(2)}</td></tr>`;
    p.items.forEach(it => {
      const act = actOf(it);
      h += `<tr><td class="rel">${it.release ? fmtD(it.release) : ''}</td><td>${o.label(it)}</td>` +
           (AF ?
             `<td class="num">${act == null ? '' : act.toFixed(2)}</td>` +
             `<td class="num">${act == null || it.news == null ? '' : (act - it.news).toFixed(2)}</td>` : '') +
           `<td class="num">${it.news == null ? '' : signed(it.news)}</td>` +
           `<td class="num">${fmtW(it.weight)}</td>` +
           `<td class="${it.impact == null ? 'num ref' : clsPP(it.impact)}">${it.impact == null ? '–' : signed(it.impact)}</td><td></td></tr>`;
    });
    if (p.borrowed && o.borrowed) {
      h += `<tr><td></td><td class="ref" colspan="${NC + 1}">${o.borrowed}</td><td></td></tr>`;
    }
    if (p.rev != null) {
      const rl = o.revLabel(p);
      h += `<tr><td></td><td><span class="sq" style="background:${LABEL_COL[rl]}"></span>${rl.replace('&', '&amp;')}</td>` +
           `${blank(NC - 1)}<td class="${clsPP(p.rev)}">${signed(p.rev)}</td><td></td></tr>`;
    }
    if (!p.items.length && p.rev == null) {
      h += `<tr><td></td><td class="ref" colspan="${NC + 1}">${o.empty(p)}</td><td></td></tr>`;
    }
  });
  if (o.sel && idx.length && idx[0] > 0) {
    const pv = P[idx[0] - 1];
    h += `<tr class="q-update q-prev"><td>${fmtD(pv.date)}</td><td class="ref">previous update</td>${blank(NC)}` +
         `<td class="num">${pv.med.toFixed(2)}</td></tr>`;
  }
  // only when the public file was written without the release values (public.include_releases off)
  if (IS_PUBLIC && AF && idx.some(i => P[i].items.some(it => actOf(it) == null))) {
    h += `<tr class="q-foot"><td></td><td class="ref" colspan="${NC + 2}">Actual and forecast are shown for GDP (official NBS number). ` +
         'The release values of the other series are licensed data.</td></tr>';
  }
  return h + '</tbody>';
}
// The box of a data-flow table ends at the bottom edge of the chart beside it: the expanded list
// scrolls inside it and never runs below the chart.  In the one-column layout (the table is under
// the chart) and on a hidden tab it keeps the max-height of the stylesheet.  Refitted whenever the
// grid changes size (window, tab shown, hover lines added) and after every rendering of the table.
const fitFlow = (tableId, figId) => {
  const tb = document.getElementById(tableId), fig = document.getElementById(figId);
  if (!tb || !fig || !fig.offsetParent) return;
  const wrap = tb.parentNode;
  const h = fig.getBoundingClientRect().bottom - wrap.getBoundingClientRect().top;
  wrap.style.maxHeight = h > 200 ? Math.round(h) + 'px' : '';
};
const watchFlow = (tableId, figId) => {
  const fit = () => fitFlow(tableId, figId);
  const grid = document.getElementById(figId).closest('.q-grid');
  if (grid && window.ResizeObserver) new ResizeObserver(fit).observe(grid);
  window.addEventListener('resize', fit);
};
// the HTML legend below an impact chart (never collides with the axis, any width)
const lgBar = (col, name) => `<span class="item"><span class="sq" style="background:${col}"></span>${name}</span>`;
const lgLine = (col, dashed, name) => `<span class="item"><span class="ln" style="border-color:${col};border-style:${dashed ? 'dashed' : 'solid'}"></span>${name}</span>`;
// an invisible trace that puts the official number in the hover box of every update of an impact chart
const hoverCarrier = (xb, v, name) => ({ x: xb, y: xb.map(() => v), mode: 'lines', yaxis: 'y2', line: { width: 0 }, opacity: 0,
  showlegend: false, name, hoverinfo: 'none', customdata: xb.map(() => `${name}: ${v.toFixed(1)}%`) });
// the ring that marks the picked update on an impact chart (its position is set by restyle)
const selTrace = () => ({ x: [null], y: [null], yaxis: 'y2', mode: 'markers', hoverinfo: 'skip', showlegend: false,
  marker: { size: 14, color: 'rgba(0,0,0,0)', line: { color: COL.red, width: 2.5 } } });

let Q_EXPANDED = false, Q_CUR = null, Q_SEL = null, Q_PICK = null;

function renderQuarters(D) {
  const Q = D.quarters || [];
  const card = document.getElementById('quarter-card');
  if (!Q.length) { if (card) card.hidden = true; return; }
  const box = document.getElementById('q-chips');
  box.innerHTML = '';
  Q.slice().reverse().forEach((qq, i) => {
    const b = document.createElement('button');
    b.className = 'q-chip' + (i === 0 ? ' active' : '');
    b.textContent = qq.label;
    b.addEventListener('click', () => {
      box.querySelectorAll('.q-chip').forEach(c => c.classList.remove('active'));
      b.classList.add('active'); Q_EXPANDED = false; showQuarter(qq);
    });
    box.appendChild(b);
  });
  document.getElementById('q-expand').addEventListener('click', () => {
    if (Q_SEL != null) { if (Q_PICK) Q_PICK(Q_SEL); return; }       // back from the picked update to the list
    Q_EXPANDED = !Q_EXPANDED;
    renderFlow(Q_CUR);
  });
  showQuarter(Q[Q.length - 1]);
  watchFlow('q-flow', 'fig-q-impact');
}

function showQuarter(qq) {
  Q_CUR = qq; Q_SEL = null; Q_PICK = null;
  const P = qq.path, last = P[P.length - 1];
  const lab = qq.label.replace(':', ' ');
  let s = `Latest update ${fmtDY(last.date)}: the ${last.phase} for ${lab} is <b>${last.med.toFixed(1)}%</b>` +
          ` (68% probability interval at [${last.lo.toFixed(1)}, ${last.hi.toFixed(1)}]%` +
          (last.lo80 != null ? `, 80% probability interval at [${last.lo80.toFixed(1)}, ${last.hi80.toFixed(1)}]%` : '') + ').';
  if (P.length > 1) {
    const dlt = last.med - P[P.length - 2].med;
    s += ` News since ${fmtD(P[P.length - 2].date)} ${dlt >= 0 ? 'raised' : 'lowered'} the estimate by ${Math.abs(dlt).toFixed(2)} pp.`;
  }
  if (qq.gdp) s += ` Official GDP: <b>${qq.gdp.v.toFixed(1)}%</b>${qq.gdp.date ? ' (released ' + fmtDY(qq.gdp.date) + ')' : ''}.`;
  document.getElementById('q-summary').innerHTML = s;

  // ---- density: the latest update's; a click on the chart below shows the picked update's ----
  const dOpt = { fig: 'fig-q-density', title: 'q-density-title', xtitle: 'GDP growth, % YoY',
                 ref: qq.gdp ? { v: qq.gdp.v, text: 'GDP ' + qq.gdp.v.toFixed(1) + '%' } : null };
  const dRange = densRange(qq, [qq.gdp ? qq.gdp.v : null]);
  drawDensity(qq, P.length - 1, dOpt);

  // ---- impact of data releases: stacked bars per model update + nowcast line ----
  // a date axis over the quarter's whole cycle: from its first day to the end of the month after it
  // (the month of its GDP release), so an open quarter shows how much of the cycle is still to come
  const xs = P.map(p => p.date);
  const q0 = new Date(Date.UTC(qq.y, 3 * qq.q - 3, 1)), qEnd = new Date(Date.UTC(qq.y, 3 * qq.q + 1, 0));
  const iso = d => d.toISOString().slice(0, 10);
  const xFirst = xs[0] < iso(q0) ? xs[0] : iso(q0);
  const xLast = qq.gdp && qq.gdp.date > iso(qEnd) ? qq.gdp.date : iso(qEnd);
  const DAY = 86400000, BARW = 2.0 * DAY, GAPW = 0.35 * DAY;   // bar width two days, gap between neighbours
  const xb = barX(xs, BARW, GAPW);
  const dates = xs.map(d => fmtD(d));
  const byLab = {};
  STACK_ORDER.forEach(l => byLab[l] = P.map(() => 0));
  P.forEach((p, i) => {
    p.items.forEach(it => { const l = SER_FULL[it.series] || it.series; if (!(l in byLab)) byLab[l] = P.map(() => 0); byLab[l][i] += it.impact || 0; });
    if (p.rev != null) byLab['Revisions & other'][i] += p.rev;
  });
  const tr = [], lg = [];
  Object.keys(byLab).forEach(l => {
    if (!byLab[l].some(v => Math.abs(v) > 1e-6)) return;
    // no hover on the bars: the box carries the nowcast and the official number only; the impacts
    // of an update are in the table (a click on the update lists them)
    tr.push({ x: xb, y: byLab[l], type: 'bar', width: BARW, name: l, marker: { color: LABEL_COL[l] || COL.gray }, hoverinfo: 'skip' });
    lg.push(lgBar(LABEL_COL[l] || COL.gray, l));
  });
  tr.push({ x: xb, y: P.map(p => p.med), mode: 'lines+markers', name: lab + ' ' + 'nowcast', yaxis: 'y2', meta: 'upd',
            line: { color: COL.navy, width: 2.2 }, marker: nowMarker(6), hoverinfo: 'none',
            customdata: P.map((p, i) => `${lab}: ${p.med.toFixed(2)}% (update ${dates[i]})`) });
  lg.push(lgLine(COL.navy, false, lab + ' nowcast'));
  if (qq.gdp) {
    tr.push({ x: [xFirst, xLast], y: [qq.gdp.v, qq.gdp.v], mode: 'lines', name: 'Official GDP', yaxis: 'y2',
              line: { color: COL.gray, width: 1.5, dash: 'dash' }, hoverinfo: 'skip' });
    tr.push(hoverCarrier(xb, qq.gdp.v, 'Official GDP'));
    lg.push(lgLine(COL.gray, true, 'Official GDP'));
  }
  tr.push(selTrace());
  const selIdx = tr.length - 1;
  // bars on their own symmetric axis (left, pp); the nowcast level on the right axis (percent)
  Plotly.newPlot('fig-q-impact', tr, Object.assign({}, LAYOUT, {
    barmode: 'relative', hovermode: 'x unified', showlegend: false,
    margin: { l: 55, r: 55, t: 15, b: 60 },
    xaxis: { type: 'date', range: [xFirst, xLast], dtick: 'M1', tick0: iso(q0), tickformat: '%b %Y', ticklabelmode: 'period',
             title: { text: 'model update', standoff: 12 }, automargin: true, tickfont: { size: 11 }, hoverformat: ' ' },
    shapes: qq.gdp && qq.gdp.date ? [{ type: 'line', x0: qq.gdp.date, x1: qq.gdp.date, y0: 0, y1: 1, yref: 'paper',
             line: { color: COL.gray, width: 1, dash: 'dot' } }] : [],
    yaxis: { title: 'impact, pp', zeroline: true, zerolinecolor: '#999', range: barRange(byLab), fixedrange: false },
    yaxis2: { title: { text: 'nowcast, percent', font: { color: COL.navy } }, tickfont: { color: COL.navy },
              overlaying: 'y', side: 'right', showgrid: false, zeroline: false,
              range: lineRange(P.map(p => p.med).concat(qq.gdp ? [qq.gdp.v] : [])) }
  }), { responsive: true, displaylogo: false }).then(gd => {
    if (Q_CUR !== qq) return;
    hoverLine(gd);
    // a click on an update (its point or its bars) picks it: its density above, the decomposition
    // of the change since the previous update in the table; a second click on it goes back
    Q_PICK = i => {
      Q_SEL = Q_SEL === i ? null : i;
      const k = Q_SEL;
      Plotly.restyle(gd, { x: [[k == null ? null : xb[k]]], y: [[k == null ? null : P[k].med]] }, [selIdx]);
      drawDensity(qq, k == null ? P.length - 1 : k, Object.assign({}, dOpt, { range: k == null ? undefined : dRange }));
      renderFlow(qq);
    };
    gd.on('plotly_click', ev => {
      const pt = ((ev && ev.points) || []).find(q => q.data.meta === 'upd');
      if (pt && Q_PICK) Q_PICK(pt.pointNumber);
    });
  });
  document.getElementById('q-impact-legend').innerHTML = lg.join('');

  renderFlow(qq);
}

function renderFlow(qq) {
  const P = qq.path, n = P.length, N_SHOW = 4, sel = Q_SEL;
  const btn = document.getElementById('q-expand');
  let idx, title;
  if (sel != null) {
    idx = [sel];
    title = sel > 0 ? `Change in the nowcast, ${fmtD(P[sel - 1].date)} to ${fmtD(P[sel].date)}` : `Data flow (${fmtD(P[sel].date)})`;
    btn.hidden = false;  btn.textContent = 'Show all updates';
  } else {
    idx = P.map((_, i) => i).reverse();                 // newest update first
    if (!Q_EXPANDED) idx = idx.slice(0, N_SHOW);
    title = 'Data flow (' + fmtD(P[n - 1].date) + ')';
    btn.hidden = n <= N_SHOW;
    btn.textContent = Q_EXPANDED ? 'Collapse' : `Expand (${n} updates)`;
  }
  document.getElementById('q-flow-title').textContent = title;
  document.getElementById('q-flow').innerHTML = flowHTML(P, idx, {
    sel: sel != null, hdrImpact: 'Impact', hdrLevel: 'Nowcast',
    tag: p => p.phase === 'backcast' ? 'backcast' : '',
    label: it => { const l = SER_FULL[it.series] || it.series;
      return `<span class="sq" style="background:${LABEL_COL[l] || COL.gray}"></span>${l} <span class="ref">${fmtRef(it.ref)}</span>`; },
    revLabel: () => 'Revisions & other',
    borrowed: 'impact on this quarter\'s backcast not decomposed (vintages before Sep 2026)',
    empty: p => p.phase === 'backcast'
      ? 're-estimated with this date\'s releases; their impact on the backcast quarter was not decomposed for vintages before Sep 2026'
      : 'no new releases'
  });
  fitFlow('q-flow', 'fig-q-impact');
}

function tabAnnual(D) {
  const tr = [];
  const yrSeg = (arr, get) => ({
    x: arr.flatMap(d => [`${d.year}-01-01`, `${d.year}-12-31`, null]),
    y: arr.flatMap(d => [get(d), get(d), null])
  });
  const off = (D.annual_official || []);
  const offP = off.filter(d => d.prelim != null), offF = off.filter(d => d.final != null);
  // hover on the year-end point only (the Jan 1 point of the next year would
  // otherwise appear as a second entry near every year boundary)
  // drawn as year segments without hover; hover values come from carriers
  // below that follow every model-update date (so the two lines always report)
  if (offP.length) { const g = yrSeg(offP, d => d.prelim);
    tr.push({ x: g.x, y: g.y, mode: 'lines', connectgaps: false, hoverinfo: 'skip',
      line: { color: '#9AA3B0', width: 1.2 }, name: 'Annual GDP [Preliminary]' }); }
  if (offF.length) { const g = yrSeg(offF, d => d.final);
    tr.push({ x: g.x, y: g.y, mode: 'lines', connectgaps: false, hoverinfo: 'skip',
      line: { color: '#6E7684', width: 2.0 }, name: 'Annual GDP [Final]' }); }
  // the hover box carries two things only, the data and the nowcast: one official number per year
  // (the final one when it is out, else the preliminary one) and the model's median
  const A0 = D.annual_hist || [];
  {
    const byYear = {};
    off.forEach(d => { const fin = d.final != null; if (fin || d.prelim != null) byYear[d.year] = { v: fin ? d.final : d.prelim, tag: fin ? 'final' : 'preliminary' }; });
    const pts = A0.map(d => ({ x: d.date, o: byYear[d.date.slice(0, 4)] })).filter(p => p.o);
    if (pts.length) tr.push({ x: pts.map(p => p.x), y: pts.map(p => p.o.v), mode: 'lines',
      line: { width: 0 }, opacity: 0, showlegend: false, hoverinfo: 'none',
      customdata: pts.map(p => `${p.x.slice(0, 4)} official annual GDP (${p.o.tag}): ${p.o.v.toFixed(2)}%`) });
  }

  const A = D.annual_hist || [];
  if (A.length) {
    // each calendar year is its own fan: insert a gap at every year boundary so
    // the band is not interpolated from the last December vintage (narrow) to
    // the first January vintage (wide) of the next year
    // per-year fills and median (no hover: near a year boundary the unified
    // hover would show the neighbouring year's nearest point as well)
    const years = [...new Set(A.map(d => d.date.slice(0, 4)))];
    years.forEach(yr => {
      let S = A.filter(d => d.date.slice(0, 4) === yr);
      // carry the fan back to Jan 1 at the first update's values (the first
      // release of a year can fall two weeks in); hover uses real dates only
      if (S[0].date !== `${yr}-01-01`) S = [Object.assign({}, S[0], { date: `${yr}-01-01` })].concat(S);
      const X = S.map(d => d.date);
      const band = (k, extra) => Object.assign({ x: X, y: S.map(d => d[k]), mode: 'lines',
        line: { width: 0 }, showlegend: false, hoverinfo: 'skip' }, extra);
      tr.push(band('q95'));
      tr.push(band('q5', { fill: 'tonexty', fillcolor: 'rgba(31,78,156,0.08)' }));
      tr.push(band('q84'));
      tr.push(band('q16', { fill: 'tonexty', fillcolor: 'rgba(31,78,156,0.16)' }));
      tr.push({ x: X, y: S.map(d => d.med), mode: 'lines', line: { color: COL.navy, width: 2.4 },
        name: 'Model-implied annual rate', showlegend: yr === years[0], hoverinfo: 'skip' });
    });
    // one continuous, invisible carrier for the median: exactly one hover value (the bands are
    // read off the chart; the percentiles of every update are in the archive)
    tr.push({ x: A.map(d => d.date), y: A.map(d => d.med), mode: 'lines',
      line: { width: 0 }, opacity: 0, showlegend: false, name: 'Model-implied annual rate',
      hoverinfo: 'none', meta: 'upd',
      customdata: A.map(d => d.med == null ? '' : `${d.date.slice(0, 4)}: ${d.med.toFixed(2)}% (update ${fmtDY(d.date)})`) });
    // legend entries for the bands (the fills above stay unlabeled)
    tr.push({ x: [null], y: [null], mode: 'lines', line: { color: 'rgba(31,78,156,0.16)', width: 10 }, name: '16-84% band', hoverinfo: 'skip' });
    tr.push({ x: [null], y: [null], mode: 'lines', line: { color: 'rgba(31,78,156,0.08)', width: 10 }, name: '5-95% band', hoverinfo: 'skip' });
  }
  const wk = D.weekly.filter(d => d.ann_med != null);
  if (wk.length) {
    tr.push({ x: wk.map(d => d.date), y: wk.map(d => d.ann_med), mode: 'lines+markers',
      line: { color: COL.red, width: 2.2, dash: 'dot' }, marker: { size: 6 },
      name: 'Weekly updates', hoverinfo: 'none', meta: 'upd',
      customdata: wk.map(d => `${d.date.slice(0, 4)}: ${d.ann_med.toFixed(2)}% (update ${fmtDY(d.date)})`) });
    const last = wk[wk.length - 1];
    tr.push({ x: [last.date], y: [last.ann_med], mode: 'markers',
      marker: { symbol: 'square', size: 12, color: COL.red, line: { color: '#fff', width: 1.5 } },
      showlegend: false, hoverinfo: 'skip' });
  }

  // institutions (markers: INST at the top of the file)
  Object.keys(INST).forEach(k => {
    const s = (D.institutions || []).filter(d => d.inst === k);
    if (!s.length) return;
    tr.push({ x: s.map(d => d.date), y: s.map(d => d.v), mode: 'markers', hoverinfo: 'skip',
      marker: instMarker(k, 11), name: INST[k].label });
  });

  // government targets: star (point), vertical bar (range), star (floor); like the institutions,
  // they are left out of the hover box (data and nowcast only)
  const gov = D.gov_targets || [], govCol = GOV_COL;
  const gp = gov.filter(g => g.type !== 'range');
  if (gp.length) tr.push({ x: gp.map(g => g.date), y: gp.map(g => g.v), mode: 'markers', hoverinfo: 'skip',
    marker: { symbol: 'star', size: 10, color: govCol, opacity: 0.75,
              line: { color: '#000', width: 0.5 } }, name: 'Govt. target' });
  const gr = gov.filter(g => g.type === 'range');
  if (gr.length) tr.push({
    x: gr.flatMap(g => [g.date, g.date, null]),
    y: gr.flatMap(g => [g.lo, g.hi, null]),
    mode: 'lines', connectgaps: false, hoverinfo: 'skip',
    line: { color: govCol, width: 4 }, opacity: 0.75, name: 'Govt. target (range)' });

  const layout = Object.assign({}, LAYOUT, {
    yaxis: { title: 'annual GDP growth, %', range: [NARROW_FLOOR, 8] },   // rangeToggle sets the ceiling
    xaxis: XTIME(),
    legend: { orientation: 'h', x: 0, y: -0.38, yanchor: 'top' },
    margin: { l: 55, r: 25, t: 10, b: 20 },
    annotations: gov.filter(g => g.type === 'floor').map(g => ({
      x: g.date, y: g.v, ax: 0, ay: -26, text: '≥',
      font: { size: 13, color: govCol }, arrowcolor: govCol, arrowside: 'start'
    })).concat(wk.length ? [{
      x: wk[wk.length - 1].date, y: wk[wk.length - 1].ann_med, ax: 0, ay: -40,
      text: `<b>${wk[wk.length - 1].ann_med.toFixed(1)}%</b>`,
      font: { size: 14, color: COL.red }, arrowcolor: COL.red
    }] : [])
  });
  Plotly.newPlot('fig-annual', tr, layout, TIMECFG()).then(gd => {
    rangeToggle(gd, 'annual-yrange');
    hoverLine(gd);
    const box = document.getElementById('inst-controls');
    box.innerHTML = '';
    // each chip shows the marker the chart uses for that institution (shape, colour, outline)
    const groups = Object.keys(INST).map(k => INST[k]).concat(
      [{ label: 'Govt. target', col: GOV_COL, sym: 'star', match: n => n.startsWith('Govt. target') }]);
    const mark = g => markSvg(g.sym, g.col);
    groups.forEach(g => {
      const idx = gd.data.map((d, i) => ({ n: d.name || '', i }))
        .filter(d => g.match ? g.match(d.n) : d.n === g.label).map(d => d.i);
      if (!idx.length) return;
      const on = g.label === 'Govt. target';          // default: targets only
      if (!on) Plotly.restyle(gd, { visible: false }, idx);
      const chip = document.createElement('label');
      chip.className = 'inst-chip' + (on ? ' on' : '');
      chip.innerHTML = `<input type="checkbox"${on ? ' checked' : ''}>${mark(g)}${g.label}`;
      chip.querySelector('input').addEventListener('change', e => {
        chip.classList.toggle('on', e.target.checked);
        Plotly.restyle(gd, { visible: e.target.checked }, idx);
        if (g.label === 'Govt. target') {
          // the floor targets are drawn as annotations (arrow + '>='), not traces
          const upd = {};
          (gd.layout.annotations || []).forEach((a, i) => { if (a.text === '≥') upd[`annotations[${i}].visible`] = e.target.checked; });
          if (Object.keys(upd).length) Plotly.relayout(gd, upd);
        }
      });
      box.appendChild(chip);
    });
  });
}


/* ---------------- per-year section (annual rate, NY Fed style) ---------------- */
// The model-implied annual rate is the mean of the four quarterly YoY rates
// (released quarters at the official number, open quarters at the model
// draws).  The annual impact of a release = sum over the year's decomposed
// quarters of its quarterly impact / 4; what the listed items do not explain
// (re-estimation between vintages, revisions, and, before Sep 2026, open
// quarters that were not decomposed) is the remainder bar.  'all_open' from
// the JSON says whether every open quarter of the year was decomposed at that
// date; when it was, the remainder is labelled 'Revisions & other' as on the
// quarter tab.  The chart runs on a date axis over the year and also carries
// the year's benchmarks: institution forecasts at their publication dates and
// the government target from its announcement.
const STACK_ORDER_Y = STACK_ORDER.concat(['Undecomposed quarters, revisions & other']);
let Y_EXPANDED = false, Y_CUR = null, Y_SEL = null, Y_PICK = null;

function renderYears(D) {
  const YS = D.years || [];
  const card = document.getElementById('year-card');
  if (!YS.length) { if (card) card.hidden = true; return; }
  const box = document.getElementById('a-chips');
  box.innerHTML = '';
  YS.slice().reverse().forEach((yy, i) => {
    const b = document.createElement('button');
    b.className = 'q-chip' + (i === 0 ? ' active' : '');
    b.textContent = yy.label;
    b.addEventListener('click', () => {
      box.querySelectorAll('.q-chip').forEach(c => c.classList.remove('active'));
      b.classList.add('active'); Y_EXPANDED = false; showYear(yy);
    });
    box.appendChild(b);
  });
  document.getElementById('a-expand').addEventListener('click', () => {
    if (Y_SEL != null) { if (Y_PICK) Y_PICK(Y_SEL); return; }       // back from the picked update to the list
    Y_EXPANDED = !Y_EXPANDED;
    renderYearFlow(Y_CUR);
  });
  showYear(YS[YS.length - 1]);
  watchFlow('a-flow', 'fig-a-impact');
}

function showYear(yy) {
  Y_CUR = yy; Y_SEL = null; Y_PICK = null;
  const P = yy.path, last = P[P.length - 1], Y = yy.y;
  let s = `Latest update ${fmtDY(last.date)}: the model-implied annual growth rate for ${yy.label} is <b>${last.med.toFixed(1)}%</b>` +
          ` (68% probability interval at [${last.lo.toFixed(1)}, ${last.hi.toFixed(1)}]%` +
          (last.lo80 != null ? `, 80% probability interval at [${last.lo80.toFixed(1)}, ${last.hi80.toFixed(1)}]%` : '') + ').';
  const rq = yy.quarters || [];
  s += rq.length
    ? ` ${rq.length} of 4 quarters released (${rq.map(q => q.v == null ? `Q${q.q}` : `Q${q.q} ${q.v.toFixed(1)}%`).join(', ')}); the rest at the model estimate.`
    : ' No quarter of the year released yet: all four at the model estimate.';
  if (P.length > 1) {
    const dlt = last.med - P[P.length - 2].med;
    s += ` News since ${fmtD(P[P.length - 2].date)} ${dlt >= 0 ? 'raised' : 'lowered'} the estimate by ${Math.abs(dlt).toFixed(2)} pp.`;
  }
  if (yy.official) s += ` Official annual GDP: <b>${yy.official.v.toFixed(1)}%</b> (${yy.official.kind}).`;
  document.getElementById('a-summary').innerHTML = s;

  // ---- density: the latest update's; a click on the chart below shows the picked update's ----
  const off = yy.official;
  const dOpt = { fig: 'fig-a-density', title: 'a-density-title', xtitle: 'annual GDP growth, %',
                 ref: off ? { v: off.v, text: 'official ' + off.v.toFixed(1) + '%' } : null };
  const dRange = densRange(yy, [off ? off.v : null]);
  drawDensity(yy, P.length - 1, dOpt);

  // ---- progression of the annual rate: stacked impact bars per update, the annual rate, and the
  // benchmarks of that year (the forecasts of the IMF, OECD, ADB and World Bank at their
  // publication dates, the government target from its announcement).  A date axis over the year,
  // so the benchmarks sit at their own dates and an open year shows how much is still to come.
  const xs = P.map(p => p.date);
  const DAY = 86400000, BARW = 2.6 * DAY, GAPW = 0.4 * DAY;
  const xb = barX(xs, BARW, GAPW);
  const xFirst = `${Y - 1}-12-29`, xLast = `${Y + 1}-01-04`, xEnd = `${Y}-12-31`;
  const dates = xs.map(d => fmtD(d));
  const byLab = {};
  STACK_ORDER_Y.forEach(l => byLab[l] = P.map(() => 0));
  P.forEach((p, i) => {
    p.items.forEach(it => { const l = SER_FULL[it.series] || it.series; if (!(l in byLab)) byLab[l] = P.map(() => 0); byLab[l][i] += it.impact || 0; });
    if (p.rev != null) byLab[p.all_open ? 'Revisions & other' : 'Undecomposed quarters, revisions & other'][i] += p.rev;
  });
  const tr = [], lg = [], lvl = P.map(p => p.med);
  Object.keys(byLab).forEach(l => {
    if (!byLab[l].some(v => Math.abs(v) > 1e-6)) return;
    // no hover on the bars, the target or the institutions: the box carries the annual rate and the
    // official number only (the impacts are in the table, the benchmarks in the legend)
    tr.push({ x: xb, y: byLab[l], type: 'bar', width: BARW, name: l, marker: { color: LABEL_COL[l] || COL.gray }, hoverinfo: 'skip' });
    lg.push(lgBar(LABEL_COL[l] || COL.gray, l));
  });
  // government target of the year, from the day it was announced: a line (point or floor) or a band (range)
  const g = ((DASH && DASH.gov_targets) || []).find(t => t.year === Y);
  if (g) {
    const gx = [g.date, xEnd], gl = { color: GOV_COL, width: 1.5, dash: 'dash' };
    const ghov = { hoverinfo: 'skip' };
    if (g.type === 'range') {
      tr.push(Object.assign({ x: gx, y: [g.lo, g.lo], mode: 'lines', yaxis: 'y2', line: gl, name: 'Govt. target' }, ghov));
      tr.push({ x: gx, y: [g.hi, g.hi], mode: 'lines', yaxis: 'y2', line: gl, fill: 'tonexty', fillcolor: 'rgba(191,20,38,0.07)',
                name: 'Govt. target (upper)', hoverinfo: 'skip' });
      lvl.push(g.lo, g.hi);
    } else {
      tr.push(Object.assign({ x: gx, y: [g.v, g.v], mode: 'lines', yaxis: 'y2', line: gl, name: 'Govt. target' }, ghov));
      lvl.push(g.v);
    }
    lg.push(lgLine(GOV_COL, true, 'Govt. target: ' + tgtText(g)));
  }
  tr.push({ x: xb, y: P.map(p => p.med), mode: 'lines+markers', name: yy.label + ' annual rate', yaxis: 'y2', meta: 'upd',
            line: { color: COL.navy, width: 2.2 }, marker: nowMarker(5), hoverinfo: 'none',
            customdata: P.map((p, i) => `${yy.label}: ${p.med.toFixed(2)}% (update ${dates[i]})`) });
  lg.push(lgLine(COL.navy, false, yy.label + ' annual rate'));
  if (off) {
    tr.push({ x: [xFirst, xLast], y: [off.v, off.v], mode: 'lines', yaxis: 'y2',
              name: 'Official annual GDP', line: { color: COL.gray, width: 1.5, dash: 'dash' }, hoverinfo: 'skip' });
    tr.push(hoverCarrier(xb, off.v, 'Official annual GDP (' + off.kind + ')'));
    lg.push(lgLine(COL.gray, true, 'Official annual GDP'));
    lvl.push(off.v);
  }
  // institutions: their forecasts for this year, published during the year.  Their legend is the
  // chart's own, in its top right corner (the other entries stay in the legend below the chart)
  let nInst = 0;
  Object.keys(INST).forEach(k => {
    const f = ((DASH && DASH.institutions) || []).filter(d => d.inst === k && d.year === Y);
    if (!f.length) return;
    tr.push({ x: f.map(d => d.date), y: f.map(d => d.v), mode: 'markers', yaxis: 'y2', name: INST[k].label, hoverinfo: 'skip',
              showlegend: true,
              marker: instMarker(k, 10) });
    nInst++;
    f.forEach(d => lvl.push(d.v));
  });
  tr.push(selTrace());
  const selIdx = tr.length - 1;
  tr.forEach(t => { if (t.showlegend !== true) t.showlegend = false; });
  // the corner legend gets a strip of its own at the top of the panel (LG_ROOM of its height, above
  // the highest level drawn; the bars end lower), so that it never covers the lines or the markers;
  // the larger top margin keeps Plotly's toolbar off it
  // Both axes get that strip, so the panel keeps its two bands: the tallest stack of bars ends at
  // 65% of the height below the strip and the lowest level drawn (line, target or institution
  // marker) sits at 74%; a bar therefore never reaches a marker
  const LG_ROOM = 0.12, y2r = lineRange(lvl), y1r = barRange(byLab, 2.15);
  if (nInst) [y1r, y2r].forEach(r => { if (r) r[1] += LG_ROOM / (1 - LG_ROOM) * (r[1] - r[0]); });
  // bars on their own symmetric axis (left, pp); the annual rate and the benchmarks on the right axis (percent)
  Plotly.newPlot('fig-a-impact', tr, Object.assign({}, LAYOUT, {
    barmode: 'relative', hovermode: 'x unified', showlegend: nInst > 0,
    // traceorder: Plotly would reverse the entries in a year whose target is a band (a filled trace)
    legend: { orientation: 'h', x: 1, xanchor: 'right', y: 1, yanchor: 'top', font: { size: 10.5 }, traceorder: 'normal',
              bgcolor: 'rgba(0,0,0,0)', itemclick: false, itemdoubleclick: false },
    margin: { l: 55, r: 55, t: nInst ? 30 : 15, b: 60 },
    xaxis: { type: 'date', range: [xFirst, xLast], dtick: 'M1', tick0: `${Y}-01-01`, tickformat: '%b', ticklabelmode: 'period',
             title: { text: 'model update, ' + Y, standoff: 12 }, automargin: true, tickfont: { size: 11 }, hoverformat: ' ' },
    yaxis: { title: 'impact, pp', zeroline: true, zerolinecolor: '#999', range: y1r, fixedrange: false },
    yaxis2: { title: { text: 'annual rate, percent', font: { color: COL.navy } }, tickfont: { color: COL.navy },
              overlaying: 'y', side: 'right', showgrid: false, zeroline: false, range: y2r }
  }), { responsive: true, displaylogo: false }).then(gd => {
    if (Y_CUR !== yy) return;
    hoverLine(gd);
    // a click on an update (its point or its bars) picks it: its density above, the decomposition
    // of the change since the previous update in the table; a second click on it goes back
    Y_PICK = i => {
      Y_SEL = Y_SEL === i ? null : i;
      const k = Y_SEL;
      Plotly.restyle(gd, { x: [[k == null ? null : xb[k]]], y: [[k == null ? null : P[k].med]] }, [selIdx]);
      drawDensity(yy, k == null ? P.length - 1 : k, Object.assign({}, dOpt, { range: k == null ? undefined : dRange }));
      renderYearFlow(yy);
    };
    gd.on('plotly_click', ev => {
      const pt = ((ev && ev.points) || []).find(q => q.data.meta === 'upd');
      if (pt && Y_PICK) Y_PICK(pt.pointNumber);
    });
  });
  document.getElementById('a-impact-legend').innerHTML = lg.join('');

  renderYearFlow(yy);
}

function renderYearFlow(yy) {
  const P = yy.path, n = P.length, N_SHOW = 4, sel = Y_SEL;
  const btn = document.getElementById('a-expand');
  let idx, title;
  if (sel != null) {
    idx = [sel];
    title = sel > 0 ? `Change in the annual rate, ${fmtD(P[sel - 1].date)} to ${fmtD(P[sel].date)}` : `Data flow (${fmtD(P[sel].date)})`;
    btn.hidden = false;  btn.textContent = 'Show all updates';
  } else {
    idx = P.map((_, i) => i).reverse();                 // newest update first
    if (!Y_EXPANDED) idx = idx.slice(0, N_SHOW);
    title = 'Data flow (' + fmtD(P[n - 1].date) + ')';
    btn.hidden = n <= N_SHOW;
    btn.textContent = Y_EXPANDED ? 'Collapse' : `Expand (${n} updates)`;
  }
  document.getElementById('a-flow-title').textContent = title;
  document.getElementById('a-flow').innerHTML = flowHTML(P, idx, {
    sel: sel != null, hdrImpact: 'Impact', hdrLevel: 'Annual<br>rate',
    tag: p => p.nrel != null ? p.nrel + '/4 quarters released' : '',
    label: it => {
      const l = SER_FULL[it.series] || it.series, qs = (it.quarters || []).slice().sort().map(q => 'Q' + q).join(', ');
      // the official GDP number that replaces the model's backcast of the quarter: its own row
      const note = it.kind === 'official' ? ` · official ${qs} replaces the backcast` : (qs ? ' · via ' + qs : '');
      return `<span class="sq" style="background:${LABEL_COL[l] || COL.gray}"></span>${l} <span class="ref">${fmtRef(it.ref)}${note}</span>`;
    },
    revLabel: p => p.all_open ? 'Revisions & other' : 'Undecomposed quarters, revisions & other',
    empty: () => 'first update of the year'
  });
  fitFlow('a-flow', 'fig-a-impact');
}
