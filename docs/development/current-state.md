# Current UI implementation state

## TL;DR

The repository contains a verified resolver-workbench shell, a fail-closed
confidential-BFF session boundary, a shared resolver inbox, and a web-only UI
package. Resolvers can claim visible work with an ephemeral session-bound CSRF
token, recover their active claims, release exact owned claims from a card or
the selected Console, and inspect server-authorized case context there. The
Console's case and run content remains read-only. Assigned supervisors can also
discover active runs and inspect their recorded start, pinned policy, and
current state in a separate three-pane Console. It has no resolution action,
live trace, lease, approval control, logout flow, form workflow, Motion animation,
requester app, or native app.

## Implemented

- pnpm workspace managed by Nx 23;
- Node 24 and React 19.3 version contract;
- Vite-built workbench with React Router Data Mode;
- Tailwind CSS theme tokens, a dark scope for the selected Resolver Console,
  and one shadcn-compatible button primitive;
- accessible home and unknown-route recovery screens;
- tenant route validation and confidential BFF session consumption;
- RTK Query cache ownership with Effect-based HTTP, timeout, bounded retry,
  cancellation, schema decoding, and typed failure mapping;
- cause-free defect containment at session, follow-up, and assigned-run cache
  boundaries, including missing bindings and rejection during cancellation;
  capability-owned normalization drops diagnostic extras, validates HTTP status,
  and distinguishes workbench defects from malformed server responses. Mutation
  defects preserve uncertainty and the exact intent for explicit replay;
- explicit local sign-in navigation from the validated BFF problem contract;
- explicit authentication-required, unregistered-actor, rejected-identity,
  transient-failure, invalid-response, and verified-session UI states;
- BFF follow-up page decoding with current-authority non-disclosure semantics;
- URL-owned queue filtering, local reversible keyset navigation, and explicit
  loading, empty, failure, and populated inbox states;
- session-bound CSRF acquisition kept outside Redux and persistent storage;
- revision-checked follow-up claiming, including released work, with explicit
  conflict, expiry, authority, ambiguous-result, and same-command retry states;
- confirmed exact-claim release from active-work cards or the Console with
  typed disabled/stale/absence outcomes, same-tuple explicit retry, and
  server-cache revalidation. Console context closes before the release POST;
  release still requires the backend's operator-controlled rollout flag;
- tenant-wide inbox invalidation after successful or stale-item claim results;
- browser-owned work decoding, neutral empty-state handling, reversible exact
  claim-cursor pagination, and post-claim cache refresh;
- locally selected, full-width Resolver Console on the existing tenant route,
  with no case URL or persistent selection. It presents recorded observations,
  provenance, and occurrence/recording times through a local source-observation
  inspector; the failed handoff and ordered durable attempts with expandable
  recorded transition, connector-result, and retry-link events; and the pinned,
  unassessed outcome condition in three responsive panes. The inspector
  distinguishes observations in the run's evidence snapshot from those
  recorded later, filters the list by that boundary, and compares two visible
  sources in a modal inspector without treating either as a verified claim or
  assessing a contradiction. A read-only execution-policy card groups the
  escalated run's recorded capability, effective risk, approval requirement,
  and policy revision without asserting a current approval decision. Section
  jumps focus each pane without creating a case URL or fragment. Its Current
  claim strip shows the server-verified actor ID and identity provider without
  implying a lease or claim authorization. It shows the last server-observed
  claim and offers an explicit recheck that hides evidence while ownership and
  case context are reread; it does not invent a lease or countdown. It does not
  portray attempts as a live tool trace;
- lazy owned-follow-up case context with contract/run consistency checks,
  evidence-boundary validation, full request-tuple cache identity, neutral
  absence handling, cache eviction when the Console closes, fail-closed
  revalidation on reopening, plain-text observation rendering, and private
  context hidden when an owned-work recheck fails or the exact claim disappears
  or changes;
- strict TypeScript, source-owned TSDoc for non-obvious public contracts,
  ESLint project boundaries, Prettier, Vitest, and Playwright;
- seven local executable guides for simulated workbench access states,
  shared-inbox pagination and filtering, the claim and release workflow,
  owned-case-context revalidation, competing or uncertain claim recovery, and
  disabled or uncertain release recovery, and assigned-run snapshot supervision
  and revalidation, with annotated screenshots, video,
  recovery guidance, and validated Markdown/static HTML output; CI uploads
  them as an expiring review artifact and has a `main`-only GitHub Pages
  publication job; recording fails on unexpected HTTP(S) traffic or unmarked
  synthetic BFF responses;
- a capability-located session model plus a cancellation-aware current-actor
  client owned by session web data access, with no ceremonial application
  project;
- capability-located follow-up model with platform-neutral values, pure
  claim/work-item pairing and case-summary refinements, and verified Nx project
  metadata; follow-up request and failure contracts live in web data access
  without an interface-only application project;
- a capability-located follow-up web data-access package with separated wire
  contracts, read execution, claim/CSRF execution, protocol failure
  translation, and explicit RTK Query cache integration;
- a capability-located follow-up web feature package with capability-owned
  orchestration, presentation, failure copy, and independently verified
  component tests;
- a capability-located session web data-access package owning its typed client
  contract, wire decoding, failure classification, read execution, cancellation
  normalization, and tenant-keyed RTK Query integration;
- a capability-located session web feature that validates tenant navigation
  context, renders fail-closed verification states, and mounts app-supplied
  authenticated content only after a verified actor is returned;
- an independent run-supervision web data-access and feature capability for
  assigned active-run discovery, paired keyset paging, local selection, exact
  tenant/run cache identity, zero unused-detail retention, read-only pinned
  capability policy, neutral absence, explicit fail-closed recheck, and terminal
  detail retained only after a successful BFF read. The app composes both work
  areas under session verification; `view=runs` names the area without storing
  a run ID in navigation or browser persistence;
- executable first-page reset for rejected assignment traversal, without putting
  private cursors in URLs or retrying a rejected cursor; failed session rechecks
  keep authenticated work unmounted even while RTK retains the previous actor;
- capability-first `type:*`, `scope:*`, and `platform:*` boundaries with a
  finite ledger for packages still under the old global-layer paths and a
  DOM-free TypeScript configuration for model and application cores;
- CommonMark-aware repository policy for local links, summaries, ADR history,
  milestone fields, and GitHub templates;
- progressively routed harness guidance and staged GitHub verification; and
- accepted workbench/requester topology decision.

## Deliberate limits

- OIDC client credentials and provider tokens remain entirely server-side.
- No logout, refresh, or revocation UI exists.
- Claimed work includes read-only case/run inspection and confirmed release
  back to the shared queue, not direct handover or case completion. There is
  no live trace, lease countdown, steering, approval, verification
  checklist, completion, resolution, reassignment, or dedicated case route.
- The BFF session contains no provider subject, and none is cached or shown.
- No production deployment configuration or ingress exists.
- The guide uses synthetic BFF responses; no live OIDC or database-backed
  browser guide environment exists. Pages publication requires repository
  settings and a successful `main` workflow run; neither a live deployment nor
  its public URL has been verified locally.
- The Console's extended run history and outcome-proof response is covered by
  synthetic browser fixtures here. Backend `main` now returns those fields;
  cross-repository live-browser compatibility has not yet been verified.
- Source-observation inspection and comparison are local to the current
  authorized Console response. They do not create claim nodes, contradiction
  edges, a graph, evidence editing, or a source-fetch command.
- No `/internal/v1` endpoint is treated as a supported browser contract.
- Assigned-run reads require Ergon core's assigned-only BFF and an immutable
  assignment created by a separately authorized machine integration. This UI
  cannot create or change that assignment. It has no automatic polling or
  continuous revocation guarantee. The active-run Console does not receive case
  evidence, ordered execution events, measured spans/costs, approval decisions,
  or proof checks. Its terminal state label reports backend state, not
  independent verification. Real session-to-PostgreSQL browser compatibility
  remains unverified by the synthetic guide.
- No requester, widget, or native placeholder has been created.
- React Hook Form and Motion are deferred until their first behavior needs them.

Future resolver slices must use reviewed browser contracts for priority,
reassignment, completion, or resolution. Existing `/internal/v1` routes remain
ineligible for production UI use.
