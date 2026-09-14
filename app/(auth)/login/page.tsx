'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LogoMark } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { api, ApiError, type Tokens } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});
type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { setTokens } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Read from the URL directly (no useSearchParams) to avoid a Suspense boundary.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('reason') === 'idle') {
      setNotice('You were signed out after 10 minutes of inactivity. Any work in progress was saved.');
    }
  }, []);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Form) {
    setServerError(null);
    try {
      const tokens = await api.post<Tokens>('/v1/auth/login', values, { auth: false });
      await setTokens(tokens);
      router.replace('/dashboard');
    } catch (e) {
      if (e instanceof ApiError && e.code === 'PHONE_NOT_VERIFIED') {
        setServerError('Verify your email to continue.');
      } else {
        setServerError(e instanceof ApiError ? e.message : 'Could not sign you in.');
      }
    }
  }

  return (
    <div>
      <div className="mb-7">
        <LogoMark className="mb-4 h-9 w-9" />
        <h1 className="text-[26px] font-extrabold tracking-tight text-ink">Welcome back.</h1>
        <p className="mt-1.5 text-[14px] text-muted">Sign in to your business account.</p>
      </div>

      {notice && (
        <div className="mb-4 rounded-xl border border-ok/25 bg-ok/5 px-4 py-3 text-[13px] text-ink">
          {notice}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label="Business email" error={errors.email?.message}>
          <Input type="email" placeholder="you@business.ng" {...register('email')} />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <PasswordInput placeholder="Your password" {...register('password')} />
        </Field>

        {serverError && (
          <div className="rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-[13px] text-brand-700">
            {serverError}
          </div>
        )}

        <Button type="submit" size="lg" block loading={isSubmitting}>
          Log in
        </Button>
      </form>

      <p className="mt-6 text-center text-[13.5px] text-muted">
        New to Ralia?{' '}
        <Link href="/choose" className="font-semibold text-brand-700">
          Create an account
        </Link>
      </p>
    </div>
  );
}
