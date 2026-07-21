/**
 * The API always returns money as { amount_minor, amount_display }. Render the
 * display string; never do currency math in the browser.
 */
export type Money = {
  amount_minor: number;
  amount_display: string;
};

/** For the rare case we must format a raw kobo integer client-side (e.g. a live quote preview). */
export function formatKobo(minor: number): string {
  const naira = minor / 100;
  return `₦${naira.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
