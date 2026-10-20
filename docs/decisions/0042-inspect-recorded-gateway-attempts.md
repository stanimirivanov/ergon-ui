# ADR 0042: Inspect recorded gateway attempts

- Status: Accepted
- Date: 2026-10-20
- Milestone: M04 - Guarded Execution and Verification

## TL;DR

Inspect partial gateway audit explicitly under fresh supervisor access. Preserve
uncertainty and exact timing without inventing dispatch, causal traces or proof.

## Context

Merged Ergon PR #178/backend ADR 0060 adds protected preparations and measured
completions. Browser admissions prove neither provider calls nor outcomes; the
winning receipt describes only one terminal caller. The standing approved
disclosure policy permits current supervisors to inspect recorded gateway facts.

## Decision

- Existing run-supervision data access owns strict decoding, bounded Effect GET,
  safe failures and RTK lifecycle. Feature owns the complete inspector, copy and
  opening intent. App shell and ui-web modality retain their owners. No package,
  dependency edge, application core, second cache or Redux slice is introduced.
- Inspect only on explicit opening beneath the fresh exact Console gate, keyed
  by tenant/run/expected epoch. Each reopening/recheck requires a distinct read,
  waiting for older pending exact-key work without aborting another subscriber.
  The expected epoch stays local; no lease, CSRF, command or polling is added.
- Validate safe expected epoch, UTC observations, bounded entries, explicit
  null completion and non-null measured timing. Preserve canonical signed-Long
  nanosecond strings; decimal presentation never coerces through Number. Strip
  unconsumed fields before caching. Reject the whole malformed observation.
- Preserve returned order, including wall-clock backsteps, without causal
  validation, deduplication, admission correlation or receipt attribution.
  Preparation does not prove dispatch. Null completion means no completion
  recorded, never live work, no effect or zero duration. UNKNOWN means a thrown
  call with unresolved effects, not a terminal provider failure or retry permit.
- Gateway success/failure are reported results, not current state or independent
  proof. Concurrent samples stay separate; no sum, cost or call count is inferred.
  Historical/older-writer coverage is partial even without truncation; empty
  never proves absent calls/effects. Truncation is 100 entries plus more records,
  not a total or stable cross-read prefix.
- Pending rechecks hide prior rows. Failed protected access, malformed data or
  unavailable observations use the existing shared inspection barrier before
  paint: retire private Console/discovery/modal, retain only safe feedback, and
  focus the persistent execution heading. Explicit recovery reacquires parent
  gates before another inspection. Late retired responses cannot invoke it.
- Unknown missing-route/method responses remain unsupported compatibility,
  distinct from supported empty coverage or recognized neutral private denial.
  Unsupported stays local under the independent successful parent gate. Reuse
  admission history's identical audit-failure mapper; no internal fallback exists.
- The existing modal owns focus containment, Escape, explicit return focus and
  viewport allocation. Parent withdrawal retires it completely. Facts wrap at
  narrow widths and remain plain React text, without raw HTML or diagnostic logs.

## Consequences

Supervisors gain useful per-caller measurements and uncertainty without command
authority or fabricated execution trees. Terminal/cross-epoch/internal activity
can be read under current supervision, but no actor, replay coordinate, grant,
fence, provider reference, payload or cause is disclosed. Authority is checked
at observation time, not continuously or atomically with every parent query.

Deploy the merged backend/schema first. UI rollback removes only presentation;
no storage migration, flag change or command semantics are introduced. Protocol,
cache, feature and Chromium regressions plus a substantial twenty-first simulated
guide cover decoding, disclosure, retirement, focus and reflow. Synthetic fixtures
do not certify live identity, PostgreSQL or provider safety. General trace graphs,
cost, retention/export, backfill and new execution/recovery policy remain deferred.

## Alternatives considered

- Attach the winning receipt to every admission/preparation: rejected because it
  fabricates per-caller attribution and collapses uncertainty.
- Infer running status or durations from wall times: rejected because preparation
  may precede a crash and UTC observations can backstep.
- Preload or permanently cache history: rejected because optional private access
  requires explicit fresh observation and retirement.
- Add a new application core, generic audit framework or modal primitive: rejected;
  current consumed owners already provide these responsibilities.
