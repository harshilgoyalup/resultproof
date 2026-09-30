import { NextResponse } from 'next/server';
import { submissionsStore } from '@/app/api/submissions_store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status');

  let results = [...submissionsStore];
  if (statusFilter && statusFilter !== 'all') {
    results = results.filter((s) => s.status === statusFilter);
  }

  return NextResponse.json(results);
}
