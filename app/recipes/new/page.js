'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import RecipeForm from '@/components/RecipeForm';
import { ArrowLeft } from 'lucide-react';
import { invalidateCache } from '@/lib/fetchHelpers';

export default function NewRecipePage() {
  const router = useRouter();

  async function handleSubmit(payload) {
    const res = await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create dish');
    }
    invalidateCache('/api/recipes');
    invalidateCache('/api/reports');
    const created = await res.json();
    router.push(`/recipes/${created.id}`);
  }

  return (
    <div className="space-y-6">
      <div className="pb-1 border-b border-stone-200/50">
        <Link
          href="/recipes"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-400 hover:text-stone-700 mb-1.5 transition"
        >
          <ArrowLeft size={13} /> Back to Dishes
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
          Add New Dish
        </h1>
        <p className="text-stone-400 text-xs sm:text-sm mt-0.5">
          Define batch yield and ingredients to calculate automatic food costing and margins.
        </p>
      </div>
      <RecipeForm onSubmit={handleSubmit} submitLabel="Save Dish & Calculate Margins" />
    </div>
  );
}
