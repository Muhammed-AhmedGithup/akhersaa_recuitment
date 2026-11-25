/**
 * Data structures for Job Application and 4-Tier Management Approval Flow
 * (HR Specialist -> HR Manager -> Direct Manager -> General Manager)
 * Based on Akher Sa'a Special company evaluation sheet & recruitment pipeline
 */

export type DepartmentType =
  | 'إدارة المالية'
  | 'إدارة التنفيذية'
  | 'إدارة التقنية'
  | 'إدارة الخدمات'
  | 'إدارة الإنتاج'
  | 'إدارة الرقابة'
  | 'إدارة التسويق'
  | 'إدارة المبيعات';

export type DepartmentRole =
  | 'dept_finance' // مدير إدارة المالية
  | 'dept_executive' // مدير إدارة التنفيذية
  | 'dept_tech' // مدير إدارة التقنية
  | 'dept_services' // مدير إدارة الخدمات
  | 'dept_production' // مدير إدارة الإنتاج
  | 'dept_control' // مدير إدارة الرقابة
  | 'dept_marketing' // مدير إدارة التسويق
  | 'dept_sales'; // مدير إدارة المبيعات

export type EvaluationResult = 'مستوى أول' | 'مستوى ثاني' | 'مستوى ثالث' | 'انتظار' | 'مرفوض';

export type WorkflowSignatureStage = 'hr' | 'hr_manager' | 'direct_manager' | 'general_manager';

export interface ElectronicSignature {
  id: string;
  applicationId?: string;
  userId: string;
  fullName: string; // الاسم الكامل الموثق من قاعدة البيانات
  email: string; // البريد الإلكتروني الموثق
  role: UserRole; // الصلاحية
  jobTitle: string; // المسمى الوظيفي الموثق
  department: string; // الإدارة التابع لها
  stage: WorkflowSignatureStage; // المرحلة التي تم اعتماد الاستمارة فيها
  stageLabel: string; // اسم المرحلة بالعربية
  action: 'approve' | 'reject' | 'waitlist' | 'forward';
  decision: string;
  signedAt: string; // ISO string
  signedAtArabic: string; // تاريخ ووقت التوقيع بالعربية
  immutable: true; // توقيع إلكتروني موثق غير قابل للتعديل
}

export interface StageSignatures {
  hr?: ElectronicSignature;
  hr_manager?: ElectronicSignature;
  direct_manager?: ElectronicSignature;
  general_manager?: ElectronicSignature;
}

export type SalaryProposalStage = 'hr_manager' | 'direct_manager';

export type FinalSalarySource =
  | 'level1'
  | 'level2'
  | 'level3'
  | 'hr_manager_proposal'
  | 'direct_manager_proposal';

export interface SalaryProposal {
  id?: string;
  applicationId?: string;
  stage: SalaryProposalStage;
  proposerUserId?: string | null;
  proposerName: string;
  proposerEmail?: string;
  proposerRole: UserRole | string;
  proposerDepartment?: string | null;
  proposedAmount: number;
  currency: string;
  formattedAmount: string;
  notes?: string;
  status: 'active' | 'selected' | 'not_selected';
  proposedAt: string; // ISO string
  proposedAtArabic: string;
  updatedAt?: string;
}

export interface ApprovalHistoryEntry {
  id: string;
  applicationId: string;
  userId: string;
  userName?: string;
  userEmail: string;
  role: UserRole;
  jobTitle?: string;
  department?: DepartmentType | string | null;
  stage?: WorkflowSignatureStage;
  stageLabel?: string;
  action: 'approve' | 'reject' | 'waitlist' | 'forward' | 'modify' | 'create';
  decision: EvaluationResult | string;
  oldStatus: ApplicationStatus | string;
  newStatus: ApplicationStatus;
  timestamp: string; // ISO string
  dateArabic: string;
  notice?: string;
  signature?: string;
  electronicSignature?: ElectronicSignature;
  salary?: string | null;
  metadata?: {
    proposedSalaryAmount?: number;
    proposedSalaryFormatted?: string;
    proposalStage?: SalaryProposalStage;
    finalSalarySource?: FinalSalarySource;
    selectedSalaryLevel?: SalaryLevelKey | null;
    finalApprovedSalary?: string;
    proposalsSnapshot?: {
      hrManager?: { amount: number; formatted: string; proposerName: string; proposedAtArabic: string } | null;
      directManager?: { amount: number; formatted: string; proposerName: string; department?: string | null; proposedAtArabic: string } | null;
    };
  };
}

export interface SectionReview {
  positives: string;
  negatives: string;
  result: EvaluationResult | null;
  notice: string;
  signature: string;
  reviewedAt?: string;
  department?: DepartmentType;
  managerTitle?: string;
  electronicSignature?: ElectronicSignature;
}

export type SalaryLevelKey = 'level1' | 'level2' | 'level3';

export interface SalaryStructureConfig {
  id: string;
  level1Salary: number | null;
  level2Salary: number | null;
  level3Salary: number | null;
  currency: string;
  isApproved: boolean;
  updatedByUserId?: string | null;
  updatedByName?: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface SalaryStructureHistoryEntry {
  id: string;
  structureId: string;
  userId?: string | null;
  userName: string;
  userEmail: string;
  userRole: string;
  previousValues: {
    level1Salary: number | null;
    level2Salary: number | null;
    level3Salary: number | null;
  };
  newValues: {
    level1Salary: number | null;
    level2Salary: number | null;
    level3Salary: number | null;
  };
  notes?: string;
  dateArabic: string;
  timestamp: string;
}

export interface GeneralManagerApproval {
  salaryLevel1: string; // الراتب المعتمد للمستوى الأول
  salaryLevel2: string; // الراتب المعتمد للمستوى الثاني
  salaryLevel3: string; // الراتب المعتمد للمستوى الثالث
  level1Amount?: number | null; // القيمة الرقمية للمستوى الأول داخل الاستمارة
  level2Amount?: number | null; // القيمة الرقمية للمستوى الثاني داخل الاستمارة
  level3Amount?: number | null; // القيمة الرقمية للمستوى الثالث داخل الاستمارة
  currency?: string; // العملة المعتمدة (افتراضي ج.م)
  salaryStructureUpdatedBy?: string;
  salaryStructureUpdatedAt?: string;
  selectedSalaryLevel?: SalaryLevelKey | null; // المستوى الوظيفي المختار في الاعتماد النهائي
  finalSalarySource?: FinalSalarySource | null; // مصدر الراتب النهائي المعتمد
  finalApprovedSalaryAmount?: number | null; // القيمة الرقمية للراتب النهائي المعتمد
  finalApprovedSalary?: string; // الراتب النهائي المقرر والمثبت داخل الاستمارة
  isSalaryLocked?: boolean; // قفل نهائي يمنع أي تغيير للراتب بعد اعتماد المدير العام
  salaryLockedAt?: string;
  salaryLockedBy?: string;
  finalSalaryApprovedBy?: string;
  finalSalaryApprovedAt?: string;
  result: EvaluationResult | null;
  notice: string;
  signature: string;
  reviewedAt?: string;
  electronicSignature?: ElectronicSignature;
}

export function formatSalaryAmount(amount: number | null | undefined, currency = 'ج.م'): string {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    return '';
  }
  return `${Math.round(amount).toLocaleString('en-US')} ${currency}`;
}

export function parseSalaryNumeric(raw: unknown): number | null {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : null;
  }
  if (typeof raw === 'string') {
    const cleaned = raw.replace(/[^0-9.]/g, '');
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
  }
  return null;
}

export function getSalaryForLevel(
  structure: SalaryStructureConfig | null | undefined,
  level: SalaryLevelKey
): number | null {
  if (!structure) return null;
  if (level === 'level1') return structure.level1Salary ?? null;
  if (level === 'level2') return structure.level2Salary ?? null;
  if (level === 'level3') return structure.level3Salary ?? null;
  return null;
}

export function getApplicationSalaryForLevel(
  gmReview: GeneralManagerApproval | null | undefined,
  level: SalaryLevelKey
): number | null {
  if (!gmReview) return null;
  if (level === 'level1') {
    return parseSalaryNumeric(gmReview.level1Amount) ?? parseSalaryNumeric(gmReview.salaryLevel1);
  }
  if (level === 'level2') {
    return parseSalaryNumeric(gmReview.level2Amount) ?? parseSalaryNumeric(gmReview.salaryLevel2);
  }
  return parseSalaryNumeric(gmReview.level3Amount) ?? parseSalaryNumeric(gmReview.salaryLevel3);
}

export function isApplicationSalaryConfigured(
  gmReview: GeneralManagerApproval | null | undefined,
  level?: SalaryLevelKey | null
): boolean {
  if (!gmReview) return false;
  if (level) {
    const amt = getApplicationSalaryForLevel(gmReview, level);
    return typeof amt === 'number' && amt > 0;
  }
  const l1 = getApplicationSalaryForLevel(gmReview, 'level1');
  const l2 = getApplicationSalaryForLevel(gmReview, 'level2');
  const l3 = getApplicationSalaryForLevel(gmReview, 'level3');
  return Boolean(l1 && l1 > 0 && l2 && l2 > 0 && l3 && l3 > 0);
}

export function decisionToSalaryLevel(decision?: string | null): SalaryLevelKey | null {
  if (decision === 'مستوى أول') return 'level1';
  if (decision === 'مستوى ثاني') return 'level2';
  if (decision === 'مستوى ثالث') return 'level3';
  return null;
}

export function salaryLevelToDecision(level: SalaryLevelKey): EvaluationResult {
  if (level === 'level1') return 'مستوى أول';
  if (level === 'level2') return 'مستوى ثاني';
  return 'مستوى ثالث';
}

export function salaryLevelToLabel(level: SalaryLevelKey): string {
  if (level === 'level1') return 'المستوى الأول (Level 1)';
  if (level === 'level2') return 'المستوى الثاني (Level 2)';
  return 'المستوى الثالث (Level 3)';
}

export function finalSalarySourceToLabel(source?: FinalSalarySource | null): string {
  switch (source) {
    case 'level1':
      return 'المستوى الأول من هيكل الرواتب';
    case 'level2':
      return 'المستوى الثاني من هيكل الرواتب';
    case 'level3':
      return 'المستوى الثالث من هيكل الرواتب';
    case 'hr_manager_proposal':
      return 'مقترح مدير الموارد البشرية';
    case 'direct_manager_proposal':
      return 'مقترح مدير الإدارة';
    default:
      return '';
  }
}

export function isApprovedStatus(status?: string | null): boolean {
  return typeof status === 'string' && status.startsWith('approved');
}

export type ApplicationStatus =
  | 'new' // جديد
  | 'hr_pending' // بانتظار الموارد البشرية
  | 'hr_manager_pending' // بانتظار مدير الموارد البشرية
  | 'dept_pending' // بانتظار مدير الإدارة المختصة
  | 'dept_finance_pending' // بإنتظار مدير ادارة الماليه
  | 'dept_executive_pending' // بإنتظار مدير ادارة التنفيذيه
  | 'dept_tech_pending' // بإنتظار مدير إدارة التقنية
  | 'dept_services_pending' // بإنتظار مدير ادارة الخدمات
  | 'dept_production_pending' // بإنتظار مدير ادارة الإنتاج
  | 'dept_control_pending' // بإنتظار مدير ادارة الرقابة
  | 'dept_marketing_pending' // بإنتظار مدير ادارة التسويق
  | 'dept_sales_pending' // بإنتظار مدير ادارة المبيعات
  | 'gm_pending' // بانتظار المدير العام
  | 'approved_lvl1' // معتمد - مستوى أول
  | 'approved_lvl2' // معتمد - مستوى ثاني
  | 'approved_lvl3' // معتمد - مستوى ثالث
  | 'approved_proposal' // معتمد - راتب مقترح
  | 'waitlist' // قائمة الانتظار
  | 'rejected'; // مرفوض

export interface JobApplication {
  id: string;
  recordNumber: string; // رقم القيد (e.g. 2026/041)
  timestamp: string; // وقت التقديم
  todayDate?: string;

  // Personal details
  fullName: string;
  nationalId: string;
  birthDate: string;
  gender: string;
  address: string;
  phone: string;
  emergencyContact: string;
  qualification: string;
  qualificationDate: string;
  maritalStatus: string;
  positionApplied: string;
  internalReferrals: string;

  // Previous Experience (جهة العمل الأولى)
  prevCompany: string;
  prevPosition: string;
  prevManager: string;
  experienceYears: string;
  workHours: string;
  prevSalary: string;
  reasonForLeaving: string;

  // Previous Experience 2 (جهة العمل السابقة الثانية)
  prevCompany2?: string;
  prevPosition2?: string;
  prevManager2?: string;
  experienceYears2?: string;
  workHours2?: string;
  reasonForLeaving2?: string;

  // Previous Experience 3 (جهة العمل السابقة الثالثة)
  prevCompany3?: string;
  prevPosition3?: string;
  prevManager3?: string;
  experienceYears3?: string;
  reasonForLeaving3?: string;

  // Skills & Other
  computerSkills: string;
  englishLevel: string;
  drivingLicense: string;
  drivingLicenseDegree?: string; // درجة رخصة القيادة (أولى / ثانية / ثالثة / خاصة / مهنية / دراجة نارية)
  smoking: string;
  chronicDiseases: string;
  acknowledgement: string;
  score?: string;

  // Additional New Form Fields (الاستمارة الموسعة)
  isPraying?: string; // هل انت مصلي؟ (نعم / لا)
  militaryStatus?: string; // الموقف من التجنيد (أدى الخدمة / إعفاء نهائي / إعفاء مؤقت / غير مطلوب / مؤجل)
  expectedSalary?: string; // الراتب المتوقع
  personalPhotoUrl?: string; // رابط الصورة الشخصية

  // Assigned Department (الإدارة المختصة الموجه إليها المرشح بقرار مدير الموارد البشرية)
  assignedDepartment?: DepartmentType;
  assignedDepartmentManager?: string; // مثال: مدير إدارة المبيعات

  // Company Management Approval (خاص بإدارة الشركة - مسار التوظيف الرباعي)
  // 1. الموارد البشرية
  hrReview: SectionReview;
  // 2. مدير الموارد البشرية
  hrManagerReview: SectionReview;
  // 3. مدير الإدارة المختصة (المالية، التنفيذية، الخدمات، الإنتاج، الرقابة، التسويق، المبيعات)
  directManagerReview: SectionReview;
  // 4. المدير العام (الاعتماد المالي والراتب)
  generalManagerReview: GeneralManagerApproval;
  // السجل المستقل والمحمي للتوقيعات الإلكترونية حسب المرحلة
  signatures?: StageSignatures;
  // مقترحات الرواتب المسجلة لكل استمارة في قاعدة البيانات
  hrManagerSalaryProposal?: SalaryProposal | null;
  directManagerSalaryProposal?: SalaryProposal | null;

  // Pipeline Status
  status: ApplicationStatus;
  lastActionDate?: string; // تاريخ ووقت اتخاذ آخر إجراء (قبول أو رفض أو اعتماد)
  lastActionType?: string; // نوع آخر إجراء (قبول / رفض / إحالة / اعتماد)
  notes?: string;
  tags?: string[];
  approvalHistory?: ApprovalHistoryEntry[];
  lastUpdated: string;
}

export type UserRole =
  | 'hr'
  | 'hr_manager'
  | 'direct_manager' // مدير الإدارة (شامل لكافة الإدارات)
  | DepartmentRole
  | 'general_manager'
  | 'admin';

export interface AppNotification {
  id: string;
  applicantId: string;
  applicantName: string;
  position: string;
  targetRole: UserRole;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  priority: 'high' | 'normal';
}

export type AccountStatus = 'active' | 'inactive' | 'suspended' | 'resigned';

export interface SystemRoleDefinition {
  key: UserRole;
  titleArabic: string;
  titleEnglish: string;
  defaultDepartment: DepartmentType | 'الإدارة العامة' | 'إدارة الموارد البشرية';
  description: string;
  color: string;
  level: number;
}

export const SYSTEM_ROLES: SystemRoleDefinition[] = [
  {
    key: 'admin',
    titleArabic: 'مدير النظام الأعلى (Super Admin)',
    titleEnglish: 'Super Admin',
    defaultDepartment: 'الإدارة العامة',
    description: 'صلاحيات كاملة لإدارة المستخدمين، الأدوار، السجلات، وتجاوز كافة العمليات',
    color: 'emerald',
    level: 1,
  },
  {
    key: 'general_manager',
    titleArabic: 'المدير العام (General Manager)',
    titleEnglish: 'General Manager',
    defaultDepartment: 'الإدارة العامة',
    description: 'الاعتماد النهائي لطلبات التوظيف، إقرار الرواتب، والقرارات الاستراتيجية',
    color: 'amber',
    level: 2,
  },
  {
    key: 'hr_manager',
    titleArabic: 'مدير الموارد البشرية (HR Manager)',
    titleEnglish: 'HR Manager',
    defaultDepartment: 'إدارة الموارد البشرية',
    description: 'مراجعة واعتماد طلبات الموارد البشرية وإحالتها لمديري الإدارات المختصة',
    color: 'teal',
    level: 3,
  },
  {
    key: 'dept_finance',
    titleArabic: 'مدير إدارة المالية (Finance Department Manager)',
    titleEnglish: 'Finance Department Manager',
    defaultDepartment: 'إدارة المالية',
    description: 'المقابلة الفنية واعتماد طلبات وظائف الحسابات والخزينة والتكاليف',
    color: 'emerald',
    level: 4,
  },
  {
    key: 'dept_executive',
    titleArabic: 'مدير إدارة التنفيذية (Executive Department Manager)',
    titleEnglish: 'Executive Department Manager',
    defaultDepartment: 'إدارة التنفيذية',
    description: 'المقابلة الفنية والتقييم لوظائف التشغيل وإدارة العمليات والفروع',
    color: 'indigo',
    level: 4,
  },
  {
    key: 'dept_tech',
    titleArabic: 'مدير إدارة التقنية (Technical Department Manager)',
    titleEnglish: 'Technical Department Manager',
    defaultDepartment: 'إدارة التقنية',
    description: 'المقابلة الفنية واعتماد وظائف تقنية المعلومات، الشبكات، ونظم نقاط البيع',
    color: 'cyan',
    level: 4,
  },
  {
    key: 'dept_services',
    titleArabic: 'مدير إدارة الخدمات (Services Department Manager)',
    titleEnglish: 'Services Department Manager',
    defaultDepartment: 'إدارة الخدمات',
    description: 'المقابلة الفنية وتقييم وظائف الصالة، الضيافة، التوصيل، واللوجستيات',
    color: 'sky',
    level: 4,
  },
  {
    key: 'dept_production',
    titleArabic: 'مدير إدارة الإنتاج (Production Department Manager)',
    titleEnglish: 'Production Department Manager',
    defaultDepartment: 'إدارة الإنتاج',
    description: 'المقابلة الفنية واختبارات الطهاة والخبازين وتجهيزات المطابخ وخطوط الإنتاج',
    color: 'amber',
    level: 4,
  },
  {
    key: 'dept_control',
    titleArabic: 'مدير إدارة الرقابة والجودة (Quality & Control Department Manager)',
    titleEnglish: 'Quality & Control Department Manager',
    defaultDepartment: 'إدارة الرقابة',
    description: 'المقابلة الفنية وتقييم وظائف الرقابة، سلامة الغذاء، ومفتشي الجودة',
    color: 'rose',
    level: 4,
  },
  {
    key: 'dept_marketing',
    titleArabic: 'مدير إدارة التسويق (Marketing Department Manager)',
    titleEnglish: 'Marketing Department Manager',
    defaultDepartment: 'إدارة التسويق',
    description: 'المقابلة الفنية واعتماد وظائف التسويق، المحتوى، والتصميم والإعلان',
    color: 'purple',
    level: 4,
  },
  {
    key: 'dept_sales',
    titleArabic: 'مدير إدارة المبيعات (Sales Department Manager)',
    titleEnglish: 'Sales Department Manager',
    defaultDepartment: 'إدارة المبيعات',
    description: 'المقابلة الفنية وتقييم كفاءات الكول سنتر، المبيعات، وممثلي خدمة العملاء',
    color: 'teal',
    level: 4,
  },
  {
    key: 'hr',
    titleArabic: 'أخصائي الموارد البشرية (HR Specialist)',
    titleEnglish: 'HR Specialist',
    defaultDepartment: 'إدارة الموارد البشرية',
    description: 'الفحص المبدئي للاستمارات والتدقيق في السيرة الذاتية والشروط الأولية',
    color: 'emerald',
    level: 5,
  },
];

export interface AppUser {
  id: string;
  email: string;
  fullName: string;
  displayName?: string;
  phoneNumber?: string;
  role: UserRole;
  jobTitle?: string;
  department: string;
  status: AccountStatus;
  photoURL?: string;
  isSuperAdmin?: boolean;
  createdAt?: string;
  lastLoginAt?: string;
  token?: string;
  permissions?: ManagerPermissions;
}

export type UserType =
  | 'super_admin'
  | 'system_admin'
  | 'hr_officer'
  | 'hr_specialist'
  | 'dept_manager'
  | 'general_manager'
  | 'executive';

export type HrPermissionKey =
  | 'hr_sync_google_sheets'
  | 'hr_export_excel'
  | 'hr_create_applications'
  | 'hr_edit_applications'
  | 'hr_manage_salary_structure';

export type GeneralPermissionKey =
  | 'view_data'
  | 'add_data'
  | 'edit_data'
  | 'delete_data'
  | 'view_reports'
  | 'approve_decisions'
  | 'manage_employees'
  | 'manage_identities'
  | 'manage_departments';

export interface ManagerPermissions {
  view_data: boolean;
  add_data: boolean;
  edit_data: boolean;
  delete_data: boolean;
  view_reports: boolean;
  approve_decisions: boolean;
  manage_employees: boolean;
  manage_identities: boolean;
  manage_departments: boolean;
  // Independent HR Permissions Group (HR Role only by default)
  hr_sync_google_sheets?: boolean;
  hr_export_excel?: boolean;
  hr_create_applications?: boolean;
  hr_edit_applications?: boolean;
  hr_manage_salary_structure?: boolean;
}

export const HR_PERMISSION_KEYS: HrPermissionKey[] = [
  'hr_sync_google_sheets',
  'hr_export_excel',
  'hr_create_applications',
  'hr_edit_applications',
  'hr_manage_salary_structure',
];

export const GENERAL_PERMISSION_KEYS: GeneralPermissionKey[] = [
  'view_data',
  'approve_decisions',
  'view_reports',
  'delete_data',
  'manage_employees',
  'manage_identities',
  'manage_departments',
  'add_data',
  'edit_data',
];

export const HR_PERMISSION_LABELS: Record<HrPermissionKey, { title: string; description: string }> = {
  hr_sync_google_sheets: {
    title: 'سحب واستيراد Google Sheets',
    description: 'سحب وتحديث بيانات المتقدمين من Google Sheets',
  },
  hr_export_excel: {
    title: 'تصدير ملفات Excel',
    description: 'تصدير جميع الاستمارات أو المحددة أو حسب الحالة إلى Excel',
  },
  hr_create_applications: {
    title: 'إدخال استمارات التوظيف',
    description: 'إضافة وتسجيل استمارات المتقدمين الجدد بالنظام',
  },
  hr_edit_applications: {
    title: 'تعديل واستكمال الاستمارات',
    description: 'تصحيح واستكمال بيانات الاستمارات قبل إحالتها للمرحلة التالية',
  },
  hr_manage_salary_structure: {
    title: 'إدارة هيكل الرواتب',
    description: 'إدخال وتعديل رواتب المستويات الثلاثة المعتمدة لقرارات المدير العام',
  },
};

export const PERMISSION_LABELS: Record<keyof ManagerPermissions, { title: string; description: string }> = {
  view_data: { title: 'استعراض البيانات', description: 'الاطلاع على طلبات التوظيف والبيانات' },
  add_data: { title: 'إضافة بيانات عامة', description: 'صلاحية عامة للإضافة في النظام' },
  edit_data: { title: 'تعديل بيانات عامة', description: 'صلاحية عامة للتحديث في النظام' },
  delete_data: { title: 'حذف السجلات', description: 'صلاحية حذف السجلات والبيانات' },
  view_reports: { title: 'عرض التقارير', description: 'الاطلاع على الإحصائيات ولوحات الأداء' },
  approve_decisions: { title: 'اعتماد القرارات', description: 'الموافقة، الرفض، أو تحويل الطلبات' },
  manage_employees: { title: 'إدارة الموظفين', description: 'متابعة وتعيين شؤون الموظفين' },
  manage_identities: { title: 'إدارة المستخدمين', description: 'إضافة وتعديل وحذف مستخدمي النظام' },
  manage_departments: { title: 'إدارة الأقسام', description: 'تعديل وتعيين إدارات المنظومة' },
  ...HR_PERMISSION_LABELS,
};

export const SUPER_ADMIN_EMAIL = 'ma1927393@gmail.com';

export const FULL_PERMISSIONS: ManagerPermissions = {
  view_data: true,
  add_data: false,
  edit_data: false,
  delete_data: true,
  view_reports: true,
  approve_decisions: true,
  manage_employees: true,
  manage_identities: false,
  manage_departments: true,
  hr_sync_google_sheets: false,
  hr_export_excel: false,
  hr_create_applications: false,
  hr_edit_applications: false,
  hr_manage_salary_structure: false,
};

export const SYSTEM_ADMIN_FULL_PERMISSIONS: ManagerPermissions = {
  view_data: true,
  add_data: true,
  edit_data: true,
  delete_data: true,
  view_reports: true,
  approve_decisions: true,
  manage_employees: true,
  manage_identities: true,
  manage_departments: true,
  hr_sync_google_sheets: true,
  hr_export_excel: true,
  hr_create_applications: true,
  hr_edit_applications: true,
  hr_manage_salary_structure: true,
};

export const DEFAULT_HR_PERMISSIONS: ManagerPermissions = {
  view_data: true,
  add_data: true,
  edit_data: true,
  delete_data: false,
  view_reports: true,
  approve_decisions: true,
  manage_employees: false,
  manage_identities: false,
  manage_departments: false,
  hr_sync_google_sheets: true,
  hr_export_excel: true,
  hr_create_applications: true,
  hr_edit_applications: true,
  hr_manage_salary_structure: true,
};

export const DEFAULT_DEPT_MANAGER_PERMISSIONS: ManagerPermissions = {
  view_data: true,
  add_data: false,
  edit_data: false,
  delete_data: false,
  view_reports: true,
  approve_decisions: true,
  manage_employees: true,
  manage_identities: false,
  manage_departments: false,
  hr_sync_google_sheets: false,
  hr_export_excel: false,
  hr_create_applications: false,
  hr_edit_applications: false,
  hr_manage_salary_structure: false,
};

export const DEFAULT_EMPLOYEE_PERMISSIONS: ManagerPermissions = {
  view_data: true,
  add_data: false,
  edit_data: false,
  delete_data: false,
  view_reports: false,
  approve_decisions: false,
  manage_employees: false,
  manage_identities: false,
  manage_departments: false,
  hr_sync_google_sheets: false,
  hr_export_excel: false,
  hr_create_applications: false,
  hr_edit_applications: false,
  hr_manage_salary_structure: false,
};

export function getDefaultPermissionsForRole(role: UserRole): ManagerPermissions {
  if (role === 'admin') {
    return { ...SYSTEM_ADMIN_FULL_PERMISSIONS };
  }
  if (role === 'general_manager') {
    return { ...FULL_PERMISSIONS };
  }
  if (
    role === 'hr_manager' ||
    role === 'direct_manager' ||
    (typeof role === 'string' && role.startsWith('dept_'))
  ) {
    return { ...DEFAULT_DEPT_MANAGER_PERMISSIONS };
  }
  if (role === 'hr') {
    return { ...DEFAULT_HR_PERMISSIONS };
  }
  return { ...DEFAULT_EMPLOYEE_PERMISSIONS };
}

/**
 * Authoritative HR Permissions evaluator used across Backend & Frontend.
 * - System Admin (role === 'admin' or isSuperAdmin === true) ALWAYS inherits 100% of HR Permissions.
 * - All other roles (GM, HR Manager, Department Managers) remain strictly isolated unless explicitly granted in PostgreSQL.
 */
export function hasHrPermission(
  user: {
    role?: UserRole | string;
    baseRole?: UserRole | string;
    isSuperAdmin?: boolean;
    permissions?: Partial<ManagerPermissions> | null;
  } | null | undefined,
  permKey: HrPermissionKey
): boolean {
  if (!user) return false;
  const actualRole = user.baseRole || user.role;
  if (user.isSuperAdmin || actualRole === 'admin') {
    return true;
  }
  const perms = user.permissions;
  if (perms && typeof perms[permKey] === 'boolean') {
    return Boolean(perms[permKey]);
  }
  return actualRole === 'hr';
}

export type IdentityStatus = AccountStatus;


export interface UserIdentity {
  id: string; // Document ID
  identityNumber: string; // رقم الهوية الفريد e.g. "USR-001"
  fullName: string; // الاسم الكامل
  displayName?: string;
  username?: string; // اسم المستخدم (غير قابل للتعديل)
  email: string; // البريد الإلكتروني (فريد)
  phoneNumber?: string; // رقم الهاتف
  department: string; // الإدارة التابعة
  role: UserRole; // الدور الوظيفي من الأدوار المعتمدة
  status: AccountStatus; // حالة الحساب: نشط (active) / معطل (inactive)
  userType?: UserType;
  jobTitle?: string;
  passwordHash?: string; // Salted PBKDF2 hash (never plaintext)
  passwordSalt?: string; // Random cryptographic salt
  permissions?: ManagerPermissions;
  officialSignature?: string;
  isGoogleUser?: boolean;
  isSuperAdmin?: boolean;
  createdAt: string; // ISO date string
  createdDateArabic: string;
  updatedAt: string;
  lastLoginAt?: string;
  notes?: string;
}

export interface CompanyDepartment {
  id: string;
  name: string;
  code: string;
  description: string;
  managerIdentityId?: string;
  managerName?: string;
  managerEmail?: string;
  roleKey: UserRole;
  employeeCount?: number;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  performedByName?: string;
  performedByEmail?: string;
  performedByRole?: string;
  action:
    | 'USER_CREATED'
    | 'USER_UPDATED'
    | 'USER_DELETED'
    | 'USER_STATUS_CHANGED'
    | 'USER_ROLE_CHANGED'
    | 'PASSWORD_RESET'
    | 'PASSWORD_INVITE_SENT'
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILED'
    | 'LOGOUT'
    | 'APPLICATION_APPROVED'
    | 'APPLICATION_REJECTED'
    | 'APPLICATION_FORWARDED'
    | 'APPLICATION_WAITLISTED'
    | 'APPLICATION_CREATED'
    | 'APPLICATION_UPDATED'
    | 'APPLICATION_DELETED'
    | 'GOOGLE_SHEETS_IMPORT'
    | 'EXCEL_EXPORT'
    | 'SALARY_STRUCTURE_UPDATED'
    | 'SALARY_PROPOSAL_SAVED'
    | 'CREATE_IDENTITY'
    | 'UPDATE_IDENTITY'
    | 'SUSPEND_IDENTITY'
    | 'ACTIVATE_IDENTITY'
    | 'DELETE_IDENTITY'
    | 'CREATE_DEPARTMENT'
    | 'DELETE_DEPARTMENT';
  timestamp: string; // ISO date string
  dateArabic: string;
  targetId?: string;
  targetType: 'user' | 'application' | 'security' | 'department' | 'identity' | 'salary_structure';
  targetName?: string;
  previousValue?: any;
  newValue?: any;
  details: string; // الوصف التوضيحي للعملية بالعربية
  metadata?: Record<string, any>;
}


