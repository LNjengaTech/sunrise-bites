import { NextResponse } from 'next/server';
import { dbRun } from '@/lib/db';

export async function DELETE(req, { params }) {
  await dbRun('DELETE FROM production_batches WHERE id = ?', [params.id]);
  return NextResponse.json({ ok: true });
}
