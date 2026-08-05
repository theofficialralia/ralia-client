'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError, uuid, type Campaign, type CampaignPlan, type Quote } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { CATEGORIES, LANGUAGES, OBJECTIVES, PLATFORMS, ROLES, STATES } from '@/lib/campaign-options';
import { loadPaystack, PAYSTACK_PUBLIC_KEY, paystackConfigured } from '@/lib/paystack';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { ChipSelect } from '@/components/ui/ChipSelect';
import { Stepper } from '@/components/campaigns/wizard/Stepper';

type State = {
  name: string; objective: string; description: string; instructions: string; destination_url: string; slots_total: number;
  imageFile: File | null; caption: string;
  states: string[]; age_min: string; age_max: string; languages: string[]; categories: string[];
  platforms: string[]; min_effective_reach: string; roles: string[];
};

const initial: State = {
  name: '', objective: 'AWARENESS', description: '', instructions: '', destination_url: '', slots_total: 5,
  imageFile: null, caption: '',
  states: [], age_min: '', age_max: '', languages: [], categories: [], platforms: [], min_effective_reach: '', roles: [],
};

export default function NewCampaignPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [s, setS] = useState<State>(initial);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<State>) => setS((prev) => ({ ...prev, ...patch }));

  // ── Step actions ─────────────────────────────────────────

  async function saveBrief() {
    if (!s.name.trim()) return setError('Give your campaign a name.');
    if (!/^https?:\/\//.test(s.destination_url)) return setError('Enter a valid destination URL (https://…).');
    setBusy(true); setError(null);
    try {
      const body = {
        name: s.name.trim(),
        objective: s.objective,
        description: s.description || undefined,
        promoter_instructions: s.instructions || undefined,
        destination_url: s.destination_url,
        slots_total: Number(s.slots_total),
      };
      const campaign = campaignId
        ? await api.patch<Campaign>(`/v1/campaigns/${campaignId}`, body)
        : await api.post<Campaign>('/v1/campaigns', body);
      setCampaignId(campaign.id);
      setQuote(null); // any brief change invalidates a prior quote
      setStep(2);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  async function saveAssets() {
    if (!campaignId) return;
    setBusy(true); setError(null);
    try {
      if (s.imageFile) {
        const form = new FormData();
        form.append('kind', 'IMAGE');
        form.append('file', s.imageFile);
        await api.postForm(`/v1/campaigns/${campaignId}/assets`, form);
      }
      if (s.caption.trim()) {
        const form = new FormData();
        form.append('kind', 'CAPTION');
        form.append('caption_text', s.caption.trim());
        await api.postForm(`/v1/campaigns/${campaignId}/assets`, form);
      }
      setStep(3);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not upload assets.');
    } finally {
      setBusy(false);
    }
  }

  async function saveTargeting() {
    if (!campaignId) return;
    if (!s.min_effective_reach || Number(s.min_effective_reach) <= 0) {
      return setError('Set a minimum effective reach — it is what each slot is priced on.');
    }
    setBusy(true); setError(null);
    try {
      await api.put(`/v1/campaigns/${campaignId}/targeting`, {
        states: s.states,
        age_min: s.age_min ? Number(s.age_min) : undefined,
        age_max: s.age_max ? Number(s.age_max) : undefined,
        languages: s.languages,
        categories: s.categories,
        platforms: s.platforms,
        min_effective_reach: Number(s.min_effective_reach),
        roles: s.roles,
      });
      setQuote(null);
      setStep(4);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save targeting.');
    } finally {
      setBusy(false);
    }
  }

  // Lock in the plan the slider settled on: save the slot count, then freeze the
  // price with a real quote. This is what enables "Continue to payment".
  async function commitPlan(slots: number) {
    if (!campaignId) return;
    setBusy(true); setError(null);
    try {
      await api.patch(`/v1/campaigns/${campaignId}`, { slots_total: slots });
      set({ slots_total: slots });
      const q = await api.post<Quote>(`/v1/campaigns/${campaignId}/quote`);
      setQuote(q);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not lock in the plan.');
    } finally {
      setBusy(false);
    }
  }

  async function pay() {
    if (!campaignId || !quote || !user) return;
    if (!paystackConfigured()) {
      return setError('Paystack is not configured. Add NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY to .env.local.');
    }
    setError(null);
    try {
      const paystack = await loadPaystack();
      const handler = paystack.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: user.email,
        amount: quote.price.amount_minor, // already kobo
        currency: 'NGN',
        ref: `RLA-${campaignId.slice(0, 8)}-${uuid().slice(0, 8)}`,
        metadata: { campaign_id: campaignId },
        onClose: () => setError('Payment window closed before completing.'),
        callback: (res) => { void confirmPayment(res.reference); },
      });
      handler.openIframe();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start payment.');
    }
  }

  async function confirmPayment(reference: string) {
    if (!campaignId) return;
    setBusy(true); setError(null);
    try {
      // The backend verifies the reference with Paystack (secret key) and only
      // then credits the campaign escrow and moves it LIVE.
      await api.post(`/v1/campaigns/${campaignId}/payments/paystack/verify`, { reference }, {
        idempotencyKey: uuid(),
      });
      router.replace(`/campaigns/${campaignId}?funded=1`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'We could not confirm the payment. If you were charged, contact support.');
      setBusy(false);
    }
  }

  const canContinue = useMemo(() => {
    if (step === 1) return s.name.trim() && s.destination_url;
    if (step === 3) return !!s.min_effective_reach;
    return true;
  }, [step, s]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <button onClick={() => router.push('/campaigns')} className="text-[14px] font-semibold text-muted hover:text-ink">
          ← Cancel &amp; return
        </button>
        <span className="text-[13px] text-muted">Step {step} of 5</span>
      </div>

      <div className="mt-5"><Stepper current={step} /></div>

      <div className="card mt-6 p-6 sm:p-8">
        {step === 1 && <Brief s={s} set={set} />}
        {step === 2 && <Assets s={s} set={set} />}
        {step === 3 && <Targeting s={s} set={set} />}
        {step === 4 && campaignId && <QuoteStep campaignId={campaignId} initialSlots={Number(s.slots_total)} quote={quote} committing={busy} onCommit={commitPlan} onDirty={() => setQuote(null)} />}
        {step === 5 && <Fund quote={quote} />}

        {error && (
          <div className="mt-5 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-[13px] text-brand-700">
            {error}
          </div>
        )}

        <div className="mt-7 flex items-center justify-between">
          <Button
            variant="secondary"
            onClick={() => (step === 1 ? router.push('/campaigns') : setStep((n) => n - 1))}
            disabled={busy}
          >
            ← Back
          </Button>

          {step === 1 && <Button onClick={saveBrief} loading={busy} disabled={!canContinue}>Continue →</Button>}
          {step === 2 && <Button onClick={saveAssets} loading={busy}>Continue →</Button>}
          {step === 3 && <Button onClick={saveTargeting} loading={busy} disabled={!canContinue}>Get quote →</Button>}
          {step === 4 && <Button onClick={() => setStep(5)} disabled={!quote || busy}>Continue to payment →</Button>}
          {step === 5 && <Button onClick={pay} loading={busy}>Pay with Paystack</Button>}
        </div>
      </div>
    </div>
  );
}

// ── Steps ──────────────────────────────────────────────────

function Brief({ s, set }: { s: State; set: (p: Partial<State>) => void }) {
  return (
    <div className="space-y-5">
      <Header title="Tell us about your campaign" subtitle="The basics promoters will see." />
      <Field label="Campaign name">
        <Input value={s.name} onChange={(e) => set({ name: e.target.value })} placeholder="Harmattan Drop" />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Objective">
          <Select value={s.objective} onChange={(e) => set({ objective: e.target.value })}>
            {OBJECTIVES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </Field>
        <Field label="Number of slots" hint="How many promoters you want.">
          <Input type="number" min={1} max={500} value={s.slots_total}
            onChange={(e) => set({ slots_total: Number(e.target.value) })} />
        </Field>
      </div>
      <Field label="Destination URL">
        <Input value={s.destination_url} onChange={(e) => set({ destination_url: e.target.value })} placeholder="https://yourbrand.com/shop" />
      </Field>
      <Field label="Description" hint="Optional.">
        <Textarea value={s.description} onChange={(e) => set({ description: e.target.value })} placeholder="What is this campaign about?" />
      </Field>
      <Field label="Instructions for promoters" hint="Optional.">
        <Textarea value={s.instructions} onChange={(e) => set({ instructions: e.target.value })} placeholder="Post the image to your status and leave it up 24h." />
      </Field>
    </div>
  );
}

function Assets({ s, set }: { s: State; set: (p: Partial<State>) => void }) {
  return (
    <div className="space-y-5">
      <Header title="Add your creative" subtitle="What promoters will post. You can skip and add these later." />
      <Field label="Campaign image" hint="JPEG, PNG or WebP, up to 10 MB.">
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-rule bg-wash py-10 text-center transition hover:border-brand/40">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => set({ imageFile: e.target.files?.[0] ?? null })}
          />
          {s.imageFile ? (
            <span className="text-[14px] font-semibold text-ink">{s.imageFile.name}</span>
          ) : (
            <>
              <span className="text-[14px] font-semibold text-ink">Click to upload</span>
              <span className="mt-1 text-[12.5px] text-muted">or drag an image here</span>
            </>
          )}
        </label>
      </Field>
      <Field label="Caption" hint="Optional — a suggested caption for promoters.">
        <Textarea value={s.caption} onChange={(e) => set({ caption: e.target.value })} placeholder="Shop the collection — link in my status." />
      </Field>
    </div>
  );
}

function Targeting({ s, set }: { s: State; set: (p: Partial<State>) => void }) {
  return (
    <div className="space-y-6">
      <Header title="Who should see it" subtitle="Each filter you add sharpens the match — and nudges the price." />
      <Field label="Minimum effective reach per promoter" hint="Each slot is priced on this. Required.">
        <Input type="number" min={0} value={s.min_effective_reach}
          onChange={(e) => set({ min_effective_reach: e.target.value })} placeholder="1000" />
      </Field>
      <Field label="Platforms">
        <ChipSelect options={PLATFORMS} value={s.platforms} onChange={(v) => set({ platforms: v })} />
      </Field>
      <Field label="Promoter roles">
        <ChipSelect options={ROLES} value={s.roles} onChange={(v) => set({ roles: v })} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Minimum age">
          <Input type="number" min={13} max={100} value={s.age_min} onChange={(e) => set({ age_min: e.target.value })} placeholder="18" />
        </Field>
        <Field label="Maximum age">
          <Input type="number" min={13} max={100} value={s.age_max} onChange={(e) => set({ age_max: e.target.value })} placeholder="45" />
        </Field>
      </div>
      <Field label="Categories">
        <ChipSelect options={CATEGORIES} value={s.categories} onChange={(v) => set({ categories: v })} />
      </Field>
      <Field label="Languages">
        <ChipSelect options={LANGUAGES} value={s.languages} onChange={(v) => set({ languages: v })} />
      </Field>
      <Field label="States">
        <ChipSelect options={STATES} value={s.states} onChange={(v) => set({ states: v })} scroll />
      </Field>
    </div>
  );
}

const MAX_SLIDER_SLOTS = 60;

function QuoteStep({ campaignId, initialSlots, quote, committing, onCommit, onDirty }: {
  campaignId: string;
  initialSlots: number;
  quote: Quote | null;
  committing: boolean;
  onCommit: (slots: number) => void;
  onDirty: () => void;
}) {
  const [plan, setPlan] = useState<CampaignPlan | null>(null);
  const [budget, setBudget] = useState<number | null>(null); // kobo
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Seed the plan (and the budget) from the slot count the client came in with.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await api.post<CampaignPlan>(`/v1/campaigns/${campaignId}/plan`, { slots: initialSlots });
        if (!cancelled) { setPlan(p); setBudget(p.total_price.amount_minor || p.unit_price.amount_minor); }
      } catch (e) { if (!cancelled) setErr(e instanceof ApiError ? e.message : 'Could not price the campaign.'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [campaignId, initialSlots]);

  // Re-price against the server as the slider settles (debounced) — the endpoint is
  // the source of truth, so the total always snaps to whole slots the budget covers.
  useEffect(() => {
    if (budget == null) return;
    const t = setTimeout(async () => {
      try { setPlan(await api.post<CampaignPlan>(`/v1/campaigns/${campaignId}/plan`, { budget_minor: budget })); }
      catch { /* keep the last good plan */ }
    }, 220);
    return () => clearTimeout(t);
  }, [budget, campaignId]);

  if (loading || !plan) {
    return (
      <div>
        <Header title="Set your budget" subtitle="Trade budget for reach." />
        <div className="py-10 text-center text-muted">{err ?? 'Pricing your campaign…'}</div>
      </div>
    );
  }

  const unit = plan.unit_price.amount_minor;
  const max = unit * MAX_SLIDER_SLOTS;
  const locked = quote != null && quote.slots_total === plan.slots;

  return (
    <div>
      <Header title="Set your budget" subtitle="Slide to trade budget for reach. We price whole slots, so the total snaps to what your budget fully covers." />
      <div className="mt-2 space-y-5">
        <div className="rounded-2xl border border-brand/20 bg-brand/[0.03] p-6 text-center">
          <p className="text-[13px] text-muted">Total campaign price</p>
          <p className="mt-1 text-[36px] font-extrabold tracking-tight text-ink">{plan.total_price.amount_display}</p>
          <p className="mt-1 text-[13px] text-muted">{plan.unit_price.amount_display} per slot × {plan.slots} slots</p>
        </div>

        <div>
          <input
            type="range" min={unit} max={max} step={unit}
            value={Math.min(Math.max(budget ?? unit, unit), max)}
            onChange={(e) => { if (quote) onDirty(); setBudget(Number(e.target.value)); }}
            className="w-full accent-brand"
          />
          <div className="flex justify-between text-[11px] text-muted"><span>1 slot</span><span>{MAX_SLIDER_SLOTS} slots</span></div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Mini label="Slots (promoters)" value={plan.slots.toLocaleString('en-NG')} />
          <Mini label="Est. total reach" value={plan.estimated_total_reach.toLocaleString('en-NG')} />
          <Mini label="Each promoter earns" value={plan.promoter_fee.amount_display} />
        </div>

        {locked ? (
          <div className="rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-[13px] font-semibold text-brand-700">
            ✓ Locked in at {quote!.price.amount_display} — continue to payment.
          </div>
        ) : (
          <Button className="w-full" loading={committing} disabled={plan.slots < 1} onClick={() => onCommit(plan.slots)}>
            {plan.slots < 1 ? 'Raise your budget to cover a slot' : `Lock in ${plan.slots} slots`}
          </Button>
        )}
      </div>
    </div>
  );
}

function Fund({ quote }: { quote: Quote | null }) {
  return (
    <div>
      <Header title="Fund the campaign" subtitle="Pay securely with Paystack. Your campaign goes live the moment payment clears." />
      <div className="mt-2 rounded-2xl border border-rule p-6">
        <div className="flex items-baseline justify-between">
          <span className="text-[14px] text-muted">Amount to pay</span>
          <span className="text-[28px] font-extrabold tracking-tight text-brand">{quote?.price.amount_display ?? '—'}</span>
        </div>
        <div className="mt-5 flex items-center gap-3 rounded-xl bg-wash px-4 py-3 text-[13px] text-muted">
          <PaystackGlyph />
          Card details are entered in Paystack&apos;s secure window — Ralia never sees your card number.
        </div>
      </div>
    </div>
  );
}

// ── Bits ───────────────────────────────────────────────────

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-[22px] font-extrabold tracking-tight text-ink">{title}</h2>
      <p className="mt-1 text-[14px] text-muted">{subtitle}</p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-rule bg-paper p-4 text-center">
      <p className="text-[12px] text-muted">{label}</p>
      <p className="mt-1 text-[17px] font-bold text-ink">{value}</p>
    </div>
  );
}

function PaystackGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
    </svg>
  );
}
