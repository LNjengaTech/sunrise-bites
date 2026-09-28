'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChefHat, Trash2, FlameKindling, PackageCheck, Plus, Sparkles } from 'lucide-react';
import { PageSpinner, InlineSpinner } from '@/components/Spinner';
import { fetchArray, getCached, hasCached, invalidateCache } from '@/lib/fetchHelpers';

function fmtKES(n) {
  return 'KSh ' + (Number(n) || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const BATCH_URL = '/api/batches?from=2000-01-01&to=2100-01-01';
const MULTIPLIERS = [0.5, 1, 1.5, 2, 3, 4];

export default function BatchesPage() {
  const [recipes, setRecipes]               = useState(() => getCached('/api/recipes') || []);
  const [batches, setBatches]               = useState(() => getCached(BATCH_URL) || []);
  const [loading, setLoading]               = useState(() => !hasCached('/api/recipes') && !hasCached(BATCH_URL));
  const [recipeId, setRecipeId]             = useState(() => (getCached('/api/recipes')?.[0]?.id ? String(getCached('/api/recipes')[0].id) : ''));
  const [batchCount, setBatchCount]         = useState('1');
  const [productionDate, setProductionDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes]                   = useState('');
  const [saving, setSaving]                 = useState(false);
  const [error, setError]                   = useState('');
  const [preview, setPreview]               = useState(null);

  async function loadBatches() {
    const freshBatches = await fetchArray(BATCH_URL);
    setBatches(freshBatches);
  }

  useEffect(() => {
    Promise.all([
      fetchArray('/api/recipes'),
      fetchArray(BATCH_URL),
    ]).then(([r, b]) => {
      setRecipes(r);
      setBatches(b);
      if (r.length > 0 && !recipeId) setRecipeId(String(r[0].id));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const r = recipes.find((x) => String(x.id) === String(recipeId));
    if (!r) { setPreview(null); return; }
    const count = Number(batchCount) || 1;
    const produced = count * (Number(r.yield_qty) || 1);
    const batchCost = count * (Number(r.directCostPerBatch) || 0);
    const costPerPiece = produced > 0 ? batchCost / produced : 0;
    setPreview({
      name: r.name,
      yieldUnit: r.yield_unit || 'piece',
      produced,
      batchCost,
      costPerPiece,
    });
  }, [recipeId, batchCount, recipes]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!recipeId) { setError('Select a dish.'); return; }
    setSaving(true);
    const res = await fetch('/api/batches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipe_id: Number(recipeId),
        batch_count: Number(batchCount) || 1,
        production_date: productionDate,
        notes,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const e = await res.json();
      setError(e.error || 'Failed to save production batch');
      return;
    }
    invalidateCache('/api/batches');
    invalidateCache('/api/reports');
    setBatchCount('1');
    setNotes('');
    loadBatches();
  }

  async function del(id) {
    if (!confirm('Remove this production record?')) return;
    await fetch(`/api/batches/${id}`, { method: 'DELETE' });
    invalidateCache('/api/batches');
    invalidateCache('/api/reports');
    loadBatches();
  }

  if (loading) return <PageSpinner label="Loading production log…" />;

  const safeRecipes = Array.isArray(recipes) ? recipes : [];
  const safeBatches = Array.isArray(batches) ? batches : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-1 border-b border-stone-200/50">
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
          Production Log
        </h1>
        <p className="text-stone-400 text-xs sm:text-sm mt-0.5">
          Log every batch cooked to automatically calculate unsold food cost and accurate margins.
        </p>
      </div>

      {safeRecipes.length === 0 ? (
        <div className="card text-center py-12 space-y-3">
          <ChefHat size={36} className="text-amber-500 mx-auto" />
          <p className="font-bold text-stone-800">No dishes set up yet</p>
          <p className="text-stone-400 text-sm max-w-sm mx-auto">
            You need to add at least one dish under Dishes before you can log cooking batches.
          </p>
          <Link href="/recipes/new" className="btn-primary inline-flex text-xs">
            Add a dish
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="card space-y-4">
          <div>
            <label className="label">What dish was cooked?</label>
            <select
              className="input font-semibold text-stone-800"
              value={recipeId}
              onChange={(e) => setRecipeId(e.target.value)}
              required
            >
              {safeRecipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} (Yields {r.yield_qty} {r.yield_unit}s / batch)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="label">Batches Cooked</label>
              <div className="flex gap-2 items-center">
                <input
                  className="input font-bold"
                  type="number"
                  min="0.25"
                  step="0.25"
                  value={batchCount}
                  onChange={(e) => setBatchCount(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {MULTIPLIERS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setBatchCount(String(m))}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold transition ${
                      Number(batchCount) === m
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {m}x
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Date Cooked</label>
              <input
                className="input"
                type="date"
                value={productionDate}
                onChange={(e) => setProductionDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Live Production Preview */}
          {preview && (
            <div className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200/60 p-4 sm:p-5 text-sm space-y-3">
              <div className="flex items-center gap-2 font-bold text-amber-900 text-xs uppercase tracking-wider">
                <FlameKindling size={16} className="text-amber-600" /> Batch Output Preview
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/80 rounded-2xl p-3 shadow-xs">
                  <p className="text-[10px] uppercase font-bold text-stone-400">Total Yield</p>
                  <p className="font-extrabold text-stone-800 text-base mt-0.5">
                    {preview.produced} {preview.yieldUnit}s
                  </p>
                </div>
                <div className="bg-white/80 rounded-2xl p-3 shadow-xs">
                  <p className="text-[10px] uppercase font-bold text-stone-400">Ingredient Cost</p>
                  <p className="font-extrabold text-stone-800 text-base mt-0.5">
                    {fmtKES(preview.batchCost)}
                  </p>
                </div>
                <div className="bg-white/80 rounded-2xl p-3 shadow-xs">
                  <p className="text-[10px] uppercase font-bold text-stone-400">Cost / Unit</p>
                  <p className="font-extrabold text-amber-700 text-base mt-0.5">
                    {fmtKES(preview.costPerPiece)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="label">Notes (Optional)</label>
            <input
              className="input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. morning breakfast shift, school order batch"
            />
          </div>

          {error && <p className="text-rose-500 text-xs font-semibold">{error}</p>}

          <button className="btn-primary w-full py-3.5 shadow-lg shadow-brand-500/25" disabled={saving}>
            {saving ? (
              <><InlineSpinner /> Saving Batch…</>
            ) : (
              <><ChefHat size={16} /> Log Production Batch</>
            )}
          </button>
        </form>
      )}

      {/* Recent Batches List */}
      <div>
        <h2 className="font-bold text-stone-800 mb-3 flex items-center gap-2 text-sm sm:text-base">
          <PackageCheck size={18} className="text-brand-600" /> Recent Production Batches
        </h2>
        <div className="space-y-2.5">
          {safeBatches.length === 0 && (
            <div className="card text-center py-8 text-stone-400 text-sm">
              No cooking batches recorded yet.
            </div>
          )}
          {safeBatches.map((b) => (
            <div
              key={b.id}
              className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:border-stone-300"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-extrabold text-stone-800 text-base">{b.recipe_name}</p>
                  <span className="badge bg-amber-50 text-amber-700 font-bold border border-amber-200/60">
                    {b.batch_count} {Number(b.batch_count) === 1 ? 'batch' : 'batches'}
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-1">
                  {b.production_date} · Produced <strong className="text-stone-600 font-semibold">{b.produced_qty} {b.yield_unit}s</strong>
                  {b.notes ? ` · ${b.notes}` : ''}
                </p>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                <div className="text-right">
                  <span className="text-[10px] text-stone-400 block uppercase font-bold">Cost</span>
                  <span className="text-sm font-black text-stone-800">{fmtKES(b.batch_cost)}</span>
                </div>
                <button
                  onClick={() => del(b.id)}
                  className="btn-ghost p-2 hover:bg-rose-50 text-stone-400 hover:text-rose-500 rounded-full transition"
                  title="Delete batch"
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
