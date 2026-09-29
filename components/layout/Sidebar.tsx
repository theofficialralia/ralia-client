'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Logo, LogoMark } from '@/components/brand/Logo';
import { api, type ClientProfile } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { SUPPORT } from '@/lib/support';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: GridIcon },
  { href: '/campaigns', label: 'My Campaigns', icon: MegaphoneIcon },
];

/**
 * Profile completeness - the share of the optional business-profile fields that
 * are filled. Drives the sidebar nudge; hidden once everything is in.
 */
function profileCompleteness(p: ClientProfile): number {
  const checks = [
    !!p.industry,
    !!p.website,
    !!p.phone_whatsapp,
    !!p.address,
    !!p.cac_number,
    !!(p.support_contact_name || p.support_contact_phone),
    !!p.description,
    !!(p.socials && p.socials.length > 0),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function Sidebar({
  collapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onMobileClose,
}: {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  return (
    <>
      {/* Desktop: persistent, collapsible rail */}
      <aside className={`hidden shrink-0 flex-col border-r border-rule bg-sidebar text-white transition-[width] duration-200 lg:flex ${collapsed ? 'w-[76px]' : 'w-[260px]'}`}>
        <SidebarPanel collapsed={collapsed} onToggleCollapse={onToggleCollapse} />
      </aside>

      {/* Mobile: off-canvas drawer + backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onMobileClose} />
          <aside className="absolute inset-y-0 left-0 flex w-[280px] max-w-[85%] flex-col bg-sidebar text-white shadow-2xl">
            <SidebarPanel collapsed={false} mobile onMobileClose={onMobileClose} />
          </aside>
        </div>
      )}
    </>
  );
}

/** The sidebar's inner content, shared by the desktop rail and the mobile drawer. */
function SidebarPanel({
  collapsed = false,
  onToggleCollapse,
  mobile = false,
  onMobileClose,
}: {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  mobile?: boolean;
  onMobileClose?: () => void;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  // Shares the ['client-profile'] cache with Settings, so it's deduped.
  const profile = useQuery({
    queryKey: ['client-profile'],
    queryFn: () => api.get<ClientProfile>('/v1/clients/me'),
  });
  const pct = profile.data ? profileCompleteness(profile.data) : null;
  const orgName = profile.data?.name ?? user?.email?.split('@')[0] ?? 'Account';

  return (
    <>
      <div className={`flex items-center justify-between py-6 ${collapsed ? 'px-3' : 'px-5'}`}>
        {collapsed ? <LogoMark className="h-8 w-8" /> : <Logo label="Businesses" className="[&_div]:text-white [&_.text-muted]:text-white/50" />}
        {mobile ? (
          <button
            onClick={onMobileClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/45 transition hover:bg-white/10 hover:text-white"
            aria-label="Close menu"
          >
            <CloseIcon />
          </button>
        ) : onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-white/45 transition hover:bg-white/10 hover:text-white ${collapsed ? 'hidden' : ''}`}
            aria-label="Collapse sidebar"
          >
            <PanelIcon />
          </button>
        )}
      </div>

      {!collapsed && pct !== null && pct < 100 && (
        <Link
          href="/settings"
          className="mx-4 mb-4 block rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.07]"
        >
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-full border-2 border-warn text-[11px] font-bold text-warn">!</span>
            <span className="text-[15px] font-bold">{pct}%</span>
          </div>
          <p className="mt-2 text-[12.5px] leading-snug text-white/55">Complete your profile to get better matches</p>
        </Link>
      )}

      <nav className={`flex-1 space-y-1 ${collapsed ? 'px-2' : 'px-3'}`}>
        {nav.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center rounded-xl py-3 text-[14.5px] font-semibold transition ${collapsed ? 'justify-center px-0' : 'gap-3 px-4'} ${
                active ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      <div className={`space-y-1 pb-3 ${collapsed ? 'px-2' : 'px-3'}`}>
        <a
          href={SUPPORT.whatsappUrl}
          target="_blank"
          rel="noreferrer"
          title={collapsed ? 'Help & Support' : undefined}
          className={`flex w-full items-center rounded-xl py-3 text-[14.5px] font-semibold text-white/60 transition hover:bg-white/5 hover:text-white ${collapsed ? 'justify-center px-0' : 'gap-3 px-4'}`}
        >
          <LifebuoyIcon /> {!collapsed && 'Help & Support'}
        </a>
        <button
          onClick={() => { if (window.confirm('Log out of Ralia?')) void logout(); }}
          title={collapsed ? 'Log out' : undefined}
          className={`flex w-full items-center rounded-xl py-3 text-[14.5px] font-semibold text-white/60 transition hover:bg-white/5 hover:text-white ${collapsed ? 'justify-center px-0' : 'gap-3 px-4'}`}
        >
          <LogoutIcon /> {!collapsed && 'Log out'}
        </button>
      </div>

      <Link
        href="/settings"
        title={collapsed ? orgName : undefined}
        className={`m-3 flex items-center rounded-2xl border p-3 transition ${collapsed ? 'justify-center' : 'gap-3'} ${
          pathname.startsWith('/settings') ? 'border-white/20 bg-white/[0.08]' : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.07]'
        }`}
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-[13px] font-bold text-white">
          {initials(orgName)}
        </span>
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-[14px] font-bold">{orgName}</div>
            <div className="truncate text-[12px] text-white/50">{user?.email}</div>
          </div>
        )}
      </Link>
    </>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function PanelIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M9.5 4.5v15" /><path d="m15.5 9.5-2.5 2.5 2.5 2.5" />
    </svg>
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
