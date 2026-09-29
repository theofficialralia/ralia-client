'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LogoMark } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { api, ApiError } from '@/lib/api';

const schema = z.object({
  // Collected for parity with the design, but NOT sent: the API's client model
  // is an organisation and has no personal full-name field.
  full_name: z.string().min(2, 'Enter your full name'),
  org_name: z.string().min(2, 'Enter your business name'),
  email: z.string().email('Enter a valid email'),
  // E.164. The design labels this "WhatsApp" - the API sends the OTP here.
  phone_e164: z.string().regex(/^\+[1-9]\d{7,14}$/, 'Use international format, e.g. +2348012345678'),
  // The API minimum is 10 (the mockup's "8" is stale - see the client README).
  password: z.string().min(10, 'At least 10 characters'),
  accept: z.literal(true, { errorMap: () => ({ message: 'Accept the terms to continue' }) }),
});

type Form = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Form) {
    setServerError(null);
    try {
      await api.post(
        '/v1/auth/register',
        {
          email: values.email,
          phone_e164: values.phone_e164,
          password: values.password,
          role: 'CLIENT',
          org_name: values.org_name,
          accepted_terms: true,
          accepted_privacy: true,
        },
        { auth: false },
      );
      router.push(`/verify?phone=${encodeURIComponent(values.phone_e164)}&email=${encodeURIComponent(values.email)}`);
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
    }
  }

  return (
    <div>
      <div className="mb-7">
        <LogoMark className="mb-4 h-9 w-9" />
        <p className="text-[13px] font-semibold text-brand-700">Register as a business</p>
        <h1 className="mt-1 text-[26px] font-extrabold leading-tight tracking-tight text-ink">
          Create your campaign owner account.
        </h1>
        <p className="mt-1.5 text-[14px] text-muted">Two minutes. No card required to start.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" error={errors.full_name?.message}>
            <Input placeholder="Chidera Okoye" {...register('full_name')} />
          </Field>
          <Field label="Business name" error={errors.org_name?.message}>
            <Input placeholder="Skinsmith Ltd" {...register('org_name')} />
          </Field>
          <Field label="Business email" error={errors.email?.message}>
            <Input type="email" placeholder="you@business.ng" {...register('email')} />
          </Field>
          <Field label="WhatsApp" error={errors.phone_e164?.message}>
            <Input placeholder="+234 801 234 5678" {...register('phone_e164')} />
          </Field>
        </div>

        <Field label="Password" error={errors.password?.message} hint="At least 10 characters">
          <PasswordInput placeholder="At least 10 characters" {...register('password')} />
        </Field>

        <label className="flex items-start gap-3 text-[13.5px] text-body">
          <input type="checkbox" className="mt-0.5 h-5 w-5 rounded accent-brand" {...register('accept')} />
          <span>
            I agree to Ralia&apos;s <span className="font-semibold text-ink">terms of service</span> and{' '}
            <span className="font-semibold text-ink">privacy notice</span>.
          </span>
        </label>
        {errors.accept && <p className="text-[12.5px] text-brand-700">{errors.accept.message}</p>}

        {serverError && (
          <div className="rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-[13px] text-brand-700">
            {serverError}
          </div>
        )}

        <Button type="submit" size="lg" block loading={isSubmitting}>
          Create account &amp; verify
        </Button>
      </form>

      <p className="mt-6 text-center text-[13.5px] text-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-brand-700">
          Log in
        </Link>
      </p>
    </div>
  );
}
