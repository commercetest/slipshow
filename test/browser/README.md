# Playwright screenshot-testing spike

Date: 2026-10-02

Branch: `playwright-screenshot-spike`

This spike tests whether Playwright can provide a small, maintainable visual
regression layer for Slipshow. It deliberately does not propose screenshots as
the primary oracle for engine correctness.

## Recommendation

Playwright is a good fit as Slipshow's browser driver and as the owner of a
small portfolio of approved screenshots. The most productive screenshot targets
are the visual results of browser layout:

- viewport fitting, letterboxing, and nested rescaling;
- the drawing overlay before and after a viewport resize;
- selected pause, reveal, and focus states;
- built-in themes and embedded fonts;
- the table of contents and drawing toolbar;
- the speaker-view layout, with its timer and clock masked;
- embedded MathJax, Mermaid, and syntax-highlighted content.

Screenshots are weak oracles for step counts, URL fragments, the communication
protocol, undo behavior, console errors, hot-reload state preservation, and
animation timing. Those should use semantic, protocol, DOM, geometric, or
timing assertions. A failure screenshot and retained Playwright trace are still
valuable diagnostic evidence for those tests.

Each significant visual test in this spike therefore has at least one semantic
or geometric assertion before its screenshot assertion. The screenshot answers
"does the rendered result look wrong?"; the other assertion helps explain why.

## Important interpretation of cross-browser snapshots

Chromium and Firefox have separate approved images. A Firefox run compares with
Firefox's history, while Chromium compares with Chromium's history. This finds
regressions over time but does **not** prove that the two engines render
identically today.

Cross-engine agreement should also be tested through engine-independent
relationships such as:

- the presentation is contained by the viewport;
- horizontal and vertical centring are within a small geometric tolerance;
- the projected area retains the configured aspect ratio;
- a drawn point maps back to its intended client coordinate;
- a drawing remains aligned to its anchor after resize;
- the number and identity of reachable states are invariant across browsers.

Initial baseline approval should include human side-by-side review. Otherwise,
separate browser baselines can merely bless two different bugs.

## Portfolio implemented by the spike

| Test area | Screenshots | Additional oracle |
| --- | --- | --- |
| Layout | exact 4:3, wide, and portrait viewports | containment, aspect ratio, and centring |
| Projected content | `#slipshow-open-window` | element is ready and visible |
| Runtime states | initial, revealed, and focused | reveal opacity |
| Themes | default and Vanier specimens | stable, scoped element targets |
| Drawing | before and after wide resize | SVG path created from real pointer input |
| UI | table of contents and expanded drawing toolbar | expected mode/class |
| Renderers | math, Mermaid, and highlighted OCaml | renderer-specific elements visible; no browser errors |
| Speaker view | cloned deck and notes | popup opens and expected note is received |

The matrix is intentionally pairwise rather than exhaustive. Every core visual
canary runs in Chromium and Firefox, but only the layout fixture is multiplied
across all three viewports. This keeps the initial baseline set reviewable.

## Configuration layout

Configuration is split by reason for change:

```text
test/browser/
├── config/
│   ├── browsers.mjs       # engine projects and browser-specific settings
│   ├── viewports.mjs      # named dimensions used by layout tests
│   ├── snapshots.mjs      # baseline paths and image-comparison policy
│   ├── runtime.mjs        # timeouts, retries, workers, reports, and traces
│   └── global-setup.mjs   # compilation of Markdown fixtures
├── fixtures/              # purpose-built, small Slipshow inputs
├── support/
│   ├── screenshot.css     # screenshot-only stabilisation
│   └── slipshow.mjs       # wrapper/iframe readiness and error helpers
├── tests/                 # tests grouped by rendering surface
├── snapshots/             # committed browser/platform-specific baselines
├── package.json
└── playwright.config.mjs  # composition only
```

The snapshot path includes both `{projectName}` and `{platform}`. This prevents
a macOS image from silently becoming the expectation for a Linux CI runner, and
prevents Chromium from comparing with Firefox.

No broad `maxDiffPixelRatio` is configured. Such a tolerance could hide the
small rescaling and overlay-alignment regressions that matter here. A tolerance
should be local to a test and accompanied by an explanation of the observed
noise.

Playwright disables CSS animations and transitions while making asserted
screenshots. The helper reaches named portfolio states through the same keyboard
navigation as a presenter and checks the visible step counter after each move.
It also waits for successive rescaler frames to agree before taking pointer
coordinates or screenshots.
Animation sequencing itself should be tested separately: disabling or
fast-forwarding an animation can hide an animation defect and can fire a
`transitionend` handler.

The harness also treats the generated wrapper page and Slipshow's internal
presentation iframe as separate layers. Full-window screenshots target the
wrapper page; DOM assertions, keyboard input, and component screenshots target
the iframe explicitly. Visual tests use one worker so global keyboard and popup
behavior remains reproducible.

## Running the spike

The validated local configuration was:

| Setting | Value |
| --- | --- |
| Host/platform | macOS (`darwin`, Apple silicon) |
| Playwright Test | `1.59.1`, exactly pinned in `package-lock.json` |
| Chromium | Playwright revision 1217 / Chromium 147.0.7727.15 |
| Firefox | Playwright revision 1511 / Firefox 148.0.2 |
| Test runtime | Node 26.9.0 and npm 11.19.1 |
| Workers | one, for deterministic global-keyboard and popup behavior |

Node 26 ran the tests, but on this host its Playwright browser downloader hung
after reaching 100%. Re-running `playwright install firefox` with the installed
Node 22.23.2 LTS runtime completed normally. Node 22 LTS is therefore the safer
choice for installing and running this pinned spike.

Install the Node dependency and Playwright-managed browsers:

```sh
cd test/browser
npm install
npx playwright install chromium firefox
```

Run from an environment in which `dune exec slipshow` works:

```sh
opam exec -- npm test
```

Alternatively, point fixture compilation at an already-built binary:

```sh
SLIPSHOW_BIN=/absolute/path/to/slipshow npm test
```

Useful focused commands are:

```sh
npm run test:chromium
npm run test:firefox
npm run test:ui
npm run test:update
```

`npm run test:update` is a review operation, not routine failure recovery.
Before accepting a changed image, record why the new rendering is correct.

## Baseline and CI policy

Playwright documents that browser screenshots vary with operating system,
browser version, settings, hardware, and headless mode. Baselines should be
created and compared in the same pinned environment. See Playwright's
[visual comparison documentation](https://playwright.dev/docs/test-snapshots).
That documentation also explains that Playwright waits until two consecutive
captures match, supports screenshot-only stabilisation through `stylePath`,
and expects committed reference images to be reviewed when they change. This
spike uses all three ideas, while retaining semantic assertions alongside the
images.

For a production version of this spike:

1. Pin `@playwright/test` with the committed lockfile.
2. Use one pinned Linux container for required visual comparisons.
3. Generate and review the Linux baselines in that environment.
4. Set CI to refuse snapshot creation or updates; this spike sets
   `updateSnapshots: "none"` when `CI` is present.
5. Upload the HTML report, failure screenshots, and retained traces.
6. Update the Playwright version and baselines in an explicit maintenance PR.

The committed macOS images produced during this spike demonstrate the
portfolio locally. They should not be treated as Linux CI baselines.

## Costs and limitations

- Screenshot assertions require the Playwright Test runner, so this adds a
  small Node toolchain to an OCaml/dune project.
- Playwright downloads sizeable browser builds.
- Playwright's Firefox is a patched automation build corresponding to recent
  Firefox, not the branded Firefox executable. Its WebKit build is not Safari.
- Pixel baselines describe approved output; they do not establish that the
  approved output was correct.
- Full example decks and every presentation step would create too many images
  to review responsibly. Purpose-built fixtures make ownership clearer.
- Dynamic canvas, video, timers, clocks, hover state, pointer cursors, and
  requestAnimationFrame-driven drawing playback need explicit stabilisation or
  a non-screenshot oracle.

## Suggested progression after the spike

1. Review whether the maintainer accepts the Node and browser-download cost.
2. Keep the portfolio small and run it behind a separate browser-test command;
   do not make ordinary `dune test` download browsers.
3. Add geometry assertions for the rescaler and drawing coordinate round trip.
4. Add hot-reload and step/undo behavioral tests, retaining screenshots only as
   diagnostics.
5. Consider a small WebKit canary after Chromium and Firefox are stable. For
   Safari-like media behavior, run Playwright WebKit on macOS rather than
   treating Linux WebKit as identical to Safari.
6. Periodically remove snapshots that no longer protect a clearly described
   risk. Baseline count is a maintenance budget, not a coverage target.
