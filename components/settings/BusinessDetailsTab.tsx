'use client';

import { useState } from 'react';
import { api, ApiError, type ClientProfile } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';

const SECTORS = [
  'Food & Drink', 'Fashion', 'Beauty', 'Tech', 'Finance', 'Health', 'Education',
  'Entertainment', 'Retail', 'Services', 'Other',
];

export function BusinessDetailsTab({ profile, onSaved }: { profile: ClientProfile; onSaved: () => void }) {
  const [f, setF] = useState({
    name: profile.name ?? '',
    industry: profile.industry ?? '',
    phone_whatsapp: profile.phone_whatsapp ?? '',
    website: profile.website ?? '',
    address: profile.address ?? '',
    cac_number: profile.cac_number ?? '',
    support_contact_name: profile.support_contact_name ?? '',
    support_contact_phone: profile.support_contact_phone ?? '',
    description: profile.description ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const set = (patch: Partial<typeof f>) => {
    setF((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  };

  async function save() {
    setBusy(true); setError(null); setSaved(false);
    try {
      await api.patch<ClientProfile>('/v1/clients/me', f);
      setSaved(true);
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save your details.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Identity card */}
      <section className="card p-6 sm:p-8">
        <div className="flex flex-col items-center">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-brand text-[28px] font-bold text-white">
            {profile.name.slice(0, 1).toUpperCase()}
          </span>
          {/* Logo upload UI only — no org-logo upload endpoint yet (integration follow-up). */}
          <button
            type="button"
            title="Logo upload is a fast-follow"
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-rule bg-paper px-4 py-2 text-[13.5px] font-semibold text-ink opacity-60"
            disabled
          >
            ↑ Upload logo
          </button>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
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
          <Field label="Email" hint="Your login email. Contact support to change it.">
            <Input value={profile.email} readOnly disabled className="opacity-70" />
          </Field>
          <Field label="Website / Instagram">
            <Input value={f.website} onChange={(e) => set({ website: e.target.value })} placeholder="instagram.com/yourbrand" />
          </Field>
          <Field label="WhatsApp number">
            <Input value={f.phone_whatsapp} onChange={(e) => set({ phone_whatsapp: e.target.value })} placeholder="+234 803 555 0192" />
          </Field>
        </div>
      </section>

      {/* Optional details card */}
      <section className="card p-6 sm:p-8">
        <h2 className="text-[19px] font-extrabold tracking-tight text-ink">Business details</h2>
        <p className="mt-1 text-[13.5px] text-muted">Optional, but it helps our team and speeds up campaign approval.</p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label="Registered business address">
            <Input value={f.address} onChange={(e) => set({ address: e.target.value })} placeholder="Street, city, state" />
          </Field>
          <Field label="CAC / registration number">
            <Input value={f.cac_number} onChange={(e) => set({ cac_number: e.target.value })} placeholder="RC 1234567" />
          </Field>
          <Field label="Support contact person">
            <Input value={f.support_contact_name} onChange={(e) => set({ support_contact_name: e.target.value })} placeholder="David Blake" />
          </Field>
          <Field label="Support contact person number">
            <Input value={f.support_contact_phone} onChange={(e) => set({ support_contact_phone: e.target.value })} placeholder="+234 803 555 0192" />
          </Field>
        </div>
        <div className="mt-5">
          <Field label="Business description">
            <Textarea value={f.description} onChange={(e) => set({ description: e.target.value })} placeholder="A couple of sentences about what you do." />
          </Field>
        </div>

        {error && <p className="mt-4 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-[13px] text-brand-700">{error}</p>}

        <div className="mt-6 flex items-center gap-4">
          <Button onClick={save} size="lg" loading={busy}>Save details</Button>
          {saved && <span className="text-[13.5px] font-semibold text-ok">Saved ✓</span>}
        </div>
      </section>
    </div>
  );
}
