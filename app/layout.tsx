import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ResultProof | Academic Verification Registry',
  description: 'Independent verification platform for university exam results and tuition fee audits.',
  keywords: ['ResultProof', 'academic verification', 'university audits', 'education registry'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-slate-50 text-slate-900 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
