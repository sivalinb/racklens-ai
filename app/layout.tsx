import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://racklens-ai.siva-babu.chatgpt.site'),
  title: 'RackLens AI — Reliability Studio',
  description: 'Evidence-first Redfish, GPU and workload observability for AI infrastructure.',
  openGraph: {
    title: 'RackLens AI — See the rack. Follow the evidence.',
    description: 'Evidence-first Redfish, GPU and workload observability for AI infrastructure.',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RackLens AI — See the rack. Follow the evidence.',
    description: 'Evidence-first Redfish, GPU and workload observability for AI infrastructure.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
