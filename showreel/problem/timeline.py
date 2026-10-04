# Builds timeline.json: start/end of every script line (film time) and its cue words.
#   python3 timeline.py            -> estimate from the text (scratch timing)
#   python3 timeline.py vo.wav     -> exact timing from the recorded narration (Whisper word stamps)
import json, re, sys, difflib
from script import LINES

VO_AT = 1.2            # narration starts this far into the film
TAIL = 6.0             # end card holds after the last word
norm = lambda w: re.sub(r'[^a-z0-9]', '', w.lower().replace('malice', 'malus'))

def script_words():
    out = []
    for li, (name, text, _) in enumerate(LINES):
        for w in text.split():
            out.append((li, w))
    return out

def estimate():
    t, words = 0.0, []
    for li, w in script_words():
        n = 0.40 + 0.03 * max(0, len(norm(w)) - 5)
        words.append((li, w, t, t + n)); t += n
        if w.endswith('...'): t += .7
        elif w.endswith(('.', '?')): t += .45
        elif w.endswith(','): t += .22
        if w is LINES[li][1].split()[-1] and LINES[li][0] in ('half', 'decision', 'apples', 'rush', 'months', 'loss', 'drop', 'phone', 'tested', 'clear'):
            t += .5
    return words

def from_vo(path):
    from faster_whisper import WhisperModel
    m = WhisperModel('base.en', device='cpu', compute_type='int8')
    segs, _ = m.transcribe(path, word_timestamps=True)
    heard = [(w.word.strip(), w.start, w.end) for s in segs for w in s.words]
    sw = script_words()
    a = [norm(w) for _, w in sw]; b = [norm(w) for w, _, _ in heard]
    sm = difflib.SequenceMatcher(a=a, b=b, autojunk=False)
    times = [None] * len(sw)
    for blk in sm.get_matching_blocks():
        for k in range(blk.size): times[blk.a + k] = heard[blk.b + k][1:]
    # fill unmatched script words by interpolating between neighbours
    for i in range(len(times)):
        if times[i] is None:
            prev = next((times[j] for j in range(i - 1, -1, -1) if times[j]), (0, 0))
            nxt = next((times[j] for j in range(i + 1, len(times)) if times[j]), (prev[1] + .4, prev[1] + .8))
            times[i] = (prev[1], max(prev[1] + .05, nxt[0]))
    return [(li, w, s, e) for (li, w), (s, e) in zip(sw, times)]

words = from_vo(sys.argv[1]) if len(sys.argv) > 1 else estimate()
lines = {}
for li, (name, text, keys) in enumerate(LINES):
    ws = [x for x in words if x[0] == li]
    cue = {}
    for k in keys:
        kw = k.split()[0]
        hit = next((x for x in ws if norm(x[1]) == norm(kw)), None)
        if hit: cue[k] = round(hit[2] + VO_AT, 3)
    lines[name] = {'s': round(ws[0][2] + VO_AT, 3), 'e': round(ws[-1][3] + VO_AT, 3), 'cue': cue,
                   'words': [[w, round(s + VO_AT, 3)] for _, w, s, e in ws]}
dur = round(words[-1][3] + VO_AT + TAIL, 2)
json.dump({'vo_at': VO_AT, 'dur': dur, 'source': sys.argv[1] if len(sys.argv) > 1 else 'estimate', 'lines': lines}, open('timeline.json', 'w'), indent=1)
for n, v in lines.items(): print(f"{n:9s} {v['s']:6.2f} - {v['e']:6.2f}  {v['cue']}")
print('duration', dur)
