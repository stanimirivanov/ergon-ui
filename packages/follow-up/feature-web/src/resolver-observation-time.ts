const utcFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'medium',
  timeZone: 'UTC',
});

/** Displays an already validated observation timestamp explicitly in UTC. */
export function formatUtcInstant(value: string): string {
  return `${utcFormatter.format(new Date(value))} UTC`;
}
