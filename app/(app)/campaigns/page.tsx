'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, type DashboardSummary } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { CampaignFilterPills, CampaignsTable, matchesFilter, type CampaignFilter } from '@/components/campaigns/CampaignsTable';

export default function CampaignsPage() {
  const [filter, setFilter] = useState<CampaignFilter>('all');
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.get<DashboardSummary>('/v1/dashboard/summary'),
  });

  const rows = data?.campaigns ?? [];
  const counts = useMemo(() => ({
    all: rows.length,
    live: rows.filter((c) => matchesFilter(c.status, 'live')).length,
    fulfilled: rows.filter((c) => matchesFilter(c.status, 'fulfilled')).length,
    pending: rows.filter((c) => matchesFilter(c.status, 'pending')).length,
  }), [rows]);
  const filtered = rows.filter((c) => matchesFilter(c.status, filter));

  return (
    <div className="mx-auto max-w-6xl">
      {/* The header already has a "New campaign" button, so this page doesn't repeat it. */}
      <div>
        <p className="text-[13px] font-semibold text-brand-700">My Campaigns</p>
        <h1 className="text-[26px] font-extrabold tracking-tight text-ink">Everything you&apos;re running</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand" /></div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="All campaigns" value={counts.all} />
            <KpiCard label="Live campaigns" value={counts.live} />
            <KpiCard label="Fulfilled" value={counts.fulfilled} />
            <KpiCard label="Pending review" value={counts.pending} />
          </div>

          <div className="mt-6 mb-4">
            <CampaignFilterPills value={filter} onChange={setFilter} />
          </div>

          <CampaignsTable
            rows={filtered}
            empty={
              rows.length === 0 ? undefined : (
                <p className="text-[14px] text-muted">No campaigns in this filter.</p>
              )
            }
          />
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-card">
      <p className="text-[13px] text-muted">{label}</p>
      <p className="mt-1.5 text-[26px] font-extrabold tracking-tight text-ink">{value}</p>
    </div>
  );
}
