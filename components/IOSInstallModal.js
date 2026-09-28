'use client';
import { usePWA } from './PWAContext';
import { X, Share, PlusSquare } from 'lucide-react';

export default function IOSInstallModal() {
  const { showIOSGuide, setShowIOSGuide, isIOS } = usePWA();

  if (!showIOSGuide) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          onClick={() => setShowIOSGuide(false)}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-100 transition"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3.5 mb-5">
          <img
            src="/icons/icon-192x192.png"
            alt="Sunrise Bites"
            className="w-14 h-14 rounded-2xl shadow-md border border-stone-100 object-cover"
          />
          <div>
            <h2 className="font-extrabold text-lg text-stone-900 flex items-center gap-1.5">
              Install Sunrise Bites 
            </h2>
            <p className="text-xs text-stone-400">
              {isIOS ? 'Install to your iPhone / iPad home screen' : 'Add to home screen or desktop'}
            </p>
          </div>
        </div>

        <p className="text-sm text-stone-600 mb-5 leading-relaxed">
          Install Sunrise Bites for a full-screen standalone experience, instant offline access, and fast order entry during busy hours.
        </p>

        <div className="space-y-3.5 bg-stone-50 rounded-2xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 font-bold flex items-center justify-center shrink-0 text-sm">
              1
            </div>
            <div className="text-xs text-stone-700 leading-normal pt-1.5">
              Tap the <strong className="font-semibold text-stone-900 inline-flex items-center gap-1">Share <Share size={12} className="inline text-blue-500" /></strong> button in your browser toolbar.
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 font-bold flex items-center justify-center shrink-0 text-sm">
              2
            </div>
            <div className="text-xs text-stone-700 leading-normal pt-1.5">
              Scroll down and tap <strong className="font-semibold text-stone-900 inline-flex items-center gap-1">Add to Home Screen <PlusSquare size={12} className="inline text-stone-700" /></strong>.
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 font-bold flex items-center justify-center shrink-0 text-sm">
              3
            </div>
            <div className="text-xs text-stone-700 leading-normal pt-1.5">
              Tap <strong className="font-semibold text-stone-900">Add</strong> in the top-right corner to finish.
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowIOSGuide(false)}
          className="btn-primary w-full py-3 text-sm justify-center shadow-md shadow-brand-200 font-bold"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
