'use client';

import { useState } from 'react';
import type { EvidenceItem } from '@/lib/api';
import { platformLabel, timeAgo } from '@/lib/format';

/**
 * One promoter's proof. image_url is served by the API (/v1/files/:id streams the
 * local object, or redirects to the CDN), so any set URL is renderable - we fall
 * back to a branded placeholder only if the load actually fails.
 */
export function EvidenceCard({ item, onOpen }: { item: EvidenceItem; onOpen: () => void }) {
  const [imgOk, setImgOk] = useState(true);
  const showImage = !!item.image_url && imgOk;

  return (
    <button
      onClick={onOpen}
      className="group card overflow-hidden p-0 text-left transition hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-ink/5">
        {showImage ? (
          <img
            src={item.image_url!}
            alt={`Proof from ${item.promoter_name ?? 'promoter'}`}
            className="h-full w-full object-cover transition group-hover:scale-[1.03]"
            onError={() => setImgOk(false)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-ink/[0.06] to-ink/[0.02]">
            <span className="text-[13px] font-semibold text-muted">Screenshot</span>
          </div>
        )}

        <span className="absolute left-2.5 top-2.5 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
          {platformLabel(item.platform)}
        </span>
        <span className="absolute right-2.5 top-2.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
          {timeAgo(item.submitted_at)}
        </span>

        {item.verdict === 'PENDING' && (
          <span className="absolute bottom-2.5 left-2.5 rounded-full bg-warn-wash px-2.5 py-1 text-[11px] font-semibold text-warn">
            Pending review
          </span>
        )}
        {item.auto_flag && (
          <span className="absolute bottom-2.5 right-2.5 rounded-full bg-brand px-2.5 py-1 text-[11px] font-semibold text-white">
            Duplicate?
          </span>
        )}
      </div>

      <div className="flex items-center justify-between px-3.5 py-3">
        <div className="min-w-0">
          <div className="truncate text-[14px] font-bold text-ink">{item.promoter_name ?? 'Promoter'}</div>
          <div className="truncate text-[12.5px] text-muted">{item.promoter_handle ?? '-'}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[15px] font-bold tabular-nums text-ink">{item.views.toLocaleString('en-NG')}</div>
          <div className={`text-[11.5px] font-semibold ${item.views_verified ? 'text-ok' : 'text-muted'}`}>{item.views_verified ? 'verified views' : 'reported views'}</div>
          <div className="text-[10.5px] tabular-nums text-muted">{item.clicks.toLocaleString('en-NG')} link clicks</div>
        </div>
      </div>
    </button>
  );
}
