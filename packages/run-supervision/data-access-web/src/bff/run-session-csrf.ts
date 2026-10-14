import { Either, Schema } from 'effect';
const csrfSchema = Schema.Struct({
  headerName: Schema.Literal('X-CSRF-TOKEN'),
  token: Schema.String.pipe(
    Schema.filter(
      (value) =>
        value.trim().length > 0 &&
        value.length <= 4096 &&
        !/[\r\n]/.test(value),
    ),
  ),
});
/** Invocation-local token for reviewed same-origin commands; replay obtains a fresh token, never altered intent. */
export function decodeRunSessionCsrf(
  body: unknown,
): { readonly headerName: 'X-CSRF-TOKEN'; readonly token: string } | undefined {
  const decoded = Schema.decodeUnknownEither(csrfSchema)(body);
  return Either.isRight(decoded) ? decoded.right : undefined;
}
