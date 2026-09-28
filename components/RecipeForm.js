'use client';
import { useEffect, useMemo, useState } from 'react';
import { Plus, X, Info } from 'lucide-react';
import { InlineSpinner } from '@/components/Spinner';
import { fetchArray } from '@/lib/fetchHelpers';

function fmtKES(n) {
  return 'KSh ' + (Number(n) || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function RecipeForm({ initial, onSubmit, submitLabel }) {
  const [ingredientsList, setIngredientsList] = useState([]);
  const [loadingIngredients, setLoadingIngredients] = useState(true);
  const [name, setName]               = useState(initial?.name || '');
  const [category, setCategory]       = useState(initial?.category || '');
  const [yieldQty, setYieldQty]       = useState(initial?.yield_qty || '');
  const [yieldUnit, setYieldUnit]     = useState(initial?.yield_unit || 'piece');
  const [sellingPrice, setPrice]      = useState(initial?.selling_price || '');
  const [lines, setLines]             = useState(
    initial?.lines?.length ? initial.lines : [{ ingredient_id: '', quantity: '', cost_mode: 'direct' }]
  );
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchArray('/api/ingredients').then((data) => {
      setIngredientsList(data);
      setLoadingIngredients(false);
    });
  }, []);

  function ingById(id) { return ingredientsList.find((i) => String(i.id) === String(id)); }
  function updateLine(idx, field, val) { setLines((p) => p.map((l, i) => i === idx ? { ...l, [field]: val } : l)); }
  function addLine()        { setLines((p) => [...p, { ingredient_id: '', quantity: '', cost_mode: 'direct' }]); }
  function removeLine(idx)  { setLines((p) => p.filter((_, i) => i !== idx)); }

  const preview = useMemo(() => {
    let direct = 0;
    const overhead = [];
    for (const l of lines) {
      const ing = ingById(l.ingredient_id);
      if (!ing || !l.quantity) continue;
      const cost = ing.unit_cost * Number(l.quantity);
      if (l.cost_mode === 'overhead') overhead.push({ name: ing.name });
      else direct += cost;
    }
    const y = Number(yieldQty) || 1;
    const cpu = direct / y;
    const price = Number(sellingPrice) || 0;
    const profit = price - cpu;
    const margin = price > 0 ? (profit / price) * 100 : 0;
    return { direct, cpu, profit, margin, overhead };
  }, [lines, ingredientsList, yieldQty, sellingPrice]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    const valid = lines.filter((l) => l.ingredient_id && l.quantity);
    if (!valid.length) { setError('Add at least one ingredient with a quantity.'); return; }
    setSaving(true);
    try {
      await onSubmit({
        name,
        category,
        yield_qty: yieldQty,
        yield_unit: yieldUnit,
        selling_price: sellingPrice,
        ingredients: valid.map((l) => ({
          ingredient_id: Number(l.ingredient_id),
          quantity: Number(l.quantity),
          cost_mode: l.cost_mode || 'direct',
        })),
      });
    } catch (err) {
      setError(err.message || 'Failed to save dish');
    }
    setSaving(false);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Basic Dish Info */}
      <div className="card space-y-4">
        <h3 className="font-extrabold text-stone-900 text-base">Basic Details</h3>
        <div>
          <label className="label">Dish Name</label>
          <input
            className="input font-semibold"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mahamri, Chai, Beef Stew, Pilau"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="label">Category</label>
            <input
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Breakfast, Snacks, Lunch"
            />
          </div>
          <div>
            <label className="label">Selling Price (KSh / unit)</label>
            <input
              className="input font-black text-stone-900"
              type="number"
              step="any"
              min="0"
              value={sellingPrice}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 10"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="label">1 Full Batch Yields</label>
            <input
              className="input font-bold"
              type="number"
              step="any"
              min="1"
              value={yieldQty}
              onChange={(e) => setYieldQty(e.target.value)}
              placeholder="e.g. 160"
              required
            />
          </div>
          <div>
            <label className="label">Portion Unit</label>
            <select className="input" value={yieldUnit} onChange={(e) => setYieldUnit(e.target.value)}>
              <option value="piece">pieces</option>
              <option value="plate">plates</option>
              <option value="cup">cups</option>
              <option value="portion">portions</option>
              <option value="litre">litres</option>
              <option value="serving">servings</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ingredients per Batch */}
      <div className="card space-y-3.5">
        <div className="flex justify-between items-center pb-1">
          <div>
            <h3 className="font-extrabold text-stone-900 text-base">Ingredients per Batch</h3>
            <p className="text-xs text-stone-400">Specify amounts used to produce one full batch</p>
          </div>
          <button
            type="button"
            className="btn-secondary text-xs py-1.5 px-3.5 gap-1 shadow-xs"
            onClick={addLine}
          >
            <Plus size={14} className="text-brand-600" /> Add Line
          </button>
        </div>

        {!loadingIngredients && !ingredientsList.length && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200/60 rounded-2xl p-3">
            You don&apos;t have any ingredients registered yet. Visit the Ingredients tab to add flour, oil, etc.
          </p>
        )}

        {/* Responsive Line Items */}
        <div className="space-y-3">
          {lines.map((line, idx) => {
            const ing = ingById(line.ingredient_id);
            return (
              <div
                key={idx}
                className="bg-stone-50/70 border border-stone-200/60 rounded-2xl p-3 space-y-2 sm:space-y-0 sm:grid sm:grid-cols-[1.5fr_110px_130px_36px] sm:gap-2 sm:items-center"
              >
                {/* Mobile Row 1 / Col 1: Ingredient Dropdown & Delete Button */}
                <div className="flex items-center gap-2">
                  <select
                    className="input font-medium text-xs sm:text-sm bg-white"
                    value={line.ingredient_id}
                    onChange={(e) => updateLine(idx, 'ingredient_id', e.target.value)}
                  >
                    <option value="">Select ingredient…</option>
                    {ingredientsList.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} ({fmtKES(i.unit_cost)}/{i.base_unit})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="sm:hidden btn-ghost p-2 text-stone-400 hover:text-rose-500 shrink-0"
                    onClick={() => removeLine(idx)}
                    title="Remove ingredient"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Mobile Row 2 / Cols 2 & 3: Quantity + Cost Mode */}
                <div className="grid grid-cols-2 sm:contents gap-2">
                  <input
                    className="input text-xs sm:text-sm bg-white font-bold"
                    type="number"
                    step="any"
                    min="0"
                    placeholder={ing ? `Qty in ${ing.base_unit}` : 'Quantity'}
                    value={line.quantity}
                    onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                  />

                  <select
                    className="input text-xs bg-white font-semibold"
                    value={line.cost_mode || 'direct'}
                    onChange={(e) => updateLine(idx, 'cost_mode', e.target.value)}
                  >
                    <option value="direct">Direct Cost</option>
                    <option value="overhead">Overhead</option>
                  </select>
                </div>

                {/* Desktop Delete button */}
                <button
                  type="button"
                  className="hidden sm:flex btn-ghost p-2 text-stone-400 hover:text-rose-500 rounded-full justify-center"
                  onClick={() => removeLine(idx)}
                  title="Remove ingredient"
                >
                  <X size={16} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-start gap-2 text-[11px] text-stone-500 bg-stone-100/70 rounded-2xl p-3 border border-stone-200/50">
          <Info size={14} className="mt-0.5 shrink-0 text-stone-400" />
          <span>
            <strong className="text-stone-700">Direct Cost:</strong> Factored into per-portion food cost & margin (flour, oil, sugar).&nbsp;
            <strong className="text-stone-700">Overhead:</strong> Tracked for reference but excluded from unit food cost (shared charcoal, gas).
          </span>
        </div>
      </div>

      {/* Live Cost Preview Card */}
      <div className="card bg-gradient-to-br from-brand-50/50 to-orange-50/40 border-brand-200/60 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-extrabold text-stone-900 text-sm sm:text-base flex items-center gap-1.5">
             Live Recipe Cost Preview
          </h3>
          <span className={`badge ${preview.margin >= 40 ? 'bg-emerald-100 text-emerald-800' : preview.margin >= 15 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'} font-bold`}>
            {preview.margin.toFixed(0)}% Margin
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 text-center">
          <div className="rounded-2xl bg-white/90 border border-stone-200/60 p-3 shadow-xs">
            <p className="text-[10px] uppercase font-bold text-stone-400">Direct / Batch</p>
            <p className="font-black text-stone-800 text-sm sm:text-base mt-0.5">
              {fmtKES(preview.direct)}
            </p>
          </div>
          <div className="rounded-2xl bg-white/90 border border-stone-200/60 p-3 shadow-xs">
            <p className="text-[10px] uppercase font-bold text-stone-400">Cost / {yieldUnit}</p>
            <p className="font-black text-stone-800 text-sm sm:text-base mt-0.5">
              {fmtKES(preview.cpu)}
            </p>
          </div>
          <div className="rounded-2xl bg-white/90 border border-stone-200/60 p-3 shadow-xs">
            <p className="text-[10px] uppercase font-bold text-stone-400">Profit / {yieldUnit}</p>
            <p className={`font-black text-sm sm:text-base mt-0.5 ${preview.profit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
              {fmtKES(preview.profit)}
            </p>
          </div>
        </div>

        {preview.overhead.length > 0 && (
          <p className="text-[11px] text-amber-800 mt-3 font-medium">
            Overhead items (tracked separately): {preview.overhead.map((o) => o.name).join(', ')}
          </p>
        )}
      </div>

      {error && <p className="text-rose-500 text-xs font-semibold">{error}</p>}

      <button className="btn-primary w-full py-3.5 shadow-lg shadow-brand-500/25 font-bold" disabled={saving}>
        {saving ? <><InlineSpinner /> Saving Dish…</> : submitLabel}
      </button>
    </form>
  );
}
