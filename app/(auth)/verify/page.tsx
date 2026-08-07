'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogoMark } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { OtpInput } from '@/components/ui/OtpInput';
import { Spinner } from '@/components/ui/Spinner';
import { api, ApiError, type Tokens } from '@/lib/api';
import { useAuth } from '@/lib/auth';

function VerifyInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { setTokens } = useAuth();
  const phone = params.get('phone') ?? '';

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [seconds, setSeconds] = useState(50);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  async function submit() {
    if (code.length !== 6) return;
    setSubmitting(true);
    setError(null);
    try {
      const tokens = await api.post<Tokens>('/v1/auth/otp/verify', { phone_e164: phone, code }, { auth: false });
      await setTokens(tokens);
      // New business owners land on the optional "Set up your organisation" step;
      // it is skippable straight through to the dashboard.
      router.replace('/setup');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'That code is not valid.');
      setSubmitting(false);
    }
  }

  async function resend() {
    setError(null);
    await api.post('/v1/auth/otp/request', { phone_e164: phone }, { auth: false }).catch(() => {});
    setSeconds(50);
  }

  return (
    <div>
      <button onClick={() => router.back()} className="mb-6 text-muted hover:text-ink" aria-label="Back">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <div className="flex flex-col items-center text-center">
        <LogoMark className="mb-5 h-10 w-10" />
        <h1 className="text-[26px] font-extrabold tracking-tight text-ink">Verify your number</h1>
        {/* The design says "email"; the API sends the code to the WhatsApp/phone
            number from registration. Copy reflects what actually happens. */}
        <p className="mt-2 text-[14px] text-muted">
          We&apos;ve sent a 6-digit code to{' '}
          <span className="font-semibold text-ink">{phone || 'your WhatsApp number'}</span>
        </p>
      </div>

      <div className="mt-8 flex justify-center">
        <OtpInput value={code} onChange={setCode} />
      </div>

      <div className="mt-4 flex items-center justify-between text-[13px]">
        <span className="tabular-nums text-muted">
          {seconds > 0 ? `00:${String(seconds).padStart(2, '0')}` : 'Ready'}
        </span>
        <button
          onClick={resend}
          disabled={seconds > 0}
          className="font-semibold text-brand-700 disabled:text-muted"
        >
          Didn&apos;t receive the code? Resend
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-center text-[13px] text-brand-700">
          {error}
        </div>
      )}

      <Button onClick={submit} size="lg" block loading={submitting} disabled={code.length !== 6} className="mt-6">
        Verify &amp; continue
      </Button>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-10"><Spinner className="h-8 w-8 text-brand" /></div>}>
      <VerifyInner />
    </Suspense>
  );
}
