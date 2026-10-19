// Built from weather/src/plan.js by tools/build-weather.js (plain ES5, for old iPads). Edit the source, not this file.
'use strict';

// The one-screen plan: can I do my thing today, and when? A verdict for each activity, one timeline for the
// day (sky, rain, wind and tide on the same clock), and the rest of the week in a row. Everything else
// (the 7-day cards, the map, the credits) is one tap away. app.js loads the data and calls renderPlan().
// Loaded before app.js; it only uses app.js's helpers once renderPlan() is called.

// ---------- activities: what each needs, with limits you can change (saved on this iPad) ----------
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
var LINE = function LINE(d) {
  return "<svg class=\"act-ic\" viewBox=\"0 0 24 24\" aria-hidden=\"true\">".concat(d, "</svg>");
};
var ACTIVITIES = {
  boating: {
    name: 'Boating',
    icon: LINE('<path d="M22 18H2a4 4 0 0 0 4 4h12a4 4 0 0 0 4-4Z"/><path d="M21 14 10 2 3 14h18Z"/><path d="M10 2v16"/>'),
    limits: {
      wind: 15,
      gust: 22,
      seas: 3
    }
  },
  swimming: {
    name: 'Swimming',
    icon: LINE('<circle cx="17" cy="6" r="2"/><path d="M4 13l4-3 4 2 3-3"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>'),
    limits: {
      water: 66,
      air: 70
    }
  },
  running: {
    name: 'Running',
    icon: LINE('<path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"/><path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"/><path d="M16 17h4"/><path d="M4 13h4"/>'),
    limits: {
      hot: 82,
      cold: 30
    }
  },
  rollerblading: {
    name: 'Rollerblading',
    icon: LINE('<path d="M5 3h5v7l6 2a4 4 0 0 1 4 4v1H5Z"/><circle cx="7" cy="20.5" r="1.5"/><circle cx="12.5" cy="20.5" r="1.5"/><circle cx="18" cy="20.5" r="1.5"/>'),
    limits: {
      wind: 15,
      dry: 2
    }
  },
  paddling: {
    name: 'Kayak & SUP',
    icon: LINE('<path d="M2 16c4 2.5 16 2.5 20 0"/><path d="M6 21 18 5"/><path d="M16.5 3.5l3 3"/><path d="M4.5 22.5l-1-1"/>'),
    limits: {
      wind: 10,
      water: 60
    }
  },
  biking: {
    name: 'Biking',
    icon: LINE('<circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>'),
    limits: {
      wind: 15,
      hot: 88
    }
  }
};
var LIMIT_LABELS = {
  wind: ['Wind up to', 'kt'],
  gust: ['Gusts up to', 'kt'],
  seas: ['Seas up to', 'ft'],
  water: ['Water at least', '°'],
  air: ['Air at least', '°'],
  hot: ['Too hot above', '°'],
  cold: ['Too cold below', '°'],
  dry: ['Dry for', 'hours after rain']
};
var DEFAULT_SHOWN = ['boating', 'swimming', 'running', 'rollerblading'];
var settings = function () {
  var s = null;
  try {
    s = JSON.parse(localStorage.getItem('cv:plan'));
  } catch (e) {/* first visit */}
  s = s && _typeof(s) === 'object' ? s : {};
  var shown = (s.shown || DEFAULT_SHOWN).filter(function (k) {
    return ACTIVITIES[k];
  }).slice(0, 4);
  var limits = {};
  for (var _i = 0, _Object$keys = Object.keys(ACTIVITIES); _i < _Object$keys.length; _i++) {
    var k = _Object$keys[_i];
    limits[k] = Object.assign({}, ACTIVITIES[k].limits, (s.limits || {})[k]);
  }
  return {
    shown: shown.length ? shown : DEFAULT_SHOWN.slice(),
    limits: limits
  };
}();
var saveSettings = function saveSettings() {
  try {
    localStorage.setItem('cv:plan', JSON.stringify(settings));
  } catch (e) {/* storage off */}
};

// ---------- one hour at a time: Go (0), Caution (1) or Not today (2), and why ----------

var kt = function kt(h) {
  return "".concat(compass(h.dir), " ").concat(Math.round(h.spd)).concat(h.gst > h.spd + 3 ? " G".concat(Math.round(h.gst)) : '', " kt");
};
var worst = function worst(checks) {
  return checks.filter(Boolean).reduce(function (a, b) {
    return b[0] > a[0] ? b : a;
  }, [0, '']);
};
var RULES = {
  boating: function boating(h, c, L) {
    return worst([c.boatAlert && [2, c.boatAlert], h.thunder && [2, 'Thunderstorms'], h.spd != null && (h.spd >= L.wind + 5 || h.gst >= L.gust + 5) && [2, "Wind ".concat(kt(h))], h.spd != null && (h.spd >= L.wind || h.gst >= L.gust) && [1, "Wind ".concat(kt(h))], c.seas != null && c.seas >= L.seas + 2 && [2, "Seas ".concat(c.seasTxt)], c.seas != null && c.seas >= L.seas && [1, "Seas ".concat(c.seasTxt)], h.pop >= 60 && [1, "Rain likely (".concat(h.pop, "%)")]]);
  },
  swimming: function swimming(h, c, L) {
    return worst([h.thunder && [2, 'Thunderstorms'], c.water != null && c.water < L.water - 6 && [2, "Water ".concat(Math.round(c.water), "\xB0")], c.water != null && c.water < L.water && [1, "Water ".concat(Math.round(c.water), "\xB0")], h.temp != null && h.temp < L.air - 8 && [2, "Air ".concat(h.temp, "\xB0")], h.temp != null && h.temp < L.air && [1, "Air ".concat(h.temp, "\xB0")], h.pop >= 50 && [1, "Rain likely (".concat(h.pop, "%)")], h.spd >= 18 && [1, "Breezy, ".concat(kt(h))]]);
  },
  running: function running(h, c, L) {
    return worst([h.thunder && [2, 'Thunderstorms'], h.temp != null && h.temp >= L.hot + 8 && [2, "Hot, ".concat(h.temp, "\xB0")], h.temp != null && h.temp >= L.hot && [1, "Warm, ".concat(h.temp, "\xB0")], h.temp != null && h.temp <= L.cold - 12 && [2, "Cold, ".concat(h.temp, "\xB0")], h.temp != null && h.temp <= L.cold && [1, "Cold, ".concat(h.temp, "\xB0")], h.pop >= 70 && [2, "Rain (".concat(h.pop, "%)")], h.pop >= 40 && [1, "Chance of rain (".concat(h.pop, "%)")], h.spd >= 25 && [1, "Windy, ".concat(kt(h))]]);
  },
  rollerblading: function rollerblading(h, c, L) {
    return worst([h.thunder && [2, 'Thunderstorms'], h.wet && [2, 'Wet roads'], h.temp != null && h.temp <= 35 && [2, "Icy risk, ".concat(h.temp, "\xB0")], h.pop >= 30 && [1, "Chance of rain (".concat(h.pop, "%)")], h.spd != null && h.spd >= L.wind && [1, "Wind ".concat(kt(h))]]);
  },
  paddling: function paddling(h, c, L) {
    return worst([c.boatAlert && [2, c.boatAlert], h.thunder && [2, 'Thunderstorms'], h.spd != null && (h.spd >= L.wind + 5 || h.gst >= L.wind + 10) && [2, "Wind ".concat(kt(h))], h.spd != null && (h.spd >= L.wind || h.gst >= L.wind + 5) && [1, "Wind ".concat(kt(h))], c.seas != null && c.seas >= 3 && [2, "Seas ".concat(c.seasTxt)], c.seas != null && c.seas >= 2 && [1, "Seas ".concat(c.seasTxt)], c.water != null && c.water < L.water && [1, "Cold water, ".concat(Math.round(c.water), "\xB0")]]);
  },
  biking: function biking(h, c, L) {
    return worst([h.thunder && [2, 'Thunderstorms'], h.pop >= 60 && [2, "Rain (".concat(h.pop, "%)")], h.pop >= 30 && [1, "Chance of rain (".concat(h.pop, "%)")], h.spd != null && h.spd >= L.wind + 8 && [2, "Windy, ".concat(kt(h))], h.spd != null && h.spd >= L.wind && [1, "Wind ".concat(kt(h))], h.temp != null && h.temp >= L.hot && [1, "Hot, ".concat(h.temp, "\xB0")], h.temp != null && h.temp <= 25 && [1, "Cold, ".concat(h.temp, "\xB0")]]);
  }
};

// What made a good window good, in a few words
var GOOD = {
  boating: function boating(H, c) {
    return "".concat(windRange(H)).concat(c.seasTxt ? ", seas ".concat(c.seasTxt) : '');
  },
  swimming: function swimming(H, c) {
    return [c.water != null && "Water ".concat(Math.round(c.water), "\xB0"), tempRange(H, 'air ')].filter(Boolean).join(', ');
  },
  running: function running(H) {
    return "".concat(tempRange(H)).concat(H.every(function (h) {
      return h.pop < 30;
    }) ? ' and dry' : '');
  },
  rollerblading: function rollerblading(H) {
    return "Dry roads, ".concat(windRange(H, 'wind '));
  },
  paddling: function paddling(H, c) {
    return [windRange(H), c.water != null && "water ".concat(Math.round(c.water), "\xB0")].filter(Boolean).join(', ');
  },
  biking: function biking(H) {
    return "".concat(tempRange(H), ", ").concat(windRange(H, 'wind '));
  }
};
function windRange(H) {
  var pre = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
  var w = H.filter(function (h) {
    return h.spd != null;
  });
  if (!w.length) return 'wind n/a';
  var lo = Math.round(Math.min.apply(Math, _toConsumableArray(w.map(function (h) {
      return h.spd;
    })))),
    hi = Math.round(Math.max.apply(Math, _toConsumableArray(w.map(function (h) {
      return h.spd;
    }))));
  return "".concat(pre).concat(compass(w[Math.floor(w.length / 2)].dir), " ").concat(lo === hi ? lo : "".concat(lo, "\u2013").concat(hi), " kt");
}
function tempRange(H) {
  var pre = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
  var t = H.filter(function (h) {
    return h.temp != null;
  }).map(function (h) {
    return h.temp;
  });
  if (!t.length) return '';
  var lo = Math.min.apply(Math, _toConsumableArray(t)),
    hi = Math.max.apply(Math, _toConsumableArray(t));
  return "".concat(pre).concat(lo === hi ? lo : "".concat(lo, "\u2013").concat(hi), "\xB0");
}

// ---------- the hours of a day, and the day's conditions ----------

function dayHours(state, key) {
  var _state$weather, _state$weather2, _state$weather3;
  var fc = new Map((((_state$weather = state.weather) === null || _state$weather === void 0 ? void 0 : _state$weather.hours) || []).map(function (h) {
    return [Math.round(h.t / 36e5), h];
  }));
  var wind = new Map((((_state$weather2 = state.weather) === null || _state$weather2 === void 0 ? void 0 : _state$weather2.wind) || []).map(function (w) {
    return [Math.round(w.t / 36e5), w];
  }));
  var rain = new Map((((_state$weather3 = state.weather) === null || _state$weather3 === void 0 ? void 0 : _state$weather3.rainChance) || []).map(function (r) {
    return [Math.round(r.t / 36e5), r.pop];
  }));
  var t0 = localMidnight(key).getTime(),
    t1 = localMidnight(addDays(key, 1)).getTime();
  var hours = [];
  for (var t = t0; t < t1; t += 36e5) {
    var f = fc.get(Math.round(t / 36e5)),
      w = wind.get(Math.round(t / 36e5));
    hours.push({
      t: t,
      min: minutesOfDay(new Date(t)),
      temp: f ? f.temp : null,
      pop: f ? f.pop : rain.get(Math.round(t / 36e5)) || 0,
      "short": f ? f["short"] : '',
      isDay: f ? f.isDay : true,
      thunder: !!(f && /thunder/i.test(f["short"])),
      spd: w ? w.spd : null,
      gst: w ? w.gst : null,
      dir: w ? w.dir : null,
      known: !!(f || w)
    });
  }
  // wet roads: rain likely this hour or in the hours just before it
  var dry = settings.limits.rollerblading.dry;
  hours.forEach(function (h, i) {
    h.wet = hours.slice(Math.max(0, i - dry), i + 1).some(function (x) {
      return x.pop >= 50;
    });
  });
  return hours;
}
var BOAT_ALERT = /small craft|gale|storm warning|hurricane|tropical/i;
function dayConditions(state, key) {
  var _state$marine;
  var mp = marineForDay(state.marine, key);
  var seas = null,
    seasTxt = '';
  var _iterator = _createForOfIteratorHelper(mp),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var p = _step.value;
      var s = parseSeaState(p.text).seas;
      var n = s && Math.max.apply(Math, _toConsumableArray((s.match(/\d+(\.\d+)?/g) || ['0']).map(Number)));
      if (s && (seas == null || n > seas)) {
        seas = n;
        seasTxt = s;
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  var t0 = localMidnight(key).getTime();
  var alert = (state.alerts || []).filter(function (a) {
    return BOAT_ALERT.test(a.event) && (!a.ends || Date.parse(a.ends) > t0);
  }).sort(function (a, b) {
    return alertRank(a.event) - alertRank(b.event);
  })[0];
  var headline = key === dateKey(new Date()) && (((_state$marine = state.marine) === null || _state$marine === void 0 ? void 0 : _state$marine.headlines) || []).find(function (h) {
    return BOAT_ALERT.test(h);
  });
  return {
    seas: seas,
    seasTxt: seasTxt,
    water: state.waterTemp,
    boatAlert: alert ? alert.event : headline ? titleCase(headline.replace(/\s+IN EFFECT.*$/i, '')) : ''
  };
}

// ---------- a verdict: the best stretch of the day for one activity ----------

function verdict(act, hours, cond) {
  var L = settings.limits[act];
  var rated = hours.map(function (h) {
    var r = RULES[act](h, cond, L);
    return {
      h: h,
      lv: r[0],
      why: r[1]
    };
  });
  if (!rated.length) return null;
  // the longest run of hours at the best level reached
  var best = Math.min.apply(Math, _toConsumableArray(rated.map(function (r) {
    return r.lv;
  })));
  var run = [],
    top = [];
  var _iterator2 = _createForOfIteratorHelper(rated),
    _step2;
  try {
    for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
      var r = _step2.value;
      if (r.lv === best) {
        run.push(r);
        if (run.length > top.length) top = run.slice();
      } else run = [];
    }
  } catch (err) {
    _iterator2.e(err);
  } finally {
    _iterator2.f();
  }
  var lv = best === 0 && top.length < 2 && rated.length > 2 ? 1 : best; // one good hour isn't a good day
  var worstHour = rated.filter(function (r) {
    return r.lv === Math.max.apply(Math, _toConsumableArray(rated.map(function (x) {
      return x.lv;
    })));
  })[0];
  var why = lv === 0 ? GOOD[act](top.map(function (r) {
    return r.h;
  }), cond) : best > 0 ? (top[0] || worstHour).why : worstHour.why;
  return {
    lv: lv,
    why: why,
    from: top[0].h.min,
    to: top[top.length - 1].h.min + 60,
    all: top.length === rated.length,
    n: top.length
  };
}

// the hours to judge: daylight, and from now on if it's today
function judgedHours(hours, key, isToday) {
  var sun = sunMoon(key).sun;
  var nowT = Date.now();
  return hours.filter(function (h) {
    return h.known && h.t + 18e5 >= sun.sunrise && h.t + 18e5 <= sun.sunset && (!isToday || h.t + 36e5 > nowT);
  });
}

// ---------- time words ----------

var clock = function clock(m) {
  m = (m % 1440 + 1440) % 1440;
  var h = Math.floor(m / 60),
    mm = m % 60;
  return {
    n: "".concat(h % 12 || 12).concat(mm ? ":".concat(String(mm).padStart(2, '0')) : ''),
    ap: h < 12 ? 'AM' : 'PM'
  };
};
function fmtRange(a, b) {
  var x = clock(a),
    y = clock(b);
  return x.ap === y.ap ? "".concat(x.n, "\u2013").concat(y.n, " ").concat(y.ap) : "".concat(x.n, " ").concat(x.ap, "\u2013").concat(y.n, " ").concat(y.ap);
}

// ---------- render ----------

var planState = null,
  planInfo = null,
  selected = null,
  planKey = null;
var LEVEL = ['Go', 'Caution', 'Not today'];
function renderPlan(state, info) {
  planState = state;
  planInfo = info;
  var todayKey = info.todayKey;
  // after sunset, plan tomorrow
  var todayLeft = judgedHours(dayHours(state, todayKey), todayKey, true);
  planKey = todayLeft.length ? todayKey : addDays(todayKey, 1);
  var isToday = planKey === todayKey;
  var hours = dayHours(state, planKey),
    cond = dayConditions(state, planKey);
  var judged = isToday ? todayLeft : judgedHours(hours, planKey, false);
  if (!settings.shown.includes(selected)) selected = settings.shown[0];
  document.getElementById('plan-day').textContent = isToday ? 'Today' : 'Tomorrow';
  document.getElementById('plan-date').textContent = keyLabel(planKey, isToday ? 0 : 1).date;

  // the activity tiles
  var verdicts = {};
  var started = isToday && judged.length > 0 && judged[0].min > sunMoonMin(planKey, 'sunrise') + 30; // the day is already under way
  document.getElementById('acts').innerHTML = settings.shown.map(function (act) {
    var v = verdicts[act] = verdict(act, judged, cond);
    var A = ACTIVITIES[act];
    if (!v) return "<button type=\"button\" class=\"act\" data-act=\"".concat(act, "\">").concat(A.icon, "<span class=\"act-name\">").concat(A.name, "</span><span class=\"act-verdict\">\u2014</span><span class=\"act-why\">Forecast not in yet</span></button>");
    var when = v.lv === 2 ? '' : v.all ? started ? "Now until ".concat(clock(v.to).n, " ").concat(clock(v.to).ap) : 'All day' : "Best ".concat(fmtRange(v.from, v.to));
    return "<button type=\"button\" class=\"act lv-".concat(v.lv).concat(act === selected ? ' on' : '', "\" data-act=\"").concat(act, "\" aria-pressed=\"").concat(act === selected, "\">\n      <span class=\"act-top\">").concat(A.icon, "<span class=\"act-name\">").concat(A.name, "</span></span>\n      <span class=\"act-verdict\">").concat(LEVEL[v.lv], "</span>\n      <span class=\"act-why\">").concat(esc(v.why), "</span>\n      <span class=\"act-when\">").concat(esc(when), "</span>\n    </button>");
  }).join('');
  drawTimeline(state, planKey, hours, verdicts[selected], isToday);
  renderWeek(state, planKey);
  var stale = info.stale.length ? " \xB7 showing saved ".concat(info.stale.map(function (s) {
    return s[0].toLowerCase();
  }).join(', ')) : '';
  document.getElementById('plan-updated').textContent = "Updated ".concat(fmt(new Date())).concat(stale).concat(info.missing.length ? " \xB7 no ".concat(info.missing.join(', ').toLowerCase()) : '');
  nightMode();
  fitPlan();
}
var sunMoonMin = function sunMoonMin(key, which) {
  return minutesOfDay(sunMoon(key).sun[which]);
};

// One clock for the day: sky and temperature, rain, wind and tide lined up, night shaded, now marked
function drawTimeline(state, key, hours, v, isToday) {
  var el = document.getElementById('timeline');
  var W = Math.max(300, el.clientWidth),
    H = Math.max(200, el.clientHeight);
  var sun = sunMoon(key).sun,
    sunrise = minutesOfDay(sun.sunrise),
    sunset = minutesOfDay(sun.sunset);
  var m0 = Math.max(0, Math.floor(sunrise / 60) * 60 - 60),
    m1 = Math.min(1440, Math.ceil(sunset / 60) * 60 + 120);
  var gut = 58,
    padR = 10,
    x = function x(m) {
      return gut + (m - m0) / (m1 - m0) * (W - gut - padR);
    };
  var rows = {
    sky: [0, 54],
    rain: [60, 30]
  };
  var rest = H - 96 - 22,
    windH = Math.round(rest * 0.5),
    tideH = rest - windH;
  rows.wind = [96, windH - 8];
  rows.tide = [96 + windH, tideH - 6];
  var axisY = H - 18;
  var inWin = hours.filter(function (h) {
    return h.min >= m0 && h.min < m1;
  });
  var out = [];

  // night, and the selected activity's best window
  out.push("<rect x=\"".concat(x(m0), "\" y=\"0\" width=\"").concat(x(sunrise) - x(m0), "\" height=\"").concat(axisY, "\" class=\"tl-night\"/>"), "<rect x=\"".concat(x(sunset), "\" y=\"0\" width=\"").concat(x(m1) - x(sunset), "\" height=\"").concat(axisY, "\" class=\"tl-night\"/>"));
  if (v && v.n) out.push("<rect x=\"".concat(x(v.from), "\" y=\"0\" width=\"").concat(x(v.to) - x(v.from), "\" height=\"").concat(axisY, "\" class=\"tl-win lv-").concat(v.lv, "\" rx=\"6\"/>"));
  // hour grid and labels
  var step = W < 560 ? 180 : 120;
  for (var m = m0; m <= m1; m += 60) {
    out.push("<line x1=\"".concat(x(m), "\" x2=\"").concat(x(m), "\" y1=\"").concat(rows.rain[0], "\" y2=\"").concat(axisY, "\" class=\"tl-grid").concat(m % step ? '' : ' major', "\"/>"));
    if (m % step === 0 && m < m1) out.push("<text x=\"".concat(x(m), "\" y=\"").concat(H - 4, "\" class=\"tl-hour\">").concat(clock(m).n).concat(clock(m).ap === 'AM' ? 'a' : 'p', "</text>"));
  }
  // row labels
  out.push("<text x=\"4\" y=\"".concat(rows.rain[0] + 17, "\" class=\"tl-label\">Rain</text>"), "<text x=\"4\" y=\"".concat(rows.wind[0] + 14, "\" class=\"tl-label\">Wind</text><text x=\"4\" y=\"").concat(rows.wind[0] + 28, "\" class=\"tl-unit\">knots</text>"), "<text x=\"4\" y=\"".concat(rows.tide[0] + 14, "\" class=\"tl-label\">Tide</text><text x=\"4\" y=\"").concat(rows.tide[0] + 28, "\" class=\"tl-unit\">feet</text>"));

  // sky and temperature, every two (or three) hours
  var _iterator3 = _createForOfIteratorHelper(inWin),
    _step3;
  try {
    for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
      var _h = _step3.value;
      if ((_h.min - m0) % step || _h.temp == null) continue;
      var cx = x(_h.min + 30);
      out.push(wxIcon(_h["short"], _h.min >= sunrise && _h.min < sunset, 28).replace('<svg ', "<svg x=\"".concat(cx - 14, "\" y=\"2\" ")), "<text x=\"".concat(cx, "\" y=\"").concat(rows.sky[0] + 46, "\" class=\"tl-temp\">").concat(_h.temp, "\xB0</text>"));
    }
    // rain chance bars
  } catch (err) {
    _iterator3.e(err);
  } finally {
    _iterator3.f();
  }
  var rTop = rows.rain[0],
    rH = rows.rain[1];
  var _iterator4 = _createForOfIteratorHelper(inWin),
    _step4;
  try {
    for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
      var _h2 = _step4.value;
      if (!_h2.pop) continue;
      var bh = Math.max(2, _h2.pop / 100 * rH);
      out.push("<rect x=\"".concat(x(_h2.min) + 1, "\" y=\"").concat(rTop + rH - bh, "\" width=\"").concat(Math.max(1, x(_h2.min + 60) - x(_h2.min) - 2), "\" height=\"").concat(bh, "\" class=\"tl-rain\" rx=\"2\"/>"));
    }
  } catch (err) {
    _iterator4.e(err);
  } finally {
    _iterator4.f();
  }
  var wet = Math.max.apply(Math, [0].concat(_toConsumableArray(inWin.map(function (h) {
    return h.pop;
  }))));
  out.push("<text x=\"4\" y=\"".concat(rTop + 31, "\" class=\"tl-unit\">").concat(wet >= 20 ? "up to ".concat(wet, "%") : 'dry', "</text>"));

  // wind and gusts
  var wpts = inWin.filter(function (h) {
    return h.spd != null;
  });
  if (wpts.length > 1) {
    var wTop = rows.wind[0] + 4,
      wH = rows.wind[1] - 4,
      max = Math.max(20, Math.ceil(Math.max.apply(Math, _toConsumableArray(wpts.map(function (h) {
        return h.gst;
      }))) / 5) * 5);
    var y = function y(k) {
      return wTop + wH - k / max * wH;
    };
    var line = function line(k) {
      return wpts.map(function (h, i) {
        return "".concat(i ? 'L' : 'M').concat(x(h.min + 30).toFixed(1), ",").concat(y(h[k]).toFixed(1));
      }).join('');
    };
    out.push("<path d=\"".concat(line('gst'), "L").concat(x(wpts[wpts.length - 1].min + 30).toFixed(1), ",").concat(wTop + wH, "L").concat(x(wpts[0].min + 30).toFixed(1), ",").concat(wTop + wH, "Z\" class=\"tl-gust\"/>"), "<path d=\"".concat(line('spd'), "\" class=\"tl-wind\"/>"));
    var _iterator5 = _createForOfIteratorHelper([10, 20, 30].filter(function (k) {
        return k < max;
      })),
      _step5;
    try {
      for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
        var k = _step5.value;
        out.push("<text x=\"".concat(gut - 4, "\" y=\"").concat(y(k) + 4, "\" class=\"tl-tick\">").concat(k, "</text>"));
      }
    } catch (err) {
      _iterator5.e(err);
    } finally {
      _iterator5.f();
    }
    var _iterator6 = _createForOfIteratorHelper(wpts),
      _step6;
    try {
      for (_iterator6.s(); !(_step6 = _iterator6.n()).done;) {
        var h = _step6.value;
        if ((h.min - m0) % step === 0 && h.dir != null) out.push("<g transform=\"translate(".concat(x(h.min + 30), " ").concat(y(h.spd) - 12, ") rotate(").concat(h.dir + 180, ")\"><path d=\"M0,5V-5M-3.5,-1.5L0,-5 3.5,-1.5\" class=\"tl-arrow\"/></g>"));
      }
    } catch (err) {
      _iterator6.e(err);
    } finally {
      _iterator6.f();
    }
    var peak = wpts.reduce(function (a, b) {
      return b.gst > a.gst ? b : a;
    });
    out.push("<text x=\"".concat(x(peak.min + 30), "\" y=\"").concat(Math.max(wTop + 10, y(peak.gst) - 4), "\" class=\"tl-val\">G").concat(Math.round(peak.gst), "</text>"));
  }

  // tide
  var T = state.tides;
  if (T) {
    var di = dayDiff(dateKey(new Date()), key);
    var pts = T.curve.filter(function (p) {
      return p.dayIndex === di && p.min >= m0 - 30 && p.min <= m1 + 30;
    });
    if (pts.length > 1) {
      var vals = T.curve.map(function (p) {
          return p.v;
        }),
        lo = Math.min.apply(Math, _toConsumableArray(vals)) - 0.3,
        hi = Math.max.apply(Math, _toConsumableArray(vals)) + 0.3;
      var tTop = rows.tide[0] + 14,
        tH = rows.tide[1] - 30;
      var _y = function _y(v) {
        return tTop + tH - (v - lo) / (hi - lo) * tH;
      };
      var path = pts.map(function (p, i) {
        return "".concat(i ? 'L' : 'M').concat(x(p.min).toFixed(1), ",").concat(_y(p.v).toFixed(1));
      }).join('');
      out.push("<path d=\"".concat(path, "L").concat(x(pts[pts.length - 1].min).toFixed(1), ",").concat(tTop + tH + 14, "L").concat(x(pts[0].min).toFixed(1), ",").concat(tTop + tH + 14, "Z\" class=\"tl-tide-area\"/>"), "<path d=\"".concat(path, "\" class=\"tl-tide\"/>"));
      var _iterator7 = _createForOfIteratorHelper(T.hilo.filter(function (q) {
          return q.dayIndex === di && q.min >= m0 && q.min <= m1;
        })),
        _step7;
      try {
        for (_iterator7.s(); !(_step7 = _iterator7.n()).done;) {
          var p = _step7.value;
          var up = p.type === 'H',
            ty = up ? _y(p.v) - 7 : _y(p.v) + 15;
          out.push("<circle cx=\"".concat(x(p.min), "\" cy=\"").concat(_y(p.v), "\" r=\"3.5\" class=\"tl-dot ").concat(up ? 'hi' : 'lo', "\"/>"), "<text x=\"".concat(x(p.min), "\" y=\"").concat(ty, "\" class=\"tl-val\">").concat(up ? 'High' : 'Low', " ").concat(clock(p.min).n).concat(clock(p.min).ap === 'AM' ? 'a' : 'p', "</text>"));
        }
      } catch (err) {
        _iterator7.e(err);
      } finally {
        _iterator7.f();
      }
    }
  }

  // now
  if (isToday) {
    var nm = minutesOfDay(new Date());
    if (nm >= m0 && nm <= m1) out.push("<line x1=\"".concat(x(nm), "\" x2=\"").concat(x(nm), "\" y1=\"0\" y2=\"").concat(axisY, "\" class=\"tl-now\"/><text x=\"").concat(x(nm), "\" y=\"").concat(axisY - 3, "\" class=\"tl-now-t\">now</text>"));
  }
  el.innerHTML = "<svg width=\"".concat(W, "\" height=\"").concat(H, "\" viewBox=\"0 0 ").concat(W, " ").concat(H, "\">").concat(out.join(''), "</svg>");
}

// The rest of the week: sky, high and low, wind, and a dot for the selected activity
function renderWeek(state, fromKey) {
  var out = [];
  for (var i = 1; i <= 6; i++) {
    var _state$weather4;
    var key = addDays(fromKey, i),
      w = (_state$weather4 = state.weather) === null || _state$weather4 === void 0 ? void 0 : _state$weather4.byDay[key],
      p = w && (w.day || w.night);
    var hours = dayHours(state, key),
      judged = judgedHours(hours, key, false);
    var v = verdict(selected, judged, dayConditions(state, key));
    var label = keyLabel(key, 2)["short"];
    var when = v && v.lv < 2 && !v.all ? " \xB7 best ".concat(fmtRange(v.from, v.to)) : '';
    out.push("<button type=\"button\" class=\"wk\" data-key=\"".concat(key, "\" title=\"").concat(esc(ACTIVITIES[selected].name), ": ").concat(v ? LEVEL[v.lv] + ' · ' + esc(v.why) + when : 'no forecast yet', "\">\n      <span class=\"wk-day\">").concat(label, "</span>\n      <span class=\"wk-ic\">").concat(p ? wxIcon(p.shortForecast, !!w.day, 34) : '', "</span>\n      <span class=\"wk-t\">").concat(w && w.day ? "<b>".concat(w.day.temperature, "\xB0</b>") : '').concat(w && w.night ? " <small>".concat(w.night.temperature, "\xB0</small>") : '', "</span>\n      <span class=\"wk-w\">").concat(judged.some(function (h) {
      return h.spd != null;
    }) ? esc(windRange(judged)) : '', "</span>\n      <span class=\"wk-v\">").concat(v ? "<i class=\"dot lv-".concat(v.lv, "\"></i>").concat(LEVEL[v.lv]) : '', "</span>\n    </button>"));
  }
  document.getElementById('week').innerHTML = out.join('');
}

// ---------- fit one screen, night look ----------

function fitPlan() {
  var plan = document.getElementById('plan');
  if (plan.hidden) return;
  var top = plan.getBoundingClientRect().top + (window.pageYOffset || 0);
  // an iPad shows it all on one screen (the real window height: old iOS gets vh wrong); a phone scrolls
  plan.style.height = window.innerWidth >= 760 ? Math.max(560, window.innerHeight - top) + 'px' : '';
  var tl = document.getElementById('timeline');
  if (planState && Math.abs((tl._w || 0) - tl.clientWidth) + Math.abs((tl._h || 0) - tl.clientHeight) > 2) {
    tl._w = tl.clientWidth;
    tl._h = tl.clientHeight;
    var isToday = planKey === planInfo.todayKey;
    drawTimeline(planState, planKey, dayHours(planState, planKey), verdict(selected, isToday ? judgedHours(dayHours(planState, planKey), planKey, true) : judgedHours(dayHours(planState, planKey), planKey, false), dayConditions(planState, planKey)), isToday);
  }
}
var fitTimer = 0;
window.addEventListener('resize', function () {
  clearTimeout(fitTimer);
  fitTimer = setTimeout(fitPlan, 120);
});
window.addEventListener('orientationchange', function () {
  return setTimeout(fitPlan, 300);
});
function nightMode() {
  var sun = sunMoon(dateKey(new Date())).sun,
    now = Date.now();
  document.documentElement.classList.toggle('dark', now < sun.sunrise.getTime() - 20 * 6e4 || now > sun.sunset.getTime() + 20 * 6e4);
}

// keep it current on a stand: move "now", roll the verdicts on, and start a new day after midnight
setInterval(function () {
  if (!planState) return;
  if (dateKey(new Date()) !== planInfo.todayKey) startRefresh();else renderPlan(planState, planInfo);
}, 5 * 60000);

// ---------- taps: pick an activity, open a day, details, settings ----------

document.getElementById('acts').addEventListener('click', function (e) {
  var b = e.target.closest('.act');
  if (!b || !planState) return;
  selected = b.getAttribute('data-act');
  renderPlan(planState, planInfo);
});
function showDetails(key) {
  document.getElementById('plan').hidden = true;
  document.getElementById('details').hidden = false;
  renderSourceMap(sourceCell);
  if (sourceMap) setTimeout(function () {
    return sourceMap.invalidateSize();
  }, 50);
  var day = key && document.getElementById("d-".concat(key));
  if (day) day.scrollIntoView();else window.scrollTo(0, 0);
}
function showPlan() {
  document.getElementById('details').hidden = true;
  document.getElementById('plan').hidden = false;
  window.scrollTo(0, 0);
  fitPlan();
}
document.getElementById('week').addEventListener('click', function (e) {
  var b = e.target.closest('.wk');
  if (b) showDetails(b.getAttribute('data-key'));
});
document.getElementById('open-details').addEventListener('click', function () {
  return showDetails(planKey);
});
document.getElementById('open-about').addEventListener('click', function () {
  showDetails(null);
  document.getElementById('map').scrollIntoView();
});
document.getElementById('close-details').addEventListener('click', showPlan);
function renderSettings() {
  var full = settings.shown.length >= 4;
  document.getElementById('settings-body').innerHTML = Object.keys(ACTIVITIES).map(function (act) {
    var A = ACTIVITIES[act],
      on = settings.shown.includes(act),
      L = settings.limits[act];
    return "<div class=\"set-row".concat(on ? ' on' : '', "\">\n      <label class=\"set-show\">").concat(A.icon, "<input type=\"checkbox\" data-show=\"").concat(act, "\"").concat(on ? ' checked' : '').concat(!on && full ? ' disabled' : '', "> <b>").concat(A.name, "</b></label>\n      <div class=\"set-limits\">").concat(Object.keys(L).map(function (k) {
      return "<label>".concat(LIMIT_LABELS[k][0], " <input type=\"number\" inputmode=\"numeric\" data-act=\"").concat(act, "\" data-limit=\"").concat(k, "\" value=\"").concat(L[k], "\" min=\"0\" max=\"120\"> ").concat(LIMIT_LABELS[k][1], "</label>");
    }).join(''), "</div>\n    </div>");
  }).join('') + "<p class=\"set-note\">Show up to four. Limits are what counts as a good day for you; past them a tile turns amber, well past them red.</p>\n    <p class=\"set-note\">On a stand: in the iPad's Settings, Display &amp; Brightness \u2192 Auto-Lock \u2192 Never keeps the screen on, and Share \u2192 Add to Home Screen opens this full screen.</p>\n    <p class=\"set-note\"><button type=\"button\" class=\"link-btn\" id=\"reset-settings\">Back to the standard settings</button></p>";
}
document.getElementById('open-settings').addEventListener('click', function () {
  renderSettings();
  document.getElementById('settings').hidden = false;
});
document.getElementById('settings').addEventListener('change', function (e) {
  var t = e.target;
  if (t.hasAttribute('data-show')) {
    var act = t.getAttribute('data-show');
    settings.shown = t.checked ? settings.shown.concat(act).slice(0, 4) : settings.shown.filter(function (k) {
      return k !== act;
    });
    if (!settings.shown.length) settings.shown = [act];
    renderSettings();
  } else if (t.hasAttribute('data-limit')) {
    var n = parseFloat(t.value);
    if (!isNaN(n)) settings.limits[t.getAttribute('data-act')][t.getAttribute('data-limit')] = n;
  }
  saveSettings();
});
document.getElementById('settings').addEventListener('click', function (e) {
  if (e.target.id === 'reset-settings') {
    settings.shown = DEFAULT_SHOWN.slice();
    for (var _i2 = 0, _Object$keys2 = Object.keys(ACTIVITIES); _i2 < _Object$keys2.length; _i2++) {
      var k = _Object$keys2[_i2];
      settings.limits[k] = Object.assign({}, ACTIVITIES[k].limits);
    }
    saveSettings();
    renderSettings();
  } else if (e.target.id === 'close-settings' || e.target.id === 'settings') {
    document.getElementById('settings').hidden = true;
    if (planState) renderPlan(planState, planInfo);
  }
});
