'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api, type Campaign } from '@/lib/api';
import { StatusPill } from '@/components/ui/StatusPill';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

export default function CampaignsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api.get<Campaign[]>('/v1/campaigns'),
  });

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] text-muted">Campaigns</p>
          <h1 className="text-[26px] font-extrabold tracking-tight text-ink">My campaigns</h1>
        </div>
        <Link href="/campaigns/new">
          <Button>
            <span className="text-lg leading-none">+</span> New campaign
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand" /></div>
      ) : data && data.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((c) => {
            // Half-finished campaigns resume in the wizard; the rest open their
            // delivery view. (A draft has no delivery data to show.)
            const draft = c.status === 'DRAFT' || c.status === 'QUOTED';
            const href = draft ? `/campaigns/new?id=${c.id}` : `/campaigns/${c.id}`;
            return (
              <Link key={c.id} href={href} className="card p-5 transition hover:shadow-lg">
                <div className="flex items-center justify-between">
                  <StatusPill status={c.status} />
                  <span className="text-[12.5px] text-muted">{c.slots_total} slots</span>
                </div>
                <h3 className="mt-3 text-[16px] font-bold text-ink">{c.name}</h3>
                <p className="mt-1 text-[13px] capitalize text-muted">{c.objective.toLowerCase().replace('_', ' ')}</p>
                <div className="mt-4 flex items-baseline justify-between border-t border-rule pt-4">
                  <span className="text-[13px] text-muted">{draft ? 'Continue setup' : 'Budget'}</span>
                  <span className={`font-bold ${draft ? 'text-brand-700' : 'text-ink'}`}>{draft ? 'Resume →' : c.budget.amount_display}</span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="card mt-6 px-6 py-20 text-center">
          <p className="text-[15px] font-semibold text-ink">No campaigns yet</p>
          <p className="mt-1 text-[13.5px] text-muted">Your campaigns will appear here once you create one.</p>
          <Link href="/campaigns/new" className="mt-4 inline-block font-semibold text-brand-700">+ New campaign</Link>
        </div>
      )}
    </div>
  );
}
