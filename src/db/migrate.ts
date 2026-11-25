import { count } from 'drizzle-orm';
import { initializeApp, getApps } from 'firebase/app';
import { collection, getDocs, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { INITIAL_APPLICANTS } from '../data/initialApplicants.ts';
import { hashPassword } from '../server/authSecurity.ts';
import {
  type AccountStatus,
  type AppNotification,
  type AuditLogEntry,
  type CompanyDepartment,
  type ElectronicSignature,
  getDefaultPermissionsForRole,
  type JobApplication,
  SUPER_ADMIN_EMAIL,
  SYSTEM_ADMIN_FULL_PERMISSIONS,
  type UserIdentity,
  type UserRole,
  type WorkflowSignatureStage,
} from '../types.ts';
import { DEPARTMENTS, getRoleDisplayTitle } from '../utils/departments.ts';
import { db } from './index.ts';
import { emptyGmReview, emptySectionReview, resolveDepartmentId } from './repository.ts';
import {
  applications,
  applicationSignatures,
  approvalHistory,
  auditLogs,
  departments,
  notifications,
  salaryStructures,
  systemSettings,
  users,
} from './schema.ts';

let migrationDone = false;
let migrationPromise: Promise<void> | null = null;

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(fallback);
      });
  });
}

function parseSafeDate(value?: string | null): Date {
  if (!value) return new Date();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

async function readLegacyFirestoreSnapshot(): Promise<{
  identities: any[];
  users: any[];
  departments: any[];
  applications: any[];
  signatures: any[];
  notifications: any[];
  auditLogs: any[];
}> {
  const empty = {
    identities: [],
    users: [],
    departments: [],
    applications: [],
    signatures: [],
    notifications: [],
    auditLogs: [],
  };

  try {
    const appName = 'sql-migration-reader';
    const fbApp =
      getApps().find((a) => a.name === appName) || initializeApp(firebaseConfig, appName);
    const fbDb = getFirestore(fbApp, (firebaseConfig as any).firestoreDatabaseId);

    const readCol = async (colName: string): Promise<any[]> => {
      try {
        const snap = await getDocs(collection(fbDb, colName));
        const items: any[] = [];
        snap.forEach((docSnap) => {
          items.push({ ...docSnap.data(), id: docSnap.id });
        });
        return items;
      } catch {
        return [];
      }
    };

    const result = await withTimeout(
      Promise.all([
        readCol('identities'),
        readCol('users'),
        readCol('departments'),
        readCol('applications'),
        readCol('electronic_signatures'),
        readCol('notifications'),
        readCol('audit_logs'),
      ]).then(
        ([
          identities,
          usersList,
          deptsList,
          appsList,
          sigsList,
          notifsList,
          logsList,
        ]) => ({
          identities,
          users: usersList,
          departments: deptsList,
          applications: appsList,
          signatures: sigsList,
          notifications: notifsList,
          auditLogs: logsList,
        })
      ),
      3500,
      empty
    );

    return result;
  } catch (error) {
    console.warn('[SQL Migration] Legacy Firestore snapshot skipped:', error);
    return empty;
  }
}

function buildDefaultUsers(now: Date): Array<{
  id: string;
  identityNumber: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  department: string;
  role: UserRole;
  status: AccountStatus;
  isSuperAdmin: boolean;
  passwordSalt: string;
  passwordHash: string;
}> {
  const { salt, hash } = hashPassword('AkherSaa@2026');
  return [
    {
      id: 'identity_admin_ma1927393',
      identityNumber: 'ADMIN-001',
      fullName: 'محمد احمد عبد اللطيف (مدير النظام الأعلى)',
      email: SUPER_ADMIN_EMAIL,
      phoneNumber: '01142021260',
      department: 'الإدارة العامة',
      role: 'admin',
      status: 'active',
      isSuperAdmin: true,
      passwordSalt: salt,
      passwordHash: hash,
    },
    {
      id: 'usr-gm-01',
      identityNumber: 'USR-002',
      fullName: 'د. عبد المنعم كمال (المدير العام)',
      email: 'gm@akhersaa.com',
      phoneNumber: '01099887766',
      department: 'الإدارة العامة',
      role: 'general_manager',
      status: 'active',
      isSuperAdmin: false,
      passwordSalt: salt,
      passwordHash: hash,
    },
    {
      id: 'usr-hr-mgr-01',
      identityNumber: 'USR-003',
      fullName: 'أ. عصام الشناوي (مدير الموارد البشرية)',
      email: 'hr.manager@akhersaa.com',
      phoneNumber: '01122334455',
      department: 'إدارة الموارد البشرية',
      role: 'hr_manager',
      status: 'active',
      isSuperAdmin: false,
      passwordSalt: salt,
      passwordHash: hash,
    },
    {
      id: 'usr-hr-spec-01',
      identityNumber: 'USR-004',
      fullName: 'أ. مروة يسري (الموارد البشرية)',
      email: 'hr@akhersaa.com',
      phoneNumber: '01144332211',
      department: 'إدارة الموارد البشرية',
      role: 'hr',
      status: 'active',
      isSuperAdmin: false,
      passwordSalt: salt,
      passwordHash: hash,
    },
    {
      id: 'usr-fin-01',
      identityNumber: 'USR-005',
      fullName: 'أ. كمال شريف (مدير إدارة المالية)',
      email: 'finance.mgr@akhersaa.com',
      phoneNumber: '01233445566',
      department: 'إدارة المالية',
      role: 'dept_finance',
      status: 'active',
      isSuperAdmin: false,
      passwordSalt: salt,
      passwordHash: hash,
    },
    {
      id: 'usr-exec-01',
      identityNumber: 'USR-006',
      fullName: 'م. شريف المنياوي (مدير إدارة التنفيذية)',
      email: 'executive.mgr@akhersaa.com',
      phoneNumber: '01044556677',
      department: 'إدارة التنفيذية',
      role: 'dept_executive',
      status: 'active',
      isSuperAdmin: false,
      passwordSalt: salt,
      passwordHash: hash,
    },
    {
      id: 'usr-tech-01',
      identityNumber: 'USR-007',
      fullName: 'م. حازم الصاوي (مدير إدارة التقنية)',
      email: 'tech.mgr@akhersaa.com',
      phoneNumber: '01155667788',
      department: 'إدارة التقنية',
      role: 'dept_tech',
      status: 'active',
      isSuperAdmin: false,
      passwordSalt: salt,
      passwordHash: hash,
    },
    {
      id: 'usr-serv-01',
      identityNumber: 'USR-008',
      fullName: 'ك. حسام البدري (مدير إدارة الخدمات)',
      email: 'services.mgr@akhersaa.com',
      phoneNumber: '01266778899',
      department: 'إدارة الخدمات',
      role: 'dept_services',
      status: 'active',
      isSuperAdmin: false,
      passwordSalt: salt,
      passwordHash: hash,
    },
    {
      id: 'usr-prod-01',
      identityNumber: 'USR-009',
      fullName: 'شيف محمود الخولي (مدير إدارة الإنتاج)',
      email: 'production.mgr@akhersaa.com',
      phoneNumber: '01077889900',
      department: 'إدارة الإنتاج',
      role: 'dept_production',
      status: 'active',
      isSuperAdmin: false,
      passwordSalt: salt,
      passwordHash: hash,
    },
    {
      id: 'usr-ctrl-01',
      identityNumber: 'USR-010',
      fullName: 'د. وليد الباز (مدير إدارة الرقابة والجودة)',
      email: 'control.mgr@akhersaa.com',
      phoneNumber: '01188990011',
      department: 'إدارة الرقابة',
      role: 'dept_control',
      status: 'active',
      isSuperAdmin: false,
      passwordSalt: salt,
      passwordHash: hash,
    },
    {
      id: 'usr-mkt-01',
      identityNumber: 'USR-011',
      fullName: 'أ. دينا السعدني (مدير إدارة التسويق)',
      email: 'marketing.mgr@akhersaa.com',
      phoneNumber: '01299001122',
      department: 'إدارة التسويق',
      role: 'dept_marketing',
      status: 'active',
      isSuperAdmin: false,
      passwordSalt: salt,
      passwordHash: hash,
    },
    {
      id: 'usr-sales-01',
      identityNumber: 'USR-012',
      fullName: 'أ. تامر رضوان (مدير إدارة المبيعات)',
      email: 'sales.mgr@akhersaa.com',
      phoneNumber: '01033221100',
      department: 'إدارة المبيعات',
      role: 'dept_sales',
      status: 'active',
      isSuperAdmin: false,
      passwordSalt: salt,
      passwordHash: hash,
    },
  ];
}

async function runMigrationOnce(): Promise<void> {
  // Fast exit if migration marker already exists in PostgreSQL
  const existingSettings = await db.select().from(systemSettings);
  const doneFlag = existingSettings.find((s) => s.key === 'migration_v1_completed');
  if (doneFlag && (doneFlag.value as any)?.completed === true) {
    migrationDone = true;
    return;
  }

  const now = new Date();
  const nowArabic = now.toLocaleString('ar-EG');

  // Best-effort read of existing Firestore collections (bounded timeout)
  const legacy = await readLegacyFirestoreSnapshot();

  // 1. Seed & migrate Departments
  const baseDepts = [
    ...DEPARTMENTS.map((d) => ({
      id: d.id,
      name: d.name,
      code: d.id.toUpperCase(),
      description: d.description,
      managerTitle: d.managerTitle,
      roleKey: d.roleKey,
      color: d.color,
    })),
    {
      id: 'dept_general',
      name: 'الإدارة العامة',
      code: 'DEPT_GENERAL',
      description: 'الإدارة العامة والقيادة التنفيذية العليا',
      managerTitle: 'المدير العام',
      roleKey: 'general_manager',
      color: 'amber',
    },
    {
      id: 'dept_hr',
      name: 'إدارة الموارد البشرية',
      code: 'DEPT_HR',
      description: 'الموارد البشرية والتعيينات وشؤون العاملين',
      managerTitle: 'مدير الموارد البشرية',
      roleKey: 'hr_manager',
      color: 'teal',
    },
  ];

  for (const dept of baseDepts) {
    await db
      .insert(departments)
      .values({
        ...dept,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();
  }

  for (const lDept of legacy.departments as CompanyDepartment[]) {
    if (!lDept?.id || !lDept?.name) continue;
    await db
      .insert(departments)
      .values({
        id: lDept.id,
        name: lDept.name.trim(),
        code: (lDept.code || lDept.id).toUpperCase(),
        description: lDept.description || '',
        managerTitle: lDept.managerName || `مدير ${lDept.name}`,
        roleKey: lDept.roleKey || 'direct_manager',
        color: lDept.color || 'slate',
        createdAt: parseSafeDate(lDept.createdAt),
        updatedAt: parseSafeDate(lDept.updatedAt),
      })
      .onConflictDoNothing();
  }

  // 2. Seed & migrate Users (Identities + default leadership)
  const existingUserRows = await db.select({ id: users.id, email: users.email, identityNumber: users.identityNumber }).from(users);
  const knownUserIds = new Set<string>(existingUserRows.map((u) => u.id));
  const seenEmails = new Set<string>(existingUserRows.map((u) => u.email.trim().toLowerCase()));
  const seenIdentityNumbers = new Set<string>(existingUserRows.map((u) => u.identityNumber));

  const mergedRawUsers: any[] = [];
  for (const iden of legacy.identities as UserIdentity[]) {
    if (iden?.email) mergedRawUsers.push(iden);
  }
  for (const uDoc of legacy.users) {
    if (uDoc?.email) mergedRawUsers.push(uDoc);
  }
  for (const def of buildDefaultUsers(now)) {
    mergedRawUsers.push(def);
  }

  // Normalize Super Admin first
  for (const raw of mergedRawUsers) {
    const email = String(raw.email || '').trim().toLowerCase();
    if (!email) continue;
    if (seenEmails.has(email)) continue;

    const isSuper = email === SUPER_ADMIN_EMAIL.toLowerCase();
    const id = isSuper
      ? 'identity_admin_ma1927393'
      : String(raw.id || `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);

    if (knownUserIds.has(id)) continue;

    let identityNumber = isSuper
      ? 'ADMIN-001'
      : String(raw.identityNumber || `USR-${Math.floor(1000 + Math.random() * 9000)}`);
    while (seenIdentityNumbers.has(identityNumber)) {
      identityNumber = `USR-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const role: UserRole = isSuper ? 'admin' : (raw.role as UserRole) || 'hr';
    const department = isSuper
      ? 'الإدارة العامة'
      : String(raw.department || (role === 'hr' || role === 'hr_manager' ? 'إدارة الموارد البشرية' : 'الإدارة العامة'));
    const departmentId = await resolveDepartmentId(department, role);
    const fullName = String(raw.fullName || raw.displayName || email.split('@')[0]).trim();
    const { salt, hash } =
      raw.passwordSalt && raw.passwordHash
        ? { salt: raw.passwordSalt, hash: raw.passwordHash }
        : hashPassword('AkherSaa@2026');

    const permissions = isSuper
      ? { ...SYSTEM_ADMIN_FULL_PERMISSIONS }
      : raw.permissions || getDefaultPermissionsForRole(role);

    await db
      .insert(users)
      .values({
        id,
        uid: raw.uid || (raw.isGoogleUser ? id : null),
        identityNumber,
        username: raw.username || email.split('@')[0],
        fullName,
        displayName: fullName,
        email,
        phoneNumber: raw.phoneNumber || '',
        departmentId,
        department,
        role,
        jobTitle: raw.jobTitle || getRoleDisplayTitle(role),
        status: isSuper ? 'active' : ((raw.status as AccountStatus) || 'active'),
        permissions,
        passwordHash: hash,
        passwordSalt: salt,
        isSuperAdmin: isSuper || Boolean(raw.isSuperAdmin),
        isGoogleUser: Boolean(raw.isGoogleUser),
        photoUrl: raw.photoURL || raw.photoUrl || null,
        notes: raw.notes || null,
        createdDateArabic: raw.createdDateArabic || nowArabic,
        lastLoginAt: raw.lastLoginAt ? parseSafeDate(raw.lastLoginAt) : null,
        createdAt: parseSafeDate(raw.createdAt),
        updatedAt: parseSafeDate(raw.updatedAt),
      })
      .onConflictDoNothing();

    knownUserIds.add(id);
    seenEmails.add(email);
    seenIdentityNumbers.add(identityNumber);
  }

  // 3. Migrate or Seed Applications
  const [{ value: currentAppCount }] = await db.select({ value: count() }).from(applications);
  const existingAppsRows = await db.select({ id: applications.id }).from(applications);
  const knownAppIds = new Set<string>(existingAppsRows.map((a) => a.id));

  const appsToInsert: JobApplication[] =
    legacy.applications.length > 0
      ? (legacy.applications as JobApplication[])
      : currentAppCount === 0
      ? INITIAL_APPLICANTS
      : [];

  const existingSigRows = await db.select({ id: applicationSignatures.id }).from(applicationSignatures);
  const knownSigIds = new Set<string>(existingSigRows.map((s) => s.id));

  for (const app of appsToInsert) {
    if (!app?.id || knownAppIds.has(app.id)) continue;

    const assignedDeptId = await resolveDepartmentId(app.assignedDepartment);
    const createdAt = parseSafeDate(app.lastUpdated || app.timestamp);
    const lastUpdated = parseSafeDate(app.lastUpdated || app.timestamp);

    await db
      .insert(applications)
      .values({
        id: app.id,
        recordNumber: app.recordNumber || '',
        timestampText: app.timestamp || createdAt.toISOString(),
        todayDate: app.todayDate || null,
        fullName: app.fullName || 'متقدم غير مسمى',
        nationalId: app.nationalId || '',
        birthDate: app.birthDate || '',
        gender: app.gender || '',
        address: app.address || '',
        phone: app.phone || '',
        emergencyContact: app.emergencyContact || '',
        qualification: app.qualification || '',
        qualificationDate: app.qualificationDate || '',
        maritalStatus: app.maritalStatus || '',
        positionApplied: app.positionApplied || '',
        internalReferrals: app.internalReferrals || '',
        prevCompany: app.prevCompany || '',
        prevPosition: app.prevPosition || '',
        prevManager: app.prevManager || '',
        experienceYears: app.experienceYears || '',
        workHours: app.workHours || '',
        prevSalary: app.prevSalary || '',
        reasonForLeaving: app.reasonForLeaving || '',
        prevCompany2: app.prevCompany2 || null,
        prevPosition2: app.prevPosition2 || null,
        prevManager2: app.prevManager2 || null,
        experienceYears2: app.experienceYears2 || null,
        workHours2: app.workHours2 || null,
        reasonForLeaving2: app.reasonForLeaving2 || null,
        prevCompany3: app.prevCompany3 || null,
        prevPosition3: app.prevPosition3 || null,
        prevManager3: app.prevManager3 || null,
        experienceYears3: app.experienceYears3 || null,
        reasonForLeaving3: app.reasonForLeaving3 || null,
        computerSkills: app.computerSkills || '',
        englishLevel: app.englishLevel || '',
        drivingLicense: app.drivingLicense || '',
        drivingLicenseDegree: app.drivingLicenseDegree || null,
        smoking: app.smoking || '',
        chronicDiseases: app.chronicDiseases || '',
        acknowledgement: app.acknowledgement || '',
        score: app.score || null,
        isPraying: app.isPraying || null,
        militaryStatus: app.militaryStatus || null,
        expectedSalary: app.expectedSalary || null,
        personalPhotoUrl: app.personalPhotoUrl || null,
        assignedDepartmentId: assignedDeptId,
        assignedDepartment: app.assignedDepartment || null,
        assignedDepartmentManager: app.assignedDepartmentManager || null,
        hrReview: app.hrReview || emptySectionReview(),
        hrManagerReview: app.hrManagerReview || emptySectionReview(),
        directManagerReview: app.directManagerReview || emptySectionReview(),
        generalManagerReview: app.generalManagerReview || emptyGmReview(),
        status: app.status || 'new',
        lastActionDate: app.lastActionDate || null,
        lastActionType: app.lastActionType || null,
        notes: app.notes || null,
        tags: app.tags || null,
        createdByUserId: null,
        lastUpdated,
        createdAt,
      })
      .onConflictDoNothing();

    knownAppIds.add(app.id);

    // Insert structured stage signatures if present on application
    const stageMap: Array<{ stage: WorkflowSignatureStage; sig?: ElectronicSignature }> = [
      { stage: 'hr', sig: app.signatures?.hr || app.hrReview?.electronicSignature },
      {
        stage: 'hr_manager',
        sig: app.signatures?.hr_manager || app.hrManagerReview?.electronicSignature,
      },
      {
        stage: 'direct_manager',
        sig: app.signatures?.direct_manager || app.directManagerReview?.electronicSignature,
      },
      {
        stage: 'general_manager',
        sig: app.signatures?.general_manager || app.generalManagerReview?.electronicSignature,
      },
    ];

    for (const item of stageMap) {
      const sig = item.sig;
      if (!sig || !sig.id || !sig.fullName) continue;
      await db
        .insert(applicationSignatures)
        .values({
          id: sig.id,
          applicationId: app.id,
          userId: sig.userId && knownUserIds.has(sig.userId) ? sig.userId : null,
          stage: item.stage,
          stageLabel: sig.stageLabel || item.stage,
          fullName: sig.fullName,
          email: sig.email || '',
          role: sig.role || 'hr',
          jobTitle: sig.jobTitle || getRoleDisplayTitle(sig.role),
          department: sig.department || app.assignedDepartment || 'الإدارة العامة',
          action: sig.action || 'approve',
          decision: sig.decision || 'معتمد',
          signedAt: parseSafeDate(sig.signedAt),
          signedAtArabic: sig.signedAtArabic || nowArabic,
          immutable: true,
        })
        .onConflictDoNothing();
      knownSigIds.add(sig.id);
    }

    // Insert approval history if present
    if (Array.isArray(app.approvalHistory)) {
      for (const hist of app.approvalHistory) {
        if (!hist?.id) continue;
        await db
          .insert(approvalHistory)
          .values({
            id: hist.id,
            applicationId: app.id,
            userId: hist.userId && knownUserIds.has(hist.userId) ? hist.userId : null,
            userName: hist.userName || hist.signature || hist.userEmail || 'مستخدم النظام',
            userEmail: hist.userEmail || '',
            role: hist.role || 'hr',
            jobTitle: hist.jobTitle || null,
            department: hist.department || null,
            stage: hist.stage || null,
            stageLabel: hist.stageLabel || null,
            action: hist.action || 'approve',
            decision: hist.decision || '',
            oldStatus: hist.oldStatus || 'new',
            newStatus: hist.newStatus || app.status,
            notice: hist.notice || null,
            signature: hist.signature || null,
            signatureId:
              hist.electronicSignature?.id && knownSigIds.has(hist.electronicSignature.id)
                ? hist.electronicSignature.id
                : null,
            salary: hist.salary || null,
            dateArabic: hist.dateArabic || nowArabic,
            timestamp: parseSafeDate(hist.timestamp),
          })
          .onConflictDoNothing();
      }
    }
  }

  // 4. Insert standalone electronic_signatures if any from legacy Firestore
  for (const sig of legacy.signatures as ElectronicSignature[]) {
    if (!sig?.id || !sig.applicationId || !knownAppIds.has(sig.applicationId)) continue;
    if (knownSigIds.has(sig.id)) continue;
    await db
      .insert(applicationSignatures)
      .values({
        id: sig.id,
        applicationId: sig.applicationId,
        userId: sig.userId && knownUserIds.has(sig.userId) ? sig.userId : null,
        stage: sig.stage || 'hr',
        stageLabel: sig.stageLabel || sig.stage || 'الموارد البشرية',
        fullName: sig.fullName || 'مستخدم النظام',
        email: sig.email || '',
        role: sig.role || 'hr',
        jobTitle: sig.jobTitle || getRoleDisplayTitle(sig.role),
        department: sig.department || 'الإدارة العامة',
        action: sig.action || 'approve',
        decision: sig.decision || 'معتمد',
        signedAt: parseSafeDate(sig.signedAt),
        signedAtArabic: sig.signedAtArabic || nowArabic,
        immutable: true,
      })
      .onConflictDoNothing();
    knownSigIds.add(sig.id);
  }

  // 5. Migrate or Seed Notifications
  const [{ value: currentNotifCount }] = await db.select({ value: count() }).from(notifications);
  if (legacy.notifications.length > 0) {
    for (const n of legacy.notifications as AppNotification[]) {
      if (!n?.id) continue;
      await db
        .insert(notifications)
        .values({
          id: n.id,
          applicantId: n.applicantId && knownAppIds.has(n.applicantId) ? n.applicantId : null,
          applicantName: n.applicantName || 'مرشح',
          position: n.position || '',
          targetRole: n.targetRole || 'hr',
          title: n.title || 'تنبيه إداري',
          message: n.message || '',
          timestampText: n.timestamp || nowArabic,
          isRead: Boolean(n.isRead),
          priority: n.priority || 'high',
          createdAt: now,
        })
        .onConflictDoNothing();
    }
  } else if (currentNotifCount === 0 && knownAppIds.size > 0) {
    const seedNotifs: Array<Omit<AppNotification, 'priority'> & { priority: 'high' | 'normal' }> = [
      {
        id: 'notif-1',
        applicantId: knownAppIds.has('app-001') ? 'app-001' : '',
        applicantName: 'محمد عادل احمد',
        position: 'محاسب فرع / أمين خزينة',
        targetRole: 'general_manager',
        title: 'طلب بانتظار اعتماد الراتب النهائي',
        message: 'اجتاز محمد عادل فحص الموارد البشرية وموافقة مدير الإدارة، بانتظار اعتماد الراتب والتعيين.',
        timestamp: '14:15',
        isRead: false,
        priority: 'high',
      },
      {
        id: 'notif-2',
        applicantId: knownAppIds.has('app-002') ? 'app-002' : '',
        applicantName: 'محمود كمال إبراهيم الديب',
        position: 'كابتن صالة / مقدم طلبات',
        targetRole: 'dept_services',
        title: 'تقييم فني مطلوب من مدير إدارة الخدمات',
        message: 'وافق مدير الموارد البشرية على الطلب وأحاله لإجراء المقابلة الفنية والاختبار العملي.',
        timestamp: '12:30',
        isRead: false,
        priority: 'high',
      },
      {
        id: 'notif-3',
        applicantId: knownAppIds.has('app-010') ? 'app-010' : '',
        applicantName: 'أحمد مجدي نصر الزيات',
        position: 'كاشير فرع / استقبال صالة',
        targetRole: 'hr',
        title: 'وصول طلب توظيف جديد',
        message: 'طلب توظيف جديد مسجل في المنظومة وبانتظار فحص الموارد البشرية.',
        timestamp: '16:15',
        isRead: false,
        priority: 'high',
      },
    ];
    for (const sn of seedNotifs) {
      await db
        .insert(notifications)
        .values({
          id: sn.id,
          applicantId: sn.applicantId || null,
          applicantName: sn.applicantName,
          position: sn.position,
          targetRole: sn.targetRole,
          title: sn.title,
          message: sn.message,
          timestampText: sn.timestamp,
          isRead: sn.isRead,
          priority: sn.priority,
          createdAt: now,
        })
        .onConflictDoNothing();
    }
  }

  // 6. Migrate Legacy Audit Logs
  for (const log of legacy.auditLogs as AuditLogEntry[]) {
    if (!log?.id || !log?.action) continue;
    await db
      .insert(auditLogs)
      .values({
        id: log.id,
        userId: log.userId || null,
        userName: log.userName || null,
        userEmail: log.userEmail || null,
        userRole: log.userRole || null,
        performedByName: log.performedByName || null,
        performedByEmail: log.performedByEmail || null,
        performedByRole: log.performedByRole || null,
        action: log.action,
        targetId: log.targetId || null,
        targetType: log.targetType || 'system',
        targetName: log.targetName || null,
        previousValue: log.previousValue ?? null,
        newValue: log.newValue ?? null,
        details: log.details || '',
        metadata: log.metadata ?? null,
        dateArabic: log.dateArabic || nowArabic,
        timestamp: parseSafeDate(log.timestamp),
      })
      .onConflictDoNothing();
  }

  // 7. Persist System Settings & Mark Migration Complete
  await db
    .insert(systemSettings)
    .values({
      key: 'recruitment_policy',
      value: {
        companyName: 'شركة آخر ساعة إسبشيال',
        workflowStages: ['hr', 'hr_manager', 'direct_manager', 'general_manager'],
        signatureMode: 'name_only',
        requireDepartmentAssignment: true,
        allowPublicSelfRegistration: false,
      },
      description: 'سياسة التوظيف ومسار الاعتمادات الرباعي',
      updatedBy: 'system',
      updatedAt: now,
    })
    .onConflictDoNothing();

  // Ensure initial clean empty salary structure row exists (zero fake numbers)
  await db
    .insert(salaryStructures)
    .values({
      id: 'default',
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

  await db
    .insert(systemSettings)
    .values({
      key: 'migration_v1_completed',
      value: {
        completed: true,
        migratedAt: now.toISOString(),
        source: legacy.applications.length > 0 ? 'firestore' : 'initial_seed',
        counts: {
          users: knownUserIds.size,
          applications: knownAppIds.size,
          signatures: knownSigIds.size,
          auditLogs: legacy.auditLogs.length,
        },
      },
      description: 'حالة اكتمال ترحيل البيانات إلى قاعدة بيانات PostgreSQL',
      updatedBy: 'system',
      updatedAt: now,
    })
    .onConflictDoNothing();

  migrationDone = true;
}

/**
 * Lazy, idempotent PostgreSQL migration initializer.
 * Triggered automatically on the first incoming API request (NOT on module load).
 */
export async function ensureSqlInitialized(): Promise<void> {
  if (migrationDone) return;
  if (!migrationPromise) {
    migrationPromise = runMigrationOnce().catch((err) => {
      migrationPromise = null;
      console.error('[SQL Migration] Initialization failed:', err);
      throw new Error('تعذر تهيئة قاعدة البيانات أو التحقق من الجداول.', { cause: err });
    });
  }
  return migrationPromise;
}
