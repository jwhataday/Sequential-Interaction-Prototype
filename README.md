# Sequential-Interaction-Prototype
Codebase for my sequential interaction [Form &amp; Code] ; working with Claude code

**Live site:** https://jwhataday.github.io/Sequential-Interaction-Prototype/

## Getting to the Front (the sequence prototype)

A festival-goer starts far from the stage and works their way to the barrier. The music gets closer with every step, and at the end the performer notices you. It is one linear sequence: each action becomes available only after the one before it succeeds.

| Step | Gesture | From study |
|------|---------|------------|
| Start | The festival seen from far away, silent. | — |
| 1 | Tap twice anywhere. The camera crouches back, then pushes forward down the path to the back of the crowd. | `01-camera-push-forward` |
| 2 | Hold and swipe sideways to fill one side's meter, then the other side before the first side's timer runs out. The crowd parts. | `02-push-to-the-side` |
| 3 | Drag upward, stroke after stroke, through the gap while the crowd shoves back. | `03-push-forward-through-crowd` |
| End | At the barrier, the performer smiles and gives a thumbs up. The music plays loud and clear. | — |

- **Handoffs:** each success ends with a short camera move that crossfades into the next step's opening view. The music never stops and only gets closer.
- **Reset:** the round button (top right) returns to the silent far view from any step.

### Appearance panel

A floating, collapsible panel on the left restyles the whole experience, with every change previewed live.

- **Overall tab**
  - **Palette:** 11 colors (sky, hills, ground, stage, performer, crowd, fairground, lights, viewer's arms, signifier pills, signifier accent). Each one recolors a family of elements in all three steps, keeping their shades apart.
  - **Lighting and atmosphere:** brightness, contrast and saturation (%), warmth (−100 cool to +100 warm), horizon haze (%) and haze color, light-beam strength (%) and vignette (%).
  - **Page and frame:** page background, scene frame and reset button.
- **Step 1–3 tabs:** every element of that step, with fill color, texture, opacity (%), stroke width (px), corner radius (px) and shadow (px), plus an SVG asset for the hint hand icons (built-in icons or your own uploaded `.svg`). **Show this step** jumps the prototype to that step so you can see what you are changing.
- Type exact values in the number and hex boxes, or drag the sliders. Use **Find a component** to filter the open tab, and **Reset** to return one component or group to its default. Yellow dots mark what differs from the saved defaults.
- **Restore defaults** returns everything to the saved values in `js/appearance-defaults.js`.
- **Copy settings** copies every component's name and current values, with an instruction to save them as the new defaults.
- Your current tweaks are remembered in this browser until you restore the defaults.

### Run it

It is a static site with no build step. Open `index.html` in a browser, or serve the repository root:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000/`. To publish, set GitHub Pages to deploy from the repository root of `main`. All paths are relative, and `.nojekyll` is included.

Dependencies: the *Space Mono* font from Google Fonts (falls back to the system monospace font offline). Sound is synthesized with the Web Audio API and starts on your first tap.

### Files

```
index.html              the prototype: page layout and the three scenes (inline SVG)
css/style.css           page, frame and per-stage styles
js/audio.js             the shared synthesized music engine
js/stage1-camera.js     step 1, from 01-camera-push-forward
js/stage2-sides.js      step 2, from 02-push-to-the-side
js/stage3-forward.js    step 3, from 03-push-forward-through-crowd
js/main.js              sequence controller: gating, handoffs, reset
js/panel.js             the appearance control panel
js/appearance-defaults.js  saved defaults for the panel
css/panel.css           panel styles
.nojekyll               tells GitHub Pages to serve the files as is
```

## Interaction studies

The original studies are kept unchanged, each in its own folder with its source and a README:

| # | Folder | Artifact |
|---|--------|----------|
| 1 | [`01-camera-push-forward/`](01-camera-push-forward/) | Camera Push Forward: two clicks push the camera toward the crowd |
| 2 | [`02-push-to-the-side/`](02-push-to-the-side/) | Push to the Side: hold and swipe left and right to push people aside |
| 3 | [`03-push-forward-through-crowd/`](03-push-forward-through-crowd/) | Push Forward: drag upward to push through the gap to the barrier |

## Earlier page

The original "Hello class!" page is preserved unchanged as [`hello-class.html`](hello-class.html), next to its background images `Note_example.jpg` and `Note_example.webp`.
