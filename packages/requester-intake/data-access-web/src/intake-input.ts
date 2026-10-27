const whitespace = '[\\p{Z}\\t\\n\\v\\f\\r\\u001c-\\u001f]';
const edges = new RegExp('^' + whitespace + '+|' + whitespace + '+$', 'gu');
function normalize(value: string, limit: number): string | undefined {
  // Kotlin trims Unicode separators/control whitespace, not JavaScript's additional BOM.
  const text = value.replace(edges, '');
  return text.length > 0 &&
    text.length <= limit &&
    !text.includes('\u0000') &&
    !/[\ud800-\udfff]/u.test(text)
    ? text
    : undefined;
}
/** Backend CaseGoal semantics: Kotlin trimming, 1–500 UTF-16 units and well-formed non-NUL text. Never use this result to replace retained raw intent. */
export function normalizeIntakeGoal(value: string): string | undefined {
  return normalize(value, 500);
}
/** Initial observation uses the same normalization, with an 8000 UTF-16-unit bound; supplementary characters count as two units. */
export function normalizeIntakeObservation(value: string): string | undefined {
  return normalize(value, 8000);
}
