# App showreel

Films a web app as a short story and cuts it into an MP4:
**Prologue → the sign-in → one chapter per screen in the app's navigation → Epilogue**,
with dissolves between scenes, a visible cursor, and a soft score underneath.

```bash
APP_URL='https://ahmad.readyforyourreview.com/#/authentication/sign-in' \
APP_EMAIL='…' APP_PASSWORD='…' node record.mjs   # films the clips into out/clips
node build.mjs                                    # cuts out/showreel.mp4
```

## Run it on your own computer

You need Node 18+ and ffmpeg (`brew install ffmpeg` on a Mac, `winget install ffmpeg` on Windows).

```bash
cd showreel
npm install
npm run setup                     # downloads the browser it films with
APP_URL='https://ahmad.readyforyourreview.com/#/authentication/sign-in' \
APP_EMAIL='…' APP_PASSWORD='…' npm run reel
```

The finished video lands in `showreel/out/showreel.mp4`. Add `HEADED=1` to watch the browser while it films.

Options:
- `MAX_SCENES` sets how many screens to film (default 7).
- `ROUTES='[{"route":"#/dashboard","label":"Dashboard"}]'` picks the chapters yourself.
- `APP_NAME` sets the title on the cards.
- `MUSIC=track.mp3` uses your own soundtrack. `MUSIC=none` leaves it silent.

Edit the chapter lines in `record.mjs` (`lines`) to change the narration.
`mock/` holds a small stand-in app for testing the pipeline offline:
`python3 -m http.server 8765 -d mock`, then use `APP_URL=http://localhost:8765/#/authentication/sign-in`.
Credentials are only read from the environment and are never written to disk.
