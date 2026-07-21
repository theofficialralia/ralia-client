const STEPS = ['Brief', 'Assets', 'Targeting', 'Quote', 'Fund'];

export function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex items-center gap-2.5">
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] font-bold transition ${
                  done || active ? 'bg-brand text-white' : 'border border-rule bg-paper text-muted'
                }`}
              >
                {done ? '✓' : n}
              </span>
              <span className={`text-[14px] font-semibold ${active ? 'text-ink' : 'text-muted'}`}>{label}</span>
            </div>
            {n < STEPS.length && (
              <div className="mx-3 h-px flex-1 border-t-2 border-dashed border-rule" />
            )}
          </div>
        );
      })}
    </div>
  );
}
