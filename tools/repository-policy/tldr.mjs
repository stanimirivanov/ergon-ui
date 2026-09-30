import { diagnostic } from './diagnostic.mjs';
import { hasVisibleSectionBody } from './markdown.mjs';

const POLICY = 'CONTRIBUTING.md#documentation';
const POLICY_GUIDE =
  /(?:^|\/)(?:architecture|security|migration|migrations|operations|operational|end-to-end)(?:[\/.\-]|$)/iu;

/** Enforces visible summaries on long or policy-oriented documentation. */
export function checkTldr(documents) {
  const violations = [];
  for (const document of documents) {
    if (!requiresTldr(document)) continue;
    const secondLevel = document.headings.filter(
      (heading) => heading.level === 2,
    );
    const first = secondLevel[0];
    if (!first || first.text !== 'TL;DR') {
      violations.push(
        diagnostic(
          document.path,
          first?.line ?? 1,
          'markdown.tldr',
          'long or policy-oriented documentation does not begin with a visible `## TL;DR` section',
          'place a non-empty `## TL;DR` immediately after the title and permitted status metadata',
          POLICY,
        ),
      );
      continue;
    }
    if (!hasVisibleSectionBody(document, first)) {
      violations.push(
        diagnostic(
          document.path,
          first.line,
          'markdown.tldr',
          '`## TL;DR` has no visible prose',
          'summarize the document in visible Markdown rather than comments, HTML, images, or code fences',
          POLICY,
        ),
      );
    }
  }
  return violations;
}

export function requiresTldr(document) {
  if (
    document.path.startsWith('docs/decisions/') ||
    document.path.startsWith('.github/')
  ) {
    return false;
  }
  const secondLevelCount = document.headings.filter(
    (heading) => heading.level === 2,
  ).length;
  return (
    document.visibleWordCount >= 800 ||
    secondLevelCount > 5 ||
    POLICY_GUIDE.test(document.path)
  );
}
