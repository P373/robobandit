#!/usr/bin/env python3
"""Reads every sentence in voice/lines.json aloud with a natural-sounding voice and saves one small mp3 each.

The 🌟 RoboBandit voice (see RB.voice in common.js) plays these instead of the device's own voice, which on
iPads is robotic unless better voices have been downloaded. Run after adding or changing anything that is
read aloud:

    node tools/voice-lines.js        # collects the sentences into voice/lines.json
    python3 tools/make-voice.py      # reads out the new ones (a few seconds each), drops ones no longer used
    python3 tools/make-voice.py --index-only   # (lists what's done so far, if you stop a long run part way)

Needs:  pip install kokoro-onnx soundfile   ffmpeg   npm (to fetch the voice model the first time)
The voice is Kokoro-82M (Apache-2.0) speaking as "af_heart", fetched from npm (kokoro-q8-shards, kokoro-js)
into ~/.cache/robobandit-voice.
"""
import json, os, re, subprocess, sys, tempfile
from concurrent.futures import ProcessPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICE_DIR = os.path.join(ROOT, 'voice')
CACHE = os.path.expanduser('~/.cache/robobandit-voice')
VOICE, SPEED = 'af_heart', 0.92

# Single letters said as letters ("B!" is "bee", not "buh")
LETTER = dict(zip('ABCDEFGHIJKLMNOPQRSTUVWXYZ', ['eh', 'bee', 'see', 'dee', 'ee', 'eff', 'jee', 'aitch', 'eye', 'jay', 'kay', 'ell', 'em', 'en', 'oh',
                                                  'pee', 'cue', 'ar', 'ess', 'tee', 'you', 'vee', 'double you', 'ex', 'why', 'zee']))


WORDS = {'Iguana': 'Igwahna', 'iguana': 'igwahna'}   # words the reader says wrong, spelled the way they sound


def speak_as(t):
    for w, say in WORDS.items():
        t = re.sub(r'\b' + w + r'\b', say, t)
    t = re.sub(r'\bA B C\b', 'eh bee see', t)
    t = re.sub(r'(?<![\w.])([A-Z])(?=[!?]|\.$| is for)', lambda m: LETTER[m.group(1)], t)      # "B!", "B is for Bear"
    t = re.sub(r'\b(letter|find|for|that\'s|That\'s) ([A-Z])\b(?!-)', lambda m: m.group(1) + ' ' + LETTER[m.group(2)], t)  # "the letter B", "find C"
    return t


def fetch_model():
    os.makedirs(CACHE, exist_ok=True)
    model, voice = os.path.join(CACHE, 'kokoro-q8.onnx'), os.path.join(CACHE, 'voices.npz')
    if not os.path.exists(model) or not os.path.exists(voice):
        import numpy as np
        subprocess.run(['npm', 'pack', 'kokoro-q8-shards@1.0.0', 'kokoro-js@1.2.1', '--silent'], cwd=CACHE, check=True)
        subprocess.run(['tar', 'xzf', 'kokoro-q8-shards-1.0.0.tgz'], cwd=CACHE, check=True)
        with open(model, 'wb') as out:
            for i in range(6):
                out.write(open(os.path.join(CACHE, 'package', f'kokoro-q8.part{i}.bin'), 'rb').read())
        subprocess.run(['tar', 'xzf', 'kokoro-js-1.2.1.tgz', f'package/voices/{VOICE}.bin'], cwd=CACHE, check=True)
        np.savez(voice, **{VOICE: np.fromfile(os.path.join(CACHE, 'package', 'voices', VOICE + '.bin'), dtype=np.float32).reshape(-1, 1, 256)})
    return model, voice


_tts = None


def make(job):
    key, text = job
    global _tts
    import numpy as np, soundfile as sf
    if _tts is None:
        import onnxruntime as rt
        from kokoro_onnx import Kokoro
        model, voices = fetch_model()
        opts = rt.SessionOptions(); opts.intra_op_num_threads = 2; opts.inter_op_num_threads = 1
        _tts = Kokoro.from_session(rt.InferenceSession(model, opts, providers=['CPUExecutionProvider']), voices)
    audio, sr = _tts.create(speak_as(text), voice=VOICE, speed=SPEED, lang='en-us')
    audio = np.asarray(audio, dtype=np.float32)
    loud = np.nonzero(np.abs(audio) > 0.01)[0]                       # trim the quiet ends, keep a breath
    if len(loud):
        audio = audio[max(0, loud[0] - int(0.04 * sr)): loud[-1] + int(0.08 * sr)]
    audio = audio / max(1e-6, np.abs(audio).max()) * 0.89            # the same loudness for every clip
    fade = min(len(audio) // 4, int(0.01 * sr))
    if fade:
        audio[:fade] *= np.linspace(0, 1, fade); audio[-fade:] *= np.linspace(1, 0, fade)
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
        sf.write(tmp.name, audio, sr)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp.name, '-ac', '1', '-ar', '24000', '-b:a', '32k',
                    os.path.join(VOICE_DIR, key + '.mp3')], check=True)
    os.unlink(tmp.name)
    return key


def write_index(lines):
    have = sorted(k for k in lines if os.path.exists(os.path.join(VOICE_DIR, k + '.mp3')))
    json.dump({'voice': 'Kokoro-82M af_heart', 'clips': have}, open(os.path.join(VOICE_DIR, 'index.json'), 'w'), separators=(',', ':'))
    print(f'voice/index.json: {len(have)} clips')


def main():
    lines = json.load(open(os.path.join(VOICE_DIR, 'lines.json')))
    if '--index-only' in sys.argv:   # just list the clips made so far (e.g. while a long run is still going)
        return write_index(lines)
    todo = sorted(((k, t) for k, t in lines.items() if not os.path.exists(os.path.join(VOICE_DIR, k + '.mp3'))), key=lambda kt: len(kt[1]))   # short ones first
    if os.environ.get('FIRST'):   # a JSON list of keys to read before the rest
        first = set(json.load(open(os.environ['FIRST'])))
        todo.sort(key=lambda kt: kt[0] not in first)
    print(f'{len(lines)} sentences, {len(todo)} to read')
    fetch_model()
    workers = int(os.environ.get('WORKERS', max(1, (os.cpu_count() or 2) // 2)))
    done = 0
    with ProcessPoolExecutor(workers) as pool:
        for _ in pool.map(make, todo, chunksize=4):
            done += 1
            if done % 25 == 0 or done == len(todo):
                print(f'  {done}/{len(todo)}', flush=True)
    for f in os.listdir(VOICE_DIR):                                     # clips nobody reads any more
        if f.endswith('.mp3') and f[:-4] not in lines:
            os.unlink(os.path.join(VOICE_DIR, f))
    write_index(lines)


if __name__ == '__main__':
    sys.exit(main())
