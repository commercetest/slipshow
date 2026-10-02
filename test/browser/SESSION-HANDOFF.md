# Session handoff: Playwright visual-testing spike for Slipshow

Date: 2026-10-02

## Goal and outcome

This work assessed where screenshots are useful in Slipshow's automated tests
and implemented a working Playwright spike with an initial visual-regression
portfolio.

The conclusion is that Playwright is a good fit for a deliberately small visual
layer covering rendered layout and browser UI. Screenshots should complement
semantic, DOM, protocol, and geometric assertions rather than replace them.

## Repository and branch

An isolated Slipshow clone was used to avoid disturbing another dirty working
copy:

```text
/Users/julianharty/NLnet-projects/testing-slipshow-analysis/clones/slipshow-playwright-spike
```

Git state at the end of the implementation:

```text
Branch: playwright-screenshot-spike
Implementation commit: 383a082b Add Playwright visual testing spike
Base: origin/main at b7036c0
Origin: /Users/julianharty/NLnet-projects/slipshow
```

The branch is committed locally but has not been pushed. The parent research
repository remains on `main`. Its existing untracked `clones/` and `repros/`
directories were left untouched.

## Main analysis

The complete analysis, recommendations, operating instructions, limitations,
environment details, and suggested follow-up work are in `README.md` in this
directory.

Important conclusions recorded there include:

- Productive screenshot targets include layout, rescaling, drawing alignment,
  selected action states, themes, renderer output, TOC/toolbars, and presenter
  view.
- Screenshots are weak primary oracles for step counts, URL state, protocols,
  undo semantics, hot reload, console errors, and animation timing.
- Chromium and Firefox have independent baselines. Separate baselines detect
  regressions within each engine; they do not prove current cross-engine
  equivalence.
- Cross-engine agreement should also be checked through geometric and semantic
  assertions.
- No broad pixel-difference tolerance is configured because it could conceal
  meaningful rescaling or drawing defects.
- Required CI comparisons should eventually run in a pinned Linux container
  with separately reviewed Linux baselines.

The analysis follows Playwright's visual-comparison guidance:
<https://playwright.dev/docs/test-snapshots>.

## Implementation structure

Everything added by the spike is under `test/browser/`:

```text
test/browser/
├── config/
│   ├── browsers.mjs
│   ├── global-setup.mjs
│   ├── runtime.mjs
│   ├── snapshots.mjs
│   └── viewports.mjs
├── fixtures/
│   ├── portfolio.md
│   ├── portfolio-vanier.md
│   ├── renderers.md
│   └── speaker.md
├── support/
│   ├── screenshot.css
│   └── slipshow.mjs
├── tests/
│   ├── drawing.visual.spec.mjs
│   ├── layout.visual.spec.mjs
│   ├── renderers.visual.spec.mjs
│   ├── speaker.visual.spec.mjs
│   ├── states.visual.spec.mjs
│   ├── ui.visual.spec.mjs
│   └── snapshots/
├── package.json
├── package-lock.json
├── playwright.config.mjs
├── README.md
└── SESSION-HANDOFF.md
```

Configuration is separated by reason for change:

- `browsers.mjs` defines the Chromium and Firefox projects.
- `viewports.mjs` defines the 1440x1080, 1600x900, and 900x1200 viewports.
- `snapshots.mjs` defines browser/platform-specific baseline paths and the
  strict comparison policy.
- `runtime.mjs` defines one worker, timeouts, retries, traces, and reports.
- `global-setup.mjs` compiles the Markdown fixtures before testing.
- `playwright.config.mjs` only composes those settings.

## Initial portfolio

There are 11 tests per browser and 15 screenshots per browser, giving 22 test
executions and 30 committed macOS baselines.

Coverage includes:

- 4:3, widescreen, and portrait layout;
- viewport containment, centring, and aspect-ratio assertions;
- projected-content element capture;
- initial, revealed, and focused presentation states;
- default and Vanier themes;
- a pointer-created SVG drawing before and after viewport resize;
- the table of contents;
- the expanded drawing toolbar;
- MathJax, Mermaid, and highlighted OCaml; and
- the presenter popup, cloned presentation, and speaker notes.

Baselines are organized as:

```text
test/browser/tests/snapshots/{chromium|firefox}/darwin/{test-file}/{image}.png
```

## Slipshow-specific harness details

Compiled Slipshow documents contain an outer wrapper and an internal
presentation iframe named `#slipshow__internal_iframe`.

The harness therefore:

- uses the outer page for full-window screenshots and popup handling;
- explicitly targets the iframe for presentation DOM assertions and keyboard
  input;
- waits for Slipshow's `Ready` message;
- waits for outer and inner fonts;
- advances presentation states using real `ArrowRight` input;
- verifies `#slipshow-counter` after each step;
- waits for successive `.slipshow-rescaler` animation frames to stabilize; and
- records browser console and page errors where relevant.

The rescaler stability wait prevents a one-pixel drawing shift caused by taking
pointer coordinates while an unfocus animation is still settling.

The drawing target was moved to the revealed yellow panel. A separate target
near the bottom of the slide was inside Chromium's viewport but just outside
Firefox's because of font-metric differences.

## Dependencies and validated environment

Pinned dependency:

```text
@playwright/test 1.59.1
```

Validated browsers:

```text
Chromium revision 1217 / Chromium 147.0.7727.15
Firefox revision 1511 / Firefox 148.0.2
```

Local platform:

```text
macOS darwin, Apple silicon
```

Node 26.9.0 ran the tests successfully. Its Playwright Firefox downloader,
however, repeatedly hung after reaching 100%. Installing Firefox with the
locally available Node 22.23.2 completed successfully:

```sh
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin \
  /opt/homebrew/opt/node@22/bin/npx playwright install firefox
```

Node 22 LTS is therefore recommended for browser installation and routine use
of this pinned spike.

## Validation result

The final strict comparison run passed without updating images:

```text
22 passed
11 Chromium
11 Firefox
```

The command used was:

```sh
cd /Users/julianharty/NLnet-projects/testing-slipshow-analysis/clones/slipshow-playwright-spike/test/browser

LIBRARY_PATH=/opt/homebrew/opt/openssl@3/lib:/opt/homebrew/opt/libffi/lib \
  opam exec --switch=/Users/julianharty/NLnet-projects/slipshow -- \
  npm test
```

The `LIBRARY_PATH` override is needed because the available opam switch
contains stale Homebrew library paths. Dune emits stale-path warnings but
successfully compiles and links with this override.

Representative Chromium and Firefox images were visually inspected, including
layout, drawing after resize, rich renderers, presenter view, focused state, and
the table of contents.

`git diff --cached --check` passed before the implementation commit, and the
spike working tree was clean afterward.

## Useful commands

Run these from `test/browser/`:

```sh
npm test
npm run test:chromium
npm run test:firefox
npm run test:ui
npm run test:update
```

`npm run test:update` is an explicit review operation, not routine failure
recovery.

To bypass `dune exec`, fixture compilation can use an existing binary:

```sh
SLIPSHOW_BIN=/absolute/path/to/slipshow npm test
```

## Recommended next steps

1. Decide whether Slipshow should accept the Node dependency and browser
   download cost.
2. Push or transplant commit `383a082b` and this handoff commit into the
   intended Slipshow remote.
3. Add a dedicated CI job using a pinned Linux image.
4. Generate and review Linux baselines rather than reusing the committed macOS
   images.
5. Upload Playwright HTML reports, failure screenshots, and retained traces as
   CI artifacts.
6. Add non-visual tests for hot reload, step/undo behavior, and the
   communication protocol.
7. Strengthen drawing coverage with a numerical coordinate round-trip
   assertion.
8. Consider a small WebKit canary only after Chromium and Firefox remain
   stable.
