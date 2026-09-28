'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ReceiptText,
  Store,
  ChefHat,
  Receipt,
  BarChart3,
  Sprout,
  BookOpen,
  RotateCw,
  Sparkles,
  Download,
  Flame,
  Calendar,
} from 'lucide-react';
import { PageSpinner } from '@/components/Spinner';
import { fetchOne, getCached, hasCached, invalidateCache } from '@/lib/fetchHelpers';
import { usePWA } from '@/components/PWAContext';

function fmtKES(n) {
  return 'KSh ' + (Number(n) || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Dashboard() {
  const today = new Date().toISOString().slice(0, 10);
  const summaryUrl = `/api/reports/summary?from=${today}&to=${today}`;

  const [data, setData]       = useState(() => getCached(summaryUrl));
  const [loading, setLoading] = useState(() => !hasCached(summaryUrl));
  const [refreshing, setRefreshing] = useState(false);
  const { isInstallable, isInstalled, promptInstall } = usePWA();

  const loadData = async (force = false) => {
    if (force) {
      setRefreshing(true);
      invalidateCache(summaryUrl);
    }
    const d = await fetchOne(summaryUrl);
    setData(d);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, [summaryUrl]);

  if (loading) return <PageSpinner label="Loading today's snapshot…" />;
  if (!data) return (
    <div className="card text-center py-12 space-y-4">
      <p className="text-stone-500 font-medium">Could not load dashboard data.</p>
      <button onClick={() => loadData(true)} className="btn-primary">
        <RotateCw size={15} /> Retry
      </button>
    </div>
  );

  const cashflow = data.cashflow || { totalRevenue: 0, totalExpenses: 0, netCashflow: 0 };
  const profitability = data.profitability || { estimatedNetProfit: 0, dishReport: [] };
  const dishes = Array.isArray(profitability.dishReport) ? profitability.dishReport : [];
  const topDish = [...dishes].sort((a, b) => (Number(b.unitsSold) || 0) - (Number(a.unitsSold) || 0))[0];
  const netUp = (Number(cashflow.netCashflow) || 0) >= 0;
  const profitUp = (Number(profitability.estimatedNetProfit) || 0) >= 0;
  const hasActivity = (Number(cashflow.totalRevenue) || 0) > 0 || (Number(cashflow.totalExpenses) || 0) > 0;

  return (
    <div className="space-y-6">
      {/* Header with Date & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-stone-200/50">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              Today's Snapshot
            </h1>
            <span className="badge bg-brand-50 text-brand-700 border border-brand-200/60 font-bold">
              Live
            </span>
          </div>
          <p className="text-stone-400 text-xs sm:text-sm mt-1 flex items-center gap-1.5">
            <Calendar size={13} className="text-stone-400" />
            <span>{new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="btn-secondary text-xs py-2 px-3.5 gap-1.5 hover:border-stone-300"
            title="Refresh dashboard numbers"
          >
            <RotateCw size={13} className={refreshing ? 'animate-spin text-brand-600' : 'text-stone-500'} />
            <span>{refreshing ? 'Updating…' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* PWA Install Banner (Shown if installable and not yet installed) */}
      {isInstallable && !isInstalled && (
        <div className="card bg-gradient-to-r from-orange-500 via-brand-600 to-amber-600 text-white p-5 rounded-3xl shadow-xl shadow-brand-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src="/icons/icon-192x192.png"
              alt="Sunrise Bites"
              className="w-12 h-12 rounded-2xl bg-white p-1 shadow-md shrink-0 object-cover"
            />
            <div>
              <p className="font-extrabold text-base sm:text-lg flex items-center gap-1.5 leading-tight">
                Install Sunrise Bites App <Sparkles size={16} className="text-amber-300 fill-amber-300" />
              </p>
              <p className="text-white/80 text-xs sm:text-sm mt-0.5">
                Instant order entry, works offline, and sits right on your home screen.
              </p>
            </div>
          </div>
          <button
            onClick={promptInstall}
            className="bg-white hover:bg-stone-50 text-brand-700 font-extrabold text-xs sm:text-sm px-5 py-2.5 rounded-full shadow-md active:scale-95 transition flex items-center justify-center gap-2 shrink-0"
          >
            <Download size={15} /> Install Now
          </button>
        </div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Today's Revenue"
          value={fmtKES(cashflow.totalRevenue)}
          tone="text-emerald-600"
          Icon={Wallet}
          iconBg="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Today's Expenses"
          value={fmtKES(cashflow.totalExpenses)}
          tone="text-rose-500"
          Icon={ReceiptText}
          iconBg="bg-rose-50 text-rose-500"
        />
        <StatCard
          label="Net Cashflow"
          value={fmtKES(cashflow.netCashflow)}
          tone={netUp ? 'text-emerald-600' : 'text-rose-500'}
          Icon={netUp ? TrendingUp : TrendingDown}
          iconBg={netUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}
          subtitle="Money in vs money out"
        />
        <StatCard
          label="Est. Net Profit"
          value={fmtKES(profitability.estimatedNetProfit)}
          tone={profitUp ? 'text-emerald-600' : 'text-rose-500'}
          Icon={profitUp ? TrendingUp : TrendingDown}
          iconBg={profitUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}
          subtitle="Recipe cost & overheads"
        />
      </div>

      {/* Best Seller Highlight */}
      {topDish && topDish.unitsSold > 0 && (
        <div className="card bg-gradient-to-br from-white via-white to-amber-50/40 border-amber-200/50">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600 mb-2">
            <Flame size={14} className="fill-amber-500 text-amber-500" />
            <span>Best Seller Today</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-extrabold text-stone-900 text-xl tracking-tight">{topDish.name}</p>
              <p className="text-sm text-stone-500 mt-0.5">
                <span className="font-semibold text-stone-800">{topDish.unitsSold}</span> units sold · <span className="font-semibold text-stone-800">{fmtKES(topDish.revenue)}</span>
                {topDish.hasBatchData && topDish.unsoldQty > 0 && (
                  <span className="text-amber-600 font-semibold ml-2">· {topDish.unsoldQty} unsold from batch</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge bg-emerald-100/80 text-emerald-800 px-3 py-1 font-bold text-xs">
                {topDish.marginPercent?.toFixed(0)}% gross margin
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions Grid */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/counter"
            className="btn-primary py-4 px-3 flex-col gap-2 h-auto text-center rounded-2xl shadow-lg shadow-brand-500/20 group"
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Store size={22} className="text-white" />
            </div>
            <span className="font-bold text-sm">Open Counter</span>
          </Link>

          <Link
            href="/batches"
            className="btn-secondary py-4 px-3 flex-col gap-2 h-auto text-center rounded-2xl group hover:border-amber-300"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ChefHat size={22} />
            </div>
            <span className="font-bold text-sm text-stone-800">Log Production</span>
          </Link>

          <Link
            href="/expenses"
            className="btn-secondary py-4 px-3 flex-col gap-2 h-auto text-center rounded-2xl group hover:border-rose-200"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Receipt size={22} />
            </div>
            <span className="font-bold text-sm text-stone-800">Log Expense</span>
          </Link>

          <Link
            href="/reports"
            className="btn-secondary py-4 px-3 flex-col gap-2 h-auto text-center rounded-2xl group hover:border-blue-200"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <BarChart3 size={22} />
            </div>
            <span className="font-bold text-sm text-stone-800">Reports</span>
          </Link>
        </div>
      </div>

      {/* Empty State */}
      {!hasActivity && (
        <div className="card text-center space-y-4 py-8 bg-white/80">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Store size={24} />
          </div>
          <div>
            <p className="text-stone-800 font-bold text-base">No activity logged today yet</p>
            <p className="text-xs sm:text-sm text-stone-400 max-w-md mx-auto mt-1">
              Start by setting up your ingredients and dishes, then tap Open Counter during rush hours to log sales.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <Link href="/ingredients" className="btn-secondary text-xs">
              <Sprout size={14} className="text-emerald-600" /> Set up ingredients
            </Link>
            <Link href="/recipes" className="btn-secondary text-xs">
              <BookOpen size={14} className="text-brand-600" /> Set up dishes
            </Link>
            <Link href="/counter" className="btn-primary text-xs">
              <Store size={14} /> Start selling
            </Link>
          </div>
        </div>
      )}

      {/* Cashflow vs Profit Guide Note */}
      <div className="rounded-2xl bg-stone-100/90 border border-stone-200/60 p-4 text-xs text-stone-500 space-y-1.5">
        <p className="flex items-center gap-1.5 font-bold text-stone-700">
          <Sparkles size={14} className="text-brand-600" /> Understanding Your Numbers
        </p>
        <p>
          <strong className="text-stone-700">Cashflow:</strong> Literal money that entered or left your till today (includes stock restocks).
        </p>
        <p>
          <strong className="text-stone-700">Estimated Net Profit:</strong> Revenue minus direct recipe ingredient costs of items sold minus overheads — your real business margin.
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone, Icon, iconBg, subtitle }) {
  return (
    <div className="card flex flex-col justify-between gap-3 p-4 sm:p-5 hover:shadow-card-hover">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
          {label}
        </span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon size={18} strokeWidth={2.2} />
        </div>
      </div>
      <div>
        <p className={`text-xl sm:text-2xl font-black tracking-tight ${tone}`}>
          {value}
        </p>
        {subtitle && (
          <p className="text-[10px] text-stone-400 font-medium mt-1 truncate">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
