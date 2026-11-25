import { UserRole, DepartmentType, DepartmentRole, ApplicationStatus } from '../types';

export type { DepartmentType, DepartmentRole, ApplicationStatus };

export interface DepartmentInfo {
  id: string;
  name: DepartmentType;
  managerTitle: string;
  roleKey: DepartmentRole;
  description: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  defaultManagerSignature: string;
  keywords: string[];
}

export const DEPARTMENTS: DepartmentInfo[] = [
  {
    id: 'dept_finance',
    name: 'إدارة المالية',
    managerTitle: 'مدير إدارة المالية',
    roleKey: 'dept_finance',
    description: 'الحسابات، الخزينة، التكاليف، القيود، والمراجعة المالية',
    color: 'emerald',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-900',
    borderColor: 'border-emerald-200',
    defaultManagerSignature: 'أ. كمال شريف (مدير إدارة المالية)',
    keywords: ['محاسب', 'مالي', 'خزينة', 'حسابات', 'أمين خزينة', 'مراجع', 'تكاليف', 'دفاتر', 'ضرائب'],
  },
  {
    id: 'dept_executive',
    name: 'إدارة التنفيذية',
    managerTitle: 'مدير إدارة التنفيذية',
    roleKey: 'dept_executive',
    description: 'الإدارة التنفيذية، إدارة العمليات، والإشراف العام على الفروع',
    color: 'zinc',
    badgeBg: 'bg-zinc-100',
    badgeText: 'text-[#111318]',
    borderColor: 'border-zinc-300',
    defaultManagerSignature: 'م. شريف المنياوي (مدير إدارة التنفيذية)',
    keywords: ['تنفيذي', 'تشغيل', 'مدير فرع', 'عمليات', 'مشرف عام', 'تطوير', 'إداري'],
  },
  {
    id: 'dept_tech',
    name: 'إدارة التقنية',
    managerTitle: 'مدير إدارة التقنية',
    roleKey: 'dept_tech',
    description: 'تقنية المعلومات، نظم نقاط البيع (POS)، الشبكات، والدعم الفني والبرمجة',
    color: 'zinc',
    badgeBg: 'bg-zinc-100',
    badgeText: 'text-zinc-900',
    borderColor: 'border-zinc-300',
    defaultManagerSignature: 'م. حازم الصاوي (مدير إدارة التقنية)',
    keywords: ['تقنية', 'مبرمج', 'it', 'شبكات', 'دعم فني', 'حاسب', 'كمبيوتر', 'سوفت وير', 'نظم', 'pos'],
  },
  {
    id: 'dept_services',
    name: 'إدارة الخدمات',
    managerTitle: 'مدير إدارة الخدمات',
    roleKey: 'dept_services',
    description: 'خدمة الصالة، الضيافة، التوصيل، الديليفري، والنظافة واللوجستيات',
    color: 'red',
    badgeBg: 'bg-red-50',
    badgeText: 'text-[#B91C1C]',
    borderColor: 'border-red-200',
    defaultManagerSignature: 'ك. حسام البدري (مدير إدارة الخدمات)',
    keywords: ['كابتن', 'صالة', 'ويتر', 'مقدم طلبات', 'توصيل', 'ديليفري', 'سائق', 'خدمات', 'استقبال', 'مضيف'],
  },
  {
    id: 'dept_production',
    name: 'إدارة الإنتاج',
    managerTitle: 'مدير إدارة الإنتاج',
    roleKey: 'dept_production',
    description: 'المطبخ، التجهيزات، الطهاة، الخبازين، وخطوط الإنتاج والتصنيع الغذائي',
    color: 'amber',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-950',
    borderColor: 'border-amber-200',
    defaultManagerSignature: 'شيف محمود الخولي (مدير إدارة الإنتاج)',
    keywords: ['شيف', 'طباخ', 'مساعد شيف', 'إنتاج', 'مطبخ', 'جزار', 'شواية', 'ساندوتشات', 'عامل إنتاج', 'حلواني', 'خباز'],
  },
  {
    id: 'dept_control',
    name: 'إدارة الرقابة',
    managerTitle: 'مدير إدارة الرقابة',
    roleKey: 'dept_control',
    description: 'مراقبة الجودة، سلامة الغذاء، التفتيش والمتابعة الميدانية والامتثال',
    color: 'red',
    badgeBg: 'bg-red-50',
    badgeText: 'text-[#991B1B]',
    borderColor: 'border-red-200',
    defaultManagerSignature: 'د. وليد الباز (مدير إدارة الرقابة والجودة)',
    keywords: ['رقابة', 'جودة', 'تفتيش', 'سلامة', 'مفتش', 'مراقب', 'أيزو', 'صحي', 'اشتراطات'],
  },
  {
    id: 'dept_marketing',
    name: 'إدارة التسويق',
    managerTitle: 'مدير إدارة التسويق',
    roleKey: 'dept_marketing',
    description: 'التسويق الرقمي، الهوية المؤسسية، الحملات الإعلانية وصناعة المحتوى',
    color: 'zinc',
    badgeBg: 'bg-zinc-100',
    badgeText: 'text-[#111318]',
    borderColor: 'border-zinc-300',
    defaultManagerSignature: 'أ. دينا السعدني (مدير إدارة التسويق)',
    keywords: ['تسويق', 'سوشيال ميديا', 'محتوى', 'إعلان', 'مصمم', 'ماركتنج', 'علاقات عامة', 'دعاية'],
  },
  {
    id: 'dept_sales',
    name: 'إدارة المبيعات',
    managerTitle: 'مدير إدارة المبيعات',
    roleKey: 'dept_sales',
    description: 'المبيعات، الكول سنتر، إدارة الطلبات، التعاقدات والخدمات الخارجية',
    color: 'zinc',
    badgeBg: 'bg-zinc-100',
    badgeText: 'text-zinc-900',
    borderColor: 'border-zinc-300',
    defaultManagerSignature: 'أ. تامر رضوان (مدير إدارة المبيعات)',
    keywords: ['مبيعات', 'كول سنتر', 'بائع', 'كاشير', 'حجوزات', 'تعاقدات', 'عملاء', 'ممثلة مبيعات'],
  },
];

export const DEPARTMENT_NAMES: DepartmentType[] = DEPARTMENTS.map((d) => d.name);

export function getDepartmentInfo(name?: string | null): DepartmentInfo | undefined {
  if (!name) return undefined;
  return DEPARTMENTS.find((d) => d.name === name);
}

export function getDepartmentByRole(role: UserRole): DepartmentInfo | undefined {
  return DEPARTMENTS.find((d) => d.roleKey === role);
}

export function isDepartmentManagerRole(role: UserRole): boolean {
  return (
    role === 'direct_manager' ||
    role === 'dept_finance' ||
    role === 'dept_executive' ||
    role === 'dept_tech' ||
    role === 'dept_services' ||
    role === 'dept_production' ||
    role === 'dept_control' ||
    role === 'dept_marketing' ||
    role === 'dept_sales'
  );
}

export function getDepartmentManagerTitle(deptOrRole?: DepartmentType | UserRole | string | null): string {
  if (!deptOrRole) return 'مدير الإدارة';
  const byName = getDepartmentInfo(deptOrRole);
  if (byName) return byName.managerTitle;
  const byRole = getDepartmentByRole(deptOrRole as UserRole);
  if (byRole) return byRole.managerTitle;
  return `مدير ${deptOrRole}`;
}

export function getRoleDisplayTitle(role?: UserRole | string | null): string {
  if (!role) return 'مستخدم النظام';
  switch (role) {
    case 'general_manager':
      return 'المدير العام';
    case 'hr_manager':
      return 'مدير الموارد البشرية';
    case 'hr':
      return 'الموارد البشرية';
    case 'direct_manager':
      return 'مدير الإدارة';
    case 'dept_finance':
      return 'مدير إدارة المالية';
    case 'dept_executive':
      return 'مدير إدارة التنفيذية';
    case 'dept_tech':
      return 'مدير إدارة التقنية';
    case 'dept_services':
      return 'مدير إدارة الخدمات';
    case 'dept_production':
      return 'مدير إدارة الإنتاج';
    case 'dept_control':
      return 'مدير إدارة الرقابة';
    case 'dept_marketing':
      return 'مدير إدارة التسويق';
    case 'dept_sales':
      return 'مدير إدارة المبيعات';
    case 'admin':
      return 'مدير النظام';
    default:
      return role;
  }
}

export function getDepartmentForRole(role: UserRole): DepartmentType | null {
  const dept = getDepartmentByRole(role);
  return dept ? dept.name : null;
}

/**
 * Smart automatic department suggestion based on position applied
 */
export function guessDepartmentFromPosition(position: string): DepartmentType {
  const cleanPos = (position || '').toLowerCase();
  for (const dept of DEPARTMENTS) {
    if (dept.keywords.some((kw) => cleanPos.includes(kw.toLowerCase()))) {
      return dept.name;
    }
  }
  // Default to Services (إدارة الخدمات) as primary restaurant floor / operations
  return 'إدارة الخدمات';
}

/**
 * Check if status represents waiting for any department manager
 */
export function isDeptPending(status?: string | null): boolean {
  if (!status) return false;
  return status === 'dept_pending' || (status.startsWith('dept_') && status.endsWith('_pending'));
}

/**
 * Maps department name to exact pending status key
 */
export function getDepartmentPendingStatus(deptName?: DepartmentType | string | null): ApplicationStatus {
  switch (deptName) {
    case 'إدارة المالية':
      return 'dept_finance_pending';
    case 'إدارة التنفيذية':
      return 'dept_executive_pending';
    case 'إدارة التقنية':
      return 'dept_tech_pending';
    case 'إدارة الخدمات':
      return 'dept_services_pending';
    case 'إدارة الإنتاج':
      return 'dept_production_pending';
    case 'إدارة الرقابة':
    case 'إدارة الجودة':
      return 'dept_control_pending';
    case 'إدارة التسويق':
      return 'dept_marketing_pending';
    case 'إدارة المبيعات':
      return 'dept_sales_pending';
    default:
      return 'dept_pending';
  }
}

/**
 * Returns executive Arabic label replacing "بانتظار مدير الإدارة" with the specific department manager
 */
export function getDeptPendingLabel(deptName?: string | null): string {
  switch (deptName) {
    case 'إدارة المالية':
      return 'بإنتظار مدير ادارة الماليه';
    case 'إدارة التنفيذية':
      return 'بإنتظار مدير ادارة التنفيذيه';
    case 'إدارة التقنية':
      return 'بإنتظار مدير ادارة التقنية';
    case 'إدارة الخدمات':
      return 'بإنتظار مدير ادارة الخدمات';
    case 'إدارة الإنتاج':
      return 'بإنتظار مدير ادارة الإنتاج';
    case 'إدارة الرقابة':
    case 'إدارة الجودة':
      return 'بإنتظار مدير ادارة الرقابة والجودة';
    case 'إدارة التسويق':
      return 'بإنتظار مدير ادارة التسويق';
    case 'إدارة المبيعات':
      return 'بإنتظار مدير ادارة المبيعات';
    default:
      return deptName ? `بإنتظار مدير ${deptName}` : 'بإنتظار مدير الإدارة';
  }
}

/**
 * Matches an applicant against a department filter key (dept_finance, dept_executive, etc.)
 */
export function matchesDeptFilter(
  app: { status: string; assignedDepartment?: string | null },
  filterKey: string
): boolean {
  if (!isDeptPending(app.status)) return false;
  if (filterKey === 'dept') return true;
  if (filterKey === 'dept_finance') return app.assignedDepartment === 'إدارة المالية' || app.status === 'dept_finance_pending';
  if (filterKey === 'dept_executive') return app.assignedDepartment === 'إدارة التنفيذية' || app.status === 'dept_executive_pending';
  if (filterKey === 'dept_tech') return app.assignedDepartment === 'إدارة التقنية' || app.status === 'dept_tech_pending';
  if (filterKey === 'dept_services') return app.assignedDepartment === 'إدارة الخدمات' || app.status === 'dept_services_pending';
  if (filterKey === 'dept_production') return app.assignedDepartment === 'إدارة الإنتاج' || app.status === 'dept_production_pending';
  if (filterKey === 'dept_control' || filterKey === 'dept_quality') return app.assignedDepartment === 'إدارة الرقابة' || (app.assignedDepartment as any) === 'إدارة الجودة' || app.status === 'dept_control_pending';
  if (filterKey === 'dept_marketing') return app.assignedDepartment === 'إدارة التسويق' || app.status === 'dept_marketing_pending';
  if (filterKey === 'dept_sales') return app.assignedDepartment === 'إدارة المبيعات' || app.status === 'dept_sales_pending';
  return false;
}



