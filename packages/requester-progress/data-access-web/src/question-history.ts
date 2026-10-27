import { Either, Schema } from 'effect';
import type { ProgressFailure } from './progress-client';

/**
 * Narrow requester projection without resolver attribution. UUID identities, exact
 * nonblank 1–4000-code-point text and UTC instants retain server precision.
 * Text is untrusted; timestamps do not prove delivery or cross-clock ordering.
 * Omission means unsupported answer coverage; null means unanswered in this snapshot.
 */
export interface RequesterQuestion {
  readonly requestId: string;
  readonly question: string;
  readonly requestedAt: string;
  readonly recordedAt: string;
  readonly response?: {
    readonly responseId: string;
    readonly answer: string;
    readonly respondedAt: string;
    readonly recordedAt: string;
  } | null;
}
/** Latest 100 questions by recording time/UUID descending. Answers never change ordering or imply delivery, consent or proof. */
export interface RequesterQuestions {
  readonly items: readonly RequesterQuestion[];
  readonly truncated: boolean;
}

/** Validate UTC calendar instants without losing the backend's nanosecond precision. */
export function isRequesterInstant(value: string): boolean {
  const time = Date.parse(value);
  return (
    Number.isFinite(time) &&
    new Date(time).toISOString().slice(0, 19) === value.slice(0, 19)
  );
}
const instant = Schema.String.pipe(
  Schema.pattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/),
  Schema.filter(isRequesterInstant),
);
// Matches the server's Kotlin whitespace/code-point rules; never trim accepted text.
const text = Schema.String.pipe(
  Schema.filter((value) => {
    const characters = Array.from(value);
    return (
      characters.length <= 4000 &&
      characters.some(
        (character) =>
          !/[\p{Z}\t\n\v\f\r]/u.test(character) &&
          !(character.charCodeAt(0) >= 0x1c && character.charCodeAt(0) <= 0x1f),
      ) &&
      !value.includes('\u0000') &&
      !/[\ud800-\udfff]/u.test(value)
    );
  }),
);
const page = Schema.Struct({
  items: Schema.Array(
    Schema.Struct({
      requestId: Schema.UUID,
      question: text,
      requestedAt: instant,
      recordedAt: instant,
      response: Schema.optionalWith(
        Schema.NullOr(
          Schema.Struct({
            responseId: Schema.UUID,
            answer: text,
            respondedAt: instant,
            recordedAt: instant,
          }),
        ),
        { exact: true },
      ),
    }),
  ).pipe(Schema.maxItems(100)),
  truncated: Schema.Boolean,
});

/** Reject the entire malformed page; only reviewed fields enter RTK, including inside answers. */
export function decodeRequesterQuestions(
  body: unknown,
): Either.Either<RequesterQuestions, ProgressFailure> {
  const decoded = Schema.decodeUnknownEither(page)(body);
  if (Either.isLeft(decoded)) return Either.left({ kind: 'invalid-response' });
  const history = decoded.right;
  const ids = history.items.map((item) => item.requestId.toLowerCase());
  const answers = history.items.flatMap((item) =>
    item.response ? [item.response.responseId.toLowerCase()] : [],
  );
  const key = (item: RequesterQuestion): string => {
    const [seconds = '', fraction = ''] = item.recordedAt
      .slice(0, -1)
      .split('.');
    return `${seconds}.${fraction.padEnd(9, '0')}:${item.requestId.toLowerCase()}`;
  };
  return (!history.truncated || history.items.length === 100) &&
    new Set(ids).size === ids.length &&
    new Set(answers).size === answers.length &&
    history.items.every((item, index) => {
      const previous = history.items[index - 1];
      return previous === undefined || key(previous) > key(item);
    })
    ? Either.right(history)
    : Either.left({ kind: 'invalid-response' });
}
