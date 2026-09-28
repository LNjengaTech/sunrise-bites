'use client';
import Link from 'next/link';
import { WifiOff, RotateCcw, LayoutDashboard, Store, BookOpen, Sprout } from 'lucide-react';

export default function OfflinePage() {
  function handleRetry() {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-12">
      <div className="w-20 h-20 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-6 shadow-sm ring-8 ring-amber-50/50">
        <WifiOff size={38} strokeWidth={2.2} />
      </div>

      <h1 className="text-2xl md:text-3xl font-black text-stone-900 mb-2">
        You're Currently Offline
      </h1>
      
      <p className="text-stone-500 max-w-md text-sm md:text-base mb-8 leading-relaxed">
        Sunrise Bites works as an installable app, but the page you requested isn&apos;t available offline yet. Check your connection or explore cached sections below.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs mb-8">
        <button
          onClick={handleRetry}
          className="btn-primary w-full justify-center shadow-lg shadow-brand-500/20"
        >
          <RotateCcw size={16} />
          <span>Try Reconnecting</span>
        </button>
        <Link
          href="/"
          className="btn-secondary w-full justify-center"
        >
          <LayoutDashboard size={16} />
          <span>Go to Dashboard</span>
        </Link>
      </div>

      <div className="w-full max-w-md card bg-white/70 backdrop-blur-sm p-4 text-left border border-stone-200/50">
        <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">
          Quick Access (Offline Safe)
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/counter"
            className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-stone-100 text-stone-700 text-xs font-semibold transition"
          >
            <Store size={15} className="text-brand-600" />
            <span>Counter</span>
          </Link>
          <Link
            href="/recipes"
            className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-stone-100 text-stone-700 text-xs font-semibold transition"
          >
            <BookOpen size={15} className="text-brand-600" />
            <span>Dishes</span>
          </Link>
          <Link
            href="/ingredients"
            className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-stone-100 text-stone-700 text-xs font-semibold transition"
          >
            <Sprout size={15} className="text-brand-600" />
            <span>Ingredients</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-stone-100 text-stone-700 text-xs font-semibold transition"
          >
            <LayoutDashboard size={15} className="text-brand-600" />
            <span>Overview</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
