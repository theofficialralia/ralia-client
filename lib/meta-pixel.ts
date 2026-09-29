/**
 * Meta (Facebook) Pixel — the browser half of our conversion tracking.
 *
 * The server sends the same conversions via the Conversions API (CAPI). To let
 * Meta deduplicate the browser event against the server one, we generate an
 * `event_id` here, fire the browser event with it, AND forward the same id to the
 * backend so its CAPI event carries it too. See ralia-api docs/META_CONVERSIONS.md.
 *
 * Only the PUBLIC Pixel id (NEXT_PUBLIC_META_PIXEL_ID) lives here — it is the same
 * number as the backend's dataset id and is safe to ship. The CAPI access token is
 * a server secret and never appears in any frontend.
 */

type Fbq = ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string; callMethod?: (...a: unknown[]) => void };

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? '';

export function pixelConfigured(): boolean {
  return META_PIXEL_ID.trim().length > 0;
}

/** A fresh id to share between the browser event and its server-side twin. */
export function newEventId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `evt-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** The Meta browser cookies, forwarded to the backend to improve match quality. */
export function getFbCookies(): { fbp?: string; fbc?: string } {
  if (typeof document === 'undefined') return {};
  const read = (name: string): string | undefined => {
    const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : undefined;
  };
  return { fbp: read('_fbp'), fbc: read('_fbc') };
}

let initialised = false;

/** Load fbevents.js and initialise the Pixel once. Safe to call repeatedly. */
export function initPixel(): void {
  if (initialised || typeof window === 'undefined' || !pixelConfigured()) return;
  initialised = true;

  /* eslint-disable */
  // Standard Meta Pixel bootstrap (stubs fbq so calls before load are queued).
  (function (f: any, b: Document, e: string, v: string) {
    if (f.fbq) return;
    const n: any = (f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    });
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
    const t = b.createElement(e) as HTMLScriptElement;
    t.async = true;
    t.src = v;
    const s = b.getElementsByTagName(e)[0];
    s.parentNode!.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */

  window.fbq!('init', META_PIXEL_ID);
}

/** Fire a standard Pixel event. Pass `eventId` for events also sent via CAPI. */
export function track(eventName: string, customData?: Record<string, unknown>, eventId?: string): void {
  if (typeof window === 'undefined' || !window.fbq) return;
  window.fbq('track', eventName, customData ?? {}, eventId ? { eventID: eventId } : undefined);
}
