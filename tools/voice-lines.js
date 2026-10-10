// Collects every sentence the site reads aloud into voice/lines.json, for tools/make-voice.py to record
// with the 🌟 RoboBandit voice. Run after changing anything that is read aloud:  node tools/voice-lines.js
// Needs Playwright (see tests/README.md). Each page says what it reads:
//   lessons: the slides School.start() was given (what 🔈 Read to me reads)
//   ABC Train: abcLines()
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const LESSONS = ['2nd-grade/math.html', '2nd-grade/reading.html', '2nd-grade/science.html', '2nd-grade/social-studies.html',
  '5th-grade/math.html', '5th-grade/reading-rights.html', '5th-grade/science.html', '5th-grade/social-studies.html'];

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const lines = {};
  const add = async texts => {
    const got = await p.evaluate(ts => ts.flatMap(t => RB.voice.sentences(t).map(s => [RB.voice.key(s), s])), texts);
    for (const [k, s] of got) lines[k] = s;
    return got.length;
  };
  const open = async f => { await p.goto('file://' + path.join(ROOT, f)); await p.waitForTimeout(300); };
  await open('index.html');
  console.log('menu', await add(["Hi there! I'm so happy to read with you. Are you ready? Let's go!"]));
  for (const f of LESSONS) {
    await open(f);
    const texts = await p.evaluate(() => {
      const plain = s => String(s).replace(/\*\*/g, '');
      return School.unit.items.filter(it => it.kind === 'lesson').flatMap(it => it.slides.map(S => plain(S.t) + '. ' + plain(S.p)));
    });
    console.log(f, await add(texts));
  }
  await open('preschool/abc-train.html');
  console.log('ABC Train', await add(await p.evaluate(() => typeof abcLines === 'function' ? abcLines() : [])));
  const sorted = Object.fromEntries(Object.entries(lines).sort((x, y) => x[0] < y[0] ? -1 : 1));
  fs.mkdirSync(path.join(ROOT, 'voice'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'voice', 'lines.json'), JSON.stringify(sorted, null, 1) + '\n');
  const chars = Object.values(lines).reduce((a, s) => a + s.length, 0);
  console.log(`voice/lines.json: ${Object.keys(lines).length} sentences, ${chars} letters`);
  await b.close();
})();
