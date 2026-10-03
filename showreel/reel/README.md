# Malus Lens — motion-graphics reel (9:16)

A 41-second vertical brand reel for Malus Lens, the AI apple-grading app.
It is animated in HTML with GSAP, rendered frame by frame, and cut to a voiceover, score and sound effects.

| Time | Voiceover | Visuals |
|---|---|---|
| 0–3s | "Every apple tells a story." | A red dot draws an apple outline, then the camera zooms through it |
| 3–9s | "…tired eyes… and guesswork." | Dark orchard, slamming type, warning chips, glitchy "GUESSWORK" |
| 9–12s | "What if every tray could be judged in seconds?" | Tray card and stopwatch while the music falls silent |
| 12s | "Meet Malus Lens." | On the music drop: flash and shockwave as the logo assembles |
| 13–17s | "Enter your lot. Snap one photo per crate." | 3D phone with the real app screens, callouts, shutter, photos fly in |
| 17–23s | "The AI gets to work… A or B." | Laser scan, detection boxes, A/B labels, giant A and B |
| 23–29s | "Clear counts. Estimated weights. A branded report." | Donut chart, counters, weight bars, PDF report |
| 29–33s | "Nothing lingers on a server…" | Server dissolves into particles, then shield and privacy chips |
| 33–41s | "Malus Lens. Apple quality, assessed in seconds." | Red wipe to the orchard, logo, tagline, "Book a demo" |

## Rebuild

```bash
cd showreel && npm install
cd reel
FPS=60 node render.mjs            # frames -> out/reel-silent.mp4
python3 mix.py                    # + voiceover, score, SFX -> out/MalusLens_Reel.mp4
node render.mjs stills 6.4 12.3   # quick PNG checks of single moments
```

- `reel.html` holds the whole animation. Open it in a browser to preview in real time.
- Timings follow the voiceover: each line's start is (word time in `audio/vo.mp3`) + 1.0s.
- Audio comes from ElevenLabs: the voice "David – Rich, Authoritative, Calm", the score (eleven_music) and the SFX.
- The results numbers (128 apples, 86.7% A) are **sample data**. When this was made, the live
  analysis returned no detections, and the reel labels the scene "Sample results shown".
- The app screens in `img/` were captured from the live app at phone size.
