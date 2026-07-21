'use client';

/** A toggleable chip group for multi-select (platforms, categories, roles, …). */
export function ChipSelect({
  options,
  value,
  onChange,
  scroll,
}: {
  options: readonly (Readonly<{ value: string; label: string }> | string)[];
  value: string[];
  onChange: (next: string[]) => void;
  scroll?: boolean;
}) {
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  return (
    <div className={`flex flex-wrap gap-2 ${scroll ? 'max-h-44 overflow-y-auto rounded-xl border border-rule p-3' : ''}`}>
      {opts.map((o) => {
        const on = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition ${
              on ? 'border-brand bg-brand text-white' : 'border-rule bg-paper text-body hover:border-brand/40'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
