import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  return NextResponse.json({
    id,
    institute_id: 'apex-science-academy-kota',
    exam: 'JEE Advanced',
    year: 2024,
    course_type: 'Classroom',
    duration_months: 24,
    is_paid: true,
    fee_paid: 185000,
    result_value: 'AIR 352',
    status: 'approved',
    is_duplicate_flag: false,
    receipt_hash: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b',
    consent_given_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    reviewed_at: new Date().toISOString(),
    reviewed_by: 'admin-auditor-1',
    reject_reason: null,
    documents_purged_at: null,
  });
}
