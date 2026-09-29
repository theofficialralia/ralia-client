'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { Sidebar } from '@/components/layout/Sidebar';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { api, type ClientProfile } from '@/lib/api';
import { useAuth, useRequireAuth } from '@/lib/auth';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { loading, user } = useRequireAuth();
  const { user: current } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const pathname = usePathname();
  // Close the mobile drawer whenever navigation happens.
  useEffect(() => { setMobileNav(false); }, [pathname]);
  const profile = useQuery({ queryKey: ['client-profile'], queryFn: () => api.get<ClientProfile>('/v1/clients/me'), enabled: !!user });
  const orgName = profile.data?.name ?? current?.email?.split('@')[0] ?? 'Account';

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8 text-brand" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-wash">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        mobileOpen={mobileNav}
        onMobileClose={() => setMobileNav(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-rule bg-wash/80 px-4 py-3 backdrop-blur sm:gap-4 sm:px-6 sm:py-4">
          <button
            onClick={() => setMobileNav(true)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-rule bg-paper text-ink lg:hidden"
            aria-label="Open menu"
          >
            <MenuIcon />
          </button>
          {/* Global search is a planned feature - hidden until it's wired, rather than
              showing a box that does nothing. */}
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <NotificationBell />
            <ThemeToggle />
            <div className="hidden items-center gap-2 sm:flex">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand text-[12px] font-bold text-white">
                {orgName.slice(0, 2).toUpperCase()}
              </span>
              <span className="text-[14px] font-semibold text-ink">{orgName}</span>
            </div>
            <Link href="/campaigns/new">
              <Button size="md">
                <span className="text-lg leading-none">+</span> <span className="hidden sm:inline">New campaign</span>
              </Button>
            </Link>
          </div>
        </header>
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">{children}</main>
      </div>
    </div>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
