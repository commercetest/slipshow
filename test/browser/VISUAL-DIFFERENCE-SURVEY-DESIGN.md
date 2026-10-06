# Visual-difference survey design

Date: 2026-10-06

Status: proposal; no implementation has been made

## Purpose

The current visual tests use hard `toHaveScreenshot` assertions. A mismatch
ends the current test, so later visual checkpoints in that test are not
captured. Independent tests still run, but a single run cannot show every
difference in a multi-checkpoint flow such as presentation states, themes, or
drawing before and after resize.

The proposed change is to collect all meaningful visual checkpoints first,
then analyse the resulting evidence and produce one summary. The normal
regression run should remain strict: collecting more evidence must not turn an
unexpected difference into a passing test.

The intended flow is:

```text
hard readiness, semantic, and geometry preconditions
                         |
                         v
          soft visual checkpoint assertions
                         |
                         v
       expected, actual, diff, trace, measurements
                         |
                         v
              deterministic analyser
                         |
                         v
        JSON data + Markdown/HTML summary
                         |
                         v
          explicit run-mode exit decision
```

The report should support conclusions such as:

> Most differences are likely mode-specific edge rasterisation. Speaker view
> is a layout signal: a visible scrollbar reduces the notes column's client
> width and changes wrapping.

That conclusion must be supported by recorded geometry and semantic evidence,
not inferred from pixel count alone.

## Recommendation in brief

Implement this as a small vertical slice before converting the entire suite:

1. Introduce one named `visualCheckpoint` helper that uses a soft Playwright
   screenshot assertion.
2. Keep readiness, state, DOM, console, and geometry assertions hard.
3. Convert the multi-state test first and demonstrate that all three failed
   screenshots are retained in a single headed-versus-headless run.
4. Attach structured measurements to each checkpoint.
5. Add a custom reporter or post-run analyser that always emits JSON and a
   Markdown summary, including when the Playwright run fails.
6. Validate the design on drawing and speaker view before converting the
   remaining screenshots.
7. Keep the ordinary baseline run strict and add a separately named survey
   command for cross-mode and browser-upgrade investigations.

Do not begin by building a sophisticated image classifier. The initial value
comes from complete collection, stable checkpoint names, artifact links, and
explicit geometry measurements.

## Git and branch strategy

### Starting point

The work depends on the existing local `playwright-screenshot-spike` branch,
which contains the browser harness, fixtures, and macOS baselines. It should
not start from `origin/main`, because doing so would either duplicate the spike
or obscure which changes belong to the survey experiment.

The README investigation and this design document should first be committed as
a documentation-only commit on `playwright-screenshot-spike`. This leaves the
existing spike with a coherent explanation of its behavior before its test
architecture changes.

Then create a stacked local branch, for example:

```text
origin/main
    |
    +-- playwright-screenshot-spike
            |
            +-- playwright-visual-survey-spike
```

Suggested branch name:

```text
playwright-visual-survey-spike
```

Preserve `playwright-screenshot-spike` as the known-working reference. This
makes it easy to compare the old fail-fast behavior with the proposed
collection behavior and avoids rewriting the existing experimental commits.

If simultaneous comparison becomes useful, use a Git worktree rather than
switching the same directory repeatedly. A second full clone is unnecessary.

### Commit structure

Keep the implementation reviewable and bisectable. A practical sequence is:

1. **Add a soft visual-checkpoint helper and convert one state test.**
   Prove that later checkpoints execute after the first screenshot mismatch.
2. **Add structured observations and the basic summary reporter.**
   Produce JSON and Markdown without attempting causal classification.
3. **Add analyser unit tests and conservative classifications.**
   Start with `likely-raster`, `layout-signal`, `content-signal`, `unknown`,
   and `invalid-capture`.
4. **Instrument drawing and speaker-view geometry.**
   Prove that the two known examples are distinguished using evidence.
5. **Convert the remaining visual checkpoints.**
   Keep their existing semantic assertions and snapshot names.
6. **Add commands and operating documentation.**
   Document strict, survey, headed, and upgrade-review workflows.

Do not mix any accepted baseline changes into these commits. If the chosen
browser mode changes and baselines genuinely need regeneration, put all
reviewed baseline replacements in a separate, clearly labelled commit.

Similarly, do not fix the speaker-view product layout in the survey branch.
If the investigation justifies a Slipshow change, use a separate branch and
commit so the testing infrastructure and product behavior can be reviewed
independently. That branch can be stacked on the survey branch while the new
test is needed, then rebased or transplanted once the harness direction is
settled.

## Proposed implementation architecture

### 1. A visual-checkpoint helper

Add a helper under `test/browser/support/`, tentatively:

```text
support/visual-checkpoint.mjs
```

Conceptually, its interface should be:

```js
await visualCheckpoint({
  id: 'states/initial',
  target: presentation.locator('#slipshow-open-window'),
  snapshot: 'state-00-initial.png',
  testInfo,
  measure: async () => ({ /* checkpoint-specific evidence */ }),
});
```

The helper should:

- run inside a named `test.step`;
- collect generic environment and target measurements;
- collect optional checkpoint-specific measurements;
- invoke `expect.soft(target, message).toHaveScreenshot(...)`;
- attach one JSON observation with a stable checkpoint ID;
- record whether the screenshot matched, differed, or was not captured; and
- leave Playwright responsible for screenshot stabilization, animation
  disabling, masking, comparison, and expected/actual/diff artifacts.

Use stable IDs that describe the product surface rather than source line
numbers. Snapshot filenames can remain unchanged. Stable IDs make summaries
comparable after a test is reorganized.

Do not make all assertions soft. The helper is for screenshots only.

### 2. Hard preconditions remain hard

Each screenshot should be preceded by assertions that establish whether the
capture is meaningful. Examples include:

- the generated iframe reported `Ready`;
- the expected presentation step was reached;
- required fonts and renderers finished loading;
- the drawing path exists;
- the presenter popup opened and received its note;
- the target element is visible and has non-zero dimensions; and
- no browser error invalidated the page.

If one of these fails, stop that test. Continuing would create cascading image
differences whose actual cause is a missing prerequisite. The reporter should
classify later, unavailable checkpoints as `invalid-capture` or `not-reached`,
not as visual regressions.

### 3. Structured observation data

Record evidence once per run and once per checkpoint.

Run-level metadata should include:

- timestamp and source revision;
- project name and requested run mode;
- Playwright and Node versions;
- browser name, version, revision, channel, and headed/headless mode;
- operating system and architecture;
- viewport, screen dimensions, device-pixel ratio, and color scheme;
- worker count and relevant screenshot options; and
- a baseline-manifest identifier, when available.

Generic checkpoint metadata should include:

- stable checkpoint ID, test file, and test title;
- snapshot filename and target type;
- target bounding box;
- `clientWidth`, `offsetWidth`, `scrollWidth`, `clientHeight`,
  `offsetHeight`, and `scrollHeight` where applicable;
- selected computed styles such as transform, overflow, and font family;
- semantic/geometric precondition status; and
- paths to expected, actual, diff, trace, and error-context artifacts.

Checkpoint-specific callbacks should add only measurements that explain the
risk protected by that checkpoint.

### 4. Reporter and analyser separation

Use Playwright's reporter lifecycle to ensure a summary is generated after all
tests, including failed tests. Keep evidence extraction deterministic and
auditable.

A reasonable file layout is:

```text
test/browser/
├── analysis/
│   ├── analyse-visual-results.mjs
│   ├── classify-visual-result.mjs
│   └── render-summary.mjs
├── reporters/
│   └── visual-summary-reporter.mjs
├── support/
│   └── visual-checkpoint.mjs
└── tests/
```

The reporter should gather test results and attachments and invoke the
analyser at the end. The analyser should produce:

```text
test-results/visual-summary.json
test-results/visual-summary.md
```

An HTML view can follow later. The existing Playwright HTML report already
provides detailed traces and images, so the first summary only needs to link
to those artifacts.

The JSON file is the source of truth. Markdown is a presentation of that data,
not a separately computed interpretation.

### 5. Image evidence

For a failed Playwright comparison, inspect its generated diff rather than
taking another screenshot. Initial useful measurements are:

- image dimensions;
- counted difference pixels;
- antialias-only pixels;
- counted and antialias ratios;
- bounding rectangle of all differences;
- number and sizes of connected difference regions; and
- distribution near text/SVG edges versus solid interiors, if this can be
  defined robustly.

Playwright's bundled implementation currently marks counted pixels red and
detected antialiasing pixels yellow. Do not depend silently on private
Playwright modules. If PNG inspection becomes part of the committed harness,
use a small explicitly pinned decoder such as `pngjs`, document the diff-color
assumption, and cover it with unit tests.

Avoid adding ImageMagick as a project requirement merely because it was useful
for the manual investigation. A pure-JavaScript analyser is easier to reproduce
in the proposed CI container.

### 6. Conservative classification

Suggested machine classifications are:

| Classification | Required evidence |
| --- | --- |
| `match` | Screenshot and hard assertions passed |
| `likely-raster` | Geometry and semantics unchanged; sparse differences concentrated at rendered edges |
| `layout-signal` | Bounding boxes, client sizes, wrapping, overflow, clipping, or transforms changed |
| `content-signal` | Text, visibility, state, element identity, or drawing data changed |
| `environment-mismatch` | Baseline and actual provenance differ in a relevant dimension |
| `unknown` | Difference exists but evidence is insufficient |
| `invalid-capture` | A hard prerequisite failed or the target was unavailable |

Use wording such as "likely" and attach a confidence level. Never classify a
difference as harmless solely because its pixel count is small. A one-pixel
change can remove a thin rule or shift a drawing endpoint; thousands of edge
pixels can result from a harmless font-rasterization change.

Free-form or AI-generated prose may summarize deterministic findings for a
human, but it must not decide the CI result or approve a baseline. The report
should remain useful without such prose.

## Run modes and exit behavior

### Strict regression mode

The existing default should remain the authoritative command:

```sh
npm test
```

It should:

- run in the baseline's pinned environment;
- collect every reachable checkpoint;
- produce the visual summary even when differences exist; and
- exit non-zero for any unexpected visual difference or hard failure.

Soft screenshot assertions still mark their containing tests failed. Their
purpose is to delay termination until the test has collected its later visual
checkpoints, not to weaken the result.

### Survey mode

Add a separately named command, tentatively:

```sh
npm run test:survey:chromium
```

Its intended uses are:

- headed versus headless investigation;
- Playwright or browser revision upgrades;
- operating-system or container migration;
- evaluation of a new browser channel; and
- deliberate side-by-side baseline review.

Initially, let survey mode retain Playwright's non-zero status when differences
are found. This is simpler and safer. The summary distinguishes screenshot
findings from hard semantic failures.

Only add a non-gating local survey exit policy if there is a concrete workflow
that needs it. If added, encode the visual finding status in JSON and use a
distinct, documented exit policy. Never make a CI survey green merely because
it generated a report.

`--ignore-snapshots` is unsuitable for survey collection because it suppresses
the comparisons and therefore does not generate the expected/actual/diff
evidence the analyser needs.

## Summary design

The default terminal and Markdown summary should show only differences,
invalid captures, and hard failures. A verbose option can include matches.

Recommended columns are:

| Column | Purpose |
| --- | --- |
| Project | Browser/mode baseline namespace |
| Checkpoint | Stable visual checkpoint ID |
| Pixel evidence | Counted and antialias-only counts/ratios |
| Structural evidence | Geometry, overflow, state, or content changes |
| Assessment | Conservative classification and confidence |
| Artifacts | Expected, actual, diff, and trace links |

After the table, provide a grouped synthesis such as:

```text
Likely rasterisation-only: 9 checkpoints
Layout signals: 1 checkpoint
Unknown and requiring review: 1 checkpoint
Invalid captures: 0 checkpoints
```

The explanatory sentence can then be generated from those facts:

```text
Most differences are likely mode-specific edge rasterisation. Speaker view is
a layout signal because the visible scrollbar reduced the notes client width
and changed text wrapping.
```

The report must link the sentence back to the relevant evidence rows.

## Test design

### Unit-test the analyser independently of Slipshow

The classification and report code should not require a browser for every
test. Use Node's built-in `node:test` unless a stronger reason emerges for
another JavaScript test framework.

Create small synthetic fixtures for:

- identical images;
- sparse edge-only changes;
- a one-pixel solid-interior change;
- a deliberate one-pixel geometry shift;
- a large text-edge raster change;
- a scrollbar-width/layout change;
- missing expected or actual artifacts;
- malformed observation metadata; and
- multiple differences within one Playwright test.

Also snapshot or otherwise assert the generated Markdown table. A change to
the summary format should be reviewable without launching Slipshow.

Synthetic fixtures should be small and purpose-built. Do not copy large
portfolio screenshots into analyser unit tests.

### Prove the Playwright integration with one vertical slice

Convert `states.visual.spec.mjs` first because its first test contains three
ordered screenshots. A headed run against the current headless baselines
should demonstrate all of the following:

- the first visual mismatch does not terminate the test;
- the revealed and focused checkpoints are still reached;
- each mismatch has unique expected/actual/diff artifacts;
- the test is still reported as failed;
- the reporter lists all three checkpoints; and
- a subsequent independent test still runs.

This proves the core behavior before reporter and fixture changes spread
through the suite.

### Add risk-specific measurements

#### Layout

Retain the existing containment, aspect-ratio, and centring assertions. Record
the presentation and viewport rectangles in the observation. A pixel mismatch
with stable rectangles can then be separated from a rescaler geometry change.

#### Drawing

Retain the path-count assertion and add numerical evidence for the intended
coordinate relationship:

- input pointer coordinates;
- path or endpoint bounds before resize;
- anchor/target bounds;
- projected client coordinate after resize; and
- alignment error in CSS pixels.

The screenshot remains valuable, but the summary can say whether the stroke
actually moved rather than inferring alignment from colored pixels.

#### Speaker view

Record:

- popup viewport and screen dimensions;
- `#speaker-notes` bounding rectangle;
- `offsetWidth - clientWidth` as observed scrollbar width;
- wrapper and paragraph rectangles;
- `scrollWidth`, `scrollHeight`, and overflow styles;
- whether any intended content extends beyond the client rectangle; and
- the notes text and expected speaker state.

Initially record rather than assert the scrollbar width, because the intended
cross-platform behavior has not yet been decided. Add a hard geometry
assertion only after defining what presenters should see.

#### Toolbar

Record the toolbar rectangle, visible control count, selected tool, labels,
and shortcut badges. Dense raster differences can then be distinguished from
missing or displaced controls.

#### Embedded renderers

Keep renderer-specific visibility and browser-error checks hard. Record the
MathJax, Mermaid, and code block rectangles so a rendering failure is not
reduced to a generic image difference.

## Slipshow fixture and content strategy

Prefer small Markdown fixtures whose content explains the risk they protect.
The existing portfolio fixtures are a good starting point; do not expand them
merely to create more pixels.

Use these principles:

- one fixture section should exercise one named rendering or behavior risk;
- all resources required for authoritative screenshots should be local;
- text should be stable and deliberately chosen when line wrapping matters;
- use explicit element IDs for semantic checks and measurements;
- avoid current time, random data, video frames, cursor state, and uncontrolled
  animation;
- mask only genuinely irrelevant dynamic regions;
- keep representative shadows, SVG, fonts, and transforms when they are the
  subject of the test; and
- do not use screenshot-only CSS to hide a real user-facing behavior such as
  speaker-view scrollbars without a separate test for that behavior.

### Potential new fixtures

Do not add new Slipshow fixtures until the vertical slice proves they are
needed. Likely candidates are:

1. **Speaker layout fixture.** A short presentation with notes deliberately
   near a wrapping boundary, a long unbroken token, and enough notes to require
   vertical scrolling. This would make scrollbar and clipping behavior an
   explicit product contract rather than an accidental property of prose.
2. **Drawing geometry fixture.** A minimal slide with fixed visual anchors and
   target coordinates, making coordinate round-trip measurements easier than
   in the general portfolio slide.
3. **Visual analyser calibration HTML.** A browser-independent static page for
   integration tests of known geometry changes. Keep this separate from
   Slipshow Markdown content so analyser behavior is not coupled to compiler
   output.

The speaker fixture should be designed only after deciding whether the desired
contract is overlay scrollbars, reserved scrollbar space, `overflow: auto`, or
another layout. The current `overflow: scroll` behavior differs visibly between
headless shell and a regular macOS window.

## Baseline provenance

The current path records browser project and platform, but PNG files do not
record enough provenance to explain all differences. Add a reviewed manifest
for each baseline set or baseline update containing at least:

- Playwright version;
- managed browser revision and reported version;
- browser channel and executable family;
- headed/headless mode;
- operating system image and architecture;
- device scale factor and viewport policy;
- font package/version information where practical; and
- screenshot options and stabilisation stylesheet identity.

An actual run should produce a corresponding run manifest. The analyser can
then label a cross-mode comparison as an environment mismatch before attempting
to infer a Slipshow cause.

Do not create an exception such as "39 pixels is expected." If a headed mode
is meant to be authoritative, give its project its own reviewed baseline. A
known pixel count is diagnostic evidence, not a durable contract.

## Browser scope

Start the vertical slice in Chromium because the headed/headless executable
difference and the known speaker-view signal already provide useful cases.
Once collection and reporting are reliable:

1. run the same survey in Firefox;
2. determine whether its headed/headless differences need separate handling;
3. keep browser-specific baselines and evidence; and
4. add WebKit only after the two primary projects are stable.

Do not generalize Chromium's headless-shell explanation to Firefox without
measurement.

Playwright's `channel: "chromium"` new-headless mode is worth a separate
experiment because it uses regular Chromium rather than the standalone
headless shell. Treat that as a browser-mode migration: run the survey, review
all differences, and create fresh baselines if the mode is adopted. It does not
remove OS font, graphics, or scrollbar variation.

## Acceptance criteria for the spike

The exploration is successful when all of these are true:

1. A multi-checkpoint test continues after its first screenshot mismatch and
   records every later reachable checkpoint.
2. The test and strict run still exit non-zero for unexpected differences.
3. Hard prerequisite failures stop dependent capture and are reported as
   invalid/not reached rather than visual regressions.
4. A summary is generated after passing and failing runs.
5. Every summary row links to its evidence and uses a stable checkpoint ID.
6. The JSON and Markdown summaries agree and are deterministic for identical
   inputs.
7. The known 39-pixel state difference is classified no more strongly than
   `likely-raster`, with stable geometry shown as evidence.
8. Speaker view is identified as a layout signal because recorded client width
   or scrollbar geometry changes, not because its pixel count is large.
9. Drawing evidence states whether the stroke/anchor relationship changed.
10. Survey runs never update baselines implicitly.
11. The existing pinned headless run still passes without baseline changes.
12. The ordinary OCaml/dune test workflow remains unaffected and does not
    acquire a browser download requirement.

## Risks and countermeasures

### The report rationalizes genuine regressions

Countermeasure: use conservative classifications, retain strict exit behavior,
and require human review for `unknown`, layout, or content signals.

### Soft assertions cause cascading noise

Countermeasure: soften screenshot assertions only. Keep every capture
prerequisite hard and mark dependent checkpoints not reached.

### Pixel heuristics become a maintenance project

Countermeasure: begin with counts, regions, geometry, and artifact links.
Implement edge morphology only if repeated reviews demonstrate its value.

### The summary hides raw evidence

Countermeasure: link every row to expected, actual, diff, trace, observation
JSON, and error context.

### Survey mode weakens CI

Countermeasure: keep `npm test` strict; make survey mode explicit and initially
non-zero on visual differences.

### Baseline proliferation

Countermeasure: add a separate headed baseline only if live comparable runs
are a maintained requirement. Do not multiply every viewport, mode, browser,
and operating system without a named risk and an owner.

### New Node dependencies are disproportionate

Countermeasure: use the Playwright runner and Node's built-in test framework;
add at most a small pinned PNG decoder after proving the summary's value.

## Questions to answer during the vertical slice

1. Does pinned Playwright 1.59.1 retain distinct expected/actual/diff
   attachments for every failed soft screenshot assertion in one test?
2. Are attachment names sufficient to associate artifacts with stable
   checkpoint IDs, or should the helper attach an explicit artifact manifest?
3. Should the summary reporter run for all browser tests or only when an
   environment variable enables survey output?
4. What is the intended speaker-view scrollbar and clipping behavior on a
   regular desktop browser?
5. Is Chromium new-headless mode a better future baseline than the standalone
   headless shell?
6. Which environment details can be obtained through public Playwright APIs
   without depending on private modules?
7. Does the maintainer want this reporting machinery in Slipshow itself, or
   should it remain an external evaluation tool until its maintenance cost is
   demonstrated?

## Suggested decision point

Stop and review after the state-test vertical slice plus the first JSON and
Markdown report. At that point, compare the implementation cost with the
quality of the evidence it produces.

Continue to the whole portfolio only if the slice demonstrates that it:

- captures materially more useful evidence than the current HTML report;
- preserves the strict regression signal;
- makes the speaker/drawing distinction clearer without manual archaeology;
  and
- remains understandable to a maintainer who did not build the analyser.

That review prevents an exploratory convenience from becoming a large custom
visual-testing framework by inertia.

## References

- [Playwright soft assertions](https://playwright.dev/docs/test-assertions#soft-assertions)
- [Playwright reporters](https://playwright.dev/docs/test-reporters)
- [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots)
- [Playwright Chromium headless modes](https://playwright.dev/docs/browsers#chromium-headless-shell)
