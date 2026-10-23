// Built from weather/src/map.js by tools/build-weather.js (plain ES5, for old iPads). Edit the source, not this file.
'use strict';

// Map of where each piece of data on the page comes from.
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
var SOURCES = [{
  id: 'home',
  lat: CONFIG.lat,
  lon: CONFIG.lon,
  color: '#d33',
  label: 'M',
  name: 'Megansett Harbor',
  what: 'NWS weather & wind forecast (2.5 km grid square shown) · sun & moon times'
}, {
  id: 'tide',
  lat: 41.605,
  lon: -70.6517,
  color: '#2b7fb8',
  label: 'T',
  name: 'Chappaquoit Point, West Falmouth',
  what: 'Tide predictions (NOAA 8447685)',
  url: 'https://tidesandcurrents.noaa.gov/stationhome.html?id=8447685'
}, {
  id: 'wh',
  lat: 41.5236,
  lon: -70.6711,
  color: '#7b4fc9',
  label: 'W',
  name: 'Woods Hole',
  what: 'Water temperature & observed water level (NOAA 8447930)',
  url: 'https://tidesandcurrents.noaa.gov/stationhome.html?id=8447930'
}, {
  id: 'canal',
  lat: 41.74268,
  lon: -70.61418,
  color: '#b5651d',
  label: 'C',
  name: 'Cape Cod Canal · Railroad Bridge',
  what: 'Current predictions (NOAA COD0904)',
  url: 'https://tidesandcurrents.noaa.gov/noaacurrents/predictions?id=COD0904_15'
}, {
  id: 'strait',
  lat: 41.51929,
  lon: -70.68289,
  color: '#b5651d',
  label: 'C',
  name: 'Woods Hole · The Strait',
  what: 'Current predictions (NOAA COD0911)',
  url: 'https://tidesandcurrents.noaa.gov/noaacurrents/predictions?id=COD0911_1'
}];
function milesFromHome(s) {
  var R = 3958.8,
    rad = Math.PI / 180;
  var dLat = (s.lat - CONFIG.lat) * rad,
    dLon = (s.lon - CONFIG.lon) * rad;
  var a = Math.pow(Math.sin(dLat / 2), 2) + Math.cos(CONFIG.lat * rad) * Math.cos(s.lat * rad) * Math.pow(Math.sin(dLon / 2), 2);
  return 2 * R * Math.asin(Math.sqrt(a));
}
var sourceMap = null;
function renderSourceMap(cellGeometry) {
  var el = document.getElementById('source-map');
  if (!el || typeof L === 'undefined') return;
  if (!sourceMap) {
    sourceMap = L.map(el, {
      scrollWheelZoom: false
    });
    // Public US-government basemaps: no API key, and allowed to be embedded.
    // (OpenStreetMap's own tile servers block sites like this; CARTO now requires a key.)
    var usgs = function usgs(service) {
      return L.tileLayer("https://basemap.nationalmap.gov/arcgis/rest/services/".concat(service, "/MapServer/tile/{z}/{y}/{x}"), {
        maxZoom: 16,
        attribution: '<a href="https://www.usgs.gov/programs/national-geospatial-program/national-map">USGS The National Map</a>'
      });
    };
    var layers = {
      'Nautical chart': L.tileLayer.wms('https://gis.charttools.noaa.gov/arcgis/rest/services/MCS/NOAAChartDisplay/MapServer/exts/MaritimeChartService/WMSServer', {
        layers: '0,1,2,3,4,5,6,7',
        format: 'image/png',
        version: '1.3.0',
        tileSize: 512,
        maxZoom: 17,
        attribution: '<a href="https://nauticalcharts.noaa.gov/">NOAA nautical charts</a> · not for navigation'
      }),
      Map: usgs('USGSTopo'),
      Satellite: usgs('USGSImageryOnly')
    };
    layers['Nautical chart'].addTo(sourceMap);
    L.control.layers(layers, null, {
      collapsed: false
    }).addTo(sourceMap);
    for (var _i = 0, _SOURCES = SOURCES; _i < _SOURCES.length; _i++) {
      var s = _SOURCES[_i];
      var icon = L.divIcon({
        className: 'pin',
        html: "<span style=\"background:".concat(s.color, "\">").concat(s.label, "</span>"),
        iconSize: [26, 26],
        iconAnchor: [13, 13],
        popupAnchor: [0, -12]
      });
      L.marker([s.lat, s.lon], {
        icon: icon,
        title: s.name
      }).addTo(sourceMap).bindPopup("<b>".concat(esc(s.name), "</b><br>").concat(esc(s.what)).concat(s.url ? "<br><a href=\"".concat(s.url, "\" target=\"_blank\" rel=\"noopener\">NOAA station page</a>") : ''));
    }
    sourceMap.fitBounds(SOURCES.map(function (s) {
      return [s.lat, s.lon];
    }), {
      padding: [30, 30]
    });
    loadZoneOutline();
    document.getElementById('source-list').innerHTML = SOURCES.map(function (s) {
      return "<li>\n      <span class=\"pin-dot\" style=\"background:".concat(s.color, "\">").concat(s.label, "</span>\n      <div><b>").concat(s.url ? "<a href=\"".concat(s.url, "\" target=\"_blank\" rel=\"noopener\">").concat(esc(s.name), "</a>") : esc(s.name), "</b>\n      ").concat(s.id === 'home' ? '' : "<span class=\"muted\"> \xB7 ".concat(milesFromHome(s).toFixed(1), " mi away</span>"), "\n      <div class=\"muted\">").concat(esc(s.what), "</div></div></li>");
    }).join('') + "<li><span class=\"pin-dot zone\"></span><div><b>Buzzards Bay marine zone (ANZ234)</b><div class=\"muted\">Area covered by the NWS marine forecast</div></div></li>";
  }
  if (cellGeometry && !sourceMap._cellLayer) {
    sourceMap._cellLayer = L.geoJSON(cellGeometry, {
      style: {
        color: '#d33',
        weight: 2,
        fillOpacity: 0.15
      }
    }).bindTooltip('NWS forecast grid square').addTo(sourceMap);
  }
}

// The zone outline is large (~110 KB), so cache it; it essentially never changes.
function loadZoneOutline() {
  return _loadZoneOutline.apply(this, arguments);
}
function _loadZoneOutline() {
  _loadZoneOutline = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
    var key, geometry, zone, svg, _t;
    return _regenerator().w(function (_context) {
      while (1) switch (_context.p = _context.n) {
        case 0:
          key = "cv:zone:".concat(CONFIG.marineZone);
          geometry = null;
          try {
            geometry = JSON.parse(localStorage.getItem(key));
          } catch (_unused) {/* ignore */}
          if (geometry) {
            _context.n = 4;
            break;
          }
          _context.p = 1;
          _context.n = 2;
          return getJSON("https://api.weather.gov/zones/forecast/".concat(CONFIG.marineZone));
        case 2:
          geometry = _context.v.geometry;
          try {
            localStorage.setItem(key, JSON.stringify(geometry));
          } catch (_unused2) {/* storage full */}
          _context.n = 4;
          break;
        case 3:
          _context.p = 3;
          _t = _context.v;
          console.error('zone outline', _t);
          return _context.a(2);
        case 4:
          // Orange diagonal hatching: stands out from the chart's blue water without muddying it.
          zone = L.geoJSON(geometry, {
            style: {
              color: '#e8590c',
              weight: 3,
              fillColor: 'url(#zone-hatch)',
              fillOpacity: 1
            }
          }).bindTooltip('Buzzards Bay marine forecast zone (ANZ234)', {
            sticky: true
          }).addTo(sourceMap).bringToBack();
          svg = sourceMap.getRenderer(zone.getLayers()[0])._container;
          if (svg && !svg.querySelector('#zone-hatch')) {
            svg.insertAdjacentHTML('afterbegin', "<defs><pattern id=\"zone-hatch\" width=\"9\" height=\"9\" patternUnits=\"userSpaceOnUse\" patternTransform=\"rotate(45)\">\n      <rect width=\"3\" height=\"9\" fill=\"#e8590c\" fill-opacity=\"0.45\"/></pattern></defs>");
          }
        case 5:
          return _context.a(2);
      }
    }, _callee, null, [[1, 3]]);
  }));
  return _loadZoneOutline.apply(this, arguments);
}
