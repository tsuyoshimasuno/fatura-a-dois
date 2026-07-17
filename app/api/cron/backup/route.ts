import { NextResponse } from 'next/server';
import { runBackup } from '@/server/backup/dump';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const result = await runBackup();
  return NextResponse.json({ ok: true, ...result });
}
