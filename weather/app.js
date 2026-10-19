'use strict';

const CONFIG = {
  lat: 41.6565,
  lon: -70.6205,
  tz: 'America/New_York',
  tideStation: '8447685',   // Chappaquoit Point, West Falmouth
  waterTempStation: '8447930', // Woods Hole
  marineZone: 'ANZ234',     // Buzzards Bay
  marineOffice: 'BOX',
  buoy: 'BUZM3',            // Buzzards Bay tower (NDBC), via the NWS observations API
  waterLevelStation: '8447930', // Woods Hole: observed vs. predicted water level
  currentStations: [
    // Flow directions come from NOAA; these just say where each direction leads.
    { id: 'COD0904', bin: 15, name: 'Cape Cod Canal · Railroad Bridge', floodTo: 'Cape Cod Bay', ebbTo: 'Buzzards Bay' },
    { id: 'COD0911', bin: 1, name: 'Woods Hole · The Strait', floodTo: 'Vineyard Sound', ebbTo: 'Buzzards Bay' },
  ],
  days: 7,
  refreshMinutes: 30,
};

// ---------- time helpers (everything is displayed in Megansett local time) ----------

const fmtKey = new Intl.DateTimeFormat('en-CA', { timeZone: CONFIG.tz, year: 'numeric', month: '2-digit', day: '2-digit' });
const fmtHM24 = new Intl.DateTimeFormat('en-US', { timeZone: CONFIG.tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const fmtTime = new Intl.DateTimeFormat('en-US', { timeZone: CONFIG.tz, hour: 'numeric', minute: '2-digit' });

const dateKey = (d) => fmtKey.format(d);

function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

function dayDiff(a, b) {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5);
}

function minutesOfDay(date) {
  const [h, m] = fmtHM24.format(date).split(':').map(Number);
  return (h % 24) * 60 + m;
}

// The instant of local midnight for a YYYY-MM-DD key (EDT = UTC-4, EST = UTC-5).
function localMidnight(key) {
  const [y, m, d] = key.split('-').map(Number);
  for (const h of [4, 5]) {
    const t = new Date(Date.UTC(y, m - 1, d, h));
    if (minutesOfDay(t) === 0) return t;
  }
  return new Date(Date.UTC(y, m - 1, d, 4));
}

function keyLabel(key, i) {
  const d = new Date(key + 'T12:00:00Z');
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return { title: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : weekday, date: (i < 2 ? weekday.slice(0, 3) + ', ' : '') + date, short: d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }), dayNum: d.getUTCDate() };
}

const fmt = (date) => (date && !isNaN(date) ? fmtTime.format(date) : '—');
const fmtClock = (min) => {
  const h = Math.floor(min / 60), m = String(min % 60).padStart(2, '0');
  return `${(h % 12) || 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
};
const fmtDuration = (ms) => {
  const m = Math.round(ms / 60000);
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function getJSON(url) {
  const res = await fetch(url, { headers: { Accept: 'application/geo+json, application/json' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'Request failed');
  return data;
}

// ---------- data sources ----------

async function loadWeather() {
  const point = await getJSON(`https://api.weather.gov/points/${CONFIG.lat},${CONFIG.lon}`);
  const [daily, hourly, grid] = await Promise.all([
    getJSON(point.properties.forecast),
    getJSON(point.properties.forecastHourly).catch(() => null),
    getJSON(point.properties.forecastGridData).catch(() => null),
  ]);
  const byDay = {};
  for (const p of daily.properties.periods) {
    const key = p.startTime.slice(0, 10); // startTime carries the local offset
    (byDay[key] ||= {})[p.isDaytime ? 'day' : 'night'] = p;
  }
  return {
    byDay,
    now: hourly?.properties.periods[0] || null,
    wind: grid ? hourlyWind(grid.properties) : null,
    cell: daily.geometry || null, // the forecast grid square, shown on the map
  };
}

// Convert an NWS quantity to knots based on its unit code.
function toKnots(value, unit = '') {
  if (value == null) return null;
  if (unit.includes('km_h')) return value / 1.852;
  if (unit.includes('m_s')) return value * 1.94384;
  if (unit.includes('mi_h')) return value / 1.15078;
  return value;
}

// Expand NWS grid time series ("2026-09-28T05:00:00+00:00/PT2H") into one value per hour.
function expandSeries(series, convert = (v) => v) {
  const out = new Map();
  for (const { validTime, value } of series?.values || []) {
    if (value == null) continue;
    const [start, dur] = validTime.split('/');
    const m = dur.match(/P(?:(\d+)D)?(?:T(?:(\d+)H)?)?/);
    const hours = (+(m?.[1] || 0)) * 24 + +(m?.[2] || 0) || 1;
    const t0 = Date.parse(start);
    for (let h = 0; h < hours; h++) out.set(t0 + h * 36e5, convert(value));
  }
  return out;
}

function hourlyWind(props) {
  const kt = (series) => expandSeries(series, (v) => toKnots(v, series?.uom));
  const spd = kt(props.windSpeed), gst = kt(props.windGust), dir = expandSeries(props.windDirection);
  return [...spd.keys()].sort((a, b) => a - b)
    .map((t) => ({ t, spd: spd.get(t), gst: Math.max(gst.get(t) ?? 0, spd.get(t)), dir: dir.get(t) }));
}

async function loadMarine() {
  const list = await getJSON(`https://api.weather.gov/products/types/CWF/locations/${CONFIG.marineOffice}`);
  const latest = list['@graph'][0];
  const product = await getJSON(latest['@id'] || `https://api.weather.gov/products/${latest.id}`);
  return parseCWF(product.productText, CONFIG.marineZone);
}

async function loadTides(todayKey) {
  const base = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';
  const common = `station=${CONFIG.tideStation}&product=predictions&datum=MLLW&time_zone=lst_ldt&units=english&format=json&application=capevisual.com`;
  const begin = todayKey.replace(/-/g, '');
  const hours = (CONFIG.days + 1) * 24;
  const yearEnd = addDays(todayKey, 364).replace(/-/g, '');
  const [curve, hilo, year] = await Promise.all([
    getJSON(`${base}?${common}&begin_date=${begin}&range=${hours}&interval=30`),
    getJSON(`${base}?${common}&begin_date=${begin}&range=${hours}&interval=hilo`),
    getJSON(`${base}?${common}&begin_date=${begin}&end_date=${yearEnd}&interval=hilo`).catch(() => null),
  ]);
  const parse = (p) => ({ key: p.t.slice(0, 10), min: +p.t.slice(11, 13) * 60 + +p.t.slice(14, 16), v: parseFloat(p.v), type: p.type });
  return {
    curve: curve.predictions.map(parse),
    hilo: hilo.predictions.map(parse),
    stats: year ? tideStats(year.predictions.map(parse)) : null,
  };
}

// How big is a tide? Compare against every predicted high/low in the next 12 months.
function tideStats(tides) {
  const highs = tides.filter((p) => p.type === 'H');
  const lows = tides.filter((p) => p.type === 'L');
  const byDay = {};
  for (const p of tides) (byDay[p.key] ||= []).push(p.v);
  const ranges = Object.values(byDay).filter((a) => a.length > 1).map((a) => Math.max(...a) - Math.min(...a));
  const avg = (a) => a.reduce((s, p) => s + p.v, 0) / a.length;
  return {
    highs: highs.map((p) => p.v).sort((a, b) => a - b),
    lows: lows.map((p) => p.v).sort((a, b) => a - b),
    ranges: ranges.sort((a, b) => a - b),
    maxHigh: highs.reduce((a, b) => (b.v > a.v ? b : a)),
    minLow: lows.reduce((a, b) => (b.v < a.v ? b : a)),
    avgHigh: avg(highs),
    avgLow: avg(lows),
  };
}

// Fraction of the sorted values that v is at least as extreme as (0..1).
const rankAbove = (sorted, v) => sorted.filter((x) => x <= v).length / sorted.length;
const rankBelow = (sorted, v) => sorted.filter((x) => x >= v).length / sorted.length;

// A tide's "size": higher highs and lower lows are bigger.
function tideSize(p, stats) {
  const r = p.type === 'H' ? rankAbove(stats.highs, p.v) : rankBelow(stats.lows, p.v);
  const label = r >= 0.9 ? 'Very big' : r >= 0.7 ? 'Big' : r > 0.3 ? 'Typical' : r > 0.1 ? 'Small' : 'Very small';
  return { r, label };
}

async function loadWaterTemp() {
  const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=water_temperature&date=latest&station=${CONFIG.waterTempStation}&time_zone=lst_ldt&units=english&format=json&application=capevisual.com`;
  const data = await getJSON(url);
  return data.data?.[0] ? parseFloat(data.data[0].v) : null;
}

const COOPS = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';

async function loadBuoy() {
  const p = (await getJSON(`https://api.weather.gov/stations/${CONFIG.buoy}/observations/latest`)).properties;
  const spd = toKnots(p.windSpeed?.value, p.windSpeed?.unitCode);
  if (spd == null) throw new Error('No wind reading');
  return { time: p.timestamp, spd, gst: toKnots(p.windGust?.value, p.windGust?.unitCode), dir: p.windDirection?.value };
}

// Observed minus predicted water level at Woods Hole (positive = water running high).
async function loadWaterLevel(todayKey) {
  const common = `station=${CONFIG.waterLevelStation}&datum=MLLW&time_zone=lst_ldt&units=english&format=json&application=capevisual.com`;
  const [obs, pred] = await Promise.all([
    getJSON(`${COOPS}?product=water_level&date=latest&${common}`),
    getJSON(`${COOPS}?product=predictions&begin_date=${addDays(todayKey, -1).replace(/-/g, '')}&range=48&${common}`),
  ]);
  const o = obs.data[0];
  const match = pred.predictions.find((x) => x.t === o.t);
  if (!match) throw new Error('No prediction for latest observation');
  return { t: o.t, diff: parseFloat(o.v) - parseFloat(match.v) };
}

async function loadCurrents(todayKey) {
  const begin = todayKey.replace(/-/g, '');
  const hours = (CONFIG.days + 1) * 24;
  return Promise.all(CONFIG.currentStations.map(async (s) => {
    const data = await getJSON(`${COOPS}?product=currents_predictions&station=${s.id}&bin=${s.bin}&interval=MAX_SLACK&begin_date=${begin}&range=${hours}&time_zone=lst_ldt&units=english&format=json&application=capevisual.com`);
    const events = data.current_predictions.cp.map((c) => ({
      key: c.Time.slice(0, 10), min: +c.Time.slice(11, 13) * 60 + +c.Time.slice(14, 16),
      type: c.Type, v: Math.abs(c.Velocity_Major),
    }));
    const first = data.current_predictions.cp[0] || {};
    return { ...s, events, floodDir: first.meanFloodDir, ebbDir: first.meanEbbDir };
  }));
}

// Active NWS alerts for Megansett (land) and the Buzzards Bay marine zone.
async function loadAlerts() {
  const [point, zone] = await Promise.all([
    getJSON(`https://api.weather.gov/alerts/active?point=${CONFIG.lat},${CONFIG.lon}`),
    getJSON(`https://api.weather.gov/alerts/active/zone/${CONFIG.marineZone}`),
  ]);
  const seen = new Set();
  return [...point.features, ...zone.features].map((f) => f.properties)
    .filter((a) => !seen.has(a.id) && seen.add(a.id))
    .map((a) => ({ id: a.id, event: a.event, severity: a.severity, ends: a.ends || a.expires, description: a.description, instruction: a.instruction }));
}

// Run a loader; on success remember the result, on failure fall back to the last good copy.
async function cached(name, maxAgeHours, loader) {
  const key = `cv:${name}`;
  try {
    const value = await loader();
    try { localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), value })); } catch { /* storage full or disabled */ }
    return { value };
  } catch (error) {
    console.error(name, error);
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      if (saved && Date.now() - saved.savedAt < maxAgeHours * 36e5) return { value: saved.value, staleSince: saved.savedAt, error };
    } catch { /* ignore bad cache */ }
    return { value: null, error };
  }
}

// ---------- Coastal Waters Forecast parsing ----------

const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function parseCWF(text, zone) {
  const upper = text.toUpperCase();
  const synopsis = extractSynopsis(text);
  const start = upper.search(new RegExp(`^${zone}-`, 'm'));
  if (start < 0) throw new Error(`Zone ${zone} not found in forecast`);
  const end = text.indexOf('$$', start);
  const lines = text.slice(start, end < 0 ? undefined : end).split('\n').map((l) => l.trim());

  let issueKey = null, issued = '';
  const headlines = [];
  const periods = [];
  let cur = null, inHeadline = null;

  for (const line of lines) {
    const iss = line.match(/^(\d{3,4} [AP]M [A-Z]{3,4}) ([A-Z]{3}) ([A-Z]{3}) (\d{1,2}) (\d{4})$/i);
    if (iss && !issueKey) {
      issued = line;
      const month = MONTHS.indexOf(iss[3].toUpperCase()) + 1;
      issueKey = `${iss[5]}-${String(month).padStart(2, '0')}-${iss[4].padStart(2, '0')}`;
      continue;
    }
    if (!periods.length && (line.startsWith('...') || inHeadline !== null)) {
      inHeadline = (inHeadline ? inHeadline + ' ' : '') + line;
      if (inHeadline.length > 3 && inHeadline.endsWith('...')) {
        headlines.push(inHeadline.replace(/^\.+|\.+$/g, '').trim());
        inHeadline = null;
      }
      continue;
    }
    const pm = line.match(/^\.([A-Z][A-Z ]*?)\.\.\.(.*)$/);
    if (pm) {
      cur = { label: pm[1].trim(), text: pm[2].trim() };
      periods.push(cur);
    } else if (cur && line) {
      cur.text += ' ' + line;
    } else if (cur && !line) {
      cur = null;
      if (periods.length) break; // boilerplate follows the last period
    }
  }

  if (!issueKey) throw new Error('Could not read forecast issue time');
  const issueDow = new Date(issueKey + 'T12:00:00Z').getUTCDay();
  for (const p of periods) {
    p.slots = labelToSlots(p.label, issueDow);
    p.text = p.text.replace(/\s+/g, ' ').trim();
  }
  return { issueKey, issued, headlines, periods, synopsis };
}

function extractSynopsis(text) {
  const m = text.match(/^\.?SYNOPSIS[^\n]*?\.\.\.\s*([\s\S]*?)\n\s*\n/m);
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
}

// Map a CWF period label to half-day slots relative to the issue day:
// slot = dayOffset * 2 + (night ? 1 : 0)
function labelToSlots(label, issueDow) {
  const parts = label.split(/ THROUGH | AND /);
  const slots = parts.map((part) => {
    part = part.trim();
    if (/^(TODAY|THIS MORNING|THIS AFTERNOON|REST OF TODAY)$/.test(part)) return 0;
    if (/(TONIGHT|THIS EVENING|OVERNIGHT)/.test(part)) return 1;
    const dow = DOW.indexOf(part.slice(0, 3));
    if (dow < 0) return null;
    const offset = (dow - issueDow + 7) % 7;
    return offset * 2 + (/NIGHT$/.test(part) ? 1 : 0);
  }).filter((s) => s !== null);
  if (!slots.length) return [];
  const out = [];
  for (let s = Math.min(...slots); s <= Math.max(...slots); s++) out.push(s);
  return out;
}

function marineForDay(marine, dayKey) {
  if (!marine) return [];
  const offset = dayDiff(marine.issueKey, dayKey);
  return marine.periods.filter((p) => p.slots.some((s) => Math.floor(s / 2) === offset));
}

// ---------- sun & moon ----------

function sunMoon(key) {
  const midnight = localMidnight(key);
  const nextMidnight = localMidnight(addDays(key, 1));
  const noon = new Date(midnight.getTime() + 12 * 36e5);
  const sun = SunCalc.getTimes(noon, CONFIG.lat, CONFIG.lon);
  const prevSun = SunCalc.getTimes(new Date(noon.getTime() - 864e5), CONFIG.lat, CONFIG.lon);
  const dayLength = sun.sunset - sun.sunrise;
  const deltaLength = dayLength - (prevSun.sunset - prevSun.sunrise);

  const moon = moonRiseSet(midnight, nextMidnight);
  const illum = SunCalc.getMoonIllumination(noon);
  const p0 = SunCalc.getMoonIllumination(midnight).phase;
  const p1 = SunCalc.getMoonIllumination(nextMidnight).phase;
  let event = null;
  if (p1 < p0) event = 'New Moon';
  else if (p0 < 0.25 && p1 >= 0.25) event = 'First Quarter';
  else if (p0 < 0.5 && p1 >= 0.5) event = 'Full Moon';
  else if (p0 < 0.75 && p1 >= 0.75) event = 'Last Quarter';

  return { sun, dayLength, deltaLength, moon, illum, event, phaseName: event || phaseName(illum.phase) };
}

// Scan the local day for moon altitude crossings (timezone-safe, unlike SunCalc.getMoonTimes).
function moonRiseSet(start, end) {
  const h0 = 0.133 * Math.PI / 180;
  const step = 10 * 60000;
  let rise = null, set = null;
  let prevT = start.getTime();
  let prevAlt = SunCalc.getMoonPosition(start, CONFIG.lat, CONFIG.lon).altitude - h0;
  for (let t = prevT + step; t <= end.getTime(); t += step) {
    const alt = SunCalc.getMoonPosition(new Date(t), CONFIG.lat, CONFIG.lon).altitude - h0;
    if ((prevAlt < 0) !== (alt < 0)) {
      const cross = new Date(prevT + (t - prevT) * (prevAlt / (prevAlt - alt)));
      if (alt > 0 && !rise) rise = cross;
      if (alt < 0 && !set) set = cross;
    }
    prevT = t; prevAlt = alt;
  }
  return { rise, set };
}

function phaseName(p) {
  if (p < 0.03 || p > 0.97) return 'New Moon';
  if (p < 0.22) return 'Waxing Crescent';
  if (p < 0.28) return 'First Quarter';
  if (p < 0.47) return 'Waxing Gibbous';
  if (p < 0.53) return 'Full Moon';
  if (p < 0.72) return 'Waning Gibbous';
  if (p < 0.78) return 'Last Quarter';
  return 'Waning Crescent';
}

function moonSvg(fraction, phase, size = 44) {
  const r = size / 2 - 1, c = size / 2;
  const waxing = phase < 0.5;
  const rx = Math.abs(1 - 2 * fraction) * r;
  const limb = waxing ? 1 : 0;
  const term = waxing ? (fraction < 0.5 ? 0 : 1) : (fraction < 0.5 ? 1 : 0);
  const lit = fraction < 0.01 ? '' :
    `<path d="M${c},${c - r} A${r},${r} 0 0 ${limb} ${c},${c + r} A${rx.toFixed(2)},${r} 0 0 ${term} ${c},${c - r}Z" fill="var(--moon-lit)"/>`;
  return `<svg class="moon" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
    <circle cx="${c}" cy="${c}" r="${r}" fill="var(--moon-dark)"/>${lit}
    <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--moon-rim)" stroke-width="1"/></svg>`;
}

// ---------- weather helpers ----------

// ---------- tide chart ----------

function tideChart(dayIndex, tides, sun, range, nowMin) {
  const W = 320, H = 110, padT = 22, padB = 22;
  const x = (m) => (m / 1440) * W;
  const y = (v) => padT + ((range.max - v) / (range.max - range.min)) * (H - padT - padB);
  const lo = dayIndex * 1440 - 60, hi = (dayIndex + 1) * 1440 + 60;
  const pts = tides.curve.filter((p) => p.abs >= lo && p.abs <= hi).map((p) => ({ m: p.abs - dayIndex * 1440, v: p.v }));
  if (pts.length < 2) return '<p class="muted">No tide data.</p>';

  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.m).toFixed(1)},${y(p.v).toFixed(1)}`).join('');
  const area = `${line}L${x(pts.at(-1).m).toFixed(1)},${H}L${x(pts[0].m).toFixed(1)},${H}Z`;
  const rise = minutesOfDay(sun.sunrise), set = minutesOfDay(sun.sunset);

  const marks = tides.hilo.filter((p) => p.abs >= dayIndex * 1440 && p.abs < (dayIndex + 1) * 1440).map((p) => {
    const m = p.abs - dayIndex * 1440, cx = x(m), cy = y(p.v);
    const high = p.type === 'H';
    const tx = Math.min(Math.max(cx, 22), W - 22);
    return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3" class="tide-dot ${high ? 'hi' : 'lo'}"/>
      <text x="${tx.toFixed(1)}" y="${(high ? cy - 8 : cy + 16).toFixed(1)}" class="tide-label">${fmtClock(m).replace(' ', '').toLowerCase()}</text>`;
  }).join('');

  const nowLine = nowMin == null ? '' :
    `<line x1="${x(nowMin)}" x2="${x(nowMin)}" y1="0" y2="${H}" class="now-line"/>`;

  const ticks = [6, 12, 18].map((h) =>
    `<line x1="${x(h * 60)}" x2="${x(h * 60)}" y1="${H - 8}" y2="${H}" class="tick"/>`).join('');

  return `<svg class="tide-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Tide curve">
    <rect x="0" y="0" width="${x(rise)}" height="${H}" class="night"/>
    <rect x="${x(set)}" y="0" width="${W - x(set)}" height="${H}" class="night"/>
    ${ticks}
    <path d="${area}" class="tide-area"/>
    <path d="${line}" class="tide-line"/>
    ${nowLine}
    ${marks}
  </svg>`;
}

// ---------- rendering ----------

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const compass = (deg) => (deg == null ? '' : COMPASS[Math.round(deg / 22.5) % 16]);

// Arrow pointing the way the wind blows (from `deg`, toward deg + 180).
const windArrow = (deg, size = 14) => deg == null ? '' :
  `<svg class="arrow" width="${size}" height="${size}" viewBox="0 0 16 16" style="transform:rotate(${deg + 180}deg)" aria-hidden="true"><path d="M8 14.5V2.5M3.5 7L8 2.5 12.5 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const shortClock = (min) => fmtClock(min).replace(':00', '').replace(' AM', 'a').replace(' PM', 'p');

function renderNow({ weather, tides, waterTemp, buoy, waterLevel }) {
  const el = document.getElementById('now');
  const items = [];
  const item = (big, sub, src) => `<div class="now-item"><span class="now-big">${big}</span><span class="now-sub">${sub}</span>${src ? `<span class="now-src">${src}</span>` : ''}</div>`;

  const n = weather?.now;
  if (n) items.push(item(`${wxIcon(n.shortForecast, n.isDaytime, 26)} ${n.temperature}°`, esc(n.shortForecast), 'NWS forecast · Megansett'));

  if (buoy) {
    const t = new Date(buoy.time);
    const old = Date.now() - t > 2 * 36e5 ? ' (old reading)' : '';
    items.push(item(`${windArrow(buoy.dir, 20)} ${compass(buoy.dir)} ${Math.round(buoy.spd)} kt${buoy.gst ? `<small> G${Math.round(buoy.gst)}</small>` : ''}`,
      'Wind now · Buzzards Bay tower', `NOAA BUZM3 · ${fmt(t)}${old}`));
  }

  if (waterTemp != null || waterLevel) {
    const d = waterLevel?.diff;
    const surge = d == null ? '' : Math.abs(d) < 0.3 ? 'Level near predicted' :
      `Level <b>${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(1)} ft</b> ${d > 0 ? 'above' : 'below'} predicted`;
    items.push(item(`${waterTemp != null ? `${waterTemp.toFixed(0)}° water` : 'Water'}`, surge || 'Water temperature',
      `NOAA Woods Hole${waterLevel ? ` · ${fmtClock(+waterLevel.t.slice(11, 13) * 60 + +waterLevel.t.slice(14, 16))}` : ''}`));
  }

  if (tides) {
    const nowAbs = minutesOfDay(new Date());
    const next = tides.hilo.find((p) => p.abs > nowAbs);
    if (next) {
      const mins = next.abs - nowAbs;
      const inStr = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
      items.push(item(`${next.type === 'H' ? '▲' : '▼'} ${next.type === 'H' ? 'High' : 'Low'} in ${inStr}`,
        `${fmtClock(next.min)} · ${next.v.toFixed(1)} ft`, 'NOAA · Chappaquoit Pt, W. Falmouth'));
    }
  }
  el.innerHTML = items.join('');
}

const fmtWhen = (iso) => {
  const d = new Date(iso);
  return (dateKey(d) === dateKey(new Date()) ? '' : d.toLocaleDateString('en-US', { weekday: 'short', timeZone: CONFIG.tz }) + ' ') + fmt(d);
};

const paragraphs = (text) => esc(text).split(/\n\s*\n/).map((p) => `<p>${p.replace(/\n/g, ' ')}</p>`).join('');

function renderAlerts({ alerts, marine }, stale) {
  const el = document.getElementById('alerts');
  const parts = [];
  const active = alerts?.filter((a) => !a.ends || Date.parse(a.ends) > Date.now());
  if (active) {
    parts.push(...active.map((a) => `<details class="alert sev-${esc((a.severity || '').toLowerCase())}">
      <summary>⚠️ ${esc(a.event)}${a.ends ? ` <span class="alert-until">until ${fmtWhen(a.ends)}</span>` : ''}</summary>
      ${paragraphs(a.description)}${a.instruction ? `<p><b>What to do:</b> ${esc(a.instruction).replace(/\n/g, ' ')}</p>` : ''}
    </details>`));
  } else if (marine?.headlines.length) {
    parts.push(...marine.headlines.map((h) => `<div class="alert">⚠️ ${esc(h)}</div>`));
  }
  if (stale.length) {
    parts.push(`<div class="alert stale">Couldn't reach NOAA just now. Showing saved data for ${stale.map(([name, t]) => `${name} (from ${fmtWhen(new Date(t).toISOString())})`).join(', ')}.</div>`);
  }
  el.innerHTML = parts.join('');

  const syn = document.getElementById('synopsis');
  if (marine?.synopsis) {
    syn.hidden = false;
    syn.querySelector('p').textContent = marine.synopsis;
  }
}

function weatherPanel(w, windBlock) {
  if (!w) return windBlock || '<p class="muted">Forecast not available yet.</p>';
  return windBlock + ['day', 'night'].filter((k) => w[k]).map((k) => {
    const p = w[k];
    const pop = p.probabilityOfPrecipitation?.value;
    return `<div class="wx-period">
      <div class="wx-head">
        ${wxIcon(p.shortForecast, p.isDaytime, 38)}
        <div>
          <div class="wx-name">${esc(p.name)} <span class="wx-temp ${p.isDaytime ? 'hi' : 'lo'}">${p.temperature}°</span></div>
          <div class="wx-short">${esc(p.shortForecast)}</div>
        </div>
      </div>
      <div class="wx-meta">Wind ${esc(p.windDirection)} ${esc(p.windSpeed)}${pop ? ` · Rain ${pop}%` : ''}</div>
      <p class="wx-detail">${esc(p.detailedForecast)}</p>
    </div>`;
  }).join('');
}

// Hourly wind (line) and gusts (shaded) in knots for one local day.
function windChart(key, wind, scaleMax, isToday) {
  if (!wind) return '';
  const t0 = localMidnight(key).getTime(), t1 = localMidnight(addDays(key, 1)).getTime();
  const pts = wind.filter((w) => w.t >= t0 - 36e5 && w.t <= t1 + 36e5);
  const inDay = pts.filter((w) => w.t >= t0 && w.t < t1);
  if (inDay.length < 6) return '';

  const W = 320, H = 92, padT = 18, padB = 2;
  const x = (t) => ((t - t0) / (t1 - t0)) * W;
  const y = (v) => H - padB - (v / scaleMax) * (H - padT - padB);
  const path = (k) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p[k]).toFixed(1)}`).join('');
  const gustArea = `${path('gst')}L${x(pts.at(-1).t).toFixed(1)},${H}L${x(pts[0].t).toFixed(1)},${H}Z`;
  const grid = [10, 20, 30, 40].filter((v) => v < scaleMax).map((v) =>
    `<line x1="0" x2="${W}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="2" y="${y(v) - 2}" class="grid-label">${v}</text>`).join('');
  const arrows = inDay.filter((p) => minutesOfDay(new Date(p.t)) % 180 === 0 && p.dir != null).map((p) =>
    `<g transform="translate(${x(p.t) + 6} 9) rotate(${p.dir + 180})"><path d="M0,5V-5M-3.5,-1.5L0,-5 3.5,-1.5" class="wind-arrow"/></g>`).join('');
  const nowLine = isToday ? `<line x1="${x(Date.now())}" x2="${x(Date.now())}" y1="0" y2="${H}" class="now-line"/>` : '';

  const daytime = inDay.filter((p) => { const m = minutesOfDay(new Date(p.t)); return m >= 360 && m <= 1200; });
  const src = daytime.length ? daytime : inDay;
  const lo = Math.round(Math.min(...src.map((p) => p.spd))), hi = Math.round(Math.max(...src.map((p) => p.spd)));
  const peak = src.reduce((a, b) => (b.gst > a.gst ? b : a));
  const mainDir = compass(src[Math.floor(src.length / 2)].dir);

  return `<div class="wind">
    <div class="sub-h">Wind &amp; gusts (kt)</div>
    <svg class="wind-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Hourly wind forecast">
      ${grid}<path d="${gustArea}" class="gust-area"/><path d="${path('spd')}" class="wind-line"/>${nowLine}${arrows}
    </svg>
    <div class="wind-sum">Daytime <b>${mainDir} ${lo === hi ? lo : `${lo}–${hi}`} kt</b>, gusts to <b>${Math.round(peak.gst)}</b> around ${shortClock(minutesOfDay(new Date(peak.t)))}</div>
  </div>`;
}

function marinePanel(periods, marine, currentsHtml) {
  const forecast = !marine ? '<p class="muted">Marine forecast unavailable.</p>'
    : !periods.length ? '<p class="muted">Beyond the marine forecast range.</p>'
    : periods.map((p) => {
      const sea = parseSeaState(p.text);
      return `<div class="marine-period">
      <div class="marine-label">${esc(titleCase(p.label))}</div>
      ${sea.seas || sea.waves.length ? seaStateBlock(sea) : ''}
      <p>${highlightMarine(esc(sea.rest))}</p>
    </div>`;
    }).join('');
  return forecast + currentsHtml;
}

// Pull "Seas ..." and "Wave Detail: ..." out of the forecast text into structured values.
function parseSeaState(text) {
  const seasM = text.match(/Seas ([^.]*?)\.\s*/i);
  const waveM = text.match(/Wave Detail:\s*([^.]*?)\.\s*/i);
  const waves = [];
  if (waveM) {
    for (const m of waveM[1].matchAll(/\b([NSEW]{1,3}) (\d+(?:\.\d+)?) (?:ft|foot|feet) at (\d+) seconds?/gi)) {
      waves.push({ dir: m[1].toUpperCase(), ft: +m[2], sec: +m[3] });
    }
  }
  let rest = text;
  if (waveM && waves.length) rest = rest.replace(waveM[0], '');
  if (seasM) rest = rest.replace(seasM[0], '');
  return { seas: seasM ? shortSeas(seasM[1]) : null, waves, rest: rest.trim() };
}

const shortSeas = (s) => s
  .replace(/^(\d+) to (\d+) (ft|feet)$/i, '$1–$2 ft')
  .replace(/^around (\d+) (ft|feet|foot)$/i, '~$1 ft')
  .replace(/^(\d+) (foot|ft|feet) or less$/i, '≤ $1 ft')
  .replace(/^less than (\d+) (foot|ft|feet)$/i, '< $1 ft');

// Short-period waves feel like chop; long-period waves are rolling swell.
const waveKind = (sec) => (sec <= 4 ? 'chop' : sec >= 8 ? 'swell' : '');

function seaStateBlock({ seas, waves }) {
  return `<div class="sea-state">
    ${seas ? `<div class="seas"><span class="seas-num">${esc(seas)}</span><span class="seas-lbl">seas</span></div>` : ''}
    ${waves.length ? `<ul class="waves">${waves.map((w) => `<li title="Waves from the ${esc(w.dir)}, ${w.ft} ft every ${w.sec} seconds">
      ${windArrow(COMPASS.indexOf(w.dir) * 22.5, 13)}
      <span class="w-dir">${esc(w.dir)}</span>
      <span class="w-ht">${w.ft} ft</span>
      <span class="w-per">${w.sec}s</span>
      ${waveKind(w.sec) ? `<span class="w-kind">${waveKind(w.sec)}</span>` : ''}</li>`).join('')}</ul>` : ''}
  </div>`;
}

// Arrow pointing the way the water flows (current directions are "toward", unlike wind).
const flowArrow = (deg, size = 11) => windArrow(deg == null ? null : deg - 180, size);

function currentsBlock(i, currents, isToday) {
  if (!currents) return '';
  const nowMin = isToday ? minutesOfDay(new Date()) : -1;
  return `<div class="currents"><div class="sub-h">Currents</div>${currents.map((s) => {
    const ev = s.events.filter((e) => e.dayIndex === i);
    return `<div class="cur-station"><div class="cur-name">${esc(s.name)}</div>
      <div class="cur-key">${flowArrow(s.floodDir)} ${compass(s.floodDir)} toward ${esc(s.floodTo)} · ${flowArrow(s.ebbDir)} ${compass(s.ebbDir)} toward ${esc(s.ebbTo)}</div>
      <ul class="cur-list">${ev.map((e) => {
        const dir = e.type === 'flood' ? s.floodDir : s.ebbDir;
        return `<li class="${esc(e.type)}${e.min < nowMin ? ' past' : ''}"><span class="cur-t">${shortClock(e.min)}</span>${
          e.type === 'slack' ? 'slack' : `${flowArrow(dir)} ${compass(dir)} ${e.v.toFixed(1)}`}</li>`;
      }).join('')}</ul></div>`;
  }).join('')}<p class="fine">Max current in knots · <a href="#currents-explained">what do these mean?</a></p></div>`;
}

// Footer table: which way flood and ebb run at each current station.
function renderCurrentsKey(currents) {
  const el = document.getElementById('currents-explained');
  if (!el || !currents) return;
  el.hidden = false;
  el.querySelector('tbody').innerHTML = currents.map((s) => `<tr>
    <th>${esc(s.name)}</th>
    <td>${flowArrow(s.floodDir)} ${s.floodDir}° ${compass(s.floodDir)} toward ${esc(s.floodTo)}</td>
    <td>${flowArrow(s.ebbDir)} ${s.ebbDir}° ${compass(s.ebbDir)} toward ${esc(s.ebbTo)}</td></tr>`).join('');
}

function highlightMarine(s) {
  return s
    .replace(/(\b[NSEW]{1,3} winds? [^.]*?(kt|knots))/g, '<strong>$1</strong>')
    .replace(/(Seas [^.]*?(ft|foot|less))/g, '<strong>$1</strong>');
}

const titleCase = (s) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\bThrough\b/g, 'through').replace(/\bAnd\b/g, '&');

function tidesPanel(i, tides, sm, range, isToday) {
  if (!tides) return '<p class="muted">Tide predictions unavailable.</p>';
  const list = tides.hilo.filter((p) => p.dayIndex === i);
  const nowMin = isToday ? minutesOfDay(new Date()) : null;
  const st = tides.stats;
  return `${st ? daySizeSummary(list, st, sm) : ''}
    ${tideChart(i, tides, sm.sun, range, nowMin)}
    <ul class="tide-list">${list.map((p) => {
      const size = st && tideSize(p, st);
      const kind = p.type === 'H' ? 'high' : 'low';
      return `<li class="${p.type === 'H' ? 'hi' : 'lo'}${isToday && p.min < nowMin ? ' past' : ''}">
      <span class="tide-type">${p.type === 'H' ? 'High' : 'Low'}</span>
      <span class="tide-time">${fmtClock(p.min)}</span>
      <span class="tide-ht">${p.v.toFixed(1)} ft</span>
      ${size ? `<span class="tide-size" title="${p.type === 'H' ? 'Higher' : 'Lower'} than ${Math.round(size.r * 100)}% of ${kind} tides in the next 12 months">
        <span class="size-bar"><i style="width:${Math.max(4, Math.round(size.r * 100))}%"></i></span>${size.label}</span>` : ''}</li>`;
    }).join('')}</ul>
    ${st ? `<p class="tide-context">
      Biggest in the next 12 months: <b>${st.maxHigh.v.toFixed(1)} ft</b> high (${shortDate(st.maxHigh.key)}),
      <b>${st.minLow.v.toFixed(1)} ft</b> low (${shortDate(st.minLow.key)}).
      Average high ${st.avgHigh.toFixed(1)} ft, low ${st.avgLow.toFixed(1)} ft.
      <span class="fine">Predicted tides; storms and wind can push water higher or lower.</span></p>` : ''}`;
}

const shortDate = (key) => new Date(key + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

// Spring vs. neap: how the day's high-to-low range compares with the next 12 months.
function daySizeSummary(list, st, sm) {
  if (list.length < 2) return '';
  const vals = list.map((p) => p.v);
  const range = Math.max(...vals) - Math.min(...vals);
  const r = rankAbove(st.ranges, range);
  const [label, cls] = r >= 0.75 ? ['Spring tides', 'spring'] : r <= 0.25 ? ['Neap tides', 'neap'] : ['Moderate tides', 'moderate'];
  const phase = sm.illum.phase;
  const dist = (t) => Math.min(Math.abs(phase - t), 1 - Math.abs(phase - t));
  const moon = dist(0.5) < 0.1 ? ' · near full moon' : dist(0) < 0.1 ? ' · near new moon'
    : dist(0.25) < 0.1 || dist(0.75) < 0.1 ? ' · near half moon' : '';
  return `<div class="tide-day ${cls}"><b>${label}</b> · ${range.toFixed(1)} ft range
    <div class="muted">Bigger swing than ${Math.round(r * 100)}% of days${moon}</div></div>`;
}

function sunMoonPanel(sm) {
  const delta = Math.round(sm.deltaLength / 1000);
  const sign = delta < 0 ? '−' : '+';
  const deltaStr = `${sign}${Math.floor(Math.abs(delta) / 60)}m ${String(Math.abs(delta) % 60).padStart(2, '0')}s`;
  return `<div class="sun">
      <div class="sm-row"><span>🌅 Sunrise</span><strong>${fmt(sm.sun.sunrise)}</strong></div>
      <div class="sm-row"><span>🌇 Sunset</span><strong>${fmt(sm.sun.sunset)}</strong></div>
      <div class="sm-row muted"><span>First / last light</span><span>${fmt(sm.sun.dawn)} / ${fmt(sm.sun.dusk)}</span></div>
      <div class="sm-row muted"><span>Daylight</span><span>${fmtDuration(sm.dayLength)} (${deltaStr})</span></div>
    </div>
    <div class="moon-block">
      ${moonSvg(sm.illum.fraction, sm.illum.phase)}
      <div>
        <div class="moon-name">${esc(sm.phaseName)}${sm.event ? ' <span class="badge">today</span>' : ''}</div>
        <div class="muted">${Math.round(sm.illum.fraction * 100)}% illuminated</div>
        <div class="muted">Rise ${fmt(sm.moon.rise)} · Set ${fmt(sm.moon.set)}</div>
      </div>
    </div>`;
}

function renderDays(state) {
  const { days, weather, marine, tides, currents } = state;
  const range = tides ? {
    min: Math.min(...tides.curve.map((p) => p.v)) - 0.3,
    max: Math.max(...tides.curve.map((p) => p.v)) + 0.3,
  } : null;
  const wind = weather?.wind;
  const windMax = wind ? Math.max(25, Math.ceil(Math.max(...wind.map((w) => w.gst)) / 5) * 5) : 25;

  const nav = document.getElementById('day-nav');
  nav.innerHTML = `<div class="wrap">${days.map((key, i) => {
    const l = keyLabel(key, i);
    const w = weather?.byDay[key];
    const p = w?.day || w?.night;
    return `<a href="#d-${key}"><span>${i === 0 ? 'Today' : l.short}</span><span class="nav-icon">${p ? wxIcon(p.shortForecast, p.isDaytime, 26) : ''}</span><span class="nav-temp">${w?.day ? w.day.temperature + '°' : ''}${w?.night ? `<small>${w.night.temperature}°</small>` : ''}</span></a>`;
  }).join('')}</div>`;

  document.getElementById('days').innerHTML = days.map((key, i) => {
    const l = keyLabel(key, i);
    const sm = sunMoon(key);
    const w = weather?.byDay[key];
    const mp = marineForDay(marine, key);
    const windSummary = mp[0]?.text.match(/^[^.]*winds?[^.]*\./i)?.[0];
    const seasSummary = mp[0] && parseSeaState(mp[0].text).seas;
    const isToday = i === 0;
    return `<section class="day" id="d-${key}">
      <header class="day-head">
        <div>
          <h2>${esc(l.title)}</h2>
          <div class="day-date">${esc(l.date)}</div>
        </div>
        <div class="day-chips">
          ${w?.day || w?.night ? `<span class="chip">${wxIcon((w.day || w.night).shortForecast, !!w.day, 18)} ${w.day ? `<b>${w.day.temperature}°</b>` : ''}${w.day && w.night ? ' / ' : ''}${w.night ? `${w.night.temperature}°` : ''}</span>` : ''}
          ${windSummary ? `<span class="chip">⛵ ${esc(windSummary.replace(/\.$/, ''))}${seasSummary ? ` · seas ${esc(seasSummary)}` : ''}</span>` : ''}
          <span class="chip">☀️ ${fmt(sm.sun.sunrise)} – ${fmt(sm.sun.sunset)}</span>
          ${sm.event ? `<span class="chip moon-chip">${moonSvg(sm.illum.fraction, sm.illum.phase, 16)} ${esc(sm.event)}</span>` : ''}
        </div>
      </header>
      <div class="panels">
        <div class="panel"><h3>Tides</h3>${tidesPanel(i, tides, sm, range, isToday)}</div>
        <div class="panel"><h3>Marine · Buzzards Bay</h3>${marinePanel(mp, marine, currentsBlock(i, currents, isToday))}</div>
        <div class="panel"><h3>Weather</h3>${weatherPanel(w, windChart(key, wind, windMax, isToday))}</div>
        <div class="panel"><h3>Sun &amp; Moon</h3>${sunMoonPanel(sm)}</div>
      </div>
    </section>`;
  }).join('');
}

async function refresh() {
  const todayKey = dateKey(new Date());
  const days = Array.from({ length: CONFIG.days }, (_, i) => addDays(todayKey, i));

  const sources = {
    weather: ['Weather', 48, loadWeather],
    marine: ['Marine forecast', 48, loadMarine],
    tides: ['Tides', 24 * 7, () => loadTides(todayKey)],
    currents: ['Currents', 24 * 7, () => loadCurrents(todayKey)],
    waterTemp: ['Water temperature', 6, loadWaterTemp],
    waterLevel: ['Water level', 3, () => loadWaterLevel(todayKey)],
    buoy: ['Buzzards Bay tower', 3, loadBuoy],
    alerts: ['Alerts', 6, loadAlerts],
  };
  const names = Object.keys(sources);
  const results = Object.fromEntries(await Promise.all(names.map(async (k) => [k, await cached(k, sources[k][1], sources[k][2])])));

  // Index tide and current events by day relative to today (cached data may start on an earlier day).
  for (const p of [...(results.tides.value?.curve || []), ...(results.tides.value?.hilo || [])]) {
    p.dayIndex = dayDiff(todayKey, p.key);
    p.abs = p.dayIndex * 1440 + p.min;
  }
  for (const s of results.currents.value || []) for (const e of s.events) e.dayIndex = dayDiff(todayKey, e.key);

  const state = { days, ...Object.fromEntries(names.map((k) => [k, results[k].value])) };
  const stale = names.filter((k) => results[k].staleSince).map((k) => [sources[k][0], results[k].staleSince]);
  const missing = names.filter((k) => !results[k].value && results[k].error).map((k) => sources[k][0]);

  renderNow(state);
  renderAlerts(state, stale);
  renderDays(state);
  renderSourceMap(state.weather?.cell);
  renderCurrentsKey(state.currents);

  document.getElementById('updated').textContent =
    `Updated ${fmt(new Date())}` + (state.marine ? ` · Marine forecast issued ${state.marine.issued}` : '') +
    (missing.length ? ` · Unavailable: ${missing.join(', ')}` : '');
}

refresh();
setInterval(refresh, CONFIG.refreshMinutes * 60000);
