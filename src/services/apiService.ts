import { auth } from '../lib/firebase';
import {
  AppNotification,
  ApplicationStatus,
  ApprovalHistoryEntry,
  CompanyDepartment,
  DepartmentType,
  EvaluationResult,
  FinalSalarySource,
  JobApplication,
  SalaryLevelKey,
  SalaryProposal,
  SalaryProposalStage,
  SalaryStructureConfig,
  SalaryStructureHistoryEntry,
  UserRole,
} from '../types';

export interface PerApplicationSalaryLevelsPayload {
  level1Salary?: number | null;
  level2Salary?: number | null;
  level3Salary?: number | null;
  currency?: string;
  notes?: string;
}

export interface DecisionPayload {
  action: 'approve' | 'reject' | 'waitlist' | 'forward' | 'override';
  decision?: EvaluationResult | string;
  selectedSalaryLevel?: SalaryLevelKey | null;
  selectedSalarySource?: FinalSalarySource | null;
  proposedSalary?: number | null;
  proposalNotes?: string;
  salaryLevels?: PerApplicationSalaryLevelsPayload;
  reviewData?: {
    positives?: string;
    negatives?: string;
    notice?: string;
    signature?: string;
    salary?: string;
    department?: DepartmentType;
  };
  targetDepartment?: DepartmentType;
  overrideTargetStatus?: ApplicationStatus;
  application?: JobApplication;
}

export interface DecisionResponse {
  success: boolean;
  application: JobApplication;
  historyEntry: ApprovalHistoryEntry;
  message?: string;
}

// In-memory session token for email/password sessions (cookie HttpOnly persists across reloads)
let inMemoryAuthToken: string | null = null;

export function setInMemoryAuthToken(token: string | null) {
  inMemoryAuthToken = token;
}

export function clearInMemoryAuthToken() {
  inMemoryAuthToken = null;
}

export function getInMemoryAuthToken(): string | null {
  return inMemoryAuthToken;
}

/**
 * Builds request headers with Firebase ID token (for Google auth) or in-memory HMAC token.
 * User role and department are strictly resolved server-side from PostgreSQL.
 */
export async function getAuthHeaders(
  _activeRole?: UserRole,
  _userDepartment?: DepartmentType | string | null
): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const currentUser = auth.currentUser;
  if (currentUser) {
    headers['x-user-id'] = currentUser.uid;
    if (currentUser.email) {
      headers['x-user-email'] = currentUser.email;
    }
    try {
      const idToken = await currentUser.getIdToken();
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }
    } catch (err) {
      console.warn('[apiService] Could not get ID token:', err);
    }
  } else if (inMemoryAuthToken) {
    headers['Authorization'] = `Bearer ${inMemoryAuthToken}`;
  }

  return headers;
}

async function parseJsonSafe(response: Response): Promise<any> {
  const rawText = await response.text();
  try {
    return rawText ? JSON.parse(rawText) : {};
  } catch {
    return { error: rawText || `HTTP ${response.status}` };
  }
}

function isTransientNetworkError(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof TypeError) return true;
  const msg = String((err as any)?.message || err).toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('load failed') ||
    msg.includes('network request failed')
  );
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  maxRetries = 2
): Promise<Response> {
  let attempt = 0;
  while (true) {
    try {
      return await fetch(url, init);
    } catch (err) {
      const canRetry =
        attempt < maxRetries &&
        isTransientNetworkError(err) &&
        (typeof navigator === 'undefined' || navigator.onLine !== false);
      if (!canRetry) {
        throw err;
      }
      attempt += 1;
      await new Promise((resolve) => setTimeout(resolve, 450 * attempt));
    }
  }
}

// ==========================================
// Authentication & Session APIs (PostgreSQL + HttpOnly Cookie)
// ==========================================

export async function loginWithEmailPassword(email: string, password: string): Promise<any> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await parseJsonSafe(response);

  if (!response.ok) {
    throw new Error(data?.error || 'فشل تسجيل الدخول. يرجى التحقق من صحة البيانات.');
  }

  if (data?.user?.token) {
    setInMemoryAuthToken(data.user.token);
  }

  return data;
}

export async function fetchCurrentSessionUser(activeRole?: UserRole): Promise<{
  status: number;
  user?: any;
  error?: string;
}> {
  const headers = await getAuthHeaders(activeRole);
  const response = await fetchWithRetry('/api/auth/me', {
    credentials: 'include',
    headers,
  });
  const data = await parseJsonSafe(response);
  if (!response.ok) {
    return { status: response.status, error: data?.error };
  }
  return { status: 200, user: data?.user };
}

export async function logoutSession(): Promise<void> {
  try {
    const headers = await getAuthHeaders();
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers,
    });
  } catch {
    // Clear local state regardless
  } finally {
    clearInMemoryAuthToken();
  }
}

// ==========================================
// Applications CRUD & Approval Workflow APIs
// ==========================================

export async function submitDecision(
  applicantId: string,
  payload: DecisionPayload,
  activeRole: UserRole,
  userDepartment?: DepartmentType | null
): Promise<DecisionResponse> {
  const headers = await getAuthHeaders(activeRole, userDepartment);

  const response = await fetch(`/api/applications/${encodeURIComponent(applicantId)}/decision`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify(payload),
  });

  const data = await parseJsonSafe(response);

  if (!response.ok) {
    const errorMsg = data?.error || `فشل اتخاذ القرار (${response.status})`;
    const error: any = new Error(errorMsg);
    error.statusCode = response.status;
    error.details = data;
    throw error;
  }

  return data;
}

export async function fetchAuthorizedApplications(
  activeRole: UserRole,
  userDepartment?: DepartmentType | null,
  scope: 'all' | 'pending_me' = 'all'
): Promise<{ applicants: JobApplication[]; totalCount: number }> {
  const headers = await getAuthHeaders(activeRole, userDepartment);

  const response = await fetchWithRetry(`/api/applications?scope=${encodeURIComponent(scope)}`, {
    credentials: 'include',
    headers,
  });

  const data = await parseJsonSafe(response);

  if (!response.ok) {
    const error: any = new Error(data?.error || `تعذر جلب الطلبات (${response.status})`);
    error.statusCode = response.status;
    throw error;
  }

  return data;
}

export async function fetchStats(
  activeRole: UserRole,
  userDepartment?: DepartmentType | null
): Promise<any> {
  const headers = await getAuthHeaders(activeRole, userDepartment);

  const response = await fetchWithRetry('/api/stats', {
    credentials: 'include',
    headers,
  });
  const data = await parseJsonSafe(response);

  if (!response.ok) {
    throw new Error(data?.error || `تعذر حساب الإحصائيات (${response.status})`);
  }
  return data.stats;
}

export async function fetchApplicantHistory(
  applicantId: string,
  activeRole: UserRole = 'general_manager',
  userDepartment?: DepartmentType | null
): Promise<ApprovalHistoryEntry[]> {
  const headers = await getAuthHeaders(activeRole, userDepartment);
  const response = await fetchWithRetry(
    `/api/applications/${encodeURIComponent(applicantId)}/history`,
    {
      credentials: 'include',
      headers,
    }
  );
  const data = await parseJsonSafe(response);

  if (!response.ok) {
    const error: any = new Error(data?.error || `تعذر جلب سجل الاعتمادات (${response.status})`);
    error.statusCode = response.status;
    throw error;
  }
  return data.history || [];
}

export async function createApplicant(
  app: JobApplication,
  activeRole: UserRole
): Promise<JobApplication> {
  const headers = await getAuthHeaders(activeRole);

  const response = await fetch('/api/applications', {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify(app),
  });

  const data = await parseJsonSafe(response);

  if (!response.ok) {
    const error: any = new Error(data?.error || `تعذر حفظ الاستمارة (${response.status})`);
    error.statusCode = response.status;
    throw error;
  }
  return data.application;
}

export async function importApplicants(
  incomingApps: JobApplication[],
  mode: 'append' | 'upsert' | 'replace',
  activeRole: UserRole
): Promise<{
  insertedCount: number;
  updatedCount?: number;
  applicants: JobApplication[];
  message: string;
}> {
  const headers = await getAuthHeaders(activeRole);

  const response = await fetch('/api/applications/import', {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({ applications: incomingApps, mode }),
  });

  const data = await parseJsonSafe(response);

  if (!response.ok) {
    const error: any = new Error(data?.error || `تعذر استيراد الطلبات (${response.status})`);
    error.statusCode = response.status;
    throw error;
  }
  return data;
}

export async function exportApplicationsExcel(
  options: { statusFilter?: string; selectedIds?: string[] },
  activeRole: UserRole
): Promise<{ count: number; filename: string; content: string; message: string }> {
  const headers = await getAuthHeaders(activeRole);

  const response = await fetch('/api/applications/export', {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify(options),
  });

  const data = await parseJsonSafe(response);

  if (!response.ok) {
    const error: any = new Error(data?.error || `تعذر تصدير ملف Excel (${response.status})`);
    error.statusCode = response.status;
    throw error;
  }
  return data;
}

export async function deleteApplicant(
  applicantId: string,
  activeRole: UserRole
): Promise<boolean> {
  const headers = await getAuthHeaders(activeRole);

  const response = await fetch(`/api/applications/${encodeURIComponent(applicantId)}`, {
    method: 'DELETE',
    credentials: 'include',
    headers,
  });

  const data = await parseJsonSafe(response);

  if (!response.ok) {
    const error: any = new Error(data?.error || `تعذر حذف الاستمارة (${response.status})`);
    error.statusCode = response.status;
    throw error;
  }
  return true;
}

export async function updateApplicant(
  applicantId: string,
  updatedData: Partial<JobApplication>,
  activeRole: UserRole
): Promise<JobApplication> {
  const headers = await getAuthHeaders(activeRole);

  const response = await fetch(`/api/applications/${encodeURIComponent(applicantId)}`, {
    method: 'PUT',
    credentials: 'include',
    headers,
    body: JSON.stringify(updatedData),
  });

  const data = await parseJsonSafe(response);

  if (!response.ok) {
    const error: any = new Error(data?.error || `تعذر تحديث الاستمارة (${response.status})`);
    error.statusCode = response.status;
    throw error;
  }
  return data.application;
}

export async function saveStageReviewDraft(
  applicantId: string,
  payload: {
    stage?: 'hr' | 'hr_manager' | 'direct_manager';
    positives?: string;
    negatives?: string;
    notice?: string;
    result?: EvaluationResult | null;
    assignedDepartment?: DepartmentType;
    salaryLevels?: PerApplicationSalaryLevelsPayload;
    proposedSalary?: number | null;
    proposalNotes?: string;
  },
  activeRole: UserRole,
  userDepartment?: DepartmentType | null
): Promise<{ application: JobApplication; message: string }> {
  const headers = await getAuthHeaders(activeRole, userDepartment);

  const response = await fetch(
    `/api/applications/${encodeURIComponent(applicantId)}/save-review`,
    {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(payload),
    }
  );

  const data = await parseJsonSafe(response);

  if (!response.ok) {
    const error: any = new Error(data?.error || `تعذر حفظ التقييمات (${response.status})`);
    error.statusCode = response.status;
    throw error;
  }

  return data;
}

// ==========================================
// Salary Structure APIs (PostgreSQL)
// ==========================================

export async function saveApplicationSalaryLevels(
  applicantId: string,
  payload: {
    level1Salary: number;
    level2Salary: number;
    level3Salary: number;
    currency?: string;
    notes?: string;
  },
  activeRole?: UserRole
): Promise<{ application: JobApplication; message: string }> {
  const headers = await getAuthHeaders(activeRole);
  const response = await fetch(
    `/api/applications/${encodeURIComponent(applicantId)}/salary-structure`,
    {
      method: 'PUT',
      credentials: 'include',
      headers,
      body: JSON.stringify(payload),
    }
  );
  const data = await parseJsonSafe(response);
  if (!response.ok) {
    const error: any = new Error(
      data?.error || `تعذر حفظ مستويات الرواتب داخل الاستمارة (${response.status})`
    );
    error.statusCode = response.status;
    throw error;
  }
  return data;
}

export async function saveSalaryProposal(
  applicantId: string,
  payload: {
    stage?: SalaryProposalStage;
    proposedSalary: number;
    currency?: string;
    notes?: string;
  },
  activeRole?: UserRole,
  userDepartment?: DepartmentType | null
): Promise<{ proposal: SalaryProposal; application: JobApplication; message: string }> {
  const headers = await getAuthHeaders(activeRole, userDepartment);
  const response = await fetch(
    `/api/applications/${encodeURIComponent(applicantId)}/salary-proposal`,
    {
      method: 'PUT',
      credentials: 'include',
      headers,
      body: JSON.stringify(payload),
    }
  );
  const data = await parseJsonSafe(response);
  if (!response.ok) {
    const error: any = new Error(data?.error || `تعذر حفظ مقترح الراتب (${response.status})`);
    error.statusCode = response.status;
    throw error;
  }
  return data;
}

export async function fetchSalaryStructure(activeRole: UserRole): Promise<{
  salaryStructure: SalaryStructureConfig;
  history: SalaryStructureHistoryEntry[];
}> {
  const headers = await getAuthHeaders(activeRole);
  const response = await fetchWithRetry('/api/salary-structure', {
    credentials: 'include',
    headers,
  });
  const data = await parseJsonSafe(response);
  if (!response.ok) {
    const error: any = new Error(data?.error || `تعذر جلب هيكل الرواتب (${response.status})`);
    error.statusCode = response.status;
    throw error;
  }
  return data;
}

export async function updateSalaryStructure(
  payload: {
    level1Salary: number;
    level2Salary: number;
    level3Salary: number;
    currency?: string;
    notes?: string;
  },
  activeRole: UserRole
): Promise<{
  salaryStructure: SalaryStructureConfig;
  historyEntry: SalaryStructureHistoryEntry;
  history: SalaryStructureHistoryEntry[];
  message: string;
}> {
  const headers = await getAuthHeaders(activeRole);
  const response = await fetch('/api/salary-structure', {
    method: 'PUT',
    credentials: 'include',
    headers,
    body: JSON.stringify(payload),
  });
  const data = await parseJsonSafe(response);
  if (!response.ok) {
    const error: any = new Error(data?.error || `تعذر حفظ هيكل الرواتب (${response.status})`);
    error.statusCode = response.status;
    throw error;
  }
  return data;
}

// ==========================================
// Notifications, Departments & Settings APIs
// ==========================================

export async function fetchNotifications(activeRole: UserRole): Promise<AppNotification[]> {
  const headers = await getAuthHeaders(activeRole);
  const response = await fetchWithRetry('/api/notifications', {
    credentials: 'include',
    headers,
  });
  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(data?.error || 'تعذر جلب الإشعارات');
  }
  return data.notifications || [];
}

export async function markNotificationAsReadApi(
  id: string,
  activeRole: UserRole
): Promise<void> {
  const headers = await getAuthHeaders(activeRole);
  const response = await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
    method: 'POST',
    credentials: 'include',
    headers,
  });
  if (!response.ok) {
    const data = await parseJsonSafe(response);
    throw new Error(data?.error || 'تعذر تحديث الإشعار');
  }
}

export async function markAllNotificationsAsReadApi(activeRole: UserRole): Promise<void> {
  const headers = await getAuthHeaders(activeRole);
  const response = await fetch('/api/notifications/read-all', {
    method: 'POST',
    credentials: 'include',
    headers,
  });
  if (!response.ok) {
    const data = await parseJsonSafe(response);
    throw new Error(data?.error || 'تعذر تحديث الإشعارات');
  }
}

export async function fetchDepartments(activeRole: UserRole): Promise<CompanyDepartment[]> {
  const headers = await getAuthHeaders(activeRole);
  const response = await fetchWithRetry('/api/departments', {
    credentials: 'include',
    headers,
  });
  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(data?.error || 'تعذر جلب الإدارات');
  }
  return data.departments || [];
}

export async function fetchSystemSettings(activeRole: UserRole): Promise<Record<string, any>> {
  const headers = await getAuthHeaders(activeRole);
  const response = await fetchWithRetry('/api/settings', {
    credentials: 'include',
    headers,
  });
  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(data?.error || 'تعذر جلب إعدادات النظام');
  }
  return data.settings || {};
}

// ==========================================
// Admin User Management & Audit Logs APIs
// ==========================================

export async function fetchAdminUsers(activeRole: UserRole): Promise<any[]> {
  const headers = await getAuthHeaders(activeRole);
  const response = await fetchWithRetry('/api/admin/users', {
    credentials: 'include',
    headers,
  });
  const data = await parseJsonSafe(response);

  if (!response.ok) {
    throw new Error(data?.error || 'تعذر جلب قائمة المستخدمين.');
  }

  return data.users || [];
}

export async function createAdminUser(userData: any, activeRole: UserRole): Promise<any> {
  const headers = await getAuthHeaders(activeRole);
  const response = await fetch('/api/admin/users', {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify(userData),
  });

  const data = await parseJsonSafe(response);

  if (!response.ok) {
    throw new Error(data?.error || 'تعذر إضافة المستخدم الجديد.');
  }

  return data;
}

export async function updateAdminUser(
  userId: string,
  userData: any,
  activeRole: UserRole
): Promise<any> {
  const headers = await getAuthHeaders(activeRole);
  const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    credentials: 'include',
    headers,
    body: JSON.stringify(userData),
  });

  const data = await parseJsonSafe(response);

  if (!response.ok) {
    throw new Error(data?.error || 'تعذر تعديل بيانات المستخدم.');
  }

  return data;
}

export async function deleteAdminUser(userId: string, activeRole: UserRole): Promise<any> {
  const headers = await getAuthHeaders(activeRole);
  const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    credentials: 'include',
    headers,
  });

  const data = await parseJsonSafe(response);

  if (!response.ok) {
    throw new Error(data?.error || 'تعذر حذف المستخدم.');
  }

  return data;
}

export async function toggleAdminUserStatus(userId: string, activeRole: UserRole): Promise<any> {
  const headers = await getAuthHeaders(activeRole);
  const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/toggle-status`, {
    method: 'POST',
    credentials: 'include',
    headers,
  });

  const data = await parseJsonSafe(response);

  if (!response.ok) {
    throw new Error(data?.error || 'تعذر تغيير حالة الحساب.');
  }

  return data;
}

export async function resetAdminUserPassword(
  userId: string,
  newPassword: string | undefined,
  activeRole: UserRole
): Promise<any> {
  const headers = await getAuthHeaders(activeRole);
  const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/reset-password`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({ newPassword }),
  });

  const data = await parseJsonSafe(response);

  if (!response.ok) {
    throw new Error(data?.error || 'تعذر إعادة تعيين كلمة المرور.');
  }

  return data;
}

export async function resendAdminUserInvite(userId: string, activeRole: UserRole): Promise<any> {
  const headers = await getAuthHeaders(activeRole);
  const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/resend-invite`, {
    method: 'POST',
    credentials: 'include',
    headers,
  });

  const data = await parseJsonSafe(response);

  if (!response.ok) {
    throw new Error(data?.error || 'تعذر إعادة إرسال بيانات الدعوة.');
  }

  return data;
}

export async function fetchAdminAuditLogs(activeRole: UserRole): Promise<any[]> {
  const headers = await getAuthHeaders(activeRole);
  const response = await fetchWithRetry('/api/admin/audit-logs', {
    credentials: 'include',
    headers,
  });
  const data = await parseJsonSafe(response);

  if (!response.ok) {
    throw new Error(data?.error || 'تعذر جلب سجل العمليات.');
  }

  return data.logs || [];
}
