const ENV = (process.env.NEXT_PUBLIC_APP_ENV ?? "local").toLowerCase();

const COLORS: Record<string, { bg: string; fg: string }> = {
  local: { bg: "#475569", fg: "#ffffff" },   // slate
  dev: { bg: "#f59e0b", fg: "#1c1207" },      // amber
  staging: { bg: "#7c3aed", fg: "#ffffff" },  // violet
};

/**
 * Fixed corner badge showing which environment this build is. Reads the build-time
 * NEXT_PUBLIC_APP_ENV (set per environment on Vercel). Hidden in production so it
 * never shows to real users; visible for local / dev / staging.
 */
export function EnvBadge() {
  if (ENV === "production" || ENV === "prod") return null;
  const c = COLORS[ENV] ?? COLORS.local;
  return (
    <div
      aria-hidden
      title={`environment: ${ENV}`}
      className="fixed bottom-3 left-3 z-[9999] pointer-events-none select-none rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider shadow-lg ring-1 ring-black/10"
      style={{ backgroundColor: c.bg, color: c.fg }}
    >
      {ENV}
    </div>
  );
}
