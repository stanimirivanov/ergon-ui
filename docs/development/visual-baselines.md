# Console visual baselines

## TL;DR

Run `pnpm visual:check` against the pinned Linux renderer below. It compares,
never updates, committed synthetic Console screenshots. Review intentional
changes in the PR; generating a PNG does not establish design approval.

## Renderer and local commands

The version and immutable image digest in
[`renderer.json`](../../tools/visual/renderer.json) are shared with CI.
The installed Playwright client must match that version. The container supplies
Chromium, fonts and Linux/amd64 rendering; tests and the preview server run on the host.
No production dependency or real BFF is required.

From the repository root in Bash, with Docker running:

```bash
image=$(node -p "require('./tools/visual/renderer.json').image")
version=$(node -p "require('./tools/visual/renderer.json').playwrightVersion")
docker run --detach --rm --init --platform linux/amd64 --name ergon-visual --publish 127.0.0.1:3074:3000 --shm-size=256m --user pwuser --workdir /home/pwuser "$image" /bin/sh -c "npx --yes playwright@$version run-server --host 0.0.0.0 --port 3000"
export ERGON_VISUAL_WS_ENDPOINT='ws://127.0.0.1:3074/'
pnpm visual:check
docker rm --force ergon-visual
```

Wait for the renderer's listening message in `docker logs ergon-visual` before
running the check. Stop only this test container after testing.
The connection forwards host loopback to the remote browser, not to external
clients. See [Playwright remote connections](https://playwright.dev/docs/docker).

## Review and updates

M05-PR28b introduces a global workbench Sign out control in standard and focused
headers. Full-page/header-inclusive baselines intentionally change; isolated
inspector crops may remain identical. The busy-host workflow leaves capture to
CI: the PR stays draft until the pinned comparison artifacts have been inspected
and intentional baseline changes approved. Do not mask the control, relax pixel
tolerances or treat existing baseline failures as accepted design. CI comparison
does not update committed expectations automatically.

The first PR #233 review adopts five inspected actual PNGs from pinned Verify
[run 40754316583](https://github.com/stanimirivanov/ergon-ui/actions/runs/40754316583)
at source revision `9484302`: populated/empty follow-up workspace, assigned
populated Console, matching outcome and owned narrow chrome. Differences are the
sign-out control, header reflow and its four-pixel effect on available pane height;
the outcome content is unchanged. These files are copied byte-for-byte from the
reviewed artifacts, not synthesized or rewritten by CI. Screenshot assertions
collect subsequent states even after a mismatch, while still failing the test;
all semantic/accessibility/authority assertions remain hard failures. Later
states formerly hidden by the first mismatch still require CI comparison and,
if changed, a separate inspected baseline update. PR approval establishes the
accepted design; downloading an artifact alone does not.

The second review uses pinned Verify
[run 40759860813](https://github.com/stanimirivanov/ergon-ui/actions/runs/40759860813)
at `0e5a4f7`. All comparison states now ran; only the narrow follow-up workspace,
assigned withheld view and accepted outcome pane still differed. Those three
inspected actual PNGs complete the sign-out baseline changes. Narrow chrome fits
without overflow, withheld detail remains absent and accepted-proof text/values
are unchanged; the desktop pane is four pixels shorter. The next CI run must
confirm the comparisons against these expectations before readiness.

M06-PR9 adds the Evidence review navigation link. PR #237's inspected pinned Verify
[run 40935067405](https://github.com/stanimirivanov/ergon-ui/actions/runs/40935067405)
at source revision `5d17ae0` supplies three baseline candidates: populated desktop,
populated narrow and empty desktop follow-up workspaces. Their diffs are confined
to the new link and the repositioned Notifications/Assigned runs navigation.
Content panels, authority indicators and page controls remain unchanged; the narrow
navigation fits without overflow. Copy these actual PNGs byte-for-byte from the
pinned artifact, without changing tolerances or masks. PR review establishes design
approval, and the next pinned CI comparison must confirm these expectations before
readiness. Local host screenshots are not substituted for this renderer.

Twenty-seven screenshots cover the paired shared/owned landing workspace at desktop
and narrow widths, neutral empty views, assigned populated and withheld detail, projected execution,
desktop/narrow authorization review, pinned inputs, matching/accepted outcome proof
and narrow accepted proof, owned inspection,
320-pixel owned chrome, forced-colour inspection, desktop/narrow internal notes
and desktop/narrow direct follow-up handover, administrative-completion and
independent-priority confirmation, plus desktop/narrow requester-question history
with recorded answers and its deliberate composer. Existing browser fixtures
provide deterministic synthetic records; these are not live operational evidence.
Viewport, scale, locale, timezone, colour scheme and reduced motion are fixed in
[`playwright.visual.config.mts`](../../apps/ergon-workbench-e2e/playwright.visual.config.mts).
No private content is masked to obtain a passing comparison.

For an intentional presentation change, use the same renderer:

```bash
pnpm visual:check --update-snapshots=all
pnpm visual:check
```

Inspect every changed image and the diff before staging the reviewed PNGs under
`apps/ergon-workbench-e2e/src/visual-baselines`. PR approval establishes the
accepted baseline, not the update command. Never update baselines in CI.
The separate required visual job uploads failure diagnostics from
`test-output/visual`; missing expectations and pixel differences fail it.
Renderer updates require deliberate image and baseline review together.

These viewport comparisons prove only the selected states in Chromium/Linux.
They do not replace semantic, focus, privacy, responsiveness or accessibility
assertions, user-guide review, or human assessment against the design references.
Other browsers, real GPU/material differences and live backend authority are
outside this gate.

## M07 Simulation Lab navigation

M07-PR13 adds the Simulation Lab link to the follow-up navigation. Header-inclusive
follow-up screenshots may change. The implementation PR remains draft until the
pinned renderer comparison is available and intentional navigation differences
have been inspected. Local host images are not substituted for pinned baselines;
no baseline or comparison tolerance changes accompany this slice. Simulation Lab
browser scenarios additionally check 320-pixel reflow and axe accessibility.
