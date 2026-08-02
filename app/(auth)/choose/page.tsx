'use client';

import Link from 'next/link';
import { LogoMark } from '@/components/brand/Logo';

const ArrowUpRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
    <path d="M7 17 17 7M8 7h9v9" />
  </svg>
);

function PathCard({ title, accent, body, href }: { title: string; accent: string; body: string; href: string }) {
  return (
    <div className="card flex flex-col p-5">
      <h3 className="text-[17px] font-bold text-ink">
        {title} <span className="text-brand">{accent}</span>
      </h3>
      <p className="mt-2 flex-1 text-[13.5px] leading-relaxed text-muted">{body}</p>
      <Link
        href={href}
        className="mt-5 inline-flex items-center gap-2 self-start rounded-full bg-sidebar py-2 pl-4 pr-2 text-[13px] font-semibold text-white transition hover:opacity-90"
      >
        Proceed
        <span className="grid h-6 w-6 place-items-center rounded-full bg-brand">
          <ArrowUpRight />
        </span>
      </Link>
    </div>
  );
}

export default function ChoosePage() {
  return (
    <div>
      <div className="mb-8 flex flex-col items-center text-center">
        <LogoMark className="mb-5 h-10 w-10" />
        <h1 className="text-[28px] font-extrabold tracking-tight text-ink">
          Choose your <span className="text-brand">path</span>
        </h1>
        <p className="mt-2 text-[14px] text-muted">Are you a business owner or a promoter? Select your role to proceed.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <PathCard
          title="Promote my"
          accent="business"
          body="Fund a campaign, target the right audience, and watch verified proof of every post land in one gallery."
          href="/register"
        />
        <PathCard
          title="Earn by"
          accent="promoting"
          body="See the fee before you accept, post from channels you already use, and get paid when it's verified."
          href="/register?role=promoter"
        />
      </div>

      <p className="mt-8 text-center text-[13.5px] text-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-brand-700">
          Log in
        </Link>
      </p>
    </div>
  );
}
