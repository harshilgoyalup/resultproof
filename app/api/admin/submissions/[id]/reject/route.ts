import { NextResponse } from 'next/server';
import { submissionsStore, logsStore } from '@/app/api/submissions_store';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  const { reject_reason } = await request.json();
  const sub = submissionsStore.find((s) => s.id === id);

  if (!sub) {
    return NextResponse.json({ detail: 'Submission not found' }, { status: 404 });
  }

  sub.status = 'rejected';
  sub.reviewed_at = new Date().toISOString();
  sub.reviewed_by = 'admin@resultproof.org';
  sub.reject_reason = reject_reason || 'Scorecard details could not be validated against official roll records.';

  logsStore.unshift({
    id: 'log_' + Date.now(),
    admin_id: 'admin-1',
    admin_email: 'admin@resultproof.org',
    action: 'REJECT_SUBMISSION',
    target_id: id,
    details: { reason: sub.reject_reason },
    ip_address: '127.0.0.1',
    created_at: new Date().toISOString(),
  });

  return NextResponse.json(sub);
}
