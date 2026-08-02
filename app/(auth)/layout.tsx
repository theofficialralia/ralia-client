import { LogoMark } from '@/components/brand/Logo';

/**
 * Split-screen onboarding: a dark brand panel with a testimonial on the left,
 * the current step's form on the right. Matches the designer's onboarding frames.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand / testimonial panel */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              'radial-gradient(120% 60% at 50% -10%, rgba(247,9,9,0.55), transparent 60%), linear-gradient(180deg, #3a0608 0%, #1a0304 55%, #120202 100%)',
          }}
        />
        <div className="relative">
          <LogoMark className="h-10 w-10" />
        </div>

        <div className="relative">
          <div className="mb-8 aspect-[4/3] w-full max-w-md overflow-hidden rounded-2xl border-2 border-brand/70 bg-gradient-to-br from-white/10 to-white/0 shadow-2xl">
            <div className="flex h-full items-center justify-center text-white/40 text-sm">Customer story</div>
          </div>
          <blockquote className="max-w-md text-[22px] font-medium italic leading-snug">
            “The gallery is the thing. We ran ₦180,000 through Ralia and I could point at every screenshot.
            <span className="text-white/60"> My board approved the next quarter’s budget from that grid alone.”</span>
          </blockquote>
          <div className="mt-8 flex gap-2">
            <span className="h-1.5 w-10 rounded-full bg-brand" />
            <span className="h-1.5 w-10 rounded-full bg-white/20" />
            <span className="h-1.5 w-10 rounded-full bg-white/20" />
            <span className="h-1.5 w-10 rounded-full bg-white/20" />
          </div>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex items-center justify-center bg-paper px-6 py-10 sm:px-12">
        <div className="w-full max-w-md animate-fade-in">{children}</div>
      </main>
    </div>
  );
}
