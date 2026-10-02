# AUZAIE — Egg Drop Reel

`AUZAIE_egg_drop_reel.mp4` is the finished reel: 1080×1920, 30 fps, 7.5 s, H.264 + AAC, about −14 LUFS.

The story: an egg rolls slowly to the edge of a counter and drops. The cut lands just before it hits the floor, on the crack: **dropping leads?** → **custom.** → **AI-powered.** → **automated.** → **DM us to start.** → *@auzaie*.

The cuts land on the same frames as the reference trend reel (64, 86, 112, 137, 163), so that reel's trending sound lines up if it is used in Instagram instead of the built-in sound.

Source files:

- `story.json` holds the words, colours (cream or dark) and the frame each card starts on. Edit it and rebuild to change the copy.
- `build/egg_veo.mp4` is the original egg footage, generated for this reel (Veo 3.1 Fast, 9:16, 1080p).
- `timeline.py` is the speed ramp shared by picture and sound: a slow roll, then a real-speed fall.
- `cards.mjs` typesets the cards in DM Sans Bold (`fonts/`, SIL Open Font License) on a paper grain from `paper.py`.
- `retime.py` puts the egg shot on the 30 fps timeline.
- `sound.py` synthesises the sound design: roll, tip, silence, crack and boom on each cut, sign-off pop.
- `compose.py` cuts everything together and encodes the MP4.

Rebuild:

```sh
python3 paper.py && node cards.mjs   # text cards
python3 retime.py                    # egg shot
python3 sound.py                     # soundtrack
python3 compose.py                   # AUZAIE_egg_drop_reel.mp4
```

Needs ffmpeg, Node with Playwright, and Python with numpy, scipy and Pillow.
