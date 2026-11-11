'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError, uuid, type Campaign, type CampaignPlan, type Quote } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { loadPaystack, PAYSTACK_PUBLIC_KEY, paystackConfigured } from '@/lib/paystack';
import { getFbCookies, newEventId, track } from '@/lib/meta-pixel';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { IconArrowLeft, IconArrowRight, IconCheck, IconSparkle, IconUpload } from '@/components/brand/icons';

// ─────────────────────────────────────────────────────────────
// The three services. Only "Promote Existing" is wired end-to-end today; UGC and
// Enterprise are shown so the client can see the full shape, and route to a
// "coming soon" screen until their backends land.
// ─────────────────────────────────────────────────────────────

type Service = 'PROMOTE' | 'UGC' | 'ENTERPRISE';

const SERVICES: { id: Service; title: string; tag: string; body: string; ready: boolean }[] = [
  {
    id: 'PROMOTE',
    title: 'Promote existing content',
    tag: 'Live',
    body: 'Upload what you already have (or have us design it) and we put it in front of the right people. ₦15,000 per 1,000 people reached.',
    ready: true,
  },
  {
    id: 'UGC',
    title: 'Create UGC content',
    tag: 'Coming soon',
    body: 'Creators make fresh content about your product. You approve each piece before it posts. ₦100,000 per 5,000 people reached.',
    ready: false,
  },
  {
    id: 'ENTERPRISE',
    title: 'Enterprise',
    tag: 'Coming soon',
    body: 'A hands-on package for companies — your own account manager, strategy and hand-picked creators. From ₦1,000,000.',
    ready: false,
  },
];

// Targeting option sets (age/location/religion only, per the redesign).
const LOCATIONS = [
  { label: 'Lagos', states: ['Lagos'] },
  { label: 'Abuja', states: ['FCT'] },
  { label: 'Port Harcourt', states: ['Rivers'] },
  { label: 'Ibadan', states: ['Oyo'] },
];
const AGE_BUCKETS = [
  { label: '18-30', min: 18, max: 30 },
  { label: '31-40', min: 31, max: 40 },
  { label: '41-50', min: 41, max: 50 },
  { label: '51-60+', min: 51, max: 100 },
];
const RELIGIONS = ['Christianity', 'Islam', 'Others'];

// Quick reach presets the client can tap instead of typing.
const REACH_PRESETS = [1000, 2000, 5000, 10000, 25000];

type State = {
  name: string;
  endsAt: string;
  destinationUrl: string;
  creativeMode: '' | 'HAVE' | 'DESIGN';
  assetFiles: File[];
  locations: string[];
  ageBuckets: string[];
  religions: string[];
  targetReach: string;
};

const initial: State = {
  name: '',
  endsAt: '',
  destinationUrl: '',
  creativeMode: '',
  assetFiles: [],
  locations: [],
  ageBuckets: [],
  religions: [],
  targetReach: '',
};

const PROMOTE_STEPS = ['Campaign', 'Audience', 'Reach & price', 'Pay'];

function NewCampaignInner() {
  const router = useRouter();
  const { user } = useAuth();
  const resumeId = useSearchParams().get('id');

  const [service, setService] = useState<Service | null>(null);
  const [comingSoon, setComingSoon] = useState<Service | null>(null);
  const [step, setStep] = useState(1);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [s, setS] = useState<State>(initial);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrating, setHydrating] = useState(!!resumeId);

  const set = (patch: Partial<State>) => setS((prev) => ({ ...prev, ...patch }));

  // Resume a draft/quoted Promote campaign: load it, jump to the reach & price step.
  useEffect(() => {
    if (!resumeId) return;
    let cancelled = false;
    (async () => {
      try {
        const c = await api.get<Campaign>(`/v1/campaigns/${resumeId}`);
        if (cancelled) return;
        setService('PROMOTE');
        setCampaignId(c.id);
        setS((prev) => ({
          ...prev,
          name: c.name,
          endsAt: c.ends_at ? c.ends_at.slice(0, 10) : '',
          destinationUrl: c.destination_url ?? '',
        }));
        setStep(3);
      } catch {
        // fall back to a fresh wizard
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();
    return () => { cancelled = true; };
  }, [resumeId]);

  // ── Actions ──────────────────────────────────────────────

  async function saveCampaign() {
    if (!s.name.trim()) return setError('Give your campaign a name.');
    if (!s.creativeMode) return setError('Choose whether you have the content or want us to create it.');
    if (s.creativeMode === 'DESIGN') {
      // "Design one for me" is the UGC service — send them there.
      setComingSoon('UGC');
      return;
    }
    const hasDestination = /^https?:\/\//.test(s.destinationUrl);
    if (s.destinationUrl.trim() && !hasDestination) return setError('That link isn’t a valid URL (https://…).');
    if (s.endsAt && s.endsAt < new Date().toISOString().slice(0, 10)) return setError('The deadline can’t be in the past.');

    setBusy(true); setError(null);
    try {
      const body = {
        name: s.name.trim(),
        objective: 'AWARENESS', // retained by the API but no longer drives price
        destination_url: hasDestination ? s.destinationUrl : null,
        slots_total: 1, // placeholder — the reach-driven quote sets the real count
        ends_at: s.endsAt || null,
      };
      const campaign = campaignId
        ? await api.patch<Campaign>(`/v1/campaigns/${campaignId}`, body)
        : await api.post<Campaign>('/v1/campaigns', body);
      setCampaignId(campaign.id);

      // Upload any assets the client has.
      for (const file of s.assetFiles) {
        const form = new FormData();
        form.append('kind', assetKind(file));
        form.append('file', file);
        await api.postForm(`/v1/campaigns/${campaign.id}/assets`, form);
      }
      await api.patch(`/v1/campaigns/${campaign.id}`, { needs_creative: false });
      setQuote(null);
      setStep(2);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  async function saveTargeting() {
    if (!campaignId) return;
    setBusy(true); setError(null);
    try {
      const states = [...new Set(LOCATIONS.filter((l) => s.locations.includes(l.label)).flatMap((l) => l.states))];
      const bounded = AGE_BUCKETS.filter((a) => s.ageBuckets.includes(a.label));
      await api.put(`/v1/campaigns/${campaignId}/targeting`, {
        states,
        age_min: bounded.length ? Math.min(...bounded.map((a) => a.min)) : undefined,
        age_max: bounded.length ? Math.max(...bounded.map((a) => a.max)) : undefined,
        religions: s.religions,
      });
      setQuote(null);
      setStep(3);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save your audience.');
    } finally {
      setBusy(false);
    }
  }

  // Lock in the reach the client chose: the quote freezes the flat price and moves
  // the campaign to QUOTED, ready to pay.
  async function lockQuote() {
    if (!campaignId) return;
    const reach = parseInt(s.targetReach, 10);
    if (!reach || reach < 1) return setError('Enter how many people you want to reach.');
    setBusy(true); setError(null);
    try {
      const q = await api.post<Quote>(`/v1/campaigns/${campaignId}/quote`, { target_reach: reach });
      setQuote(q);
      setStep(4);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not lock in your reach.');
    } finally {
      setBusy(false);
    }
  }

  // Pay (Paystack). Funds escrow and sends the campaign to admin review; it goes
  // live once an admin approves it.
  async function pay() {
    if (!campaignId || !quote || !user) return;
    if (!paystackConfigured()) {
      return setError('Paystack is not configured. Add NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY to .env.local.');
    }
    setError(null);
    const eventId = newEventId();
    const amount = quote.price.amount_minor / 100;
    track('InitiateCheckout', { currency: 'NGN', value: amount, content_ids: [campaignId] });
    try {
      const paystack = await loadPaystack();
      paystack.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: user.email,
        amount: quote.price.amount_minor,
        currency: 'NGN',
        ref: `RLA-${campaignId.slice(0, 8)}-${uuid().slice(0, 8)}`,
        metadata: { campaign_id: campaignId },
        onClose: () => setError('Payment window closed before completing.'),
        callback: (res) => { void confirmPayment(res.reference, eventId, amount); },
      }).openIframe();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start payment.');
    }
  }

  async function confirmPayment(reference: string, eventId: string, amount: number) {
    if (!campaignId) return;
    setBusy(true); setError(null);
    try {
      const { fbp, fbc } = getFbCookies();
      await api.post(
        `/v1/campaigns/${campaignId}/payments/paystack/verify`,
        { reference, event_id: eventId, fbp, fbc, event_source_url: window.location.href },
        { idempotencyKey: uuid() },
      );
      track('Purchase', { currency: 'NGN', value: amount, content_ids: [campaignId], content_type: 'product' }, eventId);
      router.replace(`/campaigns/${campaignId}?submitted=1`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'We could not confirm the payment. If you were charged, contact support.');
      setBusy(false);
    }
  }

  // ── Render ───────────────────────────────────────────────

  if (hydrating) {
    return <div className="flex justify-center py-24"><Spinner className="h-8 w-8 text-brand" /></div>;
  }

  if (comingSoon) {
    return <ComingSoon service={comingSoon} onBack={() => { setComingSoon(null); setService(null); }} />;
  }

  // Service picker (the entry screen).
  if (!service) {
    return <ServicePicker onPick={(id, ready) => (ready ? setService(id) : setComingSoon(id))} onCancel={() => router.push('/campaigns')} />;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <button
          onClick={() => (step === 1 ? setService(null) : setStep((n) => n - 1))}
          className="flex items-center gap-1.5 text-[15px] font-semibold text-muted hover:text-ink"
        >
          <IconArrowLeft className="h-4 w-4" /> {step === 1 ? 'Back to services' : 'Back'}
        </button>
        <span className="text-[13px] text-muted">Step {step} of 4</span>
      </div>

      <div className="mt-5"><PromoteStepper current={step} /></div>

      <div className="mt-6">
        {step === 1 && <CampaignStep s={s} set={set} />}
        {step === 2 && <AudienceStep s={s} set={set} />}
        {step === 3 && campaignId && <ReachStep campaignId={campaignId} reach={s.targetReach} setReach={(v) => set({ targetReach: v })} />}
        {step === 4 && <PayStep quote={quote} />}

        {error && (
          <div className="mt-5 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-[13px] text-brand-700">{error}</div>
        )}

        <div className="mt-7 flex items-center justify-between">
          <Button variant="secondary" onClick={() => (step === 1 ? setService(null) : setStep((n) => n - 1))} disabled={busy}>
            <IconArrowLeft className="h-4 w-4" /> Back
          </Button>
          {step === 1 && <Button onClick={saveCampaign} loading={busy}>Continue <IconArrowRight className="h-4 w-4" /></Button>}
          {step === 2 && <Button onClick={saveTargeting} loading={busy}>Continue <IconArrowRight className="h-4 w-4" /></Button>}
          {step === 3 && <Button onClick={lockQuote} loading={busy}>See price &amp; continue <IconArrowRight className="h-4 w-4" /></Button>}
          {step === 4 && <Button onClick={pay} loading={busy} disabled={!quote}>Pay with Paystack</Button>}
        </div>
      </div>
    </div>
  );
}

// ── Service picker ─────────────────────────────────────────

function ServicePicker({ onPick, onCancel }: { onPick: (id: Service, ready: boolean) => void; onCancel: () => void }) {
  return (
    <div className="mx-auto max-w-3xl">
      <button onClick={onCancel} className="flex items-center gap-1.5 text-[15px] font-semibold text-muted hover:text-ink">
        <IconArrowLeft className="h-4 w-4" /> Cancel &amp; return
      </button>
      <div className="mt-6">
        <Header title="What would you like to do?" subtitle="Pick a service to get started. You can always run another later." />
      </div>
      <div className="mt-6 grid gap-4">
        {SERVICES.map((svc) => (
          <button
            key={svc.id}
            onClick={() => onPick(svc.id, svc.ready)}
            className="group flex items-start gap-4 rounded-2xl border border-rule bg-paper p-5 text-left transition hover:border-brand/40 hover:bg-brand/[0.03]"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
              <IconSparkle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-[16px] font-bold text-ink">{svc.title}</h3>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${svc.ready ? 'bg-emerald-50 text-emerald-700' : 'bg-wash text-muted'}`}>
                  {svc.tag}
                </span>
              </div>
              <p className="mt-1 text-[14px] leading-relaxed text-muted">{svc.body}</p>
            </div>
            <IconArrowRight className="mt-1 h-5 w-5 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
          </button>
        ))}
      </div>
    </div>
  );
}

function ComingSoon({ service, onBack }: { service: Service; onBack: () => void }) {
  const copy =
    service === 'UGC'
      ? { title: 'UGC is almost ready', body: 'Creating UGC content — where creators make fresh posts about your product and you approve each one before it goes out — is coming soon. We’ll let you know the moment it’s live.' }
      : { title: 'Enterprise is almost ready', body: 'The Enterprise package — your own account manager, strategy sessions and hand-picked creators — is coming soon. Reach out to our team if you’d like to talk now.' };
  return (
    <div className="mx-auto max-w-xl py-10 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand/10 text-brand">
        <IconSparkle className="h-7 w-7" />
      </div>
      <h2 className="mt-5 text-[22px] font-bold text-ink">{copy.title}</h2>
      <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-muted">{copy.body}</p>
      <div className="mt-6 flex justify-center">
        <Button variant="secondary" onClick={onBack}><IconArrowLeft className="h-4 w-4" /> Back to services</Button>
      </div>
    </div>
  );
}

// ── Promote steps ──────────────────────────────────────────

function CampaignStep({ s, set }: { s: State; set: (p: Partial<State>) => void }) {
  return (
    <div className="space-y-6">
      <Header title="Your campaign" subtitle="Name it, set a deadline if you have one, and add your content." />

      <Field label="Campaign name">
        <Input value={s.name} onChange={(e) => set({ name: e.target.value })} placeholder="Lagos launch — Skinsmith serum" />
      </Field>

      <Field label="Deadline (optional)" hint="The date you want this done by. Leave blank for no fixed deadline.">
        <Input type="date" value={s.endsAt} min={new Date().toISOString().slice(0, 10)} onChange={(e) => set({ endsAt: e.target.value })} />
      </Field>

      <Field label="Link (optional)" hint="Where people who tap through should land. Leave blank if there’s nowhere to send them.">
        <Input value={s.destinationUrl} onChange={(e) => set({ destinationUrl: e.target.value })} placeholder="https://yourstore.com/shop" />
      </Field>

      <div>
        <p className="mb-2 text-[14px] font-semibold text-ink">Your content</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <ChoiceCard
            on={s.creativeMode === 'HAVE'}
            onClick={() => set({ creativeMode: 'HAVE' })}
            title="I have my content"
            body="Upload the image or video you want promoted."
          />
          <ChoiceCard
            on={s.creativeMode === 'DESIGN'}
            onClick={() => set({ creativeMode: 'DESIGN' })}
            title="Design one for me"
            body="Our creators make it for you (this is the UGC service)."
          />
        </div>

        {s.creativeMode === 'HAVE' && (
          <div className="mt-4">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-rule bg-wash/50 px-4 py-8 text-center transition hover:border-brand/40">
              <IconUpload className="h-6 w-6 text-muted" />
              <span className="text-[14px] font-semibold text-ink">Tap to upload</span>
              <span className="text-[12px] text-muted">Images or video, up to 10&nbsp;MB each</span>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => set({ assetFiles: [...s.assetFiles, ...Array.from(e.target.files ?? [])] })}
              />
            </label>
            {s.assetFiles.length > 0 && (
              <ul className="mt-3 space-y-2">
                {s.assetFiles.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex items-center justify-between rounded-xl border border-rule bg-paper px-3 py-2 text-[13px]">
                    <span className="truncate text-ink">{f.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-muted">{fileSize(f.size)}</span>
                      <button
                        className="text-muted hover:text-brand"
                        onClick={() => set({ assetFiles: s.assetFiles.filter((_, j) => j !== i) })}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {s.creativeMode === 'DESIGN' && (
          <p className="mt-3 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-[13px] text-brand-700">
            “Design one for me” is our UGC service — continue and we’ll take you there.
          </p>
        )}
      </div>
    </div>
  );
}

function AudienceStep({ s, set }: { s: State; set: (p: Partial<State>) => void }) {
  const toggle = (key: 'locations' | 'ageBuckets' | 'religions', v: string) =>
    set({ [key]: s[key].includes(v) ? s[key].filter((x) => x !== v) : [...s[key], v] } as Partial<State>);
  return (
    <div className="space-y-6">
      <Header title="Who should see it?" subtitle="Leave any section untouched to reach everyone. The more you pick, the more focused your reach." />
      <ChipMulti label="Age" allLabel="Any age" options={AGE_BUCKETS.map((a) => a.label)} value={s.ageBuckets} onToggle={(v) => toggle('ageBuckets', v)} onClear={() => set({ ageBuckets: [] })} />
      <ChipMulti label="Location" allLabel="Any location" options={LOCATIONS.map((l) => l.label)} value={s.locations} onToggle={(v) => toggle('locations', v)} onClear={() => set({ locations: [] })} />
      <ChipMulti label="Religion" allLabel="Any" options={RELIGIONS} value={s.religions} onToggle={(v) => toggle('religions', v)} onClear={() => set({ religions: [] })} />
    </div>
  );
}

function ReachStep({ campaignId, reach, setReach }: { campaignId: string; reach: string; setReach: (v: string) => void }) {
  const [plan, setPlan] = useState<CampaignPlan | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const preview = useCallback(
    (value: string) => {
      const n = parseInt(value, 10);
      if (timer.current) clearTimeout(timer.current);
      if (!n || n < 1) { setPlan(null); return; }
      setPreviewing(true);
      timer.current = setTimeout(async () => {
        try {
          const p = await api.post<CampaignPlan>(`/v1/campaigns/${campaignId}/plan`, { target_reach: n });
          setPlan(p);
        } catch {
          setPlan(null);
        } finally {
          setPreviewing(false);
        }
      }, 350);
    },
    [campaignId],
  );

  useEffect(() => { preview(reach); }, [reach, preview]);

  return (
    <div className="space-y-6">
      <Header title="How many people?" subtitle="Tell us the reach you want. The price is simple and flat — ₦15,000 for every 1,000 people reached." />

      <Field label="People to reach">
        <Input
          type="number"
          min={1}
          inputMode="numeric"
          value={reach}
          onChange={(e) => setReach(e.target.value.replace(/[^0-9]/g, ''))}
          placeholder="e.g. 5000"
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        {REACH_PRESETS.map((n) => (
          <button
            key={n}
            onClick={() => setReach(String(n))}
            className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition ${
              parseInt(reach, 10) === n ? 'border-brand bg-brand/5 text-brand-700' : 'border-rule text-muted hover:border-brand/40'
            }`}
          >
            {n.toLocaleString('en-NG')}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-rule bg-wash/40 p-5">
        {parseInt(reach, 10) >= 1 ? (
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[13px] text-muted">Reach</p>
              <p className="text-[20px] font-bold text-ink">{plan ? plan.estimated_total_reach.toLocaleString('en-NG') : Number(reach).toLocaleString('en-NG')} people</p>
            </div>
            <div className="text-right">
              <p className="text-[13px] text-muted">Total price</p>
              <p className="text-[26px] font-extrabold text-brand">
                {plan ? plan.total_price.amount_display : previewing ? '…' : '—'}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-[14px] text-muted">Enter a reach above to see your price.</p>
        )}
      </div>
    </div>
  );
}

function PayStep({ quote }: { quote: Quote | null }) {
  if (!quote) return <p className="text-[14px] text-muted">No quote yet — go back and set your reach.</p>;
  return (
    <div className="space-y-6">
      <Header title="Review & pay" subtitle="Payment is held securely and your campaign goes to our team for a quick review before it goes live." />
      <div className="rounded-2xl border border-rule bg-paper p-5">
        <Row label="People to reach" value={`${quote.target_reach.toLocaleString('en-NG')} people`} />
        <Row label="Price" value={quote.price.amount_display} strong />
      </div>
      <p className="text-[13px] text-muted">
        You’ll be charged {quote.price.amount_display} via Paystack. Once it clears, we review your campaign and it goes live — you’ll get an email the moment it does.
      </p>
    </div>
  );
}

// ── Small UI helpers ───────────────────────────────────────

function PromoteStepper({ current }: { current: number }) {
  return (
    <div className="flex items-center">
      {PROMOTE_STEPS.map((label, i) => {
        const n = i + 1;
        const on = n <= current;
        return (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex items-center gap-2.5">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] font-bold transition ${on ? 'bg-brand text-white' : 'border border-rule bg-paper text-muted'}`}>
                {n < current ? <IconCheck className="h-4 w-4" /> : n}
              </span>
              <span className={`hidden text-[14px] font-semibold sm:inline ${on ? 'text-ink' : 'text-muted'}`}>{label}</span>
            </div>
            {n < PROMOTE_STEPS.length && <div className={`mx-3 h-px flex-1 border-t-2 border-dashed ${n < current ? 'border-brand/50' : 'border-rule'}`} />}
          </div>
        );
      })}
    </div>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-[22px] font-bold tracking-tight text-ink">{title}</h2>
      <p className="mt-1 text-[15px] leading-relaxed text-muted">{subtitle}</p>
    </div>
  );
}

function ChoiceCard({ on, onClick, title, body }: { on: boolean; onClick: () => void; title: string; body: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${on ? 'border-brand bg-brand/[0.03] ring-1 ring-brand/30' : 'border-rule bg-paper hover:border-brand/40'}`}
    >
      <div className="flex items-center gap-2">
        <span className={`grid h-5 w-5 place-items-center rounded-full border ${on ? 'border-brand bg-brand text-white' : 'border-rule'}`}>
          {on && <IconCheck className="h-3 w-3" />}
        </span>
        <span className="text-[15px] font-semibold text-ink">{title}</span>
      </div>
      <p className="mt-1.5 pl-7 text-[13px] leading-relaxed text-muted">{body}</p>
    </button>
  );
}

function ChipMulti({ label, options, value, onToggle, allLabel, onClear }: {
  label: string; options: string[]; value: string[]; onToggle: (v: string) => void; allLabel: string; onClear: () => void;
}) {
  const none = value.length === 0;
  return (
    <div>
      <p className="mb-2 text-[14px] font-semibold text-ink">{label}</p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onClear}
          className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition ${none ? 'border-brand bg-brand/5 text-brand-700' : 'border-rule text-muted hover:border-brand/40'}`}
        >
          {allLabel}
        </button>
        {options.map((o) => {
          const on = value.includes(o);
          return (
            <button
              key={o}
              onClick={() => onToggle(o)}
              className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition ${on ? 'border-brand bg-brand/5 text-brand-700' : 'border-rule text-muted hover:border-brand/40'}`}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-rule py-3 last:border-0">
      <span className="text-[14px] text-muted">{label}</span>
      <span className={`text-[14px] ${strong ? 'text-[18px] font-extrabold text-brand' : 'font-semibold text-ink'}`}>{value}</span>
    </div>
  );
}

function assetKind(file: File): string {
  if (file.type.startsWith('video/')) return 'VIDEO';
  if (file.type.startsWith('image/')) return 'IMAGE';
  return 'DOCUMENT';
}

function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NewCampaignPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-24"><Spinner className="h-8 w-8 text-brand" /></div>}>
      <NewCampaignInner />
    </Suspense>
  );
}
