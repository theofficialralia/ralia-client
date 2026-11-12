'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError, uuid, type Campaign, type CampaignPlan, type EnterprisePricing, type Quote } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { loadPaystack, PAYSTACK_PUBLIC_KEY, paystackConfigured } from '@/lib/paystack';
import { getFbCookies, newEventId, track } from '@/lib/meta-pixel';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';
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
    tag: 'Live',
    body: 'Creators make fresh content about your product. You approve each piece before it posts. ₦100,000 per 5,000 people reached.',
    ready: true,
  },
  {
    id: 'ENTERPRISE',
    title: 'Enterprise',
    tag: 'Live',
    body: 'A hands-on package for companies — your own account manager, strategy and hand-picked creators. From ₦1,000,000.',
    ready: true,
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
  // UGC brief — a faithful replica of the 4-part brief (ralia_ugc_order_flow.html).
  // 1. About your product
  ugcBrand: string;
  ugcProductLink: string;
  ugcHasBrief: string;
  ugcGoal: string;
  ugcAudience: string;
  ugcMarketLocation: string;
  // 2. Content specifications
  ugcContentType: string;
  ugcQuantity: string;
  ugcCustomQuantity: string;
  ugcVideoFormat: string;
  ugcDuration: string;
  ugcImageSpecs: string;
  ugcPlatformUse: string;
  ugcCaptions: string;
  ugcCreatorPost: string;
  // 3. Creative guidelines
  ugcKeyMessage: string;
  ugcHook: string;
  ugcCta: string;
  ugcRestrictions: string;
  ugcReferences: string;
  ugcAssets: string;
  // 4. Rights, delivery and budget
  ugcUsageRights: string;
  ugcProductDelivery: string;
  ugcCreatorLocation: string;
  ugcRawFootage: string;
  ugcApproval: string;
  ugcRevisions: string;
  ugcBudget: string;
  ugcExtra: string;
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
  ugcBrand: '',
  ugcProductLink: '',
  ugcHasBrief: 'No',
  ugcGoal: '',
  ugcAudience: '',
  ugcMarketLocation: '',
  ugcContentType: 'Video',
  ugcQuantity: '',
  ugcCustomQuantity: '',
  ugcVideoFormat: '9:16 vertical',
  ugcDuration: '15–30 seconds',
  ugcImageSpecs: '',
  ugcPlatformUse: '',
  ugcCaptions: 'Yes, include captions',
  ugcCreatorPost: 'No, content only',
  ugcKeyMessage: '',
  ugcHook: '',
  ugcCta: 'Recommend a CTA',
  ugcRestrictions: '',
  ugcReferences: '',
  ugcAssets: '',
  ugcUsageRights: '',
  ugcProductDelivery: '',
  ugcCreatorLocation: '',
  ugcRawFootage: 'No, final edited content only',
  ugcApproval: 'Yes, draft approval required',
  ugcRevisions: '2 consolidated rounds',
  ugcBudget: '',
  ugcExtra: '',
};

const PROMOTE_STEPS = ['Campaign', 'Audience', 'Reach & price', 'Pay'];
const UGC_STEPS = ['Product', 'Content', 'Creative', 'Rights', 'Reach & price', 'Pay'];
const PROMOTE_PRICING = { label: '₦15,000 for every 1,000 people reached', presets: [1000, 2000, 5000, 10000, 25000] };
const UGC_PRICING = { label: '₦100,000 for every 5,000 people reached, per creator', presets: [5000, 10000, 15000, 25000] };

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
      // "Design one for me" is the UGC service — switch into that flow.
      setService('UGC');
      setStep(1);
      setError(null);
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

  // Validate one UGC brief step (steps 1–4), matching the required (*) fields of
  // ralia_ugc_order_flow.html. Returns an error message, or null when it's valid.
  function validateUgcStep(stepNo: number): string | null {
    if (stepNo === 1) {
      if (!s.ugcBrand.trim()) return 'Add your brand or product name.';
      if (!s.ugcGoal) return 'Tell us what the content should achieve.';
      if (!s.ugcMarketLocation.trim()) return 'Add your target market / location.';
    }
    if (stepNo === 2) {
      if (!s.ugcQuantity) return 'Choose how many deliverables you need.';
      if (s.ugcQuantity === 'Custom quantity' && Number(s.ugcCustomQuantity) < 1) return 'Enter a quantity of at least 1.';
      if (s.ugcContentType !== 'Video' && !s.ugcImageSpecs.trim()) return 'Add your image specifications.';
      if (!s.ugcPlatformUse) return 'Tell us where you’ll use the content.';
    }
    if (stepNo === 3) {
      if (!s.ugcKeyMessage.trim()) return 'Add the key message and talking points.';
      if (!s.ugcRestrictions.trim()) return 'Add do’s, don’ts and mandatory requirements (or write “None”).';
    }
    if (stepNo === 4) {
      if (!s.ugcUsageRights) return 'Choose the usage rights you need.';
      if (!s.ugcProductDelivery) return 'Tell us about physical product logistics.';
      const needsLoc = s.ugcProductDelivery === 'Ship product to creator' || s.ugcProductDelivery === 'Local delivery / collection';
      if (needsLoc && !s.ugcCreatorLocation.trim()) return 'Add the preferred creator / delivery location.';
      if (!s.endsAt) return 'Add your required delivery date.';
      if (s.endsAt < new Date().toISOString().slice(0, 10)) return 'The delivery date can’t be in the past.';
      if (!s.ugcBudget) return 'Choose a budget preference.';
    }
    return null;
  }

  // Advance a UGC brief step after validating it (steps 1–3 just move forward).
  function ugcAdvance(stepNo: number) {
    const err = validateUgcStep(stepNo);
    if (err) return setError(err);
    setError(null);
    setStep(stepNo + 1);
  }

  // After the 4-part brief: create (or update) the UGC campaign, save the full
  // structured brief, then move to the reach & price step.
  async function saveUgcCampaign() {
    const err = validateUgcStep(4);
    if (err) return setError(err);
    setBusy(true); setError(null);
    try {
      const body = { name: s.ugcBrand.trim(), objective: 'AWARENESS', service_type: 'UGC', slots_total: 1, ends_at: s.endsAt || null };
      const campaign = campaignId
        ? await api.patch<Campaign>(`/v1/campaigns/${campaignId}`, body)
        : await api.post<Campaign>('/v1/campaigns', body);
      setCampaignId(campaign.id);
      await api.put(`/v1/campaigns/${campaign.id}/ugc-brief`, {
        product: {
          brand: s.ugcBrand,
          product_link: s.ugcProductLink,
          has_brief: s.ugcHasBrief,
          goal: s.ugcGoal,
          audience: s.ugcAudience,
          market_location: s.ugcMarketLocation,
        },
        content_specs: {
          content_type: s.ugcContentType,
          quantity: s.ugcQuantity === 'Custom quantity' ? s.ugcCustomQuantity : s.ugcQuantity,
          video_format: s.ugcContentType === 'Images / product photos' ? null : s.ugcVideoFormat,
          duration: s.ugcContentType === 'Images / product photos' ? null : s.ugcDuration,
          image_specs: s.ugcImageSpecs || null,
          platform_use: s.ugcPlatformUse,
          captions: s.ugcCaptions,
          creator_post: s.ugcCreatorPost,
        },
        guidelines: {
          key_message: s.ugcKeyMessage,
          hook: s.ugcHook,
          cta: s.ugcCta,
          restrictions: s.ugcRestrictions,
          references: s.ugcReferences,
          assets: s.ugcAssets,
        },
        rights: {
          usage_rights: s.ugcUsageRights,
          product_delivery: s.ugcProductDelivery,
          creator_location: s.ugcCreatorLocation || null,
          raw_footage: s.ugcRawFootage,
          approval: s.ugcApproval,
          revisions: s.ugcRevisions,
          budget: s.ugcBudget,
          extra: s.ugcExtra || null,
        },
      });
      setQuote(null);
      setStep(5);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save your brief.');
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
      setStep((n) => n + 1);
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

  // Enterprise is a lead, not a campaign — its own self-contained flow.
  if (service === 'ENTERPRISE') {
    return <EnterpriseFlow onBack={() => setService(null)} onDone={() => router.push('/campaigns')} />;
  }

  const isUgc = service === 'UGC';
  const steps = isUgc ? UGC_STEPS : PROMOTE_STEPS;
  const pricing = isUgc ? UGC_PRICING : PROMOTE_PRICING;
  const reachStepNo = isUgc ? 5 : 3;
  const payStepNo = isUgc ? 6 : 4;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <button
          onClick={() => (step === 1 ? setService(null) : setStep((n) => n - 1))}
          className="flex items-center gap-1.5 text-[15px] font-semibold text-muted hover:text-ink"
        >
          <IconArrowLeft className="h-4 w-4" /> {step === 1 ? 'Back to services' : 'Back'}
        </button>
        <span className="text-[13px] text-muted">Step {step} of {steps.length}</span>
      </div>

      <div className="mt-5"><Stepper steps={steps} current={step} /></div>

      <div className="mt-6">
        {/* Promote: Campaign → Audience → Reach → Pay.
            UGC: Product → Content → Creative → Rights → Reach → Pay (replica of the brief). */}
        {!isUgc && step === 1 && <CampaignStep s={s} set={set} />}
        {!isUgc && step === 2 && <AudienceStep s={s} set={set} />}
        {isUgc && step === 1 && <UgcProductStep s={s} set={set} />}
        {isUgc && step === 2 && <UgcContentStep s={s} set={set} />}
        {isUgc && step === 3 && <UgcCreativeStep s={s} set={set} />}
        {isUgc && step === 4 && <UgcRightsStep s={s} set={set} />}
        {step === reachStepNo && campaignId && (
          <ReachStep campaignId={campaignId} reach={s.targetReach} setReach={(v) => set({ targetReach: v })} pricing={pricing} />
        )}
        {step === payStepNo && <PayStep quote={quote} isUgc={isUgc} />}

        {error && (
          <div className="mt-5 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-[13px] text-brand-700">{error}</div>
        )}

        <div className="mt-7 flex items-center justify-between">
          <Button variant="secondary" onClick={() => (step === 1 ? setService(null) : setStep((n) => n - 1))} disabled={busy}>
            <IconArrowLeft className="h-4 w-4" /> Back
          </Button>
          {!isUgc && step === 1 && <Button onClick={saveCampaign} loading={busy}>Continue <IconArrowRight className="h-4 w-4" /></Button>}
          {!isUgc && step === 2 && <Button onClick={saveTargeting} loading={busy}>Continue <IconArrowRight className="h-4 w-4" /></Button>}
          {isUgc && step === 1 && <Button onClick={() => ugcAdvance(1)}>Continue <IconArrowRight className="h-4 w-4" /></Button>}
          {isUgc && step === 2 && <Button onClick={() => ugcAdvance(2)}>Continue <IconArrowRight className="h-4 w-4" /></Button>}
          {isUgc && step === 3 && <Button onClick={() => ugcAdvance(3)}>Continue <IconArrowRight className="h-4 w-4" /></Button>}
          {isUgc && step === 4 && <Button onClick={saveUgcCampaign} loading={busy}>Continue <IconArrowRight className="h-4 w-4" /></Button>}
          {step === reachStepNo && <Button onClick={lockQuote} loading={busy}>See price &amp; continue <IconArrowRight className="h-4 w-4" /></Button>}
          {step === payStepNo && <Button onClick={pay} loading={busy} disabled={!quote}>Pay with Paystack</Button>}
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

// ── Enterprise ─────────────────────────────────────────────

function EnterpriseFlow({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [pricing, setPricing] = useState<EnterprisePricing | null>(null);
  const [step, setStep] = useState(1);
  const [brief, setBrief] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [months, setMonths] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.get<EnterprisePricing>('/v1/enterprise/pricing').then(setPricing).catch(() => setError('Could not load the Enterprise plans.'));
  }, []);

  function next() {
    if (!brief.trim()) return setError('Tell us a bit about what you need.');
    if (!phone.trim()) return setError('Add a phone number so we can reach you.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setError('Add a valid email.');
    setError(null);
    setStep(2);
  }

  async function submit() {
    if (!months) return setError('Pick a plan.');
    setBusy(true); setError(null);
    try {
      await api.post('/v1/enterprise/leads', { brief: brief.trim(), contact_phone: phone.trim(), contact_email: email.trim(), duration_months: months });
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not send your enquiry.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl py-10 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600"><IconCheck className="h-7 w-7" /></div>
        <h2 className="mt-5 text-[22px] font-bold text-ink">Enquiry sent</h2>
        <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-muted">Thanks — our team will reach out shortly to build your package and get you started.</p>
        <div className="mt-6 flex justify-center"><Button onClick={onDone}>Back to campaigns</Button></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button onClick={() => (step === 1 ? onBack() : setStep(1))} className="flex items-center gap-1.5 text-[15px] font-semibold text-muted hover:text-ink">
        <IconArrowLeft className="h-4 w-4" /> {step === 1 ? 'Back to services' : 'Back'}
      </button>

      <div className="mt-6">
        {step === 1 ? (
          <div className="space-y-6">
            <Header title="Tell us what you need" subtitle="A hands-on package, run with you by our team. No reach targets — just tell us your goal and we’ll shape it together." />
            <Field label="What are you looking to do?">
              <Textarea value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="We’re launching a new product line in Q1 and want a full creator-led campaign with strategy support…" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 801 234 5678" /></Field>
              <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" /></Field>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <Header title="Choose your plan" subtitle="Pick how long you want us running with you. You’ll confirm the details with your account manager." />
            {!pricing ? (
              <div className="flex justify-center py-10"><Spinner className="h-7 w-7 text-brand" /></div>
            ) : (
              <>
                <div className="grid gap-3">
                  {pricing.tiers.map((t) => (
                    <button
                      key={t.months}
                      onClick={() => setMonths(t.months)}
                      className={`flex items-center justify-between rounded-2xl border p-4 text-left transition ${months === t.months ? 'border-brand bg-brand/[0.03] ring-1 ring-brand/30' : 'border-rule hover:border-brand/40'}`}
                    >
                      <span className="text-[15px] font-semibold text-ink">{t.months} month{t.months === 1 ? '' : 's'}</span>
                      <span className="text-[18px] font-extrabold text-brand">{t.price.amount_display}</span>
                    </button>
                  ))}
                </div>
                {pricing.benefits.length > 0 && (
                  <div className="rounded-2xl border border-rule bg-wash/40 p-5">
                    <div className="text-[13px] font-semibold text-ink">What’s included</div>
                    <ul className="mt-2 space-y-1.5">
                      {pricing.benefits.map((b, i) => (
                        <li key={i} className="flex items-start gap-2 text-[14px] text-body"><IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {b}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {error && <div className="mt-5 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-[13px] text-brand-700">{error}</div>}

        <div className="mt-7 flex items-center justify-between">
          <Button variant="secondary" onClick={() => (step === 1 ? onBack() : setStep(1))} disabled={busy}><IconArrowLeft className="h-4 w-4" /> Back</Button>
          {step === 1
            ? <Button onClick={next}>Continue <IconArrowRight className="h-4 w-4" /></Button>
            : <Button onClick={submit} loading={busy} disabled={!months}>Send enquiry</Button>}
        </div>
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

// ── UGC brief — faithful replica of ralia_ugc_order_flow.html (4 parts) ──────

type Opt = { value: string; label: string; hint?: string };

/** A radio group styled like the prototype's `.choice` cards. */
function RadioGroup({ legend, required, options, value, onChange, cols = 2 }: {
  legend: string; required?: boolean; options: Opt[]; value: string; onChange: (v: string) => void; cols?: 1 | 2;
}) {
  return (
    <div>
      <p className="mb-2 text-[13px] font-semibold text-ink">{legend}{required && <span className="text-brand"> *</span>}</p>
      <div className={`grid gap-2.5 ${cols === 2 ? 'sm:grid-cols-2' : ''}`}>
        {options.map((o) => {
          const on = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              className={`flex items-start gap-2.5 rounded-xl border p-3 text-left text-[13px] font-semibold transition ${on ? 'border-brand bg-brand/[0.04] ring-1 ring-brand/25' : 'border-rule hover:border-brand/40'}`}
            >
              <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border ${on ? 'border-brand' : 'border-rule'}`}>
                {on && <span className="h-2 w-2 rounded-full bg-brand" />}
              </span>
              <span>
                {o.label}
                {o.hint && <span className="mt-0.5 block font-normal text-muted">{o.hint}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** A labelled native select matching the prototype's `.control`. */
function SelectField({ label, required, value, onChange, options, hint, placeholder }: {
  label: string; required?: boolean; value: string; onChange: (v: string) => void; options: string[]; hint?: string; placeholder?: string;
}) {
  return (
    <Field label={label + (required ? ' *' : '')} hint={hint}>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </Field>
  );
}

function UgcProductStep({ s, set }: { s: State; set: (p: Partial<State>) => void }) {
  return (
    <div className="space-y-6">
      <Header title="1. About your product" subtitle="Tell us what we’re creating content for and who it needs to reach." />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Brand or product name *">
          <Input value={s.ugcBrand} onChange={(e) => set({ ugcBrand: e.target.value })} placeholder="e.g. Brand / product name" />
        </Field>
        <Field label="Website or product link" hint="If you don’t have a website, add a product page or social profile.">
          <Input type="url" value={s.ugcProductLink} onChange={(e) => set({ ugcProductLink: e.target.value })} placeholder="https://yourwebsite.com" />
        </Field>
      </div>
      <RadioGroup
        legend="Do you already have a creative brief?" required
        value={s.ugcHasBrief} onChange={(v) => set({ ugcHasBrief: v })}
        options={[{ value: 'Yes', label: 'Yes, I have a brief to share' }, { value: 'No', label: 'No, help me define it' }]}
      />
      <RadioGroup
        legend="What should the content achieve?" required cols={1}
        value={s.ugcGoal} onChange={(v) => set({ ugcGoal: v })}
        options={[
          { value: 'Awareness / explain product', label: 'Awareness or explain the product' },
          { value: 'Sales', label: 'Encourage purchases' },
          { value: 'Traffic / app installs', label: 'Website visits or app installs' },
          { value: 'Leads / enquiries', label: 'Generate leads or enquiries' },
          { value: 'Demonstration / credibility', label: 'Demonstrate use or build credibility' },
        ]}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Target audience" hint="Who is most likely to care about this product?">
          <Input value={s.ugcAudience} onChange={(e) => set({ ugcAudience: e.target.value })} placeholder="e.g. young professionals" />
        </Field>
        <Field label="Target market / location *" hint="Where are the customers you want to reach?">
          <Input value={s.ugcMarketLocation} onChange={(e) => set({ ugcMarketLocation: e.target.value })} placeholder="e.g. Nigeria, Lagos, or Ghana" />
        </Field>
      </div>
    </div>
  );
}

function UgcContentStep({ s, set }: { s: State; set: (p: Partial<State>) => void }) {
  const isImagesOnly = s.ugcContentType === 'Images / product photos';
  const showVideo = !isImagesOnly;
  const showImage = s.ugcContentType !== 'Video';
  return (
    <div className="space-y-6">
      <Header title="2. Content specifications" subtitle="Define the deliverables so the scope and quote are clear." />
      <RadioGroup
        legend="What do you need created?" required cols={1}
        value={s.ugcContentType} onChange={(v) => set({ ugcContentType: v })}
        options={[
          { value: 'Video', label: 'UGC video' },
          { value: 'Images / product photos', label: 'Images / product photos' },
          { value: 'Video and images', label: 'Videos and images' },
        ]}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField label="Number of final deliverables" required placeholder="Choose quantity" value={s.ugcQuantity} onChange={(v) => set({ ugcQuantity: v })} options={['1', '3', '5', 'Custom quantity']} />
        {s.ugcQuantity === 'Custom quantity' && (
          <Field label="How many deliverables?">
            <input type="number" min={1} className="input" value={s.ugcCustomQuantity} onChange={(e) => set({ ugcCustomQuantity: e.target.value })} placeholder="Enter quantity" />
          </Field>
        )}
        {showVideo && (
          <SelectField label="Video format" required value={s.ugcVideoFormat} onChange={(v) => set({ ugcVideoFormat: v })} options={['9:16 vertical', '1:1 square', '16:9 landscape', 'Multiple formats', 'Recommend format']} />
        )}
        {showVideo && (
          <SelectField label="Preferred video duration" required value={s.ugcDuration} onChange={(v) => set({ ugcDuration: v })} options={['15–30 seconds', '30–60 seconds', 'Over 60 seconds', 'Recommend duration']} />
        )}
        {showImage && (
          <Field label="Image specifications">
            <Input value={s.ugcImageSpecs} onChange={(e) => set({ ugcImageSpecs: e.target.value })} placeholder="e.g. square product photos, 5 variations" />
          </Field>
        )}
        <SelectField label="Where will you use the content?" required placeholder="Select intended use" value={s.ugcPlatformUse} onChange={(v) => set({ ugcPlatformUse: v })} options={['Instagram', 'TikTok', 'Facebook', 'YouTube', 'Website / online store', 'Multiple platforms', 'Other / advise me']} hint="This is where the brand plans to use the content—not necessarily where the creator will post." />
        <SelectField label="Captions / on-screen text?" value={s.ugcCaptions} onChange={(v) => set({ ugcCaptions: v })} options={['Yes, include captions', 'No captions needed', 'Recommend what works best']} />
      </div>
      <RadioGroup
        legend="Do you need the creator to publish to their own account?"
        value={s.ugcCreatorPost} onChange={(v) => set({ ugcCreatorPost: v })}
        options={[{ value: 'No, content only', label: 'No, content only' }, { value: 'Yes, creator must publish', label: 'Yes, creator must publish too' }]}
      />
      <p className="text-[12px] text-muted">Creator publishing is a separate distribution deliverable and may affect price.</p>
    </div>
  );
}

function UgcCreativeStep({ s, set }: { s: State; set: (p: Partial<State>) => void }) {
  return (
    <div className="space-y-6">
      <Header title="3. Creative guidelines" subtitle="Give the creator enough direction to get the content right without repeated clarification." />
      <Field label="Key message and talking points *" hint="If you’re unsure, say so and Ralia can help shape the brief.">
        <Textarea value={s.ugcKeyMessage} onChange={(e) => set({ ugcKeyMessage: e.target.value })} placeholder="What should the creator communicate? Include essential product facts, benefits and approved claims." />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Opening hook / creative direction">
          <Textarea value={s.ugcHook} onChange={(e) => set({ ugcHook: e.target.value })} placeholder="How should it start? Or ask Ralia to recommend an approach." />
        </Field>
        <SelectField label="Call to action" value={s.ugcCta} onChange={(v) => set({ ugcCta: v })} options={['Recommend a CTA', 'Buy now', 'Visit website', 'Download app', 'Send a message / enquire', 'Learn more', 'No specific CTA', 'Other (explain below)']} />
      </div>
      <Field label="Do’s, don’ts and mandatory requirements *">
        <Textarea value={s.ugcRestrictions} onChange={(e) => set({ ugcRestrictions: e.target.value })} placeholder="Brand wording, logo use, visual rules, disclaimers, prohibited claims or competitor restrictions. Write ‘None’ if there are no special rules." />
      </Field>
      <Field label="Reference links or examples">
        <Textarea value={s.ugcReferences} onChange={(e) => set({ ugcReferences: e.target.value })} placeholder="Paste links to videos, images or styles you like. Optional." />
      </Field>
      <Field label="Brand assets or additional brief">
        <Textarea value={s.ugcAssets} onChange={(e) => set({ ugcAssets: e.target.value })} placeholder="Link to logo, brand guide, product images, script or shared folder. Do not paste passwords or private access credentials." />
      </Field>
    </div>
  );
}

function UgcRightsStep({ s, set }: { s: State; set: (p: Partial<State>) => void }) {
  const needsLoc = s.ugcProductDelivery === 'Ship product to creator' || s.ugcProductDelivery === 'Local delivery / collection';
  return (
    <div className="space-y-6">
      <Header title="4. Rights, delivery and budget" subtitle="Confirm how the content will be used and what is needed to deliver it." />
      <RadioGroup
        legend="Usage rights required" required
        value={s.ugcUsageRights} onChange={(v) => set({ ugcUsageRights: v })}
        options={[
          { value: 'Organic brand use', label: "Brand's organic channels / website" },
          { value: 'Organic and paid advertising', label: 'Organic use and paid advertising' },
          { value: 'Paid advertising only', label: 'Paid advertising only' },
          { value: 'Need advice on rights', label: 'Help me choose' },
        ]}
      />
      <p className="text-[12px] text-muted">The final quote should specify permitted channels, usage period and any territory restrictions. Creator-handle ads or whitelisting require separate agreement where applicable.</p>
      <RadioGroup
        legend="Does the creator need a physical product?" required
        value={s.ugcProductDelivery} onChange={(v) => set({ ugcProductDelivery: v })}
        options={[
          { value: 'Ship product to creator', label: 'Yes — ship it to the creator' },
          { value: 'Local delivery / collection', label: 'Yes — local delivery or collection' },
          { value: 'Creator already has product', label: 'Creator already has the product' },
          { value: 'No physical product needed', label: 'No physical product needed' },
        ]}
      />
      {needsLoc && (
        <Field label="Preferred creator / delivery location *" hint="Only used to assess fulfilment and delivery. This is separate from your target market.">
          <Input value={s.ugcCreatorLocation} onChange={(e) => set({ ugcCreatorLocation: e.target.value })} placeholder="e.g. Lagos, Nigeria" />
        </Field>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField label="Do you need raw footage?" value={s.ugcRawFootage} onChange={(v) => set({ ugcRawFootage: v })} options={['No, final edited content only', 'Yes, include raw footage', 'Recommend what I need']} />
        <SelectField label="Review a draft before final delivery?" required value={s.ugcApproval} onChange={(v) => set({ ugcApproval: v })} options={['Yes, draft approval required', 'No draft approval']} />
        <SelectField label="Included revision rounds" required value={s.ugcRevisions} onChange={(v) => set({ ugcRevisions: v })} options={['1 consolidated round', '2 consolidated rounds', '3 consolidated rounds']} hint="Changes beyond the approved brief may require a new quote." />
        <Field label="Required delivery date *" hint="We’ll confirm feasibility before accepting the order.">
          <Input type="date" value={s.endsAt} min={new Date().toISOString().slice(0, 10)} onChange={(e) => set({ endsAt: e.target.value })} />
        </Field>
      </div>
      <RadioGroup
        legend="Budget preference" required
        value={s.ugcBudget} onChange={(v) => set({ ugcBudget: v })}
        options={[
          { value: 'Choose a Ralia package', label: 'Choose a Ralia package' },
          { value: 'Recommend a suitable budget', label: 'Recommend a suitable budget' },
          { value: 'Custom quote', label: 'Request a custom quote' },
        ]}
      />
      <Field label="Anything else we should know?">
        <Textarea value={s.ugcExtra} onChange={(e) => set({ ugcExtra: e.target.value })} placeholder="Optional additional information." />
      </Field>
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-800">
        <strong>Before you continue:</strong> this brief helps Ralia scope your request. Price, creator availability, delivery dates and usage terms are confirmed before the campaign is booked. UGC content does not guarantee views, leads or sales.
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

function ReachStep({ campaignId, reach, setReach, pricing }: { campaignId: string; reach: string; setReach: (v: string) => void; pricing: { label: string; presets: number[] } }) {
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
      <Header title="How many people?" subtitle={`Tell us the reach you want. The price is simple and flat — ${pricing.label}.`} />

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
        {pricing.presets.map((n) => (
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

function PayStep({ quote, isUgc }: { quote: Quote | null; isUgc: boolean }) {
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
        {isUgc && ' Creators will then make content and send it to you to approve before anything is posted.'}
      </p>
    </div>
  );
}

// ── Small UI helpers ───────────────────────────────────────

function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center">
      {steps.map((label, i) => {
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
            {n < steps.length && <div className={`mx-3 h-px flex-1 border-t-2 border-dashed ${n < current ? 'border-brand/50' : 'border-rule'}`} />}
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
