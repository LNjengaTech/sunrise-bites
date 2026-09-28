'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePWA } from './PWAContext';
import { Download, WifiOff } from 'lucide-react';

const ROUTE_NAMES = {
  '/': 'Snapshot',
  '/counter': 'Counter',
  '/batches': 'Production',
  '/ingredients': 'Ingredients',
  '/recipes': 'Dishes',
  '/recipes/new': 'New Dish',
  '/sales': 'Sales',
  '/expenses': 'Expenses',
  '/reports': 'Reports',
  '/offline': 'Offline',
};

export default function MobileTopBar() {
  const pathname = usePathname();
  const { isInstallable, isInstalled, promptInstall, isOnline } = usePWA();

  const currentTitle = ROUTE_NAMES[pathname] || (pathname.startsWith('/recipes/') ? 'Dish Details' : 'Sunrise Bites');

  return (
    <header className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/70 pt-[max(0.6rem,env(safe-area-inset-top))] pb-2.5 px-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2.5">
          <img
            src="/icons/icon-192x192.png"
            alt="Sunrise Bites Logo"
            className="w-8 h-8 rounded-xl shadow-sm object-cover"
          />
          <div>
            <span className="font-extrabold text-base tracking-tight text-stone-900 block leading-tight">
              Sunrise Bites
            </span>
            <span className="text-[10px] font-medium text-stone-400 block leading-tight">
              {currentTitle}
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {!isOnline && (
            <span className="badge bg-amber-100 text-amber-800 text-[10px] py-1 px-2 gap-1 flex items-center">
              <WifiOff size={11} /> Offline
            </span>
          )}

          {isInstallable && !isInstalled && (
            <button
              onClick={promptInstall}
              className="inline-flex items-center gap-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200/80 px-2.5 py-1 rounded-full text-xs font-bold transition active:scale-95 shadow-sm"
              title="Install Sunrise Bites to your home screen"
            >
              <Download size={13} className="text-brand-600" />
              <span>Install</span>
            </button>
          )}

          {isInstalled && (
            <span className="badge bg-stone-100 text-stone-600 text-[10px] py-1 px-2.5 flex items-center gap-1">
             App
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
