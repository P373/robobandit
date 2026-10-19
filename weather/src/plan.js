'use strict';

// The one-screen plan: can I do my thing today, and when? A verdict for each activity, one timeline for the
// day (sky, rain, wind and tide on the same clock), and the rest of the week in a row. Everything else
// (the 7-day cards, the map, the credits) is one tap away. app.js loads the data and calls renderPlan().
// Loaded before app.js; it only uses app.js's helpers once renderPlan() is called.

// ---------- activities: what each needs, with limits you can change (saved on this iPad) ----------

const LINE = (d) => `<svg class="act-ic" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const ACTIVITIES = {
  boating: { name: 'Boating', icon: LINE('<path d="M22 18H2a4 4 0 0 0 4 4h12a4 4 0 0 0 4-4Z"/><path d="M21 14 10 2 3 14h18Z"/><path d="M10 2v16"/>'),
    limits: { wind: 15, gust: 22, seas: 3 } },
  swimming: { name: 'Swimming', icon: LINE('<circle cx="17" cy="6" r="2"/><path d="M4 13l4-3 4 2 3-3"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>'),
    limits: { water: 66, air: 70 } },
  running: { name: 'Running', icon: LINE('<path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"/><path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"/><path d="M16 17h4"/><path d="M4 13h4"/>'),
    limits: { hot: 82, cold: 30 } },
  rollerblading: { name: 'Rollerblading', icon: LINE('<path d="M5 3h5v7l6 2a4 4 0 0 1 4 4v1H5Z"/><circle cx="7" cy="20.5" r="1.5"/><circle cx="12.5" cy="20.5" r="1.5"/><circle cx="18" cy="20.5" r="1.5"/>'),
    limits: { wind: 15, dry: 2 } },
  paddling: { name: 'Kayak & SUP', icon: LINE('<path d="M2 16c4 2.5 16 2.5 20 0"/><path d="M6 21 18 5"/><path d="M16.5 3.5l3 3"/><path d="M4.5 22.5l-1-1"/>'),
    limits: { wind: 10, water: 60 } },
  biking: { name: 'Biking', icon: LINE('<circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>'),
    limits: { wind: 15, hot: 88 } },
};
const LIMIT_LABELS = {
  wind: ['Wind up to', 'kt'], gust: ['Gusts up to', 'kt'], seas: ['Seas up to', 'ft'], water: ['Water at least', '°'],
  air: ['Air at least', '°'], hot: ['Too hot above', '°'], cold: ['Too cold below', '°'], dry: ['Dry for', 'hours after rain'],
};
const DEFAULT_SHOWN = ['boating', 'swimming', 'running', 'rollerblading'];

const settings = (() => {
  let s = null;
  try { s = JSON.parse(localStorage.getItem('cv:plan')); } catch (e) { /* first visit */ }
  s = s && typeof s === 'object' ? s : {};
  const shown = (s.shown || DEFAULT_SHOWN).filter((k) => ACTIVITIES[k]).slice(0, 4);
  const limits = {};
  for (const k of Object.keys(ACTIVITIES)) limits[k] = Object.assign({}, ACTIVITIES[k].limits, (s.limits || {})[k]);
  return { shown: shown.length ? shown : DEFAULT_SHOWN.slice(), limits };
})();
const saveSettings = () => { try { localStorage.setItem('cv:plan', JSON.stringify(settings)); } catch (e) { /* storage off */ } };

// ---------- one hour at a time: Go (0), Caution (1) or Not today (2), and why ----------

const kt = (h) => `${compass(h.dir)} ${Math.round(h.spd)}${h.gst > h.spd + 3 ? ` G${Math.round(h.gst)}` : ''} kt`;
const worst = (checks) => checks.filter(Boolean).reduce((a, b) => (b[0] > a[0] ? b : a), [0, '']);

const RULES = {
  boating: (h, c, L) => worst([
    c.boatAlert && [2, c.boatAlert],
    h.thunder && [2, 'Thunderstorms'],
    h.spd != null && (h.spd >= L.wind + 5 || h.gst >= L.gust + 5) && [2, `Wind ${kt(h)}`],
    h.spd != null && (h.spd >= L.wind || h.gst >= L.gust) && [1, `Wind ${kt(h)}`],
    c.seas != null && c.seas >= L.seas + 2 && [2, `Seas ${c.seasTxt}`],
    c.seas != null && c.seas >= L.seas && [1, `Seas ${c.seasTxt}`],
    h.pop >= 60 && [1, `Rain likely (${h.pop}%)`],
  ]),
  swimming: (h, c, L) => worst([
    h.thunder && [2, 'Thunderstorms'],
    c.water != null && c.water < L.water - 6 && [2, `Water ${Math.round(c.water)}°`],
    c.water != null && c.water < L.water && [1, `Water ${Math.round(c.water)}°`],
    h.temp != null && h.temp < L.air - 8 && [2, `Air ${h.temp}°`],
    h.temp != null && h.temp < L.air && [1, `Air ${h.temp}°`],
    h.pop >= 50 && [1, `Rain likely (${h.pop}%)`],
    h.spd >= 18 && [1, `Breezy, ${kt(h)}`],
  ]),
  running: (h, c, L) => worst([
    h.thunder && [2, 'Thunderstorms'],
    h.temp != null && h.temp >= L.hot + 8 && [2, `Hot, ${h.temp}°`],
    h.temp != null && h.temp >= L.hot && [1, `Warm, ${h.temp}°`],
    h.temp != null && h.temp <= L.cold - 12 && [2, `Cold, ${h.temp}°`],
    h.temp != null && h.temp <= L.cold && [1, `Cold, ${h.temp}°`],
    h.pop >= 70 && [2, `Rain (${h.pop}%)`],
    h.pop >= 40 && [1, `Chance of rain (${h.pop}%)`],
    h.spd >= 25 && [1, `Windy, ${kt(h)}`],
  ]),
  rollerblading: (h, c, L) => worst([
    h.thunder && [2, 'Thunderstorms'],
    h.wet && [2, 'Wet roads'],
    h.temp != null && h.temp <= 35 && [2, `Icy risk, ${h.temp}°`],
    h.pop >= 30 && [1, `Chance of rain (${h.pop}%)`],
    h.spd != null && h.spd >= L.wind && [1, `Wind ${kt(h)}`],
  ]),
  paddling: (h, c, L) => worst([
    c.boatAlert && [2, c.boatAlert],
    h.thunder && [2, 'Thunderstorms'],
    h.spd != null && (h.spd >= L.wind + 5 || h.gst >= L.wind + 10) && [2, `Wind ${kt(h)}`],
    h.spd != null && (h.spd >= L.wind || h.gst >= L.wind + 5) && [1, `Wind ${kt(h)}`],
    c.seas != null && c.seas >= 3 && [2, `Seas ${c.seasTxt}`],
    c.seas != null && c.seas >= 2 && [1, `Seas ${c.seasTxt}`],
    c.water != null && c.water < L.water && [1, `Cold water, ${Math.round(c.water)}°`],
  ]),
  biking: (h, c, L) => worst([
    h.thunder && [2, 'Thunderstorms'],
    h.pop >= 60 && [2, `Rain (${h.pop}%)`],
    h.pop >= 30 && [1, `Chance of rain (${h.pop}%)`],
    h.spd != null && h.spd >= L.wind + 8 && [2, `Windy, ${kt(h)}`],
    h.spd != null && h.spd >= L.wind && [1, `Wind ${kt(h)}`],
    h.temp != null && h.temp >= L.hot && [1, `Hot, ${h.temp}°`],
    h.temp != null && h.temp <= 25 && [1, `Cold, ${h.temp}°`],
  ]),
};

// What made a good window good, in a few words
const GOOD = {
  boating: (H, c) => `${windRange(H)}${c.seasTxt ? `, seas ${c.seasTxt}` : ''}`,
  swimming: (H, c) => [c.water != null && `Water ${Math.round(c.water)}°`, tempRange(H, 'air ')].filter(Boolean).join(', '),
  running: (H) => `${tempRange(H)}${H.every((h) => h.pop < 30) ? ' and dry' : ''}`,
  rollerblading: (H) => `Dry roads, ${windRange(H, 'wind ')}`,
  paddling: (H, c) => [windRange(H), c.water != null && `water ${Math.round(c.water)}°`].filter(Boolean).join(', '),
  biking: (H) => `${tempRange(H)}, ${windRange(H, 'wind ')}`,
};
function windRange(H, pre = '') {
  const w = H.filter((h) => h.spd != null);
  if (!w.length) return 'wind n/a';
  const lo = Math.round(Math.min(...w.map((h) => h.spd))), hi = Math.round(Math.max(...w.map((h) => h.spd)));
  return `${pre}${compass(w[Math.floor(w.length / 2)].dir)} ${lo === hi ? lo : `${lo}–${hi}`} kt`;
}
function tempRange(H, pre = '') {
  const t = H.filter((h) => h.temp != null).map((h) => h.temp);
  if (!t.length) return '';
  const lo = Math.min(...t), hi = Math.max(...t);
  return `${pre}${lo === hi ? lo : `${lo}–${hi}`}°`;
}

// ---------- the hours of a day, and the day's conditions ----------

function dayHours(state, key) {
  const fc = new Map((state.weather?.hours || []).map((h) => [Math.round(h.t / 36e5), h]));
  const wind = new Map((state.weather?.wind || []).map((w) => [Math.round(w.t / 36e5), w]));
  const rain = new Map((state.weather?.rainChance || []).map((r) => [Math.round(r.t / 36e5), r.pop]));
  const t0 = localMidnight(key).getTime(), t1 = localMidnight(addDays(key, 1)).getTime();
  const hours = [];
  for (let t = t0; t < t1; t += 36e5) {
    const f = fc.get(Math.round(t / 36e5)), w = wind.get(Math.round(t / 36e5));
    hours.push({ t, min: minutesOfDay(new Date(t)), temp: f ? f.temp : null, pop: f ? f.pop : rain.get(Math.round(t / 36e5)) || 0, short: f ? f.short : '', isDay: f ? f.isDay : true,
      thunder: !!(f && /thunder/i.test(f.short)), spd: w ? w.spd : null, gst: w ? w.gst : null, dir: w ? w.dir : null, known: !!(f || w) });
  }
  // wet roads: rain likely this hour or in the hours just before it
  const dry = settings.limits.rollerblading.dry;
  hours.forEach((h, i) => { h.wet = hours.slice(Math.max(0, i - dry), i + 1).some((x) => x.pop >= 50); });
  return hours;
}

const BOAT_ALERT = /small craft|gale|storm warning|hurricane|tropical/i;
function dayConditions(state, key) {
  const mp = marineForDay(state.marine, key);
  let seas = null, seasTxt = '';
  for (const p of mp) {
    const s = parseSeaState(p.text).seas;
    const n = s && Math.max(...(s.match(/\d+(\.\d+)?/g) || ['0']).map(Number));
    if (s && (seas == null || n > seas)) { seas = n; seasTxt = s; }
  }
  const t0 = localMidnight(key).getTime();
  const alert = (state.alerts || []).filter((a) => BOAT_ALERT.test(a.event) && (!a.ends || Date.parse(a.ends) > t0))
    .sort((a, b) => alertRank(a.event) - alertRank(b.event))[0];
  const headline = key === dateKey(new Date()) && (state.marine?.headlines || []).find((h) => BOAT_ALERT.test(h));
  return { seas, seasTxt, water: state.waterTemp, boatAlert: alert ? alert.event : headline ? titleCase(headline.replace(/\s+IN EFFECT.*$/i, '')) : '' };
}

// ---------- a verdict: the best stretch of the day for one activity ----------

function verdict(act, hours, cond) {
  const L = settings.limits[act];
  const rated = hours.map((h) => { const r = RULES[act](h, cond, L); return { h, lv: r[0], why: r[1] }; });
  if (!rated.length) return null;
  // the longest run of hours at the best level reached
  const best = Math.min(...rated.map((r) => r.lv));
  let run = [], top = [];
  for (const r of rated) {
    if (r.lv === best) { run.push(r); if (run.length > top.length) top = run.slice(); } else run = [];
  }
  const lv = best === 0 && top.length < 2 && rated.length > 2 ? 1 : best;   // one good hour isn't a good day
  const worstHour = rated.filter((r) => r.lv === Math.max(...rated.map((x) => x.lv)))[0];
  const why = lv === 0 ? GOOD[act](top.map((r) => r.h), cond) : best > 0 ? (top[0] || worstHour).why : worstHour.why;
  return { lv, why, from: top[0].h.min, to: top[top.length - 1].h.min + 60, all: top.length === rated.length, n: top.length };
}

// the hours to judge: daylight, and from now on if it's today
function judgedHours(hours, key, isToday) {
  const sun = sunMoon(key).sun;
  const nowT = Date.now();
  return hours.filter((h) => h.known && h.t + 18e5 >= sun.sunrise && h.t + 18e5 <= sun.sunset && (!isToday || h.t + 36e5 > nowT));
}

// ---------- time words ----------

const clock = (m) => { m = ((m % 1440) + 1440) % 1440; const h = Math.floor(m / 60), mm = m % 60; return { n: `${h % 12 || 12}${mm ? `:${String(mm).padStart(2, '0')}` : ''}`, ap: h < 12 ? 'AM' : 'PM' }; };
function fmtRange(a, b) {
  const x = clock(a), y = clock(b);
  return x.ap === y.ap ? `${x.n}–${y.n} ${y.ap}` : `${x.n} ${x.ap}–${y.n} ${y.ap}`;
}

// ---------- render ----------

let planState = null, planInfo = null, selected = null, planKey = null;
const LEVEL = ['Go', 'Caution', 'Not today'];

function renderPlan(state, info) {
  planState = state; planInfo = info;
  const todayKey = info.todayKey;
  // after sunset, plan tomorrow
  const todayLeft = judgedHours(dayHours(state, todayKey), todayKey, true);
  planKey = todayLeft.length ? todayKey : addDays(todayKey, 1);
  const isToday = planKey === todayKey;
  const hours = dayHours(state, planKey), cond = dayConditions(state, planKey);
  const judged = isToday ? todayLeft : judgedHours(hours, planKey, false);
  if (!settings.shown.includes(selected)) selected = settings.shown[0];

  document.getElementById('plan-day').textContent = isToday ? 'Today' : 'Tomorrow';
  document.getElementById('plan-date').textContent = keyLabel(planKey, isToday ? 0 : 1).date;

  // the activity tiles
  const verdicts = {};
  const started = isToday && judged.length > 0 && judged[0].min > sunMoonMin(planKey, 'sunrise') + 30;   // the day is already under way
  document.getElementById('acts').innerHTML = settings.shown.map((act) => {
    const v = verdicts[act] = verdict(act, judged, cond);
    const A = ACTIVITIES[act];
    if (!v) return `<button type="button" class="act" data-act="${act}">${A.icon}<span class="act-name">${A.name}</span><span class="act-verdict">—</span><span class="act-why">Forecast not in yet</span></button>`;
    const when = v.lv === 2 ? '' : v.all ? (started ? `Now until ${clock(v.to).n} ${clock(v.to).ap}` : 'All day') : `Best ${fmtRange(v.from, v.to)}`;
    return `<button type="button" class="act lv-${v.lv}${act === selected ? ' on' : ''}" data-act="${act}" aria-pressed="${act === selected}">
      <span class="act-top">${A.icon}<span class="act-name">${A.name}</span></span>
      <span class="act-verdict">${LEVEL[v.lv]}</span>
      <span class="act-why">${esc(v.why)}</span>
      <span class="act-when">${esc(when)}</span>
    </button>`;
  }).join('');

  drawTimeline(state, planKey, hours, verdicts[selected], isToday);
  renderWeek(state, planKey);

  const stale = info.stale.length ? ` · showing saved ${info.stale.map((s) => s[0].toLowerCase()).join(', ')}` : '';
  document.getElementById('plan-updated').textContent = `Updated ${fmt(new Date())}${stale}${info.missing.length ? ` · no ${info.missing.join(', ').toLowerCase()}` : ''}`;
  nightMode();
  fitPlan();
}
const sunMoonMin = (key, which) => minutesOfDay(sunMoon(key).sun[which]);

// One clock for the day: sky and temperature, rain, wind and tide lined up, night shaded, now marked
function drawTimeline(state, key, hours, v, isToday) {
  const el = document.getElementById('timeline');
  const W = Math.max(300, el.clientWidth), H = Math.max(200, el.clientHeight);
  const sun = sunMoon(key).sun, sunrise = minutesOfDay(sun.sunrise), sunset = minutesOfDay(sun.sunset);
  const m0 = Math.max(0, Math.floor(sunrise / 60) * 60 - 60), m1 = Math.min(1440, Math.ceil(sunset / 60) * 60 + 120);
  const gut = 58, padR = 10, x = (m) => gut + ((m - m0) / (m1 - m0)) * (W - gut - padR);
  const rows = { sky: [0, 54], rain: [60, 30] };
  const rest = H - 96 - 22, windH = Math.round(rest * 0.5), tideH = rest - windH;
  rows.wind = [96, windH - 8]; rows.tide = [96 + windH, tideH - 6];
  const axisY = H - 18;
  const inWin = hours.filter((h) => h.min >= m0 && h.min < m1);
  const out = [];

  // night, and the selected activity's best window
  out.push(`<rect x="${x(m0)}" y="0" width="${x(sunrise) - x(m0)}" height="${axisY}" class="tl-night"/>`,
    `<rect x="${x(sunset)}" y="0" width="${x(m1) - x(sunset)}" height="${axisY}" class="tl-night"/>`);
  if (v && v.n) out.push(`<rect x="${x(v.from)}" y="0" width="${x(v.to) - x(v.from)}" height="${axisY}" class="tl-win lv-${v.lv}" rx="6"/>`);
  // hour grid and labels
  const step = W < 560 ? 180 : 120;
  for (let m = m0; m <= m1; m += 60) {
    out.push(`<line x1="${x(m)}" x2="${x(m)}" y1="${rows.rain[0]}" y2="${axisY}" class="tl-grid${m % step ? '' : ' major'}"/>`);
    if (m % step === 0 && m < m1) out.push(`<text x="${x(m)}" y="${H - 4}" class="tl-hour">${clock(m).n}${clock(m).ap === 'AM' ? 'a' : 'p'}</text>`);
  }
  // row labels
  out.push(`<text x="4" y="${rows.rain[0] + 17}" class="tl-label">Rain</text>`,
    `<text x="4" y="${rows.wind[0] + 14}" class="tl-label">Wind</text><text x="4" y="${rows.wind[0] + 28}" class="tl-unit">knots</text>`,
    `<text x="4" y="${rows.tide[0] + 14}" class="tl-label">Tide</text><text x="4" y="${rows.tide[0] + 28}" class="tl-unit">feet</text>`);

  // sky and temperature, every two (or three) hours
  for (const h of inWin) {
    if ((h.min - m0) % step || h.temp == null) continue;
    const cx = x(h.min + 30);
    out.push(wxIcon(h.short, h.min >= sunrise && h.min < sunset, 28).replace('<svg ', `<svg x="${cx - 14}" y="2" `),
      `<text x="${cx}" y="${rows.sky[0] + 46}" class="tl-temp">${h.temp}°</text>`);
  }
  // rain chance bars
  const rTop = rows.rain[0], rH = rows.rain[1];
  for (const h of inWin) {
    if (!h.pop) continue;
    const bh = Math.max(2, (h.pop / 100) * rH);
    out.push(`<rect x="${x(h.min) + 1}" y="${rTop + rH - bh}" width="${Math.max(1, x(h.min + 60) - x(h.min) - 2)}" height="${bh}" class="tl-rain" rx="2"/>`);
  }
  const wet = Math.max(0, ...inWin.map((h) => h.pop));
  out.push(`<text x="4" y="${rTop + 31}" class="tl-unit">${wet >= 20 ? `up to ${wet}%` : 'dry'}</text>`);

  // wind and gusts
  const wpts = inWin.filter((h) => h.spd != null);
  if (wpts.length > 1) {
    const wTop = rows.wind[0] + 4, wH = rows.wind[1] - 4, max = Math.max(20, Math.ceil(Math.max(...wpts.map((h) => h.gst)) / 5) * 5);
    const y = (k) => wTop + wH - (k / max) * wH;
    const line = (k) => wpts.map((h, i) => `${i ? 'L' : 'M'}${x(h.min + 30).toFixed(1)},${y(h[k]).toFixed(1)}`).join('');
    out.push(`<path d="${line('gst')}L${x(wpts[wpts.length - 1].min + 30).toFixed(1)},${wTop + wH}L${x(wpts[0].min + 30).toFixed(1)},${wTop + wH}Z" class="tl-gust"/>`,
      `<path d="${line('spd')}" class="tl-wind"/>`);
    for (const k of [10, 20, 30].filter((k) => k < max)) out.push(`<text x="${gut - 4}" y="${y(k) + 4}" class="tl-tick">${k}</text>`);
    for (const h of wpts) if ((h.min - m0) % step === 0 && h.dir != null) out.push(`<g transform="translate(${x(h.min + 30)} ${y(h.spd) - 12}) rotate(${h.dir + 180})"><path d="M0,5V-5M-3.5,-1.5L0,-5 3.5,-1.5" class="tl-arrow"/></g>`);
    const peak = wpts.reduce((a, b) => (b.gst > a.gst ? b : a));
    out.push(`<text x="${x(peak.min + 30)}" y="${Math.max(wTop + 10, y(peak.gst) - 4)}" class="tl-val">G${Math.round(peak.gst)}</text>`);
  }

  // tide
  const T = state.tides;
  if (T) {
    const di = dayDiff(dateKey(new Date()), key);
    const pts = T.curve.filter((p) => p.dayIndex === di && p.min >= m0 - 30 && p.min <= m1 + 30);
    if (pts.length > 1) {
      const vals = T.curve.map((p) => p.v), lo = Math.min(...vals) - 0.3, hi = Math.max(...vals) + 0.3;
      const tTop = rows.tide[0] + 14, tH = rows.tide[1] - 30;
      const y = (v) => tTop + tH - ((v - lo) / (hi - lo)) * tH;
      const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.min).toFixed(1)},${y(p.v).toFixed(1)}`).join('');
      out.push(`<path d="${path}L${x(pts[pts.length - 1].min).toFixed(1)},${tTop + tH + 14}L${x(pts[0].min).toFixed(1)},${tTop + tH + 14}Z" class="tl-tide-area"/>`, `<path d="${path}" class="tl-tide"/>`);
      for (const p of T.hilo.filter((q) => q.dayIndex === di && q.min >= m0 && q.min <= m1)) {
        const up = p.type === 'H', ty = up ? y(p.v) - 7 : y(p.v) + 15;
        out.push(`<circle cx="${x(p.min)}" cy="${y(p.v)}" r="3.5" class="tl-dot ${up ? 'hi' : 'lo'}"/>`,
          `<text x="${x(p.min)}" y="${ty}" class="tl-val">${up ? 'High' : 'Low'} ${clock(p.min).n}${clock(p.min).ap === 'AM' ? 'a' : 'p'}</text>`);
      }
    }
  }

  // now
  if (isToday) {
    const nm = minutesOfDay(new Date());
    if (nm >= m0 && nm <= m1) out.push(`<line x1="${x(nm)}" x2="${x(nm)}" y1="0" y2="${axisY}" class="tl-now"/><text x="${x(nm)}" y="${axisY - 3}" class="tl-now-t">now</text>`);
  }
  el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${out.join('')}</svg>`;
}

// The rest of the week: sky, high and low, wind, and a dot for the selected activity
function renderWeek(state, fromKey) {
  const out = [];
  for (let i = 1; i <= 6; i++) {
    const key = addDays(fromKey, i), w = state.weather?.byDay[key], p = w && (w.day || w.night);
    const hours = dayHours(state, key), judged = judgedHours(hours, key, false);
    const v = verdict(selected, judged, dayConditions(state, key));
    const label = keyLabel(key, 2).short;
    const when = v && v.lv < 2 && !v.all ? ` · best ${fmtRange(v.from, v.to)}` : '';
    out.push(`<button type="button" class="wk" data-key="${key}" title="${esc(ACTIVITIES[selected].name)}: ${v ? LEVEL[v.lv] + ' · ' + esc(v.why) + when : 'no forecast yet'}">
      <span class="wk-day">${label}</span>
      <span class="wk-ic">${p ? wxIcon(p.shortForecast, !!w.day, 34) : ''}</span>
      <span class="wk-t">${w && w.day ? `<b>${w.day.temperature}°</b>` : ''}${w && w.night ? ` <small>${w.night.temperature}°</small>` : ''}</span>
      <span class="wk-w">${judged.some((h) => h.spd != null) ? esc(windRange(judged)) : ''}</span>
      <span class="wk-v">${v ? `<i class="dot lv-${v.lv}"></i>${LEVEL[v.lv]}` : ''}</span>
    </button>`);
  }
  document.getElementById('week').innerHTML = out.join('');
}

// ---------- fit one screen, night look ----------

function fitPlan() {
  const plan = document.getElementById('plan');
  if (plan.hidden) return;
  const top = plan.getBoundingClientRect().top + (window.pageYOffset || 0);
  // an iPad shows it all on one screen (the real window height: old iOS gets vh wrong); a phone scrolls
  plan.style.height = window.innerWidth >= 760 ? Math.max(560, window.innerHeight - top) + 'px' : '';
  const tl = document.getElementById('timeline');
  if (planState && Math.abs((tl._w || 0) - tl.clientWidth) + Math.abs((tl._h || 0) - tl.clientHeight) > 2) {
    tl._w = tl.clientWidth; tl._h = tl.clientHeight;
    const isToday = planKey === planInfo.todayKey;
    drawTimeline(planState, planKey, dayHours(planState, planKey), verdict(selected, isToday ? judgedHours(dayHours(planState, planKey), planKey, true) : judgedHours(dayHours(planState, planKey), planKey, false), dayConditions(planState, planKey)), isToday);
  }
}
let fitTimer = 0;
window.addEventListener('resize', () => { clearTimeout(fitTimer); fitTimer = setTimeout(fitPlan, 120); });
window.addEventListener('orientationchange', () => setTimeout(fitPlan, 300));

function nightMode() {
  const sun = sunMoon(dateKey(new Date())).sun, now = Date.now();
  document.documentElement.classList.toggle('dark', now < sun.sunrise.getTime() - 20 * 6e4 || now > sun.sunset.getTime() + 20 * 6e4);
}

// keep it current on a stand: move "now", roll the verdicts on, and start a new day after midnight
setInterval(() => {
  if (!planState) return;
  if (dateKey(new Date()) !== planInfo.todayKey) refresh();
  else renderPlan(planState, planInfo);
}, 5 * 60000);

// ---------- taps: pick an activity, open a day, details, settings ----------

document.getElementById('acts').addEventListener('click', (e) => {
  const b = e.target.closest('.act');
  if (!b || !planState) return;
  selected = b.getAttribute('data-act');
  renderPlan(planState, planInfo);
});

function showDetails(key) {
  document.getElementById('plan').hidden = true;
  document.getElementById('details').hidden = false;
  renderSourceMap(sourceCell);
  if (sourceMap) setTimeout(() => sourceMap.invalidateSize(), 50);
  const day = key && document.getElementById(`d-${key}`);
  if (day) day.scrollIntoView(); else window.scrollTo(0, 0);
}
function showPlan() {
  document.getElementById('details').hidden = true;
  document.getElementById('plan').hidden = false;
  window.scrollTo(0, 0);
  fitPlan();
}
document.getElementById('week').addEventListener('click', (e) => { const b = e.target.closest('.wk'); if (b) showDetails(b.getAttribute('data-key')); });
document.getElementById('open-details').addEventListener('click', () => showDetails(planKey));
document.getElementById('open-about').addEventListener('click', () => { showDetails(null); document.getElementById('map').scrollIntoView(); });
document.getElementById('close-details').addEventListener('click', showPlan);

function renderSettings() {
  const full = settings.shown.length >= 4;
  document.getElementById('settings-body').innerHTML = Object.keys(ACTIVITIES).map((act) => {
    const A = ACTIVITIES[act], on = settings.shown.includes(act), L = settings.limits[act];
    return `<div class="set-row${on ? ' on' : ''}">
      <label class="set-show">${A.icon}<input type="checkbox" data-show="${act}"${on ? ' checked' : ''}${!on && full ? ' disabled' : ''}> <b>${A.name}</b></label>
      <div class="set-limits">${Object.keys(L).map((k) => `<label>${LIMIT_LABELS[k][0]} <input type="number" inputmode="numeric" data-act="${act}" data-limit="${k}" value="${L[k]}" min="0" max="120"> ${LIMIT_LABELS[k][1]}</label>`).join('')}</div>
    </div>`;
  }).join('') + `<p class="set-note">Show up to four. Limits are what counts as a good day for you; past them a tile turns amber, well past them red.</p>
    <p class="set-note">On a stand: in the iPad's Settings, Display &amp; Brightness → Auto-Lock → Never keeps the screen on, and Share → Add to Home Screen opens this full screen.</p>
    <p class="set-note"><button type="button" class="link-btn" id="reset-settings">Back to the standard settings</button></p>`;
}
document.getElementById('open-settings').addEventListener('click', () => { renderSettings(); document.getElementById('settings').hidden = false; });
document.getElementById('settings').addEventListener('change', (e) => {
  const t = e.target;
  if (t.hasAttribute('data-show')) {
    const act = t.getAttribute('data-show');
    settings.shown = t.checked ? settings.shown.concat(act).slice(0, 4) : settings.shown.filter((k) => k !== act);
    if (!settings.shown.length) settings.shown = [act];
    renderSettings();
  } else if (t.hasAttribute('data-limit')) {
    const n = parseFloat(t.value);
    if (!isNaN(n)) settings.limits[t.getAttribute('data-act')][t.getAttribute('data-limit')] = n;
  }
  saveSettings();
});
document.getElementById('settings').addEventListener('click', (e) => {
  if (e.target.id === 'reset-settings') {
    settings.shown = DEFAULT_SHOWN.slice();
    for (const k of Object.keys(ACTIVITIES)) settings.limits[k] = Object.assign({}, ACTIVITIES[k].limits);
    saveSettings(); renderSettings();
  } else if (e.target.id === 'close-settings' || e.target.id === 'settings') {
    document.getElementById('settings').hidden = true;
    if (planState) renderPlan(planState, planInfo);
  }
});
