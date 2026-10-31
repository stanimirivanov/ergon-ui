# ADR 0061: Confirm reviewed contract promotion

- Status: Accepted
- Date: 2026-10-31
- Milestone: M07 - Simulation and Promotion

## TL;DR

Extend Simulation Lab with explicit eligibility review and acknowledged promotion,
using PR12's browser contracts and one mounted exact command for uncertain recovery.

## Context

PR13 exposes historical reports. PR14 needs promotion without treating report
success or a disabled button as authority. Dedicated EVALUATION_VIEWER and
CONTRACT_PROMOTER, revocation and current suite-binding enforcement are already
backend policy. This slice consumes those policies without changing them.

## Decision

Evaluation/model owns exact review, command and receipt values. Existing evaluation
data access owns strict schemas, invocation-local CSRF, bounded Effect execution
and RTK mutations; feature owns React Hook Form input and acknowledgement/recovery.
Workbench owns navigation and private-store retirement. No new package, capability
edge, application layer, persistent browser state or external library is added.
React Hook Form and react-dom reuse versions already pinned in the workspace.

Enter a contract key, trimmed rationale and a JSON array of exact report references
(fixture key/revision/digest, report UUID and report digest). This bounded explicit
composer supports multiple required scenarios without inventing a report catalog
or automatically selecting passing evidence. Review POST derives the governing
contract, suite, policy and binding version on the server. Validate response
correspondence and show global and per-scenario eligibility. Only eligible reviews
offer acknowledgement and confirmation. Review is advisory, never permission.

Confirmation withdraws review before I/O, captures one UUID and the entire reviewed
intent, and sends the existing strict promotion command document. Duplicate clicks
are fenced synchronously. CSRF is acquired afresh for each review, confirmation and
explicit replay. Commands are never automatically retried. Uncertain transport,
timeout, server failure or malformed acknowledgement retains only the mounted exact
command for explicit replay. Stale, denied, invalid and authentication failures
withdraw recovery; cancel, navigation, tenant change and sign-out retire requests,
mutations and mounted intent. A recovered receipt retains the original timestamp.
A browser cancellation cannot undo a command already accepted by the backend.

Review and confirmation use the established five-second/two-MiB execution boundary
and a 128-KiB request bound. Safe failures omit raw diagnostics. Reuse PR13's safe
integer limitation for binding versions. Confirmation checks receipt identity,
contract/suite and binding version. All text stays inert; exact digests wrap at
320 pixels, labels and status messages support keyboard and assistive technology.

## Consequences

Deploy backend PR12 before enabling this UI. No migration is needed. UI rollback
removes the composer while retaining immutable backend promotions. This view has
no persistent command journal or promotion discovery: leaving an uncertain command
requires authorized operational reconciliation rather than assuming it failed.

The simulated guide covers acknowledgement and exact recovery; it does not certify
a live backend, identity provider or production deployment. Permission management,
automatic promotion, fixture authoring and bypassing failed gates remain excluded.
Tests cover malformed/mismatched projection, CSRF denial, stale and denied commands,
cancellation, uncertain replay, narrow reflow and accessibility. No existing visual
baseline is changed by the composer; pinned comparison remains a required gate.

## Alternatives considered

Automatically choosing successful reports obscures exact evidence and suite
completeness. Persisting recovery state expands the browser confidentiality and
session boundary. A new application package would merely forward commands. These
are deferred; explicit mounted intent follows established reviewed-write patterns.
