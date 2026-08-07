'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError, type ClientProfile } from '@/lib/api';
import { useRequireAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Spinner';

const SECTORS = [
  'Food & drink', 'Fashion', 'Beauty', 'Tech', 'Finance', 'Health', 'Education',
  'Entertainment', 'Retail', 'Services', 'Other',
];

const SOCIALS = [
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'X', label: 'X' },
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'FACEBOOK', label: 'Facebook' },
];

/**
 * Optional "Setup your organization" step shown right after OTP verification.
 * The org itself is already created at registration (from the business name), so
 * everything here is optional profile detail — the client can Skip to the
 * dashboard and finish it later under Settings.
 */
export default function SetupPage() {
  const router = useRouter();
  const { user, loading } = useRequireAuth();

  const profileQuery = useQuery({
    queryKey: ['client-profile'],
    queryFn: () => api.get<ClientProfile>('/v1/clients/me'),
    enabled: !!user,
  });

  const [industry, setIndustry] = useState('');
  const [website, setWebsite] = useState('');
  const [social, setSocial] = useState('WHATSAPP');
  const [socialUrl, setSocialUrl] = useState('');
  const [followers, setFollowers] = useState('');
  const [seeded, setSeeded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed once from the profile (name is already captured at registration).
  useEffect(() => {
    if (profileQuery.data && !seeded) {
      const p = profileQuery.data;
      setIndustry(p.industry ?? '');
      setWebsite(p.website ?? '');
      setSocial(p.social_platform ?? 'WHATSAPP');
      setSocialUrl(p.social_url ?? '');
      setFollowers(p.social_followers != null ? String(p.social_followers) : '');
      setSeeded(true);
    }
  }, [profileQuery.data, seeded]);

  async function proceed() {
    setBusy(true); setError(null);
    try {
      await api.patch<ClientProfile>('/v1/clients/me', {
        industry: industry || undefined,
        website: website || undefined,
        social_platform: social,
        social_url: socialUrl || undefined,
        social_followers: followers ? Number(followers) : undefined,
      });
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
        <p className="text-[13px] font-semibold text-brand-700">Final step</p>
        <h1 className="mt-1 text-[26px] font-extrabold leading-tight tracking-tight text-ink">
          Setup your <span className="text-brand">organization</span>
        </h1>
        <p className="mt-1.5 text-[14px] text-muted">
          This appears on your invoices and to promoters as the campaign owner.
        </p>
      </div>

      <div className="space-y-5">
        <Field label="What does your business do?">
          <select
            className="input appearance-none pr-10"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
          >
            <option value="">Select a sector</option>
            {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>

        <Field label="Website (optional)">
          <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="your website" />
        </Field>

        <div>
          <p className="mb-2 text-[13.5px] font-semibold text-ink">Your socials</p>
          <div className="flex flex-wrap gap-2.5">
            {SOCIALS.map((sc) => {
              const on = social === sc.value;
              return (
                <button
                  key={sc.value}
                  type="button"
                  onClick={() => setSocial(sc.value)}
                  className={`rounded-full px-5 py-2 text-[14px] font-semibold transition ${
                    on ? 'bg-ink text-white' : 'border border-rule bg-paper text-ink hover:border-ink/30'
                  }`}
                >
                  {sc.label}
                </button>
              );
            })}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Input value={socialUrl} onChange={(e) => setSocialUrl(e.target.value)} placeholder="Link to channel" />
            <Input
              type="number"
              min={0}
              value={followers}
              onChange={(e) => setFollowers(e.target.value)}
              placeholder="Number of followers"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-[13px] text-brand-700">{error}</div>
        )}

        <Button onClick={proceed} size="lg" block loading={busy} className="mt-1">Proceed</Button>
        <button
          type="button"
          onClick={() => router.replace('/dashboard')}
          disabled={busy}
          className="block w-full text-center text-[14px] font-semibold text-brand-700 hover:text-brand disabled:opacity-50"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
