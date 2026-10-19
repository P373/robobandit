// Built from weather/src/app.js by tools/build-weather.js (plain ES5, for old iPads). Edit the source, not this file.
'use strict';

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, e) { if ("object" != _typeof(t) || !t) return t; var r; if ("undefined" != typeof Symbol && void 0 !== (r = t[Symbol.toPrimitive])) { var i = r.call(t, e || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === e ? String : Number)(t); }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
var CONFIG = {
  lat: 41.6565,
  lon: -70.6205,
  tz: 'America/New_York',
  tideStation: '8447685',
  // Chappaquoit Point, West Falmouth
  waterTempStation: '8447930',
  // Woods Hole
  marineZone: 'ANZ234',
  // Buzzards Bay
  marineOffice: 'BOX',
  buoy: 'BUZM3',
  // Buzzards Bay tower (NDBC), via the NWS observations API
  waterLevelStation: '8447930',
  // Woods Hole: observed vs. predicted water level
  currentStations: [
  // Flow directions come from NOAA; these just say where each direction leads.
  {
    id: 'COD0904',
    bin: 15,
    name: 'Cape Cod Canal · Railroad Bridge',
    floodTo: 'Cape Cod Bay',
    ebbTo: 'Buzzards Bay'
  }, {
    id: 'COD0911',
    bin: 1,
    name: 'Woods Hole · The Strait',
    floodTo: 'Vineyard Sound',
    ebbTo: 'Buzzards Bay'
  }],
  days: 7,
  refreshMinutes: 30
};

// ---------- time helpers (everything is displayed in Megansett local time) ----------

// en-US numbers, rearranged by hand: old Safari (iOS 10) ignores hourCycle and can't be trusted with en-CA dates
var fmtKey = new Intl.DateTimeFormat('en-US', {
  timeZone: CONFIG.tz,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});
var fmtHM24 = new Intl.DateTimeFormat('en-US', {
  timeZone: CONFIG.tz,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});
var fmtTime = new Intl.DateTimeFormat('en-US', {
  timeZone: CONFIG.tz,
  hour: 'numeric',
  minute: '2-digit'
});
var dateKey = function dateKey(d) {
  var _fmtKey$format$replac = fmtKey.format(d).replace(/[^\d/]/g, '').split('/'),
    _fmtKey$format$replac2 = _slicedToArray(_fmtKey$format$replac, 3),
    m = _fmtKey$format$replac2[0],
    day = _fmtKey$format$replac2[1],
    y = _fmtKey$format$replac2[2]; // "10/19/2026" → "2026-10-19"
  return "".concat(y, "-").concat(m, "-").concat(day);
};
function addDays(key, n) {
  var _key$split$map = key.split('-').map(Number),
    _key$split$map2 = _slicedToArray(_key$split$map, 3),
    y = _key$split$map2[0],
    m = _key$split$map2[1],
    d = _key$split$map2[2];
  var t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}
function dayDiff(a, b) {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5);
}
function minutesOfDay(date) {
  var _fmtHM24$format$repla = fmtHM24.format(date).replace(/[^\d:]/g, '').split(':').map(Number),
    _fmtHM24$format$repla2 = _slicedToArray(_fmtHM24$format$repla, 2),
    h = _fmtHM24$format$repla2[0],
    m = _fmtHM24$format$repla2[1];
  return h % 24 * 60 + m; // (some browsers call midnight 24:00)
}

// The instant of local midnight for a YYYY-MM-DD key (EDT = UTC-4, EST = UTC-5).
function localMidnight(key) {
  var _key$split$map3 = key.split('-').map(Number),
    _key$split$map4 = _slicedToArray(_key$split$map3, 3),
    y = _key$split$map4[0],
    m = _key$split$map4[1],
    d = _key$split$map4[2];
  for (var _i = 0, _arr = [4, 5]; _i < _arr.length; _i++) {
    var h = _arr[_i];
    var t = new Date(Date.UTC(y, m - 1, d, h));
    if (minutesOfDay(t) === 0) return t;
  }
  return new Date(Date.UTC(y, m - 1, d, 4));
}
function keyLabel(key, i) {
  var d = new Date(key + 'T12:00:00Z');
  var weekday = d.toLocaleDateString('en-US', {
    weekday: 'long',
    timeZone: 'UTC'
  });
  var date = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  });
  return {
    title: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : weekday,
    date: (i < 2 ? weekday.slice(0, 3) + ', ' : '') + date,
    "short": d.toLocaleDateString('en-US', {
      weekday: 'short',
      timeZone: 'UTC'
    }),
    dayNum: d.getUTCDate()
  };
}
var fmt = function fmt(date) {
  return date && !isNaN(date) ? fmtTime.format(date) : '—';
};
var fmtClock = function fmtClock(min) {
  var h = Math.floor(min / 60),
    m = String(min % 60).padStart(2, '0');
  return "".concat(h % 12 || 12, ":").concat(m, " ").concat(h < 12 ? 'AM' : 'PM');
};
var fmtDuration = function fmtDuration(ms) {
  var m = Math.round(ms / 60000);
  return "".concat(Math.floor(m / 60), "h ").concat(String(m % 60).padStart(2, '0'), "m");
};
var esc = function esc(s) {
  return String(s !== null && s !== void 0 ? s : '').replace(/[&<>"']/g, function (c) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c];
  });
};

// give up on a request after 20 seconds, so one slow source can't hold the whole page on "Loading forecast…"
// (old Safari can't cancel a fetch, so race it against a timer)
var within = function within(ms, promise) {
  return Promise.race([promise, new Promise(function (_, reject) {
    return setTimeout(function () {
      return reject(new Error('timed out'));
    }, ms);
  })]);
};
function getJSON(_x) {
  return _getJSON.apply(this, arguments);
} // ---------- data sources ----------
function _getJSON() {
  _getJSON = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(url) {
    var res, data;
    return _regenerator().w(function (_context) {
      while (1) switch (_context.n) {
        case 0:
          _context.n = 1;
          return within(20000, fetch(url, {
            headers: {
              Accept: 'application/geo+json, application/json'
            }
          }));
        case 1:
          res = _context.v;
          if (res.ok) {
            _context.n = 2;
            break;
          }
          throw new Error("".concat(res.status, " ").concat(res.statusText));
        case 2:
          _context.n = 3;
          return within(20000, res.json());
        case 3:
          data = _context.v;
          if (!data.error) {
            _context.n = 4;
            break;
          }
          throw new Error(data.error.message || 'Request failed');
        case 4:
          return _context.a(2, data);
      }
    }, _callee);
  }));
  return _getJSON.apply(this, arguments);
}
function loadWeather() {
  return _loadWeather.apply(this, arguments);
} // Convert an NWS quantity to knots based on its unit code.
function _loadWeather() {
  _loadWeather = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2() {
    var point, _yield$Promise$all, _yield$Promise$all2, daily, hourly, grid, byDay, _iterator6, _step6, p, key;
    return _regenerator().w(function (_context2) {
      while (1) switch (_context2.n) {
        case 0:
          _context2.n = 1;
          return getJSON("https://api.weather.gov/points/".concat(CONFIG.lat, ",").concat(CONFIG.lon));
        case 1:
          point = _context2.v;
          _context2.n = 2;
          return Promise.all([getJSON(point.properties.forecast), getJSON(point.properties.forecastHourly)["catch"](function () {
            return null;
          }), getJSON(point.properties.forecastGridData)["catch"](function () {
            return null;
          })]);
        case 2:
          _yield$Promise$all = _context2.v;
          _yield$Promise$all2 = _slicedToArray(_yield$Promise$all, 3);
          daily = _yield$Promise$all2[0];
          hourly = _yield$Promise$all2[1];
          grid = _yield$Promise$all2[2];
          byDay = {};
          _iterator6 = _createForOfIteratorHelper(daily.properties.periods);
          try {
            for (_iterator6.s(); !(_step6 = _iterator6.n()).done;) {
              p = _step6.value;
              key = p.startTime.slice(0, 10); // startTime carries the local offset
              (byDay[key] || (byDay[key] = {}))[p.isDaytime ? 'day' : 'night'] = p;
            }
          } catch (err) {
            _iterator6.e(err);
          } finally {
            _iterator6.f();
          }
          return _context2.a(2, {
            byDay: byDay,
            now: (hourly === null || hourly === void 0 ? void 0 : hourly.properties.periods[0]) || null,
            // every hour of the coming week, for the plan's verdicts and timeline
            hours: ((hourly === null || hourly === void 0 ? void 0 : hourly.properties.periods) || []).map(function (p) {
              var _p$probabilityOfPreci2;
              return {
                t: Date.parse(p.startTime),
                temp: p.temperature,
                pop: ((_p$probabilityOfPreci2 = p.probabilityOfPrecipitation) === null || _p$probabilityOfPreci2 === void 0 ? void 0 : _p$probabilityOfPreci2.value) || 0,
                "short": p.shortForecast,
                isDay: p.isDaytime
              };
            }),
            wind: grid ? hourlyWind(grid.properties) : null,
            // rain chance from the forecast grid, which starts earlier in the day than the hourly forecast (for wet roads)
            rainChance: grid ? _toConsumableArray(expandSeries(grid.properties.probabilityOfPrecipitation)).map(function (_ref8) {
              var _ref9 = _slicedToArray(_ref8, 2),
                t = _ref9[0],
                pop = _ref9[1];
              return {
                t: t,
                pop: pop
              };
            }) : null,
            cell: daily.geometry || null // the forecast grid square, shown on the map
          });
      }
    }, _callee2);
  }));
  return _loadWeather.apply(this, arguments);
}
function toKnots(value) {
  var unit = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
  if (value == null) return null;
  if (unit.includes('km_h')) return value / 1.852;
  if (unit.includes('m_s')) return value * 1.94384;
  if (unit.includes('mi_h')) return value / 1.15078;
  return value;
}

// Expand NWS grid time series ("2026-09-28T05:00:00+00:00/PT2H") into one value per hour.
function expandSeries(series) {
  var convert = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function (v) {
    return v;
  };
  var out = new Map();
  var _iterator = _createForOfIteratorHelper((series === null || series === void 0 ? void 0 : series.values) || []),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var _step$value = _step.value,
        validTime = _step$value.validTime,
        value = _step$value.value;
      if (value == null) continue;
      var _validTime$split = validTime.split('/'),
        _validTime$split2 = _slicedToArray(_validTime$split, 2),
        start = _validTime$split2[0],
        dur = _validTime$split2[1];
      var m = dur.match(/P(?:(\d+)D)?(?:T(?:(\d+)H)?)?/);
      var hours = +((m === null || m === void 0 ? void 0 : m[1]) || 0) * 24 + +((m === null || m === void 0 ? void 0 : m[2]) || 0) || 1;
      var t0 = Date.parse(start);
      for (var h = 0; h < hours; h++) out.set(t0 + h * 36e5, convert(value));
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  return out;
}
function hourlyWind(props) {
  var kt = function kt(series) {
    return expandSeries(series, function (v) {
      return toKnots(v, series === null || series === void 0 ? void 0 : series.uom);
    });
  };
  var spd = kt(props.windSpeed),
    gst = kt(props.windGust),
    dir = expandSeries(props.windDirection);
  return _toConsumableArray(spd.keys()).sort(function (a, b) {
    return a - b;
  }).map(function (t) {
    var _gst$get;
    return {
      t: t,
      spd: spd.get(t),
      gst: Math.max((_gst$get = gst.get(t)) !== null && _gst$get !== void 0 ? _gst$get : 0, spd.get(t)),
      dir: dir.get(t)
    };
  });
}
function loadMarine() {
  return _loadMarine.apply(this, arguments);
}
function _loadMarine() {
  _loadMarine = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3() {
    var list, latest, product;
    return _regenerator().w(function (_context3) {
      while (1) switch (_context3.n) {
        case 0:
          _context3.n = 1;
          return getJSON("https://api.weather.gov/products/types/CWF/locations/".concat(CONFIG.marineOffice));
        case 1:
          list = _context3.v;
          latest = list['@graph'][0];
          _context3.n = 2;
          return getJSON(latest['@id'] || "https://api.weather.gov/products/".concat(latest.id));
        case 2:
          product = _context3.v;
          return _context3.a(2, parseCWF(product.productText, CONFIG.marineZone));
      }
    }, _callee3);
  }));
  return _loadMarine.apply(this, arguments);
}
function loadTides(_x2) {
  return _loadTides.apply(this, arguments);
} // How big is a tide? Compare against every predicted high/low in the next 12 months.
function _loadTides() {
  _loadTides = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4(todayKey) {
    var base, common, begin, hours, yearEnd, _yield$Promise$all3, _yield$Promise$all4, curve, hilo, year, parse;
    return _regenerator().w(function (_context4) {
      while (1) switch (_context4.n) {
        case 0:
          base = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';
          common = "station=".concat(CONFIG.tideStation, "&product=predictions&datum=MLLW&time_zone=lst_ldt&units=english&format=json&application=capevisual.com");
          begin = todayKey.replace(/-/g, '');
          hours = (CONFIG.days + 1) * 24;
          yearEnd = addDays(todayKey, 364).replace(/-/g, '');
          _context4.n = 1;
          return Promise.all([getJSON("".concat(base, "?").concat(common, "&begin_date=").concat(begin, "&range=").concat(hours, "&interval=30")), getJSON("".concat(base, "?").concat(common, "&begin_date=").concat(begin, "&range=").concat(hours, "&interval=hilo")), getJSON("".concat(base, "?").concat(common, "&begin_date=").concat(begin, "&end_date=").concat(yearEnd, "&interval=hilo"))["catch"](function () {
            return null;
          })]);
        case 1:
          _yield$Promise$all3 = _context4.v;
          _yield$Promise$all4 = _slicedToArray(_yield$Promise$all3, 3);
          curve = _yield$Promise$all4[0];
          hilo = _yield$Promise$all4[1];
          year = _yield$Promise$all4[2];
          parse = function parse(p) {
            return {
              key: p.t.slice(0, 10),
              min: +p.t.slice(11, 13) * 60 + +p.t.slice(14, 16),
              v: parseFloat(p.v),
              type: p.type
            };
          };
          return _context4.a(2, {
            curve: curve.predictions.map(parse),
            hilo: hilo.predictions.map(parse),
            stats: year ? tideStats(year.predictions.map(parse)) : null
          });
      }
    }, _callee4);
  }));
  return _loadTides.apply(this, arguments);
}
function tideStats(tides) {
  var highs = tides.filter(function (p) {
    return p.type === 'H';
  });
  var lows = tides.filter(function (p) {
    return p.type === 'L';
  });
  var byDay = {};
  var _iterator2 = _createForOfIteratorHelper(tides),
    _step2;
  try {
    for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
      var _p$key;
      var p = _step2.value;
      (byDay[_p$key = p.key] || (byDay[_p$key] = [])).push(p.v);
    }
  } catch (err) {
    _iterator2.e(err);
  } finally {
    _iterator2.f();
  }
  var ranges = Object.values(byDay).filter(function (a) {
    return a.length > 1;
  }).map(function (a) {
    return Math.max.apply(Math, _toConsumableArray(a)) - Math.min.apply(Math, _toConsumableArray(a));
  });
  var avg = function avg(a) {
    return a.reduce(function (s, p) {
      return s + p.v;
    }, 0) / a.length;
  };
  return {
    highs: highs.map(function (p) {
      return p.v;
    }).sort(function (a, b) {
      return a - b;
    }),
    lows: lows.map(function (p) {
      return p.v;
    }).sort(function (a, b) {
      return a - b;
    }),
    ranges: ranges.sort(function (a, b) {
      return a - b;
    }),
    maxHigh: highs.reduce(function (a, b) {
      return b.v > a.v ? b : a;
    }),
    minLow: lows.reduce(function (a, b) {
      return b.v < a.v ? b : a;
    }),
    avgHigh: avg(highs),
    avgLow: avg(lows)
  };
}

// Fraction of the sorted values that v is at least as extreme as (0..1).
var rankAbove = function rankAbove(sorted, v) {
  return sorted.filter(function (x) {
    return x <= v;
  }).length / sorted.length;
};
var rankBelow = function rankBelow(sorted, v) {
  return sorted.filter(function (x) {
    return x >= v;
  }).length / sorted.length;
};

// A tide's "size": higher highs and lower lows are bigger.
function tideSize(p, stats) {
  var r = p.type === 'H' ? rankAbove(stats.highs, p.v) : rankBelow(stats.lows, p.v);
  var label = r >= 0.9 ? 'Very big' : r >= 0.7 ? 'Big' : r > 0.3 ? 'Typical' : r > 0.1 ? 'Small' : 'Very small';
  return {
    r: r,
    label: label
  };
}
function loadWaterTemp() {
  return _loadWaterTemp.apply(this, arguments);
}
function _loadWaterTemp() {
  _loadWaterTemp = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5() {
    var _data$data;
    var url, data;
    return _regenerator().w(function (_context5) {
      while (1) switch (_context5.n) {
        case 0:
          url = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=water_temperature&date=latest&station=".concat(CONFIG.waterTempStation, "&time_zone=lst_ldt&units=english&format=json&application=capevisual.com");
          _context5.n = 1;
          return getJSON(url);
        case 1:
          data = _context5.v;
          return _context5.a(2, (_data$data = data.data) !== null && _data$data !== void 0 && _data$data[0] ? parseFloat(data.data[0].v) : null);
      }
    }, _callee5);
  }));
  return _loadWaterTemp.apply(this, arguments);
}
var COOPS = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';
function loadBuoy() {
  return _loadBuoy.apply(this, arguments);
} // Observed minus predicted water level at Woods Hole (positive = water running high).
function _loadBuoy() {
  _loadBuoy = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee6() {
    var _p$windSpeed, _p$windSpeed2, _p$windGust, _p$windGust2, _p$windDirection;
    var p, spd;
    return _regenerator().w(function (_context6) {
      while (1) switch (_context6.n) {
        case 0:
          _context6.n = 1;
          return getJSON("https://api.weather.gov/stations/".concat(CONFIG.buoy, "/observations/latest"));
        case 1:
          p = _context6.v.properties;
          spd = toKnots((_p$windSpeed = p.windSpeed) === null || _p$windSpeed === void 0 ? void 0 : _p$windSpeed.value, (_p$windSpeed2 = p.windSpeed) === null || _p$windSpeed2 === void 0 ? void 0 : _p$windSpeed2.unitCode);
          if (!(spd == null)) {
            _context6.n = 2;
            break;
          }
          throw new Error('No wind reading');
        case 2:
          return _context6.a(2, {
            time: p.timestamp,
            spd: spd,
            gst: toKnots((_p$windGust = p.windGust) === null || _p$windGust === void 0 ? void 0 : _p$windGust.value, (_p$windGust2 = p.windGust) === null || _p$windGust2 === void 0 ? void 0 : _p$windGust2.unitCode),
            dir: (_p$windDirection = p.windDirection) === null || _p$windDirection === void 0 ? void 0 : _p$windDirection.value
          });
      }
    }, _callee6);
  }));
  return _loadBuoy.apply(this, arguments);
}
function loadWaterLevel(_x3) {
  return _loadWaterLevel.apply(this, arguments);
}
function _loadWaterLevel() {
  _loadWaterLevel = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee7(todayKey) {
    var common, _yield$Promise$all5, _yield$Promise$all6, obs, pred, o, match;
    return _regenerator().w(function (_context7) {
      while (1) switch (_context7.n) {
        case 0:
          common = "station=".concat(CONFIG.waterLevelStation, "&datum=MLLW&time_zone=lst_ldt&units=english&format=json&application=capevisual.com");
          _context7.n = 1;
          return Promise.all([getJSON("".concat(COOPS, "?product=water_level&date=latest&").concat(common)), getJSON("".concat(COOPS, "?product=predictions&begin_date=").concat(addDays(todayKey, -1).replace(/-/g, ''), "&range=48&").concat(common))]);
        case 1:
          _yield$Promise$all5 = _context7.v;
          _yield$Promise$all6 = _slicedToArray(_yield$Promise$all5, 2);
          obs = _yield$Promise$all6[0];
          pred = _yield$Promise$all6[1];
          o = obs.data[0];
          match = pred.predictions.find(function (x) {
            return x.t === o.t;
          });
          if (match) {
            _context7.n = 2;
            break;
          }
          throw new Error('No prediction for latest observation');
        case 2:
          return _context7.a(2, {
            t: o.t,
            diff: parseFloat(o.v) - parseFloat(match.v)
          });
      }
    }, _callee7);
  }));
  return _loadWaterLevel.apply(this, arguments);
}
function loadCurrents(_x4) {
  return _loadCurrents.apply(this, arguments);
} // Active NWS alerts for Megansett (land) and the Buzzards Bay marine zone.
function _loadCurrents() {
  _loadCurrents = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee9(todayKey) {
    var begin, hours;
    return _regenerator().w(function (_context9) {
      while (1) switch (_context9.n) {
        case 0:
          begin = todayKey.replace(/-/g, '');
          hours = (CONFIG.days + 1) * 24;
          return _context9.a(2, Promise.all(CONFIG.currentStations.map(/*#__PURE__*/function () {
            var _ref0 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee8(s) {
              var data, events, first;
              return _regenerator().w(function (_context8) {
                while (1) switch (_context8.n) {
                  case 0:
                    _context8.n = 1;
                    return getJSON("".concat(COOPS, "?product=currents_predictions&station=").concat(s.id, "&bin=").concat(s.bin, "&interval=MAX_SLACK&begin_date=").concat(begin, "&range=").concat(hours, "&time_zone=lst_ldt&units=english&format=json&application=capevisual.com"));
                  case 1:
                    data = _context8.v;
                    events = data.current_predictions.cp.map(function (c) {
                      return {
                        key: c.Time.slice(0, 10),
                        min: +c.Time.slice(11, 13) * 60 + +c.Time.slice(14, 16),
                        type: c.Type,
                        v: Math.abs(c.Velocity_Major)
                      };
                    });
                    first = data.current_predictions.cp[0] || {};
                    return _context8.a(2, _objectSpread(_objectSpread({}, s), {}, {
                      events: events,
                      floodDir: first.meanFloodDir,
                      ebbDir: first.meanEbbDir
                    }));
                }
              }, _callee8);
            }));
            return function (_x8) {
              return _ref0.apply(this, arguments);
            };
          }())));
      }
    }, _callee9);
  }));
  return _loadCurrents.apply(this, arguments);
}
function loadAlerts() {
  return _loadAlerts.apply(this, arguments);
} // Run a loader; on success remember the result, on failure fall back to the last good copy.
function _loadAlerts() {
  _loadAlerts = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee0() {
    var _yield$Promise$all7, _yield$Promise$all8, point, zone, seen;
    return _regenerator().w(function (_context0) {
      while (1) switch (_context0.n) {
        case 0:
          _context0.n = 1;
          return Promise.all([getJSON("https://api.weather.gov/alerts/active?point=".concat(CONFIG.lat, ",").concat(CONFIG.lon)), getJSON("https://api.weather.gov/alerts/active/zone/".concat(CONFIG.marineZone))]);
        case 1:
          _yield$Promise$all7 = _context0.v;
          _yield$Promise$all8 = _slicedToArray(_yield$Promise$all7, 2);
          point = _yield$Promise$all8[0];
          zone = _yield$Promise$all8[1];
          seen = new Set();
          return _context0.a(2, [].concat(_toConsumableArray(point.features), _toConsumableArray(zone.features)).map(function (f) {
            return f.properties;
          }).filter(function (a) {
            return !seen.has(a.id) && seen.add(a.id);
          }).map(function (a) {
            return {
              id: a.id,
              event: a.event,
              severity: a.severity,
              ends: a.ends || a.expires,
              description: a.description,
              instruction: a.instruction
            };
          }));
      }
    }, _callee0);
  }));
  return _loadAlerts.apply(this, arguments);
}
function cached(_x5, _x6, _x7) {
  return _cached.apply(this, arguments);
} // ---------- Coastal Waters Forecast parsing ----------
function _cached() {
  _cached = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee1(name, maxAgeHours, loader) {
    var key, value, saved, _t, _t2;
    return _regenerator().w(function (_context1) {
      while (1) switch (_context1.p = _context1.n) {
        case 0:
          key = "cv:".concat(name);
          _context1.p = 1;
          _context1.n = 2;
          return loader();
        case 2:
          value = _context1.v;
          try {
            localStorage.setItem(key, JSON.stringify({
              savedAt: Date.now(),
              value: value
            }));
          } catch (_unused) {/* storage full or disabled */}
          return _context1.a(2, {
            value: value
          });
        case 3:
          _context1.p = 3;
          _t = _context1.v;
          console.error(name, _t);
          _context1.p = 4;
          saved = JSON.parse(localStorage.getItem(key));
          if (!(saved && Date.now() - saved.savedAt < maxAgeHours * 36e5)) {
            _context1.n = 5;
            break;
          }
          return _context1.a(2, {
            value: saved.value,
            staleSince: saved.savedAt,
            error: _t
          });
        case 5:
          _context1.n = 7;
          break;
        case 6:
          _context1.p = 6;
          _t2 = _context1.v;
        case 7:
          return _context1.a(2, {
            value: null,
            error: _t
          });
      }
    }, _callee1, null, [[4, 6], [1, 3]]);
  }));
  return _cached.apply(this, arguments);
}
var DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
var MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
function parseCWF(text, zone) {
  var upper = text.toUpperCase();
  var synopsis = extractSynopsis(text);
  var start = upper.search(new RegExp("^".concat(zone, "-"), 'm'));
  if (start < 0) throw new Error("Zone ".concat(zone, " not found in forecast"));
  var end = text.indexOf('$$', start);
  var lines = text.slice(start, end < 0 ? undefined : end).split('\n').map(function (l) {
    return l.trim();
  });
  var issueKey = null,
    issued = '';
  var headlines = [];
  var periods = [];
  var cur = null,
    inHeadline = null;
  var _iterator3 = _createForOfIteratorHelper(lines),
    _step3;
  try {
    for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
      var line = _step3.value;
      var iss = line.match(/^(\d{3,4} [AP]M [A-Z]{3,4}) ([A-Z]{3}) ([A-Z]{3}) (\d{1,2}) (\d{4})$/i);
      if (iss && !issueKey) {
        issued = line;
        var month = MONTHS.indexOf(iss[3].toUpperCase()) + 1;
        issueKey = "".concat(iss[5], "-").concat(String(month).padStart(2, '0'), "-").concat(iss[4].padStart(2, '0'));
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
      var pm = line.match(/^\.([A-Z][A-Z ]*?)\.\.\.(.*)$/);
      if (pm) {
        cur = {
          label: pm[1].trim(),
          text: pm[2].trim()
        };
        periods.push(cur);
      } else if (cur && line) {
        cur.text += ' ' + line;
      } else if (cur && !line) {
        cur = null;
        if (periods.length) break; // boilerplate follows the last period
      }
    }
  } catch (err) {
    _iterator3.e(err);
  } finally {
    _iterator3.f();
  }
  if (!issueKey) throw new Error('Could not read forecast issue time');
  var issueDow = new Date(issueKey + 'T12:00:00Z').getUTCDay();
  for (var _i2 = 0, _periods = periods; _i2 < _periods.length; _i2++) {
    var p = _periods[_i2];
    p.slots = labelToSlots(p.label, issueDow);
    p.text = p.text.replace(/\s+/g, ' ').trim();
  }
  return {
    issueKey: issueKey,
    issued: issued,
    headlines: headlines,
    periods: periods,
    synopsis: synopsis
  };
}
function extractSynopsis(text) {
  var m = text.match(/^\.?SYNOPSIS[^\n]*?\.\.\.\s*([\s\S]*?)\n\s*\n/m);
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
}

// Map a CWF period label to half-day slots relative to the issue day:
// slot = dayOffset * 2 + (night ? 1 : 0)
function labelToSlots(label, issueDow) {
  var parts = label.split(/ THROUGH | AND /);
  var slots = parts.map(function (part) {
    part = part.trim();
    if (/^(TODAY|THIS MORNING|THIS AFTERNOON|REST OF TODAY)$/.test(part)) return 0;
    if (/(TONIGHT|THIS EVENING|OVERNIGHT)/.test(part)) return 1;
    var dow = DOW.indexOf(part.slice(0, 3));
    if (dow < 0) return null;
    var offset = (dow - issueDow + 7) % 7;
    return offset * 2 + (/NIGHT$/.test(part) ? 1 : 0);
  }).filter(function (s) {
    return s !== null;
  });
  if (!slots.length) return [];
  var out = [];
  for (var s = Math.min.apply(Math, _toConsumableArray(slots)); s <= Math.max.apply(Math, _toConsumableArray(slots)); s++) out.push(s);
  return out;
}
function marineForDay(marine, dayKey) {
  if (!marine) return [];
  var offset = dayDiff(marine.issueKey, dayKey);
  return marine.periods.filter(function (p) {
    return p.slots.some(function (s) {
      return Math.floor(s / 2) === offset;
    });
  });
}

// ---------- sun & moon ----------

function sunMoon(key) {
  var midnight = localMidnight(key);
  var nextMidnight = localMidnight(addDays(key, 1));
  var noon = new Date(midnight.getTime() + 12 * 36e5);
  var sun = SunCalc.getTimes(noon, CONFIG.lat, CONFIG.lon);
  var prevSun = SunCalc.getTimes(new Date(noon.getTime() - 864e5), CONFIG.lat, CONFIG.lon);
  var dayLength = sun.sunset - sun.sunrise;
  var deltaLength = dayLength - (prevSun.sunset - prevSun.sunrise);
  var moon = moonRiseSet(midnight, nextMidnight);
  var illum = SunCalc.getMoonIllumination(noon);
  var p0 = SunCalc.getMoonIllumination(midnight).phase;
  var p1 = SunCalc.getMoonIllumination(nextMidnight).phase;
  var event = null;
  if (p1 < p0) event = 'New Moon';else if (p0 < 0.25 && p1 >= 0.25) event = 'First Quarter';else if (p0 < 0.5 && p1 >= 0.5) event = 'Full Moon';else if (p0 < 0.75 && p1 >= 0.75) event = 'Last Quarter';
  return {
    sun: sun,
    dayLength: dayLength,
    deltaLength: deltaLength,
    moon: moon,
    illum: illum,
    event: event,
    phaseName: event || phaseName(illum.phase)
  };
}

// Scan the local day for moon altitude crossings (timezone-safe, unlike SunCalc.getMoonTimes).
function moonRiseSet(start, end) {
  var h0 = 0.133 * Math.PI / 180;
  var step = 10 * 60000;
  var rise = null,
    set = null;
  var prevT = start.getTime();
  var prevAlt = SunCalc.getMoonPosition(start, CONFIG.lat, CONFIG.lon).altitude - h0;
  for (var t = prevT + step; t <= end.getTime(); t += step) {
    var alt = SunCalc.getMoonPosition(new Date(t), CONFIG.lat, CONFIG.lon).altitude - h0;
    if (prevAlt < 0 !== alt < 0) {
      var cross = new Date(prevT + (t - prevT) * (prevAlt / (prevAlt - alt)));
      if (alt > 0 && !rise) rise = cross;
      if (alt < 0 && !set) set = cross;
    }
    prevT = t;
    prevAlt = alt;
  }
  return {
    rise: rise,
    set: set
  };
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
function moonSvg(fraction, phase) {
  var size = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 44;
  var r = size / 2 - 1,
    c = size / 2;
  var waxing = phase < 0.5;
  var rx = Math.abs(1 - 2 * fraction) * r;
  var limb = waxing ? 1 : 0;
  var term = waxing ? fraction < 0.5 ? 0 : 1 : fraction < 0.5 ? 1 : 0;
  var lit = fraction < 0.01 ? '' : "<path d=\"M".concat(c, ",").concat(c - r, " A").concat(r, ",").concat(r, " 0 0 ").concat(limb, " ").concat(c, ",").concat(c + r, " A").concat(rx.toFixed(2), ",").concat(r, " 0 0 ").concat(term, " ").concat(c, ",").concat(c - r, "Z\" fill=\"var(--moon-lit)\"/>");
  return "<svg class=\"moon\" width=\"".concat(size, "\" height=\"").concat(size, "\" viewBox=\"0 0 ").concat(size, " ").concat(size, "\" aria-hidden=\"true\">\n    <circle cx=\"").concat(c, "\" cy=\"").concat(c, "\" r=\"").concat(r, "\" fill=\"var(--moon-dark)\"/>").concat(lit, "\n    <circle cx=\"").concat(c, "\" cy=\"").concat(c, "\" r=\"").concat(r, "\" fill=\"none\" stroke=\"var(--moon-rim)\" stroke-width=\"1\"/></svg>");
}

// ---------- weather helpers ----------

// ---------- tide chart ----------

function tideChart(dayIndex, tides, sun, range, nowMin) {
  var W = 320,
    H = 110,
    padT = 22,
    padB = 22;
  var x = function x(m) {
    return m / 1440 * W;
  };
  var y = function y(v) {
    return padT + (range.max - v) / (range.max - range.min) * (H - padT - padB);
  };
  var lo = dayIndex * 1440 - 60,
    hi = (dayIndex + 1) * 1440 + 60;
  var pts = tides.curve.filter(function (p) {
    return p.abs >= lo && p.abs <= hi;
  }).map(function (p) {
    return {
      m: p.abs - dayIndex * 1440,
      v: p.v
    };
  });
  if (pts.length < 2) return '<p class="muted">No tide data.</p>';
  var line = pts.map(function (p, i) {
    return "".concat(i ? 'L' : 'M').concat(x(p.m).toFixed(1), ",").concat(y(p.v).toFixed(1));
  }).join('');
  var area = "".concat(line, "L").concat(x(pts.at(-1).m).toFixed(1), ",").concat(H, "L").concat(x(pts[0].m).toFixed(1), ",").concat(H, "Z");
  var rise = minutesOfDay(sun.sunrise),
    set = minutesOfDay(sun.sunset);
  var marks = tides.hilo.filter(function (p) {
    return p.abs >= dayIndex * 1440 && p.abs < (dayIndex + 1) * 1440;
  }).map(function (p) {
    var m = p.abs - dayIndex * 1440,
      cx = x(m),
      cy = y(p.v);
    var high = p.type === 'H';
    var tx = Math.min(Math.max(cx, 22), W - 22);
    return "<circle cx=\"".concat(cx.toFixed(1), "\" cy=\"").concat(cy.toFixed(1), "\" r=\"3\" class=\"tide-dot ").concat(high ? 'hi' : 'lo', "\"/>\n      <text x=\"").concat(tx.toFixed(1), "\" y=\"").concat((high ? cy - 8 : cy + 16).toFixed(1), "\" class=\"tide-label\">").concat(fmtClock(m).replace(' ', '').toLowerCase(), "</text>");
  }).join('');
  var nowLine = nowMin == null ? '' : "<line x1=\"".concat(x(nowMin), "\" x2=\"").concat(x(nowMin), "\" y1=\"0\" y2=\"").concat(H, "\" class=\"now-line\"/>");
  var ticks = [6, 12, 18].map(function (h) {
    return "<line x1=\"".concat(x(h * 60), "\" x2=\"").concat(x(h * 60), "\" y1=\"").concat(H - 8, "\" y2=\"").concat(H, "\" class=\"tick\"/>");
  }).join('');
  return "<svg class=\"tide-chart\" viewBox=\"0 0 ".concat(W, " ").concat(H, "\" preserveAspectRatio=\"none\" role=\"img\" aria-label=\"Tide curve\">\n    <rect x=\"0\" y=\"0\" width=\"").concat(x(rise), "\" height=\"").concat(H, "\" class=\"night\"/>\n    <rect x=\"").concat(x(set), "\" y=\"0\" width=\"").concat(W - x(set), "\" height=\"").concat(H, "\" class=\"night\"/>\n    ").concat(ticks, "\n    <path d=\"").concat(area, "\" class=\"tide-area\"/>\n    <path d=\"").concat(line, "\" class=\"tide-line\"/>\n    ").concat(nowLine, "\n    ").concat(marks, "\n  </svg>");
}

// ---------- rendering ----------

var COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
var compass = function compass(deg) {
  return deg == null ? '' : COMPASS[Math.round(deg / 22.5) % 16];
};

// Arrow pointing the way the wind blows (from `deg`, toward deg + 180).
var windArrow = function windArrow(deg) {
  var size = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 14;
  return deg == null ? '' : "<svg class=\"arrow\" width=\"".concat(size, "\" height=\"").concat(size, "\" viewBox=\"0 0 16 16\" style=\"transform:rotate(").concat(deg + 180, "deg)\" aria-hidden=\"true\"><path d=\"M8 14.5V2.5M3.5 7L8 2.5 12.5 7\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>");
};
var shortClock = function shortClock(min) {
  return fmtClock(min).replace(':00', '').replace(' AM', 'a').replace(' PM', 'p');
};

// ---------- the conditions strip in the header: Air · Water · Wind · Tide (after Tampa Bay Boating's) ----------

var COND_ICONS = {
  air: '<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>',
  water: '<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>',
  wind: '<path d="M12.8 19.6A2 2 0 1 0 14 16H2"/><path d="M17.5 8a2.5 2.5 0 1 1 2 4H2"/><path d="M9.8 4.4A2 2 0 1 1 11 8H2"/>',
  up: '<path d="M12 3v8"/><path d="m8 7 4-4 4 4"/><path d="M2 15c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 20c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>',
  down: '<path d="M12 3v8"/><path d="m8 7 4 4 4-4"/><path d="M2 15c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 20c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>',
  sunrise: '<path d="M12 2v8"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m8 6 4-4 4 4"/><path d="M16 18a4 4 0 0 0-8 0"/>',
  sunset: '<path d="M12 10V2"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m16 6-4 4-4-4"/><path d="M16 18a4 4 0 0 0-8 0"/>',
  rain: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
  warn: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>'
};
var lineIcon = function lineIcon(k, cls) {
  return "<svg class=\"".concat(cls, "\" viewBox=\"0 0 24 24\" aria-hidden=\"true\">").concat(COND_ICONS[k], "</svg>");
};

// High or Low within 45 minutes of the turn of the tide, otherwise Rising or Falling
function tideState(tides) {
  var nowAbs = minutesOfDay(new Date());
  var prev = null,
    next = null;
  var _iterator4 = _createForOfIteratorHelper(tides.hilo),
    _step4;
  try {
    for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
      var p = _step4.value;
      if (p.abs <= nowAbs) prev = p;else if (!next) next = p;
    }
  } catch (err) {
    _iterator4.e(err);
  } finally {
    _iterator4.f();
  }
  if (!next) return null;
  var near = function near(type) {
    return prev && prev.type === type && nowAbs - prev.abs < 45 || next.type === type && next.abs - nowAbs < 45;
  };
  if (near('H')) return {
    label: 'High',
    up: true,
    next: next
  };
  if (near('L')) return {
    label: 'Low',
    up: false,
    next: next
  };
  return next.type === 'H' ? {
    label: 'Rising',
    up: true,
    next: next
  } : {
    label: 'Falling',
    up: false,
    next: next
  };
}
function renderNow(_ref) {
  var weather = _ref.weather,
    tides = _ref.tides,
    waterTemp = _ref.waterTemp,
    buoy = _ref.buoy,
    waterLevel = _ref.waterLevel;
  var card = function card(icon, value, label, title) {
    return "<div class=\"cond-card\" title=\"".concat(esc(title), "\">").concat(lineIcon(icon, 'cond-ic'), "<b>").concat(value, "</b><i>").concat(label, "</i></div>");
  };
  var n = weather === null || weather === void 0 ? void 0 : weather.now;
  // the sky first: sunny, partly cloudy, cloudy, rain, snow… (the colour icons the day cards use)
  var SKY = {
    sun: 'Sunny',
    moon: 'Clear',
    'partly-day': 'Partly cloudy',
    'partly-night': 'Partly cloudy',
    cloud: 'Cloudy',
    rain: 'Rain',
    'showers-day': 'Showers',
    thunder: 'Storms',
    snow: 'Snow',
    fog: 'Fog',
    wind: 'Windy'
  };
  var sky = n ? "<div class=\"cond-card cond-sky\" title=\"".concat(esc(n.shortForecast), " \xB7 NWS forecast for Megansett\">").concat(wxIcon(n.shortForecast, n.isDaytime, 44), "<i>").concat(SKY[wxIconType(n.shortForecast, n.isDaytime)], "</i></div>") : '';
  // chance of rain (or snow) this hour, and the most it gets to later today
  var rain = '';
  if (n) {
    var _n$probabilityOfPreci;
    var pop = ((_n$probabilityOfPreci = n.probabilityOfPrecipitation) === null || _n$probabilityOfPreci === void 0 ? void 0 : _n$probabilityOfPreci.value) || 0,
      snow = /snow|sleet|flurr/i.test(n.shortForecast);
    var endOfDay = localMidnight(addDays(dateKey(new Date()), 1)).getTime();
    var later = (weather.hours || []).filter(function (h) {
      return h.t < endOfDay;
    });
    var peak = later.reduce(function (a, h) {
      return h.pop > a.pop ? h : a;
    }, {
      pop: pop
    });
    rain = card('rain', "".concat(pop, "%"), snow ? 'Snow' : 'Rain', "Chance of ".concat(snow ? 'snow' : 'rain', " this hour").concat(peak.pop > pop && peak.t ? " \xB7 up to ".concat(peak.pop, "% around ").concat(fmt(new Date(peak.t))) : '', " \xB7 NWS hourly forecast"));
  }
  var air = card('air', n ? "".concat(n.temperature, "\xB0") : '--', 'Air', n ? "".concat(n.shortForecast, " \xB7 NWS forecast for Megansett") : 'Air temperature');
  var d = waterLevel === null || waterLevel === void 0 ? void 0 : waterLevel.diff;
  var surge = d == null ? '' : Math.abs(d) < 0.3 ? 'Level near predicted · ' : "Level ".concat(d > 0 ? '+' : '−').concat(Math.abs(d).toFixed(1), " ft ").concat(d > 0 ? 'above' : 'below', " predicted \xB7 ");
  var water = card('water', waterTemp != null ? "".concat(Math.round(waterTemp), "\xB0") : '--', 'Water', "".concat(surge, "NOAA Woods Hole"));
  var wind = card('wind', '--', 'Wind', 'Wind now · NOAA BUZM3 Buzzards Bay tower');
  if (buoy) {
    var t = new Date(buoy.time),
      old = Date.now() - t > 2 * 36e5 ? ' (old reading)' : '';
    wind = card('wind', "".concat(compass(buoy.dir), " ").concat(Math.round(buoy.spd), "<small>kt</small>"), 'Wind', "".concat(buoy.gst ? "Gusts ".concat(Math.round(buoy.gst), " kt \xB7 ") : '', "NOAA BUZM3 Buzzards Bay tower \xB7 ").concat(fmt(t)).concat(old));
  }

  // the time of the next high or low; the arrow says which way the water is going until then
  var s = tides && tideState(tides),
    nx = s && s.next;
  var tide = card(s && !s.up ? 'down' : 'up', nx ? fmtClock(nx.min).replace(/ (AM|PM)$/, '<small>$1</small>') : '--', nx ? "Next ".concat(nx.type === 'H' ? 'high' : 'low') : 'Tide', nx ? "".concat(s.label, " now \xB7 next ").concat(nx.type === 'H' ? 'high' : 'low', " ").concat(fmtClock(nx.min), ", ").concat(nx.v.toFixed(1), " ft \xB7 NOAA Chappaquoit Point") : 'Tide');

  // the sun: whichever comes next (sunset in the day, sunrise at night); and tonight's moon
  var today = dateKey(new Date()),
    smT = sunMoon(today),
    nowT = Date.now();
  var sunNext = nowT < smT.sun.sunrise ? ['sunrise', smT.sun.sunrise] : nowT < smT.sun.sunset ? ['sunset', smT.sun.sunset] : ['sunrise', sunMoon(addDays(today, 1)).sun.sunrise];
  var sunCard = card(sunNext[0], fmt(sunNext[1]).replace(/ (AM|PM)$/, '<small>$1</small>'), sunNext[0] === 'sunrise' ? 'Sunrise' : 'Sunset', "Sunrise ".concat(fmt(smT.sun.sunrise), " \xB7 sunset ").concat(fmt(smT.sun.sunset), " \xB7 ").concat(fmtDuration(smT.dayLength), " of daylight"));
  var ph = smT.illum.phase,
    pct = Math.round(smT.illum.fraction * 100);
  var moonWord = ph < 0.03 || ph > 0.97 ? 'New moon' : ph > 0.47 && ph < 0.53 ? 'Full moon' : ph < 0.5 ? 'Waxing' : 'Waning';
  var moonCard = "<div class=\"cond-card cond-moon\" title=\"".concat(esc(smT.phaseName), " \xB7 ").concat(pct, "% lit \xB7 rises ").concat(fmt(smT.moon.rise), ", sets ").concat(fmt(smT.moon.set), "\">").concat(moonSvg(smT.illum.fraction, ph, 22), "<b>").concat(pct, "%</b><i>").concat(moonWord, "</i></div>");
  document.getElementById('now').innerHTML = "<div class=\"cond\">".concat(sky).concat(sunCard).concat(rain).concat(air).concat(water).concat(wind).concat(tide).concat(moonCard, "</div>");
}
var fmtWhen = function fmtWhen(iso) {
  var d = new Date(iso);
  return (dateKey(d) === dateKey(new Date()) ? '' : d.toLocaleDateString('en-US', {
    weekday: 'short',
    timeZone: CONFIG.tz
  }) + ' ') + fmt(d);
};
var paragraphs = function paragraphs(text) {
  return esc(text).split(/\n\s*\n/).map(function (p) {
    return "<p>".concat(p.replace(/\n/g, ' '), "</p>");
  }).join('');
};

// ---------- the red alert bar under the header (Small Craft Advisory and the like) ----------

// the most serious first
// the most serious first (the marine ones by wind: hurricane force 64+ kt, storm 48–63, gale 34–47, small craft ~25+)
var ALERT_ORDER = [/tsunami warning|extreme wind warning|hurricane warning|hurricane force wind warning/, /tropical storm warning|storm surge warning|^storm warning/, /gale warning|hazardous seas warning|heavy freezing spray warning|special marine warning|tornado warning|severe thunderstorm warning/, /tsunami watch|hurricane watch|hurricane force wind watch|tropical storm watch|storm surge watch|^storm watch/, /gale watch|hazardous seas watch|heavy freezing spray watch|tornado watch|severe thunderstorm watch/, /small craft advisory|brisk wind advisory|freezing spray advisory/, /warning/, /watch/, /advisory/];
// warnings red, watches orange, advisories amber, statements blue-grey (the NWS tiers)
var alertTier = function alertTier(event) {
  return /warning$/i.test(event) ? 'warn' : /watch$/i.test(event) ? 'watch' : /advisory$/i.test(event) ? 'advis' : 'stmt';
};
var alertRank = function alertRank(event) {
  var i = ALERT_ORDER.findIndex(function (r) {
    return r.test((event || '').toLowerCase());
  });
  return i < 0 ? ALERT_ORDER.length : i;
};
function renderAlertBar(active, headlines) {
  var bar = document.getElementById('alert-bar');
  var list = (active || []).slice().sort(function (a, b) {
    return alertRank(a.event) - alertRank(b.event);
  });
  var title, sub, detail;
  if (list.length) {
    var top = list[0];
    title = top.event;
    sub = (top.ends ? "Until ".concat(fmtWhen(top.ends)) : 'In effect') + (list.length > 1 ? " \xB7 +".concat(list.length - 1, " more") : '');
    detail = list.map(function (a) {
      return "<section><h3>".concat(esc(a.event)).concat(a.ends ? " <span>until ".concat(fmtWhen(a.ends), "</span>") : '', "</h3>\n      ").concat(paragraphs(a.description)).concat(a.instruction ? "<p><b>What to do:</b> ".concat(esc(a.instruction).replace(/\n/g, ' '), "</p>") : '', "</section>");
    }).join('');
  } else if (headlines && headlines.length) {
    // no alert from the alerts service, but the marine forecast leads with one ("SMALL CRAFT ADVISORY IN EFFECT …")
    var m = headlines[0].match(/^(.*?)\s+(IN EFFECT.*)$/i);
    title = titleCase(m ? m[1] : headlines[0]);
    sub = m ? m[2].charAt(0) + m[2].slice(1).toLowerCase() : 'From the NWS marine forecast';
    detail = headlines.map(function (h) {
      return "<p>".concat(esc(h), "</p>");
    }).join('') + '<p>From the NWS marine forecast for Buzzards Bay.</p>';
  } else {
    bar.hidden = true;
    bar.innerHTML = '';
    alertShown = false;
    return;
  }
  // a red tile first in the conditions strip (the main screen keeps its height); tap it for the full red panel
  var k = title.match(/^(.*?)\s*\b(Warning|Advisory|Watch|Statement)$/i);
  var strip = document.querySelector('#now .cond');
  if (strip) strip.insertAdjacentHTML('afterbegin', "<button type=\"button\" class=\"cond-card cond-alert tier-".concat(alertTier(title), "\" aria-expanded=\"").concat(alertShown, "\" title=\"").concat(esc(title), " \xB7 ").concat(esc(sub), "\">").concat(lineIcon('warn', 'cond-ic'), "<b>").concat(esc(k ? k[1] : title), "</b><i>").concat(esc(k ? k[2] : 'Alert')).concat(list.length > 1 ? " +".concat(list.length - 1) : '', "</i></button>"));
  bar.innerHTML = "<button type=\"button\" class=\"alert-head\"><span class=\"alert-row\">".concat(lineIcon('warn', 'alert-ic'), "\n    <span class=\"alert-txt\"><b>").concat(esc(title), "</b><span>").concat(esc(sub), "</span></span><span class=\"alert-more\">Close \u2191</span></span></button>\n    <div class=\"alert-detail\"><div class=\"alert-detail-in\">").concat(detail, "</div></div>");
  bar.className = "alert-bar open tier-".concat(alertTier(title));
  bar.hidden = !alertShown;
}
var alertShown = false;
function showAlertPanel(show) {
  alertShown = show;
  document.getElementById('alert-bar').hidden = !show;
  var tile = document.querySelector('#now .cond-alert');
  if (tile) tile.setAttribute('aria-expanded', String(show));
  if (typeof fitPlan === 'function') fitPlan();
}
document.getElementById('now').addEventListener('click', function (e) {
  if (e.target.closest('.cond-alert')) showAlertPanel(!alertShown);
});
document.getElementById('alert-bar').addEventListener('click', function (e) {
  if (e.target.closest('.alert-head')) showAlertPanel(false);
});
function renderAlerts(_ref2, stale) {
  var alerts = _ref2.alerts,
    marine = _ref2.marine;
  var el = document.getElementById('alerts');
  var parts = [];
  var active = alerts === null || alerts === void 0 ? void 0 : alerts.filter(function (a) {
    return !a.ends || Date.parse(a.ends) > Date.now();
  });
  renderAlertBar(active, marine === null || marine === void 0 ? void 0 : marine.headlines);
  if (stale.length) {
    parts.push("<div class=\"alert stale\">Couldn't reach NOAA just now. Showing saved data for ".concat(stale.map(function (_ref3) {
      var _ref4 = _slicedToArray(_ref3, 2),
        name = _ref4[0],
        t = _ref4[1];
      return "".concat(name, " (from ").concat(fmtWhen(new Date(t).toISOString()), ")");
    }).join(', '), ".</div>"));
  }
  el.innerHTML = parts.join('');
  var syn = document.getElementById('synopsis');
  if (marine !== null && marine !== void 0 && marine.synopsis) {
    syn.hidden = false;
    syn.querySelector('p').textContent = marine.synopsis;
  }
}
function weatherPanel(w, windBlock) {
  if (!w) return windBlock || '<p class="muted">Forecast not available yet.</p>';
  return windBlock + ['day', 'night'].filter(function (k) {
    return w[k];
  }).map(function (k) {
    var _p$probabilityOfPreci;
    var p = w[k];
    var pop = (_p$probabilityOfPreci = p.probabilityOfPrecipitation) === null || _p$probabilityOfPreci === void 0 ? void 0 : _p$probabilityOfPreci.value;
    return "<div class=\"wx-period\">\n      <div class=\"wx-head\">\n        ".concat(wxIcon(p.shortForecast, p.isDaytime, 38), "\n        <div>\n          <div class=\"wx-name\">").concat(esc(p.name), " <span class=\"wx-temp ").concat(p.isDaytime ? 'hi' : 'lo', "\">").concat(p.temperature, "\xB0</span></div>\n          <div class=\"wx-short\">").concat(esc(p.shortForecast), "</div>\n        </div>\n      </div>\n      <div class=\"wx-meta\">Wind ").concat(esc(p.windDirection), " ").concat(esc(p.windSpeed)).concat(pop ? " \xB7 Rain ".concat(pop, "%") : '', "</div>\n      <p class=\"wx-detail\">").concat(esc(p.detailedForecast), "</p>\n    </div>");
  }).join('');
}

// Hourly wind (line) and gusts (shaded) in knots for one local day.
function windChart(key, wind, scaleMax, isToday) {
  if (!wind) return '';
  var t0 = localMidnight(key).getTime(),
    t1 = localMidnight(addDays(key, 1)).getTime();
  var pts = wind.filter(function (w) {
    return w.t >= t0 - 36e5 && w.t <= t1 + 36e5;
  });
  var inDay = pts.filter(function (w) {
    return w.t >= t0 && w.t < t1;
  });
  if (inDay.length < 6) return '';
  var W = 320,
    H = 92,
    padT = 18,
    padB = 2;
  var x = function x(t) {
    return (t - t0) / (t1 - t0) * W;
  };
  var y = function y(v) {
    return H - padB - v / scaleMax * (H - padT - padB);
  };
  var path = function path(k) {
    return pts.map(function (p, i) {
      return "".concat(i ? 'L' : 'M').concat(x(p.t).toFixed(1), ",").concat(y(p[k]).toFixed(1));
    }).join('');
  };
  var gustArea = "".concat(path('gst'), "L").concat(x(pts.at(-1).t).toFixed(1), ",").concat(H, "L").concat(x(pts[0].t).toFixed(1), ",").concat(H, "Z");
  var grid = [10, 20, 30, 40].filter(function (v) {
    return v < scaleMax;
  }).map(function (v) {
    return "<line x1=\"0\" x2=\"".concat(W, "\" y1=\"").concat(y(v), "\" y2=\"").concat(y(v), "\" class=\"grid\"/><text x=\"2\" y=\"").concat(y(v) - 2, "\" class=\"grid-label\">").concat(v, "</text>");
  }).join('');
  var arrows = inDay.filter(function (p) {
    return minutesOfDay(new Date(p.t)) % 180 === 0 && p.dir != null;
  }).map(function (p) {
    return "<g transform=\"translate(".concat(x(p.t) + 6, " 9) rotate(").concat(p.dir + 180, ")\"><path d=\"M0,5V-5M-3.5,-1.5L0,-5 3.5,-1.5\" class=\"wind-arrow\"/></g>");
  }).join('');
  var nowLine = isToday ? "<line x1=\"".concat(x(Date.now()), "\" x2=\"").concat(x(Date.now()), "\" y1=\"0\" y2=\"").concat(H, "\" class=\"now-line\"/>") : '';
  var daytime = inDay.filter(function (p) {
    var m = minutesOfDay(new Date(p.t));
    return m >= 360 && m <= 1200;
  });
  var src = daytime.length ? daytime : inDay;
  var lo = Math.round(Math.min.apply(Math, _toConsumableArray(src.map(function (p) {
      return p.spd;
    })))),
    hi = Math.round(Math.max.apply(Math, _toConsumableArray(src.map(function (p) {
      return p.spd;
    }))));
  var peak = src.reduce(function (a, b) {
    return b.gst > a.gst ? b : a;
  });
  var mainDir = compass(src[Math.floor(src.length / 2)].dir);
  return "<div class=\"wind\">\n    <div class=\"sub-h\">Wind &amp; gusts (kt)</div>\n    <svg class=\"wind-chart\" viewBox=\"0 0 ".concat(W, " ").concat(H, "\" preserveAspectRatio=\"none\" role=\"img\" aria-label=\"Hourly wind forecast\">\n      ").concat(grid, "<path d=\"").concat(gustArea, "\" class=\"gust-area\"/><path d=\"").concat(path('spd'), "\" class=\"wind-line\"/>").concat(nowLine).concat(arrows, "\n    </svg>\n    <div class=\"wind-sum\">Daytime <b>").concat(mainDir, " ").concat(lo === hi ? lo : "".concat(lo, "\u2013").concat(hi), " kt</b>, gusts to <b>").concat(Math.round(peak.gst), "</b> around ").concat(shortClock(minutesOfDay(new Date(peak.t))), "</div>\n  </div>");
}
function marinePanel(periods, marine, currentsHtml) {
  var forecast = !marine ? '<p class="muted">Marine forecast unavailable.</p>' : !periods.length ? '<p class="muted">Beyond the marine forecast range.</p>' : periods.map(function (p) {
    var sea = parseSeaState(p.text);
    return "<div class=\"marine-period\">\n      <div class=\"marine-label\">".concat(esc(titleCase(p.label)), "</div>\n      ").concat(sea.seas || sea.waves.length ? seaStateBlock(sea) : '', "\n      <p>").concat(highlightMarine(esc(sea.rest)), "</p>\n    </div>");
  }).join('');
  return forecast + currentsHtml;
}

// Pull "Seas ..." and "Wave Detail: ..." out of the forecast text into structured values.
function parseSeaState(text) {
  var seasM = text.match(/Seas ([^.]*?)\.\s*/i);
  var waveM = text.match(/Wave Detail:\s*([^.]*?)\.\s*/i);
  var waves = [];
  if (waveM) {
    var _iterator5 = _createForOfIteratorHelper(waveM[1].matchAll(/\b([NSEW]{1,3}) (\d+(?:\.\d+)?) (?:ft|foot|feet) at (\d+) seconds?/gi)),
      _step5;
    try {
      for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
        var m = _step5.value;
        waves.push({
          dir: m[1].toUpperCase(),
          ft: +m[2],
          sec: +m[3]
        });
      }
    } catch (err) {
      _iterator5.e(err);
    } finally {
      _iterator5.f();
    }
  }
  var rest = text;
  if (waveM && waves.length) rest = rest.replace(waveM[0], '');
  if (seasM) rest = rest.replace(seasM[0], '');
  return {
    seas: seasM ? shortSeas(seasM[1]) : null,
    waves: waves,
    rest: rest.trim()
  };
}
var shortSeas = function shortSeas(s) {
  return s.replace(/^(\d+) to (\d+) (ft|feet)$/i, '$1–$2 ft').replace(/^around (\d+) (ft|feet|foot)$/i, '~$1 ft').replace(/^(\d+) (foot|ft|feet) or less$/i, '≤ $1 ft').replace(/^less than (\d+) (foot|ft|feet)$/i, '< $1 ft');
};

// Short-period waves feel like chop; long-period waves are rolling swell.
var waveKind = function waveKind(sec) {
  return sec <= 4 ? 'chop' : sec >= 8 ? 'swell' : '';
};
function seaStateBlock(_ref5) {
  var seas = _ref5.seas,
    waves = _ref5.waves;
  return "<div class=\"sea-state\">\n    ".concat(seas ? "<div class=\"seas\"><span class=\"seas-num\">".concat(esc(seas), "</span><span class=\"seas-lbl\">seas</span></div>") : '', "\n    ").concat(waves.length ? "<ul class=\"waves\">".concat(waves.map(function (w) {
    return "<li title=\"Waves from the ".concat(esc(w.dir), ", ").concat(w.ft, " ft every ").concat(w.sec, " seconds\">\n      ").concat(windArrow(COMPASS.indexOf(w.dir) * 22.5, 13), "\n      <span class=\"w-dir\">").concat(esc(w.dir), "</span>\n      <span class=\"w-ht\">").concat(w.ft, " ft</span>\n      <span class=\"w-per\">").concat(w.sec, "s</span>\n      ").concat(waveKind(w.sec) ? "<span class=\"w-kind\">".concat(waveKind(w.sec), "</span>") : '', "</li>");
  }).join(''), "</ul>") : '', "\n  </div>");
}

// Arrow pointing the way the water flows (current directions are "toward", unlike wind).
var flowArrow = function flowArrow(deg) {
  var size = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 11;
  return windArrow(deg == null ? null : deg - 180, size);
};
function currentsBlock(i, currents, isToday) {
  if (!currents) return '';
  var nowMin = isToday ? minutesOfDay(new Date()) : -1;
  return "<div class=\"currents\"><div class=\"sub-h\">Currents</div>".concat(currents.map(function (s) {
    var ev = s.events.filter(function (e) {
      return e.dayIndex === i;
    });
    return "<div class=\"cur-station\"><div class=\"cur-name\">".concat(esc(s.name), "</div>\n      <div class=\"cur-key\">").concat(flowArrow(s.floodDir), " ").concat(compass(s.floodDir), " toward ").concat(esc(s.floodTo), " \xB7 ").concat(flowArrow(s.ebbDir), " ").concat(compass(s.ebbDir), " toward ").concat(esc(s.ebbTo), "</div>\n      <ul class=\"cur-list\">").concat(ev.map(function (e) {
      var dir = e.type === 'flood' ? s.floodDir : s.ebbDir;
      return "<li class=\"".concat(esc(e.type)).concat(e.min < nowMin ? ' past' : '', "\"><span class=\"cur-t\">").concat(shortClock(e.min), "</span>").concat(e.type === 'slack' ? 'slack' : "".concat(flowArrow(dir), " ").concat(compass(dir), " ").concat(e.v.toFixed(1)), "</li>");
    }).join(''), "</ul></div>");
  }).join(''), "<p class=\"fine\">Max current in knots \xB7 <a href=\"#currents-explained\">what do these mean?</a></p></div>");
}

// Footer table: which way flood and ebb run at each current station.
function renderCurrentsKey(currents) {
  var el = document.getElementById('currents-explained');
  if (!el || !currents) return;
  el.hidden = false;
  el.querySelector('tbody').innerHTML = currents.map(function (s) {
    return "<tr>\n    <th>".concat(esc(s.name), "</th>\n    <td>").concat(flowArrow(s.floodDir), " ").concat(s.floodDir, "\xB0 ").concat(compass(s.floodDir), " toward ").concat(esc(s.floodTo), "</td>\n    <td>").concat(flowArrow(s.ebbDir), " ").concat(s.ebbDir, "\xB0 ").concat(compass(s.ebbDir), " toward ").concat(esc(s.ebbTo), "</td></tr>");
  }).join('');
}
function highlightMarine(s) {
  return s.replace(/(\b[NSEW]{1,3} winds? [^.]*?(kt|knots))/g, '<strong>$1</strong>').replace(/(Seas [^.]*?(ft|foot|less))/g, '<strong>$1</strong>');
}
var titleCase = function titleCase(s) {
  return s.toLowerCase().replace(/\b\w/g, function (c) {
    return c.toUpperCase();
  }).replace(/\bThrough\b/g, 'through').replace(/\bAnd\b/g, '&');
};
function tidesPanel(i, tides, sm, range, isToday) {
  if (!tides) return '<p class="muted">Tide predictions unavailable.</p>';
  var list = tides.hilo.filter(function (p) {
    return p.dayIndex === i;
  });
  var nowMin = isToday ? minutesOfDay(new Date()) : null;
  var st = tides.stats;
  return "".concat(st ? daySizeSummary(list, st, sm) : '', "\n    ").concat(tideChart(i, tides, sm.sun, range, nowMin), "\n    <ul class=\"tide-list\">").concat(list.map(function (p) {
    var size = st && tideSize(p, st);
    var kind = p.type === 'H' ? 'high' : 'low';
    return "<li class=\"".concat(p.type === 'H' ? 'hi' : 'lo').concat(isToday && p.min < nowMin ? ' past' : '', "\">\n      <span class=\"tide-type\">").concat(p.type === 'H' ? 'High' : 'Low', "</span>\n      <span class=\"tide-time\">").concat(fmtClock(p.min), "</span>\n      <span class=\"tide-ht\">").concat(p.v.toFixed(1), " ft</span>\n      ").concat(size ? "<span class=\"tide-size\" title=\"".concat(p.type === 'H' ? 'Higher' : 'Lower', " than ").concat(Math.round(size.r * 100), "% of ").concat(kind, " tides in the next 12 months\">\n        <span class=\"size-bar\"><i style=\"width:").concat(Math.max(4, Math.round(size.r * 100)), "%\"></i></span>").concat(size.label, "</span>") : '', "</li>");
  }).join(''), "</ul>\n    ").concat(st ? "<p class=\"tide-context\">\n      Biggest in the next 12 months: <b>".concat(st.maxHigh.v.toFixed(1), " ft</b> high (").concat(shortDate(st.maxHigh.key), "),\n      <b>").concat(st.minLow.v.toFixed(1), " ft</b> low (").concat(shortDate(st.minLow.key), ").\n      Average high ").concat(st.avgHigh.toFixed(1), " ft, low ").concat(st.avgLow.toFixed(1), " ft.\n      <span class=\"fine\">Predicted tides; storms and wind can push water higher or lower.</span></p>") : '');
}
var shortDate = function shortDate(key) {
  return new Date(key + 'T12:00:00Z').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  });
};

// Spring vs. neap: how the day's high-to-low range compares with the next 12 months.
function daySizeSummary(list, st, sm) {
  if (list.length < 2) return '';
  var vals = list.map(function (p) {
    return p.v;
  });
  var range = Math.max.apply(Math, _toConsumableArray(vals)) - Math.min.apply(Math, _toConsumableArray(vals));
  var r = rankAbove(st.ranges, range);
  var _ref6 = r >= 0.75 ? ['Spring tides', 'spring'] : r <= 0.25 ? ['Neap tides', 'neap'] : ['Moderate tides', 'moderate'],
    _ref7 = _slicedToArray(_ref6, 2),
    label = _ref7[0],
    cls = _ref7[1];
  var phase = sm.illum.phase;
  var dist = function dist(t) {
    return Math.min(Math.abs(phase - t), 1 - Math.abs(phase - t));
  };
  var moon = dist(0.5) < 0.1 ? ' · near full moon' : dist(0) < 0.1 ? ' · near new moon' : dist(0.25) < 0.1 || dist(0.75) < 0.1 ? ' · near half moon' : '';
  return "<div class=\"tide-day ".concat(cls, "\"><b>").concat(label, "</b> \xB7 ").concat(range.toFixed(1), " ft range\n    <div class=\"muted\">Bigger swing than ").concat(Math.round(r * 100), "% of days").concat(moon, "</div></div>");
}
function sunMoonPanel(sm) {
  var delta = Math.round(sm.deltaLength / 1000);
  var sign = delta < 0 ? '−' : '+';
  var deltaStr = "".concat(sign).concat(Math.floor(Math.abs(delta) / 60), "m ").concat(String(Math.abs(delta) % 60).padStart(2, '0'), "s");
  return "<div class=\"sun\">\n      <div class=\"sm-row\"><span>\uD83C\uDF05 Sunrise</span><strong>".concat(fmt(sm.sun.sunrise), "</strong></div>\n      <div class=\"sm-row\"><span>\uD83C\uDF07 Sunset</span><strong>").concat(fmt(sm.sun.sunset), "</strong></div>\n      <div class=\"sm-row muted\"><span>First / last light</span><span>").concat(fmt(sm.sun.dawn), " / ").concat(fmt(sm.sun.dusk), "</span></div>\n      <div class=\"sm-row muted\"><span>Daylight</span><span>").concat(fmtDuration(sm.dayLength), " (").concat(deltaStr, ")</span></div>\n    </div>\n    <div class=\"moon-block\">\n      ").concat(moonSvg(sm.illum.fraction, sm.illum.phase), "\n      <div>\n        <div class=\"moon-name\">").concat(esc(sm.phaseName)).concat(sm.event ? ' <span class="badge">today</span>' : '', "</div>\n        <div class=\"muted\">").concat(Math.round(sm.illum.fraction * 100), "% illuminated</div>\n        <div class=\"muted\">Rise ").concat(fmt(sm.moon.rise), " \xB7 Set ").concat(fmt(sm.moon.set), "</div>\n      </div>\n    </div>");
}
function renderDays(state) {
  var days = state.days,
    weather = state.weather,
    marine = state.marine,
    tides = state.tides,
    currents = state.currents;
  var range = tides ? {
    min: Math.min.apply(Math, _toConsumableArray(tides.curve.map(function (p) {
      return p.v;
    }))) - 0.3,
    max: Math.max.apply(Math, _toConsumableArray(tides.curve.map(function (p) {
      return p.v;
    }))) + 0.3
  } : null;
  var wind = weather === null || weather === void 0 ? void 0 : weather.wind;
  var windMax = wind ? Math.max(25, Math.ceil(Math.max.apply(Math, _toConsumableArray(wind.map(function (w) {
    return w.gst;
  }))) / 5) * 5) : 25;
  var nav = document.getElementById('day-nav');
  nav.innerHTML = "<div class=\"wrap\">".concat(days.map(function (key, i) {
    var l = keyLabel(key, i);
    var w = weather === null || weather === void 0 ? void 0 : weather.byDay[key];
    var p = (w === null || w === void 0 ? void 0 : w.day) || (w === null || w === void 0 ? void 0 : w.night);
    return "<a href=\"#d-".concat(key, "\"><span>").concat(i === 0 ? 'Today' : l["short"], "</span><span class=\"nav-icon\">").concat(p ? wxIcon(p.shortForecast, p.isDaytime, 26) : '', "</span><span class=\"nav-temp\">").concat(w !== null && w !== void 0 && w.day ? w.day.temperature + '°' : '').concat(w !== null && w !== void 0 && w.night ? "<small>".concat(w.night.temperature, "\xB0</small>") : '', "</span></a>");
  }).join(''), "</div>");
  document.getElementById('days').innerHTML = days.map(function (key, i) {
    var _mp$;
    var l = keyLabel(key, i);
    var sm = sunMoon(key);
    var w = weather === null || weather === void 0 ? void 0 : weather.byDay[key];
    var mp = marineForDay(marine, key);
    var windSummary = (_mp$ = mp[0]) === null || _mp$ === void 0 || (_mp$ = _mp$.text.match(/^[^.]*winds?[^.]*\./i)) === null || _mp$ === void 0 ? void 0 : _mp$[0];
    var seasSummary = mp[0] && parseSeaState(mp[0].text).seas;
    var isToday = i === 0;
    return "<section class=\"day\" id=\"d-".concat(key, "\">\n      <header class=\"day-head\">\n        <div>\n          <h2>").concat(esc(l.title), "</h2>\n          <div class=\"day-date\">").concat(esc(l.date), "</div>\n        </div>\n        <div class=\"day-chips\">\n          ").concat(w !== null && w !== void 0 && w.day || w !== null && w !== void 0 && w.night ? "<span class=\"chip\">".concat(wxIcon((w.day || w.night).shortForecast, !!w.day, 18), " ").concat(w.day ? "<b>".concat(w.day.temperature, "\xB0</b>") : '').concat(w.day && w.night ? ' / ' : '').concat(w.night ? "".concat(w.night.temperature, "\xB0") : '', "</span>") : '', "\n          ").concat(windSummary ? "<span class=\"chip\">\u26F5 ".concat(esc(windSummary.replace(/\.$/, ''))).concat(seasSummary ? " \xB7 seas ".concat(esc(seasSummary)) : '', "</span>") : '', "\n          <span class=\"chip\">\u2600\uFE0F ").concat(fmt(sm.sun.sunrise), " \u2013 ").concat(fmt(sm.sun.sunset), "</span>\n          ").concat(sm.event ? "<span class=\"chip moon-chip\">".concat(moonSvg(sm.illum.fraction, sm.illum.phase, 16), " ").concat(esc(sm.event), "</span>") : '', "\n        </div>\n      </header>\n      <div class=\"panels\">\n        <div class=\"panel\"><h3>Tides</h3>").concat(tidesPanel(i, tides, sm, range, isToday), "</div>\n        <div class=\"panel\"><h3>Marine \xB7 Buzzards Bay</h3>").concat(marinePanel(mp, marine, currentsBlock(i, currents, isToday)), "</div>\n        <div class=\"panel\"><h3>Weather</h3>").concat(weatherPanel(w, windChart(key, wind, windMax, isToday)), "</div>\n        <div class=\"panel\"><h3>Sun &amp; Moon</h3>").concat(sunMoonPanel(sm), "</div>\n      </div>\n    </section>");
  }).join('');
}
function refresh() {
  return _refresh.apply(this, arguments);
}
function _refresh() {
  _refresh = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee11() {
    var _state$weather;
    var todayKey, days, sources, names, results, _i3, _arr2, _results$tides$value, _results$tides$value2, p, _iterator7, _step7, s, _iterator8, _step8, e, state, stale, missing, _t5;
    return _regenerator().w(function (_context11) {
      while (1) switch (_context11.n) {
        case 0:
          todayKey = dateKey(new Date());
          days = Array.from({
            length: CONFIG.days
          }, function (_, i) {
            return addDays(todayKey, i);
          });
          sources = {
            weather: ['Weather', 48, loadWeather],
            marine: ['Marine forecast', 48, loadMarine],
            tides: ['Tides', 24 * 7, function () {
              return loadTides(todayKey);
            }],
            currents: ['Currents', 24 * 7, function () {
              return loadCurrents(todayKey);
            }],
            waterTemp: ['Water temperature', 6, loadWaterTemp],
            waterLevel: ['Water level', 3, function () {
              return loadWaterLevel(todayKey);
            }],
            buoy: ['Buzzards Bay tower', 3, loadBuoy],
            alerts: ['Alerts', 6, loadAlerts]
          };
          names = Object.keys(sources);
          _t5 = Object;
          _context11.n = 1;
          return Promise.all(names.map(/*#__PURE__*/function () {
            var _ref1 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee10(k) {
              var _t3, _t4;
              return _regenerator().w(function (_context10) {
                while (1) switch (_context10.n) {
                  case 0:
                    _t3 = k;
                    _context10.n = 1;
                    return cached(k, sources[k][1], sources[k][2]);
                  case 1:
                    _t4 = _context10.v;
                    return _context10.a(2, [_t3, _t4]);
                }
              }, _callee10);
            }));
            return function (_x9) {
              return _ref1.apply(this, arguments);
            };
          }()));
        case 1:
          results = _t5.fromEntries.call(_t5, _context11.v);
          // Index tide and current events by day relative to today (cached data may start on an earlier day).
          for (_i3 = 0, _arr2 = [].concat(_toConsumableArray(((_results$tides$value = results.tides.value) === null || _results$tides$value === void 0 ? void 0 : _results$tides$value.curve) || []), _toConsumableArray(((_results$tides$value2 = results.tides.value) === null || _results$tides$value2 === void 0 ? void 0 : _results$tides$value2.hilo) || [])); _i3 < _arr2.length; _i3++) {
            p = _arr2[_i3];
            p.dayIndex = dayDiff(todayKey, p.key);
            p.abs = p.dayIndex * 1440 + p.min;
          }
          _iterator7 = _createForOfIteratorHelper(results.currents.value || []);
          try {
            for (_iterator7.s(); !(_step7 = _iterator7.n()).done;) {
              s = _step7.value;
              _iterator8 = _createForOfIteratorHelper(s.events);
              try {
                for (_iterator8.s(); !(_step8 = _iterator8.n()).done;) {
                  e = _step8.value;
                  e.dayIndex = dayDiff(todayKey, e.key);
                }
              } catch (err) {
                _iterator8.e(err);
              } finally {
                _iterator8.f();
              }
            }
          } catch (err) {
            _iterator7.e(err);
          } finally {
            _iterator7.f();
          }
          state = _objectSpread({
            days: days
          }, Object.fromEntries(names.map(function (k) {
            return [k, results[k].value];
          })));
          stale = names.filter(function (k) {
            return results[k].staleSince;
          }).map(function (k) {
            return [sources[k][0], results[k].staleSince];
          });
          missing = names.filter(function (k) {
            return !results[k].value && results[k].error;
          }).map(function (k) {
            return sources[k][0];
          });
          renderNow(state);
          renderAlerts(state, stale);
          renderDays(state);
          sourceCell = (_state$weather = state.weather) === null || _state$weather === void 0 ? void 0 : _state$weather.cell;
          if (!document.getElementById('details').hidden) renderSourceMap(sourceCell); // the map waits until Details opens
          renderCurrentsKey(state.currents);
          document.getElementById('updated').textContent = "Updated ".concat(fmt(new Date())) + (state.marine ? " \xB7 Marine forecast issued ".concat(state.marine.issued) : '') + (missing.length ? " \xB7 Unavailable: ".concat(missing.join(', ')) : '');
          renderPlan(state, {
            stale: stale,
            missing: missing,
            todayKey: todayKey
          });
        case 2:
          return _context11.a(2);
      }
    }, _callee11);
  }));
  return _refresh.apply(this, arguments);
}
var sourceCell = null;

// a failure shows on the page (polyfills.js) rather than leaving "Loading forecast…" up for ever
var startRefresh = function startRefresh() {
  return refresh()["catch"](function (e) {
    console.error(e);
    if (window.cvError) window.cvError(e && e.message ? "".concat(e.message).concat(e.stack ? " \xB7 ".concat(String(e.stack).split('\n')[0]) : '') : String(e));
  });
};
startRefresh();
setInterval(startRefresh, CONFIG.refreshMinutes * 60000);
