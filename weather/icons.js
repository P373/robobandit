// Built from weather/src/icons.js by tools/build-weather.js (plain ES5, for old iPads). Edit the source, not this file.
'use strict';

// Small weather icon set drawn on a 32×32 grid. Colors come from CSS variables
// so the icons follow light/dark mode.
var ICON_PARTS = {
  sun: function sun(cx, cy, r) {
    var rays = Array.from({
      length: 8
    }, function (_, i) {
      var a = i * Math.PI / 4;
      var x1 = cx + Math.cos(a) * (r + 2.2),
        y1 = cy + Math.sin(a) * (r + 2.2);
      var x2 = cx + Math.cos(a) * (r + 4.6),
        y2 = cy + Math.sin(a) * (r + 4.6);
      return "M".concat(x1.toFixed(1), " ").concat(y1.toFixed(1), "L").concat(x2.toFixed(1), " ").concat(y2.toFixed(1));
    }).join('');
    return "<circle cx=\"".concat(cx, "\" cy=\"").concat(cy, "\" r=\"").concat(r, "\" fill=\"var(--icon-sun)\"/>\n      <path d=\"").concat(rays, "\" stroke=\"var(--icon-sun)\" stroke-width=\"2\" stroke-linecap=\"round\"/>");
  },
  moon: function moon() {
    var tx = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
    var ty = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    var s = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;
    return "<path transform=\"translate(".concat(tx, " ").concat(ty, ") scale(").concat(s, ")\" d=\"M19 4.5A11.5 11.5 0 1 0 28 22 9.5 9.5 0 0 1 19 4.5z\" fill=\"var(--icon-moon)\"/>");
  },
  cloud: function cloud() {
    var tx = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
    var ty = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    var s = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;
    var fill = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'var(--icon-cloud)';
    return "<path transform=\"translate(".concat(tx, " ").concat(ty, ") scale(").concat(s, ")\" d=\"M8.5 25h15a6 6 0 0 0 .9-11.93A8 8 0 0 0 9.2 15.05 5 5 0 0 0 8.5 25z\" fill=\"").concat(fill, "\"/>");
  },
  rain: function rain() {
    return "<path d=\"M11 24.5l-2 5M17 24.5l-2 5M23 24.5l-2 5\" stroke=\"var(--icon-rain)\" stroke-width=\"2\" stroke-linecap=\"round\"/>";
  },
  snow: function snow() {
    return "<g fill=\"var(--icon-snow)\"><circle cx=\"10\" cy=\"26\" r=\"1.6\"/><circle cx=\"16\" cy=\"29\" r=\"1.6\"/><circle cx=\"22\" cy=\"26\" r=\"1.6\"/><circle cx=\"13\" cy=\"31\" r=\"1.2\"/><circle cx=\"19\" cy=\"31\" r=\"1.2\"/></g>";
  },
  bolt: function bolt() {
    return "<path d=\"M17 20l-5 7h4l-2 5 6-8h-4l2-4z\" fill=\"var(--icon-sun)\"/>";
  },
  fog: function fog() {
    return "<path d=\"M5 24h22M8 28h20M5 32h16\" stroke=\"var(--icon-cloud)\" stroke-width=\"2\" stroke-linecap=\"round\"/>";
  }
};
var ICONS = {
  sun: function sun() {
    return ICON_PARTS.sun(16, 16, 6);
  },
  moon: function moon() {
    return ICON_PARTS.moon();
  },
  'partly-day': function partlyDay() {
    return ICON_PARTS.sun(11, 11, 5) + ICON_PARTS.cloud(7, 7, 0.8);
  },
  'partly-night': function partlyNight() {
    return ICON_PARTS.moon(-2, -2, 0.7) + ICON_PARTS.cloud(7, 7, 0.8);
  },
  cloud: function cloud() {
    return ICON_PARTS.cloud(-2, 5, 1.1, 'var(--icon-cloud-dark)') + ICON_PARTS.cloud(0, 0, 1);
  },
  rain: function rain() {
    return ICON_PARTS.cloud(0, -5) + ICON_PARTS.rain();
  },
  'showers-day': function showersDay() {
    return ICON_PARTS.sun(10, 8, 4) + ICON_PARTS.cloud(0, -4) + ICON_PARTS.rain();
  },
  thunder: function thunder() {
    return ICON_PARTS.cloud(0, -5, 1, 'var(--icon-cloud-dark)') + ICON_PARTS.bolt();
  },
  snow: function snow() {
    return ICON_PARTS.cloud(0, -5) + ICON_PARTS.snow();
  },
  fog: function fog() {
    return ICON_PARTS.cloud(0, -6) + ICON_PARTS.fog();
  },
  wind: function wind() {
    return "<path d=\"M3 11h16a4 4 0 1 0-4-4M3 17h22a4 4 0 1 1-4 4M3 23h11\" fill=\"none\" stroke=\"var(--icon-cloud)\" stroke-width=\"2.4\" stroke-linecap=\"round\"/>";
  }
};
function wxIconType() {
  var _short = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  var isDay = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
  var s = _short.toLowerCase();
  if (s.includes('thunder')) return 'thunder';
  if (s.includes('snow') || s.includes('sleet') || s.includes('flurr')) return 'snow';
  if (s.includes('rain') || s.includes('shower') || s.includes('drizzle')) {
    return isDay && (s.includes('sunny') || s.includes('chance') || s.includes('slight')) ? 'showers-day' : 'rain';
  }
  if (s.includes('fog') || s.includes('haze') || s.includes('mist')) return 'fog';
  if (s.includes('wind') || s.includes('breezy')) return 'wind';
  if (s.includes('mostly cloudy') || s.includes('overcast') || s === 'cloudy') return 'cloud';
  if (s.includes('partly') || s.includes('mostly sunny') || s.includes('mostly clear')) return isDay ? 'partly-day' : 'partly-night';
  if (s.includes('sunny') || s.includes('clear')) return isDay ? 'sun' : 'moon';
  if (s.includes('cloud')) return 'cloud';
  return isDay ? 'partly-day' : 'partly-night';
}
function wxIcon(_short2, isDay) {
  var size = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 32;
  var type = wxIconType(_short2, isDay);
  return "<svg class=\"wx-icon\" width=\"".concat(size, "\" height=\"").concat(size, "\" viewBox=\"0 0 32 32\" role=\"img\" aria-label=\"").concat(type.replace('-', ' '), "\">").concat(ICONS[type](), "</svg>");
}
