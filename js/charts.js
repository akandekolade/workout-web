// Hand-rolled SVG charts for the Progress page + week ring meter.
// Single-series charts: marks use the brand primary; text uses ink tokens.

function chartInk() {
  const cs = getComputedStyle(document.documentElement);
  return {
    text: cs.getPropertyValue('--text').trim() || '#f0ede8',
    muted: cs.getPropertyValue('--muted').trim() || '#888780',
    border: cs.getPropertyValue('--border').trim() || 'rgba(255,255,255,.08)',
    primary: cs.getPropertyValue('--primary').trim() || '#34d399'
  };
}

function niceTicks(min, max, count) {
  if (min === max) { min = min - 1; max = max + 1; }
  const span = max - min;
  const step = Math.pow(10, Math.floor(Math.log10(span / count)));
  const err = (span / count) / step;
  const mult = err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1;
  const s = mult * step;
  const lo = Math.floor(min / s) * s;
  const hi = Math.ceil(max / s) * s;
  const ticks = [];
  for (let v = lo; v <= hi + 1e-9; v += s) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}

// points: [{date:'YYYY-MM-DD', value:Number}] ascending; unit e.g. 'kg'
function svgLineChart(points, unit) {
  const ink = chartInk();
  if (points.length < 2) {
    return `<div class="empty-note">${points.length === 1 ? `One entry so far (${points[0].value}${unit}) — log more to see a trend.` : 'Nothing logged yet.'}</div>`;
  }
  const W = 320, H = 160, padL = 34, padR = 14, padT = 14, padB = 22;
  const xs = points.map(p => new Date(p.date).getTime());
  const ys = points.map(p => p.value);
  const ticks = niceTicks(Math.min(...ys), Math.max(...ys), 3);
  const yMin = ticks[0], yMax = ticks[ticks.length - 1];
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const X = t => padL + (W - padL - padR) * (xMax === xMin ? 0.5 : (t - xMin) / (xMax - xMin));
  const Y = v => padT + (H - padT - padB) * (1 - (v - yMin) / (yMax - yMin));
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${X(xs[i]).toFixed(1)},${Y(p.value).toFixed(1)}`).join(' ');
  const grid = ticks.map(v => `<line x1="${padL}" x2="${W - padR}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="${ink.border}" stroke-width="1"/>
    <text x="${padL - 5}" y="${(Y(v) + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="${ink.muted}">${v}</text>`).join('');
  const last = points[points.length - 1];
  const dots = points.map((p, i) => `<circle cx="${X(xs[i]).toFixed(1)}" cy="${Y(p.value).toFixed(1)}" r="8" fill="transparent" pointer-events="all"><title>${formatDateShort(p.date)}: ${p.value}${unit}</title></circle>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" role="img" aria-label="Trend chart, latest ${last.value}${unit}">
    ${grid}
    <path d="${path}" fill="none" stroke="${ink.primary}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${X(xs[xs.length - 1]).toFixed(1)}" cy="${Y(last.value).toFixed(1)}" r="4" fill="${ink.primary}"/>
    <text x="${Math.min(X(xs[xs.length - 1]), W - padR - 4).toFixed(1)}" y="${(Y(last.value) - 8).toFixed(1)}" text-anchor="end" font-size="10" font-weight="700" fill="${ink.text}">${last.value}${unit}</text>
    <text x="${padL}" y="${H - 6}" font-size="9" fill="${ink.muted}">${formatDateShort(points[0].date)}</text>
    <text x="${W - padR}" y="${H - 6}" text-anchor="end" font-size="9" fill="${ink.muted}">${formatDateShort(last.date)}</text>
    ${dots}
  </svg>`;
}

// bars: [{label, value}] left-to-right; maxY optional
function svgBarChart(bars, maxY) {
  const ink = chartInk();
  if (!bars.length) return '<div class="empty-note">No training recorded yet.</div>';
  const W = 320, H = 150, padL = 22, padR = 8, padT = 12, padB = 20;
  const top = Math.max(maxY || 0, ...bars.map(b => b.value), 1);
  const innerW = W - padL - padR;
  const bw = Math.min(26, innerW / bars.length - 2);
  const Y = v => padT + (H - padT - padB) * (1 - v / top);
  const maxIdx = bars.reduce((m, b, i) => b.value > bars[m].value ? i : m, 0);
  const marks = bars.map((b, i) => {
    const x = padL + (innerW / bars.length) * i + (innerW / bars.length - bw) / 2;
    const y = Y(b.value), h = H - padB - y;
    const showLabel = b.value > 0 && (i === maxIdx || i === bars.length - 1);
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(h, b.value > 0 ? 3 : 0).toFixed(1)}" rx="4" fill="${ink.primary}"><title>${b.label}: ${b.value} day${b.value === 1 ? '' : 's'}</title></rect>
      ${showLabel ? `<text x="${(x + bw / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="700" fill="${ink.text}">${b.value}</text>` : ''}
      <text x="${(x + bw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle" font-size="8.5" fill="${ink.muted}">${b.label}</text>`;
  }).join('');
  const base = `<line x1="${padL}" x2="${W - padR}" y1="${H - padB}" y2="${H - padB}" stroke="${ink.border}" stroke-width="1"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" role="img" aria-label="Training days per week">${base}${marks}</svg>`;
}

// Ring meter: pct 0-1
function svgRing(pct, centerText, subText) {
  const ink = chartInk();
  const R = 26, C = 2 * Math.PI * R;
  return `<svg viewBox="0 0 64 64" style="width:64px;height:64px" role="img" aria-label="${subText}: ${Math.round(pct * 100)}%">
    <circle cx="32" cy="32" r="${R}" fill="none" stroke="${ink.border}" stroke-width="6"/>
    <circle cx="32" cy="32" r="${R}" fill="none" stroke="${ink.primary}" stroke-width="6" stroke-linecap="round"
      stroke-dasharray="${(C * pct).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 32 32)"/>
    <text x="32" y="37" text-anchor="middle" font-size="15" font-weight="700" fill="${ink.text}">${centerText}</text>
  </svg>`;
}

// ---- data derivations ----

// Distinct dates with any training activity (exercise checked or set logged)
function trainedDates() {
  const dates = new Set(Object.keys(getChecklist()));
  const logs = getLogs();
  Object.keys(logs).forEach(k => logs[k].forEach(l => dates.add(l.date)));
  return dates;
}

// Training days per ISO-ish week (Mon-Sun), last n weeks
function weeklyTrainingCounts(n) {
  const dates = trainedDates();
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const weeks = [];
  for (let i = n - 1; i >= 0; i--) {
    const start = new Date(monday); start.setDate(monday.getDate() - 7 * i);
    let count = 0;
    for (let d = 0; d < 7; d++) {
      const day = new Date(start); day.setDate(start.getDate() + d);
      const iso = new Date(day.getTime() - day.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      if (dates.has(iso)) count++;
    }
    weeks.push({ label: `${start.getDate()}/${start.getMonth() + 1}`, value: count });
  }
  return weeks;
}

// ---- progress page ----
let progressView = 'log';
let chartExercise = null;

function setProgressView(v) {
  progressView = v;
  const logEl = document.getElementById('progress-log');
  const chartsEl = document.getElementById('progress-charts');
  if (logEl) logEl.hidden = v !== 'log';
  if (chartsEl) chartsEl.hidden = v !== 'charts';
  const seg = document.getElementById('progress-seg');
  if (seg) seg.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.view === v));
  if (v === 'charts') renderCharts();
}

function renderProgressHeader() {
  const el = document.getElementById('progress-header');
  if (!el) return;
  const profile = getProfile();
  const wlog = sortedWeightLog();
  const weight = wlog.length ? `${wlog[0].weight} kg` : '—';
  const height = profile && profile.heightCm ? `${profile.heightCm} cm` : '—';
  let bmi = '—';
  if (profile && profile.heightCm && wlog.length) {
    const m = profile.heightCm / 100;
    bmi = String(Math.round(wlog[0].weight / (m * m) * 10) / 10);
  }
  const initial = (currentUser && currentUser.email ? currentUser.email[0] : '💪').toUpperCase();
  el.innerHTML = `
    <div class="ph-avatar">${initial}</div>
    <div class="ph-pills">
      <div class="ph-pill"><b>${weight}</b><span>Weight</span></div>
      <div class="ph-pill"><b>${height}</b><span>Height</span></div>
      <div class="ph-pill"><b>${bmi}</b><span>BMI</span></div>
    </div>`;
}

function renderCharts() {
  const ink = chartInk();
  const wEl = document.getElementById('chart-weight');
  if (wEl) {
    const pts = sortedWeightLog().slice().reverse().map(l => ({ date: l.date, value: l.weight }));
    wEl.innerHTML = svgLineChart(pts, 'kg');
  }
  const sel = document.getElementById('chart-ex-select');
  const eEl = document.getElementById('chart-exercise');
  if (sel && eEl) {
    const logs = getLogs();
    const keys = Object.keys(logs).filter(k => logs[k].length);
    if (!keys.length) {
      sel.hidden = true;
      eEl.innerHTML = '<div class="empty-note">Log some sets and your lift progress will chart here.</div>';
    } else {
      sel.hidden = false;
      if (!chartExercise || !keys.includes(chartExercise)) chartExercise = keys[0];
      sel.innerHTML = keys.map(k => {
        const ex = EXERCISES.find(e => e.key === k);
        return `<option value="${k}" ${k === chartExercise ? 'selected' : ''}>${ex ? ex.name : k}</option>`;
      }).join('');
      // best weight per date
      const byDate = {};
      logs[chartExercise].forEach(l => { byDate[l.date] = Math.max(byDate[l.date] || 0, l.weight); });
      const pts = Object.keys(byDate).sort().map(d => ({ date: d, value: byDate[d] }));
      eEl.innerHTML = svgLineChart(pts, 'kg');
    }
  }
  const bEl = document.getElementById('chart-weeks');
  if (bEl) {
    const target = currentPlan().length;
    bEl.innerHTML = svgBarChart(weeklyTrainingCounts(8), target) +
      `<div class="info-body" style="margin-top:6px">Days with any logged training, per week (target: ${target}/week).</div>`;
  }
}

function setChartExercise(key) { chartExercise = key; renderCharts(); }

// ---- month calendar ----
let calOffset = 0; // months back from current

function moveCal(delta) { calOffset = Math.min(0, calOffset + delta); renderCalendar(); }

function renderCalendar() {
  const el = document.getElementById('cal-card');
  if (!el) return;
  const dates = trainedDates();
  const now = new Date();
  const view = new Date(now.getFullYear(), now.getMonth() + calOffset, 1);
  const monthName = view.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const firstDow = (view.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  let cells = '<div class="cal-grid">' + ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(d => `<div class="cal-dow">${d}</div>`).join('');
  for (let i = 0; i < firstDow; i++) cells += '<div></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(view.getFullYear(), view.getMonth(), d);
    const iso = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const trained = dates.has(iso);
    const isToday = calOffset === 0 && d === now.getDate();
    cells += `<div class="cal-day ${trained ? 'trained' : ''} ${isToday ? 'today' : ''}">${d}</div>`;
  }
  cells += '</div>';
  el.innerHTML = `<div class="cal-head">
      <button class="mini-btn" onclick="moveCal(-1)" aria-label="Previous month">‹</button>
      <div class="info-title" style="margin:0">${monthName}</div>
      <button class="mini-btn" onclick="moveCal(1)" aria-label="Next month" ${calOffset === 0 ? 'disabled' : ''}>›</button>
    </div>${cells}
    <div class="info-body" style="margin-top:8px"><span class="cal-key"></span> trained day</div>`;
}

function renderProgressPage() {
  if (!document.getElementById('progress-header')) return;
  renderProgressHeader();
  renderCalendar();
  renderActivity();
  setProgressView(progressView);
}
