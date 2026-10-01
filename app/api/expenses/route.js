import { NextResponse } from 'next/server';
import { dbQuery, dbGet, dbRun } from '@/lib/db';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let query = "SELECT * FROM expenses WHERE category != 'ingredient'";
    const args = [];
    if (from && to) {
      query += ' AND expense_date BETWEEN ? AND ?';
      args.push(from, to);
    }
    query += ' ORDER BY expense_date DESC, id DESC LIMIT 300';

    const rows = (await dbQuery(query, args)) || [];
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Error in GET /api/expenses:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { category, description, amount, expense_date } = body;

    if (!category || amount == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const date = expense_date || new Date().toISOString().slice(0, 10);
    const res = await dbRun(
      `INSERT INTO expenses (category, description, amount, expense_date) VALUES (?, ?, ?, ?)`,
      [category, description || null, Number(amount), date]
    );

    const created = await dbGet('SELECT * FROM expenses WHERE id = ?', [res.lastInsertRowid]);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error('Error in POST /api/expenses:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
