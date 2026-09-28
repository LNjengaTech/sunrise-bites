'use client';

/**
 * Reusable loading spinner — used across all pages.
 * Usage: <Spinner /> or <Spinner size="lg" /> or <Spinner label="Saving..." />
 */
export default function Spinner({ size = 'md', label = 'Loading…', className = '' }) {
  const dims = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-10 h-10' : 'w-6 h-6';
  const border = size === 'sm' ? 'border-2' : 'border-[3px]';

  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-10 ${className}`}>
      <div
        className={`${dims} ${border} border-stone-200 border-t-brand-600 rounded-full animate-spin`}
        role="status"
        aria-label={label}
      />
      {label && <p className="text-sm text-stone-400">{label}</p>}
    </div>
  );
}

/**
 * Full-page spinner overlay for route-level loading.
 */
export function PageSpinner({ label = 'Loading…' }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Spinner size="lg" label={label} />
    </div>
  );
}

/**
 * Inline spinner — for buttons / small areas.
 */
export function InlineSpinner() {
  return (
    <span
      className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"
      aria-hidden="true"
    />
  );
}
