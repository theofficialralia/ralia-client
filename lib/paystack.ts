/**
 * Paystack Inline (the hosted popup). Card details are entered inside Paystack's
 * own iframe, never in our DOM — which keeps the app out of PCI-DSS scope. This
 * is deliberately NOT the raw card form the mockup drew (that form would capture
 * the PAN in our page).
 *
 * Flow: open the popup → Paystack returns a reference on success → the backend
 * verifies that reference with its secret key and only then credits the campaign.
 * Never trust the client-side success callback alone.
 */

type PaystackHandler = {
  openIframe: () => void;
};

type PaystackPop = {
  setup: (opts: {
    key: string;
    email: string;
    amount: number; // kobo
    currency?: string;
    ref: string;
    metadata?: Record<string, unknown>;
    onClose: () => void;
    callback: (res: { reference: string }) => void;
  }) => PaystackHandler;
};

declare global {
  interface Window {
    PaystackPop?: PaystackPop;
  }
}

const SRC = 'https://js.paystack.co/v1/inline.js';

export function loadPaystack(): Promise<PaystackPop> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('Paystack requires a browser'));
    if (window.PaystackPop) return resolve(window.PaystackPop);

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.PaystackPop!));
      existing.addEventListener('error', () => reject(new Error('Failed to load Paystack')));
      return;
    }
    const script = document.createElement('script');
    script.src = SRC;
    script.async = true;
    script.onload = () => (window.PaystackPop ? resolve(window.PaystackPop) : reject(new Error('Paystack unavailable')));
    script.onerror = () => reject(new Error('Failed to load Paystack'));
    document.body.appendChild(script);
  });
}

export const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? '';

export function paystackConfigured(): boolean {
  return PAYSTACK_PUBLIC_KEY.startsWith('pk_');
}
