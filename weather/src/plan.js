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
    c.boatAlert && [c.boatLv, c.boatAlert],
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
    c.boatAlert && [c.boatLv, c.boatAlert],
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

// alerts that matter on the water: warnings and advisories mean not today, a watch means caution
const BOAT_ALERT = /small craft|brisk wind|gale|storm warning|storm watch|storm surge|hurricane|tropical|hazardous seas|freezing spray|special marine|tsunami|extreme wind|waterspout/i;
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
  const boatAlert = alert ? alert.event : headline ? titleCase(headline.replace(/\s+IN EFFECT.*$/i, '')) : '';
  return { seas, seasTxt, water: state.waterTemp, boatAlert, boatLv: /watch$/i.test(boatAlert) ? 1 : 2 };
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
  return { lv, why, from: top[0].h.min, to: top[top.length - 1].h.min + 60, all: top.length === rated.length, n: top.length,
    hours: rated.map((r) => ({ min: r.h.min, lv: r.lv, why: r.why })) };
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

let planState = null, planInfo = null, selected = null, planKey = null, expanded = false, planV = null;
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
  // a small muted green, yellow or red box around each activity's icon: do it, maybe, or not today;
  // tap one to open it (the why, the best window, every hour, your limits)
  const whenOf = (v) => (v.lv === 2 ? '' : v.all ? (started ? `now until ${clock(v.to).n} ${clock(v.to).ap}` : 'all day') : `best ${fmtRange(v.from, v.to)}`);
  document.getElementById('acts').innerHTML = settings.shown.map((act) => {
    const v = verdicts[act] = verdict(act, judged, cond);
    const A = ACTIVITIES[act];
    const say = v ? `${A.name}: ${LEVEL[v.lv]} · ${v.why}${whenOf(v) ? ` · ${whenOf(v)}` : ''}` : `${A.name}: forecast not in yet`;
    return `<button type="button" class="act${v ? ` lv-${v.lv}` : ''}${act === selected ? ' on' : ''}" data-act="${act}" aria-pressed="${act === selected}" aria-expanded="${act === selected && expanded}" aria-label="${esc(say)}" title="${esc(say)}">
      ${A.icon}<span class="act-name">${A.name}</span></button>`;
  }).join('') + (expanded ? actDetail(selected, verdicts[selected], whenOf) : '');

  planV = verdicts[selected];
  drawTimeline(state, planV);
  renderWeek(state, planKey);

  const stale = info.stale.length ? ` · showing saved ${info.stale.map((s) => s[0].toLowerCase()).join(', ')}` : '';
  document.getElementById('plan-updated').textContent = `Updated ${fmt(new Date())}${stale}${info.missing.length ? ` · no ${info.missing.join(', ').toLowerCase()}` : ''}`;
  nightMode();
  const tl = document.getElementById('timeline');
  tl._w = 0;   // make fitPlan redraw the timeline at its final size
  fitPlan();
}
// The tapped activity, opened: the verdict and best window, why, every daylight hour in colour, and your limits
function actDetail(act, v, whenOf) {
  const A = ACTIVITIES[act], L = settings.limits[act];
  if (!v) return `<div class="act-detail"><b>${A.name}</b>: the forecast isn't in yet.</div>`;
  const cells = v.hours.map((h) => `<i class="ad-h lv-${h.lv}" title="${clock(h.min).n} ${clock(h.min).ap}: ${esc(LEVEL[h.lv])}${h.why ? ' · ' + esc(h.why) : ''}"></i>`).join('');
  const marks = v.hours.map((h, i) => (i % 3 ? '' : `<span style="left:${(i / v.hours.length) * 100}%">${clock(h.min).n}${clock(h.min).ap === 'AM' ? 'a' : 'p'}</span>`)).join('');
  const limits = Object.keys(L).map((k) => `${LIMIT_LABELS[k][0].toLowerCase()} ${L[k]}${LIMIT_LABELS[k][1] === '°' ? '°' : ' ' + LIMIT_LABELS[k][1]}`).join(' · ');
  return `<div class="act-detail lv-${v.lv}">
    <div class="ad-head"><b class="ad-verdict">${A.name}: ${LEVEL[v.lv]}</b>${whenOf(v) ? `<span class="ad-when">${esc(whenOf(v))}</span>` : ''}<span class="ad-why">${esc(v.why)}</span></div>
    <div class="ad-hours">${cells}</div><div class="ad-marks">${marks}</div>
    <p class="ad-lim">Your limits: ${esc(limits)} <button type="button" class="link-btn" data-settings>Change</button></p>
  </div>`;
}
const sunMoonMin = (key, which) => minutesOfDay(sunMoon(key).sun[which]);

// One rolling clock: from 15 minutes ago to 12 hours ahead (through the night and into tomorrow when it's late),
// with sky and temperature, rain, wind and tide lined up, night shaded, midnight and now marked, and the tapped
// activity's best window as a band
function drawTimeline(state, v) {
  const el = document.getElementById('timeline');
  const W = Math.max(300, el.clientWidth), H = Math.max(200, el.clientHeight);
  const todayKey = planInfo ? planInfo.todayKey : dateKey(new Date()), tomorrow = addDays(todayKey, 1);
  const now = Date.now(), t0 = now - 15 * 6e4, t1 = now + 12 * 36e5;
  const gut = 58, padR = 10, x = (t) => gut + ((Math.min(t1, Math.max(t0, t)) - t0) / (t1 - t0)) * (W - gut - padR);
  // rows: sky and temperature, rain chance, wind (arrow and speed), and the tide gets the rest; all scale with the height
  const avail = H - 22, fit = (f, lo, hi) => Math.round(Math.min(hi, Math.max(lo, avail * f)));
  const skyH = fit(0.25, 40, 54), rainH = fit(0.12, 20, 26), windH = fit(0.22, 36, 50);
  const rows = { sky: [0, skyH], rain: [skyH + 4, rainH], wind: [skyH + rainH + 8, windH] };
  rows.tide = [rows.wind[0] + windH + 4, Math.max(30, avail - (rows.wind[0] + windH + 4) - 2)];
  const iconS = skyH < 48 ? 22 : 28;
  const axisY = H - 18;
  const hours = dayHours(state, todayKey).concat(dayHours(state, tomorrow)).filter((h) => h.t + 36e5 > t0 && h.t < t1);
  const s0 = sunMoon(todayKey).sun, s1 = sunMoon(tomorrow).sun;
  const isDay = (t) => (t >= s0.sunrise && t < s0.sunset) || (t >= s1.sunrise && t < s1.sunset);
  const out = [];

  // night, then the tapped activity's best window (for the planned day)
  for (const [a, b] of [[t0, +s0.sunrise], [+s0.sunset, +s1.sunrise], [+s1.sunset, t1]]) {
    if (b > t0 && a < t1) out.push(`<rect x="${x(a)}" y="0" width="${x(b) - x(a)}" height="${axisY}" class="tl-night"/>`);
  }
  if (v && v.n) {
    const m0 = localMidnight(planKey).getTime(), a = m0 + v.from * 6e4, b = m0 + v.to * 6e4;
    if (b > t0 && a < t1) out.push(`<rect x="${x(a)}" y="0" width="${x(b) - x(a)}" height="${axisY}" class="tl-win lv-${v.lv}" rx="6"/>`);
  }
  // hours, labels, and midnight
  const stepH = W < 560 ? 3 : 2;
  for (let t = Math.ceil(t0 / 36e5) * 36e5; t <= t1; t += 36e5) {
    const m = minutesOfDay(new Date(t)), hr = Math.round(m / 60) % 24, midnight = m === 0;
    out.push(`<line x1="${x(t)}" x2="${x(t)}" y1="${midnight ? 0 : rows.rain[0]}" y2="${axisY}" class="tl-grid${hr % stepH ? '' : ' major'}${midnight ? ' tl-midnight' : ''}"/>`);
    if (midnight) out.push(`<text x="${x(t) + 4}" y="${rows.rain[0] - 4}" class="tl-day">${keyLabel(dateKey(new Date(t)), 2).short}</text>`);
    if (hr % stepH === 0 && t < t1 - 18e5) out.push(`<text x="${x(t)}" y="${H - 4}" class="tl-hour">${clock(m).n}${clock(m).ap === 'AM' ? 'a' : 'p'}</text>`);
  }
  // row labels, each centred beside its graph
  const mid = { rain: rows.rain[0] + rows.rain[1] / 2, wind: rows.wind[0] + rows.wind[1] / 2, tide: rows.tide[0] + rows.tide[1] / 2 };
  out.push(`<text x="4" y="${mid.rain - 2}" class="tl-label">Rain</text>`,
    `<text x="4" y="${mid.wind - 2}" class="tl-label">Wind</text><text x="4" y="${mid.wind + 11}" class="tl-unit">knots</text>`,
    `<text x="4" y="${mid.tide - 2}" class="tl-label">Tide</text><text x="4" y="${mid.tide + 11}" class="tl-unit">feet</text>`);

  // sky and temperature on the labelled hours
  for (const h of hours) {
    if (Math.round(h.min / 60) % stepH || h.temp == null || h.t < t0) continue;
    const cx = x(h.t + 18e5);
    out.push(wxIcon(h.short, isDay(h.t + 18e5), iconS).replace('<svg ', `<svg x="${cx - iconS / 2}" y="2" `),
      `<text x="${cx}" y="${skyH - 6}" class="tl-temp">${h.temp}°</text>`);
  }
  // rain: the chance on each labelled hour, blue once it's worth noticing
  for (const h of hours) {
    if (Math.round(h.min / 60) % stepH || h.t < t0) continue;
    out.push(`<text x="${x(h.t + 18e5)}" y="${mid.rain + 5}" class="tl-pop${h.pop >= 30 ? ' wet' : ''}">${h.pop}%</text>`);
  }
  const wet = Math.max(0, ...hours.map((h) => h.pop));
  out.push(`<text x="4" y="${mid.rain + 11}" class="tl-unit">${wet >= 20 ? `up to ${wet}%` : 'dry'}</text>`);

  // wind: on each labelled hour, an arrow the way it blows and the speed (and gusts when they're well above it)
  const wpts = hours.filter((h) => h.spd != null);
  for (const h of wpts) {
    if (Math.round(h.min / 60) % stepH || h.t < t0) continue;
    const cx = x(h.t + 18e5), spd = Math.round(h.spd), gst = Math.round(h.gst);
    if (h.dir != null) out.push(`<g transform="translate(${cx} ${mid.wind - windH * 0.18}) rotate(${h.dir + 180}) scale(${windH < 44 ? 0.8 : 1})"><path d="M0,8V-8M-5,-3L0,-8 5,-3" class="tl-warrow"/></g>`);
    out.push(`<text x="${cx}" y="${mid.wind + windH * 0.36}" class="tl-wspd">${spd}${gst > spd + 3 ? `<tspan class="tl-gst"> G${gst}</tspan>` : ''}</text>`);
  }

  // tide (its times are minutes from today's local midnight)
  const T = state.tides;
  let tidePts = [];
  if (T) {
    const midnight0 = localMidnight(todayKey).getTime(), at = (p) => midnight0 + p.abs * 6e4;
    const pts = T.curve.filter((p) => at(p) >= t0 - 18e5 && at(p) <= t1 + 18e5);
    tidePts = pts.map((p) => ({ t: at(p), v: p.v }));
    if (pts.length > 1) {
      const vals = T.curve.map((p) => p.v), lo = Math.min(...vals) - 0.3, hi = Math.max(...vals) + 0.3;
      const tTop = rows.tide[0] + 12, tH = Math.max(12, rows.tide[1] - 26);
      const y = (val) => tTop + tH - ((val - lo) / (hi - lo)) * tH;
      const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(at(p)).toFixed(1)},${y(p.v).toFixed(1)}`).join('');
      out.push(`<path d="${path}L${x(at(pts[pts.length - 1])).toFixed(1)},${tTop + tH + 14}L${x(at(pts[0])).toFixed(1)},${tTop + tH + 14}Z" class="tl-tide-area"/>`, `<path d="${path}" class="tl-tide"/>`);
      for (const p of T.hilo.filter((q) => at(q) >= t0 && at(q) <= t1)) {
        const up = p.type === 'H', ty = up ? y(p.v) - 7 : y(p.v) + 15;
        out.push(`<circle cx="${x(at(p))}" cy="${y(p.v)}" r="3.5" class="tl-dot ${up ? 'hi' : 'lo'}"/>`,
          `<text x="${x(at(p))}" y="${ty}" class="tl-val">${up ? 'High' : 'Low'} ${clock(p.min).n}${clock(p.min).ap === 'AM' ? 'a' : 'p'}</text>`);
      }
    }
  }

  // now stays marked faintly; the slider (drawn over the top) starts there
  out.push(`<line x1="${x(now)}" x2="${x(now)}" y1="0" y2="${axisY}" class="tl-now-dash"/>`);
  el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${out.join('')}</svg><div class="tl-scrub"></div>`;
  tlModel = { t0, t1, W, H, gut, padR, x, axisY, mid, hours, wind: wpts.map((h) => ({ t: h.t + 18e5, spd: h.spd, gst: h.gst, dir: h.dir })), tide: tidePts };
  setScrub(scrubAt != null ? scrubAt : now);
}

// ---------- the slider: drag the red line (or tap) to read the forecast at any time ----------

let tlModel = null, scrubAt = null, scrubBack = 0;
const lerpAt = (pts, t, k) => {
  if (!pts.length) return null;
  if (t <= pts[0].t) return pts[0][k];
  for (let i = 1; i < pts.length; i++) if (t <= pts[i].t) { const a = pts[i - 1], b = pts[i]; return a[k] + (b[k] - a[k]) * ((t - a.t) / (b.t - a.t)); }
  return pts[pts.length - 1][k];
};
function setScrub(t) {
  const m = tlModel;
  if (!m) return;
  t = Math.min(m.t1, Math.max(m.t0, t));
  const X = m.x(t), isNow = Math.abs(t - Date.now()) < 3 * 6e4, mm = minutesOfDay(new Date(t));
  const hour = m.hours.filter((h) => t >= h.t && t < h.t + 36e5)[0];
  const near = m.wind.length ? m.wind.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a)) : null;
  const spd = lerpAt(m.wind, t, 'spd'), gst = lerpAt(m.wind, t, 'gst'), tv = lerpAt(m.tide, t, 'v'), tv2 = lerpAt(m.tide, t + 15 * 6e4, 'v');
  const reads = [
    [10, `${isNow ? 'Now' : `${clock(Math.round(mm / 5) * 5).n} ${clock(mm).ap}`}${hour && hour.temp != null ? ` · ${hour.temp}°` : ''}${isNow ? ' ↔' : ''}`, 'time'],
    [m.mid.rain, hour ? `${hour.pop}%` : ''],
    [m.mid.wind, spd != null ? `${compass(near.dir)} ${Math.round(spd)}${gst > spd + 3 ? ` G${Math.round(gst)}` : ''} kt` : ''],
    [m.mid.tide, tv != null ? `${tv.toFixed(1)} ft ${tv2 > tv + 0.02 ? '↑' : tv2 < tv - 0.02 ? '↓' : ''}` : ''],
  ].filter((r) => r[1]);
  const pills = reads.map(([y, txt, cls]) => {
    const w = txt.length * (cls ? 7.6 : 7) + 12, left = X + w + 10 > m.W ? X - w - 6 : X + 6;
    return `<rect x="${left}" y="${y - 10}" width="${w}" height="19" rx="5" class="tl-pill${cls ? ' ' + cls : ''}"/><text x="${left + w / 2}" y="${y + 4}" class="tl-read${cls ? ' ' + cls : ''}">${esc(txt)}</text>`;
  }).join('');
  document.querySelector('#timeline .tl-scrub').innerHTML = `<svg width="${m.W}" height="${m.H}" viewBox="0 0 ${m.W} ${m.H}">
    <line x1="${X}" x2="${X}" y1="0" y2="${m.axisY}" class="tl-now"/><circle cx="${X}" cy="${m.axisY - 1}" r="7" class="tl-knob"/>${pills}</svg>`;
}
(function () {
  const el = document.getElementById('timeline');
  let dragging = false;
  const toT = (cx) => { const m = tlModel, r = el.getBoundingClientRect(); return m.t0 + ((cx - r.left - m.gut) / (m.W - m.gut - m.padR)) * (m.t1 - m.t0); };
  const go = (cx) => { scrubAt = Math.min(tlModel.t1, Math.max(tlModel.t0, toT(cx))); setScrub(scrubAt); };
  const start = (cx) => { if (!tlModel) return; dragging = true; clearTimeout(scrubBack); go(cx); };
  const move = (cx) => { if (dragging) go(cx); };
  const end = () => {
    if (!dragging) return;
    dragging = false;
    clearTimeout(scrubBack);
    scrubBack = setTimeout(() => { scrubAt = null; setScrub(Date.now()); }, 10000);   // back to now after a while
  };
  el.addEventListener('touchstart', (e) => { start(e.touches[0].clientX); e.preventDefault(); }, false);
  el.addEventListener('touchmove', (e) => { move(e.touches[0].clientX); e.preventDefault(); }, false);
  el.addEventListener('touchend', end, false);
  el.addEventListener('touchcancel', end, false);
  el.addEventListener('mousedown', (e) => { start(e.clientX); e.preventDefault(); });
  window.addEventListener('mousemove', (e) => move(e.clientX));
  window.addEventListener('mouseup', end);
  el.addEventListener('keydown', (e) => {
    if (!tlModel || (e.keyCode !== 37 && e.keyCode !== 39)) return;
    e.preventDefault();
    clearTimeout(scrubBack);
    scrubAt = Math.min(tlModel.t1, Math.max(tlModel.t0, (scrubAt != null ? scrubAt : Date.now()) + (e.keyCode === 39 ? 15 : -15) * 6e4));
    setScrub(scrubAt);
    scrubBack = setTimeout(() => { scrubAt = null; setScrub(Date.now()); }, 10000);
  });
})();

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
  const tl = document.getElementById('timeline');
  // An iPad shows it all on one screen: every row takes the height its content needs and the timeline gets the
  // rest of the real window height (old iOS gets vh wrong, and old Safari stretches flex and grid rows). A phone scrolls.
  if (window.innerWidth >= 760) {
    const top = plan.getBoundingClientRect().top + (window.pageYOffset || 0);
    tl.style.height = '190px';
    const rest = plan.offsetHeight - tl.offsetHeight;   // the tiles, the week, the footer, gaps and padding
    tl.style.height = Math.max(190, Math.floor(window.innerHeight - top - rest)) + 'px';
  } else tl.style.height = '';
  if (planState && Math.abs((tl._w || 0) - tl.clientWidth) + Math.abs((tl._h || 0) - tl.clientHeight) > 2) {
    tl._w = tl.clientWidth; tl._h = tl.clientHeight;
    drawTimeline(planState, planV);
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
  if (dateKey(new Date()) !== planInfo.todayKey) startRefresh();
  else renderPlan(planState, planInfo);
}, 5 * 60000);

// ---------- taps: pick an activity, open a day, details, settings ----------

document.getElementById('acts').addEventListener('click', (e) => {
  if (e.target.closest('[data-settings]')) { document.getElementById('open-settings').click(); return; }
  const b = e.target.closest('.act');
  if (!b || !planState) return;
  const act = b.getAttribute('data-act');
  expanded = act === selected ? !expanded : true;   // tap again to close
  selected = act;
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
