import Image from 'next/image';

/** Ralia brand mark — the real logo PNG, sized by the parent's className. */
export function LogoMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <span className={`relative inline-block ${className}`}>
      <Image src="/ralia-mark.png" alt="Ralia" fill priority className="object-contain" sizes="48px" />
    </span>
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
