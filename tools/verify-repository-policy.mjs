import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { formatDiagnostic } from './repository-policy/diagnostic.mjs';
import { checkRepository } from './repository-policy/repository.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const result = checkRepository(root);

if (result.diagnostics.length > 0) {
  for (const value of result.diagnostics)
    console.error(formatDiagnostic(value));
  console.error(
    `Repository policy failed with ${result.diagnostics.length} violation(s).`,
  );
  process.exitCode = 1;
} else {
  console.log(
    `Verified repository documentation, ADR, and template policy across ${result.repository.documents.length} Markdown documents.`,
  );
}
