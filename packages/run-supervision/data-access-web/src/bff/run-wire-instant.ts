/** Validate a Java Instant's UTC calendar/shape without truncating its source fractional precision. */
export function isUtcInstant(value: string): boolean {
  if (
    !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?Z$/.test(
      value,
    )
  )
    return false;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return false;
  const date = new Date(parsed);
  return (
    date.getUTCFullYear() === Number(value.slice(0, 4)) &&
    date.getUTCMonth() + 1 === Number(value.slice(5, 7)) &&
    date.getUTCDate() === Number(value.slice(8, 10))
  );
}

/** Compares schema-validated UTC instants without losing sub-millisecond eligibility boundaries. */
export function compareUtcInstants(left: string, right: string): number {
  const key = (value: string): string =>
    value.slice(0, 19) +
    (value.slice(19, -1).replace('.', '') + '000000000').slice(0, 9);
  return key(left) < key(right) ? -1 : key(left) > key(right) ? 1 : 0;
}
