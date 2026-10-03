# Workbench browser checks and local user guide

## TL;DR

The tagged follow-up scenario is an ordinary assertion-first Playwright test in
`pnpm e2e`. `pnpm guide:generate` reruns that same scenario with annotations,
screenshots, and video, then assembles a local Markdown and static HTML guide.
Its BFF responses and case data are simulated; the result is **not** a live
backend or OIDC verification and is not published.

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

The current scenario uses Playwright route responses for a synthetic resolver,
case, and follow-up. It verifies real browser UI interactions, CSRF header
submission, claim/release revisions, evidence disclosure, and accessibility
against those fixtures. It does not verify a real provider, control plane,
database, or authorization decision. Keep that distinction visible in the
chapter and index. A later disposable full-stack environment is required
before calling any generated chapter an operational guide.

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
