import { execFileSync, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import { createServer } from 'node:https';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const backend = resolve(process.env['ERGON_LIVE_BACKEND'] ?? '../ergon');
const { backendRevision: pin } = JSON.parse(
  readFileSync(new URL('./revisions.json', import.meta.url)),
);
const issuer = 'http://127.0.0.1:18080/realms/ergon-live';
const fixture = JSON.parse(
  readFileSync(new URL('./simulation.json', import.meta.url)),
);
const suite = JSON.parse(
  readFileSync(new URL('./suite.json', import.meta.url)),
);
const policy = JSON.parse(
  readFileSync(new URL('./policy.json', import.meta.url)),
);
const tenant = fixture.manifest.tenantId;
const children = [];
const servers = [];
const containers = [];
const temp = mkdtempSync(join(tmpdir(), 'ergon-live-'));
const password = 'ergon-test-only';
const users = ['requester', 'resolver'].map((username) => ({
  username,
  id: randomUUID(),
}));

function command(file, args, options) {
  return (
    execFileSync(file, args, { encoding: 'utf8', ...options })?.trim() ?? ''
  );
}

function start(file, args, env) {
  const child = spawn(file, args, {
    env: { ...process.env, ...env },
    stdio: 'inherit',
    detached: true,
  });
  children.push(child);
  return child;
}

async function waitFor(label, url, accepts = (status) => status === 200) {
  for (let attempt = 0; attempt < 120; attempt++) {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(1500),
    }).catch(() => undefined);
    if (response) {
      await response.body?.cancel();
      if (accepts(response.status)) return;
    }
    await delay(1000);
  }
  throw new Error(label + ' did not become ready');
}

function container(label, args) {
  const name = 'ergon-live-' + label + '-' + randomUUID();
  containers.push(name);
  command('docker', ['run', '--detach', '--rm', '--name', name, ...args]);
}

function proxy(audience, port, apiPort, uiPort) {
  const host = audience + '.localhost:' + port;
  const server = createServer(
    {
      key: readFileSync(join(temp, 'key.pem')),
      cert: readFileSync(join(temp, 'cert.pem')),
    },
    (incoming, outgoing) => {
      const path = new URL(incoming.url, 'https://' + host).pathname;
      if (path.startsWith('/internal/') || path.startsWith('/api/')) {
        outgoing.writeHead(404).end();
        return;
      }
      const isBackend = /^\/(bff|oauth2|login\/oauth2)(\/|$)/u.test(path);
      const headers = Object.fromEntries(
        Object.entries(incoming.headers).filter(
          ([name]) => !name.startsWith('x-forwarded-') && name !== 'forwarded',
        ),
      );
      const upstream = request(
        {
          hostname: isBackend ? '127.0.0.1' : 'localhost',
          port: isBackend ? apiPort : uiPort,
          path: incoming.url,
          method: incoming.method,
          headers: {
            ...headers,
            host: isBackend ? host : 'localhost:' + uiPort,
            'x-forwarded-host': host,
            'x-forwarded-proto': 'https',
          },
        },
        (response) => {
          outgoing.writeHead(response.statusCode, response.headers);
          response.pipe(outgoing);
        },
      );
      upstream.on('error', () => outgoing.writeHead(502).end());
      incoming.pipe(upstream);
    },
  );
  servers.push(server);
  return new Promise((done, fail) => {
    server.once('error', fail);
    server.listen(port, '127.0.0.1', done);
  });
}

async function seed() {
  async function post(path, body, actor, contentType = 'application/json') {
    const response = await fetch(
      'http://127.0.0.1:18090/internal/v1/tenants/' + tenant + path,
      {
        method: 'POST',
        headers: {
          'Content-Type': contentType,
          ...(actor ? { 'X-Ergon-Actor-Id': actor } : {}),
        },
        body:
          body === undefined || typeof body === 'string'
            ? body
            : JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (response.status !== 201)
      throw new Error('Seed ' + path + ' returned ' + response.status);
    return response.json();
  }
  const actors = await Promise.all(
    users.map(({ id }) =>
      post('/human-actors', {
        identityProvider: 'live-test',
        subject: id,
      }),
    ),
  );
  const actor = actors[1].actorId;
  const authority = {
    actorId: actor,
    sourceProvider: 'live-test',
    sourceReference: 'disposable-acceptance',
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  };
  await post('/simulation-lab-authorities/viewers/' + randomUUID(), {
    schemaVersion: 'ergon.evaluation-viewer/authority/v1',
    ...authority,
  });
  await post('/contract-promotions/authorities/' + randomUUID(), {
    schemaVersion: 'ergon.contract-promotion/authority/v1',
    ...authority,
  });
  const contract = fixture.materials.find(
    ({ reference }) => reference.key === 'restore-access',
  );
  await post(
    '/resolution-contracts',
    contract.content,
    undefined,
    'application/yaml',
  );
  const fixturePath = '/simulation-fixtures/sample/revisions/1';
  await post(fixturePath, fixture, actor);
  await post('/evaluation-gates/POLICY/required/revisions/1', policy, actor);
  const storedSuite = await post(
    '/evaluation-gates/SUITE/regression/revisions/1',
    suite,
    actor,
  );
  await post(
    '/contract-promotions/requirements/restore-access/commands/' + randomUUID(),
    {
      schemaVersion: 'ergon.contract-promotion/required-suite/v1',
      expectedVersion: 0,
      suite: { key: 'regression', revision: '1', sha256: storedSuite.digest },
      rationale: 'Live acceptance policy',
    },
    actor,
  );
  const reportId = randomUUID();
  const report = await post(
    fixturePath + '/evaluations/' + reportId,
    undefined,
    actor,
  );
  return {
    fixture: suite.scenarios[0].fixture,
    reportId,
    reportDigest: report.reportDigest,
  };
}

async function main() {
  const revision = command('git', ['-C', backend, 'rev-parse', 'HEAD']);
  if (
    revision !== pin ||
    command('git', ['-C', backend, 'status', '--porcelain'])
  ) {
    throw new Error('Use a clean backend checkout at ' + pin);
  }
  console.log(
    'Live acceptance revisions: UI ' +
      command('git', ['rev-parse', 'HEAD']) +
      ', backend ' +
      revision,
  );
  const audiences = ['workbench', 'requester'];
  const realm = {
    realm: 'ergon-live',
    enabled: true,
    sslRequired: 'none',
    clients: audiences.map((audience, index) => ({
      clientId: 'ergon-' + audience,
      enabled: true,
      secret: password,
      standardFlowEnabled: true,
      directAccessGrantsEnabled: false,
      redirectUris: [
        'https://' +
          audience +
          '.localhost:' +
          (4440 + index) +
          '/login/oauth2/code/ergon-' +
          audience,
      ],
    })),
    users: users.map((user) => ({
      ...user,
      enabled: true,
      firstName: user.username,
      lastName: 'Acceptance',
      email: user.username + '@example.test',
      emailVerified: true,
      credentials: [{ type: 'password', value: password, temporary: false }],
    })),
  };
  writeFileSync(join(temp, 'realm.json'), JSON.stringify(realm), {
    mode: 0o644,
  });
  container('postgres', [
    '-p',
    '127.0.0.1:15432:5432',
    '-e',
    'POSTGRES_PASSWORD=' + password,
    'postgres:18.6-alpine3.23@sha256:1a0c23d53c1ad77468c8653fa6eed4f4105cfbef9e6f027bc1dfeb16949a8c29',
  ]);
  container('oidc', [
    '-p',
    '127.0.0.1:18080:8080',
    '-v',
    join(temp, 'realm.json') + ':/opt/keycloak/data/import/realm.json:ro',
    'quay.io/keycloak/keycloak:26.4.7@sha256:9409c59bdfb65dbffa20b11e6f18b8abb9281d480c7ca402f51ed3d5977e6007',
    'start-dev',
    '--import-realm',
    '--hostname=http://127.0.0.1:18080',
  ]);
  await waitFor('OIDC discovery', issuer + '/.well-known/openid-configuration');
  command(
    'openssl',
    [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-days',
      '1',
      '-subj',
      '/CN=workbench.localhost',
      '-addext',
      'subjectAltName=DNS:workbench.localhost,DNS:requester.localhost',
      '-keyout',
      join(temp, 'key.pem'),
      '-out',
      join(temp, 'cert.pem'),
    ],
    { stdio: 'ignore' },
  );

  for (const [index, audience] of audiences.entries()) {
    const apiPort = 18090 + index;
    const registration = 'ergon-' + audience;
    start(
      'java',
      [
        '-jar',
        join(backend, 'control-plane/target/control-plane-1.0.0-SNAPSHOT.jar'),
      ],
      {
        ERGON_DATABASE_URL: 'jdbc:postgresql://127.0.0.1:15432/postgres',
        ERGON_DATABASE_USERNAME: 'postgres',
        ERGON_DATABASE_PASSWORD: password,
        ERGON_HUMAN_JWT_ISSUER_URI: issuer,
        ERGON_HUMAN_IDENTITY_PROVIDER: 'live-test',
        ERGON_HUMAN_JWT_AUDIENCE: 'ergon-human-api',
        ERGON_BROWSER_SESSION_ENABLED: 'true',
        ERGON_BROWSER_SESSION_AUDIENCE: audience,
        SERVER_ADDRESS: '127.0.0.1',
        SERVER_PORT: String(apiPort),
        SERVER_FORWARD_HEADERS_STRATEGY: 'framework',
        SPRING_APPLICATION_JSON: JSON.stringify({
          spring: {
            security: {
              oauth2: {
                client: {
                  registration: {
                    [registration]: {
                      provider: 'ergon-live',
                      'client-id': registration,
                      'client-secret': password,
                      'client-authentication-method': 'client_secret_basic',
                      'authorization-grant-type': 'authorization_code',
                      'redirect-uri':
                        '{baseUrl}/login/oauth2/code/{registrationId}',
                      scope: 'openid',
                    },
                  },
                  provider: { 'ergon-live': { 'issuer-uri': issuer } },
                },
              },
            },
          },
        }),
      },
    );
    await waitFor(
      audience + ' backend',
      'http://127.0.0.1:' + apiPort + '/bff/v1/tenants/' + tenant + '/session',
      (status) => status === 401,
    );
    start('pnpm', ['exec', 'nx', 'run', '@ergon/' + audience + ':preview'], {
      NX_DAEMON: 'false',
    });
    await waitFor(audience + ' UI', 'http://localhost:' + (4300 + index));
    await proxy(audience, 4440 + index, apiPort, 4300 + index);
  }

  const selection = await seed();
  const test = start(
    'pnpm',
    [
      'exec',
      'playwright',
      'test',
      '--config',
      'apps/ergon-workbench-e2e/playwright.live.config.mts',
      '--output',
      join(temp, 'test-results'),
    ],
    {
      ERGON_LIVE_REPORT_SELECTION: JSON.stringify(selection),
      ERGON_LIVE_REPORT_ID: selection.reportId,
      ERGON_LIVE_TENANT: tenant,
    },
  );
  process.exitCode = await new Promise((done, fail) => {
    test.once('error', fail);
    test.once('exit', (code) => done(code ?? 1));
  });
}

function cleanup() {
  for (const server of servers) server.close();
  for (const child of children.reverse()) {
    if (!child.pid) continue;
    try {
      process.kill(-child.pid);
    } catch (error) {
      if (error.code !== 'ESRCH') throw error;
    }
  }
  for (const name of containers.reverse()) {
    try {
      command('docker', ['rm', '-f', name], { stdio: 'ignore' });
    } catch {
      // Docker can already have removed a failed disposable container.
    }
  }
  rmSync(temp, { recursive: true, force: true });
}

process.once('SIGINT', () => {
  cleanup();
  process.exit(130);
});
process.once('SIGTERM', () => {
  cleanup();
  process.exit(143);
});
try {
  await main();
} finally {
  cleanup();
}
