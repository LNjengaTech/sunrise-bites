'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePWA } from './PWAContext';
import {
  LayoutDashboard,
  Store,
  ChefHat,
  Sprout,
  BookOpen,
  Receipt,
  BarChart3,
  ShoppingCart,
  Download,
  CheckCircle2,
  WifiOff,
} from 'lucide-react';

const LINKS = [
  { href: '/',            label: 'Dashboard',   Icon: LayoutDashboard },
  { href: '/counter',     label: 'Counter',      Icon: Store           },
  { href: '/batches',     label: 'Production',   Icon: ChefHat         },
  { href: '/ingredients', label: 'Ingredients',  Icon: Sprout          },
  { href: '/recipes',     label: 'Dishes',       Icon: BookOpen        },
  { href: '/sales',       label: 'Sales',        Icon: ShoppingCart    },
  { href: '/expenses',    label: 'Expenses',     Icon: Receipt         },
  { href: '/reports',     label: 'Reports',      Icon: BarChart3       },
];

function isActive(pathname, href) {
  if (href === '/') return pathname === '/';
  return pathname.startsWith(href);
}

export default function NavBar() {
  const pathname = usePathname();
  const { isInstallable, isInstalled, promptInstall, isOnline } = usePWA();

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <nav className="hidden md:flex md:flex-col w-64 shrink-0 bg-white border-r border-stone-200/80 p-4 min-h-screen sticky top-0 h-screen overflow-y-auto justify-between">
        <div className="space-y-6">
          {/* Brand header with Logo */}
          <Link href="/" className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-stone-50 transition group">
            <img
              src="/icons/icon-192x192.png"
              alt="Sunrise Bites Logo"
              className="w-11 h-11 rounded-2xl shadow-md border border-stone-100 object-cover group-hover:scale-105 transition-transform"
            />
            <div>
              <h1 className="font-black text-xl text-stone-900 tracking-tight leading-tight">
                Sunrise Bites
              </h1>
              <p className="text-[11px] font-medium text-stone-400 mt-0.5">
                Costing & Cashflow App
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="space-y-1">
            {LINKS.map(({ href, label, Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                    active
                      ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/25 translate-x-1'
                      : 'text-stone-600 hover:bg-stone-100/80 hover:text-stone-900'
                  }`}
                >
                  <Icon size={18} strokeWidth={active ? 2.5 : 2} className={active ? 'text-white' : 'text-stone-400'} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Sidebar Footer: Install button & PWA/network status */}
        <div className="pt-4 border-t border-stone-100 space-y-3">
          {isInstallable && !isInstalled && (
            <div className="rounded-2xl bg-gradient-to-br from-brand-50 to-orange-50 border border-brand-100 p-3.5">
              <div className="flex items-center gap-2.5 mb-1.5">
                <img
                  src="/icons/icon-192x192.png"
                  alt="Sunrise Bites"
                  className="w-8 h-8 rounded-xl shadow-xs object-cover"
                />
                <div>
                  <p className="text-xs font-bold text-stone-900">Install Sunrise Bites</p>
                  <p className="text-[10px] text-stone-500">Standalone home / desktop app</p>
                </div>
              </div>
              <button
                onClick={promptInstall}
                className="w-full mt-2 py-2 px-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Download size={13} /> Install Now
              </button>
            </div>
          )}

          <div className="flex items-center justify-between px-2 text-[11px] text-stone-400">
            <div className="flex items-center gap-1.5">
              {isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-stone-500 font-medium">Online</span>
                </>
              ) : (
                <>
                  <WifiOff size={12} className="text-amber-500" />
                  <span className="text-amber-600 font-semibold">Offline mode</span>
                </>
              )}
            </div>

            {isInstalled ? (
              <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                <CheckCircle2 size={12} /> Installed
              </span>
            ) : (
              <span className="text-stone-400">Standalone PWA</span>
            )}
          </div>
        </div>
      </nav>

      {/* ── Mobile bottom navigation bar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-stone-200/80 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 px-1.5">
        <div className="flex items-center overflow-x-auto scrollbar-none gap-1 py-0.5 px-1">
          {LINKS.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center gap-1 py-1.5 px-3 rounded-2xl min-w-[62px] shrink-0 transition-all ${
                  active
                    ? 'bg-brand-600 text-white shadow-sm font-bold scale-[1.03]'
                    : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100/60 font-medium'
                }`}
              >
                <Icon size={19} strokeWidth={active ? 2.5 : 1.9} />
                <span className="text-[10px] leading-tight tracking-tight whitespace-nowrap">
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
