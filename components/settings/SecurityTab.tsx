'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { PasswordInput } from '@/components/ui/PasswordInput';

export function SecurityTab() {
  const router = useRouter();
  const { logout } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function changePassword() {
    setError(null); setDone(false);
    if (next.length < 10) return setError('New password must be at least 10 characters.');
    if (next !== confirm) return setError('New password and confirmation do not match.');
    setBusy(true);
    try {
      await api.post('/v1/auth/change-password', { current_password: current, new_password: next });
      setDone(true);
      setCurrent(''); setNext(''); setConfirm('');
      // Other sessions were revoked server-side; this session's tokens still work
      // until they expire, so send the user to log in again cleanly.
      setTimeout(async () => {
        await logout();
        router.replace('/login');
      }, 1200);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not change your password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="card p-6 sm:p-8">
        <h2 className="text-[19px] font-extrabold tracking-tight text-ink">Password</h2>
        <p className="mt-1 text-[13.5px] text-muted">Use at least 10 characters. You&apos;ll need your current password to change it.</p>

        <div className="mt-6 space-y-5">
          <Field label="Current password">
            <PasswordInput value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Your current password" />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="New password">
              <PasswordInput value={next} onChange={(e) => setNext(e.target.value)} placeholder="At least 10 characters" />
            </Field>
            <Field label="Confirm password">
              <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat new password" />
            </Field>
          </div>
        </div>

        {error && <p className="mt-4 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-[13px] text-brand-700">{error}</p>}
        {done && <p className="mt-4 rounded-xl border border-ok/30 bg-ok-wash px-4 py-3 text-[13px] text-ok">Password changed. Signing you out…</p>}

        <div className="mt-6">
          <Button onClick={changePassword} size="lg" loading={busy} disabled={!current || !next || !confirm}>
            Update password
          </Button>
        </div>
      </section>

      {/* Delete account — rendered per design, but gated: account deletion cascades
          into live campaigns and wallet balances and needs a dedicated backend
          path. Left non-destructive until that exists. */}
      <section className="card p-6 sm:p-8">
        <h2 className="text-[19px] font-extrabold tracking-tight text-ink">Delete account</h2>
        <p className="mt-1 text-[13.5px] text-muted">This permanently removes your Ralia account. Before you continue, understand that:</p>
        <ul className="mt-3 space-y-1.5 text-[13.5px] text-body">
          <li>• All campaigns — live, paused or ended — will stop and cannot be recovered.</li>
          <li>• Your evidence gallery and submission history will be deleted.</li>
          <li>• Any balance must be withdrawn first — it is not automatically refunded.</li>
          <li>• Promoters with active offers on your campaigns will be notified.</li>
        </ul>
        <div className="mt-6">
          <Button variant="secondary" size="lg" disabled title="Account deletion is a fast-follow" className="border-brand/30 text-brand-700">
            Delete my account
          </Button>
        </div>
      </section>
    </div>
  );
}
