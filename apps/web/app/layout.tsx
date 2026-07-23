import type { Metadata } from 'next';
import { Cairo, DM_Sans, Instrument_Serif } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display',
});

const cairo = Cairo({
  subsets: ['arabic'],
  variable: '--font-arabic',
});

export const metadata: Metadata = {
  title: 'Eng-NJD Engineering Dashboard',
  description: 'Real Estate Engineering ERP — Egypt',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${instrumentSerif.variable} ${cairo.variable} antialiased bg-[var(--bg)] text-[var(--text)]`}
      >
        {children}
      </body>
    </html>
  );
}
