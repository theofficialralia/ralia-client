import { forwardRef } from 'react';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'dark';

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition ' +
  'disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4';

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-600 focus-visible:ring-brand/25 shadow-[0_8px_20px_rgba(247,9,9,0.25)]',
  secondary: 'bg-paper text-ink border border-rule hover:bg-wash focus-visible:ring-brand/15',
  ghost: 'text-brand-700 hover:bg-brand/5 focus-visible:ring-brand/15',
  dark: 'bg-ink text-white hover:bg-ink/90 focus-visible:ring-ink/20',
};

const sizes = {
  md: 'h-11 px-5 text-[14px]',
  lg: 'h-[52px] px-6 text-[15px]',
  sm: 'h-9 px-4 text-[13px]',
};

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: keyof typeof sizes;
  loading?: boolean;
  block?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', loading, block, className = '', children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
});
