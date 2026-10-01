import { NextResponse } from 'next/server';
import { dbQuery, dbGet, dbRun } from '@/lib/db';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let query = 'SELECT * FROM purchases';
    const args = [];
    if (from && to) {
      query += ' WHERE purchase_date BETWEEN ? AND ?';
      args.push(from, to);
    }
    query += ' ORDER BY purchase_date DESC, id DESC LIMIT 500';

    const rows = (await dbQuery(query, args)) || [];
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Error in GET /api/purchases:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, quantity, unit, unit_price, total_cost, purchase_date, notes } = body;

    if (!name || (unit_price == null && total_cost == null)) {
      return NextResponse.json({ error: 'Item name and amount paid are required.' }, { status: 400 });
    }

    const qty = quantity != null && quantity !== '' && Number(quantity) > 0 ? Number(quantity) : null;
    let finalTotal = total_cost != null && total_cost !== '' ? Number(total_cost) : null;
    let finalUnitPrice = unit_price != null && unit_price !== '' ? Number(unit_price) : null;

    if (finalTotal != null && finalUnitPrice == null) {
      finalUnitPrice = qty ? finalTotal / qty : finalTotal;
    } else if (finalUnitPrice != null && finalTotal == null) {
      finalTotal = qty ? finalUnitPrice * qty : finalUnitPrice;
    }

    if (finalTotal == null) {
      finalTotal = 0;
    }
    if (finalUnitPrice == null) {
      finalUnitPrice = finalTotal;
    }

    const date = purchase_date || new Date().toISOString().slice(0, 10);

    const res = await dbRun(
      `INSERT INTO purchases (name, quantity, unit, unit_price, total_cost, purchase_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name.trim(), qty, unit?.trim() || null, finalUnitPrice, finalTotal, date, notes?.trim() || null]
    );

    const created = await dbGet('SELECT * FROM purchases WHERE id = ?', [res.lastInsertRowid]);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error('Error in POST /api/purchases:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
