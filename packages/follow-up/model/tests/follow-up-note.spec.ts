import { describe, expect, it } from 'vitest';
import { isFollowUpNoteText } from '../src';

describe('internal note text', () => {
  it('counts Unicode code points and preserves whitespace/normalization', () => {
    expect(isFollowUpNoteText('😀'.repeat(4000))).toBe(true);
    expect(isFollowUpNoteText('😀'.repeat(4001))).toBe(false);
    expect(isFollowUpNoteText('  e\u0301\n')).toBe(true);
    expect(isFollowUpNoteText('\ufeff')).toBe(true);
  });
  it.each([
    '',
    ' \n\t\u00a0\u2007\u202f\u001c',
    '\u0000',
    '\ud800',
    '\udfff',
    'valid\ud800',
  ])('rejects invalid text %j', (value) => {
    expect(isFollowUpNoteText(value)).toBe(false);
  });
});
