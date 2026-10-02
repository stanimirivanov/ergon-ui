import path from 'node:path';

import { diagnostic } from './diagnostic.mjs';

const POLICY = 'docs/decisions/README.md';
export const LATEST_PUBLISHED_DECISION = 20;
const DECISION_FILE = /^(\d{4})-([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/u;
const REQUIRED_SECTIONS = [
  'TL;DR',
  'Context',
  'Decision',
  'Consequences',
  'Alternatives considered',
];
const MILESTONE = /^M\d{2} - \S(?:.*\S)?$/u;
const STATUS =
  /^(Accepted|Proposed|Rejected|Deprecated|Superseded by \[ADR \d{4}\]\([^)]+\.md\))$/u;

/** Validates the complete UI ADR sequence, lifecycle, supersession, and index. */
export function checkDecisions(repository) {
  const violations = [];
  const records = [];
  for (const document of repository.documents) {
    if (!document.path.startsWith('docs/decisions/')) continue;
    const filename = path.posix.basename(document.path);
    if (filename === 'README.md' || filename === '0000-template.md') continue;
    const match = DECISION_FILE.exec(filename);
    if (!match) {
      violations.push(
        decisionViolation(
          document.path,
          1,
          'adr.filename',
          'decision filename is not `NNNN-lowercase-kebab.md`',
          'rename the file with its four-digit number and lowercase kebab-case title',
        ),
      );
      continue;
    }
    const number = Number(match[1]);
    const record = parseRecord(document, number, violations);
    records.push(record);
  }

  records.sort((left, right) => left.number - right.number);
  validateSequence(records, violations);
  validateSupersession(records, violations);
  validateIndex(repository, records, violations);
  validateTemplate(repository, violations);
  return violations;
}

function parseRecord(document, number, violations) {
  const firstHeading = document.headings.find((heading) => heading.level === 1);
  const titlePattern = new RegExp(
    `^ADR ${String(number).padStart(4, '0')}: \\S`,
    'u',
  );
  if (
    !firstHeading ||
    firstHeading.line !== 1 ||
    !titlePattern.test(firstHeading.text)
  ) {
    violations.push(
      decisionViolation(
        document.path,
        firstHeading?.line ?? 1,
        'adr.heading',
        `decision heading does not begin \`# ADR ${String(number).padStart(4, '0')}: <title>\``,
        'make the first rendered heading match the filename number and include a title',
      ),
    );
  }

  const sections = document.headings
    .filter((heading) => heading.level === 2)
    .map((heading) => heading.text);
  if (JSON.stringify(sections) !== JSON.stringify(REQUIRED_SECTIONS)) {
    violations.push(
      decisionViolation(
        document.path,
        document.headings.find((heading) => heading.level === 2)?.line ?? 1,
        'adr.sections',
        `decision sections are \`${sections.join(', ')}\`, expected \`${REQUIRED_SECTIONS.join(', ')}\``,
        'restore every required section exactly once and in template order',
      ),
    );
  }

  const status = metadata(document, 'Status');
  const date = metadata(document, 'Date');
  const milestone = metadata(document, 'Milestone');
  if (!status || !STATUS.test(status.value)) {
    violations.push(
      decisionViolation(
        document.path,
        status?.line ?? 2,
        'adr.lifecycle',
        'decision has no supported visible status',
        'use Accepted, Proposed, Rejected, Deprecated, or `Superseded by [ADR NNNN](file.md)`',
      ),
    );
  }
  if (!date || !isCalendarDate(date.value)) {
    violations.push(
      decisionViolation(
        document.path,
        date?.line ?? 3,
        'adr.lifecycle',
        'decision date is not a real `YYYY-MM-DD` calendar date',
        'record the decision date using an existing ISO calendar date',
      ),
    );
  }
  if (!milestone || !MILESTONE.test(milestone.value)) {
    violations.push(
      decisionViolation(
        document.path,
        milestone?.line ?? 4,
        'adr.lifecycle',
        'decision milestone does not match `MNN - Outcome`',
        'name exactly one existing Ergon core milestone',
      ),
    );
  }

  return {
    number,
    path: document.path,
    filename: path.posix.basename(document.path),
    status: status?.value,
    statusLine: status?.line ?? 2,
    supersedes: parseSupersedes(document),
  };
}

function validateSequence(records, violations) {
  for (let index = 0; index < records.length; index += 1) {
    const expected = index + 1;
    if (records[index].number !== expected) {
      violations.push(
        decisionViolation(
          records[index].path,
          1,
          'adr.sequence',
          `decision sequence expected ${String(expected).padStart(4, '0')}, found ${String(records[index].number).padStart(4, '0')}`,
          'restore published history and keep decision numbers contiguous',
        ),
      );
    }
  }
  const latest = records.at(-1)?.number ?? 0;
  if (latest !== LATEST_PUBLISHED_DECISION) {
    violations.push(
      decisionViolation(
        records.at(-1)?.path ?? POLICY,
        1,
        'adr.sequence',
        `latest decision is ${String(latest).padStart(4, '0')}; policy records ${String(LATEST_PUBLISHED_DECISION).padStart(4, '0')}`,
        'restore deleted history, or advance the retained high-water mark when publishing the next ADR',
      ),
    );
  }
}

function validateSupersession(records, violations) {
  const byNumber = new Map(records.map((record) => [record.number, record]));
  for (const record of records) {
    const seenReferences = new Set();
    for (const reference of record.supersedes) {
      const referenceIdentity = `${reference.number}:${reference.filename}`;
      if (seenReferences.has(referenceIdentity)) {
        violations.push(
          decisionViolation(
            record.path,
            reference.line,
            'adr.supersession',
            `superseded decision reference \`${reference.label}\` is listed more than once`,
            'list each superseded ADR exactly once',
          ),
        );
        continue;
      }
      seenReferences.add(referenceIdentity);
      const target = byNumber.get(reference.number);
      if (
        !target ||
        target.filename !== reference.filename ||
        target.number >= record.number
      ) {
        violations.push(
          decisionViolation(
            record.path,
            reference.line,
            'adr.supersession',
            `superseded decision reference \`${reference.label}\` is missing, mismatched, or not older`,
            'link an existing older ADR using its exact filename',
          ),
        );
        continue;
      }
      const expected = `Superseded by [ADR ${String(record.number).padStart(4, '0')}](${record.filename})`;
      if (target.status !== expected) {
        violations.push(
          decisionViolation(
            target.path,
            target.statusLine,
            'adr.supersession',
            `supersession is not reciprocal; expected status \`${expected}\``,
            'make the older ADR point to the replacement that names it in `Supersedes`',
          ),
        );
      }
    }
    const replacement = parseReplacement(record.status);
    if (replacement) {
      const target = byNumber.get(replacement.number);
      if (!target || target.filename !== replacement.filename) {
        violations.push(
          decisionViolation(
            record.path,
            record.statusLine,
            'adr.supersession',
            'superseding ADR does not exist at the exact linked path',
            'link the published replacement using its exact number and filename',
          ),
        );
      } else if (
        !target.supersedes.some((item) => item.number === record.number)
      ) {
        violations.push(
          decisionViolation(
            record.path,
            record.statusLine,
            'adr.supersession',
            `replacement ADR ${String(target.number).padStart(4, '0')} does not name this record in \`Supersedes\``,
            'make both sides of the supersession relationship explicit',
          ),
        );
      }
    }
  }
}

function validateIndex(repository, records, violations) {
  const index = repository.documentsByPath.get('docs/decisions/README.md');
  if (!index) {
    violations.push(
      decisionViolation(
        POLICY,
        1,
        'adr.index',
        'decision index is missing',
        'restore the ADR index',
      ),
    );
    return;
  }
  const entries = [];
  const row = /^\| \[(\d{4})\]\(([^)]+)\)\s*\|\s*([^|]+?)\s*\|/u;
  index.lines.forEach((line, offset) => {
    const match = row.exec(line.trim());
    if (match) {
      entries.push({
        number: Number(match[1]),
        filename: match[2],
        status: match[3].trim(),
        line: offset + 1,
      });
    }
  });
  if (entries.length !== records.length) {
    violations.push(
      decisionViolation(
        index.path,
        1,
        'adr.index',
        `decision index contains ${entries.length} records for ${records.length} ADRs`,
        'index every published ADR exactly once in numeric order',
      ),
    );
  }
  for (const record of records) {
    const matches = entries.filter((entry) => entry.number === record.number);
    const entry = matches[0];
    const expectedStatus = record.status?.startsWith('Superseded by ')
      ? 'Superseded'
      : record.status;
    if (
      matches.length !== 1 ||
      entry.filename !== record.filename ||
      entry.status !== expectedStatus
    ) {
      violations.push(
        decisionViolation(
          index.path,
          entry?.line ?? 1,
          'adr.index',
          `ADR ${String(record.number).padStart(4, '0')} is missing, duplicated, mislinked, or has stale status in the index`,
          'keep one ordered row with the exact filename and lifecycle status',
        ),
      );
    }
  }
}

function validateTemplate(repository, violations) {
  const template = repository.documentsByPath.get(
    'docs/decisions/0000-template.md',
  );
  if (!template) return;
  const sections = template.headings
    .filter((heading) => heading.level === 2)
    .map((heading) => heading.text);
  if (JSON.stringify(sections) !== JSON.stringify(REQUIRED_SECTIONS)) {
    violations.push(
      decisionViolation(
        template.path,
        1,
        'adr.template',
        'ADR template does not retain the required section contract',
        'restore the checked section names and order',
      ),
    );
  }
}

function metadata(document, name) {
  const pattern = new RegExp(`^- ${name}:\\s*(.+)$`, 'u');
  for (let index = 0; index < document.lines.length; index += 1) {
    const match = pattern.exec(document.lines[index]);
    if (match) return { value: match[1].trim(), line: index + 1 };
  }
  return undefined;
}

function parseSupersedes(document) {
  const firstLine = document.lines.findIndex((line) =>
    /^- Supersedes:\s*/u.test(line),
  );
  if (firstLine < 0) return [];

  const metadataLines = [];
  for (let index = firstLine; index < document.lines.length; index += 1) {
    const line = document.lines[index];
    if (index === firstLine) {
      metadataLines.push({
        value: line.replace(/^- Supersedes:\s*/u, ''),
        line: index + 1,
      });
    } else if (/^\s{2,}\S/u.test(line)) {
      metadataLines.push({ value: line.trim(), line: index + 1 });
    } else {
      break;
    }
  }

  return metadataLines.flatMap((entry) =>
    [...entry.value.matchAll(/\[ADR (\d{4})\]\(([^)]+\.md)\)/gu)].map(
      (match) => ({
        number: Number(match[1]),
        filename: match[2],
        label: match[0],
        line: entry.line,
      }),
    ),
  );
}

function parseReplacement(status) {
  const match = /^Superseded by \[ADR (\d{4})\]\(([^)]+\.md)\)$/u.exec(
    status ?? '',
  );
  return match ? { number: Number(match[1]), filename: match[2] } : undefined;
}

function isCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
  );
}

function decisionViolation(pathname, line, rule, message, fix) {
  return diagnostic(pathname, line, rule, message, fix, POLICY);
}
