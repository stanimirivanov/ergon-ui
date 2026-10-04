# ADR 0022: Publish the simulated user guide from main

- Status: Accepted
- Date: 2026-10-04
- Milestone: M05 - Human follow-up and resolver console

## TL;DR

Publish the generated static guide through GitHub Pages only after a successful
`main` workflow run. Keep pull requests as short-lived review artifacts and
label every public chapter as simulated, not operational proof.

## Context

Six executable chapters now cover the implemented resolver-workbench slices.
The generator records only marked synthetic BFF responses, rejects unexpected
network traffic, and assembles a relative-link static book with explicit
simulation notices. CI currently uploads the book for review but offers no
stable reader location. Publication changes deployment topology and makes the
illustrative screenshots, video, and text publicly accessible. GitHub Pages
can be public even when its source repository is private, so the artifact must
contain no live customer, identity, credential, or authority data.

## Decision

- Keep generation and the seven-day review artifact on pull requests, `main`
  pushes, and manual runs. The generation job has only `contents: read`.
- Upload a Pages artifact from `dist/user-guide` only for a successful `main`
  push or manual run on `main`. The publishing job depends on generation and
  repeats the same ref/event guard. It alone receives `pages: write` and
  `id-token: write` and deploys through the protected `github-pages`
  environment. No personal token, deployment secret, or `gh-pages` branch is
  used.
- Require a maintainer to set the repository's Pages source to GitHub Actions
  and review the environment protection rules. The workflow does not enable
  Pages with elevated credentials. A missing setting fails publication rather
  than widening workflow authority.
- Publish only the already validated, explicitly simulated static book. Do
  not call it a live operational guide or infer backend/OIDC verification from
  Playwright fixtures. A later live-data guide needs a separate security and
  publication decision.

## Consequences

Readers can use a stable Pages URL after a successful `main` deployment, while
PRs remain non-publishing. The public site contains synthetic case identifiers
and illustrative resolver actions, and its URL comes from the deployment
output rather than a hard-coded domain. Repository Pages settings and the
environment must be configured outside this code change. Local tests can
verify workflow structure, generated media, and static relative links but
cannot prove a GitHub-hosted deployment before the workflow runs on `main`.

## Alternatives considered

Publishing PR artifacts would expose unreviewed changes and need broader
permissions on untrusted runs. Committing generated files to a `gh-pages`
branch would create another mutable artifact history and require write access
to repository contents. Making the review artifact the only distribution
keeps authority narrow but leaves readers without a stable guide location.
