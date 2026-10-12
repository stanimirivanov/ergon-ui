/** Only a lifecycle double: jsdom does not implement a top layer or inertness. */
export function installNativeDialogTestDouble(): () => void {
  const originals = ['showModal', 'close'].map(
    (name) =>
      [
        name,
        Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, name),
      ] as const,
  );
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.setAttribute('open', '');
      },
    },
    close: {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.removeAttribute('open');
        this.dispatchEvent(new Event('close'));
      },
    },
  });
  return () => {
    for (const [name, descriptor] of originals) {
      if (descriptor === undefined)
        Reflect.deleteProperty(HTMLDialogElement.prototype, name);
      else Object.defineProperty(HTMLDialogElement.prototype, name, descriptor);
    }
  };
}
