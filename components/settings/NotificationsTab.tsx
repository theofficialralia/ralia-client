'use client';

import { useState } from 'react';
import { Toggle } from '@/components/ui/Toggle';

const ROWS = [
  { key: 'campaign', title: 'Campaign approved / rejected', desc: 'When admin reviews your campaign content' },
  { key: 'funding', title: 'Funding & payment confirmed', desc: 'When your payment clears and a campaign goes live' },
  { key: 'proof', title: 'New proof submitted', desc: 'When a promoter posts and submits a screenshot' },
  { key: 'wallet', title: 'Wallet & withdrawal activity', desc: 'Refunds and balance changes' },
  { key: 'product', title: 'Product updates', desc: 'New features and changes to Ralia' },
];

export function NotificationsTab() {
  // Local only for now — there is no notification-preferences endpoint yet
  // (the notifications module is a deferred slice). Wiring is an integration step.
  //
  // Opt-in by default (NDPA): money/operational updates start on, but marketing
  // (Product updates) starts off — the user turns it on deliberately.
  const [prefs, setPrefs] = useState<Record<string, { email: boolean; push: boolean }>>(
    Object.fromEntries(ROWS.map((r) => [r.key, r.key === 'product' ? { email: false, push: false } : { email: true, push: true }])),
  );

  return (
    <section className="card p-6 sm:p-8">
      <h2 className="text-[19px] font-extrabold tracking-tight text-ink">Notification preferences</h2>
      <p className="mt-1 text-[13.5px] text-muted">
        Choose how you hear about each kind of update. Keep email and push on for anything money-related.
      </p>
      <p className="mt-3 inline-block rounded-full bg-warn-wash px-3 py-1 text-[12px] font-semibold text-warn">
        Preview — saving preferences arrives with notifications
      </p>

      <div className="mt-6">
        <div className="flex items-center border-b border-rule pb-3 text-[12px] font-semibold uppercase tracking-wide text-muted">
          <span className="flex-1">Update</span>
          <span className="w-20 text-center">Email</span>
          <span className="w-20 text-center">Push</span>
        </div>
        {ROWS.map((r) => (
          <div key={r.key} className="flex items-center border-b border-rule/70 py-4 last:border-0">
            <div className="flex-1 pr-4">
              <div className="text-[15px] font-bold text-ink">{r.title}</div>
              <div className="text-[13px] text-muted">{r.desc}</div>
            </div>
            <div className="flex w-20 justify-center">
              <Toggle
                checked={prefs[r.key].email}
                onChange={(v) => setPrefs((p) => ({ ...p, [r.key]: { ...p[r.key], email: v } }))}
                label={`${r.title} email`}
              />
            </div>
            <div className="flex w-20 justify-center">
              <Toggle
                checked={prefs[r.key].push}
                onChange={(v) => setPrefs((p) => ({ ...p, [r.key]: { ...p[r.key], push: v } }))}
                label={`${r.title} push`}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
