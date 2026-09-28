'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Receipt,
  Trash2,
  Building2,
  Users,
  Car,
  Zap,
  MoreHorizontal,
  Sprout,
  Plus,
} from 'lucide-react';
import { PageSpinner, InlineSpinner } from '@/components/Spinner';
import { fetchArray, getCached, hasCached, invalidateCache } from '@/lib/fetchHelpers';

const CATEGORIES = [
  { value: 'rent',      label: 'Rent',                Icon: Building2 },
  { value: 'wages',     label: 'Wages / Labour',      Icon: Users     },
  { value: 'transport', label: 'Transport',           Icon: Car       },
  { value: 'utilities', label: 'Power / Water',       Icon: Zap       },
  { value: 'other',     label: 'Other Overhead',      Icon: MoreHorizontal },
];

function fmtKES(n) {
  return 'KSh ' + (Number(n) || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const EXP_URL = '/api/expenses?from=2000-01-01&to=2100-01-01';

export default function ExpensesPage() {
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
    if (!amount) { setError('Enter an expense amount.'); return; }
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

  if (loading) return <PageSpinner label="Loading expenses log…" />;

  const safeExpenses = Array.isArray(expenses) ? expenses : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-1 border-b border-stone-200/50">
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
          Expenses Log
        </h1>
        <p className="text-stone-400 text-xs sm:text-sm mt-0.5">
          Record rent, wages, transport, utilities and shop overheads. (Ingredient purchases are auto-logged from Ingredients).
        </p>
      </div>

      {/* Form */}
      <form onSubmit={submit} className="card space-y-4">
        <h2 className="font-extrabold text-stone-900 text-base">Log New Expense</h2>

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

        <button className="btn-primary w-full py-3.5 shadow-lg shadow-brand-500/25 font-bold" disabled={saving}>
          {saving ? <><InlineSpinner /> Saving Expense…</> : <><Receipt size={16} /> Log Expense</>}
        </button>
      </form>

      {/* Recent Expenses List */}
      <div>
        <h2 className="font-bold text-stone-800 mb-3 flex items-center gap-2 text-sm sm:text-base">
          <Receipt size={17} className="text-rose-500" /> Recent Expense Records
        </h2>
        <div className="space-y-2.5">
          {safeExpenses.length === 0 && (
            <div className="card text-center py-8 text-stone-400 text-sm">
              No expenses recorded yet.
            </div>
          )}
          {safeExpenses.map((e) => (
            <div
              key={e.id}
              className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:border-stone-300"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="badge bg-stone-100 text-stone-800 capitalize font-bold">
                    {e.category}
                  </span>
                  {e.category === 'ingredient' && (
                    <span className="badge bg-amber-50 text-amber-700 text-[10px]">
                      Restock auto-log
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-400 mt-1">
                  {e.expense_date}{e.description ? ` · ${e.description}` : ''}
                </p>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                <span className="text-base font-black text-rose-500">
                  -{fmtKES(e.amount)}
                </span>
                {e.category !== 'ingredient' ? (
                  <button
                    onClick={() => del(e.id)}
                    className="btn-ghost p-2 hover:bg-rose-50 text-stone-400 hover:text-rose-500 rounded-full transition"
                    title="Delete expense"
                  >
                    <Trash2 size={16} />
                  </button>
                ) : (
                  <Link
                    href="/ingredients"
                    className="btn-ghost p-2 text-stone-400 hover:text-brand-600 rounded-full"
                    title="View in Ingredients"
                  >
                    <Sprout size={16} />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
