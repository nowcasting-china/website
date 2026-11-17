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
const barRange = byLab => {
  const ls = Object.keys(byLab); let m = 0.02;
  const n = ls.length ? byLab[ls[0]].length : 0;
  for (let i = 0; i < n; i++) { let u = 0, d = 0; ls.forEach(l => { const v = byLab[l][i] || 0; if (v > 0) u += v; else d += v; }); m = Math.max(m, u, -d); }
  return [-1.15 * m, 1.9 * m];
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
// Values axis of the two history charts (quarterly and annual): by default the narrow range
// NARROW_Y, which leaves the pandemic extremes and the double-digit growth before 2012 off the
// chart so that recent years are readable; the button in the card title (btnId) switches to
// the full range and back.
const NARROW_Y = [0, 8];
const rangeToggle = (gd, btnId) => {
  const btn = document.getElementById(btnId);
  let mode = 'narrow';
  const label = () => { if (btn) { btn.textContent = mode === 'narrow' ? 'Show full range' : 'Narrow range'; btn.setAttribute('aria-pressed', mode === 'full'); } };
  const apply = () => Plotly.relayout(gd, mode === 'full' ? { 'yaxis.autorange': true } : { 'yaxis.range': NARROW_Y.slice() });
  if (btn) btn.addEventListener('click', () => { mode = mode === 'narrow' ? 'full' : 'narrow'; label(); apply(); });
  gd.on('plotly_relayout', e => {
    if (e && e['yaxis.autorange'] === true && mode !== 'full') { mode = 'full'; label(); }   // the toolbar's "Reset values"
  });
  label();
};

fetch('data/dashboard.json?t=' + Date.now()).then(r => r.json()).then(D => {
  // public build (python/export_public.py): model results only, the released data values are
  // not in the file; the "Actual" column of the data-flow tables is hidden (styles.css)
  if (D.public) document.body.classList.add('public');
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
  tr.push({ x: ev.map(d => d.date), y: ev.map(d => d.hi), mode: 'lines',
    line: { width: 0 }, hoverinfo: 'skip', showlegend: false });
  tr.push({ x: ev.map(d => d.date), y: ev.map(d => d.lo), mode: 'lines',
    line: { width: 0 }, fill: 'tonexty', fillcolor: COL.band,
    hoverinfo: 'skip', name: '68% band' });
  tr.push({ x: ev.map(d => d.date), y: ev.map(d => d.med), mode: 'lines',
    line: { color: COL.navy, width: 2.4 }, name: 'Nowcast (evaluation)' });
  tr.push({ x: D.realized.map(d => qDate(d.y, d.q)), y: D.realized.map(d => d.v),
    mode: 'lines+markers', line: { color: COL.gray, width: 2.0, shape: 'hv' },
    marker: { size: 5 }, name: 'Realized GDP' });
  if (wk.length) {
    tr.push({ x: wk.map(d => d.date), y: wk.map(d => d.med), mode: 'lines+markers',
      line: { color: COL.red, width: 2.2, dash: 'dot' }, marker: { size: 6 },
      name: 'Nowcast (weekly updates)' });
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
      line: { color: weoCol, width: 2.8, dash: 'dash' },
      name: 'IMF WEO Q4/Q4 (Apr)' }); }
  if (weoOct.length) { const g = weoSeg(weoOct);
    tr.push({ x: g.x, y: g.y, mode: 'lines', connectgaps: false,
      line: { color: weoCol, width: 2.8 },
      name: 'IMF WEO Q4/Q4 (Oct)' }); }

  const layout = Object.assign({}, LAYOUT, {
    yaxis: { title: 'GDP growth, % YoY', zeroline: true, range: NARROW_Y.slice() },
    xaxis: XTIME(),
    legend: { orientation: 'h', x: 0, y: -0.38, yanchor: 'top' },
    margin: { l: 55, r: 25, t: 10, b: 20 },
    annotations: [{
      x: last.date, y: last.med, ax: 0, ay: -42,
      text: `<b>${last.med.toFixed(1)}%</b><br>${last.y}Q${last.q}`,
      font: { size: 14, color: COL.red }, arrowcolor: COL.red, arrowwidth: 1.4
    }]
  });
  Plotly.newPlot('fig-nowcast', tr, layout, TIMECFG()).then(gd => rangeToggle(gd, 'nowcast-yrange'));
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
let Q_EXPANDED = false;

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
    Q_EXPANDED = !Q_EXPANDED;
    const act = box.querySelector('.q-chip.active');
    const qq = Q.find(x => x.label === act.textContent);
    renderFlow(qq);
  });
  showQuarter(Q[Q.length - 1]);
}

function showQuarter(qq) {
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

  // ---- density of the latest estimate ----
  const dt = qq.density;
  document.getElementById('q-density-title').textContent =
    'Probability density' + (dt ? ' (' + fmtD(dt.date) + ')' : '');
  if (dt) {
    const tr = [{ x: dt.x, y: dt.pdf, mode: 'lines', fill: 'tozeroy', fillcolor: 'rgba(31,78,156,0.18)',
                  line: { color: COL.navy, width: 2 }, name: 'density', hovertemplate: '%{x:.2f}%: %{y:.3f}<extra></extra>' }];
    const shapes = [{ type: 'line', x0: last.med, x1: last.med, y0: 0, y1: 1, yref: 'paper',
                      line: { color: COL.red, width: 1.5, dash: 'dot' } }];
    if (qq.gdp) shapes.push({ type: 'line', x0: qq.gdp.v, x1: qq.gdp.v, y0: 0, y1: 1, yref: 'paper',
                              line: { color: COL.gray, width: 1.5 } });
    Plotly.newPlot('fig-q-density', tr, Object.assign({}, LAYOUT, {
      showlegend: false, shapes, margin: { l: 45, r: 15, t: 24, b: 35 }, hovermode: 'x',
      xaxis: { title: 'GDP growth, % YoY', zeroline: false }, yaxis: { title: 'density', rangemode: 'tozero' },
      // labels sit ABOVE the plot area, each on the far side of its line from
      // the other label, so they never overlap the curve or each other
      annotations: (() => {
        const gdpLeft = qq.gdp && qq.gdp.v < last.med;
        const a = [{ x: last.med, y: 1, yref: 'paper', text: '<b>' + last.med.toFixed(1) + '%</b>', showarrow: false,
                     xanchor: gdpLeft ? 'left' : 'right', yanchor: 'bottom', yshift: 2,
                     xshift: gdpLeft ? 3 : -3, font: { color: COL.red, size: 12 } }];
        if (qq.gdp) a.push({ x: qq.gdp.v, y: 1, yref: 'paper', text: 'GDP ' + qq.gdp.v.toFixed(1) + '%', showarrow: false,
                             xanchor: gdpLeft ? 'right' : 'left', yanchor: 'bottom', yshift: 2,
                             xshift: gdpLeft ? -3 : 3, font: { color: COL.gray, size: 11 } });
        return a;
      })()
    }), { responsive: true, displaylogo: false });
  } else {
    document.getElementById('fig-q-density').innerHTML = '<p style="color:#6b7482;padding:12px">No draws stored for this quarter.</p>';
  }

  // ---- impact of data releases: stacked bars per model update + nowcast line ----
  // a date axis over the quarter's whole cycle: from its first day to the end of the month after it
  // (the month of its GDP release), so an open quarter shows how much of the cycle is still to come
  const xs = P.map(p => p.date);
  const q0 = new Date(Date.UTC(qq.y, 3 * qq.q - 3, 1)), qEnd = new Date(Date.UTC(qq.y, 3 * qq.q + 1, 0));
  const iso = d => d.toISOString().slice(0, 10);
  const xFirst = xs[0] < iso(q0) ? xs[0] : iso(q0);
  const xLast = qq.gdp && qq.gdp.date > iso(qEnd) ? qq.gdp.date : iso(qEnd);
  const DAY = 86400000, BARW = 2.0 * DAY, GAPW = 0.35 * DAY;   // bar width two days, gap between neighbours
  // updates one or two days apart would overlap: a bar that would touch the previous one is moved
  // just to its right (the slides' rule); positions are noon of the day, shifted where needed
  const xpos = [];
  xs.forEach((d, i) => {
    let t = Date.parse(d + 'T12:00:00Z');
    if (i > 0 && t - xpos[i - 1] < BARW + GAPW) t = xpos[i - 1] + BARW + GAPW;
    xpos.push(t);
  });
  const xb = xpos.map(t => new Date(t).toISOString().slice(0, 16).replace('T', ' '));
  const dates = xs.map(d => fmtD(d));
  const byLab = {};
  STACK_ORDER.forEach(l => byLab[l] = P.map(() => 0));
  P.forEach((p, i) => {
    p.items.forEach(it => { const l = SER_FULL[it.series] || it.series; if (!(l in byLab)) byLab[l] = P.map(() => 0); byLab[l][i] += it.impact || 0; });
    if (p.rev != null) byLab['Revisions & other'][i] += p.rev;
  });
  const tr = [];
  Object.keys(byLab).forEach(l => {
    if (!byLab[l].some(v => Math.abs(v) > 1e-6)) return;
    tr.push({ x: xb, y: byLab[l], type: 'bar', width: BARW, name: l, marker: { color: LABEL_COL[l] || COL.gray },
              customdata: byLab[l].map(pp2), hovertemplate: l + ': %{customdata} pp<extra></extra>' });
  });
  tr.push({ x: xb, y: P.map(p => p.med), mode: 'lines+markers', name: lab + ' ' + 'nowcast', yaxis: 'y2',
            line: { color: COL.navy, width: 2.2 }, marker: { size: 6, color: COL.navy }, customdata: dates,
            hovertemplate: 'update %{customdata}: %{y:.2f}%<extra>' + lab + '</extra>' });
  if (qq.gdp) tr.push({ x: [xFirst, xLast], y: [qq.gdp.v, qq.gdp.v], mode: 'lines', name: 'Official GDP', yaxis: 'y2',
                        line: { color: COL.gray, width: 1.5, dash: 'dash' }, hoverinfo: 'skip' });
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
  }), { responsive: true, displaylogo: false });
  // HTML legend below the chart (never collides with the axis, any width)
  const lg = document.getElementById('q-impact-legend');
  lg.innerHTML = tr.map(t => t.type === 'bar'
    ? `<span class="item"><span class="sq" style="background:${t.marker.color}"></span>${t.name}</span>`
    : `<span class="item"><span class="ln" style="border-color:${t.line.color};border-style:${t.line.dash ? 'dashed' : 'solid'}"></span>${t.name}</span>`
  ).join('');

  renderFlow(qq);
}

function renderFlow(qq) {
  const P = qq.path.slice().reverse();          // newest update first
  const N_SHOW = 4;
  const shown = Q_EXPANDED ? P : P.slice(0, N_SHOW);
  document.getElementById('q-flow-title').textContent = 'Data flow (' + fmtD(P[0].date) + ')';
  const btn = document.getElementById('q-expand');
  btn.hidden = P.length <= N_SHOW;
  btn.textContent = Q_EXPANDED ? 'Collapse' : `Expand (${P.length} updates)`;
  const cls = v => v > 0.0005 ? 'num pos' : (v < -0.0005 ? 'num neg' : 'num');
  let h = '<thead><tr><th>Model<br>update</th><th>Release<br>date</th><th>Data series</th>' +
          '<th class="num">Actual</th><th class="num">Impact</th><th class="num">Nowcast<br>GDP growth</th></tr></thead><tbody>';
  shown.forEach(p => {
    h += `<tr class="q-update"><td>${fmtD(p.date)}</td><td></td><td class="ref">${p.phase === 'backcast' ? 'backcast' : ''}${p.src === 'eval' ? '' : ''}</td>` +
         `<td class="num"></td><td class="num"></td><td class="num">${p.med.toFixed(2)}</td></tr>`;
    p.items.forEach(it => {
      const l = SER_FULL[it.series] || it.series;
      h += `<tr><td></td><td class="rel">${it.release ? fmtD(it.release) : ''}</td>` +
           `<td><span class="sq" style="background:${LABEL_COL[l] || COL.gray}"></span>${l} <span class="ref">${fmtRef(it.ref)}</span></td>` +
           `<td class="num">${it.actual == null ? '' : it.actual.toFixed(2)}</td>` +
           `<td class="${it.impact == null ? 'num ref' : cls(it.impact)}">${it.impact == null ? '–' : signed(it.impact)}</td><td></td></tr>`;
    });
    if (p.borrowed) {
      h += '<tr><td></td><td></td><td class="ref" colspan="3">impact on this quarter\'s backcast not decomposed (vintages before Sep 2026)</td><td></td></tr>';
    }
    if (p.rev != null) {
      h += `<tr><td></td><td></td><td><span class="sq" style="background:${LABEL_COL['Revisions & other']}"></span>Revisions &amp; other</td>` +
           `<td></td><td class="${cls(p.rev)}">${signed(p.rev)}</td><td></td></tr>`;
    }
    if (!p.items.length && p.rev == null) {
      h += '<tr><td></td><td></td><td class="ref" colspan="3">' + (p.phase === 'backcast'
        ? 're-estimated with this date\'s releases; their impact on the backcast quarter was not decomposed for vintages before Sep 2026'
        : 'no new releases') + '</td><td></td></tr>';
    }
  });
  h += '</tbody>';
  document.getElementById('q-flow').innerHTML = h;
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
  const A0 = D.annual_hist || [];
  [['prelim', 'preliminary'], ['final', 'final']].forEach(([k, tag]) => {
    const byYear = {};  off.forEach(d => { if (d[k] != null) byYear[d.year] = d[k]; });
    const pts = A0.map(d => ({ x: d.date, y: byYear[d.date.slice(0, 4)] })).filter(p => p.y != null);
    if (pts.length) tr.push({ x: pts.map(p => p.x), y: pts.map(p => p.y), mode: 'lines',
      line: { width: 0 }, opacity: 0, showlegend: false,
      text: pts.map(p => `${p.x.slice(0, 4)} official annual GDP (${tag})`),
      hovertemplate: '%{y:.2f}%<extra>%{text}</extra>' });
  });

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
    // one continuous, invisible carrier per percentile: exactly one hover value each
    [['med', 'median'], ['q16', '16th pct'], ['q84', '84th pct'], ['q5', '5th pct'], ['q95', '95th pct']]
      .forEach(([k, name]) => tr.push({ x: A.map(d => d.date), y: A.map(d => d[k]), mode: 'lines',
        line: { width: 0 }, opacity: 0, showlegend: false, name,
        hovertemplate: '%{y:.2f}%<extra>' + name + '</extra>' }));
    // legend entries for the bands (the fills above stay unlabeled)
    tr.push({ x: [null], y: [null], mode: 'lines', line: { color: 'rgba(31,78,156,0.16)', width: 10 }, name: '16-84% band', hoverinfo: 'skip' });
    tr.push({ x: [null], y: [null], mode: 'lines', line: { color: 'rgba(31,78,156,0.08)', width: 10 }, name: '5-95% band', hoverinfo: 'skip' });
  }
  const wk = D.weekly.filter(d => d.ann_med != null);
  if (wk.length) {
    tr.push({ x: wk.map(d => d.date), y: wk.map(d => d.ann_med), mode: 'lines+markers',
      line: { color: COL.red, width: 2.2, dash: 'dot' }, marker: { size: 6 },
      name: 'Weekly updates' });
    const last = wk[wk.length - 1];
    tr.push({ x: [last.date], y: [last.ann_med], mode: 'markers',
      marker: { symbol: 'square', size: 12, color: COL.red, line: { color: '#fff', width: 1.5 } },
      showlegend: false, hoverinfo: 'skip' });
  }

  // institutions, paper markers: IMF triangle / OECD diamond / ADB square / WB circle
  const INST = {
    IMF:  { sym: 'triangle-up', col: '#E68C1A', label: 'IMF WEO' },
    OECD: { sym: 'diamond',     col: '#D926A6', label: 'OECD EO' },
    ADB:  { sym: 'square',      col: '#7340A6', label: 'ADB ADO' },
    WB:   { sym: 'circle',      col: '#2170D1', label: 'WB GEP' }
  };
  Object.keys(INST).forEach(k => {
    const s = (D.institutions || []).filter(d => d.inst === k);
    if (!s.length) return;
    tr.push({ x: s.map(d => d.date), y: s.map(d => d.v), mode: 'markers',
      marker: { symbol: INST[k].sym, size: 10, color: INST[k].col, opacity: 0.85,
                line: { color: '#000', width: 0.8 } }, name: INST[k].label });
  });

  // government targets: star (point), vertical bar (range), star (floor)
  const gov = D.gov_targets || [], govCol = '#BF1426';
  const gp = gov.filter(g => g.type !== 'range');
  // hover text states the target as announced: "around 5%", "above 6%", "4.5–5%"
  const tgtText = g => g.type === 'range' ? `${g.lo}–${g.hi}% (range)`
                     : g.type === 'floor' ? `above ${g.v}%` : `around ${g.v}%`;
  if (gp.length) tr.push({ x: gp.map(g => g.date), y: gp.map(g => g.v), mode: 'markers',
    marker: { symbol: 'star', size: 10, color: govCol, opacity: 0.75,
              line: { color: '#000', width: 0.5 } }, name: 'Govt. target',
    customdata: gp.map(g => [g.year, tgtText(g)]),
    hovertemplate: '%{customdata[1]}<extra>Govt. target %{customdata[0]}</extra>' });
  const gr = gov.filter(g => g.type === 'range');
  if (gr.length) tr.push({
    x: gr.flatMap(g => [g.date, g.date, null]),
    y: gr.flatMap(g => [g.lo, g.hi, null]),
    mode: 'lines', connectgaps: false,
    line: { color: govCol, width: 4 }, opacity: 0.75, name: 'Govt. target (range)',
    // the two end points share one date: hover on the first only, with the range text
    customdata: gr.flatMap(g => [[g.year, tgtText(g)], [g.year, tgtText(g)], [g.year, '']]),
    hoverinfo: gr.flatMap(() => ['all', 'skip', 'skip']),
    hovertemplate: '%{customdata[1]}<extra>Govt. target %{customdata[0]}</extra>' });

  const layout = Object.assign({}, LAYOUT, {
    yaxis: { title: 'annual GDP growth, %', range: NARROW_Y.slice() },
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
    const box = document.getElementById('inst-controls');
    box.innerHTML = '';
    // each chip shows the marker the chart uses for that institution (shape, colour, outline)
    const groups = [
      { label: 'IMF WEO', col: '#E68C1A', sym: 'triangle-up' }, { label: 'OECD EO', col: '#D926A6', sym: 'diamond' },
      { label: 'ADB ADO', col: '#7340A6', sym: 'square' },      { label: 'WB GEP', col: '#2170D1', sym: 'circle' },
      { label: 'Govt. target', col: '#BF1426', sym: 'star', match: n => n.startsWith('Govt. target') }
    ];
    const SHAPE = {
      'triangle-up': '<path d="M6 1.2 L11 10.6 L1 10.6 Z"/>',
      'diamond':     '<path d="M6 0.8 L11.2 6 L6 11.2 L0.8 6 Z"/>',
      'square':      '<rect x="1.6" y="1.6" width="8.8" height="8.8"/>',
      'circle':      '<circle cx="6" cy="6" r="4.6"/>',
      'star':        '<path d="M6 0.6 L7.5 4.3 L11.5 4.5 L8.4 7 L9.4 10.9 L6 8.7 L2.6 10.9 L3.6 7 L0.5 4.5 L4.5 4.3 Z"/>'
    };
    const mark = g => `<svg class="mk" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">` +
      `<g fill="${g.col}" stroke="#000" stroke-width="${g.sym === 'star' ? 0.5 : 0.8}">${SHAPE[g.sym]}</g></svg>`;
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
// quarter tab.
const STACK_ORDER_Y = STACK_ORDER.concat(['Undecomposed quarters, revisions & other']);
let Y_EXPANDED = false;

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
    Y_EXPANDED = !Y_EXPANDED;
    const act = box.querySelector('.q-chip.active');
    renderYearFlow(YS.find(x => x.label === act.textContent));
  });
  showYear(YS[YS.length - 1]);
}

function showYear(yy) {
  const P = yy.path, last = P[P.length - 1];
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

  // ---- density of the latest estimate ----
  const dt = yy.density;
  document.getElementById('a-density-title').textContent =
    'Probability density' + (dt ? ' (' + fmtD(dt.date) + ')' : '');
  if (dt) {
    const tr = [{ x: dt.x, y: dt.pdf, mode: 'lines', fill: 'tozeroy', fillcolor: 'rgba(31,78,156,0.18)',
                  line: { color: COL.navy, width: 2 }, name: 'density', hovertemplate: '%{x:.2f}%: %{y:.3f}<extra></extra>' }];
    const shapes = [{ type: 'line', x0: last.med, x1: last.med, y0: 0, y1: 1, yref: 'paper',
                      line: { color: COL.red, width: 1.5, dash: 'dot' } }];
    const off = yy.official;
    if (off) shapes.push({ type: 'line', x0: off.v, x1: off.v, y0: 0, y1: 1, yref: 'paper',
                           line: { color: COL.gray, width: 1.5 } });
    const offLeft = off && off.v < last.med;
    const ann = [{ x: last.med, y: 1, yref: 'paper', text: '<b>' + last.med.toFixed(1) + '%</b>', showarrow: false,
                   xanchor: offLeft ? 'left' : 'right', yanchor: 'bottom', yshift: 2,
                   xshift: offLeft ? 3 : -3, font: { color: COL.red, size: 12 } }];
    if (off) ann.push({ x: off.v, y: 1, yref: 'paper', text: 'official ' + off.v.toFixed(1) + '%', showarrow: false,
                        xanchor: offLeft ? 'right' : 'left', yanchor: 'bottom', yshift: 2,
                        xshift: offLeft ? -3 : 3, font: { color: COL.gray, size: 11 } });
    Plotly.newPlot('fig-a-density', tr, Object.assign({}, LAYOUT, {
      showlegend: false, shapes, margin: { l: 45, r: 15, t: 24, b: 35 }, hovermode: 'x',
      xaxis: { title: 'annual GDP growth, %', zeroline: false }, yaxis: { title: 'density', rangemode: 'tozero' },
      annotations: ann
    }), { responsive: true, displaylogo: false });
  } else {
    document.getElementById('fig-a-density').innerHTML = '<p style="color:#6b7482;padding:12px">No draws stored for this year.</p>';
  }

  // ---- impact of data releases on the annual rate: stacked bars per update ----
  const cats = P.map(p => fmtD(p.date));
  const byLab = {};
  STACK_ORDER_Y.forEach(l => byLab[l] = P.map(() => 0));
  P.forEach((p, i) => {
    p.items.forEach(it => { const l = SER_FULL[it.series] || it.series; if (!(l in byLab)) byLab[l] = P.map(() => 0); byLab[l][i] += it.impact || 0; });
    if (p.rev != null) byLab[p.all_open ? 'Revisions & other' : 'Undecomposed quarters, revisions & other'][i] += p.rev;
  });
  const tr = [];
  Object.keys(byLab).forEach(l => {
    if (!byLab[l].some(v => Math.abs(v) > 1e-6)) return;
    tr.push({ x: cats, y: byLab[l], type: 'bar', name: l, marker: { color: LABEL_COL[l] || COL.gray },
              customdata: byLab[l].map(pp2), hovertemplate: l + ': %{customdata} pp<extra></extra>' });
  });
  tr.push({ x: cats, y: P.map(p => p.med), mode: 'lines+markers', name: yy.label + ' annual rate', yaxis: 'y2',
            line: { color: COL.navy, width: 2.2 }, marker: { size: 5, color: COL.navy },
            hovertemplate: '%{y:.2f}%<extra>' + yy.label + '</extra>' });
  if (yy.official) tr.push({ x: [cats[0], cats[cats.length - 1]], y: [yy.official.v, yy.official.v], mode: 'lines', yaxis: 'y2',
                             name: 'Official annual GDP', line: { color: COL.gray, width: 1.5, dash: 'dash' }, hoverinfo: 'skip' });
  // bars on their own symmetric axis (left, pp); the annual rate on the right axis (percent)
  Plotly.newPlot('fig-a-impact', tr, Object.assign({}, LAYOUT, {
    barmode: 'relative', hovermode: 'x unified', showlegend: false,
    margin: { l: 55, r: 55, t: 15, b: 60 },
    xaxis: { type: 'category', title: { text: 'model update', standoff: 12 }, automargin: true,
             tickangle: cats.length > 8 ? -45 : 0, tickfont: { size: cats.length > 20 ? 9 : 11 },
             nticks: cats.length > 30 ? 30 : undefined },
    yaxis: { title: 'impact, pp', zeroline: true, zerolinecolor: '#999', range: barRange(byLab), fixedrange: false },
    yaxis2: { title: { text: 'annual rate, percent', font: { color: COL.navy } }, tickfont: { color: COL.navy },
              overlaying: 'y', side: 'right', showgrid: false, zeroline: false,
              range: lineRange(P.map(p => p.med).concat(yy.official ? [yy.official.v] : [])) }
  }), { responsive: true, displaylogo: false });
  const lg = document.getElementById('a-impact-legend');
  lg.innerHTML = tr.map(t => t.type === 'bar'
    ? `<span class="item"><span class="sq" style="background:${t.marker.color}"></span>${t.name}</span>`
    : `<span class="item"><span class="ln" style="border-color:${t.line.color};border-style:${t.line.dash ? 'dashed' : 'solid'}"></span>${t.name}</span>`
  ).join('');

  renderYearFlow(yy);
}

function renderYearFlow(yy) {
  const P = yy.path.slice().reverse();          // newest update first
  const N_SHOW = 4;
  const shown = Y_EXPANDED ? P : P.slice(0, N_SHOW);
  document.getElementById('a-flow-title').textContent = 'Data flow (' + fmtD(P[0].date) + ')';
  const btn = document.getElementById('a-expand');
  btn.hidden = P.length <= N_SHOW;
  btn.textContent = Y_EXPANDED ? 'Collapse' : `Expand (${P.length} updates)`;
  const cls = v => v > 0.0005 ? 'num pos' : (v < -0.0005 ? 'num neg' : 'num');
  let h = '<thead><tr><th>Model<br>update</th><th>Release<br>date</th><th>Data series</th>' +
          '<th class="num">Actual</th><th class="num">Impact on<br>annual rate</th><th class="num">Annual<br>GDP growth</th></tr></thead><tbody>';
  shown.forEach(p => {
    h += `<tr class="q-update"><td>${fmtD(p.date)}</td><td></td><td class="ref">${p.nrel != null ? p.nrel + '/4 quarters released' : ''}</td>` +
         `<td class="num"></td><td class="num"></td><td class="num">${p.med.toFixed(2)}</td></tr>`;
    p.items.forEach(it => {
      const l = SER_FULL[it.series] || it.series;
      const via = (it.quarters && it.quarters.length) ? ' · via ' + it.quarters.slice().sort().map(q => 'Q' + q).join(', ') : '';
      h += `<tr><td></td><td class="rel">${it.release ? fmtD(it.release) : ''}</td>` +
           `<td><span class="sq" style="background:${LABEL_COL[l] || COL.gray}"></span>${l} <span class="ref">${fmtRef(it.ref)}${via}</span></td>` +
           `<td class="num">${it.actual == null ? '' : it.actual.toFixed(2)}</td>` +
           `<td class="${it.impact == null ? 'num ref' : cls(it.impact)}">${it.impact == null ? '–' : signed(it.impact)}</td><td></td></tr>`;
    });
    if (p.rev != null) {
      const rl = p.all_open ? 'Revisions & other' : 'Undecomposed quarters, revisions & other';
      h += `<tr><td></td><td></td><td><span class="sq" style="background:${LABEL_COL[rl]}"></span>${rl}</td>` +
           `<td></td><td class="${cls(p.rev)}">${signed(p.rev)}</td><td></td></tr>`;
    }
    if (!p.items.length && p.rev == null) {
      h += '<tr><td></td><td></td><td class="ref" colspan="3">first update of the year</td><td></td></tr>';
    }
  });
  h += '</tbody>';
  document.getElementById('a-flow').innerHTML = h;
}

