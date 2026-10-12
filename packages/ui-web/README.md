# `@ergon/ui-web`

## TL;DR

This package owns Ergon's reviewed web primitives, semantic Tailwind tokens,
and DOM-specific interaction behavior. It is not platform-neutral and must not
be imported by future shared or native packages.

## Ownership rules

- Keep primitives independent of routes, API calls, authentication, Redux, and
  domain workflows.
- Review shadcn-generated source as normal authored code.
- Prefer accessible HTML behavior before styling or animation.
- Add a variant only when it represents stable UI meaning.
- Test through roles, names, keyboard behavior, and observable state.

`WorkspaceView` and `WorkspaceRenderer` are presentation-only composition types:
capabilities derive mode/status/toolbar/content directly; the app owns chrome.
They carry no resource cache, authority decision or mirrored state.
`ThreePaneLayout` allocates named leading/primary/trailing slots in reading order,
stacking below desktop width. Features supply semantic landmarks and pane content;
the app supplies outer spacing and viewport space. No header height is assumed.
Desktop slots scroll within the actual available space, with a usable minimum
that prevents tall context headers from collapsing them. The outer shell scrolls
when a short viewport cannot fit that minimum; narrow content flows.
Features supply descriptive viewport labels. Each viewport is a focusable group
with a visible focus indicator, so panes with no controls remain keyboard-scrollable
without adding domain landmarks or relying on browser-specific automatic focus.

Add components from an app directory so the shadcn CLI can resolve the
monorepo `components.json` files, then review every generated dependency and
source change.
