import fs from 'node:fs';
import path from 'node:path';

import { checkDecisions } from './decisions.mjs';
import { sortDiagnostics } from './diagnostic.mjs';
import { checkLinks } from './links.mjs';
import { parseMarkdown } from './markdown.mjs';
import { checkTemplates } from './templates.mjs';
import { checkTldr } from './tldr.mjs';

const EXCLUDED_DIRECTORIES = new Set([
  '.git',
  '.nx',
  'coverage',
  'dist',
  'node_modules',
  'playwright-report',
  'test-results',
]);

/** Loads the checked repository inventory without following generated directories. */
export function loadRepository(root) {
  const filePaths = [];
  const directoryPaths = ['.'];
  walk(root, '', filePaths, directoryPaths);
  filePaths.sort();
  directoryPaths.sort();

  const fileContents = new Map();
  const documents = [];
  for (const relativePath of filePaths) {
    if (
      !relativePath.toLowerCase().endsWith('.md') &&
      relativePath !== '.github/ISSUE_TEMPLATE/capability.yml' &&
      relativePath !== 'CONTRIBUTING.md'
    ) {
      continue;
    }
    const body = fs.readFileSync(resolveRelative(root, relativePath), 'utf8');
    fileContents.set(relativePath, body);
    if (relativePath.toLowerCase().endsWith('.md')) {
      documents.push(parseMarkdown(relativePath, body));
    }
  }
  documents.sort((left, right) => left.path.localeCompare(right.path));
  return {
    root,
    filePaths,
    directoryPaths,
    fileContents,
    documents,
    documentsByPath: new Map(
      documents.map((document) => [document.path, document]),
    ),
  };
}

/** Runs every deterministic repository-policy sensor and aggregates all findings. */
export function checkRepository(root) {
  const repository = loadRepository(root);
  const diagnostics = sortDiagnostics([
    ...checkLinks(repository),
    ...checkTldr(repository.documents),
    ...checkDecisions(repository),
    ...checkTemplates(repository),
  ]);
  return { repository, diagnostics };
}

function walk(root, relativeDirectory, filePaths, directoryPaths) {
  const absoluteDirectory = resolveRelative(root, relativeDirectory);
  const entries = fs
    .readdirSync(absoluteDirectory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const relativePath = relativeDirectory
      ? `${relativeDirectory}/${entry.name}`
      : entry.name;
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRECTORIES.has(entry.name)) continue;
      directoryPaths.push(relativePath);
      walk(root, relativePath, filePaths, directoryPaths);
      continue;
    }
    if (entry.isFile() || entry.isSymbolicLink()) filePaths.push(relativePath);
  }
}

function resolveRelative(root, relativePath) {
  return path.resolve(root, ...relativePath.split('/').filter(Boolean));
}
