'use client';

import { useRef } from 'react';

/** Six single-digit boxes with auto-advance, backspace, and paste support. */
export function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, ' ').slice(0, 6).split('');

  function setAt(i: number, d: string) {
    const next = value.split('');
    next[i] = d;
    onChange(next.join('').replace(/\s/g, '').slice(0, 6));
  }

  return (
    <div className="flex gap-2.5 sm:gap-3">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          maxLength={1}
          value={d.trim()}
          onChange={(e) => {
            const c = e.target.value.replace(/\D/g, '').slice(-1);
            setAt(i, c || ' ');
            if (c && i < 5) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !digits[i].trim() && i > 0) refs.current[i - 1]?.focus();
          }}
          onPaste={(e) => {
            e.preventDefault();
            const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
            if (pasted) {
              onChange(pasted);
              refs.current[Math.min(pasted.length, 5)]?.focus();
            }
          }}
          className="h-14 w-12 rounded-xl border border-rule bg-paper text-center text-[22px] font-bold text-ink
            outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10 sm:h-16 sm:w-14
            [&:not(:placeholder-shown)]:border-brand/40"
          placeholder="•"
        />
      ))}
    </div>
  );
}
