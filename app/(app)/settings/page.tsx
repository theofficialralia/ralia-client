'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type ClientProfile } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { BusinessDetailsTab } from '@/components/settings/BusinessDetailsTab';
import { NotificationsTab } from '@/components/settings/NotificationsTab';
import { SecurityTab } from '@/components/settings/SecurityTab';

const TABS = ['Business details', 'Notifications', 'Security'] as const;
type Tab = (typeof TABS)[number];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('Business details');
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['client-profile'],
    queryFn: () => api.get<ClientProfile>('/v1/clients/me'),
  });

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-[28px] font-extrabold tracking-tight text-ink">Profile &amp; settings</h1>
      <p className="mt-1 text-[15px] text-muted">Manage your business details, notifications and account security.</p>

      {/* Tabs */}
      <div className="mt-6 border-b border-rule">
        <div className="flex gap-8">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative pb-3 text-[15px] font-semibold transition ${
                tab === t ? 'text-ink' : 'text-muted hover:text-ink'
              }`}
            >
              {t}
              {tab === t && <span className="absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-brand" />}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 animate-fade-in">
        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand" /></div>
        ) : (
          <>
            {tab === 'Business details' && data && (
              <BusinessDetailsTab profile={data} onSaved={() => qc.invalidateQueries({ queryKey: ['client-profile'] })} />
            )}
            {tab === 'Notifications' && <NotificationsTab />}
            {tab === 'Security' && <SecurityTab />}
          </>
        )}
      </div>
    </div>
  );
}
