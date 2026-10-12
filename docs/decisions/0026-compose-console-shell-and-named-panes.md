# ADR 0026: Compose the Console shell and named panes explicitly

- Status: Accepted
- Date: 2026-10-11
- Milestone: M05 - Human follow-up and resolver console

## TL;DR

The app owns standard/focused chrome, branding, navigation and viewport allocation.
Capabilities supply their derived mode, toolbar and content through a render slot;
a consumed UI layout allocates three named panes without domain knowledge or
assumed header heights. Private disclosure remains governed by ADR 0025.

## Context

Both redesigned Consoles rendered branded headers inside a standard app frame.
App CSS inferred mode from a feature descendant and hid duplicate chrome. Pane
fragments implicitly completed a parent grid, while viewport calculations guessed
header heights. Wrapping presence controls, loading and failures had no explicit
layout contract. These are ownership and composition defects, not line-count issues.

The session gate also always wrapped verified content in its supplied standard
frame. Changing only the feature shell would retain nested app landmarks.

## Decision

- `WorkspaceView`/`WorkspaceRenderer` in ui-web express presentation only: mode,
  status label, toolbar and content. Capabilities call the renderer synchronously
  from their existing workflow; no callback, context or Redux state mirrors mode.
- The app's `WorkbenchFrame` owns a single banner/home link/main/skip target,
  focused Console heading, cross-capability navigation and standard-only footer.
  Its explicit mode scopes dark semantic tokens. Feature DOM never decides chrome.
- Capability toolbars own claim/assignment caveats and domain controls. They do
  not grant authority; gates decide which current facts may be supplied. The app
  allocates natural header/toolbar rows and remaining space, without subtraction
  of a fixed height. Narrow layouts flow vertically; desktop panes scroll within
  the actual remaining viewport space. A resource-independent usable pane minimum
  prevents tall context headers from collapsing scroll viewports; the outer shell
  scrolls when that minimum cannot fit. This is not a header-height estimate.
- `ThreePaneLayout` requires leading/primary/trailing slots in reading order.
  Features supply descriptive viewport labels; UI-owned focusable groups support
  keyboard scrolling, including panes with no controls, without adding landmarks.
  Features own pane headings, records, typed recovery and withheld-content states.
  All three panes exist while loading or failed; placeholders contain no retained
  private facts. No sibling fragment may implicitly complete another component's grid.
- Keep the owned/inbox content position stable when mode changes. The mounted,
  suspended inbox still retains only traversal and exact uncertain replay intent.
- Before an explicit recheck withdraws its button, the capability focuses a
  stable Back control or pane heading. Pending/failure views do not abandon
  keyboard focus on the document body or ask the app to mirror request phases.
- Recovery actions use the same stable focus boundary before their controls
  disappear. The native skip link preserves the current pathname and search
  before targeting the focusable main; a bare fragment would resolve against
  the document's root base and navigate out of the tenant/capability workspace.
- `CurrentActorBoundary.renderFrame` now composes unverified states only;
  `renderVerified` composes the complete verified workspace. Required workspace
  renderers and removal of the assigned feature's return-navigation prop migrate
  every known app/test consumer together in this pre-release repository.

No HTTP, cache key, command tuple, dependency, package, authority or backend
changes. Session screen design, legacy inbox/cards and inspector modal internals
remain separate work; the session renderer change is a necessary composition seam.

## Consequences

Shell/pane responsibilities are explicit and tested through observable landmarks,
focus, retained mounted intent, held/failing reads and responsive reflow. Desktop
scroll containers must retain keyboard access; width-720 reflow is the CSS layout
equivalent of a 1440-wide viewport at 200% zoom, not browser zoom automation.
Guides retain synthetic BFF facts and must be regenerated after visual changes.

Presentation APIs change deliberately; all local consumers migrate in one slice.
Privacy, exact replay, terminal retention and fresh-read retirement regressions
remain required. This layout does not introduce a lease, trace, approval or proof.

## Alternatives considered

- Mirrored shell-mode callbacks/context: duplicate ownership and commit timing.
- More descendant selectors or height constants: hide the boundary rather than
  make it explicit, and fail when controls wrap.
- Moving the workflow into the app: couples routing/chrome to private selection
  and cache lifecycle.
- A generic workspace engine or mandatory application core: no current behavior
  justifies either; the consumed render/layout contracts are sufficient.
