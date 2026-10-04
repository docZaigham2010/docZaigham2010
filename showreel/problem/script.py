# The narration, split into the lines the picture is cut to. 'key' words are cue points.
# Brand name is written "Malice" for the voice (pronounced MAL-us, like "palace").
LINES = [
    ('scale',    "Jammu and Kashmir grows over twenty lakh tonnes of apples a year.", ['twenty']),
    ('half',     "Nearly half the valley lives on them.", []),
    ('gate',     "Almost every apple passes through a cold storage gate.", ['gate']),
    ('decision', "And there, one decision is made... is this batch good enough to store?", ['is this']),
    ('handful',  "Today, that call rests on a handful.", []),
    ('crates',   "Five crates, out of a hundred and fifty.", ['hundred']),
    ('apples',   "Four hundred apples, checked by hand, to judge thousands.", ['thousands']),
    ('rush',     "And in the peak-season rush... often, not even that.", ['not even']),
    ('rain',     "In 2024, rain shut the highway.", []),
    ('rushed',   "Growers rushed fruit into storage.", []),
    ('checks',   "The checks couldn't catch it.", []),
    ('months',   "Months later, the chambers opened to shrivelled, scalded apples.", ['shrivelled']),
    ('loss',     "An estimated two thousand crore rupees... lost.", ['lost']),
    ('drop',     "Malice Lens changes that.", ['changes']),
    ('photo',    "One photo per crate.", []),
    ('detect',   "Every apple, detected.", []),
    ('grade',    "Grade A or Grade B, in seconds...", ['B', 'seconds']),
    ('phone',    "on the phone the storage already owns.", []),
    ('acc1',     "Ninety-nine percent detection.", []),
    ('acc2',     "Ninety-five percent grading accuracy.", []),
    ('tested',   "Tested on real intake batches.", []),
    ('clear',    "A clear number, at the gate, before the doors close.", ['before']),
    ('end',      "Malice Lens. Apple quality, assessed in seconds.", ['Apple', 'assessed']),
]
PARAGRAPH_AFTER = {'half', 'decision', 'apples', 'rush', 'months', 'loss', 'drop', 'phone', 'tested', 'clear'}
def voice_text():
    out = []
    for name, text, _ in LINES:
        out.append(text + ('\n\n' if name in PARAGRAPH_AFTER else ' '))
    return ''.join(out).strip()
if __name__ == '__main__':
    print(voice_text()); print(len(voice_text()), 'chars')
