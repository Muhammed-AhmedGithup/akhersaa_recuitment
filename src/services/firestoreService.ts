import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import {
  JobApplication,
  AppNotification,
  UserRole,
  UserIdentity,
  CompanyDepartment,
  AuditLogEntry,
  IdentityStatus,
  SUPER_ADMIN_EMAIL,
  FULL_PERMISSIONS
} from '../types';

export interface UserProfileDoc {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

const APPS_PATH = 'applications';
const NOTIFS_PATH = 'notifications';
const USERS_PATH = 'users';
const IDENTITIES_PATH = 'identities';
const DEPTS_PATH = 'departments';
const AUDIT_LOGS_PATH = 'audit_logs';

export const SYSTEM_ADMIN_EMAIL = 'ma1927393@gmail.com';
export const SYSTEM_ADMIN_NAME = 'محمد احمد عبد اللطيف';

export const SUPER_ADMIN_IDENTITY: UserIdentity = {
  id: 'identity_admin_ma1927393',
  identityNumber: 'ADMIN-001',
  fullName: SYSTEM_ADMIN_NAME,
  email: SYSTEM_ADMIN_EMAIL,
  phoneNumber: '01000000000',
  department: 'الإدارة العامة / إدارة النظام',
  jobTitle: 'مدير عام النظام والمشرف الرئيسي (Admin)',
  role: 'admin',
  userType: 'system_admin',
  status: 'active',
  isSuperAdmin: true,
  permissions: FULL_PERMISSIONS,
  officialSignature: `${SYSTEM_ADMIN_NAME} (مدير النظام - Admin)`,
  createdAt: '2026-01-01T00:00:00.000Z',
  createdDateArabic: '2026/01/01',
  updatedAt: new Date().toISOString(),
  notes: 'الحساب الرئيسي وهوية الأدمن المعتمدة للنظام بكامل الصلاحيات',
};

/**
 * Subscribes in real-time to the applications collection
 */
export function subscribeToApplications(
  onUpdate: (apps: JobApplication[]) => void,
  onError?: (error: unknown) => void
) {
  return onSnapshot(
    collection(db, APPS_PATH),
    (snapshot) => {
      const items: JobApplication[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as JobApplication;
        items.push({
          ...data,
          id: docSnap.id,
        });
      });
      // Sort by lastUpdated or timestamp descending
      items.sort((a, b) => {
        const timeA = new Date(a.lastUpdated || a.timestamp || 0).getTime();
        const timeB = new Date(b.lastUpdated || b.timestamp || 0).getTime();
        return timeB - timeA;
      });
      // Always notify listener with real-time snapshot (even if empty, e.g. after deletion)
      onUpdate(items);
    },
    (error) => {
      console.error('[Firestore] Real-time subscribe error:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, APPS_PATH);
    }
  );
}

/**
 * Saves or updates a single job application in Firestore
 */
export async function saveApplicationToFirestore(app: JobApplication): Promise<void> {
  const docRef = doc(db, APPS_PATH, app.id);
  try {
    // Sanitize any undefined properties for clean Firestore serialization
    const cleanApp = JSON.parse(JSON.stringify(app));
    await setDoc(docRef, cleanApp, { merge: true });
    console.log(`[Firestore] Application saved/updated: ${app.id} (${app.fullName})`);
  } catch (error) {
    console.error(`[Firestore] Error saving application ${app.id}:`, error);
    handleFirestoreError(error, OperationType.WRITE, `${APPS_PATH}/${app.id}`);
  }
}

/**
 * Deletes a single job application from Firestore
 */
export async function deleteApplicationFromFirestore(appId: string): Promise<void> {
  const docRef = doc(db, APPS_PATH, appId);
  try {
    await deleteDoc(docRef);
    console.log(`[Firestore] Application deleted from database: ${appId}`);
  } catch (error) {
    console.error(`[Firestore] Error deleting application ${appId}:`, error);
    handleFirestoreError(error, OperationType.DELETE, `${APPS_PATH}/${appId}`);
  }
}

/**
 * Seeds initial applications to Firestore only if the collection is empty AND not previously initialized.
 * This prevents deleted data from resurrecting on page refresh.
 */
export async function seedInitialApplicantsIfEmpty(initialApps: JobApplication[]): Promise<boolean> {
  try {
    const wasInitialized = localStorage.getItem('akher_saa_db_initialized_v2');
    if (wasInitialized) {
      return false; // User has already initialized database; do not overwrite user deletions
    }

    const existingSnap = await getDocs(collection(db, APPS_PATH));
    if (!existingSnap.empty) {
      localStorage.setItem('akher_saa_db_initialized_v2', 'true');
      return false; // Already seeded in cloud
    }

    const batch = writeBatch(db);
    for (const app of initialApps) {
      const ref = doc(db, APPS_PATH, app.id);
      batch.set(ref, JSON.parse(JSON.stringify(app)));
    }
    await batch.commit();
    localStorage.setItem('akher_saa_db_initialized_v2', 'true');
    console.log(`[Firestore] Seeded ${initialApps.length} initial applicants to database.`);
    return true;
  } catch (error) {
    console.warn('[Firestore] Initial seed skipped or unavailable:', error);
    return false;
  }
}

/**
 * Force resets the database with default sample applicants if explicitly requested by the user
 */
export async function forceResetToSampleData(initialApps: JobApplication[]): Promise<void> {
  try {
    const existingSnap = await getDocs(collection(db, APPS_PATH));
    const batch = writeBatch(db);
    existingSnap.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    for (const app of initialApps) {
      const ref = doc(db, APPS_PATH, app.id);
      batch.set(ref, JSON.parse(JSON.stringify(app)));
    }
    await batch.commit();
    localStorage.setItem('akher_saa_db_initialized_v2', 'true');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, APPS_PATH);
  }
}

/**
 * Subscribes to notifications in Firestore
 */
export function subscribeToNotifications(
  onUpdate: (notifs: AppNotification[]) => void,
  onError?: (error: unknown) => void
) {
  return onSnapshot(
    collection(db, NOTIFS_PATH),
    (snapshot) => {
      const items: AppNotification[] = [];
      snapshot.forEach((docSnap) => {
        items.push({
          ...(docSnap.data() as AppNotification),
          id: docSnap.id,
        });
      });
      onUpdate(items);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, NOTIFS_PATH);
    }
  );
}

/**
 * Saves a notification to Firestore
 */
export async function saveNotificationToFirestore(notif: AppNotification): Promise<void> {
  const docRef = doc(db, NOTIFS_PATH, notif.id);
  try {
    await setDoc(docRef, JSON.parse(JSON.stringify(notif)), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${NOTIFS_PATH}/${notif.id}`);
  }
}

/**
 * Marks a notification as read in Firestore
 */
export async function markNotificationAsReadInFirestore(notifId: string): Promise<void> {
  const docRef = doc(db, NOTIFS_PATH, notifId);
  try {
    await setDoc(docRef, { isRead: true }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${NOTIFS_PATH}/${notifId}`);
  }
}

/**
 * Clears or deletes notifications in Firestore
 */
export async function clearNotificationsInFirestore(notifIds: string[]): Promise<void> {
  if (notifIds.length === 0) return;
  const batch = writeBatch(db);
  for (const id of notifIds) {
    batch.delete(doc(db, NOTIFS_PATH, id));
  }
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, NOTIFS_PATH);
  }
}

/**
 * Saves or updates user profile in Firestore
 */
export async function saveUserProfileToFirestore(profile: UserProfileDoc): Promise<void> {
  const docRef = doc(db, USERS_PATH, profile.id);
  try {
    await setDoc(docRef, profile, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${USERS_PATH}/${profile.id}`);
  }
}

/* =========================================================================
   ENTERPRISE IAM & IDENTITY GOVERNANCE (Identities, Departments, Audit Logs)
   ========================================================================= */

/**
 * Subscribes in real-time to the identities collection
 */
export function subscribeToIdentities(
  onUpdate: (identities: UserIdentity[]) => void,
  onError?: (error: unknown) => void
) {
  return onSnapshot(
    collection(db, IDENTITIES_PATH),
    (snapshot) => {
      const items: UserIdentity[] = [];
      snapshot.forEach((docSnap) => {
        items.push({
          ...(docSnap.data() as UserIdentity),
          id: docSnap.id,
        });
      });
      // Sort super admin first, then descending
      items.sort((a, b) => {
        if (a.isSuperAdmin) return -1;
        if (b.isSuperAdmin) return 1;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
      onUpdate(items);
    },
    (error) => {
      console.error('[Firestore] Real-time identities subscribe error:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, IDENTITIES_PATH);
    }
  );
}

/**
 * Subscribes in real-time to the departments collection
 */
export function subscribeToDepartments(
  onUpdate: (depts: CompanyDepartment[]) => void,
  onError?: (error: unknown) => void
) {
  return onSnapshot(
    collection(db, DEPTS_PATH),
    (snapshot) => {
      const items: CompanyDepartment[] = [];
      snapshot.forEach((docSnap) => {
        items.push({
          ...(docSnap.data() as CompanyDepartment),
          id: docSnap.id,
        });
      });
      onUpdate(items);
    },
    (error) => {
      console.error('[Firestore] Real-time departments subscribe error:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, DEPTS_PATH);
    }
  );
}

/**
 * Subscribes in real-time to the audit logs collection
 */
export function subscribeToAuditLogs(
  onUpdate: (logs: AuditLogEntry[]) => void,
  onError?: (error: unknown) => void
) {
  return onSnapshot(
    collection(db, AUDIT_LOGS_PATH),
    (snapshot) => {
      const items: AuditLogEntry[] = [];
      snapshot.forEach((docSnap) => {
        items.push({
          ...(docSnap.data() as AuditLogEntry),
          id: docSnap.id,
        });
      });
      items.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
      onUpdate(items);
    },
    (error) => {
      console.error('[Firestore] Real-time audit logs subscribe error:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, AUDIT_LOGS_PATH);
    }
  );
}

/**
 * Saves or updates a user identity in Firestore
 */
export async function saveIdentityToFirestore(identity: UserIdentity): Promise<void> {
  const docRef = doc(db, IDENTITIES_PATH, identity.id);
  try {
    await setDoc(docRef, JSON.parse(JSON.stringify(identity)), { merge: true });
    console.log(`[Firestore] Identity saved: ${identity.id} (${identity.fullName})`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${IDENTITIES_PATH}/${identity.id}`);
  }
}

/**
 * Deletes a user identity from Firestore
 */
export async function deleteIdentityFromFirestore(
  identityId: string,
  targetEmail?: string,
  performer?: { email?: string; name?: string; role?: string }
): Promise<void> {
  const docRef = doc(db, IDENTITIES_PATH, identityId);
  try {
    await deleteDoc(docRef);
    console.log(`[Firestore] Identity deleted: ${identityId}`);
    if (performer && targetEmail) {
      logAuditEvent({
        action: 'DELETE_IDENTITY',
        performedByEmail: performer.email || SYSTEM_ADMIN_EMAIL,
        performedByName: performer.name || SYSTEM_ADMIN_NAME,
        performedByRole: performer.role || 'admin',
        targetType: 'identity',
        targetId: identityId,
        targetName: targetEmail,
        details: `تم حذف هوية المستخدم (${targetEmail}) نهائياً.`,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${IDENTITIES_PATH}/${identityId}`);
  }
}

/**
 * Toggles identity status (active / suspended) in Firestore
 */
export async function toggleIdentityStatusInFirestore(
  identityId: string,
  newOrCurrentStatus: IdentityStatus,
  targetEmail?: string,
  performer?: { email?: string; name?: string; role?: string }
): Promise<void> {
  const docRef = doc(db, IDENTITIES_PATH, identityId);
  try {
    await setDoc(docRef, { status: newOrCurrentStatus, updatedAt: new Date().toISOString() }, { merge: true });
    if (performer && targetEmail) {
      logAuditEvent({
        action: newOrCurrentStatus === 'active' ? 'ACTIVATE_IDENTITY' : 'SUSPEND_IDENTITY',
        performedByEmail: performer.email || SYSTEM_ADMIN_EMAIL,
        performedByName: performer.name || SYSTEM_ADMIN_NAME,
        performedByRole: performer.role || 'admin',
        targetType: 'identity',
        targetId: identityId,
        targetName: targetEmail,
        details: `تم ${newOrCurrentStatus === 'active' ? 'تفعيل' : 'إيقاف'} هوية المستخدم (${targetEmail}).`,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${IDENTITIES_PATH}/${identityId}`);
  }
}

/**
 * Saves or updates a company department in Firestore
 */
export async function saveDepartmentToFirestore(
  dept: CompanyDepartment,
  performer?: { email?: string; name?: string; role?: string }
): Promise<void> {
  const docRef = doc(db, DEPTS_PATH, dept.id);
  try {
    await setDoc(docRef, JSON.parse(JSON.stringify(dept)), { merge: true });
    if (performer) {
      logAuditEvent({
        action: 'CREATE_DEPARTMENT',
        performedByEmail: performer.email || SYSTEM_ADMIN_EMAIL,
        performedByName: performer.name || SYSTEM_ADMIN_NAME,
        performedByRole: performer.role || 'admin',
        targetType: 'department',
        targetId: dept.id,
        targetName: dept.name,
        details: `تم حفظ/تحديث بيانات إدارة (${dept.name}) في الهيكل الإداري.`,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${DEPTS_PATH}/${dept.id}`);
  }
}

/**
 * Deletes a company department from Firestore
 */
export async function deleteDepartmentFromFirestore(
  deptId: string,
  deptName?: string,
  performer?: { email?: string; name?: string; role?: string }
): Promise<void> {
  const docRef = doc(db, DEPTS_PATH, deptId);
  try {
    await deleteDoc(docRef);
    if (performer && deptName) {
      logAuditEvent({
        action: 'DELETE_DEPARTMENT',
        performedByEmail: performer.email || SYSTEM_ADMIN_EMAIL,
        performedByName: performer.name || SYSTEM_ADMIN_NAME,
        performedByRole: performer.role || 'admin',
        targetType: 'department',
        targetId: deptId,
        targetName: deptName,
        details: `تم حذف إدارة (${deptName}) من الهيكل التنظيمي.`,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${DEPTS_PATH}/${deptId}`);
  }
}

/**
 * Logs an immutable audit event in Firestore
 */
export async function logAuditEvent(
  event: Omit<AuditLogEntry, 'id' | 'timestamp' | 'dateArabic'>
): Promise<void> {
  const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date();
  const entry: AuditLogEntry = {
    ...event,
    id,
    timestamp: now.toISOString(),
    dateArabic: now.toLocaleString('ar-EG'),
  };
  const docRef = doc(db, AUDIT_LOGS_PATH, id);
  try {
    await setDoc(docRef, JSON.parse(JSON.stringify(entry)));
  } catch (error) {
    console.warn('[Firestore] Log audit event error:', error);
  }
}

/**
 * PURGE ALL IDENTITIES AND ESTABLISH MOHAMED AHMED ABDEL LATIF AS SOLE ADMIN
 * Deletes all other identities and users, creating and locking Mohamed Ahmed Abdel Latif as Admin.
 */
export async function purgeAllIdentitiesAndSetSuperAdmin(): Promise<{
  deletedIdentitiesCount: number;
  deletedUsersCount: number;
}> {
  try {
    let deletedIdentitiesCount = 0;
    let deletedUsersCount = 0;

    // 1. Purge all non-admin identities
    const idSnap = await getDocs(collection(db, IDENTITIES_PATH));
    const batch1 = writeBatch(db);
    idSnap.forEach((docSnap) => {
      const data = docSnap.data() as UserIdentity;
      const isTargetAdmin =
        data?.email?.toLowerCase().trim() === SYSTEM_ADMIN_EMAIL.toLowerCase().trim() ||
        docSnap.id === SUPER_ADMIN_IDENTITY.id ||
        docSnap.id === 'admin_ma1927393' ||
        data?.isSuperAdmin;

      if (!isTargetAdmin) {
        batch1.delete(docSnap.ref);
        deletedIdentitiesCount++;
      }
    });

    // Ensure SUPER_ADMIN_IDENTITY is written in identities collection
    const superAdminRef = doc(db, IDENTITIES_PATH, SUPER_ADMIN_IDENTITY.id);
    batch1.set(superAdminRef, SUPER_ADMIN_IDENTITY, { merge: true });
    await batch1.commit();

    // 2. Purge all non-admin users in users collection
    const userSnap = await getDocs(collection(db, USERS_PATH));
    const batch2 = writeBatch(db);
    userSnap.forEach((docSnap) => {
      const data = docSnap.data();
      const isTargetAdmin =
        data?.email?.toLowerCase().trim() === SYSTEM_ADMIN_EMAIL.toLowerCase().trim() ||
        docSnap.id === 'admin_ma1927393';

      if (!isTargetAdmin) {
        batch2.delete(docSnap.ref);
        deletedUsersCount++;
      }
    });

    const adminProfile: UserProfileDoc = {
      id: 'admin_ma1927393',
      email: SYSTEM_ADMIN_EMAIL,
      displayName: SYSTEM_ADMIN_NAME,
      role: 'admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const adminUserRef = doc(db, USERS_PATH, 'admin_ma1927393');
    batch2.set(adminUserRef, adminProfile, { merge: true });

    // Admins registry doc
    const adminRegRef = doc(db, 'admins', 'admin_ma1927393');
    batch2.set(
      adminRegRef,
      {
        email: SYSTEM_ADMIN_EMAIL,
        displayName: SYSTEM_ADMIN_NAME,
        role: 'admin',
        grantedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    await batch2.commit();

    // Log audit event
    await logAuditEvent({
      action: 'DELETE_IDENTITY',
      performedByEmail: SYSTEM_ADMIN_EMAIL,
      performedByName: SYSTEM_ADMIN_NAME,
      performedByRole: 'admin',
      targetType: 'identity',
      targetName: 'كافة الهويات الأخرى',
      details: `تم بنجاح حذف كافة الهويات السابقة (${deletedIdentitiesCount}) وتثبيت هوية (${SYSTEM_ADMIN_NAME} - ${SYSTEM_ADMIN_EMAIL}) كأدمن وحيد للنظام بكامل الصلاحيات.`,
    });

    console.log(
      `[Firestore] Purged ${deletedIdentitiesCount} identities & ${deletedUsersCount} users. Mohamed Ahmed Abdel Latif set as sole Admin.`
    );
    return { deletedIdentitiesCount, deletedUsersCount };
  } catch (error) {
    console.error('[Firestore] purgeAllIdentitiesAndSetSuperAdmin error:', error);
    return { deletedIdentitiesCount: 0, deletedUsersCount: 0 };
  }
}

/**
 * Backwards compatible alias for user identity purge
 */
export async function purgeAllOtherUsersAndSetAdmin(currentUserId?: string): Promise<{ deletedCount: number }> {
  const result = await purgeAllIdentitiesAndSetSuperAdmin();
  return { deletedCount: result.deletedIdentitiesCount + result.deletedUsersCount };
}


