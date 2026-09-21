# Security policy

## TL;DR

- Do not disclose suspected vulnerabilities in public issues or pull requests.
- Prefer GitHub private vulnerability reporting.
- Ergon UI is pre-release; only the current default branch receives fixes.
- Treat everything shipped to a browser as public and all remote content as
  untrusted.

## Supported versions

Ergon UI has no supported production release. Security fixes target the current
default branch. Before the first release, this section must become an explicit
supported-version and end-of-support table.

## Reporting a vulnerability

Use the repository Security page's **Report a vulnerability** action when
available. Otherwise request a private contact without naming the component,
exploit, affected data, or reproduction publicly.

Include the affected revision and configuration, impact, required conditions,
a minimal reproduction, redacted logs, mitigations, and disclosure plans. Do
not retain, alter, or disclose data beyond what an authorized test requires.

## UI security expectations

Changes affecting authentication, authorization, tenant isolation, tokens,
browser storage, raw content rendering, dependencies, CSP, telemetry, or
runtime configuration require focused review and a stated failure model.

Never commit credentials; expose secrets through Vite configuration; persist
tokens, authority evidence, or case payloads in local storage; authorize from a
tenant URL; or inject raw model, evidence, or Markdown HTML. Production browser
code must not depend on Ergon's `/internal/v1` development endpoints.

The workbench authenticates through the same-origin confidential BFF. Provider
tokens and OIDC client secrets must remain server-side. Treat problem-document
redirect fields as untrusted input, retain Secure and HttpOnly session-cookie
settings, and introduce no mutating BFF call without a reviewed CSRF contract.

Follow [AGENTS.md](AGENTS.md), [CONTRIBUTING.md](CONTRIBUTING.md), and the
[engineering standards](docs/development/engineering-standards.md).
