# M05 requester-response delivery

## TL;DR

M05-PR22 is delivered as three UI PRs after merged Ergon PR #216. Preserve the
parent plan coordinate and milestone, implement one useful slice at a time, and
wait for review/merge between slices. GitHub owns live delivery status.

## Scope and sequence

| Slice                                                                      | Capability                                                                                                                 | Depends on                  |
| :------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------- | :-------------------------- |
| PR22a, [issue #220](https://github.com/stanimirivanov/ergon-ui/issues/220) | Resolver Console inspection of recorded answers, strict decoding, guide and pixels                                         | Backend PR #216, UI PR #219 |
| PR22b, [issue #222](https://github.com/stanimirivanov/ergon-ui/issues/222) | Requester-owned question and answer history within the existing private canvas, with guide and tests                       | PR22a                       |
| PR22c                                                                      | Requester answer form, explicit submission, exact uncertain recovery and independently fresh history, with guide and tests | PR22b                       |

Each is an end-to-end capability, not a file/layer task. PR22b/c get dedicated
issues before implementation; no unused mutation contracts or placeholder controls
are added in PR22a. Core owns the parent M05 catalog; this plan refines PR22 rather
than introducing a UI milestone or renumbering later parent tasks.

## Invariants and boundaries

Models own inert values; data access owns protocols, Effect execution and RTK
resources; features own presentation and form/workflow lifetimes. Apps compose
verified sessions, routes and stores. Keep requester and resolver capabilities
independent; add no interface-only application or generic answer framework.

Question ordering/bounds are unchanged. Omission, null and a recorded answer are
distinct. No retained response grants access. Pending/failed checks withdraw
private text, and late completions retire with their observation. An answer is
untrusted plain text, not delivery, consent, accepted evidence or outcome proof.

No uploads, edits, notifications, observation ingestion, automatic polling or
resolution actions belong here. PR22c must preserve the exact response UUID,
question and text after uncertainty; historical acknowledgement is not current
history. Requester read access survives closure, but new writes/replays require
the backend's OPEN-case authorization. Do not infer authority in the browser.

## Rollout, rollback and verification

Deploy backend PR #216 first. PR22a tolerates older servers without claiming no
answer exists; later requesters must also tolerate mixed-version omission.
UI rollback leaves immutable backend history intact. No browser persistence.

Run focused protocol/cache/component tests, repository and architecture checks,
then `pnpm verify`. Presentation changes require the pinned `pnpm visual:check`
renderer and human pixel review. Update and generate the assertion-backed guide
with each slice using `pnpm guide:generate`; simulations never certify live OIDC
or PostgreSQL authorization. See [ADR 0051](../../decisions/0051-inspect-recorded-requester-answers.md).
