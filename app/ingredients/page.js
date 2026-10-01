'use client';
import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, X, Sprout, RefreshCw, Search, Check, AlertCircle } from 'lucide-react';
import { PageSpinner, InlineSpinner } from '@/components/Spinner';
import { fetchArray, getCached, hasCached, invalidateCache } from '@/lib/fetchHelpers';

const UNIT_OPTIONS = {
  weight: [{ label: 'grams (g)', value: 'g' }, { label: 'kilograms (kg)', value: 'kg' }],
  volume: [{ label: 'millilitres (ml)', value: 'ml' }, { label: 'litres (L)', value: 'l' }],
  count:  [{ label: 'pieces', value: 'piece' }],
  flat:   [{ label: 'flat cost (per batch/portion)', value: 'ksh' }],
};

function fmtKES(n) {
  return 'KSh ' + (Number(n) || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState(() => getCached('/api/ingredients') || []);
  const [showAdd, setShowAdd]         = useState(false);
  const [purchaseFor, setPurchaseFor] = useState(null);
  const [loading, setLoading]         = useState(() => !hasCached('/api/ingredients'));
  const [search, setSearch]           = useState('');
  const [filterType, setFilterType]   = useState('all'); // all | direct | overhead

  async function load() {
    if (!hasCached('/api/ingredients')) setLoading(true);
    const data = await fetchArray('/api/ingredients');
    setIngredients(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id, name) {
    if (!confirm(`Delete ingredient "${name}"? Dishes referencing it may be affected.`)) return;
    const res = await fetch(`/api/ingredients/${id}`, { method: 'DELETE' });
    if (!res.ok) { const e = await res.json(); alert(e.error); return; }
    invalidateCache('/api/ingredients');
    invalidateCache('/api/recipes');
    invalidateCache('/api/reports');
    load();
  }

  const safeIngredients = Array.isArray(ingredients) ? ingredients : [];

  const filtered = useMemo(() => {
    return safeIngredients.filter((ing) => {
      const matchSearch = ing.name.toLowerCase().includes(search.toLowerCase());
      const matchType =
        filterType === 'all'
          ? true
          : filterType === 'overhead'
          ? !!ing.is_shared
          : !ing.is_shared;
      return matchSearch && matchType;
    });
  }, [safeIngredients, search, filterType]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-stone-200/50">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            Ingredients
          </h1>
          <p className="text-stone-400 text-xs sm:text-sm mt-0.5">
            Unit costs update dynamically across all dishes when you log restocks.
          </p>
        </div>
        <button
          className="btn-primary self-start sm:self-auto shadow-md shadow-brand-500/20"
          onClick={() => setShowAdd(true)}
        >
          <Plus size={16} /> Add Ingredient
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            className="input pl-10 pr-4 py-2.5 bg-white border border-stone-200/70"
            placeholder="Search ingredients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 self-start sm:self-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'direct', label: 'Direct' },
            { id: 'overhead', label: 'Overheads' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setFilterType(t.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                filterType === t.id
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/60'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <PageSpinner label="Loading ingredient inventory…" />
      ) : safeIngredients.length === 0 ? (
        <div className="card text-center text-stone-400 py-12 space-y-3">
          <Sprout size={36} className="mx-auto text-emerald-500" />
          <p className="font-bold text-stone-700">No ingredients added yet</p>
          <p className="text-xs text-stone-400 max-w-sm mx-auto">
            Add flour, oil, sugar, spices or overheads to start calculating precise recipe costs.
          </p>
          <button className="btn-primary text-xs inline-flex" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add First Ingredient
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((ing) => (
            <div
              key={ing.id}
              className="card flex flex-col justify-between p-4 sm:p-5 hover:border-stone-300 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="font-extrabold text-stone-900 text-base leading-tight">
                    {ing.name}
                  </p>
                  {!!ing.is_shared ? (
                    <span className="badge bg-amber-50 text-amber-700 border border-amber-200/60 shrink-0">
                      Overhead
                    </span>
                  ) : (
                    <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200/60 shrink-0">
                      Direct
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-xl sm:text-2xl font-black text-stone-900">
                    {fmtKES(ing.unit_cost)}
                  </span>
                  <span className="text-xs font-semibold text-stone-400">
                    / {ing.base_unit}
                  </span>
                </div>

                {ing.notes && (
                  <p className="text-xs text-stone-400 mt-2 bg-stone-50 p-2 rounded-xl border border-stone-100">
                    {ing.notes}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-stone-100">
                <button
                  className="btn-secondary text-xs py-2 px-3 gap-1.5 hover:border-brand-300 hover:text-brand-700"
                  onClick={() => setPurchaseFor(ing)}
                >
                  <RefreshCw size={13} className="text-brand-600" /> Restock / Update Cost
                </button>
                <button
                  className="btn-ghost p-2 text-stone-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition"
                  onClick={() => handleDelete(ing.id, ing.name)}
                  title="Delete ingredient"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <AddModal
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            invalidateCache('/api/ingredients');
            invalidateCache('/api/recipes');
            invalidateCache('/api/reports');
            setShowAdd(false);
            load();
          }}
        />
      )}

      {/* Restock Modal */}
      {purchaseFor && (
        <PurchaseModal
          ingredient={purchaseFor}
          onClose={() => setPurchaseFor(null)}
          onSaved={() => {
            invalidateCache('/api/ingredients');
            invalidateCache('/api/recipes');
            invalidateCache('/api/reports');
            setPurchaseFor(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md p-6 max-h-[90vh] overflow-y-auto shadow-2xl relative">
        <div className="flex justify-between items-center mb-5 pb-2 border-b border-stone-100">
          <h2 className="font-black text-xl text-stone-900 tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AddModal({ onClose, onSaved }) {
  const [name, setName]          = useState('');
  const [unitType, setUnitType]  = useState('weight');
  const [purchaseUnit, setPUnit] = useState('kg');
  const [purchaseQty, setPQty]   = useState('');
  const [purchaseCost, setPCost] = useState('');
  const [isShared, setIsShared]  = useState(false);
  const [notes, setNotes]        = useState('');
  const [error, setError]        = useState('');
  const [saving, setSaving]      = useState(false);

  function changeType(t) {
    setUnitType(t);
    setPUnit(UNIT_OPTIONS[t][0].value);
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = await fetch('/api/ingredients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        unit_type: unitType,
        purchase_unit: purchaseUnit,
        purchase_qty: Number(purchaseQty),
        purchase_cost: Number(purchaseCost),
        is_shared: isShared,
        notes,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const e = await res.json();
      setError(e.error || 'Failed to save');
      return;
    }
    onSaved();
  }

  return (
    <Modal title="Add New Ingredient" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Ingredient Name</label>
          <input
            className="input font-semibold"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Wheat flour, Cooking oil, Cardamom"
            required
          />
        </div>

        <div>
          <label className="label">Measurement Type</label>
          <select className="input" value={unitType} onChange={(e) => changeType(e.target.value)}>
            <option value="weight">By weight (g / kg) — flour, sugar, salt</option>
            <option value="volume">By volume (ml / L) — oil, milk, water</option>
            <option value="count">By piece — eggs, lemons, packaging</option>
            <option value="flat">Flat cost per batch / portion</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Purchase Qty</label>
            <input
              className="input font-bold"
              type="number"
              step="any"
              min="0"
              value={purchaseQty}
              onChange={(e) => setPQty(e.target.value)}
              placeholder="e.g. 2"
              required
            />
          </div>
          <div>
            <label className="label">Unit</label>
            <select className="input font-medium" value={purchaseUnit} onChange={(e) => setPUnit(e.target.value)}>
              {UNIT_OPTIONS[unitType].map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Total Price Paid (KSh)</label>
          <input
            className="input font-black text-stone-900"
            type="number"
            step="any"
            min="0"
            value={purchaseCost}
            onChange={(e) => setPCost(e.target.value)}
            placeholder="e.g. 280"
            required
          />
        </div>

        <label className="flex items-start gap-3 text-xs text-stone-700 bg-stone-50 border border-stone-200/60 rounded-2xl p-3 cursor-pointer select-none">
          <input
            type="checkbox"
            className="mt-0.5 rounded text-brand-600 focus:ring-brand-500"
            checked={isShared}
            onChange={(e) => setIsShared(e.target.checked)}
          />
          <span>
            <strong className="text-stone-900 block font-bold">Shared / Business Overhead</strong>
            Used across many dishes (e.g. charcoal, firewood, foil). Excluded from per-portion direct food cost.
          </span>
        </label>

        <div>
          <label className="label">Notes / Source (Optional)</label>
          <input
            className="input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. bought at wholesale stall 14"
          />
        </div>

        {error && <p className="text-rose-500 text-xs font-semibold">{error}</p>}

        <button className="btn-primary w-full py-3 shadow-md shadow-brand-500/20" disabled={saving}>
          {saving ? <><InlineSpinner /> Saving…</> : 'Save Ingredient'}
        </button>
      </form>
    </Modal>
  );
}

function PurchaseModal({ ingredient, onClose, onSaved }) {
  const options = UNIT_OPTIONS[ingredient.unit_type] || UNIT_OPTIONS.flat;
  const [purchaseUnit, setPUnit] = useState(options[0].value);
  const [purchaseQty, setPQty]   = useState('');
  const [purchaseCost, setPCost] = useState('');
  const [saving, setSaving]      = useState(false);
  const [error, setError]        = useState('');

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = await fetch(`/api/ingredients/${ingredient.id}/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        purchase_unit: purchaseUnit,
        purchase_qty: Number(purchaseQty),
        purchase_cost: Number(purchaseCost),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const e = await res.json();
      setError(e.error || 'Failed to update cost');
      return;
    }
    onSaved();
  }

  return (
    <Modal title={`Restock: ${ingredient.name}`} onClose={onClose}>
      <div className="bg-amber-50/70 border border-amber-200/50 rounded-2xl p-3 mb-4 text-xs text-amber-900">
        Current price: <strong className="font-bold">{fmtKES(ingredient.unit_cost)}</strong> per {ingredient.base_unit}.
        Updating this price updates all recipe costs and dish profit calculations automatically.
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Quantity Bought</label>
            <input
              className="input font-bold"
              type="number"
              step="any"
              min="0"
              value={purchaseQty}
              onChange={(e) => setPQty(e.target.value)}
              placeholder="e.g. 5"
              required
            />
          </div>
          <div>
            <label className="label">Unit</label>
            <select className="input font-medium" value={purchaseUnit} onChange={(e) => setPUnit(e.target.value)}>
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Total Amount Paid (KSh)</label>
          <input
            className="input font-black text-stone-900"
            type="number"
            step="any"
            min="0"
            value={purchaseCost}
            onChange={(e) => setPCost(e.target.value)}
            placeholder="e.g. 700"
            required
          />
        </div>

        {error && <p className="text-rose-500 text-xs font-semibold">{error}</p>}

        <button className="btn-primary w-full py-3 shadow-md shadow-brand-500/20" disabled={saving}>
          {saving ? <><InlineSpinner /> Updating…</> : <><RefreshCw size={14} /> Update Price & Log Restock</>}
        </button>
      </form>
    </Modal>
  );
}
