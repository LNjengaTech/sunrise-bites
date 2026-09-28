import { NextResponse } from 'next/server';
import { dbGet, dbQuery, dbRun } from '@/lib/db';

export async function GET(req, { params }) {
  try {
    const row = await dbGet('SELECT * FROM ingredients WHERE id = ?', [params.id]);
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const history = (await dbQuery(
      'SELECT * FROM ingredient_price_history WHERE ingredient_id = ? ORDER BY recorded_at DESC LIMIT 10',
      [params.id]
    )) || [];
    return NextResponse.json({ ...row, history });
  } catch (err) {
    console.error('Error in GET /api/ingredients/[id]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  try {
    const body = await req.json();
    const existing = await dbGet('SELECT * FROM ingredients WHERE id = ?', [params.id]);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const name = body.name ?? existing.name;
    const is_shared = body.is_shared != null ? (body.is_shared ? 1 : 0) : existing.is_shared;
    const notes = body.notes ?? existing.notes;

    await dbRun(
      'UPDATE ingredients SET name = ?, is_shared = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, is_shared, notes, params.id]
    );
    const updated = await dbGet('SELECT * FROM ingredients WHERE id = ?', [params.id]);
    return NextResponse.json(updated);
  } catch (err) {
    console.error('Error in PATCH /api/ingredients/[id]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const inUse = await dbGet('SELECT COUNT(*) as c FROM recipe_ingredients WHERE ingredient_id = ?', [params.id]);
    if (inUse && inUse.c > 0) {
      return NextResponse.json(
        { error: 'This ingredient is used in one or more recipes. Remove it from those recipes first.' },
        { status: 409 }
      );
    }
    await dbRun('DELETE FROM ingredients WHERE id = ?', [params.id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error in DELETE /api/ingredients/[id]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
