# ADR 0008: Render failed execution and retry handoff

- Status: Accepted
- Date: 2026-09-26
- Milestone: M05 - Human follow-up and resolver console

## TL;DR

Require the owner-scoped case summary's failed-execution and escalation facts,
validate their relationship to the run and work item before caching, and render
one plain-language automation-handoff panel without exposing internal provider
or authority identifiers.

## Context

The first owned case-context slice shows observations, contract identity, and
the escalated run, but it cannot explain which connector failed or why automated
recovery stopped. Core ADR 0041 adds `failedExecution` and `escalation` objects
to the same confidential-BFF response. Those objects deliberately omit provider
operation references, authorization records, idempotency keys, resolver
identity, and authority evidence.

These facts are required to interpret the handoff rather than optional
decoration. Caching a partial or contradictory response could mislead a resolver
about which attempt failed or whether the retry ceiling was actually reached.

## Decision

- Make both objects required in the Effect schema before RTK Query can cache the
  case summary. Accept only a `FAILED` execution outcome and positive integral
  attempt values.
- Require the escalation source attempt to equal the run attempt and to meet or
  exceed the stated maximum. Require the escalation instant to equal the
  follow-up opening instant and not predate connector completion.
- Render the connector, human-readable failed result, completion time, retry
  policy, attempt ceiling, and escalation time in one semantic handoff section.
  State the causal sequence in text so color and layout are not the only cues.
- Continue using the existing lazy query and tenant/work-item cache key. Do not
  create another request, cache, route, or persistent selection.
- Deploy the control-plane contract from core ADR 0041 before this UI version.
  An older or malformed response fails closed as invalid rather than showing a
  partial explanation.

## Consequences

Resolvers can see why automation stopped while reviewing the evidence that led
to the same run. Cross-field checks keep malformed handoff data out of the UI,
and all timestamps remain machine-readable `<time>` values.

The UI now requires the additive core fields, so rollback or mixed-version
deployment must preserve backend-first ordering. The view still does not show
provider error payloads, provider operation references, complete run history,
approval history, or lifecycle commands.

## Alternatives considered

- **Show only the connector and `FAILED` badge:** rejected because it does not
  explain why recovery ended or which attempt reached the ceiling.
- **Treat the new fields as optional:** rejected because a partial handoff can
  look authoritative while omitting the decision that caused human work.
- **Add a separate execution-history query:** rejected because the BFF already
  returns the exact authoritative receipt and escalation for this handoff.
- **Expose raw provider diagnostics:** rejected because they are not part of the
  reviewed browser contract and may contain sensitive implementation detail.
