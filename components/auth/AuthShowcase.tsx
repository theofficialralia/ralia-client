'use client';

import { useEffect, useState } from 'react';
import { LogoMark } from '@/components/brand/Logo';

type Slide = { image: string; quote: string; highlight?: string; author?: string };

/**
 * The left brand panel on the auth screens, as an auto-advancing carousel. Drop
 * real images into `public/onboarding/` (slide-1/2/3) — until then each slot falls
 * back to a branded placeholder, so the slideshow works immediately.
 */
const SLIDES: Slide[] = [
  {
    image: '/onboarding/slide-1.svg',
    quote: 'The gallery is the thing. We ran ₦180,000 through Ralia and I could point at every screenshot.',
    highlight: 'My board approved the next quarter’s budget from that grid alone.',
    author: '— Amara O., Skinsmith',
  },
  {
    image: '/onboarding/slide-2.svg',
    quote: 'We reached 2.4M real people in a week — and paid only for posts that actually went live.',
    author: '— Tunde A., NaijaThreads',
  },
  {
    image: '/onboarding/slide-3.svg',
    quote: 'No agencies, no guesswork. Set a budget, pick the audience, watch verified proof roll in.',
    author: '— Zainab M., Kaduna Foods',
  },
];

const AUTOPLAY_MS = 6000;

const PANEL_BG =
  'radial-gradient(120% 60% at 50% -10%, rgba(247,9,9,0.55), transparent 60%), linear-gradient(180deg, #3a0608 0%, #1a0304 55%, #120202 100%)';

function SlideImage({ src }: { src: string }) {
  const [ok, setOk] = useState(true);
  return (
    <div className="mb-8 aspect-[4/3] w-full max-w-md overflow-hidden rounded-2xl border-2 border-brand/70 bg-gradient-to-br from-white/10 to-white/0 shadow-2xl">
      {ok ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" onError={() => setOk(false)} />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-white/40">Ralia</div>
      )}
    </div>
  );
}

export function AuthShowcase() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || SLIDES.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % SLIDES.length), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [paused]);

  const s = SLIDES[i]!;

  return (
    <aside
      className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 text-white lg:flex"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="pointer-events-none absolute inset-0 opacity-90" style={{ background: PANEL_BG }} />

      <div className="relative">
        <LogoMark className="h-10 w-10" />
      </div>

      <div className="relative">
        {/* key re-mounts on slide change so the fade replays for image + quote together */}
        <div key={i} className="animate-fade-in">
          <SlideImage src={s.image} />
          <blockquote className="max-w-md text-[22px] font-medium italic leading-snug">
            “{s.quote}
            {s.highlight ? <span className="text-white/60"> {s.highlight}</span> : null}”
          </blockquote>
          {s.author && <p className="mt-4 text-[14px] font-semibold text-white/70">{s.author}</p>}
        </div>

        <div className="mt-8 flex gap-2">
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`Show slide ${idx + 1}`}
              onClick={() => setI(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === i ? 'w-10 bg-brand' : 'w-6 bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
