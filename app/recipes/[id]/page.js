'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import RecipeForm from '@/components/RecipeForm';
import { Pencil, Trash2, ArrowLeft, TrendingUp, ChefHat, Sparkles } from 'lucide-react';
import { PageSpinner } from '@/components/Spinner';
import { fetchOne, getCached, hasCached, invalidateCache } from '@/lib/fetchHelpers';

function fmtKES(n) {
  return 'KSh ' + (Number(n) || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function RecipeDetailPage({ params }) {
  const router = useRouter();
  const recipeUrl = `/api/recipes/${params.id}`;
  const [cost, setCost]       = useState(() => getCached(recipeUrl));
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(() => !hasCached(recipeUrl));
  const [notFound, setNotFound] = useState(false);

  async function load() {
    if (!hasCached(recipeUrl)) setLoading(true);
    const data = await fetchOne(recipeUrl);
    if (!data && !cost) setNotFound(true);
    else if (data) setCost(data);
    setLoading(false);
  }
  useEffect(() => { load(); }, [recipeUrl]);

  async function handleUpdate(payload) {
    const res = await fetch(recipeUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
    invalidateCache('/api/recipes');
    invalidateCache('/api/reports');
    setEditing(false);
    load();
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this dish? All related batch calculations will be affected.')) return;
    await fetch(recipeUrl, { method: 'DELETE' });
    invalidateCache('/api/recipes');
    invalidateCache('/api/reports');
    router.push('/recipes');
  }

  if (loading) return <PageSpinner label="Loading dish breakdown…" />;
  if (notFound || !cost) {
    return (
      <div className="card text-center py-12 space-y-4">
        <p className="text-stone-500 font-bold">Dish not found.</p>
        <Link href="/recipes" className="btn-secondary text-xs inline-flex">
          <ArrowLeft size={14} /> Back to Dishes
        </Link>
      </div>
    );
  }

  if (editing) {
    const initial = {
      ...cost.recipe,
      lines: [...(cost.directLines || []), ...(cost.sharedLines || [])].map((l) => ({
        ingredient_id: l.ingredient_id,
        quantity: l.quantity,
        cost_mode: l.cost_mode || (l.is_shared ? 'overhead' : 'direct'),
      })),
    };
    return (
      <div className="space-y-5">
        <div className="flex justify-between items-center pb-2 border-b border-stone-200/50">
          <div>
            <h1 className="text-2xl font-black text-stone-900">Edit {cost.recipe.name}</h1>
            <p className="text-xs text-stone-400 mt-0.5">Adjust yield, selling price, or ingredient proportions</p>
          </div>
          <button className="btn-secondary text-xs" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
        <RecipeForm initial={initial} onSubmit={handleUpdate} submitLabel="Save changes" />
      </div>
    );
  }

  const {
    recipe,
    directLines = [],
    sharedLines = [],
    directCostPerBatch,
    costPerUnit,
    profitPerUnit,
    marginPercent,
    revenuePerBatch,
    profitPerBatch,
  } = cost;

  return (
    <div className="space-y-6">
      {/* Top Bar with Back & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-stone-200/50">
        <div>
          <Link
            href="/recipes"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-400 hover:text-stone-700 mb-1.5 transition"
          >
            <ArrowLeft size={13} /> Back to Dishes
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            {recipe.name}
          </h1>
          <p className="text-stone-400 text-xs sm:text-sm mt-0.5">
            {recipe.category || 'Standard Dish'} · Batch yields{' '}
            <strong className="text-stone-700 font-bold">{recipe.yield_qty} {recipe.yield_unit || 'piece'}s</strong>
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button className="btn-secondary text-xs py-2 px-3 gap-1.5" onClick={() => setEditing(true)}>
            <Pencil size={13} /> Edit Recipe
          </button>
          <button
            className="btn-danger text-xs p-2.5 rounded-full"
            onClick={handleDelete}
            title="Delete dish"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* 4 Unit Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="card p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
            Selling Price
          </span>
          <p className="text-xl sm:text-2xl font-black text-stone-900 mt-1">
            {fmtKES(recipe.selling_price)}
          </p>
          <span className="text-[10px] text-stone-400">per {recipe.yield_unit || 'piece'}</span>
        </div>

        <div className="card p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
            Direct Food Cost
          </span>
          <p className="text-xl sm:text-2xl font-black text-stone-800 mt-1">
            {fmtKES(costPerUnit)}
          </p>
          <span className="text-[10px] text-stone-400">per {recipe.yield_unit || 'piece'}</span>
        </div>

        <div className="card p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
            Gross Profit
          </span>
          <p className={`text-xl sm:text-2xl font-black mt-1 ${profitPerUnit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
            {fmtKES(profitPerUnit)}
          </p>
          <span className="text-[10px] text-stone-400">per {recipe.yield_unit || 'piece'}</span>
        </div>

        <div className="card p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
            Profit Margin
          </span>
          <p className={`text-xl sm:text-2xl font-black mt-1 ${marginPercent >= 40 ? 'text-emerald-600' : marginPercent >= 15 ? 'text-amber-600' : 'text-rose-500'}`}>
            {(marginPercent || 0).toFixed(0)}%
          </p>
          <span className="text-[10px] text-stone-400">of selling price</span>
        </div>
      </div>

      {/* Direct Ingredients Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-extrabold text-stone-900 text-base">Direct Ingredients (Per Batch)</h3>
            <p className="text-xs text-stone-400">Flour, oil, sugar and core ingredients scaled to 1 full batch</p>
          </div>
          <span className="badge bg-stone-100 text-stone-600 text-xs">
            {directLines.length} ingredient{directLines.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[360px]">
            <thead>
              <tr className="text-left text-stone-400 text-xs border-b border-stone-100">
                <th className="pb-2.5 font-bold uppercase tracking-wider">Ingredient</th>
                <th className="pb-2.5 font-bold uppercase tracking-wider">Qty / Batch</th>
                <th className="pb-2.5 text-right font-bold uppercase tracking-wider">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {directLines.map((l) => (
                <tr key={l.id} className="hover:bg-stone-50/50 transition">
                  <td className="py-3 font-semibold text-stone-800">{l.name}</td>
                  <td className="py-3 text-stone-500 font-medium">
                    {l.quantity} {l.base_unit}
                  </td>
                  <td className="py-3 text-right font-black text-stone-900">
                    {fmtKES(l.lineCost)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-stone-200">
                <td className="pt-3 font-black text-stone-900" colSpan={2}>
                  Total Direct Cost per Batch ({recipe.yield_qty} {recipe.yield_unit}s)
                </td>
                <td className="pt-3 text-right font-black text-base text-stone-900">
                  {fmtKES(directCostPerBatch)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Shared Overhead Section */}
      {sharedLines.length > 0 && (
        <div className="rounded-3xl bg-amber-50/70 border border-amber-200/60 p-4 sm:p-5">
          <h3 className="font-extrabold text-amber-950 text-sm mb-1">
            Overhead / Shared Ingredients (Reference Only)
          </h3>
          <p className="text-xs text-amber-800/80 mb-3">
            Charcoal, cooking gas, or wrapping paper used across multiple dishes. Excluded from per-unit direct cost and captured at the business level.
          </p>
          <div className="space-y-1.5 text-xs text-stone-700">
            {sharedLines.map((l) => (
              <div key={l.id} className="flex justify-between py-1 border-b border-amber-200/30 font-medium">
                <span>{l.name}</span>
                <span>{l.quantity} {l.base_unit}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
