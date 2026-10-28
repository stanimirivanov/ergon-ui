# M05 local sign-out delivery

## TL;DR

Preserve M05-PR28 and its M03 milestone ownership, but deliver two independently
usable vertical slices after merged backend PR #228. Requester and workbench have
different store/CSRF lifetimes and pixel scopes. Wait for each review/merge.

PR28a is merged as UI PR #231. PR28b is implemented under
[issue #232](https://github.com/stanimirivanov/ergon-ui/issues/232); heavy CI
browser, pinned pixel comparison and recorded-guide artifact review remain
pending at delivery. Neither slice changes server authority or session policy.

## Sequence and boundaries

| Slice                                                                      | Outcome                                                                                                                                                                | Depends on         |
| :------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------- |
| PR28a, [issue #230](https://github.com/stanimirivanov/ergon-ui/issues/230) | Requester confirmation, closed exit gate, private transport/cache/draft retirement, explicit uncertainty recovery and guide                                            | Backend PR #228    |
| PR28b                                                                      | Workbench sign-out, removal/retirement of its singleton store and shared CSRF lifetime, all Console/notification resource cleanup, reviewed visual baselines and guide | PR28a review/merge |

PR28a immediately consumes the session protocol/feature owners in requester
intake, progress and notifications; it adds no unused workbench interfaces or
placeholder controls. PR28b must inspect all active RTK resources, private modal
and control-lease callbacks rather than treating DOM removal alone as retirement.
Keep domain capabilities independent and reuse the existing bounded session
protocol, not a generic command framework.

## Verification and exclusions

Run focused units, local compilation/lint/format and repository/architecture gates.
Heavy Playwright, pinned Console comparison and recorded guide generation run on
CI under the current workflow. Each slice updates its useful executable guide;
pixel changes require actual pinned-renderer capture/review, never weakened
thresholds or masks. No provider/global revocation, cross-tab synchronization,
persistent recovery, accepted-write cancellation or implicit lease release.
See [ADR 0056](../../decisions/0056-retire-requester-private-state-on-local-sign-out.md).
Workbench ownership and retirement are recorded in
[ADR 0057](../../decisions/0057-retire-workbench-private-session-on-sign-out.md).
