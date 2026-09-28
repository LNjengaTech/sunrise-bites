import { NextResponse } from 'next/server';
import { dbQuery, dbGet, dbRun, toBaseUnit } from '@/lib/db';

export async function GET() {
  try {
    const rows = (await dbQuery('SELECT * FROM ingredients ORDER BY is_shared ASC, name ASC')) || [];
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Error in GET /api/ingredients:', err);
    return NextResponse.json(
      {
        error: err.message,
        cause: String(err?.sourceError?.cause ?? err?.cause ?? 'none'),
        details: err?.sourceError ? String(err.sourceError) : undefined,
      },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, unit_type, is_shared, purchase_unit, purchase_qty, purchase_cost, notes } = body;

    if (!name || !unit_type || purchase_qty == null || purchase_cost == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const baseQty = toBaseUnit(unit_type, purchase_unit, Number(purchase_qty));
    const unitCost = baseQty > 0 ? Number(purchase_cost) / baseQty : 0;
    const baseUnitLabel = unit_type === 'weight' ? 'g' : unit_type === 'volume' ? 'ml' : unit_type === 'count' ? 'piece' : 'ksh';
    const today = new Date().toISOString().slice(0, 10);

    const res = await dbRun(
      `INSERT INTO ingredients (name, unit_type, base_unit, is_shared, purchase_qty, purchase_cost, unit_cost, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name.trim(), unit_type, baseUnitLabel, is_shared ? 1 : 0, baseQty, Number(purchase_cost), unitCost, notes || null]
    );

    const ingredientId = res.lastInsertRowid;

    await dbRun(
      `INSERT INTO ingredient_price_history (ingredient_id, purchase_qty, purchase_cost, unit_cost)
       VALUES (?, ?, ?, ?)`,
      [ingredientId, baseQty, Number(purchase_cost), unitCost]
    );

    // Log the initial purchase as an expense so cashflow stays accurate
    await dbRun(
      `INSERT INTO expenses (category, description, amount, expense_date, ingredient_id)
       VALUES ('ingredient', ?, ?, ?, ?)`,
      [`Purchased ${name.trim()} (initial stock)`, Number(purchase_cost), today, ingredientId]
    );

    const created = await dbGet('SELECT * FROM ingredients WHERE id = ?', [ingredientId]);
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      return NextResponse.json({ error: 'An ingredient with this name already exists' }, { status: 409 });
    }
    console.error('Error in POST /api/ingredients:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
