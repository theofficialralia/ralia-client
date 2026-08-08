'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError, uuid, type Campaign, type CampaignPlan, type Quote } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { loadPaystack, PAYSTACK_PUBLIC_KEY, paystackConfigured } from '@/lib/paystack';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { Stepper } from '@/components/campaigns/wizard/Stepper';

// ── Design option sets (labels map to backend values) ─────────

// Design shows four objectives; they map onto the API's objective enum.
const OBJECTIVE_PILLS = [
  { value: 'AWARENESS', label: 'Visibility' },
  { value: 'PURCHASE', label: 'Sales' },
  { value: 'WEBSITE_VISIT', label: 'Engagement' },
  { value: 'LEAD_GEN', label: 'Lead Generation' },
];

const LOCATIONS = [
  { label: 'Lagos', states: ['Lagos'] },
  { label: 'Abuja', states: ['FCT'] },
  { label: 'Port Harcourt', states: ['Rivers'] },
  { label: 'Ibadan', states: ['Oyo'] },
  { label: 'Nationwide', states: [] as string[] },
];

const AGE_BUCKETS = [
  { label: '18-30', min: 18, max: 30 },
  { label: '31-40', min: 31, max: 40 },
  { label: '41-50', min: 41, max: 50 },
  { label: '51-60+', min: 51, max: 100 },
  { label: 'All ages', min: null, max: null },
];

const GENDERS = [
  { label: 'Women', value: ['FEMALE'] },
  { label: 'Men', value: ['MALE'] },
  { label: 'Both', value: [] as string[] },
];

const LANGUAGES = ['English', 'Yoruba', 'Igbo', 'Hausa', 'Pidgin'];

const CATEGORIES = [
  'Technology & Digital Products', 'Financial Services & Fintech', 'Consumer Goods & Retail (FMCG)',
  'Lifestyle & Personal Care', 'Health & Pharmaceuticals', 'Entertainment, Media & Gaming',
  'Real Estate & Construction', 'Travel', 'Hospitality & Leisure', 'Education & Career Services',
  'Mobility', 'Logistics & Utilities', 'Other / General',
];

const PLATFORMS = [
  { label: 'WhatsApp', value: 'WHATSAPP_STATUS' },
  { label: 'Instagram', value: 'INSTAGRAM' },
  { label: 'X', value: 'X' },
  { label: 'TikTok', value: 'TIKTOK' },
  { label: 'Facebook', value: 'FACEBOOK' },
];

const ROLE_CARDS = [
  { value: 'DISTRIBUTOR', title: 'Share it as-is', tag: 'best for visibility', body: 'They post your content on their socials exactly as provided — nothing extra.' },
  { value: 'CREATOR', title: 'Create something new', body: 'They build original content about your product from your brief and assets.' },
  { value: 'PARTICIPATOR', title: 'Do a set task', body: 'They complete a specific task you assign e.g. store visits, flyers, surveys, reviews.' },
  { value: 'INFLUENCER', title: 'Reach a bigger audience', body: 'We hand-match you with a high-profile creator for a collab post.' },
];

// Per-role task config (revealed under the role cards).
const CONTENT_TYPES = ['Review / Testimonial / Feedback', 'Educate (How to)', 'Invitation', 'Skit/Comedy', 'Other user generated content'];
const TASK_TYPES_ONLINE = [
  'Signups/App install/Downloads/Website Traffic/Page Visits',
  'Online Market Research/Survey/Product Review/Rating/Beta Testing/Feedback',
  'Social Page Follow/Engagement',
  'Other Tasks',
];
const TASK_TYPES_OFFLINE = [
  'Physical market research/Field Survey/Observation/Product Review',
  'Share campaign where people can see it e.g Flyer/Handbill/Poster/Mega Billboards/Churches etc',
  'Event Attendance/Physical Crowd/Volunteer',
  'Mystery Shopping/Store Audit/Store Walk-ins',
  'Other Tasks',
];
const BUDGET_BUCKETS = ['Under ₦1M', '₦1M – ₦2M', '₦2M – ₦3M', '₦3M – ₦5M', '₦5M+'];
const FOLLOWING_SIZES = ['10k – 50k (micro)', '50k – 100k', '100k – 500k', '500k – 1M', '1M+ (celebrity)'];
const AUDIENCE_REACH = ['10k – 50k', '50k – 100k', '100k – 500k', '500k – 1M', '1M+'];

type State = {
  name: string; objective: string; description: string; destination_url: string;
  imageFile: File | null; caption: string;
  location: string; ageBucket: string; gender: string; language: string;
  categories: string[]; platform: string; role: string;
  // Per-role task config
  contentType: string; taskMode: '' | 'ONLINE' | 'OFFLINE'; taskTypes: string[];
  budgetBucket: string; followingSize: string; audienceReach: string;
};

const initial: State = {
  name: '', objective: 'AWARENESS', description: '', destination_url: '',
  imageFile: null, caption: '',
  location: '', ageBucket: '', gender: '', language: '', categories: [], platform: '', role: '',
  contentType: '', taskMode: '', taskTypes: [], budgetBucket: '', followingSize: '', audienceReach: '',
};

// A placeholder slot count for the brief create — the real count is set at the
// Quote step (commitPlan), driven by budget and the category floor.
const PLACEHOLDER_SLOTS = 5;

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

  async function saveBrief() {
    if (!s.name.trim()) return setError('Give your campaign a name.');
    if (!/^https?:\/\//.test(s.destination_url)) return setError('Enter a valid destination link (https://…).');
    setBusy(true); setError(null);
    try {
      const body = {
        name: s.name.trim(),
        objective: s.objective,
        description: s.description || undefined,
        destination_url: s.destination_url,
        slots_total: PLACEHOLDER_SLOTS,
      };
      const campaign = campaignId
        ? await api.patch<Campaign>(`/v1/campaigns/${campaignId}`, body)
        : await api.post<Campaign>('/v1/campaigns', body);
      setCampaignId(campaign.id);
      setQuote(null);
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
    if (!s.role) return setError('Choose who should promote this.');
    setBusy(true); setError(null);
    try {
      const loc = LOCATIONS.find((l) => l.label === s.location);
      const age = AGE_BUCKETS.find((a) => a.label === s.ageBucket);
      const gender = GENDERS.find((g) => g.label === s.gender);
      await api.put(`/v1/campaigns/${campaignId}/targeting`, {
        states: loc?.states ?? [],
        age_min: age?.min ?? undefined,
        age_max: age?.max ?? undefined,
        genders: gender?.value ?? [],
        languages: s.language ? [s.language] : [],
        categories: s.categories,
        platforms: s.platform ? [s.platform] : [],
        roles: [s.role],
        // Reach per slot comes from the role's category default — no manual input.
      });
      // Persist the per-role task detail (only the fields that apply to this role).
      const offline = s.role === 'PARTICIPATOR' && s.taskMode === 'OFFLINE';
      await api.patch(`/v1/campaigns/${campaignId}`, {
        role_config: {
          content_type: s.role === 'CREATOR' ? s.contentType || undefined : undefined,
          task_mode: s.role === 'PARTICIPATOR' ? s.taskMode || undefined : undefined,
          task_types: s.role === 'PARTICIPATOR' && s.taskTypes.length ? s.taskTypes : undefined,
          budget_bucket: s.role === 'INFLUENCER' || offline ? s.budgetBucket || undefined : undefined,
          following_size: s.role === 'INFLUENCER' ? s.followingSize || undefined : undefined,
          audience_reach: offline ? s.audienceReach || undefined : undefined,
        },
      });
      setQuote(null);
      setStep(4);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save targeting.');
    } finally {
      setBusy(false);
    }
  }

  // Lock in the plan the slider settled on: save the slot count, then freeze the price.
  async function commitPlan(slots: number) {
    if (!campaignId) return;
    setBusy(true); setError(null);
    try {
      await api.patch(`/v1/campaigns/${campaignId}`, { slots_total: slots });
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
        amount: quote.price.amount_minor,
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
      await api.post(`/v1/campaigns/${campaignId}/payments/paystack/verify`, { reference }, { idempotencyKey: uuid() });
      router.replace(`/campaigns/${campaignId}?funded=1`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'We could not confirm the payment. If you were charged, contact support.');
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <button onClick={() => router.push('/campaigns')} className="flex items-center gap-2 text-[15px] font-semibold text-muted hover:text-ink">
          ← Cancel &amp; Return
        </button>
        <span className="text-[13px] text-muted">Step {step} of 5</span>
      </div>

      <div className="mt-5"><Stepper current={step} /></div>

      <div className="mt-6">
        {step === 1 && <Brief s={s} set={set} />}
        {step === 2 && <Assets s={s} set={set} />}
        {step === 3 && <Targeting s={s} set={set} />}
        {step === 4 && campaignId && <QuoteStep campaignId={campaignId} initialSlots={PLACEHOLDER_SLOTS} quote={quote} committing={busy} onCommit={commitPlan} onDirty={() => setQuote(null)} />}
        {step === 5 && <Fund quote={quote} />}

        {error && (
          <div className="mt-5 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-[13px] text-brand-700">{error}</div>
        )}

        <div className="mt-7 flex items-center justify-between">
          <Button variant="secondary" onClick={() => (step === 1 ? router.push('/campaigns') : setStep((n) => n - 1))} disabled={busy}>
            ← Back
          </Button>
          {step === 1 && <Button onClick={saveBrief} loading={busy}>Proceed →</Button>}
          {step === 2 && <Button onClick={saveAssets} loading={busy}>Proceed →</Button>}
          {step === 3 && <Button onClick={saveTargeting} loading={busy}>Proceed →</Button>}
          {step === 4 && <Button onClick={() => setStep(5)} disabled={!quote || busy}>Proceed →</Button>}
          {step === 5 && <Button onClick={pay} loading={busy}>Pay with Paystack</Button>}
        </div>
      </div>
    </div>
  );
}

// ── Steps ──────────────────────────────────────────────────

function Brief({ s, set }: { s: State; set: (p: Partial<State>) => void }) {
  return (
    <div className="space-y-6">
      <Header title="Write the brief." subtitle="Promoters will see this. Keep it clear — what to say, do and why it matters." />
      <Field label="Campaign name">
        <Input value={s.name} onChange={(e) => set({ name: e.target.value })} placeholder="Lagos launch — Skinsmith serum" />
      </Field>

      <div>
        <p className="mb-2 text-[14px] font-semibold text-ink">Objective</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {OBJECTIVE_PILLS.map((o) => (
            <SelectCard key={o.value} on={s.objective === o.value} onClick={() => set({ objective: o.value })}>
              {o.label}
            </SelectCard>
          ))}
        </div>
      </div>

      <Field label="Description">
        <Textarea value={s.description} onChange={(e) => set({ description: e.target.value })} placeholder="What is this campaign about, and who is it for?" />
      </Field>
      <Field label="Destination Link">
        <Input value={s.destination_url} onChange={(e) => set({ destination_url: e.target.value })} placeholder="https://" />
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
          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => set({ imageFile: e.target.files?.[0] ?? null })} />
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
  const toggleCategory = (c: string) =>
    set({ categories: s.categories.includes(c) ? s.categories.filter((x) => x !== c) : [...s.categories, c] });

  return (
    <div className="space-y-7">
      <div className="flex items-start justify-between gap-4">
        <Header title="Target the right people." subtitle="The quote on the next screen moves live with every choice you make." />
        <span className="hidden shrink-0 rounded-full border border-rule px-4 py-2 text-[13px] font-semibold text-brand-700 sm:inline-flex">
          📞 Need help? Talk to us
        </span>
      </div>

      <PillGroup label="Location" options={LOCATIONS.map((l) => l.label)} value={s.location} onSelect={(v) => set({ location: v })} />
      <PillGroup label="Age range" options={AGE_BUCKETS.map((a) => a.label)} value={s.ageBucket} onSelect={(v) => set({ ageBucket: v })} />
      <PillGroup label="Gender" options={GENDERS.map((g) => g.label)} value={s.gender} onSelect={(v) => set({ gender: v })} />
      <PillGroup label="Language" options={LANGUAGES} value={s.language} onSelect={(v) => set({ language: v })} />

      <div>
        <p className="mb-2 text-[15px] font-semibold text-ink">Category of interest</p>
        <div className="flex flex-wrap gap-2.5">
          {CATEGORIES.map((c) => {
            const on = s.categories.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleCategory(c)}
                className={`rounded-full px-4 py-2 text-[13.5px] font-semibold transition ${
                  on ? 'bg-ink text-white' : 'border border-rule bg-paper text-ink hover:border-ink/30'
                }`}
              >
                {on ? '× ' : ''}{c}
              </button>
            );
          })}
        </div>
      </div>

      <PillGroup label="Platform" options={PLATFORMS.map((p) => p.label)} value={PLATFORMS.find((p) => p.value === s.platform)?.label ?? ''}
        onSelect={(label) => set({ platform: PLATFORMS.find((p) => p.label === label)?.value ?? '' })} />

      <div>
        <p className="text-[15px] font-semibold text-ink">Who should promote this?</p>
        <p className="mt-0.5 text-[13.5px] text-muted">Tell us what you need — we&apos;ll match the right kind of promoter automatically. No jargon required.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {ROLE_CARDS.map((r) => {
            const on = s.role === r.value;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => set({ role: r.value })}
                className={`rounded-2xl border p-5 text-left transition ${
                  on ? 'border-ink bg-ink text-white' : 'border-rule bg-paper hover:border-ink/30'
                }`}
              >
                <div className="text-[16px] font-bold">
                  {r.title}{r.tag ? <span className={on ? 'text-white/70' : 'text-muted'}> ({r.tag})</span> : ''}
                </div>
                <p className={`mt-1.5 text-[13px] leading-snug ${on ? 'text-white/70' : 'text-muted'}`}>{r.body}</p>
              </button>
            );
          })}
        </div>

        <RoleConfigPanel s={s} set={set} />
      </div>
    </div>
  );
}

function RoleConfigPanel({ s, set }: { s: State; set: (p: Partial<State>) => void }) {
  if (!s.role || s.role === 'DISTRIBUTOR') return null;

  const toggleTask = (t: string) =>
    set({ taskTypes: s.taskTypes.includes(t) ? s.taskTypes.filter((x) => x !== t) : [...s.taskTypes, t] });

  return (
    <div className="mt-4 rounded-2xl border border-rule bg-paper p-5 sm:p-6">
      {s.role === 'CREATOR' && (
        <PillGroup label="What kind of content" options={CONTENT_TYPES} value={s.contentType} onSelect={(v) => set({ contentType: v })} />
      )}

      {s.role === 'PARTICIPATOR' && (
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-[14px] font-semibold text-ink">Step 1 · what type of task would you want the promoters to complete</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <RadioCard on={s.taskMode === 'ONLINE'} onClick={() => set({ taskMode: 'ONLINE', taskTypes: [] })}
                title="Online task" body="Download an app, review on play store or AppStore, etc" />
              <RadioCard on={s.taskMode === 'OFFLINE'} onClick={() => set({ taskMode: 'OFFLINE', taskTypes: [] })}
                title="Offline task" body="Attend an event, share flyers, visit physical locations like restaurants, stores etc" />
            </div>
          </div>
          {s.taskMode && (
            <ChipMulti label="Task type" options={s.taskMode === 'ONLINE' ? TASK_TYPES_ONLINE : TASK_TYPES_OFFLINE} value={s.taskTypes} onToggle={toggleTask} />
          )}
          {s.taskMode === 'OFFLINE' && (
            <>
              <PillGroup label="Your budget" options={BUDGET_BUCKETS} value={s.budgetBucket} onSelect={(v) => set({ budgetBucket: v })} />
              <PillGroup label="Potential audience reach" options={AUDIENCE_REACH} value={s.audienceReach} onSelect={(v) => set({ audienceReach: v })} />
            </>
          )}
        </div>
      )}

      {s.role === 'INFLUENCER' && (
        <div className="space-y-5">
          <PillGroup label="Step 1 · Your budget" options={BUDGET_BUCKETS} value={s.budgetBucket} onSelect={(v) => set({ budgetBucket: v })} />
          <PillGroup label="Step 2 · Preferred following size" options={FOLLOWING_SIZES} value={s.followingSize} onSelect={(v) => set({ followingSize: v })} />
        </div>
      )}
    </div>
  );
}

const MAX_BUDGET_MINOR = 500_000_000; // ₦5,000,000

function QuoteStep({ campaignId, initialSlots, quote, committing, onCommit, onDirty }: {
  campaignId: string; initialSlots: number; quote: Quote | null; committing: boolean;
  onCommit: (slots: number) => void; onDirty: () => void;
}) {
  const [plan, setPlan] = useState<CampaignPlan | null>(null);
  const [budget, setBudget] = useState<number | null>(null);
  const [custom, setCustom] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await api.post<CampaignPlan>(`/v1/campaigns/${campaignId}/plan`, { slots: initialSlots });
        if (!cancelled) {
          setPlan(p);
          const floorBudget = p.min_slots * p.unit_price.amount_minor;
          setBudget(Math.max(p.total_price.amount_minor || p.unit_price.amount_minor, floorBudget));
        }
      } catch (e) { if (!cancelled) setErr(e instanceof ApiError ? e.message : 'Could not price the campaign.'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [campaignId, initialSlots]);

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
        <Header title="Your live quote." subtitle="Change any filter and this number moves. This is the honest one." />
        <div className="py-10 text-center text-muted">{err ?? 'Pricing your campaign…'}</div>
      </div>
    );
  }

  const unit = plan.unit_price.amount_minor;
  const minBudget = plan.min_slots * unit;
  const max = Math.max(MAX_BUDGET_MINOR, minBudget);
  const value = Math.min(Math.max(budget ?? minBudget, minBudget), max);
  const locked = quote != null && quote.slots_total === plan.slots;

  function applyCustom() {
    const naira = Number(custom.replace(/[^0-9]/g, ''));
    if (!naira) return;
    if (quote) onDirty();
    setBudget(Math.min(Math.max(naira * 100, minBudget), max));
  }

  return (
    <div>
      <Header title="Your live quote." subtitle="Change any filter and this number moves. This is the honest one." />

      <div className="mt-3 rounded-3xl border border-rule bg-paper p-6 sm:p-8">
        <p className="text-[14px] text-muted">Estimated price</p>
        <p className="mt-1 text-[44px] font-extrabold leading-none tracking-tight text-brand">{plan.total_price.amount_display}</p>

        <input
          type="range" min={minBudget} max={max} step={unit}
          value={value}
          onChange={(e) => { if (quote) onDirty(); setBudget(Number(e.target.value)); }}
          className="mt-5 w-full accent-brand"
        />
        <div className="flex justify-between text-[12px] text-muted">
          <span>{plan.floor_minor.amount_display}</span><span>₦5M</span>
        </div>

        <div className="mt-5">
          <p className="mb-1.5 text-[14px] font-semibold text-ink">Custom price</p>
          <div className="flex gap-2">
            <Input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="e.g ₦50,000" />
            <Button variant="secondary" onClick={applyCustom}>Set</Button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-rule pt-6">
          <div>
            <p className="text-[13px] text-muted">Promoters we&apos;ll offer to</p>
            <p className="mt-1 text-[26px] font-extrabold tracking-tight text-ink">{plan.slots.toLocaleString('en-NG')}</p>
          </div>
          <div>
            <p className="text-[13px] text-muted">Estimated reach</p>
            <p className="mt-1 text-[26px] font-extrabold tracking-tight text-ink">{plan.estimated_total_reach.toLocaleString('en-NG')}+</p>
            <p className="text-[12px] text-muted">real, verified views</p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-rule bg-wash px-4 py-3 text-[13px] text-muted">
        ⓘ If we don&apos;t fill every slot, the unspent balance is refunded to your wallet, itemised. You&apos;ll always know exactly what your money bought.
      </div>

      <div className="mt-5">
        {locked ? (
          <div className="rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-[13px] font-semibold text-brand-700">
            ✓ Locked in at {quote!.price.amount_display} — proceed to payment.
          </div>
        ) : (
          <Button className="w-full" loading={committing} disabled={!plan.meets_floor} onClick={() => onCommit(plan.slots)}>
            {!plan.meets_floor ? `Minimum is ${plan.floor_minor.amount_display}` : `Lock in ${plan.slots} slots`}
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
      <div className="mt-3 rounded-2xl border border-rule p-6">
        <div className="flex items-baseline justify-between">
          <span className="text-[14px] text-muted">Amount to pay</span>
          <span className="text-[28px] font-extrabold tracking-tight text-brand">{quote?.price.amount_display ?? '—'}</span>
        </div>
        <div className="mt-5 flex items-center gap-3 rounded-xl bg-wash px-4 py-3 text-[13px] text-muted">
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
      <h2 className="text-[24px] font-extrabold tracking-tight text-ink">{title}</h2>
      <p className="mt-1 text-[14.5px] text-muted">{subtitle}</p>
    </div>
  );
}

function PillGroup({ label, options, value, onSelect }: { label: string; options: string[]; value: string; onSelect: (v: string) => void }) {
  return (
    <div>
      <p className="mb-2 text-[15px] font-semibold text-ink">{label}</p>
      <div className="flex flex-wrap gap-2.5">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onSelect(o === value ? '' : o)}
            className={`rounded-full px-5 py-2 text-[14px] font-semibold transition ${
              value === o ? 'bg-ink text-white' : 'border border-rule bg-paper text-ink hover:border-ink/30'
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function SelectCard({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-4 py-3.5 text-[14px] font-semibold transition ${
        on ? 'bg-ink text-white' : 'border border-rule bg-paper text-ink hover:border-ink/30'
      }`}
    >
      {children}
    </button>
  );
}

function RadioCard({ on, onClick, title, body }: { on: boolean; onClick: () => void; title: string; body: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start justify-between gap-3 rounded-2xl border p-4 text-left transition ${
        on ? 'border-brand bg-brand/[0.04]' : 'border-rule bg-paper hover:border-ink/30'
      }`}
    >
      <span>
        <span className="block text-[14px] font-bold text-ink">{title}</span>
        <span className="mt-1 block text-[12.5px] leading-snug text-muted">{body}</span>
      </span>
      <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${on ? 'border-brand' : 'border-rule'}`}>
        {on && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}
      </span>
    </button>
  );
}

function ChipMulti({ label, options, value, onToggle }: { label: string; options: string[]; value: string[]; onToggle: (v: string) => void }) {
  return (
    <div>
      <p className="mb-2 text-[14px] font-semibold text-ink">{label}</p>
      <div className="flex flex-wrap gap-2.5">
        {options.map((o) => {
          const on = value.includes(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => onToggle(o)}
              className={`rounded-full px-4 py-2 text-[13px] font-semibold transition ${
                on ? 'bg-ink text-white' : 'border border-rule bg-paper text-ink hover:border-ink/30'
              }`}
            >
              {on ? '× ' : ''}{o}
            </button>
          );
        })}
      </div>
    </div>
  );
}
