// For old iPads (iOS 10.3 / Safari 10.1): the few newer built-in functions the page uses, and a flag for the
// CSS when the browser can't space flexbox items with `gap`. Plain old JavaScript on purpose; loaded first.
(function () {
  'use strict';
  function define(obj, name, fn) {
    if (!obj[name]) Object.defineProperty(obj, name, { value: fn, configurable: true, writable: true });
  }
  // [1, 2, 3].at(-1) → 3
  define(Array.prototype, 'at', function (i) {
    i = Math.trunc(i) || 0;
    if (i < 0) i += this.length;
    return i < 0 || i >= this.length ? undefined : this[i];
  });
  // Object.fromEntries([['a', 1]]) → { a: 1 }
  define(Object, 'fromEntries', function (entries) {
    var out = {};
    Array.from(entries, function (e) { out[e[0]] = e[1]; });
    return out;
  });
  // 'a1b2'.matchAll(/\d/g) → every match, as exec() would give them
  define(String.prototype, 'matchAll', function (re) {
    var flags = re.flags.indexOf('g') < 0 ? re.flags + 'g' : re.flags, r = new RegExp(re.source, flags), all = [], m;
    while ((m = r.exec(this)) !== null) { all.push(m); if (m[0] === '') r.lastIndex++; }
    return all[Symbol.iterator]();
  });

  // flexbox gap arrived in iOS 14.1: without it, styles.css spaces those rows with margins instead
  var probe = document.createElement('div');
  probe.style.cssText = 'display:flex;flex-direction:column;row-gap:1px;position:absolute;visibility:hidden';
  probe.appendChild(document.createElement('div'));
  probe.appendChild(document.createElement('div'));
  document.documentElement.appendChild(probe);
  if (probe.scrollHeight !== 1) document.documentElement.className += ' no-flexgap';
  document.documentElement.removeChild(probe);
})();
