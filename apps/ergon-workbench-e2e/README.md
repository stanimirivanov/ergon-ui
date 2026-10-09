# Workbench browser checks and local user guide

## TL;DR

The tagged access-state, inbox-navigation, follow-up, owned-context,
claim-recovery, release-recovery, and run-supervision scenarios are ordinary assertion-first
Playwright tests in `pnpm e2e`. `pnpm guide:generate` reruns all seven with
annotations, screenshots, and video, then assembles a local seven-chapter Markdown
and static HTML guide. Their BFF responses and case data are simulated; the
result is **not** a live backend or OIDC verification. A successful `main` run
can publish the same labelled book to GitHub Pages after repository setup.

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
from the workflow run to review the rendered book. The artifact expires after
seven days. A failed recording uploads available guide and Playwright evidence
separately. The generation job has read-only repository permission.

## Publication

The [publication decision](../../docs/decisions/0022-publish-simulated-user-guide-from-main.md)
limits the Pages artifact and deployment job to successful `main` runs. Pull
requests and manual runs from other refs remain review-only. The separate
deployment job receives only `pages: write` and `id-token: write`, uses the
`github-pages` environment, and reports the URL supplied by GitHub. No
generated files are committed to a publishing branch.

Before the first deployment, a maintainer must set **Settings → Pages → Build
and deployment → Source** to **GitHub Actions** and review the `github-pages`
environment protection rules. The workflow does not change that setting. See
[GitHub's Pages source instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
GitHub Pages may be public even for a private repository: review the generated
media and text for synthetic-only data before merging. A missing Pages setting
or failed build prevents publication; it must not be bypassed by relaxing
the simulation boundary or granting PR jobs deployment authority.

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
and retry into a simulated verified session. The inbox chapter uses 26 synthetic
items to exercise the real 25-row UI page boundary, a paired keyset cursor,
shareable exact-queue filtering, and a neutral empty result. The follow-up
chapter uses a synthetic resolver, case, and follow-up to verify browser
claim/release, evidence disclosure, and accessibility. The claim-recovery
chapter distinguishes a definite competing claim from an uncertain response
and asserts an explicit replay of the original command. The owned-context
chapter demonstrates lazy disclosure, an explicit current-claim recheck with
fresh context, hidden evidence during revalidation, and a neutral unavailable
result. It also identifies the verified session actor in the Current claim strip
without treating that display as claim authority, and distinguishes recorded
capability risk and approval requirements from a current approval decision.
The release-recovery chapter compares a disabled rollout with a separately
enabled synthetic state, then verifies
exact claim-and-revision replay after a lost response. None verifies a real
provider, control plane, database, or authorization decision. Keep that
distinction visible in each chapter and the index. A later disposable
full-stack environment is required before calling these operational guides.

The run-supervision chapter opens the assigned-only active-run Console,
distinguishes pinned capability-policy requirements from approval decisions,
and explains absent evidence/proof detail. It records private snapshot hiding
during pending and failed revalidation, safe retry, terminal detail after active
discovery empties, and neutral protected absence. It also checks keyboard
navigation and narrow reflow. Assignment, current authority, and terminal state
are synthetic backend facts, not browser authorization or outcome proof.

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
shared database. A live guide environment remains out of scope. Both the
review artifact and Pages output have the same synthetic trust boundary as
local output.
