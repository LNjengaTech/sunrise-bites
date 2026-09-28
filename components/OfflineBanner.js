'use client';
import { useEffect, useState } from 'react';
import { usePWA } from './PWAContext';
import { WifiOff, CheckCircle2 } from 'lucide-react';

export default function OfflineBanner() {
  const { isOnline } = usePWA();
  const [showRestored, setShowRestored] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowRestored(false);
    } else if (wasOffline) {
      setShowRestored(true);
      const timer = setTimeout(() => {
        setShowRestored(false);
        setWasOffline(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (!isOnline) {
    return (
      <div className="bg-amber-600 text-white text-xs font-medium py-2 px-4 text-center flex items-center justify-center gap-2 shadow-sm z-50 animate-in slide-in-from-top duration-200">
        <WifiOff size={14} className="shrink-0" />
        <span>You are currently offline. Viewing cached data — reconnect to sync changes.</span>
      </div>
    );
  }

  if (showRestored) {
    return (
      <div className="bg-green-600 text-white text-xs font-medium py-2 px-4 text-center flex items-center justify-center gap-2 shadow-sm z-50 animate-in slide-in-from-top duration-200">
        <CheckCircle2 size={14} className="shrink-0" />
        <span>Connection restored! You are back online.</span>
      </div>
    );
  }

  return null;
}
