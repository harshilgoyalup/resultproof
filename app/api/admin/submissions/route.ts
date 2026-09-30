import { NextResponse } from 'next/server';

const MOCK_ADMIN_QUEUE = [
  {
    id: 'sub_8f293b11-a',
    institute_id: 'apex-science-academy-kota',
    exam: 'JEE Advanced',
    year: 2024,
    course_type: 'Classroom',
    duration_months: 24,
    is_paid: true,
    fee_paid: 185000,
    result_value: 'AIR 352',
    status: 'pending',
    is_duplicate_flag: false,
    receipt_hash: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b',
    consent_given_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 3600000).toISOString(),
    reviewed_at: null,
    reviewed_by: null,
    reject_reason: null,
    documents_purged_at: null,
  },
  {
    id: 'sub_9c412f08-b',
    institute_id: 'pioneer-medical-delhi',
    exam: 'NEET',
    year: 2024,
    course_type: 'Classroom',
    duration_months: 24,
    is_paid: true,
    fee_paid: 190000,
    result_value: 'AIR 889',
    status: 'approved',
    is_duplicate_flag: false,
    receipt_hash: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
    consent_given_at: new Date(Date.now() - 86400000).toISOString(),
    created_at: new Date(Date.now() - 86400000).toISOString(),
    reviewed_at: new Date().toISOString(),
    reviewed_by: 'admin-1',
    reject_reason: null,
    documents_purged_at: null,
  },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status');

  let results = [...MOCK_ADMIN_QUEUE];
  if (statusFilter && statusFilter !== 'all') {
    results = results.filter((s) => s.status === statusFilter);
  }

  return NextResponse.json(results);
}
