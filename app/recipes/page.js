'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, BookOpen, TrendingUp, Search, Sparkles } from 'lucide-react';
import { PageSpinner } from '@/components/Spinner';
import { fetchArray, getCached, hasCached } from '@/lib/fetchHelpers';

function fmtKES(n) {
  return 'KSh ' + (Number(n) || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState(() => getCached('/api/recipes') || []);
  const [loading, setLoading] = useState(() => !hasCached('/api/recipes'));
  const [search, setSearch]   = useState('');
  const [selectedCat, setCat] = useState('All');

  useEffect(() => {
    fetchArray('/api/recipes').then((data) => {
      setRecipes(data);
      setLoading(false);
    });
  }, []);

  const safeRecipes = Array.isArray(recipes) ? recipes : [];

  const categories = useMemo(() => {
    const set = new Set(['All']);
    safeRecipes.forEach((r) => {
      if (r.category && r.category.trim()) set.add(r.category.trim());
    });
    return Array.from(set);
  }, [safeRecipes]);

  const filtered = useMemo(() => {
    return safeRecipes.filter((r) => {
      const matchSearch = r.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCat === 'All' || r.category === selectedCat;
      return matchSearch && matchCat;
    });
  }, [safeRecipes, search, selectedCat]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-stone-200/50">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            Menu Dishes & Recipes
          </h1>
          <p className="text-stone-400 text-xs sm:text-sm mt-0.5">
            Unit costs and gross profit margins auto-calculate from ingredient prices.
          </p>
        </div>
        <Link href="/recipes/new" className="btn-primary self-start sm:self-auto shadow-md shadow-brand-500/20">
          <Plus size={16} /> Add New Dish
        </Link>
      </div>

      {/* Search and Category Filter */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            className="input pl-10 pr-4 py-2.5 bg-white border border-stone-200/70"
            placeholder="Search dish by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {categories.length > 2 && (
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition ${
                  selectedCat === c
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/60'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <PageSpinner label="Loading dishes and costings…" />
      ) : safeRecipes.length === 0 ? (
        <div className="card text-center py-12 space-y-4">
          <BookOpen size={42} className="mx-auto text-brand-500" />
          <div>
            <p className="font-extrabold text-stone-800 text-lg">No dishes set up yet</p>
            <p className="text-xs text-stone-400 max-w-sm mx-auto mt-1">
              Add your recipes with batch yields and ingredient quantities to track exact costs.
            </p>
          </div>
          <Link href="/recipes/new" className="btn-primary text-xs inline-flex">
            <Plus size={15} /> Add First Dish
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filtered.map((r) => {
            const margin = Number(r.marginPercent) || 0;
            const marginColor =
              margin >= 40
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                : margin >= 15
                ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                : 'bg-rose-50 text-rose-600 border border-rose-200/60';

            return (
              <Link
                key={r.id}
                href={`/recipes/${r.id}`}
                className="card block hover:shadow-card-hover hover:border-brand-200 transition-all group"
              >
                <div className="flex justify-between items-start gap-2 mb-3">
                  <div>
                    <p className="font-black text-stone-900 text-lg group-hover:text-brand-600 transition leading-tight">
                      {r.name}
                    </p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {r.category || 'Standard'} · Batch yields {r.yield_qty} {r.yield_unit || 'piece'}s
                    </p>
                  </div>
                  <span className={`badge ${marginColor} font-bold text-xs`}>
                    <TrendingUp size={12} className="mr-1 inline" />
                    {margin.toFixed(0)}%
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-2xl bg-stone-50 border border-stone-100 p-2.5">
                    <span className="text-stone-400 uppercase font-bold text-[10px] block">Price</span>
                    <span className="font-extrabold text-stone-800 text-sm mt-0.5 block">
                      {fmtKES(r.selling_price)}
                    </span>
                  </div>
                  <div className="rounded-2xl bg-stone-50 border border-stone-100 p-2.5">
                    <span className="text-stone-400 uppercase font-bold text-[10px] block">Cost/Unit</span>
                    <span className="font-extrabold text-stone-800 text-sm mt-0.5 block">
                      {fmtKES(r.costPerUnit)}
                    </span>
                  </div>
                  <div className="rounded-2xl bg-stone-50 border border-stone-100 p-2.5">
                    <span className="text-stone-400 uppercase font-bold text-[10px] block">Profit/Unit</span>
                    <span className={`font-extrabold text-sm mt-0.5 block ${Number(r.profitPerUnit) >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {fmtKES(r.profitPerUnit)}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
