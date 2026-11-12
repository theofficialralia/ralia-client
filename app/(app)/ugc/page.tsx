'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, ApiError, type UgcContent } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Field, Textarea } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Spinner';

export default function UgcReviewsPage() {
  const qc = useQueryClient();
  const [rejecting, setRejecting] = useState<UgcContent | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const q = useQuery({ queryKey: ['ugc-reviews'], queryFn: () => api.get<UgcContent[]>('/v1/ugc/reviews') });
  const items = q.data ?? [];

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['ugc-reviews'] });
  const approve = useMutation({
    mutationFn: (id: string) => api.put(`/v1/ugc/content/${id}/approve`, {}),
    onSuccess: invalidate,
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Could not approve.'),
  });
  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.put(`/v1/ugc/content/${id}/reject`, { reason }),
    onSuccess: () => { setRejecting(null); setReason(''); invalidate(); },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Could not send it back.'),
  });

  return (
    <div className="mx-auto max-w-4xl">
      <div>
        <h1 className="text-[26px] font-extrabold tracking-tight text-ink">UGC to review</h1>
        <p className="mt-1 text-[15px] text-muted">Approve a creator’s content to let them post it, or send it back with notes. Nothing is posted until you approve it.</p>
      </div>

      {error && <div className="mt-5 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-[13px] text-brand-700">{error}</div>}

      {q.isLoading ? (
        <div className="flex justify-center py-24"><Spinner className="h-8 w-8 text-brand" /></div>
      ) : items.length === 0 ? (
        <div className="mt-8 grid place-items-center rounded-2xl border border-rule bg-wash/40 p-16 text-center">
          <p className="text-[15px] font-semibold text-ink">You’re all caught up</p>
          <p className="mt-1 text-[13.5px] text-muted">When a creator submits content, it’ll show here for your approval.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {items.map((c) => (
            <div key={c.id} className="overflow-hidden rounded-2xl border border-rule bg-paper">
              <Preview content={c} />
              <div className="p-4">
                <div className="text-[12px] font-semibold uppercase tracking-wide text-muted">{c.campaign_name ?? 'Campaign'}</div>
                <div className="mt-0.5 text-[14px] font-semibold text-ink">{c.promoter_name ?? 'A creator'}</div>
                {c.note && <p className="mt-2 text-[13px] leading-relaxed text-muted">“{c.note}”</p>}
                <div className="mt-4 flex gap-2">
                  <Button block onClick={() => approve.mutate(c.id)} loading={approve.isPending && approve.variables === c.id}>Approve</Button>
                  <Button block variant="secondary" onClick={() => { setRejecting(c); setError(null); }}>Send back</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {rejecting && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setRejecting(null)}>
          <div className="w-full max-w-md rounded-2xl bg-paper p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[18px] font-extrabold text-ink">Send back for changes</h3>
            <p className="mt-1 text-[13.5px] text-muted">Tell the creator what to change. They’ll revise and resubmit.</p>
            <div className="mt-4">
              <Field label="What needs changing?">
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Please add the product logo in the first 3 seconds…" autoFocus />
              </Field>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setRejecting(null)} disabled={reject.isPending}>Cancel</Button>
              <Button onClick={() => reason.trim() && reject.mutate({ id: rejecting.id, reason: reason.trim() })} loading={reject.isPending} disabled={!reason.trim()}>Send back</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Preview({ content }: { content: UgcContent }) {
  const url = content.file_id ? `/v1/files/${content.file_id}` : content.public_url;
  if (!url) {
    return <div className="grid h-44 place-items-center bg-wash text-[13px] text-muted">No preview</div>;
  }
  // A hosted file we stream; a public link we show as a tappable chip (could be any host).
  if (content.file_id) {
    return (
      <div className="relative aspect-video w-full overflow-hidden bg-ink/5">
        {/* Images render inline; video/other falls back to a link via onError. */}
        <img src={url} alt="UGC preview" className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="flex h-44 items-center justify-center bg-wash text-[13px] font-semibold text-brand-700 underline">
      Open the submitted content ↗
    </a>
  );
}
