import { NextResponse } from 'next/server';
import { dbGet, dbRun, computeRecipeCost } from '@/lib/db';

export async function GET(req, { params }) {
  try {
    const recipe = await dbGet('SELECT * FROM recipes WHERE id = ?', [params.id]);
    if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const cost = await computeRecipeCost(params.id);
    return NextResponse.json(cost);
  } catch (err) {
    console.error('Error in GET /api/recipes/[id]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const body = await req.json();
    const { name, category, yield_qty, yield_unit, selling_price, ingredients } = body;

    const existing = await dbGet('SELECT * FROM recipes WHERE id = ?', [params.id]);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await dbRun(
      `UPDATE recipes SET name = ?, category = ?, yield_qty = ?, yield_unit = ?, selling_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [name.trim(), category || null, Number(yield_qty), yield_unit || 'piece', Number(selling_price), params.id]
    );

    await dbRun('DELETE FROM recipe_ingredients WHERE recipe_id = ?', [params.id]);

    if (Array.isArray(ingredients)) {
      for (const ing of ingredients) {
        if (ing.ingredient_id && Number(ing.quantity) > 0) {
          await dbRun(
            `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, cost_mode) VALUES (?, ?, ?, ?)`,
            [params.id, Number(ing.ingredient_id), Number(ing.quantity), ing.cost_mode || 'direct']
          );
        }
      }
    }

    const cost = await computeRecipeCost(params.id);
    return NextResponse.json(cost);
  } catch (err) {
    console.error('Error in PUT /api/recipes/[id]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await dbRun('DELETE FROM recipes WHERE id = ?', [params.id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error in DELETE /api/recipes/[id]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
