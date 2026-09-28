import { NextResponse } from 'next/server';
import { dbQuery, dbGet, dbRun, computeRecipeCost } from '@/lib/db';

export async function GET() {
  try {
    const recipes = (await dbQuery('SELECT * FROM recipes ORDER BY name ASC')) || [];
    const withCost = await Promise.all(
      recipes.map(async (r) => {
        const c = await computeRecipeCost(r.id);
        return {
          ...r,
          costPerUnit: c ? c.costPerUnit : 0,
          profitPerUnit: c ? c.profitPerUnit : 0,
          marginPercent: c ? c.marginPercent : 0,
          directCostPerBatch: c ? c.directCostPerBatch : 0,
          ingredientCount: c ? c.directLines.length + c.sharedLines.length : 0,
        };
      })
    );
    return NextResponse.json(withCost);
  } catch (err) {
    console.error('Error in GET /api/recipes:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, category, yield_qty, yield_unit, selling_price, ingredients } = body;

    if (!name || !yield_qty || selling_price == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const res = await dbRun(
      `INSERT INTO recipes (name, category, yield_qty, yield_unit, selling_price) VALUES (?, ?, ?, ?, ?)`,
      [name.trim(), category || null, Number(yield_qty), yield_unit || 'piece', Number(selling_price)]
    );

    const recipeId = res.lastInsertRowid;
    if (Array.isArray(ingredients)) {
      for (const ing of ingredients) {
        if (ing.ingredient_id && Number(ing.quantity) > 0) {
          await dbRun(
            `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, cost_mode) VALUES (?, ?, ?, ?)`,
            [recipeId, Number(ing.ingredient_id), Number(ing.quantity), ing.cost_mode || 'direct']
          );
        }
      }
    }

    const recipe = await dbGet('SELECT * FROM recipes WHERE id = ?', [recipeId]);
    return NextResponse.json(recipe, { status: 201 });
  } catch (err) {
    console.error('Error in POST /api/recipes:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
