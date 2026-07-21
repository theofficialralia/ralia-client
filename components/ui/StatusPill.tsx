import type { CampaignStatus } from '@/lib/api';

const styles: Record<string, { label: string; cls: string; dot: string }> = {
  DRAFT: { label: 'Draft', cls: 'bg-rule/50 text-body', dot: 'bg-muted' },
  QUOTED: { label: 'Quoted', cls: 'bg-rule/50 text-body', dot: 'bg-muted' },
  PENDING_APPROVAL: { label: 'Pending review', cls: 'bg-warn-wash text-warn', dot: 'bg-warn' },
  CONFIRMING_PAYMENT: { label: 'Awaiting payment', cls: 'bg-warn-wash text-warn', dot: 'bg-warn' },
  REJECTED: { label: 'Rejected', cls: 'bg-brand/10 text-brand-700', dot: 'bg-brand' },
  LIVE: { label: 'Live', cls: 'bg-brand/10 text-brand-700', dot: 'bg-brand' },
  PAUSED: { label: 'Paused', cls: 'bg-warn-wash text-warn', dot: 'bg-warn' },
  ENDED: { label: 'Ended', cls: 'bg-rule/50 text-body', dot: 'bg-muted' },
  FULFILLED: { label: 'Fulfilled', cls: 'bg-ok-wash text-ok', dot: 'bg-ok' },
  SETTLED: { label: 'Settled', cls: 'bg-ok-wash text-ok', dot: 'bg-ok' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-rule/50 text-body', dot: 'bg-muted' },
};

export function StatusPill({ status }: { status: CampaignStatus | string }) {
  const s = styles[status] ?? { label: status, cls: 'bg-rule/50 text-body', dot: 'bg-muted' };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${s.cls}`}>
      {s.label}
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
    </span>
  );
}
