export async function readBoundedJson(
  response: Response,
  byteLimit: number,
  signal: AbortSignal,
): Promise<unknown> {
  if (response.body === null) throw new Error('Missing body');
  const reader = response.body.getReader();
  const cancel = (): void => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener('abort', cancel, { once: true });
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let size = 0;
  let text = '';
  try {
    signal.throwIfAborted();
    while (true) {
      const chunk = await reader.read();
      signal.throwIfAborted();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > byteLimit) throw new Error('Response limit');
      text += decoder.decode(chunk.value, { stream: true });
    }
    return JSON.parse(text + decoder.decode()) as unknown;
  } finally {
    signal.removeEventListener('abort', cancel);
    cancel();
    reader.releaseLock();
  }
}
