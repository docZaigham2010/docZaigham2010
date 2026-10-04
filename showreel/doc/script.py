# The documentary reel: hook -> how CA storage works -> the gate guess -> 2024 -> the fix (short) -> CTA.
# "Malice Lens" is the spelling that makes the voice say MAL-us (like "palace").
# (name, text, cue words)
LINES = [
    ('hook',     "Last year, Kashmir lost two thousand crore rupees in apples.", ['two']),
    ('nobody',   "And nobody saw it coming.", []),
    ('why',      "Here's why.", []),
    ('sealed',   "After harvest, apples are sealed inside cold storage... for months.", ['months']),
    ('shut',     "Once the door shuts, nobody can check them again.", ['nobody']),
    ('moment',   "So everything depends on one moment. At the gate.", ['At']),
    ('question', "Is this fruit good enough to store?", []),
    ('guess',    "Today, that's mostly a guess.", ['guess']),
    ('truck',    "A truck brings a hundred and fifty crates. Only five get checked.", ['Only']),
    ('rush',     "In the rush... often, none.", ['none']),
    ('rain',     "In 2024, rain shut the highway.", ['rain']),
    ('rushed',   "Growers rushed their apples in. Unripe fruit went in with the good.", ['Unripe']),
    ('opened',   "Months later, the doors opened... to shrivelled, spoiled apples.", ['shrivelled']),
    ('fix',      "Malice Lens fixes that moment.", []),
    ('photo',    "One photo of a crate. Every apple, graded in seconds.", ['Every', 'seconds']),
    ('know',     "Know what goes in... before the door shuts.", ['before']),
    ('cta',      "Malice Lens. Book a demo.", ['Book']),
]
def voice_text():
    return ' '.join(t for _, t, _ in LINES)
if __name__ == '__main__':
    print(voice_text()); print(len(voice_text()), 'chars', len(voice_text().split()), 'words')
