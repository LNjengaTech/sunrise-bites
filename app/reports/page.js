'use client';
import { useEffect, useState } from 'react';
import { BarChart3, AlertTriangle, Calendar, TrendingUp, TrendingDown, DollarSign, PieChart, Sparkles } from 'lucide-react';
import { PageSpinner } from '@/components/Spinner';
import { fetchOne, getCached, hasCached } from '@/lib/fetchHelpers';

function fmtKES(n) {
  return 'KSh ' + (Number(n) || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

const PRESETS = [
  { label: 'Today', days: 0 },
  { label: 'Last 7 Days', days: 6 },
  { label: 'Last 30 Days', days: 29 },
];

export default function ReportsPage() {
  const [from, setFrom]       = useState(fmtDate(new Date()));
  const [to, setTo]           = useState(fmtDate(new Date()));
  const [activePreset, setActivePreset] = useState('Today');
  const reportUrl = `/api/reports/summary?from=${from}&to=${to}`;
  const [data, setData]       = useState(() => getCached(reportUrl));
  const [loading, setLoading] = useState(() => !hasCached(reportUrl));

  function applyPreset(label, days) {
    setActivePreset(label);
    const end = new Date(), start = new Date();
    start.setDate(start.getDate() - days);
    setFrom(fmtDate(start));
    setTo(fmtDate(end));
  }

  useEffect(() => {
    const cached = getCached(reportUrl);
    if (!cached) {
      setLoading(true);
      setData(null);
    } else {
      setData(cached);
      setLoading(false);
    }
    fetchOne(reportUrl).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [reportUrl]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-stone-200/50">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              Reports & Analytics
            </h1>
            <span className="badge bg-blue-50 text-blue-700 border border-blue-200/60 font-bold">
              Business Health
            </span>
          </div>
          <p className="text-stone-400 text-xs sm:text-sm mt-0.5">
            Cashflow tracking, actual gross profitability, and unsold food costs.
          </p>
        </div>
      </div>

      {/* Date Presets and Pickers */}
      <div className="card space-y-3.5 p-4 sm:p-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
            <Calendar size={14} /> Filter Time Period
          </span>
          <div className="flex gap-1.5 flex-wrap">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                  activePreset === p.label
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'bg-stone-100 hover:bg-stone-200/80 text-stone-700'
                }`}
                onClick={() => applyPreset(p.label, p.days)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="label">From Date</label>
            <input
              className="input bg-stone-50"
              type="date"
              value={from}
              onChange={(e) => {
                setActivePreset('Custom');
                setFrom(e.target.value);
              }}
            />
          </div>
          <div>
            <label className="label">To Date</label>
            <input
              className="input bg-stone-50"
              type="date"
              value={to}
              onChange={(e) => {
                setActivePreset('Custom');
                setTo(e.target.value);
              }}
            />
          </div>
        </div>
      </div>

      {loading || !data ? (
        <PageSpinner label="Computing sales, costs, and profit reports…" />
      ) : (
        <>
          {/* Section 1: Cashflow */}
          <div className="space-y-3">
            <div>
              <h2 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
                <DollarSign size={18} className="text-emerald-600" />
                Actual Cashflow (Money In vs Money Out)
              </h2>
              <p className="text-xs text-stone-400">
                Direct transactions during this date range (includes ingredient purchases as cash outflow).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatCard
                label="Total Revenue"
                value={fmtKES(data.cashflow?.totalRevenue)}
                tone="text-emerald-600"
                subtitle="All logged sales"
              />
              <StatCard
                label="Total Cash Out"
                value={fmtKES(data.cashflow?.totalExpenses)}
                tone="text-rose-500"
                subtitle="Expenses + Restocks"
              />
              <StatCard
                label="Net Cash Balance"
                value={fmtKES(data.cashflow?.netCashflow)}
                tone={(data.cashflow?.netCashflow || 0) >= 0 ? 'text-emerald-600' : 'text-rose-500'}
                subtitle="Net money remaining"
              />
            </div>
          </div>

          {/* Section 2: Profitability Breakdown */}
          <div className="space-y-3">
            <div>
              <h2 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
                <TrendingUp size={18} className="text-brand-600" />
                True Economic Profitability
              </h2>
              <p className="text-xs text-stone-400">
                Revenue minus recipe food cost × units sold minus overheads. Accounts for unsold cooked batches.
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard
                label="Revenue"
                value={fmtKES(data.cashflow.totalRevenue)}
                tone="text-stone-900"
              />
              <StatCard
                label="Food Cost (Sold)"
                value={fmtKES(data.profitability.totalEffectiveDirectCost)}
                tone="text-stone-700"
              />
              <StatCard
                label="Overheads / Bills"
                value={fmtKES(data.profitability.otherExpenses)}
                tone="text-stone-700"
              />
              <StatCard
                label="Est. Net Profit"
                value={fmtKES(data.profitability.estimatedNetProfit)}
                tone={data.profitability.estimatedNetProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}
                highlight
              />
            </div>
          </div>

          {/* Unsold food cost notification */}
          {data.profitability.totalUnsoldCost > 0 && (
            <div className="rounded-3xl bg-amber-50 border border-amber-200/60 p-4 sm:p-5 flex gap-3.5 items-start">
              <AlertTriangle size={22} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-amber-900 text-sm">
                  Unsold Cooked Food: ~{fmtKES(data.profitability.totalUnsoldCost)}
                </p>
                <p className="text-amber-800/90 text-xs mt-1 leading-relaxed">
                  Based on production batches cooked versus sales logged, this value in ingredients went unsold during this timeframe. This cost is already factored into your estimated net profit above.
                </p>
              </div>
            </div>
          )}

          {/* Section 3: Expenses Breakdown with Visual Progress Bars */}
          {(Array.isArray(data.cashflow?.expensesByCategory) ? data.cashflow.expensesByCategory : []).length > 0 && (
            <div className="card space-y-4">
              <div className="flex items-center gap-2">
                <PieChart size={18} className="text-brand-600" />
                <h3 className="font-extrabold text-stone-900 text-base">Expenses by Category</h3>
              </div>

              <div className="space-y-3">
                {(() => {
                  const items = data.cashflow.expensesByCategory;
                  const total = items.reduce((acc, cur) => acc + Number(cur.total || 0), 0);
                  return items.map((e) => {
                    const pct = total > 0 ? (Number(e.total) / total) * 100 : 0;
                    return (
                      <div key={e.category} className="space-y-1">
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="capitalize font-bold text-stone-700">{e.category}</span>
                          <span className="font-black text-stone-900">
                            {fmtKES(e.total)} <span className="text-xs font-normal text-stone-400">({pct.toFixed(0)}%)</span>
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                          <div
                            className="h-full bg-brand-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(4, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* Section 4: Dish Performance Table */}
          <div className="card space-y-3">
            <h3 className="font-extrabold text-stone-900 text-base">Individual Dish Performance</h3>
            <div className="overflow-x-auto">
              {(Array.isArray(data.profitability?.dishReport) ? data.profitability.dishReport : []).length === 0 ? (
                <p className="text-stone-400 text-sm py-4">No dish sales recorded in this period.</p>
              ) : (
                <table className="w-full text-sm min-w-[540px]">
                  <thead>
                    <tr className="text-left text-stone-400 text-xs border-b border-stone-100">
                      <th className="pb-2.5 font-bold uppercase tracking-wider">Dish</th>
                      <th className="pb-2.5 font-bold uppercase tracking-wider">Cooked</th>
                      <th className="pb-2.5 font-bold uppercase tracking-wider">Sold</th>
                      <th className="pb-2.5 font-bold uppercase tracking-wider">Unsold</th>
                      <th className="pb-2.5 font-bold uppercase tracking-wider">Revenue</th>
                      <th className="pb-2.5 font-bold uppercase tracking-wider">Gross Profit</th>
                      <th className="pb-2.5 font-bold uppercase tracking-wider text-right">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {(data.profitability.dishReport).map((d) => (
                      <tr key={d.recipeId} className="hover:bg-stone-50/50 transition">
                        <td className="py-3 font-bold text-stone-900">{d.name}</td>
                        <td className="py-3 text-stone-500 font-medium">
                          {d.hasBatchData ? d.unitsProduced : '—'}
                        </td>
                        <td className="py-3 font-semibold text-stone-800">{d.unitsSold}</td>
                        <td className={`py-3 font-bold ${d.unsoldQty > 0 ? 'text-amber-600' : 'text-stone-300'}`}>
                          {d.hasBatchData ? (d.unsoldQty > 0 ? d.unsoldQty : '0') : '—'}
                        </td>
                        <td className="py-3 font-black text-stone-900">{fmtKES(d.revenue)}</td>
                        <td className={`py-3 font-black ${d.grossProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {fmtKES(d.grossProfit)}
                        </td>
                        <td className="py-3 text-right">
                          {d.revenue > 0 ? (
                            <span
                              className={`badge font-bold ${
                                d.marginPercent >= 40
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                  : d.marginPercent >= 15
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                                  : 'bg-rose-50 text-rose-600 border border-rose-200/60'
                              }`}
                            >
                              {d.marginPercent.toFixed(0)}%
                            </span>
                          ) : (
                            <span className="text-stone-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Guide Legend */}
          <div className="rounded-2xl bg-stone-100/90 border border-stone-200/60 p-4 text-xs text-stone-500 space-y-1">
            <p className="font-bold text-stone-700 mb-1 flex items-center gap-1.5">
              <Sparkles size={14} className="text-brand-600" /> Metric Definitions
            </p>
            <p><strong className="text-stone-700">Cashflow:</strong> Literal money that went in and out of your drawer during the selected dates.</p>
            <p><strong className="text-stone-700">Profitability:</strong> Revenue minus direct recipe ingredient costs of units sold minus overhead expenses.</p>
            <p><strong className="text-stone-700">Cooked / Unsold:</strong> Derived from the Production Log. Helps identify daily food waste.</p>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, tone = 'text-stone-800', subtitle, highlight = false }) {
  return (
    <div className={`card p-4 sm:p-5 flex flex-col justify-between ${highlight ? 'bg-gradient-to-br from-white via-white to-brand-50/30 border-brand-200/70' : ''}`}>
      <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-stone-400">
        {label}
      </span>
      <p className={`text-xl sm:text-2xl font-black tracking-tight mt-1 ${tone}`}>
        {value}
      </p>
      {subtitle && (
        <span className="text-[10px] text-stone-400 font-medium mt-1">
          {subtitle}
        </span>
      )}
    </div>
  );
}
