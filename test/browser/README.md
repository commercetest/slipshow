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

### Watching and debugging the tests

The dependencies and Playwright-managed browsers were already installed in
the spike clone when these commands were checked. On the macOS development
host, use Node 22 and the library-path workaround recorded above:

```sh
cd /Users/julianharty/NLnet-projects/testing-slipshow-analysis/clones/slipshow-playwright-spike/test/browser

export PATH="/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
export LIBRARY_PATH="/opt/homebrew/opt/openssl@3/lib:/opt/homebrew/opt/libffi/lib"
```

Run the authoritative headless comparisons with:

```sh
opam exec --switch=/Users/julianharty/NLnet-projects/slipshow -- \
  npm test
```

Open Playwright's interactive test interface with:

```sh
opam exec --switch=/Users/julianharty/NLnet-projects/slipshow -- \
  npm run test:ui
```

UI mode is useful for selecting tests, rerunning them, and inspecting the
recorded action and page snapshots. To watch a real Chromium window run the
tests, use headed mode:

```sh
opam exec --switch=/Users/julianharty/NLnet-projects/slipshow -- \
  npm run test:chromium -- --headed --ignore-snapshots
```

The corresponding Firefox command is:

```sh
opam exec --switch=/Users/julianharty/NLnet-projects/slipshow -- \
  npm run test:firefox -- --headed --ignore-snapshots
```

`--ignore-snapshots` is intentional in these observation runs. It retains the
semantic, DOM, and geometric assertions but does not compare images made by a
headed browser with the existing headless baselines. See the investigation
below for why those images differ.

For a slower, step-by-step Chromium run in Playwright Inspector, focus on one
test and use `--debug`:

```sh
opam exec --switch=/Users/julianharty/NLnet-projects/slipshow -- \
  ./node_modules/.bin/playwright test tests/states.visual.spec.mjs:4 \
  --project=chromium --debug --ignore-snapshots
```

Do not combine `--headed` with `test:update` against the current projects.
That would replace headless reference images with images from a different
rendering mode and make the normal headless comparison fail. If headed image
comparison becomes a requirement, add a separately named headed project and
give it separately reviewed baselines; the existing snapshot path already
includes `{projectName}`.

### Headed-versus-headless pixel investigation

This investigation was performed on 2026-10-05 and 2026-10-06 using the
pinned Playwright 1.59.1 Chromium revision 1217 on macOS/Apple silicon.

The ordinary test run launches `chromium_headless_shell-1217`; `--headed`
launches the regular `chromium-1217` build. This is intentional Playwright
behaviour: it ships a separate Chromium headless shell for default headless
operation and regular Chromium for headed operation. Playwright also warns
that screenshots vary with the operating system, browser version, settings,
hardware, power source, and headless mode. Consequently, headed and headless
captures must not be assumed to share a pixel baseline. See Playwright's
[browser documentation](https://playwright.dev/docs/browsers#chromium-headless-shell)
and [visual-comparison documentation](https://playwright.dev/docs/test-snapshots).

#### The initial 39-pixel failure

The first observed failure was `state-00-initial.png`, a 1440x1080 image:

- Playwright/pixelmatch counted 39 different pixels.
- The generated diff also marked 91 pixels as antialiasing differences and
  excluded them from the failure count. In pixelmatch's diff image, red means
  counted difference and yellow means detected antialiasing.
- Of the 39 counted pixels, 37 are in the 32x32 circular pencil button at the
  upper-left. The other two are isolated glyph-edge pixels in the slide text.
- The differences change edge coverage rather than geometry. For example, one
  grey icon-edge pixel is `(217,217,217)` in the headless baseline and
  `(163,163,163)` in headed Chromium. The icon, boxes, text positions, and
  overall slide layout remain coincident.
- Three fresh headed runs produced byte-for-byte identical actual PNGs, all
  with the same SHA-256 and the same 39-pixel failure. This particular result
  is therefore deterministic on the pinned host, not timing noise.

The best explanation is the different Chromium executables' rasterisation of
antialiased SVG strokes and text at fractional coverage. There is no evidence
in this image of a Slipshow state, rescaling, alignment, or clipping defect.

#### Portfolio sample

A full headed Chromium run was also sampled. Each test stops at its first
failed screenshot, so this covers the first visual checkpoint of all 11 tests,
not every one of the 15 Chromium baselines:

| First checkpoint | Size | Counted pixels | Antialias-only pixels |
| --- | ---: | ---: | ---: |
| Drawing at 4:3 | 1440x1080 | 191 | 687 |
| Layout at 4:3 | 1440x1080 | 39 | 91 |
| Layout widescreen | 1600x900 | 60 | 69 |
| Layout portrait | 900x1200 | 25 | 111 |
| Projected content | 1440x1080 | 39 | 91 |
| Embedded renderers | 1440x1080 | 43 | 78 |
| Speaker view | 1440x1080 | 8,324 | 5,397 |
| Initial runtime state | 1440x1080 | 39 | 91 |
| Default theme element | 1218x914 | 2 | 27 |
| Table of contents | 1440x1080 | 24 | 143 |
| Expanded drawing toolbar | 390x595 | 2,356 | 1,449 |

Most differences are sparse edge-rasterisation changes. In the drawing image,
the long blue stroke remains aligned; differences concentrate in the dense
drawing controls, box corners, text edges, and the stroke endpoint. The toolbar
has a much larger count because nearly the whole small image consists of text,
circles, diagonal SVG strokes, and rounded outlines, but its geometry and
content remain visually coincident.

Speaker view is different in kind. The regular headed browser displays a
scrollbar for `#speaker-notes`, whose CSS is `overflow: scroll`; the headless
shell is launched with hidden scrollbars. The visible scrollbar consumes about
15 CSS pixels, changes the right column's content width, and changes text
wrapping/clipping. That mismatch is germane to the headed user experience and
should not be dismissed as mere antialiasing. It is also sensitive to the OS
scrollbar policy, so it is a poor candidate for sharing a baseline between
headed and headless modes. The intended scrollbar behaviour and speaker-view
geometry deserve a separate assertion or targeted test.

#### Assessment and maintenance implications

- The small icon, glyph, border, and drawing-edge differences are not germane
  to the Slipshow behaviours those tests are intended to protect. They are,
  however, valid evidence that the capture environment does not match the
  baseline environment.
- The speaker-view reflow is germane. A headless screenshot with hidden
  scrollbars does not fully represent what a presenter sees in a regular
  browser window.
- The pinned headed result is deterministic in the repeated sample, and the
  general class of difference is predictable. The exact pixels and counts are
  not portable predictions across browser, Playwright, operating-system, font,
  graphics, or scrollbar-setting changes.
- A Playwright update normally selects a new browser revision. Over a sequence
  of upgrades, strict zero-tolerance screenshots containing text, SVG, shadows,
  transforms, and embedded renderers are likely to acquire at least small
  diffs, even when Slipshow has not changed. Baseline review should therefore
  be an explicit part of browser-toolchain upgrades.
- Pinning Playwright and its browser revisions, and running required comparisons
  in one pinned CI image, makes ordinary runs reproducible between deliberate
  upgrades. The current lockfile provides the browser-version pin locally;
  OS/font/graphics stability still needs the proposed CI container.
- Do not solve these observations with a broad global pixel tolerance. That
  could conceal the small rescaling and drawing-alignment regressions this
  portfolio is meant to find. Keep the authoritative headless baselines strict,
  inspect diffs during controlled upgrades, and use semantic/geometric
  assertions to decide whether a visual change represents a product defect.
- If live, comparable Chromium runs are worth their additional baseline cost,
  create a distinct headed project. Another option worth evaluating is
  Playwright's `channel: "chromium"` new-headless mode, which uses regular
  Chromium rather than the separate headless shell. Either change requires a
  fresh baseline review and does not eliminate OS scrollbar or font-rendering
  differences.

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
