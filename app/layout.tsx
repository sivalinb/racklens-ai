import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://racklens-ai.siva-babu.chatgpt.site'),
  title: 'RackLens AI — Evidence-first AI infrastructure reliability',
  description:
    'Understand rack, GPU, network, power and thermal behavior through one evidence-backed reliability investigation.',
  openGraph: {
    title: 'RackLens AI — See the rack. Follow the evidence.',
    description:
      'Understand rack, GPU, network, power and thermal behavior through one evidence-backed reliability investigation.',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RackLens AI — See the rack. Follow the evidence.',
    description:
      'Understand rack, GPU, network, power and thermal behavior through one evidence-backed reliability investigation.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
