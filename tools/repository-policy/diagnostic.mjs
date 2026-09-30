/** Creates one actionable repository-policy diagnostic. */
export function diagnostic(path, line, rule, message, fix, policy) {
  return { path, line, rule, message, fix, policy };
}

/** Returns diagnostics in deterministic path, line, rule, and message order. */
export function sortDiagnostics(diagnostics) {
  return [...diagnostics].sort(
    (left, right) =>
      left.path.localeCompare(right.path) ||
      left.line - right.line ||
      left.rule.localeCompare(right.rule) ||
      left.message.localeCompare(right.message),
  );
}

/** Formats a diagnostic so contributors can correct it without reading checker code. */
export function formatDiagnostic(value) {
  return `${value.path}:${value.line} [${value.rule}] ${value.message}; fix: ${value.fix}; policy: ${value.policy}`;
}
