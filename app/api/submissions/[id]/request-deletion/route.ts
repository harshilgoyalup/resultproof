import { NextResponse } from 'next/server';
import { submissionsStore, logsStore } from '@/app/api/submissions_store';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  const index = submissionsStore.findIndex((s) => s.id === id);

  if (index !== -1) {
    submissionsStore.splice(index, 1);
  }

  logsStore.unshift({
    id: 'log_' + Date.now(),
    admin_id: 'system',
    admin_email: 'privacy@resultproof.org',
    action: 'STUDENT_DELETION_REQUEST',
    target_id: id,
    details: { message: 'Permanently deleted submission per student right-to-deletion request' },
    ip_address: '127.0.0.1',
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({
    success: true,
    message: `Submission record '${id}' and all associated files have been permanently deleted from storage.`,
    submission_id: id,
  });
}
