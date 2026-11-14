const SITE_IDS = ['site06', 'dm2'];
const API_DATE = document.querySelector('#date-input');
const HOURS = document.querySelector('#hours-input');
const STEP = document.querySelector('#step-input');
const UPDATE = document.querySelector('#update-button');
const FILE_INPUT = document.querySelector('#ephemeris-file');
const STATUS = document.querySelector('#status-message');
const CONNECTION = document.querySelector('#connection-label');
const SVG_NS = 'http://www.w3.org/2000/svg';

// The bundled Horizons series begins at 2026-11-15 00:00 UTC.
API_DATE.value = '2026-11-15';

let terrain = null;
let ephemerides = {};
let sourceBundle = null;
let visibility = {};
let activeSite = 'site06';
let selectedIndex = 0;

function updateDateBounds() {
  if (!sourceBundle || sourceBundle.sampleOnly) return;
  const end = Date.parse(sourceBundle.stopTime);
  const start = Date.parse(sourceBundle.startTime);
  const maxStart = end - Number(HOURS.value) * 3600000;
  API_DATE.min = new Date(start).toISOString().slice(0, 10);
  API_DATE.max = new Date(maxStart).toISOString().slice(0, 10);
  if (API_DATE.value < API_DATE.min) API_DATE.value = API_DATE.min;
  if (API_DATE.value > API_DATE.max) API_DATE.value = API_DATE.max;
}

const fmt = (n, digits = 1) => Number.isFinite(n) ? n.toFixed(digits) : '—';
const earthColor = '#84c7bf';
const sunColor = '#e7b85d';

function horizonAt(profile, az) {
  const a = ((az % 360) + 360) % 360;
  const binWidth = terrain?.binWidthDeg || 1;
  const position = a / binWidth;
  const lo = Math.floor(position) % profile.length;
  const hi = (lo + 1) % profile.length;
  const t = position - Math.floor(position);
  return profile[lo] * (1 - t) + profile[hi] * t;
}

function makeSvg(tag, attrs = {}, parent) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  if (parent) parent.append(el);
  return el;
}

function sampleIndex(site, time) {
  const arr = ephemerides[site]?.sun || [];
  if (!arr.length) return 0;
  const target = new Date(time).valueOf();
  let best = 0, dist = Infinity;
  arr.forEach((item, i) => {
    const d = Math.abs(new Date(item.time).valueOf() - target);
    if (d < dist) { best = i; dist = d; }
  });
  return best;
}

function drawSky() {
  const svg = document.querySelector('#sky-chart');
  svg.replaceChildren();
  if (!terrain?.sites?.[activeSite]) {
    makeSvg('text', { x: 220, y: 145, 'text-anchor': 'middle', fill: '#829093', 'font-size': 11 }, svg).textContent = 'Terrain profile loading…';
    return;
  }
  const left = 48, right = 416, top = 18, bottom = 246;
  const elevMin = -15, elevMax = 60;
  const x = az => left + Math.max(0, Math.min(360, az)) / 360 * (right - left);
  const y = el => bottom - (el - elevMin) / (elevMax - elevMin) * (bottom - top);
  const grid = makeSvg('g', { 'stroke-width': 1 }, svg);
  for (let el = -10; el <= 60; el += 10) {
    const yy = y(el);
    makeSvg('line', { x1: left, x2: right, y1: yy, y2: yy, stroke: el === 0 ? '#55656a' : '#253238', 'stroke-dasharray': el === 0 ? '0' : '3 5' }, grid);
    makeSvg('text', { x: left - 9, y: yy + 3, 'text-anchor': 'end', fill: '#839194', 'font-size': 9, 'font-family': 'DM Mono, monospace' }, svg).textContent = `${el}°`;
  }
  const directions = [[0, 'N'], [90, 'E'], [180, 'S'], [270, 'W'], [360, 'N']];
  for (const [az, label] of directions) {
    const xx = x(az);
    makeSvg('line', { x1: xx, x2: xx, y1: top, y2: bottom, stroke: '#243136', 'stroke-dasharray': '3 5' }, grid);
    makeSvg('text', { x: xx, y: bottom + 17, 'text-anchor': 'middle', fill: '#839194', 'font-size': 9, 'font-family': 'DM Mono, monospace' }, svg).textContent = label;
  }
  makeSvg('text', { x: left, y: 11, fill: '#829093', 'font-size': 8, 'font-family': 'DM Mono, monospace' }, svg).textContent = 'ELEVATION ABOVE LOCAL LEVEL';

  const profile = terrain.sites[activeSite].skyline?.horizonDeg || terrain.sites[activeSite].horizonDeg;
  const horizonPoints = [];
  for (let az = 0; az <= 360; az++) horizonPoints.push(`${x(az)},${y(horizonAt(profile, az))}`);
  makeSvg('polyline', { points: horizonPoints.join(' '), fill: 'none', stroke: '#9ca9a3', 'stroke-width': 1.7, 'stroke-linejoin': 'round' }, svg);
  const skylineArea = `${left},${bottom} ${horizonPoints.join(' ')} ${right},${bottom}`;
  makeSvg('polygon', { points: skylineArea, fill: '#84928f', opacity: .09 }, svg);

  const ephem = ephemerides[activeSite];
  if (ephem?.sun?.length) {
    const plotTrack = (series, color) => {
      let d = '', previousAz = null;
      for (const point of series) {
        const split = previousAz !== null && Math.abs(point.az - previousAz) > 180;
        d += `${!d || split ? 'M' : 'L'}${x(point.az)},${y(point.el)} `;
        previousAz = point.az;
      }
      makeSvg('path', { d, fill: 'none', stroke: color, opacity: .36, 'stroke-width': 1.1 }, svg);
    };
    plotTrack(ephem.sun, sunColor);
    plotTrack(ephem.earth, earthColor);
    const i = Math.min(selectedIndex, ephem.sun.length - 1);
    const markers = [
      { point: ephem.sun[i], color: sunColor, label: '☼' },
      { point: ephem.earth[i], color: earthColor, label: 'E' },
    ];
    for (const m of markers) if (m.point) {
      makeSvg('circle', { cx: x(m.point.az), cy: y(m.point.el), r: 5.2, fill: m.color, stroke: '#0e1519', 'stroke-width': 2 }, svg);
      makeSvg('circle', { cx: x(m.point.az), cy: y(m.point.el), r: 8.8, fill: 'none', stroke: m.color, opacity: .3 }, svg);
    }
    const sun = ephem.sun[i], earth = ephem.earth[i];
    document.querySelector('#sky-readout').innerHTML = `<span class="readout-item"><i class="legend-sun"></i>SUN <b>${fmt(sun?.az, 1)}° / ${fmt(sun?.el, 1)}°</b></span><span class="readout-item"><i class="legend-earth"></i>EARTH <b>${fmt(earth?.az, 1)}° / ${fmt(earth?.el, 1)}°</b></span><span class="readout-muted">${sun?.time?.slice(11, 16) || ''} UTC</span>`;
  } else {
    document.querySelector('#sky-readout').innerHTML = '<span class="readout-muted">Load a locally prepared Horizons bundle.</span>';
  }
  const max = Math.max(...profile);
  document.querySelector('.sky-note span:last-child').textContent = `Gray line = terrain skyline (peak ${fmt(max, 1)}°) within the ${Math.round(terrain.horizonRadiusMeters / 1000)} km regional DEM. Terrain beyond this data window is not included.`;
}

function buildVisibility(site) {
  const data = ephemerides[site];
  const profile = terrain?.sites?.[site]?.skyline?.horizonDeg || terrain?.sites?.[site]?.horizonDeg;
  if (!data || !profile || data.sun.length < 2 || data.earth.length < 2) return null;
  const sun = data.sun.map(p => ({ ...p, clear: p.el > horizonAt(profile, p.az) }));
  const earth = data.earth.map(p => ({ ...p, clear: p.el > horizonAt(profile, p.az) }));
  const stepHours = data.stepMinutes / 60;
  const duration = data.windowHours;
  // Horizons includes both endpoints. Each visibility sample represents the
  // interval until the next sample, so the final endpoint has zero duration.
  const sunHours = sun.slice(0, -1).reduce((n, p) => n + (p.clear ? 1 : 0), 0) * stepHours;
  const earthHours = earth.slice(0, -1).reduce((n, p) => n + (p.clear ? 1 : 0), 0) * stepHours;
  return { sun, earth, sunHours: Math.min(duration, sunHours), earthHours: Math.min(duration, earthHours), duration };
}

function renderTrack(id, sunSeries, earthSeries, durationHours) {
  const node = document.querySelector(`#${id}`);
  node.replaceChildren();
  const length = Math.min(sunSeries?.length || 0, earthSeries?.length || 0);
  if (length === 1) { node.innerHTML = '<span class="empty-state">ONE EPOCH • NO DURATION</span>'; return; }
  if (!length) { node.innerHTML = '<span class="empty-state">NO DATA</span>'; return; }
  const total = Math.max(1, durationHours);
  const intervals = Math.max(1, length - 1);
  const cell = 100 / intervals;
  for (const [kind, series] of [['sun', sunSeries], ['earth', earthSeries]]) {
    for (let i = 0; i < intervals; i++) if (series[i].clear) {
      const bar = document.createElement('span');
      bar.className = `track-window ${kind}`;
      bar.style.left = `${i * cell}%`;
      bar.style.width = `${cell + .12}%`;
      node.append(bar);
    }
  }
  const playhead = document.createElement('span');
  playhead.className = 'timeline-playhead';
  playhead.style.left = `${Math.min(99.8, Math.max(0, selectedIndex / Math.max(1, length - 1) * 100))}%`;
  node.append(playhead);
  node.onclick = event => {
    const box = node.getBoundingClientRect();
    selectedIndex = Math.round(((event.clientX - box.left) / box.width) * (length - 1));
    renderAll();
  };
  node.title = `Sun and Earth center visibility over ${total} hours; click to inspect a time.`;
}

function renderAxis(data) {
  const axis = document.querySelector('#timeline-axis');
  axis.replaceChildren();
  if (!data?.sun?.length) return;
  if (data.sun.length === 1) {
    const tick = document.createElement('span');
    tick.className = 'tick';
    tick.style.left = '50%';
    tick.textContent = data.sun[0].time.slice(11, 16) + ' UTC';
    axis.append(tick);
    return;
  }
  const n = Math.min(7, Math.max(2, Math.ceil(data.windowHours / 6) + 1));
  for (let i = 0; i < n; i++) {
    const pct = i / (n - 1) * 100;
    const tick = document.createElement('span');
    tick.className = 'tick';
    tick.style.left = `${pct}%`;
    tick.textContent = new Date(new Date(data.sun[0].time).valueOf() + data.windowHours * 3600000 * i / (n - 1)).toISOString().slice(5, 16).replace('T', ' ');
    axis.append(tick);
  }
}

function updateMetric(id, hours, duration) {
  document.querySelector(`#${id}`).innerHTML = `${fmt(hours, 1)}<small>h</small>`;
  const pctId = id.replace(/([ab])$/, 'pct-$1');
  const pctNode = document.getElementById(pctId);
  if (pctNode) pctNode.textContent = `${fmt(duration ? hours / duration * 100 : 0, 0)}% of window`;
}

function renderAll() {
  for (const site of SITE_IDS) visibility[site] = buildVisibility(site);
  const a = visibility.site06, b = visibility.dm2;
  for (const id of ['sunlight-a', 'sunlight-b', 'earth-a', 'earth-b']) {
    document.querySelector(`#${id}`).innerHTML = '—<small>h</small>';
    const pctId = id.replace(/([ab])$/, 'pct-$1');
    const pctNode = document.getElementById(pctId);
    if (pctNode) pctNode.textContent = '—';
  }
  if (a) {
    updateMetric('sunlight-a', a.sunHours, a.duration);
    updateMetric('earth-a', a.earthHours, a.duration);
    renderTrack('timeline-site06', a.sun, a.earth, a.duration);
  }
  if (b) {
    updateMetric('sunlight-b', b.sunHours, b.duration);
    updateMetric('earth-b', b.earthHours, b.duration);
    renderTrack('timeline-dm2', b.sun, b.earth, b.duration);
  }
  if (!a) renderTrack('timeline-site06', ephemerides.site06?.sun || [], ephemerides.site06?.earth || [], 0);
  if (!b) renderTrack('timeline-dm2', ephemerides.dm2?.sun || [], ephemerides.dm2?.earth || [], 0);
  const current = ephemerides[activeSite];
  renderAxis(current);
  drawSky();
  if (a && b) {
    const format = x => `${fmt(x, 1)} h`;
    document.querySelector('#timeline-summary').innerHTML = `<span>Window: ${current.windowHours} h • step: ${current.stepMinutes} min</span><span>Sun clear: A ${format(a.sunHours)} / B ${format(b.sunHours)}</span><span>Earth center clear: A ${format(a.earthHours)} / B ${format(b.earthHours)}</span>`;
    const compare = (label, aHours, bHours) => {
      const diff = Math.abs(aHours - bHours);
      if (diff < current.stepMinutes / 60) return `${label}: both sites have similar modeled centre visibility in this window.`;
      const winner = aHours > bHours ? 'Nobile Rim 1 (A)' : 'Nobile Rim 2 (B)';
      return `${label}: ${winner} has ${fmt(diff, 1)} more estimated clear time in this window.`;
    };
    document.querySelector('#comparison-insight').textContent = `${compare('Sun', a.sunHours, b.sunHours)} ${compare('Earth centre', a.earthHours, b.earthHours)} These are local geometric estimates, not a site-selection recommendation.`;
  } else {
    document.querySelector('#timeline-summary').textContent = current?.sun?.length === 1
      ? 'One verified timestamp is shown. Import a multi-epoch Horizons bundle to calculate duration estimates.'
      : 'Choose a date within the imported bundle or load a multi-epoch Horizons bundle.';
    document.querySelector('#comparison-insight').textContent = 'A multi-epoch bundle is needed to compare time windows.';
  }
}

function windowForBundle() {
  if (!sourceBundle) return;
  const start = Date.parse(`${API_DATE.value}T00:00:00Z`);
  const hours = Number(HOURS.value);
  const requestedStep = Number(STEP.value);
  const end = start + hours * 3600000;
  const bundleStart = Date.parse(sourceBundle.startTime);
  const bundleEnd = Date.parse(sourceBundle.stopTime);
  if (!Number.isFinite(start) || !Number.isFinite(end)) throw new Error('Choose a valid UTC start date.');
  if (sourceBundle.sampleOnly) {
    if (new Date(start).toISOString().slice(0, 10) !== sourceBundle.startTime.slice(0, 10)) {
      ephemerides = {};
      return 'The bundled snapshot is for 2026-11-15 UTC. Load a matching time series for other dates.';
    }
    ephemerides = sourceBundle.sites;
    return 'Single verified snapshot loaded; duration metrics need multiple timestamps.';
  }
  if (start < bundleStart || end > bundleEnd) {
    ephemerides = {};
    return `Selected window is outside this bundle (${sourceBundle.startTime.slice(0, 16)} to ${sourceBundle.stopTime.slice(0, 16)} UTC).`;
  }
  const baseStep = Number(sourceBundle.stepMinutes) || 10;
  if (start !== bundleStart && !sourceBundle.sites.site06.sun.some(p => Date.parse(p.time) === start)) {
    ephemerides = {};
    return 'The selected start time must match an epoch in this bundle. Choose its UTC start date or export a bundle beginning at 00:00 UTC.';
  }
  if (!sourceBundle.sites.site06.sun.some(p => Date.parse(p.time) === end)) {
    ephemerides = {};
    return `This bundle has no sample exactly at the requested ${hours} h endpoint. Export through ${new Date(end).toISOString()} UTC.`;
  }
  const stride = Math.max(1, Math.round(Math.max(baseStep, requestedStep) / baseStep));
  const actualStep = baseStep * stride;
  const sliceSeries = series => series.filter(point => {
    const time = Date.parse(point.time);
    const offsetSteps = Math.round((time - start) / (baseStep * 60000));
    return time >= start && time <= end && offsetSteps % stride === 0;
  });
  ephemerides = Object.fromEntries(SITE_IDS.map(site => {
    const original = sourceBundle.sites[site];
    return [site, {
      ...original,
      sun: sliceSeries(original.sun),
      earth: sliceSeries(original.earth),
      stepMinutes: actualStep,
      windowHours: hours,
      source: sourceBundle.source,
    }];
  }));
  return `Imported Horizons data • ${hours} h window • ${actualStep} min sampled step.`;
}

function validateBundle(bundle) {
  if (bundle?.schemaVersion !== 1 || !bundle.sites || !bundle.startTime || !bundle.stopTime) {
    throw new Error('This is not a supported Horizons bundle. See README.md for the required format.');
  }
  for (const site of SITE_IDS) {
    for (const body of ['sun', 'earth']) {
      const series = bundle.sites[site]?.[body];
      if (!Array.isArray(series) || !series.length || series.some(p => !Number.isFinite(p.az) || p.az < 0 || p.az >= 360 || !Number.isFinite(p.el) || p.el < -90 || p.el > 90 || !Number.isFinite(Date.parse(p.time)))) {
        throw new Error(`Bundle is missing valid ${body} samples for ${site}.`);
      }
      for (let i = 1; i < series.length; i++) {
        if (Date.parse(series[i].time) <= Date.parse(series[i - 1].time)) throw new Error(`${site} ${body} times must be strictly increasing.`);
      }
    }
  }
  const start = Date.parse(bundle.startTime), stop = Date.parse(bundle.stopTime);
  if (!Number.isFinite(start) || !Number.isFinite(stop) || stop < start) throw new Error('Bundle must contain valid start and end times in chronological order.');
  const baseline = bundle.sites.site06.sun;
  if (Date.parse(baseline[0].time) !== start || Date.parse(baseline.at(-1).time) !== stop) throw new Error('Bundle coverage times must match the first and last Sun samples.');
  for (const site of SITE_IDS) for (const body of ['sun', 'earth']) {
    const series = bundle.sites[site][body];
    if (series.length !== baseline.length || series.some((p, i) => Date.parse(p.time) !== Date.parse(baseline[i].time))) throw new Error('Sun and Earth series at both sites must use identical timestamps.');
  }
  if (!bundle.sampleOnly) {
    const stepMs = Number(bundle.stepMinutes) * 60000;
    if (!Number.isFinite(stepMs) || stepMs <= 0) throw new Error('A multi-epoch bundle needs a positive time step.');
    for (let i = 1; i < baseline.length; i++) if (Date.parse(baseline[i].time) - Date.parse(baseline[i - 1].time) !== stepMs) throw new Error('Bundle timestamps must be evenly spaced at the declared step.');
  }
}

async function loadBundleFile(file) {
  STATUS.classList.remove('error');
  try {
    const bundle = JSON.parse(await file.text());
    validateBundle(bundle);
    sourceBundle = bundle;
    API_DATE.value = bundle.startTime.slice(0, 10);
    if (bundle.windowHours && [...HOURS.options].some(o => Number(o.value) === Number(bundle.windowHours))) HOURS.value = String(bundle.windowHours);
    if (bundle.stepMinutes && [...STEP.options].some(o => Number(o.value) === Number(bundle.stepMinutes))) STEP.value = String(bundle.stepMinutes);
    updateDateBounds();
    selectedIndex = 0;
    const message = windowForBundle();
    renderAll();
    STATUS.textContent = `${bundle.source || 'Imported Horizons bundle'} • ${bundle.sampleOnly ? 'single timestamp' : `${bundle.sites.site06.sun.length} epochs per body/site`} • no live API connection.`;
    CONNECTION.textContent = bundle.sampleOnly ? 'SAMPLE DATA' : 'IMPORTED DATA';
    document.querySelector('#timeline-summary').textContent = message;
  } catch (error) {
    STATUS.classList.add('error');
    STATUS.textContent = error.message;
  }
}

document.querySelectorAll('.sky-tab').forEach(tab => tab.addEventListener('click', () => {
  document.querySelectorAll('.sky-tab').forEach(t => { t.classList.toggle('active', t === tab); t.setAttribute('aria-selected', String(t === tab)); });
  activeSite = tab.dataset.site;
  selectedIndex = 0;
  renderAll();
}));
UPDATE.addEventListener('click', () => FILE_INPUT.click());
FILE_INPUT.addEventListener('change', () => { const file = FILE_INPUT.files?.[0]; if (file) loadBundleFile(file); FILE_INPUT.value = ''; });
for (const input of [API_DATE, HOURS, STEP]) input.addEventListener('change', () => {
  try { updateDateBounds(); const message = windowForBundle(); selectedIndex = 0; renderAll(); STATUS.textContent = message || 'Local analysis updated from imported data.'; }
  catch (error) { STATUS.classList.add('error'); STATUS.textContent = error.message; }
});
document.querySelector('#sources-open').addEventListener('click', () => document.querySelector('#sources-dialog').showModal());
document.querySelector('#sources-inline').addEventListener('click', () => document.querySelector('#sources-dialog').showModal());
document.querySelector('#sources-close').addEventListener('click', () => document.querySelector('#sources-dialog').close());

function positionMapSites() {
  const map = document.querySelector('.map-visual');
  if (!map) return;
  const width = map.clientWidth, height = map.clientHeight;
  const scale = Math.min(width * .43 / 200, height * .40 / 200);
  const points = [
    ['.site-point-a', 84, 110],
    ['.site-point-b', 157, 95],
  ];
  for (const [selector, xKm, yKm] of points) {
    const node = map.querySelector(selector);
    node.style.left = `${(width / 2 + xKm * scale) / width * 100}%`;
    node.style.top = `${(height / 2 - yKm * scale) / height * 100}%`;
  }
}
window.addEventListener('resize', positionMapSites);
positionMapSites();

try {
  terrain = window.SELENE_TERRAIN;
  sourceBundle = window.SELENE_HORIZONS;
  if (!terrain) throw new Error('Terrain data did not load. Keep the data folder beside index.html.');
  if (!sourceBundle) throw new Error('Horizons data did not load. Keep the data folder beside index.html.');
  validateBundle(sourceBundle);
  updateDateBounds();
  const message = windowForBundle();
  renderAll();
  STATUS.textContent = 'JPL Horizons time series loaded • 7 days available • 10-minute sample step. Values are terrain-center visibility estimates.';
  CONNECTION.textContent = 'OFFLINE DATA';
  document.querySelector('#timeline-summary').textContent = message;
} catch (error) {
  STATUS.classList.add('error');
  STATUS.textContent = error.message;
  CONNECTION.textContent = 'DATA MISSING';
  drawSky();
}
