import { expect, it } from 'vitest';
import { validReviewRationale } from '../src';
it('requires explicit bounded valid Unicode rationale without rewriting intent', () => {
  for (const bad of [
    '',
    ' ',
    ' padded',
    'padded ',
    '\u0000',
    '\u007f',
    '\uD800',
    'x'.repeat(2001),
  ])
    expect(validReviewRationale(bad)).toBe(false);
  expect(validReviewRationale('Checked 😀\n\tquotes')).toBe(true);
});
