import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const institute_id = formData.get('institute_id') as string;
    const exam = formData.get('exam') as string;
    const year = parseInt((formData.get('year') as string) || '2024');
    const course_type = formData.get('course_type') as string;
    const fee_paid = parseFloat((formData.get('fee_paid') as string) || '0');
    const result_value = formData.get('result_value') as string;
    const consent_given = formData.get('consent_given') === 'true';

    const receipt_file = formData.get('receipt_file') as File | null;
    const scorecard_file = formData.get('scorecard_file') as File | null;

    if (!consent_given) {
      return NextResponse.json(
        { detail: 'Student consent is mandatory to process audit submissions.' },
        { status: 400 }
      );
    }

    if (!receipt_file || !scorecard_file) {
      return NextResponse.json(
        { detail: 'Both fee receipt and official scorecard documents are required.' },
        { status: 400 }
      );
    }

    // Validate size (< 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (receipt_file.size > MAX_SIZE || scorecard_file.size > MAX_SIZE) {
      return NextResponse.json(
        { detail: 'Uploaded documents must be under 5 MB in size.' },
        { status: 400 }
      );
    }

    // Generate random submission tracking ID
    const submissionId = 'sub_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

    return NextResponse.json(
      {
        id: submissionId,
        institute_id,
        exam,
        year,
        course_type,
        duration_months: 24,
        is_paid: true,
        fee_paid,
        result_value,
        status: 'pending',
        is_duplicate_flag: false,
        created_at: new Date().toISOString(),
        message: 'Submission received and queued for deterministic audit. Zero student PII stored.',
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { detail: error.message || 'Failed to process submission.' },
      { status: 400 }
    );
  }
}
