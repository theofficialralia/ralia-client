'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, uuid, type CampaignAnalytics, type EvidenceItem } from '@/lib/api';
import type { Money } from '@/lib/money';
import { useAuth } from '@/lib/auth';
import { loadPaystack, PAYSTACK_PUBLIC_KEY, paystackConfigured } from '@/lib/paystack';
import { platformLabel, timeAgo } from '@/lib/format';
import { objectiveLabel } from '@/lib/campaign-options';
import { StatusPill } from '@/components/ui/StatusPill';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { EvidenceCard } from '@/components/campaigns/EvidenceCard';

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['campaign-analytics', id],
    queryFn: () => api.get<CampaignAnalytics>(`/v1/campaigns/${id}/analytics`),
  });

  const [channel, setChannel] = useState<string>('all');
  const [lightbox, setLightbox] = useState<EvidenceItem | null>(null);
  const search = useSearchParams();
  const justSubmitted = search.get('submitted') === '1';

  const channels = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.evidence.map((e) => e.platform)));
  }, [data]);

  const evidence = useMemo(() => {
    if (!data) return [];
    return channel === 'all' ? data.evidence : data.evidence.filter((e) => e.platform === channel);
  }, [data, channel]);

  if (isLoading) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8 text-brand" /></div>;
  if (isError || !data) return <p className="py-24 text-center text-muted">Couldn&apos;t load this campaign.</p>;

  const verified = data.evidence.filter((e) => e.verdict === 'APPROVED').length;

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/campaigns" className="inline-flex items-center gap-2 text-[14px] font-semibold text-ink hover:text-brand-700">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          All Campaigns
        </Link>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled title="Pausing is a fast-follow">
            ❙❙ Pause
          </Button>
          <Button variant="secondary" size="sm" disabled title="Report export is a fast-follow">
            ↓ Export report
          </Button>
        </div>
      </div>

      {/* Title */}
      <div className="mt-6 flex items-center gap-3">
        <StatusPill status={data.status} />
        <span className="text-[13.5px] text-muted">
          {objectiveLabel(data.objective)}
          {data.launched_at && ` · Launched ${new Date(data.launched_at).toLocaleDateString('en-CA')}`}
        </span>
      </div>
      <h1 className="mt-2 text-[28px] font-extrabold tracking-tight text-ink">{data.name}</h1>

      {/* Lifecycle gate: review → approve → pay → live. Nothing goes live without an admin review. */}
      <LifecyclePanel campaignId={id} status={data.status} amount={data.budget} justSubmitted={justSubmitted} />

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Amount spent" value={data.spent.amount_display} foot={`of ${data.budget.amount_display} budget`} />
        <Stat
          label="Views delivered"
          value={data.views_delivered.toLocaleString('en-NG')}
          foot={`${data.cost_per_view.amount_display} per view`}
        />
        <Stat
          label="Clicks delivered"
          value={data.clicks_delivered.toLocaleString('en-NG')}
          foot="Real clicks to your link"
        />
        <Stat
          label="Accepted by promoters"
          value={String(data.offers_accepted)}
          foot={`Offer acceptance ${Math.round(data.acceptance_rate * 100)}%`}
        />
        <Stat label="Completed" value={`${data.completed}/${data.slots_total}`} foot="Verified &amp; paid" />
      </div>

      {/* Evidence gallery */}
      <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] text-muted">Proof of promotion</p>
          <h2 className="text-[22px] font-extrabold tracking-tight text-ink">
            Evidence gallery · {verified} verified
          </h2>
          <p className="mt-1 text-[13.5px] text-muted">Every screenshot is a post you paid for. Zoom and filter.</p>
        </div>
        {channels.length > 1 && (
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="rounded-full border border-rule bg-paper px-4 py-2 text-[13.5px] font-semibold text-ink outline-none focus:border-brand"
          >
            <option value="all">All channels</option>
            {channels.map((c) => (
              <option key={c} value={c}>{platformLabel(c)}</option>
            ))}
          </select>
        )}
      </div>

      {evidence.length > 0 ? (
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
          {evidence.map((item) => (
            <EvidenceCard key={item.submission_id} item={item} onOpen={() => setLightbox(item)} />
          ))}
        </div>
      ) : (
        <div className="card mt-5 px-6 py-16 text-center">
          <p className="text-[15px] font-semibold text-ink">No proof yet</p>
          <p className="mt-1 text-[13.5px] text-muted">
            Screenshots will appear here as promoters submit proof of their posts.
          </p>
        </div>
      )}

      {lightbox && <Lightbox item={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}

/**
 * The pre-live lifecycle for a campaign: submitted → under review → approved →
 * pay → live. Payment is gated behind admin approval — it only appears once the
 * campaign reaches CONFIRMING_PAYMENT.
 */
function LifecyclePanel({ campaignId, status, amount, justSubmitted }: {
  campaignId: string; status: string; amount: Money; justSubmitted: boolean;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [err, setErr] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  async function confirmPayment(reference: string) {
    try {
      await api.post(`/v1/campaigns/${campaignId}/payments/paystack/verify`, { reference }, { idempotencyKey: uuid() });
      await qc.invalidateQueries({ queryKey: ['campaign-analytics', campaignId] });
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'We could not confirm the payment. If you were charged, contact support.');
    } finally {
      setPaying(false);
    }
  }

  async function pay() {
    if (!user) return;
    if (!paystackConfigured()) return setErr('Paystack is not configured (NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY).');
    setErr(null); setPaying(true);
    try {
      const paystack = await loadPaystack();
      paystack.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: user.email,
        amount: amount.amount_minor,
        currency: 'NGN',
        ref: `RLA-${campaignId.slice(0, 8)}-${uuid().slice(0, 8)}`,
        metadata: { campaign_id: campaignId },
        onClose: () => { setErr('Payment window closed before completing.'); setPaying(false); },
        callback: (res) => { void confirmPayment(res.reference); },
      }).openIframe();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not start payment.');
      setPaying(false);
    }
  }

  if (status === 'PENDING_APPROVAL') {
    return (
      <div className="mt-5 rounded-2xl border border-warn/30 bg-warn-wash px-5 py-4">
        <p className="text-[15px] font-bold text-warn">{justSubmitted ? 'Submitted for review ✓' : 'Under review'}</p>
        <p className="mt-1 text-[13.5px] text-body">
          Our team reviews every campaign before it goes live. We&apos;ll email you the moment it&apos;s approved — then you can pay to launch.
        </p>
      </div>
    );
  }

  if (status === 'REJECTED') {
    return (
      <div className="mt-5 rounded-2xl border border-brand/30 bg-brand/5 px-5 py-4">
        <p className="text-[15px] font-bold text-brand-700">This campaign was declined</p>
        <p className="mt-1 text-[13.5px] text-body">
          It didn&apos;t pass review. Check your email for the reason, or contact support if you think this was a mistake.
        </p>
      </div>
    );
  }

  if (status === 'CONFIRMING_PAYMENT') {
    return (
      <div className="mt-5 rounded-2xl border border-ok/30 bg-ok-wash px-5 py-4">
        <p className="text-[15px] font-bold text-ok">Approved — pay to go live</p>
        <p className="mt-1 text-[13.5px] text-body">Your campaign passed review. Pay securely with Paystack and it goes live the moment payment clears.</p>
        <div className="mt-3 flex items-center gap-4">
          <span className="text-[24px] font-extrabold tracking-tight text-ink">{amount.amount_display}</span>
          <Button onClick={pay} loading={paying}>Pay with Paystack</Button>
        </div>
        {err && <p className="mt-2 text-[12.5px] text-brand-700">{err}</p>}
      </div>
    );
  }

  return null;
}

function Stat({ label, value, foot }: { label: string; value: string; foot: string }) {
  return (
    <div className="stat-card">
      <p className="text-[13px] text-muted">{label}</p>
      <p className="mt-1.5 text-[26px] font-extrabold tracking-tight text-ink">{value}</p>
      <p className="mt-2 text-[12.5px] font-semibold text-brand-700" dangerouslySetInnerHTML={{ __html: foot }} />
    </div>
  );
}

function Lightbox({ item, onClose }: { item: EvidenceItem; onClose: () => void }) {
  const [imgOk, setImgOk] = useState(true);
  // image_url is served by the API (/v1/files/:id streams local, redirects to the CDN
  // otherwise), so any set URL is renderable — fall back only if the load actually fails.
  const showImage = !!item.image_url && imgOk;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-paper" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-rule px-5 py-4">
          <div>
            <div className="text-[15px] font-bold text-ink">{item.promoter_name ?? 'Promoter'}</div>
            <div className="text-[12.5px] text-muted">
              {item.promoter_handle} · {platformLabel(item.platform)} · {timeAgo(item.submitted_at)}
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink" aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex aspect-[4/5] items-center justify-center bg-ink/5">
          {showImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image_url!} alt="Proof" className="h-full w-full object-contain" onError={() => setImgOk(false)} />
          ) : (
            <span className="text-[13px] text-muted">Screenshot unavailable</span>
          )}
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-[14px] font-bold text-ink">{item.views.toLocaleString('en-NG')} views</span>
          {item.public_url && (
            <a href={item.public_url} target="_blank" rel="noreferrer" className="text-[13.5px] font-semibold text-brand-700">
              View original post ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
