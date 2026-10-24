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

From the repository root in PowerShell, with Docker running:

```powershell
$renderer = Get-Content tools/visual/renderer.json -Raw | ConvertFrom-Json
docker run --detach --rm --init --platform linux/amd64 --name ergon-visual --publish 127.0.0.1:3074:3000 --shm-size=256m --user pwuser --workdir /home/pwuser $renderer.image /bin/sh -c "npx --yes playwright@$($renderer.playwrightVersion) run-server --host 0.0.0.0 --port 3000"
$env:ERGON_VISUAL_WS_ENDPOINT = 'ws://127.0.0.1:3074/'
pnpm visual:check
docker rm --force ergon-visual
```

Wait for the renderer's listening message in `docker logs ergon-visual` before
running the check. Stop only this test container after testing.
The connection forwards host loopback to the remote browser, not to external
clients. See [Playwright remote connections](https://playwright.dev/docs/docker).

## Review and updates

Twenty-three screenshots cover the paired shared/owned landing workspace at desktop
and narrow widths, neutral empty views, assigned populated and withheld detail, projected execution,
desktop/narrow authorization review, pinned inputs, matching/accepted outcome proof
and narrow accepted proof, owned inspection,
320-pixel owned chrome, forced-colour inspection, desktop/narrow internal notes
and desktop/narrow direct follow-up handover, administrative-completion and
independent-priority confirmation. Existing browser fixtures
provide deterministic synthetic records; these are not live operational evidence.
Viewport, scale, locale, timezone, colour scheme and reduced motion are fixed in
[`playwright.visual.config.mts`](../../apps/ergon-workbench-e2e/playwright.visual.config.mts).
No private content is masked to obtain a passing comparison.

For an intentional presentation change, use the same renderer:

```powershell
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
