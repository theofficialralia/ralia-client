'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { StatusPill } from '@/components/ui/StatusPill';
import { IconRefresh } from '@/components/brand/icons';
import { objectiveLabel } from '@/lib/campaign-options';
import { api, type Campaign, type DashboardRow } from '@/lib/api';

/**
 * The shared "Everything you're running" table used by the dashboard and the
 * My campaigns page. Draft/quoted rows resume into the wizard; the rest open
 * their delivery view.
 */
export function CampaignsTable({ rows, empty }: { rows: DashboardRow[]; empty?: React.ReactNode }) {
  const router = useRouter();
  const runAgain = useMutation({
    mutationFn: (id: string) => api.post<Campaign>(`/v1/campaigns/${id}/duplicate`, {}),
    onSuccess: (c) => router.push(`/campaigns/new?id=${c.id}`),
  });

  if (rows.length === 0) {
    return (
      <div className="card px-6 py-16 text-center">
        {empty ?? (
          <>
            <p className="text-[15px] font-semibold text-ink">No campaigns yet</p>
            <p className="mt-1 text-[13.5px] text-muted">Create your first campaign to start reaching real audiences.</p>
            <Link href="/campaigns/new" className="mt-4 inline-block font-semibold text-brand-700">+ New campaign</Link>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-[14px]">
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
            {rows.map((c) => {
              const draft = c.status === 'DRAFT' || c.status === 'QUOTED';
              const href = draft ? `/campaigns/new?id=${c.id}` : `/campaigns/${c.id}`;
              return (
                <tr key={c.id} className="border-b border-rule/70 last:border-0 hover:bg-wash/60">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-ink">{c.name}</div>
                    <div className="text-[12.5px] text-muted">{objectiveLabel(c.objective)} · {c.slots_total} slots</div>
                  </td>
                  <td className="px-4 py-4"><StatusPill status={c.status} /></td>
                  <td className="px-4 py-4">
                    <div className="font-semibold text-ink">{c.spent.amount_display}</div>
                    <div className="text-[12.5px] text-muted">of {c.budget.amount_display}</div>
                  </td>
                  <td className="px-4 py-4 tabular-nums">{c.views.toLocaleString('en-NG')}</td>
                  <td className="px-4 py-4 tabular-nums">{c.completed}/{c.slots_total}</td>
                  <td className="px-4 py-4 text-right">
                    <div className="inline-flex items-center gap-4">
                      {!draft && (
                        <button
                          type="button"
                          onClick={() => runAgain.mutate(c.id)}
                          disabled={runAgain.isPending}
                          className="inline-flex items-center gap-1.5 font-semibold text-muted transition hover:text-ink disabled:opacity-50"
                          title="Duplicate this campaign into a new draft to run again"
                        >
                          {runAgain.isPending && runAgain.variables === c.id ? 'Copying…' : <><IconRefresh className="h-4 w-4" /> Run again</>}
                        </button>
                      )}
                      <Link href={href} className="inline-flex items-center gap-1 font-semibold text-brand-700">
                        {draft ? 'Resume' : 'Open'}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                          <path d="M7 17 17 7M8 7h9v9" />
                        </svg>
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** All / Live / Pending / Fulfilled segmented filter shared by both pages. */
export type CampaignFilter = 'all' | 'live' | 'pending' | 'fulfilled';

export function CampaignFilterPills({ value, onChange }: { value: CampaignFilter; onChange: (v: CampaignFilter) => void }) {
  const opts: [CampaignFilter, string][] = [['all', 'All'], ['live', 'Live'], ['pending', 'Pending'], ['fulfilled', 'Fulfilled']];
  return (
    <div className="inline-flex rounded-full border border-rule bg-paper p-1 text-[13.5px] font-semibold">
      {opts.map(([k, label]) => (
        <button key={k} onClick={() => onChange(k)} className={`rounded-full px-5 py-1.5 transition ${value === k ? 'bg-ink text-paper' : 'text-muted hover:text-ink'}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function matchesFilter(status: string, filter: CampaignFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'live') return status === 'LIVE';
  if (filter === 'pending') return status === 'PENDING_APPROVAL' || status === 'CONFIRMING_PAYMENT';
  if (filter === 'fulfilled') return status === 'FULFILLED' || status === 'SETTLED' || status === 'ENDED';
  return true;
}
