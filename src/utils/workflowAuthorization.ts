import {
  UserRole,
  DepartmentType,
  ApplicationStatus,
  JobApplication,
  EvaluationResult,
  ApprovalHistoryEntry,
  FinalSalarySource,
  isApprovedStatus,
} from '../types';
import {
  isDeptPending,
  getDepartmentPendingStatus,
  getDepartmentForRole,
  isDepartmentManagerRole,
  getDepartmentManagerTitle,
} from './departments';

export interface AuthorizationCheckResult {
  allowed: boolean;
  statusCode: number; // 200, 400, 403, 404
  reason?: string;
  targetStatus?: ApplicationStatus;
}

const VALID_TARGET_STATUSES: ApplicationStatus[] = [
  'new',
  'hr_pending',
  'hr_manager_pending',
  'dept_pending',
  'dept_finance_pending',
  'dept_executive_pending',
  'dept_tech_pending',
  'dept_services_pending',
  'dept_production_pending',
  'dept_control_pending',
  'dept_marketing_pending',
  'dept_sales_pending',
  'gm_pending',
  'approved_lvl1',
  'approved_lvl2',
  'approved_lvl3',
  'approved_proposal',
  'waitlist',
  'rejected',
];

/**
 * Normalizes department string for robust comparison
 */
export function normalizeDepartmentName(name?: string | null): string {
  if (!name) return '';
  const clean = name.trim().replace(/^إدارة\s+/, '').replace(/^ادارة\s+/, '');
  if (
    clean === 'الرقابة' ||
    clean === 'الجودة' ||
    clean === 'الرقابة والجودة' ||
    clean === 'الرقابة / الجودة' ||
    clean.includes('رقابة') ||
    clean.includes('جودة')
  ) {
    return 'الرقابة_والجودة';
  }
  return clean;
}

/**
 * Checks if two department names match
 */
export function doesDepartmentMatch(deptA?: string | null, deptB?: string | null): boolean {
  if (!deptA || !deptB) return false;
  if (deptA === deptB) return true;
  return normalizeDepartmentName(deptA) === normalizeDepartmentName(deptB);
}

/**
 * Determines whether a user with a given role and department is permitted to VIEW an application
 * "بحيث كل دور يشوف فقط الاستمارات اللي في انتظار مراجعته"
 */
export function canUserViewApplication(
  role: UserRole,
  userDept: string | null | undefined,
  app: JobApplication
): boolean {
  if (role === 'admin') return true;

  if (role === 'general_manager') {
    // In GM pending queue: GM views applications awaiting final GM decision
    return app.status === 'gm_pending';
  }

  if (role === 'hr') {
    // HR Specialist views applications awaiting HR review
    return app.status === 'new' || app.status === 'hr_pending';
  }

  if (role === 'hr_manager') {
    // HR Manager views applications awaiting HR Manager approval
    return app.status === 'hr_manager_pending';
  }

  if (role === 'dept_finance') {
    // Financial Manager is the department manager for Finance
    return (
      (app.status === 'dept_finance_pending' || isDeptPending(app.status)) &&
      app.assignedDepartment === 'إدارة المالية'
    );
  }

  if (isDepartmentManagerRole(role)) {
    const managerDept = userDept || getDepartmentForRole(role);
    if (!managerDept) return false;
    return doesDepartmentMatch(managerDept, app.assignedDepartment) && isDeptPending(app.status);
  }

  return false;
}

/**
 * Determines whether a user with a given role and department is permitted to ACT on an application in its current state
 */
export function canUserActOnApplication(
  role: UserRole,
  userDept: string | null | undefined,
  app: JobApplication
): boolean {
  const check = validateWorkflowTransition(role, userDept, app, 'approve');
  return check.allowed;
}

/**
 * Core Workflow Authorization Engine (Source of Truth)
 * Enforces sequential workflow requested:
 * 1. استمارة التوظيف تروح لقسم الموارد البشرية
 * 2. بعد اعتماده تروح لمدير الموارد البشرية فقط، وليس لمدير الإدارة مباشرة
 * 3. بعد موافقة مدير الموارد البشرية، تُرسل استمارة التوظيف إلى مدير الإدارة المختص فقط حسب اختيار الموارد البشرية
 * 4. ثم بعد موافقة مدير الإدارة، تروح للمدير العام لاتخاذ القرار النهائي
 */
export function validateWorkflowTransition(
  role: UserRole,
  userDept: string | null | undefined,
  app: JobApplication,
  action: 'approve' | 'reject' | 'waitlist' | 'forward' | 'override',
  targetDepartment?: DepartmentType | null,
  decision?: EvaluationResult | string,
  options?: {
    isAdminOverride?: boolean;
    overrideTargetStatus?: ApplicationStatus;
    selectedSalarySource?: FinalSalarySource | null;
  }
): AuthorizationCheckResult {
  const currentStatus = app.status;
  const isAdminActor = role === 'admin' || Boolean(options?.isAdminOverride);

  // 0. System Admin (Super Admin) Supremacy:
  // Can approve/reject/waitlist/forward/revert/bypass across ANY stage or terminal status with zero locks.
  if (isAdminActor) {
    const requestedTarget = options?.overrideTargetStatus;
    if (requestedTarget && VALID_TARGET_STATUSES.includes(requestedTarget)) {
      return { allowed: true, statusCode: 200, targetStatus: requestedTarget };
    }
    if (action === 'reject' || decision === 'مرفوض') {
      return { allowed: true, statusCode: 200, targetStatus: 'rejected' };
    }
    if (action === 'waitlist' || decision === 'انتظار') {
      return { allowed: true, statusCode: 200, targetStatus: 'waitlist' };
    }

    if (currentStatus === 'new' || currentStatus === 'hr_pending') {
      return { allowed: true, statusCode: 200, targetStatus: 'hr_manager_pending' };
    }
    if (currentStatus === 'hr_manager_pending') {
      const dept = targetDepartment || app.assignedDepartment || 'إدارة الخدمات';
      return { allowed: true, statusCode: 200, targetStatus: getDepartmentPendingStatus(dept) };
    }
    if (isDeptPending(currentStatus) || currentStatus === 'dept_finance_pending') {
      return { allowed: true, statusCode: 200, targetStatus: 'gm_pending' };
    }
    if (
      currentStatus === 'gm_pending' ||
      isApprovedStatus(currentStatus) ||
      currentStatus === 'rejected' ||
      currentStatus === 'waitlist'
    ) {
      let finalStatus: ApplicationStatus = 'approved_lvl1';
      if (
        options?.selectedSalarySource === 'hr_manager_proposal' ||
        options?.selectedSalarySource === 'direct_manager_proposal'
      ) {
        finalStatus = 'approved_proposal';
      } else if (options?.selectedSalarySource === 'level1' || decision === 'مستوى أول') {
        finalStatus = 'approved_lvl1';
      } else if (options?.selectedSalarySource === 'level2' || decision === 'مستوى ثاني') {
        finalStatus = 'approved_lvl2';
      } else if (options?.selectedSalarySource === 'level3' || decision === 'مستوى ثالث') {
        finalStatus = 'approved_lvl3';
      }
      return { allowed: true, statusCode: 200, targetStatus: finalStatus };
    }
    return { allowed: true, statusCode: 200, targetStatus: 'hr_manager_pending' };
  }

  // 1. Check for terminal statuses - For non-admin roles, terminal states lock further workflow actions
  const terminalStatuses: ApplicationStatus[] = [
    'approved_lvl1',
    'approved_lvl2',
    'approved_lvl3',
    'approved_proposal',
    'waitlist',
    'rejected',
  ];
  if (terminalStatuses.includes(currentStatus)) {
    return {
      allowed: false,
      statusCode: 400,
      reason: `الطلب في حالة نهائية (${currentStatus}) ولا يمكن إعادة اتخاذ قرار عليه.`,
    };
  }

  // 2. HR Specialist (قسم الموارد البشرية)
  // Stage 1: can ONLY process 'new' or 'hr_pending'
  if (role === 'hr') {
    if (currentStatus !== 'new' && currentStatus !== 'hr_pending') {
      return {
        allowed: false,
        statusCode: 403,
        reason: 'غير مصرح: موظف الموارد البشرية يمكنه معالجة الطلبات في مرحلة "بانتظار الموارد البشرية" فقط، ولا يمكنه اعتماد أو رفض طلبات في مراحل أخرى.',
      };
    }

    if (action === 'reject') {
      return { allowed: true, statusCode: 200, targetStatus: 'rejected' };
    }
    if (action === 'waitlist') {
      return { allowed: true, statusCode: 200, targetStatus: 'waitlist' };
    }

    // On HR approval -> goes ONLY to HR Manager:
    // "بعد اعتماده تروح لمدير الموارد البشرية فقط، وليس لمدير الإدارة مباشرة"
    return {
      allowed: true,
      statusCode: 200,
      targetStatus: 'hr_manager_pending',
    };
  }

  // 3. HR Manager (مدير الموارد البشرية)
  // Stage 2: can ONLY process 'hr_manager_pending'
  if (role === 'hr_manager') {
    if (currentStatus !== 'hr_manager_pending') {
      return {
        allowed: false,
        statusCode: 403,
        reason: 'غير مصرح: مدير الموارد البشرية يمكنه معالجة الطلبات في مرحلة "بانتظار مدير الموارد البشرية" فقط، ولا يمكنه اتخاذ إجراء في مراحل سابقة أو لاحقة.',
      };
    }

    if (action === 'reject') {
      return { allowed: true, statusCode: 200, targetStatus: 'rejected' };
    }
    if (action === 'waitlist') {
      return { allowed: true, statusCode: 200, targetStatus: 'waitlist' };
    }

    // On HR Manager approval:
    // "بعد موافقة مدير الموارد البشرية، تُرسل استمارة التوظيف إلى مدير الإدارة المختص فقط حسب اختيار الموارد البشرية"
    const effectiveDept = targetDepartment || app.assignedDepartment || 'إدارة الخدمات';
    const nextDeptStatus = getDepartmentPendingStatus(effectiveDept);
    return {
      allowed: true,
      statusCode: 200,
      targetStatus: nextDeptStatus,
    };
  }

  // 4. Department Managers (مدراء الإدارات المختصة)
  // Stage 3: Technical interview by the assigned department manager
  if (isDepartmentManagerRole(role)) {
    if (!isDeptPending(currentStatus) && currentStatus !== 'dept_finance_pending') {
      return {
        allowed: false,
        statusCode: 403,
        reason: 'غير مصرح: مدير الإدارة لا يمكنه اتخاذ إجراء على طلب لم يصل إلى مرحلة المقابلة الفنية بعد موافقة مدير الموارد البشرية.',
      };
    }

    // Verify Department Ownership
    const managerDept = userDept || getDepartmentForRole(role);
    if (!managerDept) {
      return {
        allowed: false,
        statusCode: 403,
        reason: 'غير مصرح: لم يتم التعرف على الإدارة التابع لها مدير الإدارة.',
      };
    }

    const appDept = app.assignedDepartment;
    if (!doesDepartmentMatch(managerDept, appDept)) {
      return {
        allowed: false,
        statusCode: 403,
        reason: `غير مصرح: الطلب محال إلى (${appDept || 'إدارة أخرى'}) ولا يحق لمدير (${managerDept}) الاطلاع عليه أو اتخاذ قرار بشأنه.`,
      };
    }

    if (action === 'reject') {
      return { allowed: true, statusCode: 200, targetStatus: 'rejected' };
    }
    if (action === 'waitlist') {
      return { allowed: true, statusCode: 200, targetStatus: 'waitlist' };
    }

    // On Department Manager approval:
    // "ثم بعد موافقة مدير الإدارة، تروح للمدير العام لاتخاذ القرار النهائي."
    return {
      allowed: true,
      statusCode: 200,
      targetStatus: 'gm_pending',
    };
  }

  // 5. General Manager (المدير العام)
  // Stage 4: can ONLY process 'gm_pending'
  if (role === 'general_manager') {
    if (currentStatus !== 'gm_pending') {
      return {
        allowed: false,
        statusCode: 403,
        reason: 'غير مصرح: المدير العام يمكنه اعتماد أو رفض الطلبات التي وصلت إلى مرحلة "بانتظار المدير العام" فقط، ولا يجوز له اتخاذ إجراء في مراحل سابقة.',
      };
    }

    if (action === 'reject') {
      return { allowed: true, statusCode: 200, targetStatus: 'rejected' };
    }
    if (action === 'waitlist') {
      return { allowed: true, statusCode: 200, targetStatus: 'waitlist' };
    }

    // Final Approval levels or Manager Salary Proposals
    let finalStatus: ApplicationStatus = 'approved_lvl1';
    if (
      options?.selectedSalarySource === 'hr_manager_proposal' ||
      options?.selectedSalarySource === 'direct_manager_proposal'
    ) {
      finalStatus = 'approved_proposal';
    } else if (options?.selectedSalarySource === 'level1' || decision === 'مستوى أول') {
      finalStatus = 'approved_lvl1';
    } else if (options?.selectedSalarySource === 'level2' || decision === 'مستوى ثاني') {
      finalStatus = 'approved_lvl2';
    } else if (options?.selectedSalarySource === 'level3' || decision === 'مستوى ثالث') {
      finalStatus = 'approved_lvl3';
    } else if (decision === 'انتظار') {
      finalStatus = 'waitlist';
    } else if (decision === 'مرفوض') {
      finalStatus = 'rejected';
    }

    return {
      allowed: true,
      statusCode: 200,
      targetStatus: finalStatus,
    };
  }

  return {
    allowed: false,
    statusCode: 403,
    reason: `دور المستخدم غير معروف أو غير مصرح به (${role}).`,
  };
}
