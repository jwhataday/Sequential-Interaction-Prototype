# Push to the Side

Artifact (2) from the Sequential Interaction prototype, exported unchanged from https://claude.ai/artifact/N4Phk3H26kFsZUSMGe9RjT.

The view from the back of a festival crowd. You push the people blocking the stage aside, one side at a time.

## Interaction

- Press and hold in the scene, then swipe sideways to fill one side's meter. When it is full, swipe the other way before the first side's timer runs out.
- Once both sides are clear, the crowd parts and the camera moves forward.
- The reset button (top right) starts over.

## Setup and dependencies

- **No build step and no install.** `index.html` is self-contained: all HTML, CSS, inline SVG artwork and JavaScript are in this one file.
- **Font:** loads *Space Mono* from Google Fonts (`fonts.googleapis.com`). If you are offline it falls back to the system monospace font.
- **Sound:** music is synthesized live with the Web Audio API (no audio files). Browsers only allow audio after a user gesture, so it starts on your first click or tap.
- **Assets:** none beyond `index.html`. All visuals are inline SVG; there are no image, font or audio files.

## Run it

Open `index.html` in a modern browser (Chrome, Edge, Safari or Firefox). To serve it locally instead, run this from the repository root:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000/02-push-to-the-side/`. On GitHub Pages it is served at `https://jwhataday.github.io/Sequential-Interaction-Prototype/02-push-to-the-side/`.
