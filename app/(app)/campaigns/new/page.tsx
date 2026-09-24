'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError, uuid, type Campaign, type CampaignPlan, type Quote } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { loadPaystack, PAYSTACK_PUBLIC_KEY, paystackConfigured } from '@/lib/paystack';
import { getFbCookies, newEventId, track } from '@/lib/meta-pixel';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { Stepper } from '@/components/campaigns/wizard/Stepper';
import { LogoMark } from '@/components/brand/Logo';
import { IconArrowLeft, IconArrowRight, IconChat, IconCheck, IconClose, IconPhone, IconSparkle, IconUpload } from '@/components/brand/icons';
import { CATEGORIES, objectiveLabel } from '@/lib/campaign-options';

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
// Multi-select gender options - no "Both" (selecting neither, or both, = everyone).
const GENDER_OPTIONS = [
  { label: 'Women', value: 'FEMALE' },
  { label: 'Men', value: 'MALE' },
];

const LANGUAGES = ['English', 'Yoruba', 'Igbo', 'Hausa', 'Pidgin'];

// CATEGORIES: the shared Category-of-Interest taxonomy (see lib/campaign-options).

const PLATFORMS = [
  { label: 'WhatsApp', value: 'WHATSAPP_STATUS' },
  { label: 'Instagram', value: 'INSTAGRAM' },
  { label: 'X', value: 'X' },
  { label: 'TikTok', value: 'TIKTOK' },
  { label: 'Facebook', value: 'FACEBOOK' },
];

// Picking in-person promotion is a managed service - it leaves the automated flow
// and Ralia's team arranges it (like "Design one for me").
const PHYSICAL_LABEL = 'Physical (In-person)';

const ROLE_CARDS = [
  { value: 'DISTRIBUTOR', title: 'Share it as-is', tag: 'best for visibility', body: 'They post your content on their socials exactly as provided - nothing extra.' },
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
const BUDGET_BUCKETS = ['Under ₦1M', '₦1M - ₦2M', '₦2M - ₦3M', '₦3M - ₦5M', '₦5M+'];
const FOLLOWING_SIZES = ['10k - 50k (micro)', '50k - 100k', '100k - 500k', '500k - 1M', '1M+ (celebrity)'];
const AUDIENCE_REACH = ['10k - 50k', '50k - 100k', '100k - 500k', '500k - 1M', '1M+'];

type State = {
  name: string; objective: string; description: string; destination_url: string;
  // Run window (client-facing). Empty = "starts as soon as approved" / no fixed end.
  startsAt: string; endsAt: string;
  // §multi-day: how often each promoter posts, and (for CUSTOM) how many times.
  cadence: 'ONE_OFF' | 'DAILY' | 'WEEKLY' | 'CUSTOM'; customPosts: string;
  // Assets: 'HAVE' = client uploads files; 'DESIGN' = Ralia's team makes it.
  creativeMode: '' | 'HAVE' | 'DESIGN'; assetFiles: File[]; designBrief: string;
  // Targeting is multi-select: a client can target several states, ages, genders,
  // languages and platforms at once (stored as label lists, mapped to the API's
  // arrays in saveTargeting).
  locations: string[]; ageBuckets: string[]; genders: string[]; languages: string[];
  categories: string[]; platforms: string[]; role: string;
  // Per-role task config
  contentType: string; taskMode: '' | 'ONLINE' | 'OFFLINE'; taskTypes: string[];
  budgetBucket: string; followingSize: string; audienceReach: string;
  // Restrict to promoters at or above a leaderboard tier. '' = open to all.
  minTier: '' | 'SILVER' | 'GOLD' | 'PLATINUM';
};

const initial: State = {
  name: '', objective: 'AWARENESS', description: '', destination_url: '',
  startsAt: '', endsAt: '',
  cadence: 'ONE_OFF', customPosts: '',
  creativeMode: '', assetFiles: [], designBrief: '',
  locations: [], ageBuckets: [], genders: [], languages: [], categories: [], platforms: [], role: '',
  contentType: '', taskMode: '', taskTypes: [], budgetBucket: '', followingSize: '', audienceReach: '',
  minTier: '',
};

// A placeholder slot count for the brief create - the real count is set at the
// Quote step (commitPlan), driven by budget and the category floor.
const PLACEHOLDER_SLOTS = 5;

// Local draft of the new-campaign wizard, so nothing typed is lost to a refresh or
// the 10-minute idle logout. Files can't be serialised, so they're dropped from the
// draft (the client re-picks them); everything else is restored. Cleared on submit.
const DRAFT_KEY = 'ralia.campaignDraft';
type Draft = { step: number; s: Omit<State, 'assetFiles'> };
function saveDraft(step: number, s: State) {
  try {
    const { assetFiles: _drop, ...rest } = s;
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, s: rest } satisfies Draft));
  } catch { /* storage full or unavailable - a draft is a nicety, never fatal */ }
}
function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch { return null; }
}
function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}

function NewCampaignInner() {
  const router = useRouter();
  const { user } = useAuth();
  const resumeId = useSearchParams().get('id');
  const [step, setStep] = useState(1);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [s, setS] = useState<State>(initial);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrating, setHydrating] = useState(!!resumeId);
  // A managed, high-touch path was chosen (Ralia designs the creative, or hand-matches
  // an influencer) - the automated wizard stops and we hand off to the team by email.
  const [managed, setManaged] = useState<null | 'DESIGN' | 'INFLUENCER' | 'PHYSICAL'>(null);

  const set = (patch: Partial<State>) => setS((prev) => ({ ...prev, ...patch }));

  // Resume a draft/quoted campaign: load it and refill the wizard.
  useEffect(() => {
    if (!resumeId) return;
    let cancelled = false;
    (async () => {
      try {
        const c = await api.get<Campaign>(`/v1/campaigns/${resumeId}`);
        if (cancelled) return;
        setCampaignId(c.id);
        setS((prev) => hydrateState(prev, c));
        setStep(c.status === 'QUOTED' ? 4 : 1);
      } catch {
        // Fall back to a fresh campaign if the draft can't be loaded.
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();
    return () => { cancelled = true; };
  }, [resumeId]);

  // Draft persistence (fresh wizard only - a resumed campaign already loads from the API).
  // Restore once on mount, then mirror every change to localStorage until submit.
  const draftReady = useRef(false);
  useEffect(() => {
    if (resumeId) return; // editing an existing campaign - no local draft
    const d = readDraft();
    if (d) {
      setS((prev) => ({ ...prev, ...d.s, assetFiles: [] }));
      if (typeof d.step === 'number' && d.step >= 1 && d.step <= 3) setStep(d.step); // never resume into quote/pay
    }
    draftReady.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (resumeId || !draftReady.current) return;
    saveDraft(step, s);
  }, [resumeId, step, s]);

  async function saveBrief() {
    if (!s.name.trim()) return setError('Give your campaign a name.');
    // The destination link is always optional - some owners just upload creative for
    // promoters to post. If given, it must be a valid URL.
    const hasDestination = /^https?:\/\//.test(s.destination_url);
    if (s.destination_url.trim() && !hasDestination) return setError('That destination link isn’t a valid URL (https://…).');
    if (s.startsAt && s.endsAt && s.endsAt <= s.startsAt) return setError('The end date must be after the start date.');
    if (s.cadence !== 'ONE_OFF' && !s.endsAt) return setError('Set an end date before choosing a repeating schedule.');
    setBusy(true); setError(null);
    try {
      const body = {
        name: s.name.trim(),
        objective: s.objective,
        description: s.description || undefined,
        destination_url: hasDestination ? s.destination_url : null,
        slots_total: PLACEHOLDER_SLOTS,
        // Nulls explicitly clear a previously-set window on a resumed draft.
        starts_at: s.startsAt || null,
        ends_at: s.endsAt || null,
        cadence: s.cadence,
        posts_required: computePosts(s),
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
    if (!s.creativeMode) return setError('Choose whether you have creative or want Ralia to design it.');
    // Files are optional here (you can add them now or later, or you may already
    // have uploaded some on a resumed draft) - only the choice of mode is required.
    setBusy(true); setError(null);
    try {
      if (s.creativeMode === 'HAVE') {
        for (const file of s.assetFiles) {
          const form = new FormData();
          form.append('kind', assetKind(file));
          form.append('file', file);
          await api.postForm(`/v1/campaigns/${campaignId}/assets`, form);
        }
        await api.patch(`/v1/campaigns/${campaignId}`, { needs_creative: false });
      } else {
        // "Design one for me" is a managed service - Ralia's team makes the creative.
        // It leaves the automated flow here and we reach out by email/WhatsApp.
        await api.patch(`/v1/campaigns/${campaignId}`, { needs_creative: true, design_brief: s.designBrief || undefined });
        setManaged('DESIGN');
        return;
      }
      setStep(3);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save your creative.');
    } finally {
      setBusy(false);
    }
  }

  async function saveTargeting() {
    if (!campaignId) return;
    // In-person promotion is a managed service - hand off to the team by email.
    if (s.platforms.includes(PHYSICAL_LABEL)) { setManaged('PHYSICAL'); return; }
    if (!s.role) return setError('Choose who should promote this.');
    setBusy(true); setError(null);
    try {
      // Location: "Nationwide" (states []) means no state filter - it wins if picked.
      const selectedLocs = LOCATIONS.filter((l) => s.locations.includes(l.label));
      const states = selectedLocs.some((l) => l.states.length === 0)
        ? []
        : [...new Set(selectedLocs.flatMap((l) => l.states))];
      // Age: the API takes one min/max range, so several buckets span from the lowest
      // min to the highest max. "All ages" (null bounds) clears the age filter.
      const selectedAges = AGE_BUCKETS.filter((a) => s.ageBuckets.includes(a.label));
      const bounded = selectedAges.filter((a) => a.min != null && a.max != null);
      const hasAllAges = selectedAges.some((a) => a.min == null);
      const ageMin = hasAllAges || bounded.length === 0 ? undefined : Math.min(...bounded.map((a) => a.min!));
      const ageMax = hasAllAges || bounded.length === 0 ? undefined : Math.max(...bounded.map((a) => a.max!));
      await api.put(`/v1/campaigns/${campaignId}/targeting`, {
        states,
        age_min: ageMin,
        age_max: ageMax,
        genders: GENDER_OPTIONS.filter((g) => s.genders.includes(g.label)).map((g) => g.value),
        languages: s.languages,
        categories: s.categories,
        platforms: PLATFORMS.filter((p) => s.platforms.includes(p.label)).map((p) => p.value),
        roles: [s.role],
        // Reach per slot comes from the role's category default - no manual input.
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
        // Tier gate — only send when the client narrowed it (empty = open to all).
        min_tier: s.minTier || undefined,
      });
      setQuote(null);
      // "Reach a bigger audience" is a managed, hand-matched service - it leaves the
      // automated quote/pay flow here and Ralia's team reaches out to arrange it.
      if (s.role === 'INFLUENCER') {
        setManaged('INFLUENCER');
        return;
      }
      setStep(4);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save targeting.');
    } finally {
      setBusy(false);
    }
  }

  // Lock in the exact price the client chose: quote freezes that amount as-is and
  // derives the promoter count from it (governing logic #2 - the price is charged
  // as typed, nothing is snapped).
  async function commitPlan(priceMinor: number) {
    if (!campaignId) return;
    setBusy(true); setError(null);
    try {
      const q = await api.post<Quote>(`/v1/campaigns/${campaignId}/quote`, { price_minor: priceMinor });
      setQuote(q);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not lock in the plan.');
    } finally {
      setBusy(false);
    }
  }

  // Pay (Paystack) for the locked quote. Payment funds escrow and sends the campaign
  // to admin review - it goes live only once an admin approves it.
  async function pay() {
    if (!campaignId || !quote || !user) return;
    if (!paystackConfigured()) {
      return setError('Paystack is not configured. Add NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY to .env.local.');
    }
    setError(null);
    // One event_id per payment attempt: fired with the browser Purchase and echoed
    // to the backend so Meta deduplicates the browser + server-side conversion.
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
      // Browser Purchase with the SAME event_id — Meta dedupes it against the
      // server-side Purchase the backend fires on this same verify.
      track('Purchase', { currency: 'NGN', value: amount, content_ids: [campaignId], content_type: 'product' }, eventId);
      // Paid → under review. The client is emailed when it's approved (goes live).
      clearDraft();
      router.replace(`/campaigns/${campaignId}?submitted=1`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'We could not confirm the payment. If you were charged, contact support.');
      setBusy(false);
    }
  }

  if (hydrating) {
    return <div className="flex justify-center py-24"><Spinner className="h-8 w-8 text-brand" /></div>;
  }

  if (managed) return <ManagedPathScreen kind={managed} onDone={() => router.push('/campaigns')} />;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <button onClick={() => router.push('/campaigns')} className="flex items-center gap-1.5 text-[15px] font-semibold text-muted hover:text-ink">
          <IconArrowLeft className="h-4 w-4" /> Cancel &amp; Return
        </button>
        <span className="text-[13px] text-muted">Step {step} of 5</span>
      </div>

      <div className="mt-5"><Stepper current={step} /></div>

      <div className="mt-6">
        {step === 1 && <Brief s={s} set={set} />}
        {step === 2 && <Assets s={s} set={set} />}
        {step === 3 && <Targeting s={s} set={set} />}
        {step === 4 && campaignId && <QuoteStep campaignId={campaignId} quote={quote} committing={busy} onCommit={commitPlan} onDirty={() => setQuote(null)} />}
        {step === 5 && <Fund quote={quote} s={s} />}

        {error && (
          <div className="mt-5 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-[13px] text-brand-700">{error}</div>
        )}

        <div className="mt-7 flex items-center justify-between">
          <Button variant="secondary" onClick={() => (step === 1 ? router.push('/campaigns') : setStep((n) => n - 1))} disabled={busy}>
            <IconArrowLeft className="h-4 w-4" /> Back
          </Button>
          {step === 1 && <Button onClick={saveBrief} loading={busy}>Proceed <IconArrowRight className="h-4 w-4" /></Button>}
          {step === 2 && <Button onClick={saveAssets} loading={busy}>Proceed <IconArrowRight className="h-4 w-4" /></Button>}
          {step === 3 && <Button onClick={saveTargeting} loading={busy}>Proceed <IconArrowRight className="h-4 w-4" /></Button>}
          {step === 4 && <Button onClick={() => setStep(5)} disabled={!quote || busy}>Proceed <IconArrowRight className="h-4 w-4" /></Button>}
          {step === 5 && <Button onClick={pay} loading={busy}>Pay with Paystack</Button>}
        </div>
      </div>
    </div>
  );
}

// ── Steps ──────────────────────────────────────────────────

// Client-facing run-length presets. Picking one sets the end date relative to the
// start (or today). The promoter's own deadline is set a contingency buffer before
// the end - that's internal and never shown to the client here.
const DURATION_PRESETS = [
  { label: '1 day', days: 1 },
  { label: '3 days', days: 3 },
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function dayCount(startISO: string, endISO: string): number {
  const ms = new Date(`${endISO}T00:00:00`).getTime() - new Date(`${startISO}T00:00:00`).getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}
function fmtShortDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

const CADENCE_OPTIONS = [
  { value: 'ONE_OFF', label: 'Just once', hint: 'A single post.' },
  { value: 'DAILY', label: 'Every day', hint: 'One post per day of the run.' },
  { value: 'WEEKLY', label: 'Weekly', hint: 'One post per week.' },
  { value: 'CUSTOM', label: 'Custom', hint: 'Set the number of posts.' },
] as const;

/** Posts each promoter delivers, derived from the cadence + run window (mirrors the API). */
function computePosts(s: Pick<State, 'cadence' | 'startsAt' | 'endsAt' | 'customPosts'>): number {
  if (s.cadence === 'ONE_OFF' || !s.endsAt) return 1;
  const start = s.startsAt || todayISO();
  const days = dayCount(start, s.endsAt);
  if (s.cadence === 'DAILY') return Math.max(2, days);
  if (s.cadence === 'WEEKLY') return Math.max(2, Math.ceil(days / 7));
  return Math.max(2, parseInt(s.customPosts, 10) || 2); // CUSTOM
}

function Brief({ s, set }: { s: State; set: (p: Partial<State>) => void }) {
  const start = s.startsAt || todayISO();
  const runDays = s.startsAt && s.endsAt ? dayCount(s.startsAt, s.endsAt) : s.endsAt ? dayCount(todayISO(), s.endsAt) : 0;
  return (
    <div className="space-y-6">
      <Header title="Write the brief." subtitle="Promoters will see this. Keep it clear - what to say, do and why it matters." />
      <Field label="Campaign name">
        <Input value={s.name} onChange={(e) => set({ name: e.target.value })} placeholder="Lagos launch - Skinsmith serum" />
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
      <Field label="Destination Link (optional)">
        <Input value={s.destination_url} onChange={(e) => set({ destination_url: e.target.value })} placeholder="https://" />
        <p className="mt-1 text-[12px] text-muted">Where clicks should go. Leave blank if promoters should just post your uploaded creative.</p>
      </Field>

      <div>
        <p className="mb-1 text-[14px] font-semibold text-ink">
          How long should it run? <span className="font-normal text-muted">(optional)</span>
        </p>
        <p className="mb-3 text-[13px] text-muted">
          Set a run window if this should stay up over several days or weeks. Leave it blank to run on the standard delivery window from approval.
        </p>
        <div className="mb-3 flex flex-wrap gap-2">
          {DURATION_PRESETS.map((d) => {
            const on = !!s.endsAt && s.endsAt === addDaysISO(start, d.days);
            return (
              <button
                key={d.label}
                type="button"
                aria-pressed={on}
                onClick={() => set({ startsAt: s.startsAt || todayISO(), endsAt: addDaysISO(start, d.days) })}
                className={`rounded-full px-4 py-2 text-[13.5px] font-semibold transition ${
                  on ? 'bg-ink text-paper' : 'border border-rule bg-paper text-ink hover:border-ink/30'
                }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start date">
            <Input type="date" min={todayISO()} value={s.startsAt} onChange={(e) => set({ startsAt: e.target.value })} />
          </Field>
          <Field label="End date">
            <Input type="date" min={s.startsAt || todayISO()} value={s.endsAt} onChange={(e) => set({ endsAt: e.target.value })} />
          </Field>
        </div>
        {s.endsAt && runDays > 0 && (
          <p className="mt-2 text-[13px] font-medium text-muted">
            Runs {fmtShortDate(start)} → {fmtShortDate(s.endsAt)} · {runDays} day{runDays === 1 ? '' : 's'}
          </p>
        )}
      </div>

      {s.endsAt && (
        <div>
          <p className="mb-1 text-[14px] font-semibold text-ink">How often should each promoter post?</p>
          <p className="mb-3 text-[13px] text-muted">
            Repeating posts sustain reach across the run. Each promoter is paid per post, so a repeating campaign costs more.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CADENCE_OPTIONS.map((o) => (
              <SelectCard key={o.value} on={s.cadence === o.value} onClick={() => set({ cadence: o.value })}>
                <span className="block text-[14px] font-semibold">{o.label}</span>
                <span className="mt-0.5 block text-[11.5px] text-muted">{o.hint}</span>
              </SelectCard>
            ))}
          </div>
          {s.cadence === 'CUSTOM' && (
            <div className="mt-3 max-w-[220px]">
              <Field label="Number of posts">
                <Input
                  type="number"
                  min={2}
                  max={90}
                  value={s.customPosts}
                  onChange={(e) => set({ customPosts: e.target.value })}
                  placeholder="e.g. 5"
                />
              </Field>
            </div>
          )}
          {s.cadence !== 'ONE_OFF' && (
            <p className="mt-2 text-[13px] font-medium text-brand-700">
              ≈ {computePosts(s)} posts per promoter over the run.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function assetKind(file: File): string {
  if (file.type.startsWith('image/')) return 'IMAGE';
  if (file.type.startsWith('video/')) return 'VIDEO';
  return 'DOCUMENT';
}
function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}b`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}kb`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}mb`;
}
function fileExt(name: string): string {
  const m = name.split('.').pop();
  return (m && m !== name ? m : 'file').toUpperCase().slice(0, 4);
}

function Assets({ s, set }: { s: State; set: (p: Partial<State>) => void }) {
  const addFiles = (list: FileList | null) => {
    if (!list) return;
    set({ creativeMode: 'HAVE', assetFiles: [...s.assetFiles, ...Array.from(list)] });
  };
  const removeFile = (i: number) => set({ assetFiles: s.assetFiles.filter((_, j) => j !== i) });

  return (
    <div className="space-y-6">
      <Header title="Add your creative." subtitle="Or ask Ralia's design team to make one for you." />

      <div className="grid gap-4 sm:grid-cols-2">
        {/* I have creative */}
        <label
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition ${
            s.creativeMode === 'HAVE' ? 'border-brand bg-brand/[0.04]' : 'border-rule hover:border-ink/30'
          }`}
        >
          <input type="file" multiple className="hidden" accept="image/*,video/*,.pdf"
            onChange={(e) => addFiles(e.target.files)} />
          <span className={`grid h-16 w-16 place-items-center rounded-full ${s.creativeMode === 'HAVE' ? 'bg-brand text-white' : 'bg-wash text-ink'}`}><IconUpload className="h-6 w-6" /></span>
          <span className="mt-4 text-[18px] font-bold text-ink">I have creative</span>
          <span className="mt-1 text-[13px] text-muted">Image, video, poster, caption. Multi-file OK.</span>
        </label>

        {/* Design one for me */}
        <button type="button" onClick={() => set({ creativeMode: 'DESIGN' })}
          className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition ${
            s.creativeMode === 'DESIGN' ? 'border-brand bg-brand/[0.04]' : 'border-rule hover:border-ink/30'
          }`}
        >
          <span className={`grid h-16 w-16 place-items-center rounded-full ${s.creativeMode === 'DESIGN' ? 'bg-brand text-white' : 'bg-wash text-ink'}`}><IconSparkle className="h-6 w-6" /></span>
          <span className="mt-4 text-[18px] font-bold text-ink">Design one for me</span>
          <span className="mt-1 text-[13px] text-muted">Ralia&apos;s team designs your poster &amp; caption in 24h.</span>
        </button>
      </div>

      {/* Uploaded file chips */}
      {s.creativeMode === 'HAVE' && s.assetFiles.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {s.assetFiles.map((f, i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl border border-rule bg-paper p-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-wash text-[11px] font-bold text-muted">{fileExt(f.name)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold text-ink">{f.name}</span>
                <span className="block text-[12px] text-muted">{fileSize(f.size)}</span>
              </span>
              <button type="button" onClick={() => removeFile(i)} className="shrink-0 text-muted hover:text-ink" aria-label="Remove file"><IconClose className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}

      {/* Design brief */}
      {s.creativeMode === 'DESIGN' && (
        <Field label="What should we design?">
          <Textarea value={s.designBrief} onChange={(e) => set({ designBrief: e.target.value })} placeholder="e.g poster, flyer, billboard etc" />
        </Field>
      )}
    </div>
  );
}

function Targeting({ s, set }: { s: State; set: (p: Partial<State>) => void }) {
  // Every targeting facet is multi-select - toggle a label in/out of its list.
  const toggle = (key: 'locations' | 'ageBuckets' | 'genders' | 'languages' | 'categories' | 'platforms', v: string) =>
    set({ [key]: s[key].includes(v) ? s[key].filter((x) => x !== v) : [...s[key], v] } as Partial<State>);
  // "All X" = no restriction on that facet (empty list). Clicking it clears the row.
  const clear = (key: 'locations' | 'ageBuckets' | 'genders' | 'languages' | 'categories' | 'platforms') => set({ [key]: [] } as Partial<State>);

  return (
    <div className="space-y-7">
      <div className="flex items-start justify-between gap-4">
        <Header title="Target the right people." subtitle="Pick as many as you like in each row - the quote on the next screen moves live with every choice." />
        <a
          href="https://wa.me/2348139376563"
          target="_blank"
          rel="noreferrer"
          className="hidden shrink-0 items-center gap-1.5 rounded-full border border-rule px-4 py-2 text-[13px] font-semibold text-brand-700 transition hover:bg-wash sm:inline-flex"
        >
          <IconPhone className="h-4 w-4" /> Need help? Talk to us
        </a>
      </div>

      <ChipMulti label="Location" options={LOCATIONS.map((l) => l.label)} value={s.locations} onToggle={(v) => toggle('locations', v)} allLabel="All locations" onClear={() => clear('locations')} />
      <ChipMulti label="Age range" options={AGE_BUCKETS.map((a) => a.label)} value={s.ageBuckets} onToggle={(v) => toggle('ageBuckets', v)} allLabel="All ages" onClear={() => clear('ageBuckets')} />
      <ChipMulti label="Gender" options={GENDER_OPTIONS.map((g) => g.label)} value={s.genders} onToggle={(v) => toggle('genders', v)} allLabel="All genders" onClear={() => clear('genders')} />
      <ChipMulti label="Language" options={LANGUAGES} value={s.languages} onToggle={(v) => toggle('languages', v)} allLabel="All languages" onClear={() => clear('languages')} />
      <ChipMulti label="Category of interest" options={CATEGORIES} value={s.categories} onToggle={(v) => toggle('categories', v)} allLabel="Any category" onClear={() => clear('categories')} />
      <ChipMulti label="Where should they promote this?" options={[...PLATFORMS.map((p) => p.label), PHYSICAL_LABEL]} value={s.platforms} onToggle={(v) => toggle('platforms', v)} allLabel="Anywhere" onClear={() => clear('platforms')} />

      <div>
        <p className="text-[15px] font-semibold text-ink">Minimum promoter tier</p>
        <p className="mt-0.5 text-[13.5px] text-muted">Restrict to your best-ranked promoters. Higher tiers are proven performers, but fewer of them - leave on “Any” to reach everyone.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {([['', 'Any'], ['SILVER', 'Silver+'], ['GOLD', 'Gold+'], ['PLATINUM', 'Platinum']] as const).map(([value, label]) => {
            const on = s.minTier === value;
            return (
              <button
                key={value || 'ANY'}
                type="button"
                onClick={() => set({ minTier: value })}
                className={`rounded-full border px-4 py-2 text-[13.5px] font-semibold transition ${on ? 'border-ink bg-ink text-paper' : 'border-rule bg-paper text-ink hover:border-ink/30'}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-[15px] font-semibold text-ink">Who should promote this?</p>
        <p className="mt-0.5 text-[13.5px] text-muted">Tell us what you need - we&apos;ll match the right kind of promoter automatically. No jargon required.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {ROLE_CARDS.map((r) => {
            const on = s.role === r.value;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => set({ role: r.value })}
                className={`rounded-2xl border p-5 text-left transition ${
                  on ? 'border-ink bg-ink text-paper' : 'border-rule bg-paper hover:border-ink/30'
                }`}
              >
                <div className="text-[16px] font-bold">
                  {r.title}{r.tag ? <span className={on ? 'text-paper/70' : 'text-muted'}> ({r.tag})</span> : ''}
                </div>
                <p className={`mt-1.5 text-[13px] leading-snug ${on ? 'text-paper/70' : 'text-muted'}`}>{r.body}</p>
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

/** Instant client-side naira from kobo - the price is exact, so the headline never waits on the server. */
function nairaFromMinor(minor: number): string {
  return `₦${Math.round(minor / 100).toLocaleString('en-NG')}`;
}

function QuoteStep({ campaignId, quote, committing, onCommit, onDirty }: {
  campaignId: string; quote: Quote | null; committing: boolean;
  onCommit: (priceMinor: number) => void; onDirty: () => void;
}) {
  const [plan, setPlan] = useState<CampaignPlan | null>(null);
  // The exact price the client is spending, in kobo - updated instantly on every
  // slider tick so the headline is smooth; the server only re-derives promoters/reach.
  const [price, setPrice] = useState<number | null>(null);
  const [custom, setCustom] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Initial plan establishes the category floor + defaults and seeds the starting price.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await api.post<CampaignPlan>(`/v1/campaigns/${campaignId}/plan`, {});
        if (!cancelled) {
          setPlan(p);
          setPrice((cur) => cur ?? Math.max(p.floor_minor.amount_minor, p.total_price.amount_minor || p.floor_minor.amount_minor));
        }
      } catch (e) { if (!cancelled) setErr(e instanceof ApiError ? e.message : 'Could not price the campaign.'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [campaignId]);

  // Debounced: re-derive the promoter count + reach for the chosen price. The price
  // itself is already known locally, so the big number never blocks on this.
  useEffect(() => {
    if (price == null) return;
    const t = setTimeout(async () => {
      try { setPlan(await api.post<CampaignPlan>(`/v1/campaigns/${campaignId}/plan`, { price_minor: price })); }
      catch { /* keep the last good plan */ }
    }, 200);
    return () => clearTimeout(t);
  }, [price, campaignId]);

  if (loading || !plan || price == null) {
    return (
      <div>
        <Header title="Set your budget." subtitle="Name your price - we show exactly how many promoters and how much reach it buys." />
        <div className="py-10 text-center text-muted">{err ?? 'Pricing your campaign…'}</div>
      </div>
    );
  }

  const floor = plan.floor_minor.amount_minor;
  const max = Math.max(MAX_BUDGET_MINOR, floor);
  const value = Math.min(Math.max(price, floor), max);
  const meetsFloor = value >= floor;
  // Step by roughly one promoter's worth so each notch is meaningful.
  const stepMinor = Math.max(100, Math.round(floor / Math.max(1, plan.default_promoters)));
  const locked = quote != null && quote.price.amount_minor === value;

  function setPriceClamped(minor: number) {
    if (quote) onDirty();
    setPrice(Math.min(Math.max(minor, floor), max));
  }

  function applyCustom() {
    const naira = Number(custom.replace(/[^0-9]/g, ''));
    if (!naira) return;
    setPriceClamped(naira * 100);
  }

  return (
    <div>
      <Header title="Set your budget." subtitle="Name your price - we show exactly how many promoters and how much reach it buys." />

      <div className="mt-3 rounded-3xl border border-rule bg-paper p-6 sm:p-8">
        <p className="text-[14px] text-muted">You&apos;ll spend</p>
        <p className="mt-1 text-[44px] font-extrabold leading-none tracking-tight text-brand">{nairaFromMinor(value)}</p>
        {plan.posts_required > 1 && (
          <p className="mt-1 text-[13px] font-medium text-muted">
            {plan.slots} promoter{plan.slots === 1 ? '' : 's'} × {plan.posts_required} posts each
          </p>
        )}

        <input
          type="range" min={floor} max={max} step={stepMinor}
          value={value}
          onChange={(e) => setPriceClamped(Number(e.target.value))}
          className="mt-5 w-full accent-brand"
        />
        <div className="flex justify-between text-[12px] text-muted">
          <span>{plan.floor_minor.amount_display}</span><span>₦5M</span>
        </div>

        <div className="mt-5">
          <p className="mb-1.5 text-[14px] font-semibold text-ink">Or enter an exact amount</p>
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
        ⓘ You only ever pay for verified delivery. Every promoter&apos;s post is reviewed before it counts, and your evidence gallery itemises exactly what your money bought.
      </div>

      <div className="mt-5">
        {locked ? (
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-[13px] font-semibold text-brand-700">
            <IconCheck className="h-4 w-4" /> Locked in at {quote!.price.amount_display} - proceed to payment.
          </div>
        ) : (
          <Button className="w-full" loading={committing} disabled={!meetsFloor} onClick={() => onCommit(value)}>
            {!meetsFloor ? `Minimum is ${plan.floor_minor.amount_display}` : `Lock in ${nairaFromMinor(value)}`}
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Bits ───────────────────────────────────────────────────

/**
 * Terminal screen for the two managed, high-touch services - Ralia's team designs
 * the creative, or hand-matches a high-profile creator. These leave the automated
 * quote/pay flow and are arranged directly with the team by email/WhatsApp.
 */
function ManagedPathScreen({ kind, onDone }: { kind: 'DESIGN' | 'INFLUENCER' | 'PHYSICAL'; onDone: () => void }) {
  const title =
    kind === 'DESIGN' ? 'Ralia will design your creative'
    : kind === 'PHYSICAL' ? 'We’ll set up your in-person campaign'
    : 'We’ll hand-match your creator';
  const body =
    kind === 'DESIGN'
      ? 'This one’s on us to make. Our design team will craft your poster and caption and send it over. We’ve saved your brief and will email you shortly to finish setting up your campaign.'
      : kind === 'PHYSICAL'
      ? 'In-person promotion (flyers, activations, street teams) is arranged by our team. We’ve saved your brief and will email you shortly to plan it with you.'
      : 'Reaching a bigger audience is a hand-matched service. Our team will pair you with the right high-profile creator for a collab. We’ve saved your brief and will email you shortly to arrange it.';
  return (
    <div className="mx-auto max-w-lg py-10 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand/10 text-brand"><IconSparkle className="h-8 w-8" /></div>
      <h1 className="mt-5 text-[24px] font-extrabold tracking-tight text-ink">{title}</h1>
      <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{body}</p>
      <div className="mt-6 flex flex-col items-center gap-3">
        <a href="https://wa.me/2348139376563" target="_blank" rel="noreferrer" className="w-full">
          <Button className="w-full"><IconChat className="h-4 w-4" /> Message us on WhatsApp</Button>
        </a>
        <a href="mailto:support@ralia.co?subject=Managed%20campaign%20request" className="text-[13.5px] font-semibold text-brand-700">Or email support@ralia.co</a>
        <button onClick={onDone} className="mt-2 text-[13.5px] font-semibold text-muted hover:text-ink">Back to my campaigns</button>
      </div>
    </div>
  );
}

function Fund({ quote, s }: { quote: Quote | null; s: State }) {
  const posts = computePosts(s);
  const cadenceLabel = posts > 1 ? `${posts} posts · ${s.cadence.charAt(0) + s.cadence.slice(1).toLowerCase().replace('_', '-')}` : 'One-off post';
  const runWindow = s.startsAt || s.endsAt
    ? `${s.startsAt ? fmtShortDate(s.startsAt) : 'On approval'} → ${s.endsAt ? fmtShortDate(s.endsAt) : 'Open'}`
    : 'Starts on approval · no fixed end';
  const creative = s.creativeMode === 'DESIGN'
    ? 'Ralia designs your creative'
    : s.assetFiles.length > 0
      ? `${s.assetFiles.length} file${s.assetFiles.length === 1 ? '' : 's'} uploaded`
      : 'No creative uploaded';
  const audience: string[] = [
    ...s.locations, ...s.ageBuckets, ...s.genders, ...s.languages, ...s.categories, ...s.platforms,
  ];

  return (
    <div>
      <Header title="Review &amp; fund" subtitle="Here's exactly what you're paying for. Pay securely with Paystack - your campaign then goes to review and is live the moment it's approved." />

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Branded summary */}
        <div className="overflow-hidden rounded-2xl border border-rule bg-paper">
          <div className="flex items-center gap-3 border-b border-rule bg-wash px-5 py-4">
            <LogoMark className="h-8 w-8" />
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-700">Campaign summary</div>
              <div className="truncate text-[18px] font-extrabold text-ink">{s.name.trim() || 'Untitled campaign'}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px bg-rule sm:grid-cols-3">
            <FundFact label="Objective" value={objectiveLabel(s.objective)} />
            <FundFact label="Promoters" value={quote ? quote.slots_total.toLocaleString('en-NG') : '-'} />
            <FundFact label="Target views" value={quote ? `${quote.target_reach.toLocaleString('en-NG')}` : '-'} />
            <FundFact label="Each promoter earns" value={quote?.promoter_fee.amount_display ?? '-'} />
            <FundFact label="Schedule" value={cadenceLabel} />
            <FundFact label="Runs" value={runWindow} />
            <FundFact label="Promoter tier" value={s.minTier ? `${s.minTier.charAt(0)}${s.minTier.slice(1).toLowerCase()}+` : 'Any tier'} />
          </div>

          <div className="border-t border-rule px-5 py-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Who sees it</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {audience.length === 0 ? (
                <span className="rounded-full bg-wash px-3 py-1 text-[12.5px] font-semibold text-ink">Anyone, nationwide</span>
              ) : (
                audience.slice(0, 10).map((a) => (
                  <span key={a} className="rounded-full bg-wash px-3 py-1 text-[12.5px] font-semibold text-ink">{a}</span>
                ))
              )}
              {audience.length > 10 && <span className="rounded-full bg-wash px-3 py-1 text-[12.5px] font-semibold text-muted">+{audience.length - 10} more</span>}
            </div>
          </div>

          <div className="grid gap-px border-t border-rule bg-rule sm:grid-cols-2">
            <div className="bg-paper px-5 py-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Creative</div>
              <div className="mt-1 text-[13.5px] font-semibold text-ink">{creative}</div>
            </div>
            <div className="bg-paper px-5 py-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Destination link</div>
              <div className="mt-1 truncate text-[13.5px] font-semibold text-ink">{s.destination_url.trim() || 'No link (post only)'}</div>
            </div>
          </div>
        </div>

        {/* Pay box */}
        <div className="h-max rounded-2xl border border-rule bg-paper p-5">
          <div className="text-[13px] text-muted">Amount to pay</div>
          <div className="mt-1 text-[32px] font-extrabold tracking-tight text-brand">{quote?.price.amount_display ?? '-'}</div>
          {quote && (
            <div className="mt-1 text-[12.5px] text-muted">
              {quote.slots_total.toLocaleString('en-NG')} promoters × {quote.unit_price.amount_display}
            </div>
          )}
          <div className="mt-4 rounded-xl bg-wash px-4 py-3 text-[12.5px] text-muted">
            Card details are entered in Paystack&apos;s secure window - Ralia never sees your card number.
          </div>
          <div className="mt-3 rounded-xl bg-wash px-4 py-3 text-[12.5px] text-muted">
            After payment your campaign goes to review. We&apos;ll email you a receipt now, and again the moment it&apos;s approved and live.
          </div>
        </div>
      </div>
    </div>
  );
}

function FundFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-paper px-5 py-3.5">
      <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">{label}</div>
      <div className="mt-0.5 text-[14.5px] font-bold text-ink">{value}</div>
    </div>
  );
}

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
              value === o ? 'bg-ink text-paper' : 'border border-rule bg-paper text-ink hover:border-ink/30'
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
        on ? 'bg-ink text-paper' : 'border border-rule bg-paper text-ink hover:border-ink/30'
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

function ChipMulti({ label, options, value, onToggle, allLabel, onClear }: { label: string; options: string[]; value: string[]; onToggle: (v: string) => void; allLabel?: string; onClear?: () => void }) {
  const allOn = value.length === 0;
  return (
    <div>
      <p className="mb-2 text-[14px] font-semibold text-ink">{label}</p>
      <div className="flex flex-wrap gap-2.5">
        {allLabel && onClear && (
          <button
            type="button"
            onClick={onClear}
            className={`rounded-full px-4 py-2 text-[13px] font-semibold transition ${
              allOn ? 'bg-ink text-paper' : 'border border-rule bg-paper text-ink hover:border-ink/30'
            }`}
          >
            {allLabel}
          </button>
        )}
        {options.map((o) => {
          const on = value.includes(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => onToggle(o)}
              className={`rounded-full px-4 py-2 text-[13px] font-semibold transition ${
                on ? 'bg-ink text-paper' : 'border border-rule bg-paper text-ink hover:border-ink/30'
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

// ── Resume: map a saved campaign back into wizard state ─────

function hydrateState(prev: State, c: Campaign): State {
  const t = c.targeting;
  // Reverse-map the saved targeting arrays back to selected labels (best-effort for
  // resuming a draft). Location: a bucket is on when all its states are present, or
  // "Nationwide" when no states are set. Age: match any bucket whose exact bounds are
  // in the saved range.
  const tStates = t?.states ?? [];
  const locations = t
    ? LOCATIONS.filter((l) => (l.states.length === 0 ? tStates.length === 0 : l.states.every((st) => tStates.includes(st)))).map((l) => l.label)
    : [];
  const tGenders = t?.genders ?? [];
  const genders = GENDER_OPTIONS.filter((g) => tGenders.includes(g.value)).map((g) => g.label);
  const ageBuckets = t
    ? AGE_BUCKETS.filter((a) => a.min != null && a.max != null && (t.age_min ?? -1) <= a.min && a.max <= (t.age_max ?? 200)).map((a) => a.label)
    : [];
  const platforms = t ? PLATFORMS.filter((p) => (t.platforms ?? []).includes(p.value)).map((p) => p.label) : [];
  const rc = c.role_config ?? {};
  return {
    ...prev,
    name: c.name ?? '',
    objective: c.objective ?? 'AWARENESS',
    description: c.description ?? '',
    destination_url: c.destination_url ?? '',
    minTier: c.min_tier && c.min_tier !== 'BRONZE' ? c.min_tier : '',
    startsAt: c.starts_at ? c.starts_at.slice(0, 10) : '',
    endsAt: c.ends_at ? c.ends_at.slice(0, 10) : '',
    cadence: c.cadence ?? 'ONE_OFF',
    customPosts: c.cadence === 'CUSTOM' && c.posts_required ? String(c.posts_required) : '',
    creativeMode: c.needs_creative ? 'DESIGN' : prev.creativeMode,
    designBrief: c.design_brief ?? '',
    locations,
    ageBuckets,
    genders,
    languages: t?.languages ?? [],
    categories: t?.categories ?? [],
    platforms,
    role: t?.roles?.[0] ?? '',
    contentType: rc.content_type ?? '',
    taskMode: (rc.task_mode as State['taskMode']) ?? '',
    taskTypes: rc.task_types ?? [],
    budgetBucket: rc.budget_bucket ?? '',
    followingSize: rc.following_size ?? '',
    audienceReach: rc.audience_reach ?? '',
  };
}

export default function NewCampaignPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-24"><Spinner className="h-8 w-8 text-brand" /></div>}>
      <NewCampaignInner />
    </Suspense>
  );
}
