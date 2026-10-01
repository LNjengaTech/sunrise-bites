import { NextResponse } from 'next/server';
import { dbGet, dbRun, toBaseUnit } from '@/lib/db';

export async function POST(req, { params }) {
  try {
    const body = await req.json();
    const { purchase_unit, purchase_qty, purchase_cost, expense_date } = body;

    const ingredient = await dbGet('SELECT * FROM ingredients WHERE id = ?', [params.id]);
    if (!ingredient) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (purchase_qty == null || purchase_cost == null) {
      return NextResponse.json({ error: 'Missing quantity or cost' }, { status: 400 });
    }

    const baseQty = toBaseUnit(ingredient.unit_type, purchase_unit, Number(purchase_qty));
    const unitCost = baseQty > 0 ? Number(purchase_cost) / baseQty : 0;
    const date = expense_date || new Date().toISOString().slice(0, 10);

    await dbRun(
      `UPDATE ingredients SET purchase_qty = ?, purchase_cost = ?, unit_cost = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [baseQty, Number(purchase_cost), unitCost, params.id]
    );

    await dbRun(
      `INSERT INTO ingredient_price_history (ingredient_id, purchase_qty, purchase_cost, unit_cost) VALUES (?, ?, ?, ?)`,
      [params.id, baseQty, Number(purchase_cost), unitCost]
    );

    const updated = await dbGet('SELECT * FROM ingredients WHERE id = ?', [params.id]);
    return NextResponse.json(updated);
  } catch (err) {
    console.error('Error in POST /api/ingredients/[id]/purchase:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
