// Shared in-memory data store for serverless execution (Starts completely clean with 0 demo students)

export interface StoredSubmission {
  id: string;
  institute_id: string;
  exam: string;
  year: number;
  course_type: string;
  duration_months: number;
  is_paid: boolean;
  fee_paid: number;
  result_value: string;
  status: 'pending' | 'approved' | 'rejected';
  is_duplicate_flag: boolean;
  receipt_hash: string;
  receipt_file_name?: string;
  scorecard_file_name?: string;
  consent_given_at: string;
  created_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  reject_reason?: string | null;
  documents_purged_at?: string | null;
}

export interface StoredLog {
  id: string;
  admin_id: string;
  admin_email: string;
  action: string;
  target_id?: string | null;
  details?: Record<string, any> | null;
  ip_address?: string | null;
  created_at: string;
}

export const submissionsStore: StoredSubmission[] = [];
export const logsStore: StoredLog[] = [];
