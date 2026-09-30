import { NextResponse } from 'next/server';
import { submissionsStore } from '@/app/api/submissions_store';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const instituteId = params.id;

  // Filter approved submissions for this institute
  const approved = submissionsStore.filter(
    (s) => s.institute_id === instituteId && s.status === 'approved'
  );

  const sampleSize = approved.length;
  const MIN_REQUIRED = 5;

  // RULE 1: If approved submissions < 5, return insufficient data and null conversion rates
  if (sampleSize < MIN_REQUIRED) {
    return NextResponse.json({
      institute_id: instituteId,
      institute_name: instituteId,
      sample_size: sampleSize,
      has_sufficient_data: false,
      status: 'insufficient_data',
      message: `Insufficient data: ResultProof requires at least ${MIN_REQUIRED} verified submissions before publishing conversion rates. Current verified count: ${sampleSize}.`,
      conversion_rate_percent: null,
      qualified_count: null,
      average_fee_paid: null,
      exam_breakdowns: null,
      yearly_breakdowns: null,
      course_type_breakdowns: null,
    });
  }

  // Real stats calculation when >= 5 approved submissions
  let qualifiedCount = 0;
  const fees: number[] = [];
  const examMap: { [exam: string]: { sample_size: number; qualified: number } } = {};
  const yearMap: { [year: number]: { sample_size: number; qualified: number } } = {};

  for (const sub of approved) {
    const isQual = !sub.result_value.toLowerCase().includes('not') && !sub.result_value.toLowerCase().includes('fail');
    if (isQual) qualifiedCount++;
    if (sub.fee_paid > 0) fees.push(sub.fee_paid);

    if (!examMap[sub.exam]) examMap[sub.exam] = { sample_size: 0, qualified: 0 };
    examMap[sub.exam].sample_size++;
    if (isQual) examMap[sub.exam].qualified++;

    if (!yearMap[sub.year]) yearMap[sub.year] = { sample_size: 0, qualified: 0 };
    yearMap[sub.year].sample_size++;
    if (isQual) yearMap[sub.year].qualified++;
  }

  const avgFee = fees.length > 0 ? Math.round(fees.reduce((a, b) => a + b, 0) / fees.length) : 0;
  const conversionRate = parseFloat(((qualifiedCount / sampleSize) * 100).toFixed(2));

  return NextResponse.json({
    institute_id: instituteId,
    institute_name: instituteId,
    sample_size: sampleSize,
    has_sufficient_data: true,
    status: 'sufficient',
    message: `Verified stats based on ${sampleSize} audited student submissions.`,
    conversion_rate_percent: conversionRate,
    qualified_count: qualifiedCount,
    average_fee_paid: avgFee,
    exam_breakdowns: Object.entries(examMap).map(([exam, data]) => ({
      exam,
      sample_size: data.sample_size,
      qualified_count: data.qualified,
      conversion_rate_percent: parseFloat(((data.qualified / data.sample_size) * 100).toFixed(2)),
    })),
    yearly_breakdowns: Object.entries(yearMap).map(([year, data]) => ({
      year: parseInt(year),
      sample_size: data.sample_size,
      qualified_count: data.qualified,
      conversion_rate_percent: parseFloat(((data.qualified / data.sample_size) * 100).toFixed(2)),
    })),
  });
}
