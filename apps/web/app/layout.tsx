import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'BookChat - Social Hardcover Collaborative Reader',
  description: 'A premium digital hardcover book where readers communicate naturally inside beautiful pages. Join live discussion threads and annotate directly inside book margins.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    title: 'BookChat - Social Hardcover Collaborative Reader',
    description: 'A premium digital hardcover book where readers communicate naturally inside beautiful pages. Join live discussion threads and annotate directly inside book margins.',
    siteName: 'BookChat',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=1200&h=630&fit=crop',
        width: 1200,
        height: 630,
        alt: 'BookChat - Ornate gold-embossed hardcover leather book on a library desk',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BookChat - Social Hardcover Collaborative Reader',
    description: 'A premium digital hardcover book where readers communicate naturally inside beautiful pages. Join live discussion threads and annotate directly inside book margins.',
    images: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=1200&h=630&fit=crop'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
