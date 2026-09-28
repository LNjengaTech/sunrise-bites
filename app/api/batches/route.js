import { NextResponse } from 'next/server';
import { dbQuery, dbGet, dbRun, computeRecipeCost } from '@/lib/db';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let query = `
      SELECT b.*, r.name as recipe_name, r.yield_unit
      FROM production_batches b
      JOIN recipes r ON r.id = b.recipe_id
    `;
    const args = [];
    if (from && to) {
      query += ' WHERE b.production_date BETWEEN ? AND ?';
      args.push(from, to);
    }
    query += ' ORDER BY b.production_date DESC, b.id DESC LIMIT 200';

    const rows = (await dbQuery(query, args)) || [];
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Error in GET /api/batches:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { recipe_id, batch_count, notes, production_date } = body;

    if (!recipe_id) {
      return NextResponse.json({ error: 'Recipe ID is required' }, { status: 400 });
    }

    const recipe = await dbGet('SELECT * FROM recipes WHERE id = ?', [recipe_id]);
    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    const costInfo = await computeRecipeCost(recipe_id);
    const count = Number(batch_count) || 1;
    const producedQty = count * (Number(recipe.yield_qty) || 1);
    const totalBatchCost = count * (costInfo ? costInfo.directCostPerBatch : 0);
    const date = production_date || new Date().toISOString().slice(0, 10);

    const res = await dbRun(
      `INSERT INTO production_batches (recipe_id, batch_count, produced_qty, batch_cost, production_date, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [recipe_id, count, producedQty, totalBatchCost, date, notes || null]
    );

    const created = await dbGet(
      `SELECT b.*, r.name as recipe_name, r.yield_unit
       FROM production_batches b
       JOIN recipes r ON r.id = b.recipe_id
       WHERE b.id = ?`,
      [res.lastInsertRowid]
    );

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error('Error in POST /api/batches:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
