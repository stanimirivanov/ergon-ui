import { Schema } from 'effect';

const utcInstant = Schema.String.pipe(
  Schema.pattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/),
);

/** Structural wire contract for the actor resolved by the browser session. */
export const currentActorResponseSchema = Schema.Struct({
  actorId: Schema.UUID,
  identityProvider: Schema.NonEmptyString,
  registeredAt: utcInstant,
  recordedAt: utcInstant,
});

/**
 * Problem fields required before a response may influence recovery behavior.
 * Descriptive fields are validated but never copied into application state.
 */
export const problemDetailSchema = Schema.Struct({
  type: Schema.String,
  title: Schema.String,
  status: Schema.Number,
  detail: Schema.String,
  instance: Schema.optional(Schema.String),
  signInPath: Schema.optional(Schema.String),
});

/** Validated problem payload used only for protocol failure classification. */
export type ProblemDetail = Schema.Schema.Type<typeof problemDetailSchema>;
