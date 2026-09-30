/**
 * ResultProof Protocol - Frontend API Client
 * Dynamically connects to either:
 * 1. The built-in Next.js Serverless Routes (/api) on Vercel (No separate backend required!)
 * 2. Or the dedicated Python FastAPI + PostgreSQL backend if NEXT_PUBLIC_API_URL is configured.
 */

import {
  Institute,
  InstituteStats,
  SubmissionPayload,
  SubmissionResponse,
  DeletionRequestResponse,
  AdminLoginPayload,
  AdminTokenResponse,
  AdminSubmissionDetail,
  SignedDocumentUrls,
  AdminLogItem,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    let errorData = null;
    try {
      errorData = await response.json();
      if (errorData?.detail) {
        errorDetail = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
      }
    } catch {
      // Body is not JSON
    }
    throw new ApiError(response.status, errorDetail, errorData);
  }
  return response.json();
}

/**
 * Fetch all verified institutes with optional query, exam, and city filters
 */
export async function fetchInstitutes(params?: {
  query?: string;
  exam?: string;
  city?: string;
}): Promise<Institute[]> {
  const queryParams = new URLSearchParams();
  if (params?.query) queryParams.set('query', params.query);
  if (params?.exam) queryParams.set('exam', params.exam);
  if (params?.city) queryParams.set('city', params.city);

  const url = `${API_BASE_URL}/institutes${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
    cache: 'no-store',
  });
  return handleResponse<Institute[]>(response);
}

/**
 * Fetch single institute details by ID
 */
export async function fetchInstituteById(id: string): Promise<Institute> {
  const response = await fetch(`${API_BASE_URL}/institutes/${encodeURIComponent(id)}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });
  return handleResponse<Institute>(response);
}

/**
 * Fetch verified statistics for an institute (Approved submissions only).
 * If sample size < 5, backend returns status: 'insufficient_data' and has_sufficient_data: false.
 */
export async function fetchInstituteStats(id: string): Promise<InstituteStats> {
  const response = await fetch(`${API_BASE_URL}/institutes/${encodeURIComponent(id)}/stats`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
    cache: 'no-store',
  });
  return handleResponse<InstituteStats>(response);
}

/**
 * Submit encrypted student proof (Multipart with 2 files).
 * Rate-limited per IP, validated by magic bytes, with receipt SHA-256 duplicate detection.
 */
export async function submitProof(payload: SubmissionPayload): Promise<SubmissionResponse> {
  const formData = new FormData();
  formData.append('institute_id', payload.institute_id);
  formData.append('exam', payload.exam);
  formData.append('year', payload.year.toString());
  formData.append('course_type', payload.course_type);
  formData.append('duration_months', payload.duration_months.toString());
  formData.append('is_paid', payload.is_paid.toString());
  formData.append('fee_paid', payload.fee_paid.toString());
  formData.append('result_value', payload.result_value);
  formData.append('consent_given', payload.consent_given ? 'true' : 'false');
  formData.append('receipt_file', payload.receipt_file);
  formData.append('scorecard_file', payload.scorecard_file);

  const response = await fetch(`${API_BASE_URL}/submissions`, {
    method: 'POST',
    body: formData,
  });
  return handleResponse<SubmissionResponse>(response);
}

/**
 * Request deletion of a submitted record (Student privacy compliance).
 */
export async function requestSubmissionDeletion(id: string): Promise<DeletionRequestResponse> {
  const response = await fetch(`${API_BASE_URL}/submissions/${encodeURIComponent(id)}/request-deletion`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
    },
  });
  return handleResponse<DeletionRequestResponse>(response);
}

// --------------------------------------------------------------------------
// Admin Endpoints (Protected by JWT)
// --------------------------------------------------------------------------

/**
 * Authenticate admin and retrieve JWT token
 */
export async function adminLogin(credentials: AdminLoginPayload): Promise<AdminTokenResponse> {
  const response = await fetch(`${API_BASE_URL}/admin/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(credentials),
  });
  return handleResponse<AdminTokenResponse>(response);
}

/**
 * Retrieve submissions list filtered by status ('pending', 'approved', 'rejected')
 */
export async function adminGetSubmissions(params?: {
  status?: string;
  token: string;
}): Promise<AdminSubmissionDetail[]> {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.set('status', params.status);

  const url = `${API_BASE_URL}/admin/submissions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${params?.token}`,
      'Accept': 'application/json',
    },
  });
  return handleResponse<AdminSubmissionDetail[]>(response);
}

/**
 * Generate short-lived (15 min) signed temporary URLs for receipt and scorecard documents
 */
export async function adminGetDocumentUrls(id: string, token: string): Promise<SignedDocumentUrls> {
  const response = await fetch(`${API_BASE_URL}/admin/submissions/${encodeURIComponent(id)}/documents`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });
  return handleResponse<SignedDocumentUrls>(response);
}

/**
 * Approve a student submission
 */
export async function adminApproveSubmission(id: string, token: string): Promise<AdminSubmissionDetail> {
  const response = await fetch(`${API_BASE_URL}/admin/submissions/${encodeURIComponent(id)}/approve`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });
  return handleResponse<AdminSubmissionDetail>(response);
}

/**
 * Reject a student submission with a mandatory audit reason
 */
export async function adminRejectSubmission(
  id: string,
  rejectReason: string,
  token: string
): Promise<AdminSubmissionDetail> {
  const response = await fetch(`${API_BASE_URL}/admin/submissions/${encodeURIComponent(id)}/reject`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ reject_reason: rejectReason }),
  });
  return handleResponse<AdminSubmissionDetail>(response);
}

/**
 * Retrieve immutable admin audit logs
 */
export async function adminGetLogs(token: string): Promise<AdminLogItem[]> {
  const response = await fetch(`${API_BASE_URL}/admin/logs`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });
  return handleResponse<AdminLogItem[]>(response);
}
