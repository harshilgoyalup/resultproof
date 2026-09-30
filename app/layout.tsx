import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ResultProof | Zero-Bias Academic Verification Protocol',
  description: 'Replacing coaching institute marketing hype with zero-trust cryptographic verification. Real fee receipts matched to official board scorecards.',
  keywords: ['ResultProof', 'JEE', 'NEET', 'UPSC', 'academic verification', 'topper truth', 'education transparency'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-[#030712] text-slate-100 min-h-screen antialiased selection:bg-sky-500/30 selection:text-sky-200">
        {children}
      </body>
    </html>
  );
}
