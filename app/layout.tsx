import './tailwind-v4.css';
import './globals.css';
import './workflow-theme.css';
import './admin-visual-system.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import PwaInstaller from '@/components/PwaInstaller';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-workflow',
});

export const metadata: Metadata = {
  title: { default: 'WorkflowOS', template: '%s · WorkflowOS' },
  description: 'Business execution, growth, marketplace and integration operating system.',
  applicationName: 'WorkflowOS',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'WorkflowOS', statusBarStyle: 'black-translucent' },
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  formatDetection: { telephone: false }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#08111f'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.variable}>{children}<PwaInstaller /></body>
    </html>
  );
}
