let patched = false;

const PASSIVE_EVENTS = new Set(['touchstart', 'touchmove', 'wheel', 'mousewheel']);

export function enablePassiveEventListeners() {
  if (patched) return;
  if (typeof window === 'undefined') return;

  const proto = (window.EventTarget || (window as any).Node)?.prototype;
  if (!proto) return;

  const originalAddEventListener = proto.addEventListener;

  proto.addEventListener = function addEventListenerPatched(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions
  ) {
    if (!PASSIVE_EVENTS.has(type) || options === null) {
      return originalAddEventListener.call(this, type, listener, options as any);
    }

    if (options === undefined) {
      return originalAddEventListener.call(this, type, listener, { passive: true });
    }

    if (typeof options === 'boolean') {
      return originalAddEventListener.call(this, type, listener, { capture: options, passive: true });
    }

    if (typeof (options as any).passive === 'boolean') {
      return originalAddEventListener.call(this, type, listener, options as any);
    }

    return originalAddEventListener.call(this, type, listener, { ...(options as any), passive: true });
  };

  patched = true;
}
