import { AuthShowcase } from '@/components/auth/AuthShowcase';
import { SUPPORT } from '@/lib/support';

/**
 * Split-screen onboarding: an auto-advancing brand carousel on the left, the
 * current step's form on the right. Matches the designer's onboarding frames.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand / testimonial carousel */}
      <AuthShowcase />

      {/* Form panel */}
      <main className="flex flex-col items-center justify-center gap-8 bg-paper px-6 py-10 sm:px-12">
        <div className="w-full max-w-md animate-fade-in">{children}</div>
        <p className="max-w-md text-center text-[12px] leading-relaxed text-muted">
          By continuing you agree to our{' '}
          <a href={SUPPORT.termsUrl} target="_blank" rel="noreferrer" className="font-semibold text-brand-700">Terms of Service</a>{' '}and{' '}
          <a href={SUPPORT.privacyUrl} target="_blank" rel="noreferrer" className="font-semibold text-brand-700">Privacy Notice</a>.
          {' '}Need help?{' '}
          <a href={SUPPORT.whatsappUrl} target="_blank" rel="noreferrer" className="font-semibold text-brand-700">Chat on WhatsApp</a>.
        </p>
      </main>
    </div>
  );
}
