import { and, desc, eq, ilike, inArray } from 'drizzle-orm';
import { db } from './index.ts';
import {
  applications,
  applicationSignatures,
  approvalHistory,
  auditLogs,
  departments,
  notifications,
  salaryProposals,
  salaryStructureHistory,
  salaryStructures,
  systemSettings,
  users,
} from './schema.ts';
import type {
  AccountStatus,
  AppNotification,
  ApplicationStatus,
  ApprovalHistoryEntry,
  AuditLogEntry,
  CompanyDepartment,
  DepartmentType,
  ElectronicSignature,
  FinalSalarySource,
  GeneralManagerApproval,
  JobApplication,
  ManagerPermissions,
  SalaryProposal,
  SalaryProposalStage,
  SalaryStructureConfig,
  SalaryStructureHistoryEntry,
  SectionReview,
  StageSignatures,
  UserIdentity,
  UserRole,
  WorkflowSignatureStage,
} from '../types.ts';
import {
  getDefaultPermissionsForRole,
  SUPER_ADMIN_EMAIL,
  SYSTEM_ADMIN_FULL_PERMISSIONS,
} from '../types.ts';
import { getRoleDisplayTitle } from '../utils/departments.ts';

export const emptySectionReview = (): SectionReview => ({
  positives: '',
  negatives: '',
  result: null,
  notice: '',
  signature: '',
});

export const emptyGmReview = (): GeneralManagerApproval => ({
  salaryLevel1: '',
  salaryLevel2: '',
  salaryLevel3: '',
  level1Amount: null,
  level2Amount: null,
  level3Amount: null,
  currency: 'ج.م',
  selectedSalaryLevel: null,
  finalSalarySource: null,
  finalApprovedSalaryAmount: null,
  finalApprovedSalary: '',
  isSalaryLocked: false,
  result: null,
  notice: '',
  signature: '',
});

/**
 * Helper to resolve department ID in PostgreSQL from department name or roleKey
 */
export async function resolveDepartmentId(
  deptName?: string | null,
  roleKey?: string | null
): Promise<string | null> {
  try {
    if (deptName && deptName.trim()) {
      const clean = deptName.trim();
      const rows = await db
        .select({ id: departments.id })
        .from(departments)
        .where(eq(departments.name, clean))
        .limit(1);
      if (rows[0]) return rows[0].id;
    }
    if (roleKey && roleKey.trim()) {
      const rows = await db
        .select({ id: departments.id })
        .from(departments)
        .where(eq(departments.roleKey, roleKey.trim()))
        .limit(1);
      if (rows[0]) return rows[0].id;
    }
    return null;
  } catch (error) {
    console.error('Database query failed resolving department:', error);
    return null;
  }
}

/**
 * Safe user upsert for Firebase Auth (Google Sign-In)
 */
export async function getOrCreateUserFromFirebase(params: {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}) {
  try {
    const normalizedEmail = params.email.trim().toLowerCase();
    const isSuper = normalizedEmail === SUPER_ADMIN_EMAIL.toLowerCase();

    // First check if a user record already exists by email or uid
    const existingByUid = await db
      .select()
      .from(users)
      .where(eq(users.uid, params.uid))
      .limit(1);
    if (existingByUid[0]) {
      const updated = await db
        .update(users)
        .set({
          lastLoginAt: new Date(),
          updatedAt: new Date(),
          photoUrl: params.photoURL || existingByUid[0].photoUrl,
        })
        .where(eq(users.id, existingByUid[0].id))
        .returning();
      return updated[0];
    }

    const existingByEmail = await db
      .select()
      .from(users)
      .where(ilike(users.email, normalizedEmail))
      .limit(1);
    if (existingByEmail[0]) {
      const updated = await db
        .update(users)
        .set({
          uid: params.uid,
          isGoogleUser: true,
          photoUrl: params.photoURL || existingByEmail[0].photoUrl,
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingByEmail[0].id))
        .returning();
      return updated[0];
    }

    if (!isSuper) {
      const err: any = new Error(
        'غير مصرح: هذا البريد الإلكتروني غير مسجل بالنظام. يجب أن يقوم مدير النظام بإضافة بريدك وتعيين دورك أولاً.'
      );
      err.statusCode = 403;
      throw err;
    }

    const role: UserRole = 'admin';
    const department = 'الإدارة العامة';
    const departmentId = await resolveDepartmentId(department, role);
    const fullName = (params.displayName || 'محمد احمد عبد اللطيف').trim();

    const now = new Date();
    const newId = 'identity_admin_ma1927393';
    const identityNumber = 'ADMIN-001';

    const result = await db
      .insert(users)
      .values({
        id: newId,
        uid: params.uid,
        identityNumber,
        username: normalizedEmail.split('@')[0],
        fullName,
        displayName: fullName,
        email: normalizedEmail,
        phoneNumber: '',
        departmentId,
        department,
        role,
        jobTitle: getRoleDisplayTitle(role),
        status: 'active',
        permissions: { ...SYSTEM_ADMIN_FULL_PERMISSIONS },
        isSuperAdmin: true,
        isGoogleUser: true,
        photoUrl: params.photoURL || null,
        createdDateArabic: now.toLocaleString('ar-EG'),
        lastLoginAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          uid: params.uid,
          isGoogleUser: true,
          photoUrl: params.photoURL || null,
          lastLoginAt: now,
          updatedAt: now,
        },
      })
      .returning();

    return result[0];
  } catch (error: any) {
    if (error?.statusCode === 403) {
      throw error;
    }
    console.error('Database query failed in getOrCreateUserFromFirebase:', error);
    throw new Error('تعذر مزامنة بيانات الحساب في قاعدة البيانات.', { cause: error });
  }
}

export async function findUserByIdOrUid(identifier: string) {
  try {
    const byId = await db
      .select()
      .from(users)
      .where(eq(users.id, identifier))
      .limit(1);
    if (byId[0]) return byId[0];

    const byUid = await db
      .select()
      .from(users)
      .where(eq(users.uid, identifier))
      .limit(1);
    return byUid[0] || null;
  } catch (error) {
    console.error('Database query failed in findUserByIdOrUid:', error);
    throw new Error('تعذر التحقق من بيانات المستخدم.', { cause: error });
  }
}

export async function findUserByEmail(email: string) {
  try {
    const rows = await db
      .select()
      .from(users)
      .where(ilike(users.email, email.trim().toLowerCase()))
      .limit(1);
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in findUserByEmail:', error);
    throw new Error('تعذر البحث عن المستخدم بالبريد الإلكتروني.', { cause: error });
  }
}

export function mapDbUserToIdentity(u: typeof users.$inferSelect): UserIdentity {
  const isSuper =
    u.email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() || Boolean(u.isSuperAdmin);
  const role = (u.role as UserRole) || (isSuper ? 'admin' : 'hr');
  return {
    id: u.id,
    identityNumber: u.identityNumber,
    username: u.username || undefined,
    fullName: u.fullName,
    displayName: u.displayName || u.fullName,
    email: u.email,
    phoneNumber: u.phoneNumber || '',
    department: u.department,
    role,
    jobTitle: u.jobTitle || getRoleDisplayTitle(role),
    status: (u.status as AccountStatus) || 'active',
    permissions: isSuper
      ? { ...SYSTEM_ADMIN_FULL_PERMISSIONS }
      : u.permissions || getDefaultPermissionsForRole(role),
    isSuperAdmin: isSuper,
    isGoogleUser: u.isGoogleUser,
    createdAt: u.createdAt.toISOString(),
    createdDateArabic: u.createdDateArabic || u.createdAt.toLocaleString('ar-EG'),
    updatedAt: u.updatedAt.toISOString(),
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : undefined,
    notes: u.notes || undefined,
  };
}

export async function listAllUsers(): Promise<UserIdentity[]> {
  try {
    const rows = await db.select().from(users).orderBy(desc(users.createdAt));
    const list = rows.map(mapDbUserToIdentity);
    list.sort((a, b) => {
      if (a.isSuperAdmin && !b.isSuperAdmin) return -1;
      if (!a.isSuperAdmin && b.isSuperAdmin) return 1;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
    return list;
  } catch (error) {
    console.error('Database query failed in listAllUsers:', error);
    throw new Error('تعذر جلب قائمة المستخدمين من قاعدة البيانات.', { cause: error });
  }
}

export async function recordAuditLog(
  entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'dateArabic'>
): Promise<void> {
  try {
    const id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();
    await db.insert(auditLogs).values({
      id,
      userId: entry.userId || null,
      userName: entry.userName || null,
      userEmail: entry.userEmail || null,
      userRole: entry.userRole || null,
      performedByName: entry.performedByName || null,
      performedByEmail: entry.performedByEmail || null,
      performedByRole: entry.performedByRole || null,
      action: entry.action,
      targetId: entry.targetId || null,
      targetType: entry.targetType,
      targetName: entry.targetName || null,
      previousValue: entry.previousValue ?? null,
      newValue: entry.newValue ?? null,
      details: entry.details,
      metadata: entry.metadata ?? null,
      dateArabic: now.toLocaleString('ar-EG'),
      timestamp: now,
    });
  } catch (error) {
    console.warn('[recordAuditLog] Failed to persist audit log to SQL:', error);
  }
}

export async function listAuditLogs(max = 200): Promise<AuditLogEntry[]> {
  try {
    const rows = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.timestamp))
      .limit(max);
    return rows.map((r) => ({
      id: r.id,
      userId: r.userId || undefined,
      userName: r.userName || undefined,
      userEmail: r.userEmail || undefined,
      userRole: r.userRole || undefined,
      performedByName: r.performedByName || undefined,
      performedByEmail: r.performedByEmail || undefined,
      performedByRole: r.performedByRole || undefined,
      action: r.action as AuditLogEntry['action'],
      targetId: r.targetId || undefined,
      targetType: r.targetType as AuditLogEntry['targetType'],
      targetName: r.targetName || undefined,
      previousValue: r.previousValue,
      newValue: r.newValue,
      details: r.details,
      metadata: (r.metadata as Record<string, any>) || undefined,
      dateArabic: r.dateArabic,
      timestamp: r.timestamp.toISOString(),
    }));
  } catch (error) {
    console.error('Database query failed in listAuditLogs:', error);
    throw new Error('تعذر جلب سجل العمليات من قاعدة البيانات.', { cause: error });
  }
}

/**
 * Hydrate full JobApplication objects with their related signatures & approval history rows
 */
function mapProposalRow(p: typeof salaryProposals.$inferSelect): SalaryProposal {
  return {
    id: p.id,
    applicationId: p.applicationId,
    stage: p.stage as SalaryProposalStage,
    proposerUserId: p.proposerUserId || null,
    proposerName: p.proposerName,
    proposerEmail: p.proposerEmail || '',
    proposerRole: p.proposerRole as UserRole,
    proposerDepartment: p.proposerDepartment || null,
    proposedAmount: p.proposedAmount,
    currency: p.currency || 'ج.م',
    formattedAmount: p.formattedAmount,
    notes: p.notes || undefined,
    status: (p.status as SalaryProposal['status']) || 'active',
    proposedAt: p.proposedAt.toISOString(),
    proposedAtArabic: p.proposedAtArabic,
    updatedAt: p.updatedAt.toISOString(),
  };
}

/**
 * Hydrate full JobApplication objects with their related signatures, salary proposals & approval history rows
 */
function hydrateApplication(
  row: typeof applications.$inferSelect,
  sigRows: (typeof applicationSignatures.$inferSelect)[],
  histRows: (typeof approvalHistory.$inferSelect)[],
  proposalRows: (typeof salaryProposals.$inferSelect)[] = []
): JobApplication {
  const signatures: StageSignatures = {};
  const sigById = new Map<string, ElectronicSignature>();

  for (const s of sigRows) {
    const mapped: ElectronicSignature = {
      id: s.id,
      applicationId: s.applicationId,
      userId: s.userId || '',
      fullName: s.fullName,
      email: s.email,
      role: s.role as UserRole,
      jobTitle: s.jobTitle,
      department: s.department,
      stage: s.stage as WorkflowSignatureStage,
      stageLabel: s.stageLabel,
      action: s.action as ElectronicSignature['action'],
      decision: s.decision,
      signedAt: s.signedAt.toISOString(),
      signedAtArabic: s.signedAtArabic,
      immutable: true,
    };
    signatures[mapped.stage] = mapped;
    sigById.set(s.id, mapped);
  }

  let hrManagerSalaryProposal: SalaryProposal | null = null;
  let directManagerSalaryProposal: SalaryProposal | null = null;
  for (const p of proposalRows) {
    const mappedProposal = mapProposalRow(p);
    if (mappedProposal.stage === 'hr_manager') {
      hrManagerSalaryProposal = mappedProposal;
    } else if (mappedProposal.stage === 'direct_manager') {
      directManagerSalaryProposal = mappedProposal;
    }
  }

  const history: ApprovalHistoryEntry[] = histRows.map((h) => ({
    id: h.id,
    applicationId: h.applicationId,
    userId: h.userId || '',
    userName: h.userName,
    userEmail: h.userEmail,
    role: h.role as UserRole,
    jobTitle: h.jobTitle || undefined,
    department: h.department || null,
    stage: (h.stage as WorkflowSignatureStage) || undefined,
    stageLabel: h.stageLabel || undefined,
    action: h.action as ApprovalHistoryEntry['action'],
    decision: h.decision,
    oldStatus: h.oldStatus,
    newStatus: h.newStatus as ApplicationStatus,
    timestamp: h.timestamp.toISOString(),
    dateArabic: h.dateArabic,
    notice: h.notice || undefined,
    signature: h.signature || undefined,
    electronicSignature: h.signatureId ? sigById.get(h.signatureId) : undefined,
    salary: h.salary || null,
    metadata: h.metadata || undefined,
  }));

  const hrRev: SectionReview = {
    ...(row.hrReview || emptySectionReview()),
    ...(signatures.hr ? { signature: signatures.hr.fullName, electronicSignature: signatures.hr } : {}),
  };
  const hrMgrRev: SectionReview = {
    ...(row.hrManagerReview || emptySectionReview()),
    ...(signatures.hr_manager
      ? { signature: signatures.hr_manager.fullName, electronicSignature: signatures.hr_manager }
      : {}),
  };
  const dmRev: SectionReview = {
    ...(row.directManagerReview || emptySectionReview()),
    ...(signatures.direct_manager
      ? { signature: signatures.direct_manager.fullName, electronicSignature: signatures.direct_manager }
      : {}),
  };
  const baseGm = row.generalManagerReview || emptyGmReview();
  const inferredSource: FinalSalarySource | null =
    baseGm.finalSalarySource ??
    (baseGm.selectedSalaryLevel === 'level1'
      ? 'level1'
      : baseGm.selectedSalaryLevel === 'level2'
      ? 'level2'
      : baseGm.selectedSalaryLevel === 'level3'
      ? 'level3'
      : null);

  const gmRev: GeneralManagerApproval = {
    ...baseGm,
    finalSalarySource: inferredSource,
    ...(signatures.general_manager
      ? { signature: signatures.general_manager.fullName, electronicSignature: signatures.general_manager }
      : {}),
  };

  return {
    id: row.id,
    recordNumber: row.recordNumber,
    timestamp: row.timestampText,
    todayDate: row.todayDate || undefined,
    fullName: row.fullName,
    nationalId: row.nationalId,
    birthDate: row.birthDate,
    gender: row.gender,
    address: row.address,
    phone: row.phone,
    emergencyContact: row.emergencyContact,
    qualification: row.qualification,
    qualificationDate: row.qualificationDate,
    maritalStatus: row.maritalStatus,
    positionApplied: row.positionApplied,
    internalReferrals: row.internalReferrals,
    prevCompany: row.prevCompany,
    prevPosition: row.prevPosition,
    prevManager: row.prevManager,
    experienceYears: row.experienceYears,
    workHours: row.workHours,
    prevSalary: row.prevSalary,
    reasonForLeaving: row.reasonForLeaving,
    prevCompany2: row.prevCompany2 || undefined,
    prevPosition2: row.prevPosition2 || undefined,
    prevManager2: row.prevManager2 || undefined,
    experienceYears2: row.experienceYears2 || undefined,
    workHours2: row.workHours2 || undefined,
    reasonForLeaving2: row.reasonForLeaving2 || undefined,
    prevCompany3: row.prevCompany3 || undefined,
    prevPosition3: row.prevPosition3 || undefined,
    prevManager3: row.prevManager3 || undefined,
    experienceYears3: row.experienceYears3 || undefined,
    reasonForLeaving3: row.reasonForLeaving3 || undefined,
    computerSkills: row.computerSkills,
    englishLevel: row.englishLevel,
    drivingLicense: row.drivingLicense,
    drivingLicenseDegree: row.drivingLicenseDegree || undefined,
    smoking: row.smoking,
    chronicDiseases: row.chronicDiseases,
    acknowledgement: row.acknowledgement,
    score: row.score || undefined,
    isPraying: row.isPraying || undefined,
    militaryStatus: row.militaryStatus || undefined,
    expectedSalary: row.expectedSalary || undefined,
    personalPhotoUrl: row.personalPhotoUrl || undefined,
    assignedDepartment: (row.assignedDepartment as DepartmentType) || undefined,
    assignedDepartmentManager: row.assignedDepartmentManager || undefined,
    hrReview: hrRev,
    hrManagerReview: hrMgrRev,
    directManagerReview: dmRev,
    generalManagerReview: gmRev,
    signatures,
    hrManagerSalaryProposal,
    directManagerSalaryProposal,
    status: row.status as ApplicationStatus,
    lastActionDate: row.lastActionDate || undefined,
    lastActionType: row.lastActionType || undefined,
    notes: row.notes || undefined,
    tags: row.tags || undefined,
    approvalHistory: history,
    lastUpdated: row.lastUpdated.toISOString(),
  };
}

export async function listAllApplications(): Promise<JobApplication[]> {
  try {
    const appRows = await db
      .select()
      .from(applications)
      .orderBy(desc(applications.lastUpdated));

    if (appRows.length === 0) return [];

    const appIds = appRows.map((a) => a.id);

    const [sigRows, histRows, proposalRows] = await Promise.all([
      db
        .select()
        .from(applicationSignatures)
        .where(inArray(applicationSignatures.applicationId, appIds)),
      db
        .select()
        .from(approvalHistory)
        .where(inArray(approvalHistory.applicationId, appIds))
        .orderBy(desc(approvalHistory.timestamp)),
      db
        .select()
        .from(salaryProposals)
        .where(inArray(salaryProposals.applicationId, appIds)),
    ]);

    const sigsByApp = new Map<string, (typeof applicationSignatures.$inferSelect)[]>();
    for (const s of sigRows) {
      const arr = sigsByApp.get(s.applicationId) || [];
      arr.push(s);
      sigsByApp.set(s.applicationId, arr);
    }

    const histByApp = new Map<string, (typeof approvalHistory.$inferSelect)[]>();
    for (const h of histRows) {
      const arr = histByApp.get(h.applicationId) || [];
      arr.push(h);
      histByApp.set(h.applicationId, arr);
    }

    const proposalsByApp = new Map<string, (typeof salaryProposals.$inferSelect)[]>();
    for (const p of proposalRows) {
      const arr = proposalsByApp.get(p.applicationId) || [];
      arr.push(p);
      proposalsByApp.set(p.applicationId, arr);
    }

    return appRows.map((row) =>
      hydrateApplication(
        row,
        sigsByApp.get(row.id) || [],
        histByApp.get(row.id) || [],
        proposalsByApp.get(row.id) || []
      )
    );
  } catch (error) {
    console.error('Database query failed in listAllApplications:', error);
    throw new Error('تعذر جلب استمارات التوظيف من قاعدة البيانات.', { cause: error });
  }
}

export async function getApplicationById(id: string): Promise<JobApplication | null> {
  try {
    const rows = await db
      .select()
      .from(applications)
      .where(eq(applications.id, id))
      .limit(1);
    if (!rows[0]) return null;

    const [sigRows, histRows, proposalRows] = await Promise.all([
      db
        .select()
        .from(applicationSignatures)
        .where(eq(applicationSignatures.applicationId, id)),
      db
        .select()
        .from(approvalHistory)
        .where(eq(approvalHistory.applicationId, id))
        .orderBy(desc(approvalHistory.timestamp)),
      db
        .select()
        .from(salaryProposals)
        .where(eq(salaryProposals.applicationId, id)),
    ]);

    return hydrateApplication(rows[0], sigRows, histRows, proposalRows);
  } catch (error) {
    console.error('Database query failed in getApplicationById:', error);
    throw new Error('تعذر جلب بيانات الاستمارة من قاعدة البيانات.', { cause: error });
  }
}

export async function listAllDepartments(): Promise<CompanyDepartment[]> {
  try {
    const rows = await db.select().from(departments);
    return rows.map((d) => ({
      id: d.id,
      name: d.name,
      code: d.code,
      description: d.description,
      managerName: d.managerTitle,
      roleKey: d.roleKey as UserRole,
      color: d.color,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    }));
  } catch (error) {
    console.error('Database query failed in listAllDepartments:', error);
    throw new Error('تعذر جلب الإدارات من قاعدة البيانات.', { cause: error });
  }
}

export async function listNotifications(
  role?: UserRole | null,
  isAdmin?: boolean
): Promise<AppNotification[]> {
  try {
    const rows =
      role && !isAdmin
        ? await db
            .select()
            .from(notifications)
            .where(eq(notifications.targetRole, role))
            .orderBy(desc(notifications.createdAt))
            .limit(100)
        : await db
            .select()
            .from(notifications)
            .orderBy(desc(notifications.createdAt))
            .limit(100);

    return rows.map((n) => ({
      id: n.id,
      applicantId: n.applicantId || '',
      applicantName: n.applicantName,
      position: n.position,
      targetRole: n.targetRole as UserRole,
      title: n.title,
      message: n.message,
      timestamp: n.timestampText,
      isRead: n.isRead,
      priority: (n.priority as 'high' | 'normal') || 'high',
    }));
  } catch (error) {
    console.error('Database query failed in listNotifications:', error);
    throw new Error('تعذر جلب الإشعارات من قاعدة البيانات.', { cause: error });
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  try {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
  } catch (error) {
    console.error('Database query failed in markNotificationRead:', error);
    throw new Error('تعذر تحديث حالة الإشعار.', { cause: error });
  }
}

export async function markAllNotificationsRead(
  role?: UserRole | null,
  isAdmin?: boolean
): Promise<void> {
  try {
    if (role && !isAdmin) {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.targetRole, role), eq(notifications.isRead, false)));
    } else {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.isRead, false));
    }
  } catch (error) {
    console.error('Database query failed in markAllNotificationsRead:', error);
    throw new Error('تعذر تحديث الإشعارات.', { cause: error });
  }
}

export async function getSystemSettingsMap(): Promise<Record<string, any>> {
  try {
    const rows = await db.select().from(systemSettings);
    const out: Record<string, any> = {};
    for (const r of rows) {
      out[r.key] = r.value;
    }
    return out;
  } catch (error) {
    console.error('Database query failed in getSystemSettingsMap:', error);
    throw new Error('تعذر جلب إعدادات النظام.', { cause: error });
  }
}

export async function upsertSystemSetting(
  key: string,
  value: Record<string, any>,
  updatedBy?: string,
  description?: string
): Promise<void> {
  try {
    const now = new Date();
    await db
      .insert(systemSettings)
      .values({
        key,
        value,
        description: description || null,
        updatedBy: updatedBy || null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: {
          value,
          description: description || null,
          updatedBy: updatedBy || null,
          updatedAt: now,
        },
      });
  } catch (error) {
    console.error('Database query failed in upsertSystemSetting:', error);
    throw new Error('تعذر حفظ إعدادات النظام.', { cause: error });
  }
}

const DEFAULT_SALARY_STRUCTURE_ID = 'default';

function mapSalaryStructureRow(
  row: typeof salaryStructures.$inferSelect
): SalaryStructureConfig {
  return {
    id: row.id,
    level1Salary: row.level1Salary ?? null,
    level2Salary: row.level2Salary ?? null,
    level3Salary: row.level3Salary ?? null,
    currency: row.currency || 'ج.م',
    isApproved: Boolean(row.isApproved),
    updatedByUserId: row.updatedByUserId || null,
    updatedByName: row.updatedByName || null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getSalaryStructure(): Promise<SalaryStructureConfig> {
  try {
    const existing = await db
      .select()
      .from(salaryStructures)
      .where(eq(salaryStructures.id, DEFAULT_SALARY_STRUCTURE_ID))
      .limit(1);

    if (existing[0]) {
      return mapSalaryStructureRow(existing[0]);
    }

    // Lazily ensure clean empty initial record (zero fake/random default salaries)
    const now = new Date();
    await db
      .insert(salaryStructures)
      .values({
        id: DEFAULT_SALARY_STRUCTURE_ID,
        level1Salary: null,
        level2Salary: null,
        level3Salary: null,
        currency: 'ج.م',
        isApproved: false,
        updatedByUserId: null,
        updatedByName: null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    const rows = await db
      .select()
      .from(salaryStructures)
      .where(eq(salaryStructures.id, DEFAULT_SALARY_STRUCTURE_ID))
      .limit(1);

    if (rows[0]) {
      return mapSalaryStructureRow(rows[0]);
    }

    return {
      id: DEFAULT_SALARY_STRUCTURE_ID,
      level1Salary: null,
      level2Salary: null,
      level3Salary: null,
      currency: 'ج.م',
      isApproved: false,
      updatedByUserId: null,
      updatedByName: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  } catch (error) {
    console.error('Database query failed in getSalaryStructure:', error);
    throw new Error('تعذر جلب هيكل الرواتب من قاعدة البيانات.', { cause: error });
  }
}

export async function listSalaryStructureHistory(
  max = 50
): Promise<SalaryStructureHistoryEntry[]> {
  try {
    const rows = await db
      .select()
      .from(salaryStructureHistory)
      .orderBy(desc(salaryStructureHistory.timestamp))
      .limit(max);

    return rows.map((r) => ({
      id: r.id,
      structureId: r.structureId,
      userId: r.userId || null,
      userName: r.userName,
      userEmail: r.userEmail,
      userRole: r.userRole,
      previousValues: r.previousValues,
      newValues: r.newValues,
      notes: r.notes || undefined,
      dateArabic: r.dateArabic,
      timestamp: r.timestamp.toISOString(),
    }));
  } catch (error) {
    console.error('Database query failed in listSalaryStructureHistory:', error);
    throw new Error('تعذر جلب سجل تعديلات هيكل الرواتب.', { cause: error });
  }
}

export async function upsertSalaryStructure(params: {
  level1Salary: number;
  level2Salary: number;
  level3Salary: number;
  currency?: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  notes?: string;
}): Promise<{
  structure: SalaryStructureConfig;
  historyEntry: SalaryStructureHistoryEntry;
}> {
  try {
    const l1 = Math.round(Number(params.level1Salary));
    const l2 = Math.round(Number(params.level2Salary));
    const l3 = Math.round(Number(params.level3Salary));

    if (
      !Number.isFinite(l1) ||
      !Number.isFinite(l2) ||
      !Number.isFinite(l3) ||
      l1 <= 0 ||
      l2 <= 0 ||
      l3 <= 0
    ) {
      throw {
        statusCode: 400,
        message: 'يجب إدخال قيم رقمية صحيحة أكبر من صفر لجميع المستويات الثلاثة (المستوى الأول، الثاني، الثالث).',
      };
    }

    const currency = (params.currency || 'ج.م').trim() || 'ج.م';
    const now = new Date();
    const nowArabic = now.toLocaleString('ar-EG');

    return await db.transaction(async (tx) => {
      const existingRows = await tx
        .select()
        .from(salaryStructures)
        .where(eq(salaryStructures.id, DEFAULT_SALARY_STRUCTURE_ID))
        .limit(1);

      const prevRow = existingRows[0];
      const previousValues = {
        level1Salary: prevRow?.level1Salary ?? null,
        level2Salary: prevRow?.level2Salary ?? null,
        level3Salary: prevRow?.level3Salary ?? null,
      };
      const newValues = {
        level1Salary: l1,
        level2Salary: l2,
        level3Salary: l3,
      };

      const [savedRow] = await tx
        .insert(salaryStructures)
        .values({
          id: DEFAULT_SALARY_STRUCTURE_ID,
          level1Salary: l1,
          level2Salary: l2,
          level3Salary: l3,
          currency,
          isApproved: true,
          updatedByUserId: params.userId,
          updatedByName: params.userName,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: salaryStructures.id,
          set: {
            level1Salary: l1,
            level2Salary: l2,
            level3Salary: l3,
            currency,
            isApproved: true,
            updatedByUserId: params.userId,
            updatedByName: params.userName,
            updatedAt: now,
          },
        })
        .returning();

      const histId = `salhist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const cleanNotes = params.notes?.trim() || 'تحديث واعتماد هيكل الرواتب للمستويات الثلاثة';

      await tx.insert(salaryStructureHistory).values({
        id: histId,
        structureId: DEFAULT_SALARY_STRUCTURE_ID,
        userId: params.userId,
        userName: params.userName,
        userEmail: params.userEmail,
        userRole: params.userRole,
        previousValues,
        newValues,
        notes: cleanNotes,
        dateArabic: nowArabic,
        timestamp: now,
      });

      return {
        structure: mapSalaryStructureRow(savedRow),
        historyEntry: {
          id: histId,
          structureId: DEFAULT_SALARY_STRUCTURE_ID,
          userId: params.userId,
          userName: params.userName,
          userEmail: params.userEmail,
          userRole: params.userRole,
          previousValues,
          newValues,
          notes: cleanNotes,
          dateArabic: nowArabic,
          timestamp: now.toISOString(),
        },
      };
    });
  } catch (error: any) {
    if (error?.statusCode) throw error;
    console.error('Database query failed in upsertSalaryStructure:', error);
    throw new Error('تعذر حفظ هيكل الرواتب في قاعدة البيانات.', { cause: error });
  }
}
