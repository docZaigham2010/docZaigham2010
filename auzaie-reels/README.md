# AUZAIE — three reels (hook + CTA)

| Reel | Hook | Story | CTA |
| --- | --- | --- | --- |
| `reel1-missed-shot` | Player whiffs a shot and hits the turf | missing follow-ups? → custom. → automated. → converting. | DM or comment "CRM" for a free demo |
| `reel2-giant-axe` | Giant axe splits a boulder | We're not just a software company → your CRM, automations, AI assistant, Business OS | DM "GROW" |
| `reel3-excel-vs-auzaie` | "me running my business on Excel + WhatsApp:" chaos collapses | "us with a custom AI CRM:" — every lead followed up, 0 missed | DM "AUZAIE" for a free demo |

All are 1080×1920, 30 fps, H.264/AAC, about −13 LUFS. Hook footage for reels 1 and 2 was generated for AUZAIE (Veo 3.1 Lite, `build/hook_veo.mp4`); reel 3 is drawn frame by frame in `render.mjs`. Sound is synthesised in `lib/sfx.py`.

Rebuild a reel: `python3 <reel>/build.py` (reel 2 first needs `python3 lib/paper.py reel2-giant-axe/build/paper.png`). Copy lives at the top of each `build.py` / `render.mjs`.

Needs ffmpeg, Node with Playwright, and Python with numpy, scipy and Pillow.
