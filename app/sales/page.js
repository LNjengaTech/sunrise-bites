'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, Trash2, Store, Sparkles } from 'lucide-react';
import { PageSpinner, InlineSpinner } from '@/components/Spinner';
import { fetchArray, getCached, hasCached, invalidateCache } from '@/lib/fetchHelpers';

function fmtKES(n) {
  return 'KSh ' + (Number(n) || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const SALES_URL = '/api/sales?from=2000-01-01&to=2100-01-01';

export default function SalesPage() {
  const [recipes, setRecipes]     = useState(() => getCached('/api/recipes') || []);
  const [sales, setSales]         = useState(() => getCached(SALES_URL) || []);
  const [loading, setLoading]     = useState(() => !hasCached('/api/recipes') && !hasCached(SALES_URL));
  const [recipeId, setRecipeId]   = useState('');
  const [quantity, setQuantity]   = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [saleDate, setSaleDate]   = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  async function loadSales() {
    const freshSales = await fetchArray(SALES_URL);
    setSales(freshSales);
  }

  useEffect(() => {
    Promise.all([
      fetchArray('/api/recipes'),
      fetchArray(SALES_URL),
    ]).then(([r, s]) => {
      setRecipes(r);
      setSales(s);
      setLoading(false);
    });
  }, []);

  function handleRecipeChange(id) {
    setRecipeId(id);
    const r = recipes.find((x) => String(x.id) === String(id));
    if (r) setUnitPrice(r.selling_price);
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!recipeId || !quantity) { setError('Choose a dish and quantity.'); return; }
    setSaving(true);
    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipe_id: Number(recipeId),
        quantity: Number(quantity),
        unit_price: Number(unitPrice),
        sale_date: saleDate,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const e = await res.json();
      setError(e.error || 'Failed to log sale');
      return;
    }
    invalidateCache('/api/sales');
    invalidateCache('/api/reports');
    setQuantity('');
    loadSales();
  }

  async function del(id) {
    if (!confirm('Remove this sale entry? Cashflow numbers will update.')) return;
    await fetch(`/api/sales/${id}`, { method: 'DELETE' });
    invalidateCache('/api/sales');
    invalidateCache('/api/reports');
    loadSales();
  }

  if (loading) return <PageSpinner label="Loading sales history…" />;

  const safeRecipes = Array.isArray(recipes) ? recipes : [];
  const safeSales = Array.isArray(sales) ? sales : [];
  const computedTotal = (Number(quantity) || 0) * (Number(unitPrice) || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-stone-200/50">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            Sales Log
          </h1>
          <p className="text-stone-400 text-xs sm:text-sm mt-0.5">
            Log custom single transactions or view all sales history.
          </p>
        </div>
        <Link href="/counter" className="btn-secondary text-xs self-start sm:self-auto gap-1.5">
          <Store size={14} className="text-brand-600" /> Open Counter POS
        </Link>
      </div>

      {safeRecipes.length === 0 ? (
        <div className="card text-center py-12 space-y-3">
          <ShoppingCart size={36} className="text-brand-500 mx-auto" />
          <p className="font-bold text-stone-700">Add dishes before logging sales</p>
          <Link href="/recipes/new" className="btn-primary text-xs inline-flex">
            Add a dish
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="card space-y-4">
          <h2 className="font-extrabold text-stone-900 text-base">Record a Sale</h2>
          <div>
            <label className="label">Dish Sold</label>
            <select
              className="input font-semibold"
              value={recipeId}
              onChange={(e) => handleRecipeChange(e.target.value)}
              required
            >
              <option value="">Select dish…</option>
              {safeRecipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({fmtKES(r.selling_price)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="label">Quantity Sold</label>
              <input
                className="input font-bold"
                type="number"
                step="any"
                min="0.1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 20"
                required
              />
            </div>
            <div>
              <label className="label">Price Per Unit (KSh)</label>
              <input
                className="input font-bold"
                type="number"
                step="any"
                min="0"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Date of Sale</label>
            <input
              className="input"
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              required
            />
          </div>

          {computedTotal > 0 && (
            <div className="rounded-2xl bg-stone-50 border border-stone-200/50 p-3.5 flex justify-between items-center text-sm">
              <span className="text-stone-500 font-medium">Calculated Sale Total:</span>
              <span className="text-lg font-black text-emerald-600">{fmtKES(computedTotal)}</span>
            </div>
          )}

          {error && <p className="text-rose-500 text-xs font-semibold">{error}</p>}

          <button className="btn-primary w-full py-3.5 shadow-lg shadow-brand-500/25 font-bold" disabled={saving}>
            {saving ? (
              <><InlineSpinner /> Saving Sale…</>
            ) : (
              <><ShoppingCart size={15} /> Log Sale of {fmtKES(computedTotal)}</>
            )}
          </button>
        </form>
      )}

      {/* Recent Sales List */}
      <div>
        <h2 className="font-bold text-stone-800 mb-3 flex items-center gap-2 text-sm sm:text-base">
          <ShoppingCart size={17} className="text-brand-600" /> Recent Sales History
        </h2>
        <div className="space-y-2.5">
          {safeSales.length === 0 && (
            <div className="card text-center py-8 text-stone-400 text-sm">
              No sales logged yet. Use the form above or the Counter tab to ring up orders.
            </div>
          )}
          {safeSales.map((s) => (
            <div
              key={s.id}
              className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:border-stone-300"
            >
              <div className="min-w-0">
                <p className="font-extrabold text-stone-900 text-base">{s.recipe_name}</p>
                <p className="text-xs text-stone-400 mt-0.5">
                  {s.sale_date} · <strong className="text-stone-700 font-semibold">{s.quantity} units</strong> @ {fmtKES(s.unit_price)}
                </p>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                <span className="text-base font-black text-stone-900">
                  {fmtKES(s.quantity * s.unit_price)}
                </span>
                <button
                  onClick={() => del(s.id)}
                  className="btn-ghost p-2 hover:bg-rose-50 text-stone-400 hover:text-rose-500 rounded-full transition"
                  title="Delete sale"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
