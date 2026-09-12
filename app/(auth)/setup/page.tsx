'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError, type ClientProfile, type ClientSocial } from '@/lib/api';
import { useRequireAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Spinner';
import { CATEGORIES } from '@/lib/campaign-options';

// Business sector uses the shared Category-of-Interest taxonomy.
const SECTORS = CATEGORIES;

const SOCIALS = [
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'X', label: 'X' },
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'FACEBOOK', label: 'Facebook' },
];

type SocialDetail = { url: string; followers: string };

/**
 * Optional "Setup your organization" step shown right after OTP verification.
 * The org itself is already created at registration (from the business name), so
 * everything here is optional profile detail - the client can Skip to the
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
  // Multi-select: which platforms are on, plus a link + follower count for each.
  const [selected, setSelected] = useState<string[]>([]);
  const [details, setDetails] = useState<Record<string, SocialDetail>>({});
  const [seeded, setSeeded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed once from the profile (name is already captured at registration).
  useEffect(() => {
    if (profileQuery.data && !seeded) {
      const p = profileQuery.data;
      setIndustry(p.industry ?? '');
      setWebsite(p.website ?? '');
      const socials = p.socials ?? [];
      setSelected(socials.map((s) => s.platform));
      setDetails(
        Object.fromEntries(
          socials.map((s) => [s.platform, { url: s.url ?? '', followers: s.followers != null ? String(s.followers) : '' }]),
        ),
      );
      setSeeded(true);
    }
  }, [profileQuery.data, seeded]);

  function toggle(platform: string) {
    setSelected((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform],
    );
    setDetails((prev) => (prev[platform] ? prev : { ...prev, [platform]: { url: '', followers: '' } }));
  }

  function setDetail(platform: string, patch: Partial<SocialDetail>) {
    setDetails((prev) => ({ ...prev, [platform]: { ...prev[platform], ...patch } }));
  }

  async function proceed() {
    setBusy(true); setError(null);
    try {
      // One entry per selected platform, in the pill order, with optional link/followers.
      const socials: ClientSocial[] = SOCIALS.filter((s) => selected.includes(s.value)).map((s) => {
        const d = details[s.value];
        return {
          platform: s.value,
          url: d?.url ? d.url : undefined,
          followers: d?.followers ? Number(d.followers) : undefined,
        };
      });
      await api.patch<ClientProfile>('/v1/clients/me', {
        industry: industry || undefined,
        website: website || undefined,
        socials,
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
              const on = selected.includes(sc.value);
              return (
                <button
                  key={sc.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(sc.value)}
                  className={`rounded-full px-5 py-2 text-[14px] font-semibold transition ${
                    on ? 'bg-ink text-paper' : 'border border-rule bg-paper text-ink hover:border-ink/30'
                  }`}
                >
                  {sc.label}
                </button>
              );
            })}
          </div>

          {/* A link + follower count per selected platform, in pill order. */}
          {SOCIALS.filter((s) => selected.includes(s.value)).map((sc) => (
            <div key={sc.value} className="mt-3">
              <p className="mb-1.5 text-[12.5px] font-semibold text-muted">{sc.label}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  value={details[sc.value]?.url ?? ''}
                  onChange={(e) => setDetail(sc.value, { url: e.target.value })}
                  placeholder="Link to channel"
                />
                <Input
                  type="number"
                  min={0}
                  value={details[sc.value]?.followers ?? ''}
                  onChange={(e) => setDetail(sc.value, { followers: e.target.value })}
                  placeholder="Number of followers"
                />
              </div>
            </div>
          ))}
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
