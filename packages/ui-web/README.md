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

Add components from an application directory so the shadcn CLI can resolve the
monorepo `components.json` files, then review every generated dependency and
source change.
