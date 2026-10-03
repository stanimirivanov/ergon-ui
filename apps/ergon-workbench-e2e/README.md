# Workbench browser checks and local user guide

## TL;DR

The tagged access-state and follow-up scenarios are ordinary assertion-first
Playwright tests in `pnpm e2e`. `pnpm guide:generate` reruns both with
annotations, screenshots, and video, then assembles a local two-chapter
Markdown and static HTML guide. Their BFF responses and case data are
simulated; the result is **not** a live backend or OIDC verification and is not
published.

## Commands

From the `ergon-ui` repository root:

```powershell
pnpm e2e
pnpm guide:check
pnpm guide:generate
pnpm guide:preview
```

`guide:generate` builds the workbench, ensures Chromium is installed, clears
only the ignored `dist/user-guide` output, runs `@user-guide` scenarios in
recording mode, and validates and assembles their manifests. Open
`http://127.0.0.1:4173` after starting `guide:preview`; `GUIDE_PORT` may
select another loopback port. The preview server supports range requests for
video, rejects path escape, and serves no external scripts. Do not commit
generated screenshots, recordings, manifests, or rendered pages.

The `User guide artifact` GitHub Actions workflow runs on pull requests and
`main` pushes (or manually). Download its `simulated-user-guide-*` artifact
from the workflow run to review the rendered book before any future publication
decision. The artifact expires after seven days; the workflow has read-only
repository permission and no Pages deployment or production credentials. A
failed recording uploads available guide and Playwright evidence separately.

## Content and trust boundary

The reader-facing chapter definition is co-located with the browser scenario
under `src/guide/`. It supplies audience, overview, prerequisites, actions,
expected results, troubleshooting, and limitations. Each declared step ID must
be executed in order by the tagged scenario. The assembler rejects missing or
escaping media, malformed structure, an unlabelled verification mode, and a
chapter too thin to explain a multi-step workflow. These checks are a floor,
not a substitute for reviewing the rendered prose and screenshots for clarity
and accuracy.

The access chapter compares mutually exclusive synthetic session states; the
recording swaps fixture responses between reloads and never performs a real
login. It verifies the safe local sign-in path, failure-state non-disclosure,
and retry into a simulated verified session. The follow-up chapter uses a
synthetic resolver, case, and follow-up to verify browser claim/release,
evidence disclosure, and accessibility. Neither chapter verifies a real
provider, control plane, database, or authorization decision. Keep that
distinction visible in each chapter and the index. A later disposable
full-stack environment is required before calling either an operational guide.

Recording mode blocks service workers and permits only local preview documents
and static assets to reach the preview server. The synthetic BFF routes must
fulfill their responses with a fixture marker. An unmatched request, external
HTTP(S) request, or unmarked BFF response fails generation even if the browser
UI recovers; request diagnostics omit query values. This guards the simulated
artifact against accidental live-data capture, but it is not a substitute for
reviewing test routes and generated media before sharing an artifact.

The generator and static-book layout adapt the
[Omoikane user-guide pattern](https://github.com/stanimirivanov/chat-hub-99);
Ergon owns the richer content
schema, simulation disclosure, and security checks. The guide runtime remains
inside this `type:test` project and adds no browser-bundle dependency.

## Failure handling

A failed browser scenario removes its incomplete chapter directory and retains
the normal Playwright failure artifacts. The assembler runs only after all
tagged scenarios pass. The guide scripts do not start, reset, or mutate a
shared database. A live guide environment and publication workflow remain out
of scope. The CI artifact has the same synthetic trust boundary as local output.
