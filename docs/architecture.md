# Ergon UI architecture

## TL;DR

Use one Nx and pnpm repository for independently deployable user experiences.
Begin with the internal workbench. Add the external requester application only
with its first usable slice. Share contracts deliberately while keeping web UI,
native UI, application state, and authentication adapters platform-specific.

## Application topology

| Deployable        | Audience and responsibility                                        | Status                                                   |
| :---------------- | :----------------------------------------------------------------- | :------------------------------------------------------- |
| `ergon-workbench` | Authenticated resolver console; later studio and simulation routes | Follow-up handling and assigned-run snapshot supervision |
| `ergon-requester` | External adaptive resolution canvas                                | Deferred to first requester slice                        |
| widget SDK        | Embeddable headless client and web components                      | Deferred                                                 |
| native clients    | Selected requester or resolver workflows                           | Deferred until required                                  |

The workbench and requester experience use distinct deployment artifacts,
identity clients, CSPs, URLs, performance budgets, and release decisions. Studio
and simulation begin as workbench route areas because they share the internal
trust boundary; split them only for demonstrated isolation or ownership needs.

## Project roles and dependency direction

Projects are grouped by business capability and concrete frontend
responsibility. A capability gains a hexagonal application core only when the
client owns executable, platform-neutral workflow policy. Cache-centric slices
may deliberately connect a feature directly to data access.

| Source type | May depend on                                |
| :---------- | :------------------------------------------- |
| Model       | Model                                        |
| Application | Application, model                           |
| Data access | Data access, application, model              |
| Feature     | Data access, application, model, UI          |
| UI          | UI                                           |
| App         | Feature, data access, application, model, UI |
| Test        | Any type required by the tested behavior     |

Scope and platform constraints apply independently. Shared-platform code cannot
import web or native projects. `@ergon/ui-web` is a domain-agnostic DOM,
Tailwind, and shadcn boundary; it is not a React Native design system.

Each project has exactly one `type:*`, `scope:*`, and `platform:*` tag. The
architecture check validates package names against capability paths, metadata,
and declared workspace dependencies; ESLint validates source imports. The
intended capability-first shape is:

```text
@ergon/workbench (app)
  -> follow-up/feature-web
      -> follow-up/data-access-web
      -> follow-up/model
      -> ui-web
  -> session/feature-web
      -> session/data-access-web
      -> session/model
      -> ui-web
  -> run-supervision/feature-web
      -> run-supervision/data-access-web
      -> ui-web
```

An optional application project sits between feature and data access only for
a genuine client-owned use case:

```text
feature -> application use case -> consumed port <- data-access implementation
```

The follow-up and session model, web data-access, and web feature projects now
live under their capability paths. Follow-up packages use
`@ergon/follow-up-model`, `@ergon/follow-up-data-access-web`, and
`@ergon/follow-up-feature-web`; session packages use
`@ergon/session-model`, `@ergon/session-data-access-web`, and
`@ergon/session-feature-web`.

The now-empty legacy-location ledger in the architecture checker rejects new
projects under the old global-layer directories. Moving each listed project
removed its exception in the same change.

The workbench remains the app composition root. It registers the RTK Query
reducers and middleware, supplies runtime dependencies, owns route hierarchy
and shell, and provides trusted same-origin navigation inputs. The session
feature validates the tenant route value and gates authenticated content until
the BFF verifies the actor. The follow-up feature owns the workspace
introduction, its work views, and local selection of an exact owned claim for
the read-only Console. Follow-up and session data access own BFF
protocols, Effect execution, typed failure translation, timeout, retry,
cancellation, cache identity, and generated hooks.

Follow-up and session request, cancellation, result, and failure contracts
belong to their web data-access projects. Neither capability currently has a
client-owned application use case. Model and genuine application library builds
extend the checked, DOM-free `tsconfig.core.json`.

Run supervision is independent of follow-up claims. Its web data-access project
owns the assigned discovery and exact run-detail BFF contracts; its web feature
owns the three-pane snapshot Console. Neither imports session or follow-up
capabilities. The app supplies a display-only actor slot and a trusted sign-in
link after session verification. No model or application project is introduced
because this slice has no separate platform-neutral client policy.

## State ownership

Internal follow-up notes consume the owner-scoped browser contract introduced
by Ergon PR #186. The follow-up model owns inert values and exact-text semantics;
data access owns bounded decoding, shared session CSRF, safe append outcomes and
fresh RTK history gates keyed by tenant/work/claim/revision. Feature owns lazy
inspection, RHF drafts and immutable uncertain intent. A receipt refreshes history,
never case proof or ownership. Modal and shell owners are unchanged; access denial
withdraws case context until explicit ownership recovery. ADR 0025's acquisition
and retirement policy applies without a new package or application layer.

Browser control now uses fresh private status and explicit lifecycle commands in
existing supervision data access. Feature owns advisory monotonic countdown and
immutable confirmation/replay fences, not another remote cache. Every existing
browser command captures its fence once; exact replay never acquires or renews.
Only explicit DISABLED preserves rollout-off behavior. Missing/failed status
blocks new commands and denial withdraws detail. The app and ui-web retain shell
and modal ownership. See [ADR 0039](decisions/0039-coordinate-explicit-fenced-browser-control.md).

Exhausted-run escalation uses a separate fresh private RTK review and the same
confirmed-command barrier. Data access owns exact exhaustion/receipt validation,
session-CSRF execution and safe outcomes. Feature owns acknowledged confirmation,
immutable replay intent and historical creation feedback. Success retains only
run selection identity before fresh discovery/detail, not a resource snapshot.
OPEN means original work creation, never current status or ownership. Existing
app navigation opens independent follow-up discovery; no receipt-based claim or
private case access is added. No project or dependency edge changes. See
[ADR 0037](decisions/0037-confirm-exhausted-run-escalation-and-fresh-follow-up-access.md).

Failed-run retry uses a fresh private RTK review and the existing committed
command barrier. Data access validates exact plan/budget/receipt coordinates;
the feature owns acknowledged confirmation, immutable intent and historical
feedback. Receipt success selects only the successor ID and opens fresh
discovery/detail gates; it never copies predecessor facts or confers current
successor access. Execution requirements are evaluated independently. No new
project, dependency edge or cache is added. See
[ADR 0036](decisions/0036-confirm-failed-run-retry-and-fresh-successor-access.md).

Execution review is an explicitly acquired private RTK resource in the existing
run-supervision API, not a Console copy or a lasting authorization token.
Data access owns exact HTTP/identity/status decoding, invocation-local CSRF and
bounded no-retry commands. The feature owns acknowledged execute/recover forms,
immutable intent, historical feedback and the existing committed disclosure
barrier. An admitted identity only acknowledges status; an unadmitted identity
may first admit its original confirmed intent on retry. An additional confirmed attempt
targets the original reservation. Superseded command feedback retires on new
intent. No project or dependency edge changes. See
[ADR 0035](decisions/0035-confirm-capability-execution-and-recovery.md).

Outcome verification stays in the existing protected RTK Console resource.
Data access owns status-specific decoding, exact post-action attribution and
state/receipt/acceptance consistency. Feature owns the single-condition section
and keyed inspector; ui-web owns modality. No new dependency edge is added. See
[ADR 0033](decisions/0033-inspect-outcome-verification-and-accepted-proof.md).

The assigned Console separates investigation inputs from outcome proof. A leading
column composes discovery and a dedicated Case evidence section; execution remains
central and verification/recorded state remain trailing. Persistent heading refs
support focus-only navigation even while private facts are withheld. Moving input
presentation does not broaden disclosure or turn pinned bindings into proof.

The central pane orchestrates execution-first sections: a dedicated feature
component owns recorded execution presentation, followed by existing command
controls, supporting inspectors and attempt relationships. Named sections
communicate their different purposes without new tabs, local resource copies or
automatic reads. All remain beneath the same private-detail gate. Moving their
presentation adds no dependency edge or command/inspection authority.

Four current supporting inspectors consume feature-local launch-row framing.
The framing receives purpose, action and unavailable feedback, and renders only
the modal children explicitly supplied by each inspector. Trigger refs, exact
query coordinates, lazy reads, typed failures and open/close lifetime stay with
their original owners. Shared presentation does not introduce a generic workflow,
resource cache, authority policy, dependency edge or package API.

The feature's compact supervision bar retains status/countdown/action ownership
in the existing presence and control components. Only static explanations use
native local disclosures; operational status, uncertainty and recovery stay
outside them. The shell allocates space from actual collapsed/expanded height,
not a fixed header estimate. No callback, request, cache or authority state is
introduced by explanation toggles; countdown ticks remain local to control.

The assigned Console's optional pinned-evidence projection stays in its existing
RTK resource and disclosure lifetime. Run-supervision data access validates the
exact case/pinned boundary and binding/source relationships; its feature owns
history presentation and ephemeral keyed source inspection. No new production
project or dependency edge is introduced. The guide's producer-owned fixture
types require an explicit test-project dependency on supervision data access.
See [ADR 0032](decisions/0032-inspect-supervisor-scoped-pinned-evidence.md).

| State                                                            | Owner               |
| :--------------------------------------------------------------- | :------------------ |
| Remote resources, request lifecycle, deduplication, invalidation | RTK Query           |
| Cross-route client-only state                                    | Redux Toolkit slice |
| Shareable filters and navigation state                           | React Router URL    |
| Form values, field errors, touched state                         | React Hook Form     |
| Private case selection and component-local interaction           | React state         |
| HTTP execution, decoding, timeout, typed failure mapping         | Effect              |

RTK Query and Effect were introduced by current-actor resolution. Effect
executes inside RTK Query's endpoint `queryFn`; it does not create another
remote cache. RTK Query cancellation interrupts the Effect program. Automatic
retries apply only to classified transient reads or mutations whose idempotency
contract permits replay.

The resolver queue filter is shareable URL state. Keyset page traversal remains
component-local while each requested page is cached by RTK Query; the UI keeps
the cursor timestamp and work-item ID together as one immutable value. Claim
success and stale-item conflicts invalidate every cached inbox page for that
tenant rather than attempting to repair filtered keyset pages optimistically.
The BFF supplies ownership revisions on inbox and owned rows. Data access
validates their availability parity and decodes revision-checked claim command
receipts; the feature retains a command ID across an explicit ambiguous-result
retry. A stale revision refreshes the inbox instead of guessing current state.
Release from either an active-work card or the selected Console uses the same
feature-owned confirmation and session-bound CSRF client with an exact active
claim and revision. The owned feature closes Console case context before the
POST, and the receipt is checked before success. Success revalidates both work
views and that item's case-context cache. Release returns still-open work to
its original shared queue; it is neither direct handover nor case completion.
Availability remains a backend rollout decision.

Direct follow-up handover is a separate explicit confirmation. RHF owns the
recipient UUID and acknowledgement; the feature captures one immutable command
tuple and commits private-context withdrawal before its effect sends the POST.
Shared data access owns CSRF, bounded execution, exact receipt validation and
safe failure normalization. Uncertain recovery resends only that original tuple.
Historical acknowledgement does not restore private access: explicit owned-work
recovery and a fresh case-summary gate are required. RTK remains the sole remote
resource owner; local state contains phase/intent/history, never copied rows.
This does not transfer run supervision or complete a case.
See [ADR 0045](decisions/0045-confirm-current-owner-follow-up-handover.md).

Terminal administrative completion uses the same discriminated feature
ownership-command controller, with a separate RHF acknowledgement and exact
completion protocol. It retires active work without resolving its case or run.
Receipt recovery survives terminal retirement only under server-enforced
original-actor/current-resolver checks. A receipt never reopens private context;
all outcomes invalidate work and exact context/notes observations. No automatic
POST retry, persistent replay intent or optimistic terminal resource is added.
See [ADR 0046](decisions/0046-confirm-terminal-follow-up-completion.md).

Owned-work pages use a separate tenant-and-cursor cache. Successful claims also
invalidate that cache so active ownership is recovered from server truth; stale
shared-inbox conflicts do not imply a change to the current resolver's claims.
Owned case summaries use the complete tenant, work-item, case, and run request
tuple as their cache identity. They mount only while the exact claim remains
locally selected and the Console is open; closing it evicts private context.
Failed-execution, retry-handoff, ordered attempt, and unassessed proof facts
remain part of that response and cache entry. The feature hides case context
during revalidation, after a failed owned-work refresh, and when the selected
claim is absent or replaced. The URL and persistent storage do not retain this
short-lived resolver context.

Private Console cache hooks own acquisition and subscription retirement, not
presentation. They wait for older exact-key pending reads before a distinct
forced check; cleanup unsubscribes so another active reader is not aborted.
RTK's zero-grace eviction owns last-reader cancellation. Feature controllers
own exact selection identities, committed recheck/release phases, and focus
intent. Committed phases hide evidence before I/O without `flushSync`; rows and
detail remain derived from current RTK state. A workspace slot receives derived
Console mode rather than mirroring it through a callback. The suspended inbox
renders no rows and retains only traversal and immutable claim-retry intent
across that detour. See [ADR 0025](decisions/0025-own-private-console-disclosure-workflows.md).

Assigned runs have a distinct tenant/cursor discovery cache and tenant/run
detail cache. The private run selection is local, while `view=runs` is a
shareable tenant-workbench view name. Closing or switching views evicts unused
detail; reopening rechecks assignment at the BFF. Pending or failed discovery
and detail rechecks hide retained private snapshots. The active list excludes
terminal runs, but an already selected terminal detail may remain visible after
the exact BFF gate succeeds. Discovery membership does not replace that gate.

## Routing and rendering

Pinned-readiness inspection adds an exact-pin private RTK observation in existing
supervision data access, with feature-owned opening/presentation and existing
parent withdrawal, shell and modal owners. Selected provenance reuses the
attributed fact schema and inert source display; no package, dependency edge,
application core or second resource cache is added. The supported evaluator is
explicitly versioned, and fixed-input re-evaluation is not historical planning,
current-case readiness, execution authority or outcome proof. See
[ADR 0044](decisions/0044-inspect-pinned-readiness-and-selected-evidence.md).

Pinned-contract inspection uses existing run-supervision data access for exact
run/epoch/pin decoding, bounded Effect reads and fresh RTK observations. Feature
owns opening intent and declaration presentation; app and ui-web retain shell
and modal/focus ownership. The existing failed-inspection barrier retires private
workspace context. No package, application core, cache or dependency edge is added.
Declared order/safeguards and outcome conditions are not a DAG, effective policy,
readiness or accepted proof. See
[ADR 0043](decisions/0043-inspect-exact-pinned-contract-declarations.md).

Gateway-attempt history uses existing supervision data access for strict bounded
decoding, Effect execution and fresh RTK observations. Feature owns explicit
inspection and uncertainty copy; the shared inspection barrier retires prior
private workspace on failed protected access. App/ui-web retain shell and modal
ownership. No new package, dependency edge or state cache is added. Exact timing
and partial recorded coverage do not establish dispatch, live status, causal
admission links or outcome proof. See
[ADR 0042](decisions/0042-inspect-recorded-gateway-attempts.md).

Direct retry-successor lookup is an explicit private RTK observation under the
ready source Console. Data access validates source/target coordinates; feature
owns opening and identity-only navigation. Null never proves absent retry.
Following and returning each acquire fresh exact access, including terminal
work outside discovery. Admission history and successor lookup share the same
failed-inspection disclosure barrier and persistent recovery focus target.
Neither observation is retained as authority. See
[ADR 0041](decisions/0041-recover-independently-visible-retry-successors.md).

Run supervision also owns current-epoch recipient reads and confirmed browser
handover. RTK remains the resource owner; React Hook Form owns the transient
recipient and acknowledgement fields. A feature-owned submitting phase retires
discovery/detail and recipient DOM before mutation acquisition, and retains
only exact command intent for an explicit uncertain-result replay. The shared
modal owns focus/inertness and placement. Effect owns invocation-local CSRF,
the bounded POST and receipt decoding; no transfer retries automatically.
A failed candidate read withdraws the earlier private run snapshot and dialog.
Fresh recovery is required; no command was created or offered for replay.
Historical receipts do not substitute for current supervision. Handover itself
adds no self-assignment, lease transfer, execution permission or persistent directory.
See [ADR 0030](decisions/0030-confirm-revisioned-supervisor-handover.md).

Both Consoles use one app-owned standard/focused shell composed directly from
the capability workflow's `WorkspaceView`. The app owns branding, navigation,
landmarks, dark token scope and viewport allocation; features supply cohesive
toolbars and pane sections. `ThreePaneLayout` has named leading/primary/trailing
slots, not sibling fragments that implicitly complete a parent grid. Actual
header/toolbar heights determine remaining desktop space; narrow layouts stack.
Loading/failure states retain all panes without retained private facts.
The session gate's unverified renderer supplies the standard shell; its verified
renderer supplies the complete workspace. See [ADR 0026](decisions/0026-compose-console-shell-and-named-panes.md).

The browser applications are Vite-built React SPAs using React Router Data
Mode. Route definitions own hierarchy, lazy boundaries, parameters, and error
pages. RTK Query, once introduced, owns API data; route loaders must not create
a second cache for the same resource.

The selected Resolver Console is a local work surface within the existing
tenant route, not a durable case route. Its three panes render recorded
observations, durable failed-attempt history, and the pinned but unassessed
outcome condition. Its presence bar reflects the currently owned claim and
offers only the existing confirmed release action. It does not infer a timed
lease, countdown, verified claims, a live trace, approval decisions, direct
handover, or completed verification from this read model.

The assigned-run Console is a separate snapshot work surface in the same
tenant route. It presents the immutable run start, pinned capability policy,
and latest server-recorded state. Rechecking the selected run refreshes exact
detail; rechecking assignments refreshes discovery, then rereads selected detail
after successful discovery. There is no automatic polling or live-monitoring promise.
Its immediate predecessor control reads only the relationship already disclosed
by that current run. The feature workflow keeps one ephemeral return identity,
never a resource copy or inherited authority, and selects either run through the
existing fresh exact-run gate. Neutral absence stays neutral. Ordinary selection,
close, reset and tenant change discard the return target; route/storage contracts
and backend authorization are unchanged. The persistent pane heading owns focus
while replacing or withholding an attempt. No complete retry tree is inferred.
Pinned evidence and narrowly selected post-action proof are now supplied;
multi-step execution remains absent. Human approval review
is a separate optional member of this same protected resource, not inferred
from its pinned policy requirement.
The additive terminal receipt supplies one pinned capability's connector result
and optional gateway-call measurement. Data access decodes exact attribution,
compatibility absence and canonical nanosecond strings; a dedicated feature
section renders exact milliseconds and provenance without another cache,
application core or live timer. Receipt persistence, run-state projection and
outcome proof stay distinct. Private timing withdraws with the same fresh-read
gate. See [ADR 0023](decisions/0023-consume-assigned-run-console-snapshots.md) and
[ADR 0028](decisions/0028-render-attributed-capability-execution.md).

The static artifact reads only public runtime configuration. Secrets never
enter JavaScript bundles. The workbench consumes the confidential BFF through
same-origin `/bff`, `/oauth2`, and `/login/oauth2` paths; local Vite development
proxies those paths to the control plane. Provider tokens remain server-side.
Session-bound CSRF values exist only in the in-memory HTTP client and never in
Redux, a URL, or persistent browser storage.

## API and trust boundary

Untouched-run cancellation stays in the existing supervision data-access and
feature owners. Fresh advisory review, acknowledged intent and exact receipt
decoding use the committed command barrier; no automatic POST retry or new
state owner is added. CANCELLED/RUN_CANCELLED is a terminal path without a
capability receipt. Success reacquires independently authorized terminal detail
even outside active discovery. History grants neither access nor outcome proof;
provider work and case closure are not cancellation semantics. See
[ADR 0038](decisions/0038-confirm-untouched-run-cancellation.md).

OpenAPI and RFC 9457 problem responses are wire contracts. Static TypeScript
types do not validate remote data; each consumed payload must be decoded before
entering application state. Tagged UI errors distinguish authentication,
authorization, absence, conflict, invalid input, timeout, network failure,
invalid response, and unexpected defects.

Cache integration catches client and binding defects before framework logging or
serialization, returning only `unexpected-defect`. Capability-owned normalizers
copy recognized fields and validate status-bearing failures; they do not treat
unknown errors as invalid responses. Expected cancellation is distinct, and a
concurrent abort does not make a caught defect safe to classify as cancellation.
Mutations remain uncertain after a defect and retain their exact explicit replay
intent. Pending/failed session rechecks outrank a retained actor response. See
[ADR 0024](decisions/0024-contain-client-defects-at-cache-boundaries.md).

Owned-work pages are structurally decoded before the follow-up model checks
that each claim belongs to its paired work item. Owned case context is a
read-only confidential-BFF projection. Data access checks response identity
against the request and decodes the wire shape. The model then refines positive
revisions, pinned-contract consistency, evidence bounds, observation order,
and the failed-execution-to-escalation sequence before the browser caches it.
Evidence text remains untrusted content and is rendered only through React
text nodes.

Observation inspection retains only local timing and exact source identities.
Dedicated feature sections render the current authorized list, detail and
comparison; unavailable identities cannot resurrect old inspection intent.
The ui-web native modal owns platform lifecycle, keyboard containment, initial
focus and placement. Explicit dismissal restores a live invoking control
synchronously; teardown does not schedule focus or invoke feature dismissal.
The enclosing disclosure workflow owns focus after access withdrawal. See
[ADR 0027](decisions/0027-own-inspection-modal-lifecycle-in-ui-primitives.md).

A tenant selected in the URL is navigation context only. The backend remains
authoritative for subject mapping, authority evidence, tenant isolation, and
non-disclosure. The production UI does not consume `/internal/v1` routes; a
slice must first establish a reviewed browser-facing endpoint.

## Presentation

Approval review/decisions use the existing run-supervision capability. Data
access owns optional lifecycle decoding, exact receipt attribution, session-CSRF
execution, safe failure normalization and RTK mutation invalidation. Feature
owns the dedicated review card, acknowledged RHF modal and immutable command
intent; ui-web still owns focus/inertness and app still owns shell composition.
The shared, consumed command controller and HTTP executor preserve handover's
existing mechanics without adding a core, package, cache or dependency edge.
All private run/candidate disclosure is suspended before a decision POST.
Only exact replay is offered for uncertain results; definite conflicts require
fresh facts. Success resets selection and rechecks assigned work. A historical
decision is not current supervision, a grant, execution, resumption or proof.
See [ADR 0031](decisions/0031-confirm-human-approval-prerequisites.md).

Assigned-run history is another member of the same protected RTK projection,
not a second resource owner. Data access validates its immutable prefix against
the state revision, final update and terminal receipt before caching. The
feature renders append order and distinct occurrence/recording observations;
clock correction does not reorder events or supply latency. Missing history
means unsupported; an empty revision-zero prefix means no projected event.
The existing fresh-read gate withdraws the whole section. Recorded proof
acceptance is not inspected proof evidence. See
[ADR 0029](decisions/0029-display-sequence-aligned-run-transitions.md).

Tailwind owns utility generation and semantic theme tokens. shadcn source is
checked-in and reviewed in `@ergon/ui-web`. Feature components remain near
their behavior. The selected Console scopes dark semantic tokens to its work
surface without recoloring the unauthenticated or inbox views. Motion is
reserved for transitions that clarify state change and must honor
reduced-motion preferences; CSS handles simple visual feedback.

All slices preserve semantic landmarks, keyboard operation, visible focus,
accessible names, heading order, contrast, zoom, and responsive reflow. Color,
position, and animation are never the only state signal.
