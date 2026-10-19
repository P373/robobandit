// Built from weather/src/plan.js by tools/build-weather.js (plain ES5, for old iPads). Edit the source, not this file.
'use strict';

// The one-screen plan: can I do my thing today, and when? A verdict for each activity, one timeline for the
// day (sky, rain, wind and tide on the same clock), and the rest of the week in a row. Everything else
// (the 7-day cards, the map, the credits) is one tap away. app.js loads the data and calls renderPlan().
// Loaded before app.js; it only uses app.js's helpers once renderPlan() is called.

// ---------- activities: what each needs, with limits you can change (saved on this iPad) ----------
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
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
    return worst([c.boatAlert && [c.boatLv, c.boatAlert], h.thunder && [2, 'Thunderstorms'], h.spd != null && (h.spd >= L.wind + 5 || h.gst >= L.gust + 5) && [2, "Wind ".concat(kt(h))], h.spd != null && (h.spd >= L.wind || h.gst >= L.gust) && [1, "Wind ".concat(kt(h))], c.seas != null && c.seas >= L.seas + 2 && [2, "Seas ".concat(c.seasTxt)], c.seas != null && c.seas >= L.seas && [1, "Seas ".concat(c.seasTxt)], h.pop >= 60 && [1, "Rain likely (".concat(h.pop, "%)")]]);
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
    return worst([c.boatAlert && [c.boatLv, c.boatAlert], h.thunder && [2, 'Thunderstorms'], h.spd != null && (h.spd >= L.wind + 5 || h.gst >= L.wind + 10) && [2, "Wind ".concat(kt(h))], h.spd != null && (h.spd >= L.wind || h.gst >= L.wind + 5) && [1, "Wind ".concat(kt(h))], c.seas != null && c.seas >= 3 && [2, "Seas ".concat(c.seasTxt)], c.seas != null && c.seas >= 2 && [1, "Seas ".concat(c.seasTxt)], c.water != null && c.water < L.water && [1, "Cold water, ".concat(Math.round(c.water), "\xB0")]]);
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
      snow: !!(f && /snow|sleet|flurr/i.test(f["short"])),
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

// alerts that matter on the water: warnings and advisories mean not today, a watch means caution
var BOAT_ALERT = /small craft|brisk wind|gale|storm warning|storm watch|storm surge|hurricane|tropical|hazardous seas|freezing spray|special marine|tsunami|extreme wind|waterspout/i;
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
  var boatAlert = alert ? alert.event : headline ? titleCase(headline.replace(/\s+IN EFFECT.*$/i, '')) : '';
  return {
    seas: seas,
    seasTxt: seasTxt,
    water: state.waterTemp,
    boatAlert: boatAlert,
    boatLv: /watch$/i.test(boatAlert) ? 1 : 2
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
    n: top.length,
    hours: rated.map(function (r) {
      return {
        min: r.h.min,
        lv: r.lv,
        why: r.why
      };
    })
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
  planKey = null,
  expanded = false,
  planV = null;
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
  // a small muted green, yellow or red box around each activity's icon: do it, maybe, or not today;
  // tap one to open it (the why, the best window, every hour, your limits)
  var whenOf = function whenOf(v) {
    return v.lv === 2 ? '' : v.all ? started ? "now until ".concat(clock(v.to).n, " ").concat(clock(v.to).ap) : 'all day' : "best ".concat(fmtRange(v.from, v.to));
  };
  document.getElementById('acts').innerHTML = settings.shown.map(function (act) {
    var v = verdicts[act] = verdict(act, judged, cond);
    var A = ACTIVITIES[act];
    var say = v ? "".concat(A.name, ": ").concat(LEVEL[v.lv], " \xB7 ").concat(v.why).concat(whenOf(v) ? " \xB7 ".concat(whenOf(v)) : '') : "".concat(A.name, ": forecast not in yet");
    return "<button type=\"button\" class=\"act".concat(v ? " lv-".concat(v.lv) : '').concat(act === selected ? ' on' : '', "\" data-act=\"").concat(act, "\" aria-pressed=\"").concat(act === selected, "\" aria-expanded=\"").concat(act === selected && expanded, "\" aria-label=\"").concat(esc(say), "\" title=\"").concat(esc(say), "\">\n      ").concat(A.icon, "<span class=\"act-name\">").concat(A.name, "</span></button>");
  }).join('') + (expanded ? actDetail(selected, verdicts[selected], whenOf) : '');
  planV = verdicts[selected];
  drawTimeline(state, planV);
  renderWeek(state, planKey);
  var stale = info.stale.length ? " \xB7 showing saved ".concat(info.stale.map(function (s) {
    return s[0].toLowerCase();
  }).join(', ')) : '';
  document.getElementById('plan-updated').textContent = "Updated ".concat(fmt(new Date())).concat(stale).concat(info.missing.length ? " \xB7 no ".concat(info.missing.join(', ').toLowerCase()) : '');
  nightMode();
  tickClock();
  var tl = document.getElementById('timeline');
  tl._w = 0; // make fitPlan redraw the timeline at its final size
  fitPlan();
}
// The tapped activity, opened: the verdict and best window, why, every daylight hour in colour, and your limits
function actDetail(act, v, whenOf) {
  var A = ACTIVITIES[act],
    L = settings.limits[act];
  if (!v) return "<div class=\"act-detail\"><b>".concat(A.name, "</b>: the forecast isn't in yet.</div>");
  var cells = v.hours.map(function (h) {
    return "<i class=\"ad-h lv-".concat(h.lv, "\" title=\"").concat(clock(h.min).n, " ").concat(clock(h.min).ap, ": ").concat(esc(LEVEL[h.lv])).concat(h.why ? ' · ' + esc(h.why) : '', "\"></i>");
  }).join('');
  var marks = v.hours.map(function (h, i) {
    return i % 3 ? '' : "<span style=\"left:".concat(i / v.hours.length * 100, "%\">").concat(clock(h.min).n).concat(clock(h.min).ap === 'AM' ? 'a' : 'p', "</span>");
  }).join('');
  var limits = Object.keys(L).map(function (k) {
    return "".concat(LIMIT_LABELS[k][0].toLowerCase(), " ").concat(L[k]).concat(LIMIT_LABELS[k][1] === '°' ? '°' : ' ' + LIMIT_LABELS[k][1]);
  }).join(' · ');
  return "<div class=\"act-detail lv-".concat(v.lv, "\">\n    <div class=\"ad-head\"><b class=\"ad-verdict\">").concat(A.name, ": ").concat(LEVEL[v.lv], "</b>").concat(whenOf(v) ? "<span class=\"ad-when\">".concat(esc(whenOf(v)), "</span>") : '', "<span class=\"ad-why\">").concat(esc(v.why), "</span></div>\n    <div class=\"ad-hours\">").concat(cells, "</div><div class=\"ad-marks\">").concat(marks, "</div>\n    <p class=\"ad-lim\">Your limits: ").concat(esc(limits), " <button type=\"button\" class=\"link-btn\" data-settings>Change</button></p>\n  </div>");
}
var sunMoonMin = function sunMoonMin(key, which) {
  return minutesOfDay(sunMoon(key).sun[which]);
};

// One rolling clock: from 15 minutes ago to 12 hours ahead (through the night and into tomorrow when it's late),
// with sky and temperature, rain, wind and tide lined up, night shaded, midnight and now marked, and the tapped
// activity's best window as a band
function drawTimeline(state, v) {
  var el = document.getElementById('timeline');
  var W = Math.max(300, el.clientWidth),
    H = Math.max(200, el.clientHeight);
  var todayKey = planInfo ? planInfo.todayKey : dateKey(new Date()),
    tomorrow = addDays(todayKey, 1);
  var now = Date.now(),
    t0 = now - 15 * 6e4,
    t1 = now + 12 * 36e5;
  var gut = 58,
    padR = 10,
    x = function x(t) {
      return gut + (Math.min(t1, Math.max(t0, t)) - t0) / (t1 - t0) * (W - gut - padR);
    };
  // rows: sky and temperature, rain chance, wind (arrow and speed), and the tide gets the rest; all scale with the height
  var avail = H - 22,
    fit = function fit(f, lo, hi) {
      return Math.round(Math.min(hi, Math.max(lo, avail * f)));
    };
  var skyH = fit(0.25, 40, 54),
    rainH = fit(0.12, 20, 26),
    windH = fit(0.22, 36, 50);
  var rows = {
    sky: [0, skyH],
    rain: [skyH + 4, rainH],
    wind: [skyH + rainH + 8, windH]
  };
  rows.tide = [rows.wind[0] + windH + 4, Math.max(30, avail - (rows.wind[0] + windH + 4) - 2)];
  var iconS = skyH < 48 ? 22 : 28;
  var axisY = H - 18;
  var hours = dayHours(state, todayKey).concat(dayHours(state, tomorrow)).filter(function (h) {
    return h.t + 36e5 > t0 && h.t < t1;
  });
  var s0 = sunMoon(todayKey).sun,
    s1 = sunMoon(tomorrow).sun;
  var isDay = function isDay(t) {
    return t >= s0.sunrise && t < s0.sunset || t >= s1.sunrise && t < s1.sunset;
  };
  var out = [];

  // night, then the tapped activity's best window (for the planned day)
  // night from last light to first light; dawn (first light to sunrise) and dusk (sunset to last light) in a softer, warm shade
  var band = function band(a, b, cls) {
    if (b > t0 && a < t1) out.push("<rect x=\"".concat(x(a), "\" y=\"0\" width=\"").concat(x(b) - x(a), "\" height=\"").concat(axisY, "\" class=\"").concat(cls, "\"/>"));
  };
  for (var _i2 = 0, _arr = [[t0, +s0.dawn], [+s0.dusk, +s1.dawn], [+s1.dusk, t1]]; _i2 < _arr.length; _i2++) {
    var _arr$_i = _slicedToArray(_arr[_i2], 2),
      a = _arr$_i[0],
      b = _arr$_i[1];
    band(a, b, 'tl-night');
  }
  for (var _i3 = 0, _arr2 = [[+s0.dawn, +s0.sunrise], [+s0.sunset, +s0.dusk], [+s1.dawn, +s1.sunrise], [+s1.sunset, +s1.dusk]]; _i3 < _arr2.length; _i3++) {
    var _arr2$_i = _slicedToArray(_arr2[_i3], 2),
      _a = _arr2$_i[0],
      _b = _arr2$_i[1];
    band(_a, _b, 'tl-twilight');
  }
  if (v && v.n) {
    var m0 = localMidnight(planKey).getTime(),
      _a2 = m0 + v.from * 6e4,
      _b2 = m0 + v.to * 6e4;
    if (_b2 > t0 && _a2 < t1) out.push("<rect x=\"".concat(x(_a2), "\" y=\"0\" width=\"").concat(x(_b2) - x(_a2), "\" height=\"").concat(axisY, "\" class=\"tl-win lv-").concat(v.lv, "\" rx=\"6\"/>"));
  }
  // hours, labels, and midnight
  var stepH = W < 560 ? 3 : 2;
  for (var t = Math.ceil(t0 / 36e5) * 36e5; t <= t1; t += 36e5) {
    var m = minutesOfDay(new Date(t)),
      hr = Math.round(m / 60) % 24,
      midnight = m === 0;
    out.push("<line x1=\"".concat(x(t), "\" x2=\"").concat(x(t), "\" y1=\"").concat(midnight ? 0 : rows.rain[0], "\" y2=\"").concat(axisY, "\" class=\"tl-grid").concat(hr % stepH ? '' : ' major').concat(midnight ? ' tl-midnight' : '', "\"/>"));
    if (midnight) out.push("<text x=\"".concat(x(t) + 4, "\" y=\"").concat(rows.rain[0] - 4, "\" class=\"tl-day\">").concat(keyLabel(dateKey(new Date(t)), 2)["short"], "</text>"));
    if (hr % stepH === 0 && t < t1 - 18e5) out.push("<text x=\"".concat(x(t), "\" y=\"").concat(H - 4, "\" class=\"tl-hour\">").concat(clock(m).n).concat(clock(m).ap === 'AM' ? 'a' : 'p', "</text>"));
  }
  // row labels, each centred beside its graph
  var mid = {
    rain: rows.rain[0] + rows.rain[1] / 2,
    wind: rows.wind[0] + rows.wind[1] / 2,
    tide: rows.tide[0] + rows.tide[1] / 2
  };
  out.push("<text x=\"4\" y=\"".concat(mid.rain - 2, "\" class=\"tl-label\">Rain</text>"), "<text x=\"4\" y=\"".concat(mid.wind - 2, "\" class=\"tl-label\">Wind</text><text x=\"4\" y=\"").concat(mid.wind + 11, "\" class=\"tl-unit\">knots</text>"), "<text x=\"4\" y=\"".concat(mid.tide - 2, "\" class=\"tl-label\">Tide</text><text x=\"4\" y=\"").concat(mid.tide + 11, "\" class=\"tl-unit\">feet</text>"));

  // sky and temperature on the labelled hours
  var _iterator3 = _createForOfIteratorHelper(hours),
    _step3;
  try {
    for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
      var h = _step3.value;
      if (Math.round(h.min / 60) % stepH || h.temp == null || h.t < t0) continue;
      var cx = x(h.t + 18e5);
      out.push(wxIcon(h["short"], isDay(h.t + 18e5), iconS).replace('<svg ', "<svg x=\"".concat(cx - iconS / 2, "\" y=\"2\" ")), "<text x=\"".concat(cx, "\" y=\"").concat(skyH - 6, "\" class=\"tl-temp\">").concat(h.temp, "\xB0</text>"));
    }
    // rain: the chance on each labelled hour, blue once it's worth noticing; ⚡ for thunderstorms and ❄ for snow on any hour
  } catch (err) {
    _iterator3.e(err);
  } finally {
    _iterator3.f();
  }
  var sym = function sym(h) {
    return h.thunder ? '⚡' : h.snow ? '❄' : '';
  };
  var _iterator4 = _createForOfIteratorHelper(hours),
    _step4;
  try {
    for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
      var _h = _step4.value;
      if (_h.t < t0 - 18e5) continue;
      if (Math.round(_h.min / 60) % stepH === 0 && _h.t >= t0) {
        out.push("<text x=\"".concat(x(_h.t + 18e5), "\" y=\"").concat(mid.rain + 5, "\" class=\"tl-pop").concat(_h.pop >= 30 ? ' wet' : '', "\">").concat(_h.pop, "%").concat(sym(_h) ? "<tspan class=\"tl-sym\"> ".concat(sym(_h), "</tspan>") : '', "</text>"));
      } else if (sym(_h)) out.push("<text x=\"".concat(x(_h.t + 18e5), "\" y=\"").concat(mid.rain + 5, "\" class=\"tl-sym\">").concat(sym(_h), "</text>"));
    }
  } catch (err) {
    _iterator4.e(err);
  } finally {
    _iterator4.f();
  }
  var wet = Math.max.apply(Math, [0].concat(_toConsumableArray(hours.map(function (h) {
    return h.pop;
  }))));
  out.push("<text x=\"4\" y=\"".concat(mid.rain + 11, "\" class=\"tl-unit\">").concat(wet >= 20 ? "up to ".concat(wet, "%") : 'dry', "</text>"));

  // wind: on each labelled hour, an arrow the way it blows and the speed (and gusts when they're well above it)
  var wpts = hours.filter(function (h) {
    return h.spd != null;
  });
  var _iterator5 = _createForOfIteratorHelper(wpts),
    _step5;
  try {
    for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
      var _h2 = _step5.value;
      if (Math.round(_h2.min / 60) % stepH || _h2.t < t0) continue;
      var _cx = x(_h2.t + 18e5),
        spd = Math.round(_h2.spd),
        gst = Math.round(_h2.gst);
      if (_h2.dir != null) out.push("<g transform=\"translate(".concat(_cx, " ").concat(mid.wind - windH * 0.18, ") rotate(").concat(_h2.dir + 180, ") scale(").concat(windH < 44 ? 0.8 : 1, ")\"><path d=\"M0,8V-8M-5,-3L0,-8 5,-3\" class=\"tl-warrow\"/></g>"));
      out.push("<text x=\"".concat(_cx, "\" y=\"").concat(mid.wind + windH * 0.36, "\" class=\"tl-wspd\">").concat(spd).concat(gst > spd + 3 ? "<tspan class=\"tl-gst\"> G".concat(gst, "</tspan>") : '', "</text>"));
    }

    // tide (its times are minutes from today's local midnight)
  } catch (err) {
    _iterator5.e(err);
  } finally {
    _iterator5.f();
  }
  var T = state.tides;
  var tidePts = [];
  if (T) {
    var midnight0 = localMidnight(todayKey).getTime(),
      at = function at(p) {
        return midnight0 + p.abs * 6e4;
      };
    var pts = T.curve.filter(function (p) {
      return at(p) >= t0 - 18e5 && at(p) <= t1 + 18e5;
    });
    tidePts = pts.map(function (p) {
      return {
        t: at(p),
        v: p.v
      };
    });
    if (pts.length > 1) {
      // scaled to the whole year's range when we have it, so today's tides show how big or small they are
      var st = T.stats,
        vals = T.curve.map(function (p) {
          return p.v;
        });
      var lo = Math.min.apply(Math, [st ? st.minLow.v : Infinity].concat(_toConsumableArray(vals))) - 0.25,
        hi = Math.max.apply(Math, [st ? st.maxHigh.v : -Infinity].concat(_toConsumableArray(vals))) + 0.25;
      var tTop = rows.tide[0] + 12,
        tH = Math.max(12, rows.tide[1] - 26);
      var y = function y(val) {
        return tTop + tH - (val - lo) / (hi - lo) * tH;
      };
      if (st) {
        // muted, behind today's line: a typical high-to-low band, and the year's highest and lowest tides
        out.push("<rect x=\"".concat(gut, "\" y=\"").concat(y(st.avgHigh), "\" width=\"").concat(W - gut - padR, "\" height=\"").concat(Math.max(1, y(st.avgLow) - y(st.avgHigh)), "\" class=\"tl-tide-typ\"/>"), "<line x1=\"".concat(gut, "\" x2=\"").concat(W - padR, "\" y1=\"").concat(y(st.maxHigh.v), "\" y2=\"").concat(y(st.maxHigh.v), "\" class=\"tl-tide-ext\"/>"), "<line x1=\"".concat(gut, "\" x2=\"").concat(W - padR, "\" y1=\"").concat(y(st.minLow.v), "\" y2=\"").concat(y(st.minLow.v), "\" class=\"tl-tide-ext\"/>"), "<text x=\"".concat(W - padR - 4, "\" y=\"").concat(y(st.maxHigh.v) - 3, "\" class=\"tl-tide-lbl\">Year high ").concat(st.maxHigh.v.toFixed(1), " ft</text>"), "<text x=\"".concat(W - padR - 4, "\" y=\"").concat(y(st.minLow.v) + 11, "\" class=\"tl-tide-lbl\">Year low ").concat(st.minLow.v.toFixed(1), " ft</text>"));
      }
      var path = pts.map(function (p, i) {
        return "".concat(i ? 'L' : 'M').concat(x(at(p)).toFixed(1), ",").concat(y(p.v).toFixed(1));
      }).join('');
      out.push("<path d=\"".concat(path, "L").concat(x(at(pts[pts.length - 1])).toFixed(1), ",").concat(tTop + tH + 14, "L").concat(x(at(pts[0])).toFixed(1), ",").concat(tTop + tH + 14, "Z\" class=\"tl-tide-area\"/>"), "<path d=\"".concat(path, "\" class=\"tl-tide\"/>"));
      var _iterator6 = _createForOfIteratorHelper(T.hilo.filter(function (q) {
          return at(q) >= t0 && at(q) <= t1;
        })),
        _step6;
      try {
        for (_iterator6.s(); !(_step6 = _iterator6.n()).done;) {
          var p = _step6.value;
          var up = p.type === 'H',
            ty = up ? y(p.v) - 7 : y(p.v) + 15;
          out.push("<circle cx=\"".concat(x(at(p)), "\" cy=\"").concat(y(p.v), "\" r=\"3.5\" class=\"tl-dot ").concat(up ? 'hi' : 'lo', "\"/>"), "<text x=\"".concat(x(at(p)), "\" y=\"").concat(ty, "\" class=\"tl-val\">").concat(up ? 'High' : 'Low', " ").concat(clock(p.min).n).concat(clock(p.min).ap === 'AM' ? 'a' : 'p', "</text>"));
        }
      } catch (err) {
        _iterator6.e(err);
      } finally {
        _iterator6.f();
      }
    }
  }

  // now stays marked faintly; the slider (drawn over the top) starts there
  out.push("<line x1=\"".concat(x(now), "\" x2=\"").concat(x(now), "\" y1=\"0\" y2=\"").concat(axisY, "\" class=\"tl-now-dash\"/>"));
  el.innerHTML = "<svg width=\"".concat(W, "\" height=\"").concat(H, "\" viewBox=\"0 0 ").concat(W, " ").concat(H, "\">").concat(out.join(''), "</svg><div class=\"tl-scrub\"></div>");
  tlModel = {
    t0: t0,
    t1: t1,
    W: W,
    H: H,
    gut: gut,
    padR: padR,
    x: x,
    axisY: axisY,
    mid: mid,
    hours: hours,
    wind: wpts.map(function (h) {
      return {
        t: h.t + 18e5,
        spd: h.spd,
        gst: h.gst,
        dir: h.dir
      };
    }),
    tide: tidePts
  };
  setScrub(scrubAt != null ? scrubAt : now);
}

// ---------- the slider: drag the red line (or tap) to read the forecast at any time ----------

var tlModel = null,
  scrubAt = null,
  scrubBack = 0;
var lerpAt = function lerpAt(pts, t, k) {
  if (!pts.length) return null;
  if (t <= pts[0].t) return pts[0][k];
  for (var i = 1; i < pts.length; i++) if (t <= pts[i].t) {
    var a = pts[i - 1],
      b = pts[i];
    return a[k] + (b[k] - a[k]) * ((t - a.t) / (b.t - a.t));
  }
  return pts[pts.length - 1][k];
};
function setScrub(t) {
  var m = tlModel;
  if (!m) return;
  t = Math.min(m.t1, Math.max(m.t0, t));
  var X = m.x(t),
    isNow = Math.abs(t - Date.now()) < 3 * 6e4,
    mm = minutesOfDay(new Date(t));
  var hour = m.hours.filter(function (h) {
    return t >= h.t && t < h.t + 36e5;
  })[0];
  var near = m.wind.length ? m.wind.reduce(function (a, b) {
    return Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a;
  }) : null;
  var spd = lerpAt(m.wind, t, 'spd'),
    gst = lerpAt(m.wind, t, 'gst'),
    tv = lerpAt(m.tide, t, 'v'),
    tv2 = lerpAt(m.tide, t + 15 * 6e4, 'v');
  var reads = [[10, "".concat(isNow ? 'Now' : "".concat(clock(Math.round(mm / 5) * 5).n, " ").concat(clock(mm).ap)).concat(hour && hour.temp != null ? " \xB7 ".concat(hour.temp, "\xB0") : '').concat(isNow ? ' ↔' : ''), 'time'], [m.mid.rain, hour ? "".concat(hour.pop, "%").concat(hour.thunder ? ' ⚡ storms' : hour.snow ? ' ❄ snow' : '') : ''], [m.mid.wind, spd != null ? "".concat(compass(near.dir), " ").concat(Math.round(spd)).concat(gst > spd + 3 ? " G".concat(Math.round(gst)) : '', " kt") : ''], [m.mid.tide, tv != null ? "".concat(tv.toFixed(1), " ft ").concat(tv2 > tv + 0.02 ? '↑' : tv2 < tv - 0.02 ? '↓' : '') : '']].filter(function (r) {
    return r[1];
  });
  var pills = reads.map(function (_ref) {
    var _ref2 = _slicedToArray(_ref, 3),
      y = _ref2[0],
      txt = _ref2[1],
      cls = _ref2[2];
    var w = txt.length * (cls ? 7.6 : 7) + 12,
      left = X + w + 10 > m.W ? X - w - 6 : X + 6;
    return "<rect x=\"".concat(left, "\" y=\"").concat(y - 10, "\" width=\"").concat(w, "\" height=\"19\" rx=\"5\" class=\"tl-pill").concat(cls ? ' ' + cls : '', "\"/><text x=\"").concat(left + w / 2, "\" y=\"").concat(y + 4, "\" class=\"tl-read").concat(cls ? ' ' + cls : '', "\">").concat(esc(txt), "</text>");
  }).join('');
  document.querySelector('#timeline .tl-scrub').innerHTML = "<svg width=\"".concat(m.W, "\" height=\"").concat(m.H, "\" viewBox=\"0 0 ").concat(m.W, " ").concat(m.H, "\">\n    <line x1=\"").concat(X, "\" x2=\"").concat(X, "\" y1=\"0\" y2=\"").concat(m.axisY, "\" class=\"tl-now\"/><circle cx=\"").concat(X, "\" cy=\"").concat(m.axisY - 1, "\" r=\"7\" class=\"tl-knob\"/>").concat(pills, "</svg>");
}
(function () {
  var el = document.getElementById('timeline');
  var dragging = false;
  var toT = function toT(cx) {
    var m = tlModel,
      r = el.getBoundingClientRect();
    return m.t0 + (cx - r.left - m.gut) / (m.W - m.gut - m.padR) * (m.t1 - m.t0);
  };
  var go = function go(cx) {
    scrubAt = Math.min(tlModel.t1, Math.max(tlModel.t0, toT(cx)));
    setScrub(scrubAt);
  };
  var start = function start(cx) {
    if (!tlModel) return;
    dragging = true;
    clearTimeout(scrubBack);
    go(cx);
  };
  var move = function move(cx) {
    if (dragging) go(cx);
  };
  var end = function end() {
    if (!dragging) return;
    dragging = false;
    clearTimeout(scrubBack);
    scrubBack = setTimeout(function () {
      scrubAt = null;
      setScrub(Date.now());
    }, 10000); // back to now after a while
  };
  el.addEventListener('touchstart', function (e) {
    start(e.touches[0].clientX);
    e.preventDefault();
  }, false);
  el.addEventListener('touchmove', function (e) {
    move(e.touches[0].clientX);
    e.preventDefault();
  }, false);
  el.addEventListener('touchend', end, false);
  el.addEventListener('touchcancel', end, false);
  el.addEventListener('mousedown', function (e) {
    start(e.clientX);
    e.preventDefault();
  });
  window.addEventListener('mousemove', function (e) {
    return move(e.clientX);
  });
  window.addEventListener('mouseup', end);
  el.addEventListener('keydown', function (e) {
    if (!tlModel || e.keyCode !== 37 && e.keyCode !== 39) return;
    e.preventDefault();
    clearTimeout(scrubBack);
    scrubAt = Math.min(tlModel.t1, Math.max(tlModel.t0, (scrubAt != null ? scrubAt : Date.now()) + (e.keyCode === 39 ? 15 : -15) * 6e4));
    setScrub(scrubAt);
    scrubBack = setTimeout(function () {
      scrubAt = null;
      setScrub(Date.now());
    }, 10000);
  });
})();

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
  var tl = document.getElementById('timeline');
  // An iPad shows it all on one screen: every row takes the height its content needs and the timeline gets the
  // rest of the real window height (old iOS gets vh wrong, and old Safari stretches flex and grid rows). A phone scrolls.
  if (window.innerWidth >= 760) {
    var top = plan.getBoundingClientRect().top + (window.pageYOffset || 0);
    tl.style.height = '190px';
    var rest = plan.offsetHeight - tl.offsetHeight; // the tiles, the week, the footer, gaps and padding
    tl.style.height = Math.max(190, Math.floor(window.innerHeight - top - rest)) + 'px';
  } else tl.style.height = '';
  if (planState && Math.abs((tl._w || 0) - tl.clientWidth) + Math.abs((tl._h || 0) - tl.clientHeight) > 2) {
    tl._w = tl.clientWidth;
    tl._h = tl.clientHeight;
    drawTimeline(planState, planV);
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

// Light colours only between sunrise and sunset; the page starts dark (see index.html) so a refresh at night never flashes white
function nightMode() {
  var sun = sunMoon(dateKey(new Date())).sun,
    now = Date.now();
  document.documentElement.classList.toggle('dark', now < sun.sunrise.getTime() || now >= sun.sunset.getTime());
}

// ---------- the clock, and the night clock ----------

function tickClock() {
  nightMode();
  var now = new Date(),
    c = clock(minutesOfDay(now));
  document.getElementById('clock').innerHTML = "".concat(c.n.indexOf(':') < 0 ? c.n + ':00' : c.n, "<small>").concat(c.ap, "</small>");
  nightClock();
}
// From 11 PM until half an hour before sunrise: a nearly black screen with just the time, the temperature and the
// sunrise (an iPad can't dim its own screen, but a black page is far gentler in a dark kitchen). Touch to wake it
// for two minutes.
var wokeAt = 0;
function nightClock() {
  var el = document.getElementById('nightclock'),
    now = new Date(),
    m = minutesOfDay(now);
  var today = dateKey(now),
    sun = sunMoon(today).sun;
  var show = (m >= 23 * 60 || now.getTime() < sun.sunrise.getTime() - 30 * 6e4) && Date.now() - wokeAt > 2 * 6e4;
  if (show) {
    var c = clock(m),
      rise = now.getTime() < sun.sunrise.getTime() ? sun.sunrise : sunMoon(addDays(today, 1)).sun.sunrise;
    var n = planState && planState.weather && planState.weather.now;
    var alert = document.querySelector('#now .cond-alert');
    el.innerHTML = "<div class=\"nc-time\">".concat(c.n.indexOf(':') < 0 ? c.n + ':00' : c.n, "<small>").concat(c.ap, "</small></div>\n      ").concat(n ? "<div class=\"nc-line\">".concat(n.temperature, "\xB0 \xB7 ").concat(esc(n.shortForecast), "</div>") : '', "\n      <div class=\"nc-line\">Sunrise ").concat(fmt(rise), "</div>\n      ").concat(alert ? "<div class=\"nc-line nc-alert\">".concat(esc(alert.getAttribute('title').split(' · ')[0]), "</div>") : '', "\n      <div class=\"nc-hint\">Touch to wake</div>");
  }
  if (el.hidden === show) el.hidden = !show;
}
document.getElementById('nightclock').addEventListener('click', function () {
  wokeAt = Date.now();
  nightClock();
  fitPlan();
});
setInterval(tickClock, 10000);

// ---------- which forecasts loaded, and when ----------

function renderHealth() {
  var list = planInfo && planInfo.health || [];
  var ver = ((document.querySelector('script[src*="plan.js"]') || {}).src || '').replace(/^.*[?&]v=/, '');
  document.getElementById('health-body').innerHTML = "<ul class=\"health-list\">".concat(list.map(function (h) {
    return "<li class=\"".concat(h.ok ? 'ok' : h.savedAt ? 'saved' : 'bad', "\">\n      <i class=\"dot ").concat(h.ok ? 'lv-0' : h.savedAt ? 'lv-1' : 'lv-2', "\"></i><b>").concat(esc(h.name), "</b>\n      <span>").concat(h.ok ? 'loaded' : h.savedAt ? "couldn't load; showing the copy from ".concat(esc(fmtWhen(new Date(h.savedAt).toISOString()))) : "couldn\u2019t load").concat(!h.ok && h.error ? " <small>(".concat(esc(h.error), ")</small>") : '', "</span></li>");
  }).join(''), "</ul>\n    <p class=\"set-note\">Checked ").concat(esc(fmt(new Date())), "; it checks again every ").concat(CONFIG.refreshMinutes, " minutes. Page version ").concat(esc(ver || 'unknown'), " \xB7 ").concat(esc(navigator.userAgent.replace(/^.*?\(([^)]*)\).*$/, '$1')), "</p>");
}
document.getElementById('plan-updated').addEventListener('click', function () {
  renderHealth();
  document.getElementById('health').hidden = false;
});
document.getElementById('health').addEventListener('click', function (e) {
  if (e.target.id === 'close-health' || e.target.id === 'health') document.getElementById('health').hidden = true;
});

// keep it current on a stand: move "now", roll the verdicts on, and start a new day after midnight
setInterval(function () {
  if (!planState) return;
  if (dateKey(new Date()) !== planInfo.todayKey) startRefresh();else renderPlan(planState, planInfo);
}, 5 * 60000);

// ---------- taps: pick an activity, open a day, details, settings ----------

document.getElementById('acts').addEventListener('click', function (e) {
  if (e.target.closest('[data-settings]')) {
    document.getElementById('open-settings').click();
    return;
  }
  var b = e.target.closest('.act');
  if (!b || !planState) return;
  var act = b.getAttribute('data-act');
  expanded = act === selected ? !expanded : true; // tap again to close
  selected = act;
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
    for (var _i4 = 0, _Object$keys2 = Object.keys(ACTIVITIES); _i4 < _Object$keys2.length; _i4++) {
      var k = _Object$keys2[_i4];
      settings.limits[k] = Object.assign({}, ACTIVITIES[k].limits);
    }
    saveSettings();
    renderSettings();
  } else if (e.target.id === 'close-settings' || e.target.id === 'settings') {
    document.getElementById('settings').hidden = true;
    if (planState) renderPlan(planState, planInfo);
  }
});
