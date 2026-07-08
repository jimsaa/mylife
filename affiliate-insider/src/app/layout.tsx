import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Affiliate Insider — Build Digital Income Projects With AI',
  description:
    'Builder Pass: qualify buyers and teach the AI Build Method. Monthly Build Pro ($29/mo) for ongoing monthly projects.',
  metadataBase: new URL('https://affiliateinsider.jimsaari.se'),
  openGraph: {
    title: 'Learn How To Build Digital Income Projects With AI',
    description:
      'The AI-Powered Resource Hub for Affiliate Marketers. Practical workflow — not theory.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full font-sans antialiased">{children}</body>
    </html>
  );
}
