/** A document-lifetime private transport; retirement is permanent and aborts response bodies as well as pending headers. */
export interface PrivateSessionTransport {
  readonly fetch: typeof globalThis.fetch;
  retire(): void;
}
/**
 * Combines each caller's signal with the private session lifetime. Use a separate
 * base transport for logout itself. Even an injected fetch ignoring cancellation
 * cannot return late headers through a retired scope. No credential/cache storage.
 */
export function createPrivateSessionTransport(
  fetch: typeof globalThis.fetch,
): PrivateSessionTransport {
  const controller = new AbortController();
  let retired = false;
  const cancelled = (): DOMException =>
    new DOMException('Private session retired', 'AbortError');
  return {
    async fetch(input, init): Promise<Response> {
      if (retired) throw cancelled();
      const caller =
        init?.signal ?? (input instanceof Request ? input.signal : undefined);
      const signal =
        caller === undefined || caller === null
          ? controller.signal
          : AbortSignal.any([controller.signal, caller]);
      const response = await fetch(input, { ...init, signal });
      if (retired) {
        void response.body?.cancel().catch(() => undefined);
        throw cancelled();
      }
      return response;
    },
    retire(): void {
      retired = true;
      controller.abort();
    },
  };
}
