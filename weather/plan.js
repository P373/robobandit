// Built from weather/src/plan.js by tools/build-weather.js for old iPads (safari10.1). Edit the source, not this file.
"use strict";
const LINE = (d) => '<svg class="act-ic" viewBox="0 0 24 24" aria-hidden="true">'.concat(d, "</svg>");
const ACTIVITIES = {
  boating: {
    name: "Boating",
    icon: LINE('<path d="M22 18H2a4 4 0 0 0 4 4h12a4 4 0 0 0 4-4Z"/><path d="M21 14 10 2 3 14h18Z"/><path d="M10 2v16"/>'),
    limits: { wind: 15, gust: 22, seas: 3 }
  },
  swimming: {
    name: "Swimming",
    icon: LINE('<circle cx="17" cy="6" r="2"/><path d="M4 13l4-3 4 2 3-3"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>'),
    limits: { water: 66, air: 70 }
  },
  running: {
    name: "Running",
    icon: LINE('<path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"/><path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"/><path d="M16 17h4"/><path d="M4 13h4"/>'),
    limits: { hot: 82, cold: 30 }
  },
  rollerblading: {
    name: "Rollerblading",
    icon: LINE('<path d="M5 3h5v7l6 2a4 4 0 0 1 4 4v1H5Z"/><circle cx="7" cy="20.5" r="1.5"/><circle cx="12.5" cy="20.5" r="1.5"/><circle cx="18" cy="20.5" r="1.5"/>'),
    limits: { wind: 15, dry: 2 }
  },
  paddling: {
    name: "Kayak & SUP",
    icon: LINE('<path d="M2 16c4 2.5 16 2.5 20 0"/><path d="M6 21 18 5"/><path d="M16.5 3.5l3 3"/><path d="M4.5 22.5l-1-1"/>'),
    limits: { wind: 10, water: 60 }
  },
  biking: {
    name: "Biking",
    icon: LINE('<circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>'),
    limits: { wind: 15, hot: 88 }
  }
};
const LIMIT_LABELS = {
  wind: ["Wind up to", "kt"],
  gust: ["Gusts up to", "kt"],
  seas: ["Seas up to", "ft"],
  water: ["Water at least", "°"],
  air: ["Air at least", "°"],
  hot: ["Too hot above", "°"],
  cold: ["Too cold below", "°"],
  dry: ["Dry for", "hours after rain"]
};
const DEFAULT_SHOWN = ["boating", "swimming", "running", "rollerblading"];
const settings = (() => {
  let s = null;
  try {
    s = JSON.parse(localStorage.getItem("cv:plan"));
  } catch (e) {
  }
  s = s && typeof s === "object" ? s : {};
  const shown = (s.shown || DEFAULT_SHOWN).filter((k) => ACTIVITIES[k]).slice(0, 4);
  const limits = {};
  for (const k of Object.keys(ACTIVITIES)) limits[k] = Object.assign({}, ACTIVITIES[k].limits, (s.limits || {})[k]);
  return { shown: shown.length ? shown : DEFAULT_SHOWN.slice(), limits };
})();
const saveSettings = () => {
  try {
    localStorage.setItem("cv:plan", JSON.stringify(settings));
  } catch (e) {
  }
};
const kt = (h) => "".concat(compass(h.dir), " ").concat(Math.round(h.spd)).concat(h.gst > h.spd + 3 ? " G".concat(Math.round(h.gst)) : "", " kt");
const worst = (checks) => checks.filter(Boolean).reduce((a, b) => b[0] > a[0] ? b : a, [0, ""]);
const RULES = {
  boating: (h, c, L) => worst([
    c.boatAlert && [2, c.boatAlert],
    h.thunder && [2, "Thunderstorms"],
    h.spd != null && (h.spd >= L.wind + 5 || h.gst >= L.gust + 5) && [2, "Wind ".concat(kt(h))],
    h.spd != null && (h.spd >= L.wind || h.gst >= L.gust) && [1, "Wind ".concat(kt(h))],
    c.seas != null && c.seas >= L.seas + 2 && [2, "Seas ".concat(c.seasTxt)],
    c.seas != null && c.seas >= L.seas && [1, "Seas ".concat(c.seasTxt)],
    h.pop >= 60 && [1, "Rain likely (".concat(h.pop, "%)")]
  ]),
  swimming: (h, c, L) => worst([
    h.thunder && [2, "Thunderstorms"],
    c.water != null && c.water < L.water - 6 && [2, "Water ".concat(Math.round(c.water), "°")],
    c.water != null && c.water < L.water && [1, "Water ".concat(Math.round(c.water), "°")],
    h.temp != null && h.temp < L.air - 8 && [2, "Air ".concat(h.temp, "°")],
    h.temp != null && h.temp < L.air && [1, "Air ".concat(h.temp, "°")],
    h.pop >= 50 && [1, "Rain likely (".concat(h.pop, "%)")],
    h.spd >= 18 && [1, "Breezy, ".concat(kt(h))]
  ]),
  running: (h, c, L) => worst([
    h.thunder && [2, "Thunderstorms"],
    h.temp != null && h.temp >= L.hot + 8 && [2, "Hot, ".concat(h.temp, "°")],
    h.temp != null && h.temp >= L.hot && [1, "Warm, ".concat(h.temp, "°")],
    h.temp != null && h.temp <= L.cold - 12 && [2, "Cold, ".concat(h.temp, "°")],
    h.temp != null && h.temp <= L.cold && [1, "Cold, ".concat(h.temp, "°")],
    h.pop >= 70 && [2, "Rain (".concat(h.pop, "%)")],
    h.pop >= 40 && [1, "Chance of rain (".concat(h.pop, "%)")],
    h.spd >= 25 && [1, "Windy, ".concat(kt(h))]
  ]),
  rollerblading: (h, c, L) => worst([
    h.thunder && [2, "Thunderstorms"],
    h.wet && [2, "Wet roads"],
    h.temp != null && h.temp <= 35 && [2, "Icy risk, ".concat(h.temp, "°")],
    h.pop >= 30 && [1, "Chance of rain (".concat(h.pop, "%)")],
    h.spd != null && h.spd >= L.wind && [1, "Wind ".concat(kt(h))]
  ]),
  paddling: (h, c, L) => worst([
    c.boatAlert && [2, c.boatAlert],
    h.thunder && [2, "Thunderstorms"],
    h.spd != null && (h.spd >= L.wind + 5 || h.gst >= L.wind + 10) && [2, "Wind ".concat(kt(h))],
    h.spd != null && (h.spd >= L.wind || h.gst >= L.wind + 5) && [1, "Wind ".concat(kt(h))],
    c.seas != null && c.seas >= 3 && [2, "Seas ".concat(c.seasTxt)],
    c.seas != null && c.seas >= 2 && [1, "Seas ".concat(c.seasTxt)],
    c.water != null && c.water < L.water && [1, "Cold water, ".concat(Math.round(c.water), "°")]
  ]),
  biking: (h, c, L) => worst([
    h.thunder && [2, "Thunderstorms"],
    h.pop >= 60 && [2, "Rain (".concat(h.pop, "%)")],
    h.pop >= 30 && [1, "Chance of rain (".concat(h.pop, "%)")],
    h.spd != null && h.spd >= L.wind + 8 && [2, "Windy, ".concat(kt(h))],
    h.spd != null && h.spd >= L.wind && [1, "Wind ".concat(kt(h))],
    h.temp != null && h.temp >= L.hot && [1, "Hot, ".concat(h.temp, "°")],
    h.temp != null && h.temp <= 25 && [1, "Cold, ".concat(h.temp, "°")]
  ])
};
const GOOD = {
  boating: (H, c) => "".concat(windRange(H)).concat(c.seasTxt ? ", seas ".concat(c.seasTxt) : ""),
  swimming: (H, c) => [c.water != null && "Water ".concat(Math.round(c.water), "°"), tempRange(H, "air ")].filter(Boolean).join(", "),
  running: (H) => "".concat(tempRange(H)).concat(H.every((h) => h.pop < 30) ? " and dry" : ""),
  rollerblading: (H) => "Dry roads, ".concat(windRange(H, "wind ")),
  paddling: (H, c) => [windRange(H), c.water != null && "water ".concat(Math.round(c.water), "°")].filter(Boolean).join(", "),
  biking: (H) => "".concat(tempRange(H), ", ").concat(windRange(H, "wind "))
};
function windRange(H, pre = "") {
  const w = H.filter((h) => h.spd != null);
  if (!w.length) return "wind n/a";
  const lo = Math.round(Math.min(...w.map((h) => h.spd))), hi = Math.round(Math.max(...w.map((h) => h.spd)));
  return "".concat(pre).concat(compass(w[Math.floor(w.length / 2)].dir), " ").concat(lo === hi ? lo : "".concat(lo, "–").concat(hi), " kt");
}
function tempRange(H, pre = "") {
  const t = H.filter((h) => h.temp != null).map((h) => h.temp);
  if (!t.length) return "";
  const lo = Math.min(...t), hi = Math.max(...t);
  return "".concat(pre).concat(lo === hi ? lo : "".concat(lo, "–").concat(hi), "°");
}
function dayHours(state, key) {
  var _a, _b, _c;
  const fc = new Map((((_a = state.weather) == null ? void 0 : _a.hours) || []).map((h) => [Math.round(h.t / 36e5), h]));
  const wind = new Map((((_b = state.weather) == null ? void 0 : _b.wind) || []).map((w) => [Math.round(w.t / 36e5), w]));
  const rain = new Map((((_c = state.weather) == null ? void 0 : _c.rainChance) || []).map((r) => [Math.round(r.t / 36e5), r.pop]));
  const t0 = localMidnight(key).getTime(), t1 = localMidnight(addDays(key, 1)).getTime();
  const hours = [];
  for (let t = t0; t < t1; t += 36e5) {
    const f = fc.get(Math.round(t / 36e5)), w = wind.get(Math.round(t / 36e5));
    hours.push({
      t,
      min: minutesOfDay(new Date(t)),
      temp: f ? f.temp : null,
      pop: f ? f.pop : rain.get(Math.round(t / 36e5)) || 0,
      short: f ? f.short : "",
      isDay: f ? f.isDay : true,
      thunder: !!(f && /thunder/i.test(f.short)),
      spd: w ? w.spd : null,
      gst: w ? w.gst : null,
      dir: w ? w.dir : null,
      known: !!(f || w)
    });
  }
  const dry = settings.limits.rollerblading.dry;
  hours.forEach((h, i) => {
    h.wet = hours.slice(Math.max(0, i - dry), i + 1).some((x) => x.pop >= 50);
  });
  return hours;
}
const BOAT_ALERT = /small craft|gale|storm warning|hurricane|tropical/i;
function dayConditions(state, key) {
  var _a;
  const mp = marineForDay(state.marine, key);
  let seas = null, seasTxt = "";
  for (const p of mp) {
    const s = parseSeaState(p.text).seas;
    const n = s && Math.max(...(s.match(/\d+(\.\d+)?/g) || ["0"]).map(Number));
    if (s && (seas == null || n > seas)) {
      seas = n;
      seasTxt = s;
    }
  }
  const t0 = localMidnight(key).getTime();
  const alert = (state.alerts || []).filter((a) => BOAT_ALERT.test(a.event) && (!a.ends || Date.parse(a.ends) > t0)).sort((a, b) => alertRank(a.event) - alertRank(b.event))[0];
  const headline = key === dateKey(/* @__PURE__ */ new Date()) && (((_a = state.marine) == null ? void 0 : _a.headlines) || []).find((h) => BOAT_ALERT.test(h));
  return { seas, seasTxt, water: state.waterTemp, boatAlert: alert ? alert.event : headline ? titleCase(headline.replace(/\s+IN EFFECT.*$/i, "")) : "" };
}
function verdict(act, hours, cond) {
  const L = settings.limits[act];
  const rated = hours.map((h) => {
    const r = RULES[act](h, cond, L);
    return { h, lv: r[0], why: r[1] };
  });
  if (!rated.length) return null;
  const best = Math.min(...rated.map((r) => r.lv));
  let run = [], top = [];
  for (const r of rated) {
    if (r.lv === best) {
      run.push(r);
      if (run.length > top.length) top = run.slice();
    } else run = [];
  }
  const lv = best === 0 && top.length < 2 && rated.length > 2 ? 1 : best;
  const worstHour = rated.filter((r) => r.lv === Math.max(...rated.map((x) => x.lv)))[0];
  const why = lv === 0 ? GOOD[act](top.map((r) => r.h), cond) : best > 0 ? (top[0] || worstHour).why : worstHour.why;
  return { lv, why, from: top[0].h.min, to: top[top.length - 1].h.min + 60, all: top.length === rated.length, n: top.length };
}
function judgedHours(hours, key, isToday) {
  const sun = sunMoon(key).sun;
  const nowT = Date.now();
  return hours.filter((h) => h.known && h.t + 18e5 >= sun.sunrise && h.t + 18e5 <= sun.sunset && (!isToday || h.t + 36e5 > nowT));
}
const clock = (m) => {
  m = (m % 1440 + 1440) % 1440;
  const h = Math.floor(m / 60), mm = m % 60;
  return { n: "".concat(h % 12 || 12).concat(mm ? ":".concat(String(mm).padStart(2, "0")) : ""), ap: h < 12 ? "AM" : "PM" };
};
function fmtRange(a, b) {
  const x = clock(a), y = clock(b);
  return x.ap === y.ap ? "".concat(x.n, "–").concat(y.n, " ").concat(y.ap) : "".concat(x.n, " ").concat(x.ap, "–").concat(y.n, " ").concat(y.ap);
}
let planState = null, planInfo = null, selected = null, planKey = null;
const LEVEL = ["Go", "Caution", "Not today"];
function renderPlan(state, info) {
  planState = state;
  planInfo = info;
  const todayKey = info.todayKey;
  const todayLeft = judgedHours(dayHours(state, todayKey), todayKey, true);
  planKey = todayLeft.length ? todayKey : addDays(todayKey, 1);
  const isToday = planKey === todayKey;
  const hours = dayHours(state, planKey), cond = dayConditions(state, planKey);
  const judged = isToday ? todayLeft : judgedHours(hours, planKey, false);
  if (!settings.shown.includes(selected)) selected = settings.shown[0];
  document.getElementById("plan-day").textContent = isToday ? "Today" : "Tomorrow";
  document.getElementById("plan-date").textContent = keyLabel(planKey, isToday ? 0 : 1).date;
  const verdicts = {};
  const started = isToday && judged.length > 0 && judged[0].min > sunMoonMin(planKey, "sunrise") + 30;
  document.getElementById("acts").innerHTML = settings.shown.map((act) => {
    const v = verdicts[act] = verdict(act, judged, cond);
    const A = ACTIVITIES[act];
    if (!v) return '<button type="button" class="act" data-act="'.concat(act, '">').concat(A.icon, '<span class="act-name">').concat(A.name, '</span><span class="act-verdict">—</span><span class="act-why">Forecast not in yet</span></button>');
    const when = v.lv === 2 ? "" : v.all ? started ? "Now until ".concat(clock(v.to).n, " ").concat(clock(v.to).ap) : "All day" : "Best ".concat(fmtRange(v.from, v.to));
    return '<button type="button" class="act lv-'.concat(v.lv).concat(act === selected ? " on" : "", '" data-act="').concat(act, '" aria-pressed="').concat(act === selected, '">\n      <span class="act-top">').concat(A.icon, '<span class="act-name">').concat(A.name, '</span></span>\n      <span class="act-verdict">').concat(LEVEL[v.lv], '</span>\n      <span class="act-why">').concat(esc(v.why), '</span>\n      <span class="act-when">').concat(esc(when), "</span>\n    </button>");
  }).join("");
  drawTimeline(state, planKey, hours, verdicts[selected], isToday);
  renderWeek(state, planKey);
  const stale = info.stale.length ? " · showing saved ".concat(info.stale.map((s) => s[0].toLowerCase()).join(", ")) : "";
  document.getElementById("plan-updated").textContent = "Updated ".concat(fmt(/* @__PURE__ */ new Date())).concat(stale).concat(info.missing.length ? " · no ".concat(info.missing.join(", ").toLowerCase()) : "");
  nightMode();
  fitPlan();
}
const sunMoonMin = (key, which) => minutesOfDay(sunMoon(key).sun[which]);
function drawTimeline(state, key, hours, v, isToday) {
  const el = document.getElementById("timeline");
  const W = Math.max(300, el.clientWidth), H = Math.max(200, el.clientHeight);
  const sun = sunMoon(key).sun, sunrise = minutesOfDay(sun.sunrise), sunset = minutesOfDay(sun.sunset);
  const m0 = Math.max(0, Math.floor(sunrise / 60) * 60 - 60), m1 = Math.min(1440, Math.ceil(sunset / 60) * 60 + 120);
  const gut = 58, padR = 10, x = (m) => gut + (m - m0) / (m1 - m0) * (W - gut - padR);
  const rows = { sky: [0, 54], rain: [60, 30] };
  const rest = H - 96 - 22, windH = Math.round(rest * 0.5), tideH = rest - windH;
  rows.wind = [96, windH - 8];
  rows.tide = [96 + windH, tideH - 6];
  const axisY = H - 18;
  const inWin = hours.filter((h) => h.min >= m0 && h.min < m1);
  const out = [];
  out.push(
    '<rect x="'.concat(x(m0), '" y="0" width="').concat(x(sunrise) - x(m0), '" height="').concat(axisY, '" class="tl-night"/>'),
    '<rect x="'.concat(x(sunset), '" y="0" width="').concat(x(m1) - x(sunset), '" height="').concat(axisY, '" class="tl-night"/>')
  );
  if (v && v.n) out.push('<rect x="'.concat(x(v.from), '" y="0" width="').concat(x(v.to) - x(v.from), '" height="').concat(axisY, '" class="tl-win lv-').concat(v.lv, '" rx="6"/>'));
  const step = W < 560 ? 180 : 120;
  for (let m = m0; m <= m1; m += 60) {
    out.push('<line x1="'.concat(x(m), '" x2="').concat(x(m), '" y1="').concat(rows.rain[0], '" y2="').concat(axisY, '" class="tl-grid').concat(m % step ? "" : " major", '"/>'));
    if (m % step === 0 && m < m1) out.push('<text x="'.concat(x(m), '" y="').concat(H - 4, '" class="tl-hour">').concat(clock(m).n).concat(clock(m).ap === "AM" ? "a" : "p", "</text>"));
  }
  out.push(
    '<text x="4" y="'.concat(rows.rain[0] + 17, '" class="tl-label">Rain</text>'),
    '<text x="4" y="'.concat(rows.wind[0] + 14, '" class="tl-label">Wind</text><text x="4" y="').concat(rows.wind[0] + 28, '" class="tl-unit">knots</text>'),
    '<text x="4" y="'.concat(rows.tide[0] + 14, '" class="tl-label">Tide</text><text x="4" y="').concat(rows.tide[0] + 28, '" class="tl-unit">feet</text>')
  );
  for (const h of inWin) {
    if ((h.min - m0) % step || h.temp == null) continue;
    const cx = x(h.min + 30);
    out.push(
      wxIcon(h.short, h.min >= sunrise && h.min < sunset, 28).replace("<svg ", '<svg x="'.concat(cx - 14, '" y="2" ')),
      '<text x="'.concat(cx, '" y="').concat(rows.sky[0] + 46, '" class="tl-temp">').concat(h.temp, "°</text>")
    );
  }
  const rTop = rows.rain[0], rH = rows.rain[1];
  for (const h of inWin) {
    if (!h.pop) continue;
    const bh = Math.max(2, h.pop / 100 * rH);
    out.push('<rect x="'.concat(x(h.min) + 1, '" y="').concat(rTop + rH - bh, '" width="').concat(Math.max(1, x(h.min + 60) - x(h.min) - 2), '" height="').concat(bh, '" class="tl-rain" rx="2"/>'));
  }
  const wet = Math.max(0, ...inWin.map((h) => h.pop));
  out.push('<text x="4" y="'.concat(rTop + 31, '" class="tl-unit">').concat(wet >= 20 ? "up to ".concat(wet, "%") : "dry", "</text>"));
  const wpts = inWin.filter((h) => h.spd != null);
  if (wpts.length > 1) {
    const wTop = rows.wind[0] + 4, wH = rows.wind[1] - 4, max = Math.max(20, Math.ceil(Math.max(...wpts.map((h) => h.gst)) / 5) * 5);
    const y = (k) => wTop + wH - k / max * wH;
    const line = (k) => wpts.map((h, i) => "".concat(i ? "L" : "M").concat(x(h.min + 30).toFixed(1), ",").concat(y(h[k]).toFixed(1))).join("");
    out.push(
      '<path d="'.concat(line("gst"), "L").concat(x(wpts[wpts.length - 1].min + 30).toFixed(1), ",").concat(wTop + wH, "L").concat(x(wpts[0].min + 30).toFixed(1), ",").concat(wTop + wH, 'Z" class="tl-gust"/>'),
      '<path d="'.concat(line("spd"), '" class="tl-wind"/>')
    );
    for (const k of [10, 20, 30].filter((k2) => k2 < max)) out.push('<text x="'.concat(gut - 4, '" y="').concat(y(k) + 4, '" class="tl-tick">').concat(k, "</text>"));
    for (const h of wpts) if ((h.min - m0) % step === 0 && h.dir != null) out.push('<g transform="translate('.concat(x(h.min + 30), " ").concat(y(h.spd) - 12, ") rotate(").concat(h.dir + 180, ')"><path d="M0,5V-5M-3.5,-1.5L0,-5 3.5,-1.5" class="tl-arrow"/></g>'));
    const peak = wpts.reduce((a, b) => b.gst > a.gst ? b : a);
    out.push('<text x="'.concat(x(peak.min + 30), '" y="').concat(Math.max(wTop + 10, y(peak.gst) - 4), '" class="tl-val">G').concat(Math.round(peak.gst), "</text>"));
  }
  const T = state.tides;
  if (T) {
    const di = dayDiff(dateKey(/* @__PURE__ */ new Date()), key);
    const pts = T.curve.filter((p) => p.dayIndex === di && p.min >= m0 - 30 && p.min <= m1 + 30);
    if (pts.length > 1) {
      const vals = T.curve.map((p) => p.v), lo = Math.min(...vals) - 0.3, hi = Math.max(...vals) + 0.3;
      const tTop = rows.tide[0] + 14, tH = rows.tide[1] - 30;
      const y = (v2) => tTop + tH - (v2 - lo) / (hi - lo) * tH;
      const path = pts.map((p, i) => "".concat(i ? "L" : "M").concat(x(p.min).toFixed(1), ",").concat(y(p.v).toFixed(1))).join("");
      out.push('<path d="'.concat(path, "L").concat(x(pts[pts.length - 1].min).toFixed(1), ",").concat(tTop + tH + 14, "L").concat(x(pts[0].min).toFixed(1), ",").concat(tTop + tH + 14, 'Z" class="tl-tide-area"/>'), '<path d="'.concat(path, '" class="tl-tide"/>'));
      for (const p of T.hilo.filter((q) => q.dayIndex === di && q.min >= m0 && q.min <= m1)) {
        const up = p.type === "H", ty = up ? y(p.v) - 7 : y(p.v) + 15;
        out.push(
          '<circle cx="'.concat(x(p.min), '" cy="').concat(y(p.v), '" r="3.5" class="tl-dot ').concat(up ? "hi" : "lo", '"/>'),
          '<text x="'.concat(x(p.min), '" y="').concat(ty, '" class="tl-val">').concat(up ? "High" : "Low", " ").concat(clock(p.min).n).concat(clock(p.min).ap === "AM" ? "a" : "p", "</text>")
        );
      }
    }
  }
  if (isToday) {
    const nm = minutesOfDay(/* @__PURE__ */ new Date());
    if (nm >= m0 && nm <= m1) out.push('<line x1="'.concat(x(nm), '" x2="').concat(x(nm), '" y1="0" y2="').concat(axisY, '" class="tl-now"/><text x="').concat(x(nm), '" y="').concat(axisY - 3, '" class="tl-now-t">now</text>'));
  }
  el.innerHTML = '<svg width="'.concat(W, '" height="').concat(H, '" viewBox="0 0 ').concat(W, " ").concat(H, '">').concat(out.join(""), "</svg>");
}
function renderWeek(state, fromKey) {
  var _a;
  const out = [];
  for (let i = 1; i <= 6; i++) {
    const key = addDays(fromKey, i), w = (_a = state.weather) == null ? void 0 : _a.byDay[key], p = w && (w.day || w.night);
    const hours = dayHours(state, key), judged = judgedHours(hours, key, false);
    const v = verdict(selected, judged, dayConditions(state, key));
    const label = keyLabel(key, 2).short;
    const when = v && v.lv < 2 && !v.all ? " · best ".concat(fmtRange(v.from, v.to)) : "";
    out.push('<button type="button" class="wk" data-key="'.concat(key, '" title="').concat(esc(ACTIVITIES[selected].name), ": ").concat(v ? LEVEL[v.lv] + " · " + esc(v.why) + when : "no forecast yet", '">\n      <span class="wk-day">').concat(label, '</span>\n      <span class="wk-ic">').concat(p ? wxIcon(p.shortForecast, !!w.day, 34) : "", '</span>\n      <span class="wk-t">').concat(w && w.day ? "<b>".concat(w.day.temperature, "°</b>") : "").concat(w && w.night ? " <small>".concat(w.night.temperature, "°</small>") : "", '</span>\n      <span class="wk-w">').concat(judged.some((h) => h.spd != null) ? esc(windRange(judged)) : "", '</span>\n      <span class="wk-v">').concat(v ? '<i class="dot lv-'.concat(v.lv, '"></i>').concat(LEVEL[v.lv]) : "", "</span>\n    </button>"));
  }
  document.getElementById("week").innerHTML = out.join("");
}
function fitPlan() {
  const plan = document.getElementById("plan");
  if (plan.hidden) return;
  const top = plan.getBoundingClientRect().top + (window.pageYOffset || 0);
  plan.style.height = window.innerWidth >= 760 ? Math.max(560, window.innerHeight - top) + "px" : "";
  const tl = document.getElementById("timeline");
  if (planState && Math.abs((tl._w || 0) - tl.clientWidth) + Math.abs((tl._h || 0) - tl.clientHeight) > 2) {
    tl._w = tl.clientWidth;
    tl._h = tl.clientHeight;
    const isToday = planKey === planInfo.todayKey;
    drawTimeline(planState, planKey, dayHours(planState, planKey), verdict(selected, isToday ? judgedHours(dayHours(planState, planKey), planKey, true) : judgedHours(dayHours(planState, planKey), planKey, false), dayConditions(planState, planKey)), isToday);
  }
}
let fitTimer = 0;
window.addEventListener("resize", () => {
  clearTimeout(fitTimer);
  fitTimer = setTimeout(fitPlan, 120);
});
window.addEventListener("orientationchange", () => setTimeout(fitPlan, 300));
function nightMode() {
  const sun = sunMoon(dateKey(/* @__PURE__ */ new Date())).sun, now = Date.now();
  document.documentElement.classList.toggle("dark", now < sun.sunrise.getTime() - 20 * 6e4 || now > sun.sunset.getTime() + 20 * 6e4);
}
setInterval(() => {
  if (!planState) return;
  if (dateKey(/* @__PURE__ */ new Date()) !== planInfo.todayKey) refresh();
  else renderPlan(planState, planInfo);
}, 5 * 6e4);
document.getElementById("acts").addEventListener("click", (e) => {
  const b = e.target.closest(".act");
  if (!b || !planState) return;
  selected = b.getAttribute("data-act");
  renderPlan(planState, planInfo);
});
function showDetails(key) {
  document.getElementById("plan").hidden = true;
  document.getElementById("details").hidden = false;
  renderSourceMap(sourceCell);
  if (sourceMap) setTimeout(() => sourceMap.invalidateSize(), 50);
  const day = key && document.getElementById("d-".concat(key));
  if (day) day.scrollIntoView();
  else window.scrollTo(0, 0);
}
function showPlan() {
  document.getElementById("details").hidden = true;
  document.getElementById("plan").hidden = false;
  window.scrollTo(0, 0);
  fitPlan();
}
document.getElementById("week").addEventListener("click", (e) => {
  const b = e.target.closest(".wk");
  if (b) showDetails(b.getAttribute("data-key"));
});
document.getElementById("open-details").addEventListener("click", () => showDetails(planKey));
document.getElementById("open-about").addEventListener("click", () => {
  showDetails(null);
  document.getElementById("map").scrollIntoView();
});
document.getElementById("close-details").addEventListener("click", showPlan);
function renderSettings() {
  const full = settings.shown.length >= 4;
  document.getElementById("settings-body").innerHTML = Object.keys(ACTIVITIES).map((act) => {
    const A = ACTIVITIES[act], on = settings.shown.includes(act), L = settings.limits[act];
    return '<div class="set-row'.concat(on ? " on" : "", '">\n      <label class="set-show">').concat(A.icon, '<input type="checkbox" data-show="').concat(act, '"').concat(on ? " checked" : "").concat(!on && full ? " disabled" : "", "> <b>").concat(A.name, '</b></label>\n      <div class="set-limits">').concat(Object.keys(L).map((k) => "<label>".concat(LIMIT_LABELS[k][0], ' <input type="number" inputmode="numeric" data-act="').concat(act, '" data-limit="').concat(k, '" value="').concat(L[k], '" min="0" max="120"> ').concat(LIMIT_LABELS[k][1], "</label>")).join(""), "</div>\n    </div>");
  }).join("") + '<p class="set-note">Show up to four. Limits are what counts as a good day for you; past them a tile turns amber, well past them red.</p>\n    <p class="set-note">On a stand: in the iPad\'s Settings, Display &amp; Brightness → Auto-Lock → Never keeps the screen on, and Share → Add to Home Screen opens this full screen.</p>\n    <p class="set-note"><button type="button" class="link-btn" id="reset-settings">Back to the standard settings</button></p>';
}
document.getElementById("open-settings").addEventListener("click", () => {
  renderSettings();
  document.getElementById("settings").hidden = false;
});
document.getElementById("settings").addEventListener("change", (e) => {
  const t = e.target;
  if (t.hasAttribute("data-show")) {
    const act = t.getAttribute("data-show");
    settings.shown = t.checked ? settings.shown.concat(act).slice(0, 4) : settings.shown.filter((k) => k !== act);
    if (!settings.shown.length) settings.shown = [act];
    renderSettings();
  } else if (t.hasAttribute("data-limit")) {
    const n = parseFloat(t.value);
    if (!isNaN(n)) settings.limits[t.getAttribute("data-act")][t.getAttribute("data-limit")] = n;
  }
  saveSettings();
});
document.getElementById("settings").addEventListener("click", (e) => {
  if (e.target.id === "reset-settings") {
    settings.shown = DEFAULT_SHOWN.slice();
    for (const k of Object.keys(ACTIVITIES)) settings.limits[k] = Object.assign({}, ACTIVITIES[k].limits);
    saveSettings();
    renderSettings();
  } else if (e.target.id === "close-settings" || e.target.id === "settings") {
    document.getElementById("settings").hidden = true;
    if (planState) renderPlan(planState, planInfo);
  }
});
