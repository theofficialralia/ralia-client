/**
 * Token storage. Access + refresh tokens live in localStorage for this MVP.
 *
 * Note for hardening: localStorage is readable by any script on the origin, so
 * an XSS bug leaks the tokens. A httpOnly refresh cookie is the stronger option
 * and a known integration follow-up.
 */
const ACCESS = 'ralia.access';
const REFRESH = 'ralia.refresh';

export const session = {
  get access(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS);
  },
  get refresh(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH);
  },
  set(tokens: { access_token: string; refresh_token: string }) {
    localStorage.setItem(ACCESS, tokens.access_token);
    localStorage.setItem(REFRESH, tokens.refresh_token);
  },
  clear() {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
  },
};
