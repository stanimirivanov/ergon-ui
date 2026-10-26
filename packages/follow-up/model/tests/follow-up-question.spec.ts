import { expect, it } from 'vitest';
import { isFollowUpQuestionText } from '../src';

it('preserves exact Unicode question semantics independently of notes', () => {
  for (const invalid of [
    '',
    ' \u00a0',
    '\u001c',
    '\u0000',
    '\ud800',
    'x'.repeat(4001),
  ])
    expect(isFollowUpQuestionText(invalid)).toBe(false);
  expect(isFollowUpQuestionText('😀'.repeat(4000))).toBe(true);
  expect(isFollowUpQuestionText('\ufeff')).toBe(true);
  expect(isFollowUpQuestionText('  <script>inert</script> 😀\n')).toBe(true);
});
