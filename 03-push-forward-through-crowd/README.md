# Push Forward

Artifact (3) from the Sequential Interaction prototype, exported unchanged from https://claude.ai/artifact/WGKY13d7Qo9McXdDgX1Gs4.

Inside the crowd at an outdoor concert, with a gap ahead toward the stage. You push through it against the crowd shoving back. At the barrier, the performer gives you a thumbs up.

## Interaction

- Press and drag upward (forward) in the scene, stroke after stroke. The crowd pushes you back, so keep going.
- The reset button (top right) starts over.

## Setup and dependencies

- **No build step and no install.** `index.html` is self-contained: all HTML, CSS, inline SVG artwork and JavaScript are in this one file.
- **Font:** uses the system monospace font. No web fonts are loaded.
- **Sound:** music is synthesized live with the Web Audio API (no audio files). Browsers only allow audio after a user gesture, so it starts on your first click or tap.
- **Assets:** none beyond `index.html`. All visuals are inline SVG; there are no image, font or audio files.

## Run it

Open `index.html` in a modern browser (Chrome, Edge, Safari or Firefox). To serve it locally instead, run this from the repository root:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000/03-push-forward-through-crowd/`. On GitHub Pages it is served at `https://jwhataday.github.io/Sequential-Interaction-Prototype/03-push-forward-through-crowd/`.
