'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import { useAuth } from '@/lib/auth';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: GridIcon },
  { href: '/campaigns', label: 'My Campaigns', icon: MegaphoneIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-r border-rule bg-ink text-white">
      <div className="px-5 py-6">
        <Logo label="Businesses" className="[&_div]:text-white [&_.text-muted]:text-white/50" />
      </div>

      <div className="mx-4 mb-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full border-2 border-warn text-[11px] font-bold text-warn">
            !
          </span>
          <span className="text-[15px] font-bold">50%</span>
        </div>
        <p className="mt-2 text-[12.5px] leading-snug text-white/55">Complete your profile to create campaigns</p>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {nav.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-[14.5px] font-semibold transition ${
                active ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 px-3 pb-3">
        <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[14.5px] font-semibold text-white/60 hover:bg-white/5 hover:text-white">
          <LifebuoyIcon /> Help &amp; Support
        </button>
        <button
          onClick={() => logout()}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[14.5px] font-semibold text-white/60 hover:bg-white/5 hover:text-white"
        >
          <LogoutIcon /> Log out
        </button>
      </div>

      <Link
        href="/settings"
        className={`m-3 flex items-center gap-3 rounded-2xl border p-3 transition ${
          pathname.startsWith('/settings')
            ? 'border-white/20 bg-white/[0.08]'
            : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.07]'
        }`}
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-[13px] font-bold text-white">
          {initials(user?.email)}
        </span>
        <div className="min-w-0">
          <div className="truncate text-[14px] font-bold">{user?.email?.split('@')[0] ?? 'Account'}</div>
          <div className="truncate text-[12px] text-white/50">{user?.email}</div>
        </div>
      </Link>
    </aside>
  );
}

function initials(email?: string) {
  if (!email) return 'R';
  return email.slice(0, 2).toUpperCase();
}

function GridIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function MegaphoneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M3 11v2a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1ZM14 8a4 4 0 0 1 0 8" />
    </svg>
  );
}
function LifebuoyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.5" />
      <path d="M5 5l3.5 3.5M15.5 15.5 19 19M19 5l-3.5 3.5M8.5 15.5 5 19" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
