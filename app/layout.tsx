import './tailwind-v4.css';
import './globals.css';
import './workflow-theme.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: { default: 'WorkflowOS', template: '%s · WorkflowOS' },
  description: 'Business execution, growth, marketplace and integration operating system.',
  applicationName: 'WorkflowOS',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'WorkflowOS', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#111827'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
