'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Minus,
  ShoppingCart,
  RotateCcw,
  CheckCircle2,
  Search,
  BookOpen,
  Receipt,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PageSpinner, InlineSpinner } from '@/components/Spinner';
import { fetchArray, getCached, hasCached, invalidateCache } from '@/lib/fetchHelpers';

function fmtKES(n) {
  return 'KSh ' + (Number(n) || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const QUICK = [1, 5, 10, 20];

export default function CounterPage() {
  const [recipes, setRecipes]       = useState(() => getCached('/api/recipes') || []);
  const [loading, setLoading]       = useState(() => !hasCached('/api/recipes'));
  const [tally, setTally]           = useState(() => {
    const init = {};
    (getCached('/api/recipes') || []).forEach((r) => { init[r.id] = 0; });
    return init;
  });
  const [saleDate, setSaleDate]     = useState(new Date().toISOString().slice(0, 10));
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCat] = useState('All');
  const [showSummaryDetails, setShowDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [lastOrder, setLastOrder]   = useState(null);
  const [error, setError]           = useState('');

  useEffect(() => {
    fetchArray('/api/recipes').then((data) => {
      setRecipes(data);
      setTally((prev) => {
        const next = { ...prev };
        data.forEach((r) => { if (next[r.id] === undefined) next[r.id] = 0; });
        return next;
      });
      setLoading(false);
    });
  }, []);

  function add(id, n) {
    setTally((p) => ({ ...p, [id]: Math.max(0, (p[id] || 0) + n) }));
  }

  function setExact(id, val) {
    const n = parseInt(val, 10);
    setTally((p) => ({ ...p, [id]: isNaN(n) ? 0 : Math.max(0, n) }));
  }

  const categories = useMemo(() => {
    const cats = new Set(['All']);
    recipes.forEach((r) => {
      if (r.category && r.category.trim()) cats.add(r.category.trim());
    });
    return Array.from(cats);
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    return recipes.filter((r) => {
      const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = selectedCategory === 'All' || r.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [recipes, searchTerm, selectedCategory]);

  const lineItems = useMemo(() =>
    recipes
      .map((r) => ({ ...r, qty: tally[r.id] || 0, subtotal: (tally[r.id] || 0) * Number(r.selling_price) }))
      .filter((r) => r.qty > 0),
    [recipes, tally]
  );

  const totalQuantity = lineItems.reduce((s, l) => s + l.qty, 0);
  const grandTotal = lineItems.reduce((s, l) => s + l.subtotal, 0);

  function reset() {
    const init = {};
    recipes.forEach((r) => { init[r.id] = 0; });
    setTally(init);
    setSubmitted(false);
    setLastOrder(null);
    setError('');
  }

  async function checkout() {
    if (!lineItems.length) { setError('Add at least one item.'); return; }
    setError('');
    setSubmitting(true);
    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sale_date: saleDate,
        items: lineItems.map((l) => ({ recipe_id: l.id, quantity: l.qty, unit_price: l.selling_price })),
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const e = await res.json();
      setError(e.error || 'Failed to save order');
      return;
    }
    invalidateCache('/api/sales');
    invalidateCache('/api/reports');
    setLastOrder({ items: [...lineItems], total: grandTotal, date: saleDate });
    setSubmitted(true);
  }

  if (loading) return <PageSpinner label="Loading counter dishes…" />;

  const safeRecipes = Array.isArray(recipes) ? recipes : [];

  if (safeRecipes.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-black text-stone-900">Point of Sale Counter</h1>
        <div className="card text-center py-12 space-y-3">
          <BookOpen size={36} className="text-amber-500 mx-auto" />
          <p className="font-bold text-stone-800">No dishes in your menu yet</p>
          <p className="text-stone-400 text-sm max-w-sm mx-auto">
            Before you can use the fast counter checkout, add your dishes and selling prices under Dishes.
          </p>
          <Link href="/recipes/new" className="btn-primary inline-flex text-xs">
            Add Your First Dish
          </Link>
        </div>
      </div>
    );
  }

  if (submitted && lastOrder) {
    return (
      <div className="space-y-5 max-w-lg mx-auto">
        <div className="card text-center space-y-5 py-10 shadow-xl border-green-100">
          <div className="w-16 h-16 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto shadow-sm ring-8 ring-green-50/60">
            <CheckCircle2 size={38} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-stone-900 tracking-tight">Order Saved!</h2>
            <p className="text-xs text-stone-400 mt-1">{lastOrder.date} · Cashflow updated</p>
          </div>

          <div className="bg-stone-50 rounded-2xl p-4 text-left space-y-2 border border-stone-200/50">
            <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
              Receipt Items
            </p>
            {lastOrder.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-stone-700 font-medium">
                  {item.name} <span className="text-stone-400 text-xs">× {item.qty}</span>
                </span>
                <span className="font-bold text-stone-900">{fmtKES(item.subtotal)}</span>
              </div>
            ))}
            <div className="border-t border-stone-200 pt-2.5 mt-2.5 flex justify-between items-baseline">
              <span className="font-black text-stone-800 text-base">Grand Total</span>
              <span className="text-2xl font-black text-green-600">{fmtKES(lastOrder.total)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button className="btn-primary w-full py-3" onClick={reset}>
              <RotateCcw size={15} /> New Sale
            </button>
            <Link href="/sales" className="btn-secondary w-full py-3">
              <Receipt size={15} /> Sales History
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Header & Date */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-stone-200/50">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            Counter
          </h1>
          <p className="text-stone-400 text-xs sm:text-sm">
            Fast touch point-of-sale · Tap dishes to ring up
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="input w-auto text-xs py-2 px-3 bg-white border-stone-200 shadow-sm"
            value={saleDate}
            onChange={(e) => setSaleDate(e.target.value)}
          />
        </div>
      </div>

      {/* Search and Category Filter */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            className="input pl-10 pr-4 py-2.5 bg-white border border-stone-200/70"
            placeholder="Search dish (e.g. Mahamri, Chai, Pilau)…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {categories.length > 2 && (
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none py-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition ${
                  selectedCategory === cat
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/60'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Dish Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4">
        {filteredRecipes.map((r) => {
          const qty = tally[r.id] || 0;
          return (
            <div
              key={r.id}
              className={`card flex flex-col justify-between p-4 transition-all duration-200 ${
                qty > 0
                  ? 'ring-2 ring-brand-500 bg-brand-50/20 border-brand-200 shadow-md'
                  : 'hover:border-stone-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <p className="font-extrabold text-stone-900 text-base leading-tight truncate">
                    {r.name}
                  </p>
                  <p className="text-xs text-stone-400 font-medium mt-0.5">
                    <span className="font-bold text-stone-700">{fmtKES(r.selling_price)}</span> / {r.yield_unit || 'piece'}
                  </p>
                </div>

                {/* Counter Stepper Buttons */}
                <div className="flex items-center gap-1.5 shrink-0 bg-stone-100/80 p-1 rounded-full border border-stone-200/60">
                  <button
                    className="w-8 h-8 rounded-full bg-white hover:bg-stone-200 text-stone-700 flex items-center justify-center transition active:scale-90 shadow-sm"
                    onClick={() => add(r.id, -1)}
                    aria-label="Decrease quantity"
                  >
                    <Minus size={15} strokeWidth={2.5} />
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={qty}
                    onChange={(e) => setExact(r.id, e.target.value)}
                    className="w-12 text-center bg-transparent py-1 text-sm font-black text-stone-900 focus:outline-none"
                  />
                  <button
                    className="w-8 h-8 rounded-full bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center transition active:scale-90 shadow-md shadow-brand-500/30"
                    onClick={() => add(r.id, 1)}
                    aria-label="Increase quantity"
                  >
                    <Plus size={15} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              {/* Quick Increment Buttons */}
              <div className="flex gap-1.5 pt-1">
                {QUICK.map((n) => (
                  <button
                    key={n}
                    className="flex-1 rounded-xl bg-stone-100 hover:bg-stone-200/80 text-stone-700 text-xs font-bold py-1.5 transition active:scale-95"
                    onClick={() => add(r.id, n)}
                  >
                    +{n}
                  </button>
                ))}
              </div>

              {/* Line subtotal */}
              {qty > 0 && (
                <div className="mt-2.5 pt-2 border-t border-brand-200/60 flex justify-between items-center text-xs">
                  <span className="text-brand-700 font-semibold">{qty} × {fmtKES(r.selling_price)}</span>
                  <span className="font-black text-brand-700 text-sm">{fmtKES(qty * r.selling_price)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredRecipes.length === 0 && (
        <div className="card text-center py-8 text-stone-400 text-sm">
          No dishes match &ldquo;{searchTerm}&rdquo;.
        </div>
      )}

      {/* Floating Checkout Drawer: Positioned safely above mobile nav */}
      <div className="sticky bottom-[calc(4.8rem+env(safe-area-inset-bottom))] md:bottom-6 z-40 bg-white/95 backdrop-blur-xl rounded-3xl p-4 sm:p-5 shadow-[0_8px_32px_rgba(0,0,0,0.14)] border border-stone-200/90 transition-all">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-black text-sm shrink-0">
              <ShoppingCart size={18} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-stone-900 text-sm group-hover:text-brand-600 transition">
                  {totalQuantity > 0 ? `${totalQuantity} item${totalQuantity !== 1 ? 's' : ''}` : 'Cart empty'}
                </span>
                {lineItems.length > 0 && (
                  showDetails ? <ChevronDown size={14} className="text-stone-400" /> : <ChevronUp size={14} className="text-stone-400" />
                )}
              </div>
              <p className="text-[11px] text-stone-400">Tap to {showDetails ? 'hide' : 'review'} breakdown</p>
            </div>
          </button>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">Total</span>
            <span className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight block leading-tight">
              {fmtKES(grandTotal)}
            </span>
          </div>
        </div>

        {/* Collapsible itemized details */}
        {showDetails && lineItems.length > 0 && (
          <div className="mt-4 pt-3 border-t border-stone-100 max-h-48 overflow-y-auto space-y-1.5 text-xs text-stone-600 pr-1">
            {lineItems.map((l) => (
              <div key={l.id} className="flex justify-between items-center py-1 border-b border-stone-50">
                <span className="font-medium text-stone-800">
                  {l.name} <span className="text-stone-400 font-normal">×{l.qty}</span>
                </span>
                <span className="font-bold text-stone-900">{fmtKES(l.subtotal)}</span>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-rose-500 text-xs font-semibold mt-2">{error}</p>}

        <div className="grid grid-cols-3 gap-2 mt-3 pt-1">
          <button
            className="btn-secondary py-3 text-xs col-span-1 justify-center"
            onClick={reset}
            disabled={submitting || lineItems.length === 0}
          >
            <RotateCcw size={13} /> Clear
          </button>
          <button
            className="btn-primary py-3 text-sm col-span-2 justify-center shadow-lg shadow-brand-500/25 font-black"
            onClick={checkout}
            disabled={submitting || lineItems.length === 0}
          >
            {submitting ? (
              <><InlineSpinner /> Logging Sale…</>
            ) : (
              `Checkout ${fmtKES(grandTotal)}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
