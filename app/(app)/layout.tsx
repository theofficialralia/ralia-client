'use client';

import Link from 'next/link';
import { Sidebar } from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth, useRequireAuth } from '@/lib/auth';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { loading, user } = useRequireAuth();
  const { user: current } = useAuth();

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8 text-brand" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-wash">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-rule bg-wash/80 px-6 py-4 backdrop-blur">
          <div className="relative hidden max-w-lg flex-1 sm:block">
            <SearchIcon />
            <input
              placeholder="Search campaigns, promoters, evidence"
              className="w-full rounded-full border border-rule bg-paper py-2.5 pl-11 pr-4 text-[14px] outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
            />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand text-[12px] font-bold text-white">
                {current?.email?.slice(0, 2).toUpperCase()}
              </span>
              <span className="text-[14px] font-semibold text-ink">{current?.email?.split('@')[0]}</span>
            </div>
            <Link href="/campaigns/new">
              <Button size="md">
                <span className="text-lg leading-none">+</span> New campaign
              </Button>
            </Link>
          </div>
        </header>
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"
      width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    >
      <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
    </svg>
  );
}
