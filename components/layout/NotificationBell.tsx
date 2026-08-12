'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { api, type NotificationList } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import { Spinner } from '@/components/ui/Spinner';

/** Bell + unread badge + dropdown feed for the client console. Polls on an interval. */
export function NotificationBell() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const q = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<NotificationList>('/v1/notifications'),
    refetchInterval: 45_000,
  });
  const markOne = useMutation({
    mutationFn: (id: string) => api.post(`/v1/notifications/${id}/read`, {}),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const markAll = useMutation({
    mutationFn: () => api.post('/v1/notifications/read-all', {}),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const unread = q.data?.unread ?? 0;
  const items = q.data?.items ?? [];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative grid h-9 w-9 place-items-center rounded-full border border-rule bg-paper text-body transition hover:text-ink"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
      >
        <BellIcon />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold leading-[18px] text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-96 overflow-hidden rounded-2xl border border-rule bg-paper shadow-xl">
          <div className="flex items-center justify-between border-b border-rule px-4 py-3">
            <span className="text-[14px] font-bold text-ink">Notifications</span>
            {unread > 0 && (
              <button onClick={() => markAll.mutate()} className="text-[12px] font-semibold text-brand">Mark all read</button>
            )}
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {q.isLoading ? (
              <div className="grid h-24 place-items-center"><Spinner className="h-5 w-5 text-brand" /></div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center text-[13px] text-muted">You're all caught up.</div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.read && markOne.mutate(n.id)}
                  className={`flex w-full gap-2.5 border-b border-rule px-4 py-3 text-left transition last:border-0 hover:bg-wash ${n.read ? '' : 'bg-brand/5'}`}
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-brand'}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-bold text-ink">{n.title}</span>
                    <span className="mt-0.5 block text-[12.5px] leading-snug text-body">{n.body}</span>
                    <span className="mt-1 block text-[11px] text-muted">{timeAgo(n.created_at)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9.5a6 6 0 0 1 12 0c0 3.2.7 5 1.5 6.1.4.6 0 1.4-.7 1.4H5.2c-.7 0-1.1-.8-.7-1.4C5.3 14.5 6 12.7 6 9.5Z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}
