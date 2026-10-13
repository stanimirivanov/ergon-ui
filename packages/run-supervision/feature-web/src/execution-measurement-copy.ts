/**
 * Exact base-10 unit conversion for decoded canonical non-negative nanoseconds.
 * Never coerce through Number: even Long.MAX_VALUE retains all six fractional
 * millisecond digits. Presentation conversion adds no precision to the sample.
 */
export function formatGatewayLatency(nanoseconds: string): string {
  const padded = nanoseconds.padStart(7, '0');
  const whole = padded.slice(0, -6);
  const fraction = padded.slice(-6).replace(/0+$/, '');
  return `${whole}${fraction === '' ? '' : `.${fraction}`} ms`;
}
