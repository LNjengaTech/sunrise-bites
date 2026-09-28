import './globals.css';
import NavBar from '@/components/NavBar';
import MobileTopBar from '@/components/MobileTopBar';
import SWRegister from '@/components/SWRegister';
import { PWAProvider } from '@/components/PWAContext';
import OfflineBanner from '@/components/OfflineBanner';
import IOSInstallModal from '@/components/IOSInstallModal';

export const metadata = {
  title: 'Sunrise Bites — Restaurant Costing & Cashflow',
  description: 'Ingredient costing, recipes, sales, production batches, and cashflow tracking for Sunrise Bites',
  manifest: '/manifest.json',
  applicationName: 'Sunrise Bites',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Sunrise Bites',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      { url: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icons/icon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/icons/icon-192x192.png',
  },
};

export const viewport = {
  themeColor: '#ea580c',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-touch-fullscreen" content="yes" />
      </head>
      <body className="antialiased min-h-screen selection:bg-brand-500/20 selection:text-brand-900">
        <PWAProvider>
          <SWRegister />
          <OfflineBanner />
          <IOSInstallModal />
          <div className="min-h-screen flex flex-col md:flex-row bg-[#f5f0eb]">
            <NavBar />
            <div className="flex-1 flex flex-col min-w-0">
              <MobileTopBar />
              {/* extra bottom padding on mobile for the fixed nav bar and floating checkout bars */}
              <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-5xl mx-auto w-full pb-32 md:pb-12 min-w-0">
                {children}
              </main>
            </div>
          </div>
        </PWAProvider>
      </body>
    </html>
  );
}
