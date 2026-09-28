import { NextResponse } from 'next/server';
import { dbGet, dbRun } from '@/lib/db';

export async function DELETE(req, { params }) {
  const row = await dbGet('SELECT * FROM expenses WHERE id = ?', [params.id]);
  if (row && row.category === 'ingredient') {
    return NextResponse.json(
      { error: 'This expense was auto-generated from an ingredient purchase and cannot be deleted directly.' },
      { status: 409 }
    );
  }
  await dbRun('DELETE FROM expenses WHERE id = ?', [params.id]);
  return NextResponse.json({ ok: true });
}
