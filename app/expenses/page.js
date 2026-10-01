'use client';
import { useEffect, useState } from 'react';
import {
  Receipt,
  Trash2,
  Building2,
  Users,
  Car,
  Zap,
  MoreHorizontal,
  ShoppingBag,
  Plus,
  Calendar,
  Sparkles,
  Layers,
  Sprout,
} from 'lucide-react';
import { PageSpinner, InlineSpinner } from '@/components/Spinner';
import { fetchArray, getCached, hasCached, invalidateCache } from '@/lib/fetchHelpers';

const CATEGORIES = [
  { value: 'rent',      label: 'Rent',           Icon: Building2 },
  { value: 'wages',     label: 'Wages / Labour', Icon: Users     },
  { value: 'transport', label: 'Transport',      Icon: Car       },
  { value: 'utilities', label: 'Power / Water',  Icon: Zap       },
  { value: 'other',     label: 'Other Overhead', Icon: MoreHorizontal },
];

const COMMON_UNITS = [
  'kg', 'g', 'litre', 'ml', 'piece', 'packet', 'tin', 'bunch', 'bag', 'tray', 'box'
];

function fmtKES(n) {
  return 'KSh ' + (Number(n) || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const EXP_URL = '/api/expenses?from=2000-01-01&to=2100-01-01';
const PURCHASES_URL = '/api/purchases?from=2000-01-01&to=2100-01-01';

// Helper: calculate default purchase unit and price from ingredient catalog
function getIngredientRate(ing) {
  if (!ing) return { unit: 'piece', unitPrice: 0, label: '' };
  const unitCost = Number(ing.unit_cost) || 0;
  if (ing.unit_type === 'weight') {
    const pricePerKg = Math.round(unitCost * 1000 * 100) / 100;
    return {
      unit: 'kg',
      unitPrice: pricePerKg,
      label: `KSh ${pricePerKg.toLocaleString('en-KE', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}/kg`,
    };
  }
  if (ing.unit_type === 'volume') {
    const pricePerLitre = Math.round(unitCost * 1000 * 100) / 100;
    return {
      unit: 'litre',
      unitPrice: pricePerLitre,
      label: `KSh ${pricePerLitre.toLocaleString('en-KE', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}/L`,
    };
  }
  if (ing.unit_type === 'count') {
    return {
      unit: 'piece',
      unitPrice: unitCost,
      label: `KSh ${unitCost.toLocaleString('en-KE', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}/pc`,
    };
  }
  return {
    unit: 'portion',
    unitPrice: unitCost,
    label: `KSh ${unitCost.toLocaleString('en-KE', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}`,
  };
}

// ── Tab 1: Daily Purchases Component ─────────────────────────────
function PurchasesSection() {
  const [purchases, setPurchases]     = useState(() => getCached(PURCHASES_URL) || []);
  const [ingredients, setIngredients] = useState(() => getCached('/api/ingredients') || []);
  const [selectedIngId, setSelectedIngId] = useState('');
  const [loading, setLoading]         = useState(() => !hasCached(PURCHASES_URL));
  const [name, setName]               = useState('');
  const [quantity, setQuantity]       = useState('');
  const [unit, setUnit]               = useState('');
  const [priceMode, setPriceMode]     = useState('unit'); // 'unit' | 'total' (default to unit so rate auto-multiplies with qty!)
  const [priceValue, setPriceValue]   = useState('');
  const [purchaseDate, setDate]       = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes]             = useState('');
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  const numQty = Number(quantity);
  const val = Number(priceValue) || 0;

  // If priceMode is 'total': priceValue is the total paid for the entire quantity.
  // If priceMode is 'unit': priceValue is the unit price (e.g. per kg).
  const totalCost =
    priceMode === 'total'
      ? val
      : numQty > 0
      ? numQty * val
      : val;

  const unitCost =
    priceMode === 'unit'
      ? val
      : numQty > 0
      ? val / numQty
      : val;

  async function load() {
    const [purchasesData, ingredientsData] = await Promise.all([
      fetchArray(PURCHASES_URL),
      fetchArray('/api/ingredients'),
    ]);
    setPurchases(purchasesData);
    setIngredients(ingredientsData);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function handleSelectIngredient(id) {
    setSelectedIngId(id);
    if (!id) return;
    const found = ingredients.find((i) => String(i.id) === String(id));
    if (found) {
      const rate = getIngredientRate(found);
      setName(found.name);
      setUnit(rate.unit);
      setPriceMode('unit');
      setPriceValue(String(rate.unitPrice));
    }
  }

  function handleNameChange(val) {
    setName(val);
    const match = ingredients.find(
      (i) => i.name.toLowerCase().trim() === val.toLowerCase().trim()
    );
    if (match) {
      setSelectedIngId(String(match.id));
      const rate = getIngredientRate(match);
      if (!unit) setUnit(rate.unit);
      if (!priceValue) {
        setPriceMode('unit');
        setPriceValue(String(rate.unitPrice));
      }
    } else {
      setSelectedIngId('');
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Enter an item name (e.g. Unga wa ngano, Oil).'); return; }
    if (!priceValue || Number(priceValue) <= 0) { setError('Enter a valid amount.'); return; }

    setSaving(true);

    const res = await fetch('/api/purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        quantity: numQty > 0 ? numQty : null,
        unit: unit.trim() || null,
        unit_price: unitCost,
        total_cost: totalCost,
        purchase_date: purchaseDate,
        notes: notes.trim() || null,
      }),
    });
    setSaving(false);

    if (!res.ok) {
      const err = await res.json();
      setError(err.error || 'Failed to save purchase');
      return;
    }

    invalidateCache('/api/purchases');
    invalidateCache('/api/reports');
    setName('');
    setSelectedIngId('');
    setQuantity('');
    setUnit('');
    setPriceValue('');
    setNotes('');
    load();
  }

  async function del(id) {
    if (!confirm('Remove this purchase record? Cashflow and spending sheet will update.')) return;
    const res = await fetch(`/api/purchases/${id}`, { method: 'DELETE' });
    if (!res.ok) { const err = await res.json(); alert(err.error); return; }
    invalidateCache('/api/purchases');
    invalidateCache('/api/reports');
    load();
  }

  const safePurchases = Array.isArray(purchases) ? purchases : [];
  const safeIngredients = Array.isArray(ingredients) ? ingredients : [];

  return (
    <div className="space-y-6">
      {/* Form */}
      <form onSubmit={submit} className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-stone-900 text-base flex items-center gap-2">
            <ShoppingBag size={18} className="text-brand-600" />
            Log Daily Purchase
          </h2>
          <span className="text-[11px] text-stone-400 font-semibold bg-stone-100 px-2.5 py-1 rounded-full">
            Market / Ingredients / Supplies
          </span>
        </div>

        {/* Quick Pick from Existing Ingredients */}
        {safeIngredients.length > 0 && (
          <div className="rounded-2xl bg-amber-50/70 border border-amber-200/60 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Sprout size={15} className="text-emerald-600" />
                Quick Pick from Existing Ingredients:
              </label>
              <span className="text-[10px] text-amber-700/80 font-semibold">
                Auto-fills unit & catalog price
              </span>
            </div>
            <select
              className="input bg-white text-xs font-semibold text-stone-800 border-amber-200/80 py-2"
              value={selectedIngId}
              onChange={(e) => handleSelectIngredient(e.target.value)}
            >
              <option value="">-- Choose an ingredient (or type below) --</option>
              {safeIngredients.map((ing) => {
                const rate = getIngredientRate(ing);
                return (
                  <option key={ing.id} value={ing.id}>
                    {ing.name} ({rate.label})
                  </option>
                );
              })}
            </select>
          </div>
        )}

        <div>
          <label className="label">Item Name</label>
          <input
            className="input font-semibold"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            list="existing-ingredients-list"
            placeholder="e.g. Unga wa ngano, Cooking oil, Sugar, Makaa, Onions…"
            autoComplete="off"
            required
          />
          <datalist id="existing-ingredients-list">
            {safeIngredients.map((i) => (
              <option key={i.id} value={i.name}>
                {getIngredientRate(i).label}
              </option>
            ))}
          </datalist>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">
              Quantity <span className="text-stone-400 font-normal">(optional)</span>
            </label>
            <input
              className="input font-bold"
              type="number"
              step="any"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 2, 5, 0.5"
            />
          </div>
          <div>
            <label className="label">
              Unit <span className="text-stone-400 font-normal">(optional)</span>
            </label>
            <input
              className="input"
              list="common-units-list"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g. kg, litre, bunch…"
            />
            <datalist id="common-units-list">
              {COMMON_UNITS.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Price Mode Selector Toggle */}
        <div className="space-y-1.5 pt-1">
          <label className="label">How are you entering the cost?</label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setPriceMode('total')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                priceMode === 'total'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <span>Total Paid</span>
              <span className="text-[10px] text-stone-400 font-normal hidden sm:inline">(e.g. KSh 175 for 2kg)</span>
            </button>
            <button
              type="button"
              onClick={() => setPriceMode('unit')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                priceMode === 'unit'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <span>Price per {unit || 'unit'}</span>
              <span className="text-[10px] text-stone-400 font-normal hidden sm:inline">(e.g. KSh 87.50/kg)</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="label">
              {priceMode === 'total'
                ? `Total Amount Paid (KSh) ${numQty > 0 ? `for ${quantity} ${unit || 'units'}` : ''}`
                : `Price per ${unit || 'Unit'} (KSh)`}
            </label>
            <input
              className="input font-black text-stone-900 text-lg"
              type="number"
              step="any"
              min="0.1"
              value={priceValue}
              onChange={(e) => setPriceValue(e.target.value)}
              placeholder={priceMode === 'total' ? 'e.g. 175' : 'e.g. 87.50'}
              required
            />
          </div>
          <div>
            <label className="label">Date of Purchase</label>
            <input
              className="input"
              type="date"
              value={purchaseDate}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Live Total Calculation Preview */}
        {priceValue && val > 0 && (
          <div className="rounded-2xl bg-orange-50 border border-orange-200/80 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold text-orange-900 flex items-center gap-1.5">
              <Sparkles size={15} className="text-orange-600 shrink-0" />
              {priceMode === 'total' ? (
                numQty > 0 ? (
                  <span>
                    Total: <strong className="text-orange-950">KSh {totalCost.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</strong>
                    <span className="text-orange-800/80 ml-1.5 font-semibold">
                      (= KSh {unitCost.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / {unit || 'unit'})
                    </span>
                  </span>
                ) : (
                  <span>Total to record: <strong>KSh {totalCost.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</strong></span>
                )
              ) : (
                numQty > 0 ? (
                  <span>
                    {quantity} {unit || 'units'} × KSh {val.toLocaleString()} = <strong className="text-orange-950">KSh {totalCost.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</strong>
                  </span>
                ) : (
                  <span>Total to record: <strong>KSh {totalCost.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</strong></span>
                )
              )}
            </span>
            <span className="text-base font-black text-orange-700 self-end sm:self-auto">
              Total: KSh {totalCost.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}

        <div>
          <label className="label">
            Notes / Vendor <span className="text-stone-400 font-normal">(optional)</span>
          </label>
          <input
            className="input text-xs"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. bought from market stall 4, wholeseller"
          />
        </div>

        {error && <p className="text-rose-500 text-xs font-semibold">{error}</p>}

        <button
          type="submit"
          className="btn-primary w-full py-3.5 shadow-lg shadow-brand-500/25 font-bold"
          disabled={saving}
        >
          {saving ? (
            <>
              <InlineSpinner /> Saving Purchase…
            </>
          ) : (
            <>
              <Plus size={16} /> Log Purchase
            </>
          )}
        </button>
      </form>

      {/* Recent Purchases List */}
      <div>
        <h2 className="font-bold text-stone-800 mb-3 flex items-center gap-2 text-sm sm:text-base">
          <ShoppingBag size={17} className="text-brand-600" /> Recent Purchases
        </h2>

        {loading ? (
          <PageSpinner label="Loading purchases…" />
        ) : (
          <div className="space-y-2.5">
            {safePurchases.length === 0 && (
              <div className="card text-center py-8 text-stone-400 text-sm">
                No purchases recorded yet. Log daily items as you buy them from the market!
              </div>
            )}
            {safePurchases.map((p) => (
              <div
                key={p.id}
                className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:border-stone-300"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-stone-900 text-sm sm:text-base">
                      {p.name}
                    </span>
                    {p.quantity != null && (
                      <span className="badge bg-orange-50 text-orange-800 border border-orange-200/60 font-bold text-xs">
                        {p.quantity} {p.unit || 'units'}
                        {p.quantity > 0 && p.unit_price > 0 ? ` @ KSh ${Number(p.unit_price).toLocaleString('en-KE', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}/${p.unit || 'unit'}` : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-400 mt-1">
                    {p.purchase_date}
                    {p.notes ? ` · ${p.notes}` : ''}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                  <span className="text-base font-black text-rose-500">
                    -{fmtKES(p.total_cost)}
                  </span>
                  <button
                    onClick={() => del(p.id)}
                    className="btn-ghost p-2 hover:bg-rose-50 text-stone-400 hover:text-rose-500 rounded-full transition"
                    title="Delete purchase"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab 2: Overheads & Other Expenses Section ────────────────────
function ExpensesSection() {
  const [expenses, setExpenses]   = useState(() => getCached(EXP_URL) || []);
  const [loading, setLoading]     = useState(() => !hasCached(EXP_URL));
  const [category, setCategory]   = useState('rent');
  const [description, setDesc]    = useState('');
  const [amount, setAmount]       = useState('');
  const [expenseDate, setDate]    = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  async function load() {
    const data = await fetchArray(EXP_URL);
    setExpenses(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!amount || Number(amount) <= 0) { setError('Enter an expense amount.'); return; }
    setSaving(true);
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category,
        description,
        amount: Number(amount),
        expense_date: expenseDate,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const e = await res.json();
      setError(e.error || 'Failed to save expense');
      return;
    }
    invalidateCache('/api/expenses');
    invalidateCache('/api/reports');
    setAmount('');
    setDesc('');
    load();
  }

  async function del(id) {
    if (!confirm('Remove this expense entry? Reports and cashflow will update.')) return;
    const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
    if (!res.ok) { const e = await res.json(); alert(e.error); return; }
    invalidateCache('/api/expenses');
    invalidateCache('/api/reports');
    load();
  }

  const safeExpenses = Array.isArray(expenses) ? expenses : [];

  return (
    <div className="space-y-6">
      {/* Form */}
      <form onSubmit={submit} className="card space-y-4">
        <h2 className="font-extrabold text-stone-900 text-base flex items-center gap-2">
          <Receipt size={18} className="text-rose-500" />
          Log Overhead Expense
        </h2>

        {/* Category Selector Pills */}
        <div>
          <label className="label">Category</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {CATEGORIES.map((c) => {
              const Icon = c.Icon;
              const isSelected = category === c.value;
              return (
                <button
                  type="button"
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition active:scale-95 ${
                    isSelected
                      ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                      : 'bg-stone-50 hover:bg-stone-100 text-stone-600 border-stone-200/60'
                  }`}
                >
                  <Icon size={18} className="mb-1" />
                  <span className="truncate">{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="label">Description / Vendor (Optional)</label>
          <input
            className="input"
            value={description}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="e.g. shop rent for the month, water bill, casual labour wages"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="label">Amount Paid (KSh)</label>
            <input
              className="input font-black text-stone-900"
              type="number"
              step="any"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 1500"
              required
            />
          </div>
          <div>
            <label className="label">Date of Payment</label>
            <input
              className="input"
              type="date"
              value={expenseDate}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
        </div>

        {error && <p className="text-rose-500 text-xs font-semibold">{error}</p>}

        <button
          type="submit"
          className="btn-primary w-full py-3.5 shadow-lg shadow-brand-500/25 font-bold"
          disabled={saving}
        >
          {saving ? (
            <>
              <InlineSpinner /> Saving Expense…
            </>
          ) : (
            <>
              <Receipt size={16} /> Log Overhead
            </>
          )}
        </button>
      </form>

      {/* Recent Expenses List */}
      <div>
        <h2 className="font-bold text-stone-800 mb-3 flex items-center gap-2 text-sm sm:text-base">
          <Receipt size={17} className="text-rose-500" /> Recent Overhead Records
        </h2>
        {loading ? (
          <PageSpinner label="Loading expenses…" />
        ) : (
          <div className="space-y-2.5">
            {safeExpenses.length === 0 && (
              <div className="card text-center py-8 text-stone-400 text-sm">
                No overhead expenses recorded yet.
              </div>
            )}
            {safeExpenses.map((e) => (
              <div
                key={e.id}
                className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:border-stone-300"
              >
                <div className="min-w-0">
                  <span className="badge bg-stone-100 text-stone-800 capitalize font-bold">
                    {e.category}
                  </span>
                  <p className="text-xs text-stone-400 mt-1">
                    {e.expense_date}{e.description ? ` · ${e.description}` : ''}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                  <span className="text-base font-black text-rose-500">
                    -{fmtKES(e.amount)}
                  </span>
                  <button
                    onClick={() => del(e.id)}
                    className="btn-ghost p-2 hover:bg-rose-50 text-stone-400 hover:text-rose-500 rounded-full transition"
                    title="Delete expense"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page with Tab Switcher ──────────────────────────────────
export default function ExpensesPage() {
  const [activeTab, setActiveTab] = useState('purchases');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-1 border-b border-stone-200/50">
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
          Expenses & Purchases
        </h1>
        <p className="text-stone-400 text-xs sm:text-sm mt-0.5">
          Record daily market ingredients and business overheads. All items feed your cashflow and Daily Spending Sheet.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-stone-100 rounded-2xl w-full sm:w-fit gap-1">
        <button
          onClick={() => setActiveTab('purchases')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'purchases'
              ? 'bg-white text-stone-900 shadow-sm'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <ShoppingBag size={16} className={activeTab === 'purchases' ? 'text-brand-600' : 'text-stone-400'} />
          <span>Purchases (Daily Market)</span>
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'expenses'
              ? 'bg-white text-stone-900 shadow-sm'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <Receipt size={16} className={activeTab === 'expenses' ? 'text-rose-500' : 'text-stone-400'} />
          <span>Other Expenses (Overheads)</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'purchases' ? <PurchasesSection /> : <ExpensesSection />}
    </div>
  );
}
