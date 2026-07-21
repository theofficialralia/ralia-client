'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api, type DashboardSummary } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { StatusPill } from '@/components/ui/StatusPill';
import { Spinner } from '@/components/ui/Spinner';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.get<DashboardSummary>('/v1/dashboard/summary'),
  });

  const name = user?.email?.split('@')[0] ?? 'there';

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-[13px] font-semibold text-brand-700">
        Overview · {new Date().toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })}
      </p>
      <h1 className="mt-1 text-[28px] font-extrabold capitalize tracking-tight text-ink">
        {greeting()}, {name}.
      </h1>
      <p className="mt-1 text-[15px] text-muted">
        {data
          ? `${data.live_campaigns} campaign${data.live_campaigns === 1 ? '' : 's'} live. ${data.new_evidence_today} new evidence landed today.`
          : 'Loading your overview…'}
      </p>

      {/* Stat cards — all four backed by /dashboard/summary (no wallet card: the
          backend funds per-campaign, not a prepaid wallet — see client README). */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Total spent · this month"
          value={data?.spent_this_month.amount_display}
          foot={
            data?.spent_change_pct != null
              ? `${data.spent_change_pct > 0 ? '+' : ''}${data.spent_change_pct}% vs last month`
              : 'First month of activity'
          }
          loading={isLoading}
        />
        <Stat
          label="Views delivered"
          value={data ? data.views_delivered.toLocaleString('en-NG') : undefined}
          foot={data ? `Across ${data.campaigns_total} campaign${data.campaigns_total === 1 ? '' : 's'}` : ''}
          loading={isLoading}
        />
        <Stat
          label="Promoters worked with"
          value={data ? data.promoters_worked_with.toLocaleString('en-NG') : undefined}
          foot="Across all campaigns"
          loading={isLoading}
        />
        <Stat
          label="Campaigns"
          value={data ? String(data.campaigns_total) : undefined}
          foot={data ? `${data.live_campaigns} live now` : ''}
          loading={isLoading}
        />
      </div>

      {/* Campaigns table */}
      <div className="mt-9">
        <p className="text-[13px] text-muted">Campaigns</p>
        <h2 className="text-[22px] font-extrabold tracking-tight text-ink">Everything you&apos;re running</h2>

        <div className="card mt-4 overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Spinner className="h-7 w-7 text-brand" />
            </div>
          ) : isError ? (
            <p className="px-6 py-16 text-center text-[14px] text-muted">Couldn&apos;t load your campaigns.</p>
          ) : data && data.campaigns.length > 0 ? (
            <table className="w-full text-[14px]">
              <thead>
                <tr className="border-b border-rule text-left text-[12px] uppercase tracking-wide text-muted">
                  <th className="px-6 py-3.5 font-semibold">Campaign</th>
                  <th className="px-4 py-3.5 font-semibold">Status</th>
                  <th className="px-4 py-3.5 font-semibold">Spent</th>
                  <th className="px-4 py-3.5 font-semibold">Views</th>
                  <th className="px-4 py-3.5 font-semibold">Completed</th>
                  <th className="px-4 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {data.campaigns.map((c) => (
                  <tr key={c.id} className="border-b border-rule/70 last:border-0 hover:bg-wash/60">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-ink">{c.name}</div>
                      <div className="text-[12.5px] capitalize text-muted">
                        {c.objective.toLowerCase().replace('_', ' ')} · {c.slots_total} slots
                      </div>
                    </td>
                    <td className="px-4 py-4"><StatusPill status={c.status} /></td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-ink">{c.spent.amount_display}</div>
                      <div className="text-[12.5px] text-muted">of {c.budget.amount_display}</div>
                    </td>
                    <td className="px-4 py-4 tabular-nums">{c.views.toLocaleString('en-NG')}</td>
                    <td className="px-4 py-4 tabular-nums">{c.completed}/{c.slots_total}</td>
                    <td className="px-4 py-4 text-right">
                      <Link href={`/campaigns/${c.id}`} className="inline-flex items-center gap-1 font-semibold text-brand-700">
                        Open
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                          <path d="M7 17 17 7M8 7h9v9" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-6 py-16 text-center">
              <p className="text-[15px] font-semibold text-ink">No campaigns yet</p>
              <p className="mt-1 text-[13.5px] text-muted">Create your first campaign to start reaching real audiences.</p>
              <Link href="/campaigns/new" className="mt-4 inline-block font-semibold text-brand-700">
                + New campaign
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, foot, loading }: { label: string; value?: string; foot?: string; loading?: boolean }) {
  return (
    <div className="stat-card">
      <p className="text-[13px] text-muted">{label}</p>
      {loading ? (
        <div className="mt-2 h-8 w-24 animate-pulse rounded bg-rule/60" />
      ) : (
        <p className="mt-1.5 text-[26px] font-extrabold tracking-tight text-ink">{value ?? '—'}</p>
      )}
      {foot && <p className="mt-2 text-[12.5px] font-semibold text-brand-700">{foot}</p>}
    </div>
  );
}
