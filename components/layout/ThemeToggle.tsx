'use client';

import { useTheme } from '@/lib/theme';
import { IconMoon, IconSun } from '@/components/brand/icons';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-rule bg-paper text-body hover:bg-wash"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
    >
      {theme === 'dark' ? <IconSun className="h-[17px] w-[17px]" /> : <IconMoon className="h-[17px] w-[17px]" />}
    </button>
  );
}
