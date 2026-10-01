import { NextResponse } from 'next/server';
import { dbGet, dbRun } from '@/lib/db';

export async function DELETE(req, { params }) {
  try {
    const row = await dbGet('SELECT id FROM purchases WHERE id = ?', [params.id]);
    if (!row) {
      return NextResponse.json({ error: 'Purchase record not found' }, { status: 404 });
    }
    await dbRun('DELETE FROM purchases WHERE id = ?', [params.id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error in DELETE /api/purchases/[id]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
