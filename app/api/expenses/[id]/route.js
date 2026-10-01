import { NextResponse } from 'next/server';
import { dbGet, dbRun } from '@/lib/db';

export async function DELETE(req, { params }) {
  try {
    const row = await dbGet('SELECT * FROM expenses WHERE id = ?', [params.id]);
    if (!row) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }
    await dbRun('DELETE FROM expenses WHERE id = ?', [params.id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error in DELETE /api/expenses/[id]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
