import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

/** Checks literal chapter identities without executing scenario code; book assembly still validates content and media. */
export function validateSourceMetadata(sources) {
  const diagnostics = [];
  const orders = new Map();
  const slugs = new Map();
  for (const { filename, source } of [...sources].sort((a, b) =>
    a.filename < b.filename ? -1 : a.filename > b.filename ? 1 : 0,
  )) {
    const file = ts.createSourceFile(
      filename,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const report = (node, message) => {
      const { line } = file.getLineAndCharacterOfPosition(node.getStart(file));
      diagnostics.push(`${filename}:${line + 1}: ${message}`);
    };
    const declarations = file.statements
      .filter(
        (node) =>
          ts.isVariableStatement(node) &&
          node.modifiers?.some(
            (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
          ),
      )
      .flatMap((node) => [...node.declarationList.declarations])
      .filter(
        (node) =>
          node.type &&
          ts.isTypeReferenceNode(node.type) &&
          node.type.typeName.getText(file) === 'GuideChapter',
      );
    if (declarations.length !== 1) {
      report(
        file,
        'Declare exactly one exported GuideChapter per *-guide.ts file.',
      );
      continue;
    }
    const declaration = declarations[0];
    if (
      !declaration.initializer ||
      !ts.isObjectLiteralExpression(declaration.initializer)
    ) {
      report(
        declaration,
        'Use a GuideChapter object literal so book identities can be checked before recording.',
      );
      continue;
    }
    for (const [field, identities] of [
      ['order', orders],
      ['slug', slugs],
    ]) {
      const properties = declaration.initializer.properties.filter(
        (node) =>
          ts.isPropertyAssignment(node) &&
          node.name.getText(file).replace(/^['"]|['"]$/gu, '') === field,
      );
      const property = properties[0];
      const value = property?.initializer;
      const identity =
        field === 'order' && value && ts.isNumericLiteral(value)
          ? Number(value.text)
          : field === 'slug' && value && ts.isStringLiteral(value)
            ? value.text
            : undefined;
      const valid =
        field === 'order'
          ? Number.isSafeInteger(identity) && identity > 0
          : typeof identity === 'string' &&
            /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(identity);
      if (properties.length !== 1 || !valid) {
        report(
          property ?? declaration,
          `Use one literal ${field}: ${field === 'order' ? 'a positive safe integer' : 'a lowercase hyphenated slug'}.`,
        );
        continue;
      }
      const previous = identities.get(identity);
      if (previous) {
        report(
          property,
          `Duplicate guide ${field} ${JSON.stringify(identity)} (also ${previous}); choose a unique ${field}.`,
        );
      } else {
        identities.set(identity, filename);
      }
    }
  }
  return diagnostics;
}

/** Fails closed before generation; dependencies are pinned tooling, never part of the browser bundle. */
export async function checkRepositoryGuideMetadata(repositoryRoot) {
  const directory = path.join(
    repositoryRoot,
    'apps/ergon-workbench-e2e/src/guide',
  );
  const files = (await readdir(directory)).filter((name) =>
    name.endsWith('-guide.ts'),
  );
  if (files.length === 0)
    throw new Error('No *-guide.ts chapter sources found.');
  const sources = await Promise.all(
    files.map(async (name) => ({
      filename: `apps/ergon-workbench-e2e/src/guide/${name}`,
      source: await readFile(path.join(directory, name), 'utf8'),
    })),
  );
  const diagnostics = validateSourceMetadata(sources);
  if (diagnostics.length > 0) throw new Error(diagnostics.join('\n'));
  console.log(`[ok] ${files.length} source guide orders and slugs are unique`);
}
