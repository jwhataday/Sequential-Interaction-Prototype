# Camera Push Forward

Artifact (1) from the Sequential Interaction prototype, exported unchanged from https://claude.ai/artifact/DV3WhMejj4ZjQegNZZsBxS.

An outdoor festival seen from far away. Two clicks push the camera forward in true perspective, down a path to the back of the crowd, and the music gets closer.

## Interaction

- Click or tap anywhere in the scene twice. The two dots in the hint fill in, then the camera pushes forward.
- The reset button (top right) brings the camera back to the start.

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

Then visit `http://localhost:8000/01-camera-push-forward/`. On GitHub Pages it is served at `https://jwhataday.github.io/Sequential-Interaction-Prototype/01-camera-push-forward/`.
