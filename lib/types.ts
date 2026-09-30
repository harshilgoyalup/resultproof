/**
 * ResultProof Protocol - Frontend Data Types & API Schemas
 * Strictly matches the FastAPI backend schemas and zero-PII student privacy rules.
 */

export type ExamType = 'JEE' | 'NEET' | 'UPSC' | 'GATE' | 'OTHER' | string;

export type CourseType = 'Classroom' | 'DLP' | 'Crash Course' | 'Test Series' | 'Online' | string;

export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface Institute {
  id: string;
  name: string;
  city: string;
  exams: string[];
  created_at: string;
}

export interface MetricWithSampleSize<T = number> {
  value: T;
  sample_size: number;
}

export interface ExamBreakdown {
  exam: string;
  sample_size: number;
  qualified_count: number;
  conversion_rate_percent: number;
}

export interface YearBreakdown {
  year: number;
  sample_size: number;
  qualified_count: number;
  conversion_rate_percent: number;
}

export interface CourseTypeBreakdown {
  course_type: string;
  sample_size: number;
  qualified_count: number;
  conversion_rate_percent: number;
}

export interface InstituteStats {
  institute_id: string;
  institute_name: string;
  sample_size: number;
  has_sufficient_data: boolean;
  status: 'sufficient' | 'insufficient_data';
  message?: string | null;
  // Metrics populated only when has_sufficient_data is true (>= 5 approved submissions)
  conversion_rate_percent?: number | null;
  qualified_count?: number | null;
  average_fee_paid?: number | null;
  min_fee_paid?: number | null;
  max_fee_paid?: number | null;
  exam_breakdowns?: ExamBreakdown[];
  yearly_breakdowns?: YearBreakdown[];
  course_type_breakdowns?: CourseTypeBreakdown[];
}

export interface SubmissionPayload {
  institute_id: string;
  exam: string;
  year: number;
  course_type: CourseType;
  duration_months: number;
  is_paid: boolean;
  fee_paid: number;
  result_value: string; // e.g. "AIR 450", "Qualified", "99.2 Percentile", "Not Qualified"
  consent_given: boolean;
  receipt_file: File;
  scorecard_file: File;
}

export interface SubmissionResponse {
  id: string;
  institute_id: string;
  exam: string;
  year: number;
  course_type: string;
  duration_months: number;
  is_paid: boolean;
  fee_paid: number;
  result_value: string;
  status: SubmissionStatus;
  is_duplicate_flag: boolean;
  created_at: string;
  message: string;
}

export interface DeletionRequestResponse {
  success: boolean;
  message: string;
  submission_id: string;
}

export interface AdminLoginPayload {
  email: string;
  password: string;
}

export interface AdminTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface AdminSubmissionDetail extends SubmissionResponse {
  receipt_hash: string;
  consent_given_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  reject_reason?: string | null;
  documents_purged_at?: string | null;
}

export interface SignedDocumentUrls {
  submission_id: string;
  receipt_url?: string | null;
  scorecard_url?: string | null;
  expires_in_seconds: number;
  documents_purged: boolean;
}

export interface AdminLogItem {
  id: string;
  admin_id: string;
  admin_email: string;
  action: string;
  target_id?: string | null;
  details?: Record<string, any> | null;
  ip_address?: string | null;
  created_at: string;
}
