import { NextResponse } from 'next/server';
import { dbQuery, dbGet, dbRun } from '@/lib/db';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let query = `
      SELECT s.*, r.name as recipe_name
      FROM sales s JOIN recipes r ON r.id = s.recipe_id
    `;
    const args = [];
    if (from && to) {
      query += ' WHERE s.sale_date BETWEEN ? AND ?';
      args.push(from, to);
    }
    query += ' ORDER BY s.sale_date DESC, s.id DESC LIMIT 300';

    const rows = (await dbQuery(query, args)) || [];
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Error in GET /api/sales:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    // Support both bulk sale items (e.g. from Counter POS) and single sale item
    if (Array.isArray(body.items)) {
      const saleDate = body.sale_date || new Date().toISOString().slice(0, 10);
      const createdItems = [];

      for (const item of body.items) {
        if (item.recipe_id && item.quantity > 0) {
          const res = await dbRun(
            `INSERT INTO sales (recipe_id, quantity, unit_price, sale_date) VALUES (?, ?, ?, ?)`,
            [item.recipe_id, Number(item.quantity), Number(item.unit_price), saleDate]
          );
          createdItems.push({ id: res.lastInsertRowid, ...item, sale_date: saleDate });
        }
      }

      return NextResponse.json({ ok: true, count: createdItems.length, items: createdItems }, { status: 201 });
    }

    const { recipe_id, quantity, unit_price, sale_date } = body;
    if (!recipe_id || !quantity || unit_price == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const date = sale_date || new Date().toISOString().slice(0, 10);
    const res = await dbRun(
      `INSERT INTO sales (recipe_id, quantity, unit_price, sale_date) VALUES (?, ?, ?, ?)`,
      [recipe_id, Number(quantity), Number(unit_price), date]
    );

    const created = await dbGet(
      `SELECT s.*, r.name as recipe_name FROM sales s JOIN recipes r ON r.id = s.recipe_id WHERE s.id = ?`,
      [res.lastInsertRowid]
    );
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error('Error in POST /api/sales:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
