'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError, type ClientProfile } from '@/lib/api';
import { useRequireAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Spinner';

const SECTORS = [
  'Food & Drink', 'Fashion', 'Beauty', 'Tech', 'Finance', 'Health', 'Education',
  'Entertainment', 'Retail', 'Services', 'Other',
];

/**
 * Optional "Set up your organisation" step shown right after OTP verification.
 * The org itself is already created at registration (from the business name), so
 * everything here is optional profile detail that speeds up campaign approval —
 * the client can Skip to the dashboard and fill it later under Settings.
 */
export default function SetupPage() {
  const router = useRouter();
  const { user, loading } = useRequireAuth();

  const profileQuery = useQuery({
    queryKey: ['client-profile'],
    queryFn: () => api.get<ClientProfile>('/v1/clients/me'),
    enabled: !!user,
  });

  const [f, setF] = useState({
    name: '', industry: '', phone_whatsapp: '', website: '',
    address: '', cac_number: '', support_contact_name: '', support_contact_phone: '', description: '',
  });
  const [seeded, setSeeded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed once from the profile (the business name is already set at registration).
  useEffect(() => {
    if (profileQuery.data && !seeded) {
      const p = profileQuery.data;
      setF({
        name: p.name ?? '',
        industry: p.industry ?? '',
        phone_whatsapp: p.phone_whatsapp ?? '',
        website: p.website ?? '',
        address: p.address ?? '',
        cac_number: p.cac_number ?? '',
        support_contact_name: p.support_contact_name ?? '',
        support_contact_phone: p.support_contact_phone ?? '',
        description: p.description ?? '',
      });
      setSeeded(true);
    }
  }, [profileQuery.data, seeded]);

  const set = (patch: Partial<typeof f>) => setF((prev) => ({ ...prev, ...patch }));

  async function saveAndContinue() {
    setBusy(true); setError(null);
    try {
      await api.patch<ClientProfile>('/v1/clients/me', f);
      router.replace('/dashboard');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save your details.');
      setBusy(false);
    }
  }

  if (loading || !user || profileQuery.isLoading) {
    return <div className="flex justify-center py-10"><Spinner className="h-8 w-8 text-brand" /></div>;
  }

  return (
    <div>
      <div className="mb-7">
        <p className="text-[13px] font-semibold text-brand-700">One last thing</p>
        <h1 className="mt-1 text-[26px] font-extrabold leading-tight tracking-tight text-ink">
          Set up your organisation.
        </h1>
        <p className="mt-1.5 text-[14px] text-muted">
          Optional, but it helps our team approve your campaigns faster. You can skip and finish this later in Settings.
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business name">
            <Input value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="Skinsmith Ltd" />
          </Field>
          <Field label="Sector">
            <select
              className="input appearance-none pr-10"
              value={f.industry}
              onChange={(e) => set({ industry: e.target.value })}
            >
              <option value="">Select a sector</option>
              {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Website / Instagram">
            <Input value={f.website} onChange={(e) => set({ website: e.target.value })} placeholder="instagram.com/yourbrand" />
          </Field>
          <Field label="WhatsApp number">
            <Input value={f.phone_whatsapp} onChange={(e) => set({ phone_whatsapp: e.target.value })} placeholder="+234 803 555 0192" />
          </Field>
          <Field label="Registered business address">
            <Input value={f.address} onChange={(e) => set({ address: e.target.value })} placeholder="Street, city, state" />
          </Field>
          <Field label="CAC / registration number">
            <Input value={f.cac_number} onChange={(e) => set({ cac_number: e.target.value })} placeholder="RC 1234567" />
          </Field>
          <Field label="Support contact person">
            <Input value={f.support_contact_name} onChange={(e) => set({ support_contact_name: e.target.value })} placeholder="David Blake" />
          </Field>
          <Field label="Support contact number">
            <Input value={f.support_contact_phone} onChange={(e) => set({ support_contact_phone: e.target.value })} placeholder="+234 803 555 0192" />
          </Field>
        </div>

        <Field label="Business description" hint="Optional.">
          <Textarea value={f.description} onChange={(e) => set({ description: e.target.value })} placeholder="A couple of sentences about what you do." />
        </Field>

        {error && (
          <div className="rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-[13px] text-brand-700">{error}</div>
        )}

        <div className="flex items-center gap-4 pt-1">
          <Button onClick={saveAndContinue} size="lg" loading={busy}>Save &amp; continue →</Button>
          <button
            type="button"
            onClick={() => router.replace('/dashboard')}
            disabled={busy}
            className="text-[14px] font-semibold text-muted hover:text-ink disabled:opacity-50"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
