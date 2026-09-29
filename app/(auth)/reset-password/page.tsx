'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogoMark } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { api, ApiError } from '@/lib/api';

// Password reset over the existing OTP: request a code to the account email, then
// set a new password with it. No new backend beyond /auth/password/{forgot,reset}.
export default function ResetPasswordPage() {
  const router = useRouter();
  const [stage, setStage] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email.');
    setError(null); setBusy(true);
    try {
      await api.post('/v1/auth/password/forgot', { email }, { auth: false });
      setStage('code'); // always advances - the API never reveals whether the email exists
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send a reset code.');
    } finally {
      setBusy(false);
    }
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim().length !== 6) return setError('Enter the 6-digit code from your email.');
    if (password.length < 10) return setError('Use a password of at least 10 characters.');
    setError(null); setBusy(true);
    try {
      await api.post('/v1/auth/password/reset', { email, code: code.trim(), new_password: password }, { auth: false });
      router.replace('/login?reason=reset');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reset your password.');
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-7">
        <LogoMark className="mb-4 h-9 w-9" />
        <h1 className="text-[26px] font-extrabold tracking-tight text-ink">Reset your password.</h1>
        <p className="mt-1.5 text-[14px] text-muted">
          {stage === 'email'
            ? 'Enter your business email and we’ll send you a code.'
            : `Enter the code we sent to ${email} and choose a new password.`}
        </p>
      </div>

      {stage === 'email' ? (
        <form onSubmit={requestCode} className="space-y-4" noValidate>
          <Field label="Business email">
            <Input type="email" placeholder="you@business.ng" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          {error && <div className="rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-[13px] text-brand-700">{error}</div>}
          <Button type="submit" size="lg" block loading={busy}>Send reset code</Button>
        </form>
      ) : (
        <form onSubmit={submitReset} className="space-y-4" noValidate>
          <Field label="6-digit code">
            <Input inputMode="numeric" maxLength={6} placeholder="123456" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          </Field>
          <Field label="New password">
            <PasswordInput placeholder="At least 10 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {error && <div className="rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-[13px] text-brand-700">{error}</div>}
          <Button type="submit" size="lg" block loading={busy}>Set new password</Button>
          <button type="button" onClick={() => { setStage('email'); setError(null); }} className="w-full text-center text-[13px] text-muted hover:text-ink">
            Use a different email
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-[13.5px] text-muted">
        Remembered it?{' '}
        <Link href="/login" className="font-semibold text-brand-700">Back to sign in</Link>
      </p>
    </div>
  );
}
