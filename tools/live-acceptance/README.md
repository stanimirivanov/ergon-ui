# Live OIDC acceptance

This gate starts both built UI applications and two separately configured
control-plane processes, backed by one disposable PostgreSQL database and a
disposable Keycloak realm. Chromium uses distinct HTTPS origins and real
authorization-code redirects. The TLS proxy forwards only browser paths to the
backend. Fixture registration uses the backend loopback address directly.

Use Node 24, the workspace pnpm version, Java 25, OpenSSL, Docker, and Playwright
Chromium. Check out the backend commit in `revisions.json` in a clean checkout
and package it from that checkout:

```sh
./mvnw -B -ntp -pl control-plane -am -Dmaven.test.skip=true package
```

From the UI checkout, run `pnpm live:check`. It defaults to a sibling backend
checkout. Set `ERGON_LIVE_BACKEND` to select another location. The harness owns
loopback ports 4300–4301, 4440–4441, 15432, 18080, and 18090–18091, so run one
instance per host. Both `workbench.localhost` and `requester.localhost` must
resolve to IPv4 loopback. The CI workflow supplies these host entries. It generates a temporary certificate and imports disposable
identities. The test browser accepts this certificate for the local run.

The promotion fixture is synthetic and derived from the pinned backend's
`SuiteHarness` sample. Its exact material and manifest digests are checked by
the backend at registration. The harness publishes the contract, registers the
fixture, policy and suite, binds the suite, and executes an evaluation through
existing internal APIs. Only the resulting public report coordinates enter
the browser test. Do not use production credentials or data.

The live workflow records both revisions and runs separately from the normal
UI verification workflow. Changes in the backend repository do not trigger
this workflow. To test a new pair, update the backend pin in a UI PR and run
both workflows. Browser traces and authenticated storage are not uploaded.
