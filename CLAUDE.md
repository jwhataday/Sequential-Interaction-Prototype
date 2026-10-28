# Working on this repository

## Publishing every change
Every time a change is applied to the live site (the prototype at the repository root):
1. Commit it and push it to `main`, which GitHub Pages deploys.
2. Also publish the page as a Claude artifact, updating the existing one at
   https://claude.ai/artifact/L7AxCT6L4ijHX6ncN7cfGL (publish `index.html` with the `css/` and `js/`
   files as supporting files), so the change can be viewed right away while GitHub Pages builds.

## Structure
- `index.html`, `css/`, `js/`: the "Getting to the Front" sequence prototype (static, no build step).
- `01-…`, `02-…`, `03-…`: the original interaction studies. Keep them unchanged.
- `hello-class.html`: the earlier page, kept unchanged.

## Appearance panel
- `js/panel.js` is the floating control panel. Keep it for later adjustments.
- `js/appearance-defaults.js` holds the saved defaults. When given a "Copy settings" list, set each
  component's values there (by its `[name]`), commit, push to `main` and republish the artifact.
