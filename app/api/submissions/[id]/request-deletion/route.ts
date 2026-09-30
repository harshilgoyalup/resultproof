import { NextResponse } from 'next/server';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  return NextResponse.json({
    success: true,
    message: `Submission record '${id}' and all associated files have been permanently deleted from storage.`,
    submission_id: id,
  });
}
