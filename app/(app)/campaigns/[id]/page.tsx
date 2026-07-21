'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, type CampaignAnalytics } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useQuery({
    queryKey: ['campaign-analytics', id],
    queryFn: () => api.get<CampaignAnalytics>(`/v1/campaigns/${id}/analytics`),
  });

  if (isLoading) return <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand" /></div>;
  if (!data) return <p className="py-20 text-center text-muted">Campaign not found.</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-[24px] font-extrabold text-ink">{data.name}</h1>
      <p className="mt-2 text-muted">
        Full campaign detail + evidence gallery is being built next. Loaded: {data.views_delivered} views,{' '}
        {data.evidence.length} evidence items.
      </p>
    </div>
  );
}
