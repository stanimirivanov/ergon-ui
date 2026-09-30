import { parse as parseYaml } from 'yaml';

import { diagnostic } from './diagnostic.mjs';
import { visibleLines } from './markdown.mjs';

const ISSUE_PATH = '.github/ISSUE_TEMPLATE/capability.yml';
const PR_PATH = '.github/PULL_REQUEST_TEMPLATE.md';
const ISSUE_POLICY = 'CONTRIBUTING.md#issue-timing-and-milestones';
const PR_POLICY = 'CONTRIBUTING.md#pull-request-description';

const EXPECTED_ISSUE_FORM = {
  name: 'UI capability',
  description: 'Propose one reviewable Ergon UI behavior',
  title: '',
  labels: ['ui'],
  body: [
    field(
      'input',
      'milestone',
      'Milestone',
      'Use the existing Ergon milestone that owns this behavior.',
      'M05 - Human follow-up and resolver console',
    ),
    field(
      'textarea',
      'goal',
      'Goal',
      'Describe the problem and observable result.',
    ),
    field(
      'textarea',
      'scope',
      'Scope',
      'State included behavior and boundaries.',
    ),
    field(
      'textarea',
      'decisions',
      'Design decisions',
      'Record assumptions, contracts, compatibility effects, and ADRs.',
    ),
    field(
      'textarea',
      'architecture',
      'Architecture delta',
      'Identify responsibility owners before and after, public contracts, and dependency edges. Write "No change" with a reason when boundaries are unaffected.',
      '| Responsibility | Owner before | Owner after | Public contract |\n| --- | --- | --- | --- |\n| ... | ... | ... | ... |\n',
    ),
    field(
      'textarea',
      'acceptance',
      'Acceptance criteria',
      'Include behavior, failures, accessibility, and verification evidence.',
      '- [ ] ...',
    ),
    field(
      'textarea',
      'exclusions',
      'Out of scope',
      'State deliberate exclusions and deferred work.',
    ),
  ],
};

const PR_HEADINGS = [
  'Issue and milestone',
  'Problem and resulting behavior',
  'Scope and exclusions',
  'Design and compatibility decisions',
  'Architecture delta',
  'Verification',
  'Accessibility and responsive behavior',
  'Security, privacy, and operations',
  'Rollout and rollback',
  'Review checklist',
];
const PR_MARKERS = [
  '- Closes #',
  '- Milestone: MNN - Outcome',
  '- ADRs:',
  '- Assumptions:',
  '- Known limitations:',
  '- Dependency edges added or removed:',
  '- Why changed responsibilities belong to their proposed owners:',
  'Checks not run, blocking conditions, and residual risk:',
];
const VERIFICATION_COMMANDS = [
  'pnpm repository:check',
  'pnpm architecture:check',
  'pnpm verify',
];
const REVIEW_CHECKLIST = [
  '- [ ] One coherent capability; unrelated work is excluded.',
  '- [ ] Repository policy and architecture checks pass.',
  '- [ ] The issue uses the existing domain milestone.',
  '- [ ] Public, URL, API, storage, and design-token contracts are intentional.',
  '- [ ] Responsibilities have explicit owners and obey type, scope, and platform boundaries.',
  '- [ ] New package paths follow the capability-first convention; any legacy-path or application-core ledger entry is justified.',
  '- [ ] Application projects contain executable use-case behavior; any direct feature-to-data-access dependency is deliberate.',
  '- [ ] Cross-project imports use public APIs; project tags and READMEs are current.',
  '- [ ] Loading, empty, negative, and failure states are covered where relevant.',
  '- [ ] Semantic HTML, keyboard access, focus, zoom, and reduced motion were reviewed.',
  '- [ ] Tenant, authentication, authorization, and sensitive-data risks were reviewed.',
  '- [ ] Documentation, ADRs, and project READMEs are current.',
  '- [ ] No secrets, personal data, generated noise, or hidden skipped checks.',
];

/** Validates the issue form, PR template, and their non-weakenable contributor contract. */
export function checkTemplates(repository) {
  return [
    ...checkIssueForm(repository),
    ...checkPullRequestTemplate(repository),
    ...checkContributorContract(repository),
  ];
}

function checkIssueForm(repository) {
  const source = repository.fileContents.get(ISSUE_PATH);
  if (source === undefined) {
    return [
      templateViolation(
        ISSUE_PATH,
        1,
        'template.issue',
        'UI capability issue form is missing',
        'restore the canonical issue form',
        ISSUE_POLICY,
      ),
    ];
  }
  let parsed;
  try {
    parsed = parseYaml(source);
  } catch (error) {
    return [
      templateViolation(
        ISSUE_PATH,
        1,
        'template.issue',
        `issue form is not valid YAML: ${error.message}`,
        'restore parseable canonical YAML',
        ISSUE_POLICY,
      ),
    ];
  }
  if (JSON.stringify(parsed) === JSON.stringify(EXPECTED_ISSUE_FORM)) return [];
  return [
    templateViolation(
      ISSUE_PATH,
      1,
      'template.issue',
      'issue form metadata, ordered fields, prompts, milestone, or required validation drifted from policy',
      'restore the hard-coded canonical UI capability form; change policy and checker together only through a reviewed harness decision',
      ISSUE_POLICY,
    ),
  ];
}

function checkPullRequestTemplate(repository) {
  const document = repository.documentsByPath.get(PR_PATH);
  if (!document) {
    return [
      templateViolation(
        PR_PATH,
        1,
        'template.pull-request',
        'pull-request template is missing',
        'restore the canonical template',
        PR_POLICY,
      ),
    ];
  }
  const violations = [];
  const headings = document.headings
    .filter((heading) => heading.level === 2)
    .map((heading) => heading.text);
  if (JSON.stringify(headings) !== JSON.stringify(PR_HEADINGS)) {
    violations.push(
      templateViolation(
        PR_PATH,
        document.headings.find((heading) => heading.level === 2)?.line ?? 1,
        'template.pull-request',
        'pull-request sections are missing, reordered, or renamed',
        'restore the canonical level-two section order',
        PR_POLICY,
      ),
    );
  }
  const visible = new Set(visibleLines(document).map(({ text }) => text));
  const missingMarkers = PR_MARKERS.filter((marker) => !visible.has(marker));
  if (missingMarkers.length > 0) {
    violations.push(
      templateViolation(
        PR_PATH,
        1,
        'template.pull-request',
        `required visible prompts are missing: ${missingMarkers.join(', ')}`,
        'restore each prompt as visible Markdown in its canonical section',
        PR_POLICY,
      ),
    );
  }
  const commands = verificationCommands(document);
  if (JSON.stringify(commands) !== JSON.stringify(VERIFICATION_COMMANDS)) {
    violations.push(
      templateViolation(
        PR_PATH,
        sectionLine(document, 'Verification'),
        'template.pull-request',
        `verification commands are \`${commands.join(', ')}\`, expected \`${VERIFICATION_COMMANDS.join(', ')}\``,
        'restore the exact inline-code commands in the first table column and canonical order',
        PR_POLICY,
      ),
    );
  }
  const checklist = visibleLines(document)
    .map(({ text }) => text)
    .filter((line) => line.startsWith('- [ ] '));
  if (JSON.stringify(checklist) !== JSON.stringify(REVIEW_CHECKLIST)) {
    violations.push(
      templateViolation(
        PR_PATH,
        sectionLine(document, 'Review checklist'),
        'template.pull-request',
        'review checklist was weakened, reordered, hidden, or changed',
        'restore the canonical ordered unchecked checklist',
        PR_POLICY,
      ),
    );
  }
  return violations;
}

function checkContributorContract(repository) {
  const body = repository.fileContents.get('CONTRIBUTING.md') ?? '';
  const canonical = [
    '**Milestone:** MNN - Outcome',
    '## Goal',
    '## Scope',
    '## Design decisions',
    '## Architecture delta',
    '## Acceptance criteria',
    '## Out of scope',
  ];
  let cursor = -1;
  for (const marker of canonical) {
    cursor = body.indexOf(marker, cursor + 1);
    if (cursor < 0) {
      return [
        templateViolation(
          'CONTRIBUTING.md',
          1,
          'template.issue',
          `canonical issue contract is missing or reorders \`${marker}\``,
          'restore the hard-coded issue body order under issue timing and milestones',
          ISSUE_POLICY,
        ),
      ];
    }
  }
  return [];
}

function verificationCommands(document) {
  const start = sectionLine(document, 'Verification');
  const next = document.headings.find(
    (heading) => heading.level === 2 && heading.line > start,
  );
  const end = next?.line ?? document.lines.length + 1;
  return document.lines
    .slice(start, end - 1)
    .map((line) => /^\|\s*`([^`]+)`\s*\|/u.exec(line.trim())?.[1])
    .filter(Boolean);
}

function sectionLine(document, name) {
  return (
    document.headings.find(
      (heading) => heading.level === 2 && heading.text === name,
    )?.line ?? 1
  );
}

function field(type, id, label, description, placeholder) {
  const attributes = { label, description };
  if (placeholder !== undefined) attributes.placeholder = placeholder;
  return { type, id, attributes, validations: { required: true } };
}

function templateViolation(path, line, rule, message, fix, policy) {
  return diagnostic(path, line, rule, message, fix, policy);
}
