import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { checkDecisions, LATEST_PUBLISHED_DECISION } from './decisions.mjs';
import { formatDiagnostic, sortDiagnostics } from './diagnostic.mjs';
import { checkLinks } from './links.mjs';
import {
  hasVisibleSectionBody,
  headingAnchors,
  parseMarkdown,
} from './markdown.mjs';
import { checkRepository, loadRepository } from './repository.mjs';
import { checkTemplates } from './templates.mjs';
import { checkTldr } from './tldr.mjs';

const temporaryDirectories = [];
const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    fs.rmSync(temporaryDirectories.pop(), { recursive: true, force: true });
  }
});

test('diagnostics are stable and actionable', () => {
  const values = sortDiagnostics([
    {
      path: 'b.md',
      line: 2,
      rule: 'b',
      message: 'later',
      fix: 'fix b',
      policy: 'policy',
    },
    {
      path: 'a.md',
      line: 3,
      rule: 'a',
      message: 'first',
      fix: 'fix a',
      policy: 'policy',
    },
  ]);
  assert.deepEqual(
    values.map((value) => value.path),
    ['a.md', 'b.md'],
  );
  assert.equal(
    formatDiagnostic(values[0]),
    'a.md:3 [a] first; fix: fix a; policy: policy',
  );
});

test('rendered structure excludes comments, fenced code, and image alt text', () => {
  const document = parseMarkdown(
    'guide.md',
    '# Guide\n\n## TL;DR\n\n<!-- hidden prose -->\n\n```md\nnot policy\n```\n\n![words](asset.png)\n',
  );
  const summary = document.headings.find((heading) => heading.text === 'TL;DR');
  assert.equal(hasVisibleSectionBody(document, summary), false);
});

test('heading anchors retain GitHub duplicate suffixes', () => {
  const document = parseMarkdown(
    'guide.md',
    '# Guide\n\n## Same heading\n\n## Same heading\n',
  );
  assert.deepEqual(
    [...headingAnchors(document)],
    ['guide', 'same-heading', 'same-heading-1'],
  );
});

test('local links reject path casing, missing anchors, and repository escape', () => {
  const root = fixture({
    'README.md':
      '# Home\n\n[case](docs/guide.md) [anchor](docs/Guide.md#missing) [escape](../outside.md)\n',
    'docs/Guide.md': '# Guide\n\n## Existing\n\nText.\n',
  });
  const diagnostics = checkLinks(loadRepository(root));
  assert.deepEqual(
    diagnostics.map((value) => value.rule),
    ['markdown.link', 'markdown.link', 'markdown.link'],
  );
  assert.ok(
    diagnostics.some((value) => value.message.includes('repository casing')),
  );
  assert.ok(
    diagnostics.some((value) =>
      value.message.includes('does not name a heading'),
    ),
  );
  assert.ok(
    diagnostics.some((value) =>
      value.message.includes('escapes the repository'),
    ),
  );
});

test('local links accept exact paths, percent encoding, and duplicate anchors', () => {
  const root = fixture({
    'README.md': '# Home\n\n[guide](docs/My%20Guide.md#same-heading-1)\n',
    'docs/My Guide.md':
      '# Guide\n\n## Same heading\n\nOne.\n\n## Same heading\n\nTwo.\n',
  });
  assert.deepEqual(checkLinks(loadRepository(root)), []);
});

test('directory links resolve their README, including the repository root', () => {
  const root = fixture({
    'README.md': '# Home\n\n[docs](docs)\n',
    'docs/README.md': '# Docs\n\n[root](..)\n',
  });
  assert.deepEqual(checkLinks(loadRepository(root)), []);
});

test('local links reject malformed encoding, backslashes, absolute paths, and missing targets', () => {
  const root = fixture({
    'README.md':
      '# Home\n\n[encoding](docs/%ZZ.md)\n\n[slash](docs\\Guide.md)\n\n[absolute](/README.md)\n\n[missing](missing.md)\n',
    'docs/Guide.md': '# Guide\n',
  });
  const messages = checkLinks(loadRepository(root)).map(
    (value) => value.message,
  );
  assert.ok(
    messages.some((message) => message.includes('invalid percent encoding')),
  );
  assert.ok(messages.some((message) => message.includes('backslash')));
  assert.ok(messages.some((message) => message.includes('machine-absolute')));
  assert.ok(messages.some((message) => message.includes('does not exist')));
});

test('long guides require a visible first TLDR section', () => {
  const words = Array.from({ length: 801 }, () => 'word').join(' ');
  const missing = parseMarkdown(
    'guide.md',
    `# Guide\n\n## Context\n\n${words}\n`,
  );
  const hidden = parseMarkdown(
    'guide.md',
    `# Guide\n\n## TL;DR\n\n<!-- hidden -->\n\n## Context\n\n${words}\n`,
  );
  assert.equal(checkTldr([missing])[0].rule, 'markdown.tldr');
  assert.equal(
    checkTldr([hidden])[0].message,
    '`## TL;DR` has no visible prose',
  );
});

test('ADR high-water mark detects deletion of the newest published record', () => {
  const files = decisionFixture();
  const latestNumber = String(LATEST_PUBLISHED_DECISION).padStart(4, '0');
  delete files[
    `docs/decisions/${latestNumber}-decision-${LATEST_PUBLISHED_DECISION}.md`
  ];
  files['docs/decisions/README.md'] = decisionIndex(
    LATEST_PUBLISHED_DECISION - 1,
  );
  const diagnostics = checkDecisions(loadRepository(fixture(files)));
  assert.ok(
    diagnostics.some(
      (value) =>
        value.rule === 'adr.sequence' &&
        value.message.includes(`policy records ${latestNumber}`),
    ),
  );
});

test('ADR supersession must be reciprocal', () => {
  const files = decisionFixture();
  files['docs/decisions/0001-decision-1.md'] = decisionBody(
    1,
    'Superseded by [ADR 0002](0002-decision-2.md)',
  );
  files['docs/decisions/README.md'] = decisionIndex(
    19,
    new Map([[1, 'Superseded']]),
  );
  const diagnostics = checkDecisions(loadRepository(fixture(files)));
  assert.ok(
    diagnostics.some(
      (value) =>
        value.rule === 'adr.supersession' &&
        value.message.includes('does not name this record'),
    ),
  );
});

test('ADR supersession references must be unique', () => {
  const files = decisionFixture();
  files['docs/decisions/0001-decision-1.md'] = decisionBody(
    1,
    'Superseded by [ADR 0012](0012-decision-12.md)',
  );
  files['docs/decisions/0012-decision-12.md'] = decisionBody(12).replace(
    '- Milestone: M05 - Human follow-up and resolver console',
    '- Milestone: M05 - Human follow-up and resolver console\n- Supersedes: [ADR 0001](0001-decision-1.md), [ADR 0001](0001-decision-1.md)',
  );
  files['docs/decisions/README.md'] = decisionIndex(
    19,
    new Map([[1, 'Superseded']]),
  );
  const diagnostics = checkDecisions(loadRepository(fixture(files)));
  assert.ok(
    diagnostics.some(
      (value) =>
        value.rule === 'adr.supersession' &&
        value.message.includes('listed more than once'),
    ),
  );
});

test('ADR supersession reads wrapped metadata continuations', () => {
  const files = decisionFixture();
  files['docs/decisions/0001-decision-1.md'] = decisionBody(
    1,
    'Superseded by [ADR 0012](0012-decision-12.md)',
  );
  files['docs/decisions/0002-decision-2.md'] = decisionBody(
    2,
    'Superseded by [ADR 0012](0012-decision-12.md)',
  );
  files['docs/decisions/0012-decision-12.md'] = decisionBody(12).replace(
    '- Milestone: M05 - Human follow-up and resolver console',
    '- Milestone: M05 - Human follow-up and resolver console\n- Supersedes: [ADR 0001](0001-decision-1.md)\n  and [ADR 0002](0002-decision-2.md)',
  );
  files['docs/decisions/README.md'] = decisionIndex(
    19,
    new Map([
      [1, 'Superseded'],
      [2, 'Superseded'],
    ]),
  );
  const diagnostics = checkDecisions(loadRepository(fixture(files)));
  assert.equal(
    diagnostics.filter((value) => value.rule === 'adr.supersession').length,
    0,
  );
});

test('ADR metadata, sections, and index status are checked independently', () => {
  const files = decisionFixture();
  files['docs/decisions/0012-decision-12.md'] = decisionBody(12)
    .replace('- Date: 2026-09-29', '- Date: 2026-02-30')
    .replace(
      '- Milestone: M05 - Human follow-up and resolver console',
      '- Milestone: milestone five',
    )
    .replace('## Consequences', '## Effects');
  files['docs/decisions/README.md'] = decisionIndex(
    19,
    new Map([[12, 'Proposed']]),
  );
  const rules = checkDecisions(loadRepository(fixture(files))).map(
    (value) => value.rule,
  );
  assert.ok(rules.includes('adr.lifecycle'));
  assert.ok(rules.includes('adr.sections'));
  assert.ok(rules.includes('adr.index'));
});

test('ADR filename and heading numbers must agree', () => {
  const files = decisionFixture();
  files['docs/decisions/0012-decision-12.md'] = files[
    'docs/decisions/0012-decision-12.md'
  ].replace('# ADR 0012:', '# ADR 9999:');
  files['docs/decisions/not-numbered.md'] = '# ADR 9999: Invalid\n';
  const diagnostics = checkDecisions(loadRepository(fixture(files)));
  assert.ok(diagnostics.some((value) => value.rule === 'adr.heading'));
  assert.ok(diagnostics.some((value) => value.rule === 'adr.filename'));
});

test('issue-form drift cannot be hidden by changing contributor prose', () => {
  const repository = loadRepository(repositoryRoot);
  const source = repository.fileContents.get(
    '.github/ISSUE_TEMPLATE/capability.yml',
  );
  repository.fileContents.set(
    '.github/ISSUE_TEMPLATE/capability.yml',
    source.replace('id: architecture', 'id: weakened_architecture'),
  );
  repository.fileContents.set(
    'CONTRIBUTING.md',
    repository.fileContents
      .get('CONTRIBUTING.md')
      .replace('## Architecture delta', '## Weakened'),
  );
  const diagnostics = checkTemplates(repository);
  assert.ok(diagnostics.some((value) => value.rule === 'template.issue'));
});

test('YAML comments cannot replace a required issue field', () => {
  const repository = loadRepository(repositoryRoot);
  const source = repository.fileContents.get(
    '.github/ISSUE_TEMPLATE/capability.yml',
  );
  const withoutGoal = source.replace(
    /  - type: textarea\r?\n    id: goal[\s\S]*?    validations:\r?\n      required: true\r?\n/u,
    '  # id: goal\n',
  );
  repository.fileContents.set(
    '.github/ISSUE_TEMPLATE/capability.yml',
    withoutGoal,
  );
  assert.ok(
    checkTemplates(repository).some((value) => value.rule === 'template.issue'),
  );
});

test('PR prompts in comments and changed commands do not satisfy policy', () => {
  const root = fixture({
    'CONTRIBUTING.md': fs.readFileSync(
      path.join(repositoryRoot, 'CONTRIBUTING.md'),
      'utf8',
    ),
    '.github/ISSUE_TEMPLATE/capability.yml': fs.readFileSync(
      path.join(repositoryRoot, '.github/ISSUE_TEMPLATE/capability.yml'),
      'utf8',
    ),
    '.github/PULL_REQUEST_TEMPLATE.md': fs
      .readFileSync(
        path.join(repositoryRoot, '.github/PULL_REQUEST_TEMPLATE.md'),
        'utf8',
      )
      .replace(
        'Checks not run, blocking conditions, and residual risk:',
        '<!-- Checks not run, blocking conditions, and residual risk: -->',
      )
      .replace('`pnpm architecture:check`', '`pnpm weakened`'),
  });
  const diagnostics = checkTemplates(loadRepository(root));
  assert.ok(
    diagnostics.some((value) =>
      value.message.includes('required visible prompts'),
    ),
  );
  assert.ok(
    diagnostics.some((value) =>
      value.message.includes('verification commands'),
    ),
  );
});

test('PR prompts in code fences and image-only checklist text do not satisfy policy', () => {
  const repository = loadRepository(repositoryRoot);
  const document = repository.documentsByPath.get(
    '.github/PULL_REQUEST_TEMPLATE.md',
  );
  const changed = document.body
    .replace(
      'Checks not run, blocking conditions, and residual risk:',
      '```text\nChecks not run, blocking conditions, and residual risk:\n```',
    )
    .replace(
      '- [ ] Repository policy and architecture checks pass.',
      '![Repository policy and architecture checks pass.](check.png)',
    );
  const altered = parseMarkdown('.github/PULL_REQUEST_TEMPLATE.md', changed);
  repository.documentsByPath.set(altered.path, altered);
  repository.documents = repository.documents.map((candidate) =>
    candidate.path === altered.path ? altered : candidate,
  );
  const diagnostics = checkTemplates(repository);
  assert.ok(
    diagnostics.some((value) =>
      value.message.includes('required visible prompts'),
    ),
  );
  assert.ok(
    diagnostics.some((value) => value.message.includes('review checklist')),
  );
});

test('frontend architecture prompts and checklist cannot be removed or hidden', () => {
  for (const marker of [
    '- UI scope and deferred redesign findings:',
    '- State owners and immutable command intent:',
    '- Shell, pane, focus, and request-lifecycle boundaries:',
    '- [ ] Effect execution and unexpected failures stay behind safe data-access/cache boundaries.',
  ]) {
    const repository = loadRepository(repositoryRoot);
    const document = repository.documentsByPath.get(
      '.github/PULL_REQUEST_TEMPLATE.md',
    );
    const altered = parseMarkdown(
      document.path,
      document.body.replace(marker, `<!-- ${marker} -->`),
    );
    repository.documentsByPath.set(altered.path, altered);
    assert.ok(
      checkTemplates(repository).some(
        (value) => value.rule === 'template.pull-request',
      ),
      marker,
    );
  }
});

test('the checked-in repository satisfies repository policy', () => {
  const result = checkRepository(repositoryRoot);
  assert.deepEqual(
    result.diagnostics,
    [],
    result.diagnostics.map(formatDiagnostic).join('\n'),
  );
});

function fixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ergon-ui-policy-'));
  temporaryDirectories.push(root);
  for (const [relativePath, body] of Object.entries(files)) {
    const target = path.join(root, ...relativePath.split('/'));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, body, 'utf8');
  }
  return root;
}

function decisionFixture() {
  const files = {
    'docs/decisions/README.md': decisionIndex(LATEST_PUBLISHED_DECISION),
    'docs/decisions/0000-template.md':
      '# ADR NNNN: Title\n\n- Status: Proposed\n- Date: YYYY-MM-DD\n- Milestone: MNN - Outcome\n\n## TL;DR\n\nSummary.\n\n## Context\n\nContext.\n\n## Decision\n\nDecision.\n\n## Consequences\n\nConsequences.\n\n## Alternatives considered\n\nAlternatives.\n',
  };
  for (let number = 1; number <= LATEST_PUBLISHED_DECISION; number += 1) {
    files[
      `docs/decisions/${String(number).padStart(4, '0')}-decision-${number}.md`
    ] = decisionBody(number);
  }
  return files;
}

function decisionBody(number, status = 'Accepted') {
  return `# ADR ${String(number).padStart(4, '0')}: Decision ${number}\n\n- Status: ${status}\n- Date: 2026-09-29\n- Milestone: M05 - Human follow-up and resolver console\n\n## TL;DR\n\nSummary.\n\n## Context\n\nContext.\n\n## Decision\n\nDecision.\n\n## Consequences\n\nConsequences.\n\n## Alternatives considered\n\nAlternatives.\n`;
}

function decisionIndex(latest, statuses = new Map()) {
  const rows = [];
  for (let number = 1; number <= latest; number += 1) {
    rows.push(
      `| [${String(number).padStart(4, '0')}](${String(number).padStart(4, '0')}-decision-${number}.md) | ${statuses.get(number) ?? 'Accepted'} | Decision ${number} |`,
    );
  }
  return `# UI architecture decisions\n\n## TL;DR\n\nIndex.\n\n| ADR | Status | Decision |\n| --- | --- | --- |\n${rows.join('\n')}\n`;
}
