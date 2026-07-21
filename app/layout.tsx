import type { Metadata } from 'next';
import { Urbanist } from 'next/font/google';
import './globals.css';
import { Providers } from '@/lib/providers';

const urbanist = Urbanist({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-urbanist',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Ralia — Businesses',
  description: 'Fund campaigns, reach real audiences through everyday promoters, and see proof of every post.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={urbanist.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
