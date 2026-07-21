/**
 * Ralia brand mark — an approximation of the dotted-swirl "R". Swap in the real
 * SVG asset from the designer during integration.
 */
export function LogoMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden fill="none">
      {/* dotted swirl */}
      {[
        [30, 6, 2.4], [37, 7, 2.2], [43, 10, 2], [47, 15, 1.7], [24, 8, 2],
        [19, 12, 1.7], [50, 21, 1.5],
      ].map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={i === 3 ? '#349933' : '#F70909'} />
      ))}
      {/* R */}
      <path
        d="M20 20h13c6 0 10 3.6 10 9 0 4-2.3 6.9-6 8.2L45 52h-7l-7-13h-4v13h-7V20zm7 6v8h5.4c2.7 0 4.4-1.5 4.4-4s-1.7-4-4.4-4H27z"
        fill="#F70909"
      />
    </svg>
  );
}

export function Logo({ label = 'Businesses', className = '' }: { label?: string; className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      <div className="leading-none">
        <div className="text-[19px] font-extrabold tracking-tight text-ink">Ralia</div>
        {label && <div className="text-[12px] text-muted">{label}</div>}
      </div>
    </div>
  );
}
