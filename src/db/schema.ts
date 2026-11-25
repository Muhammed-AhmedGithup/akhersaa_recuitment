import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type {
  ApprovalHistoryEntry,
  GeneralManagerApproval,
  ManagerPermissions,
  SectionReview,
} from '../types.ts';

/**
 * 1. Departments Table (الإدارات والمديرين)
 */
export const departments = pgTable('departments', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  code: text('code').notNull().unique(),
  description: text('description').notNull().default(''),
  managerTitle: text('manager_title').notNull().default('مدير الإدارة'),
  roleKey: text('role_key').notNull(),
  color: text('color').notNull().default('slate'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * 2. Users Table (حسابات تسجيل الدخول، الموظفين والمستخدمين، الأدوار والصلاحيات)
 */
export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    uid: text('uid').unique(),
    identityNumber: text('identity_number').notNull().unique(),
    username: text('username'),
    fullName: text('full_name').notNull(),
    displayName: text('display_name'),
    email: text('email').notNull().unique(),
    phoneNumber: text('phone_number').notNull().default(''),
    departmentId: text('department_id').references(() => departments.id, {
      onDelete: 'set null',
    }),
    department: text('department').notNull().default('الإدارة العامة'),
    role: text('role').notNull().default('hr'),
    jobTitle: text('job_title').notNull().default(''),
    status: text('status').notNull().default('active'),
    permissions: jsonb('permissions').$type<ManagerPermissions>().notNull(),
    passwordHash: text('password_hash'),
    passwordSalt: text('password_salt'),
    isSuperAdmin: boolean('is_super_admin').notNull().default(false),
    isGoogleUser: boolean('is_google_user').notNull().default(false),
    photoUrl: text('photo_url'),
    notes: text('notes'),
    createdDateArabic: text('created_date_arabic'),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('users_role_idx').on(table.role),
    index('users_department_id_idx').on(table.departmentId),
  ]
);

/**
 * 3. Applications Table (استمارات التوظيف وبيانات المتقدمين وحالات الاستمارات)
 */
export const applications = pgTable(
  'applications',
  {
    id: text('id').primaryKey(),
    recordNumber: text('record_number').notNull().default(''),
    timestampText: text('timestamp_text').notNull().default(''),
    todayDate: text('today_date'),

    // Personal Details
    fullName: text('full_name').notNull(),
    nationalId: text('national_id').notNull().default(''),
    birthDate: text('birth_date').notNull().default(''),
    gender: text('gender').notNull().default(''),
    address: text('address').notNull().default(''),
    phone: text('phone').notNull().default(''),
    emergencyContact: text('emergency_contact').notNull().default(''),
    qualification: text('qualification').notNull().default(''),
    qualificationDate: text('qualification_date').notNull().default(''),
    maritalStatus: text('marital_status').notNull().default(''),
    positionApplied: text('position_applied').notNull().default(''),
    internalReferrals: text('internal_referrals').notNull().default(''),

    // Experience 1
    prevCompany: text('prev_company').notNull().default(''),
    prevPosition: text('prev_position').notNull().default(''),
    prevManager: text('prev_manager').notNull().default(''),
    experienceYears: text('experience_years').notNull().default(''),
    workHours: text('work_hours').notNull().default(''),
    prevSalary: text('prev_salary').notNull().default(''),
    reasonForLeaving: text('reason_for_leaving').notNull().default(''),

    // Experience 2
    prevCompany2: text('prev_company_2'),
    prevPosition2: text('prev_position_2'),
    prevManager2: text('prev_manager_2'),
    experienceYears2: text('experience_years_2'),
    workHours2: text('work_hours_2'),
    reasonForLeaving2: text('reason_for_leaving_2'),

    // Experience 3
    prevCompany3: text('prev_company_3'),
    prevPosition3: text('prev_position_3'),
    prevManager3: text('prev_manager_3'),
    experienceYears3: text('experience_years_3'),
    reasonForLeaving3: text('reason_for_leaving_3'),

    // Skills & Extended Fields
    computerSkills: text('computer_skills').notNull().default(''),
    englishLevel: text('english_level').notNull().default(''),
    drivingLicense: text('driving_license').notNull().default(''),
    drivingLicenseDegree: text('driving_license_degree'),
    smoking: text('smoking').notNull().default(''),
    chronicDiseases: text('chronic_diseases').notNull().default(''),
    acknowledgement: text('acknowledgement').notNull().default(''),
    score: text('score'),
    isPraying: text('is_praying'),
    militaryStatus: text('military_status'),
    expectedSalary: text('expected_salary'),
    personalPhotoUrl: text('personal_photo_url'),

    // Assigned Department (FK + Denormalized Display Labels)
    assignedDepartmentId: text('assigned_department_id').references(() => departments.id, {
      onDelete: 'set null',
    }),
    assignedDepartment: text('assigned_department'),
    assignedDepartmentManager: text('assigned_department_manager'),

    // Stage Reviews
    hrReview: jsonb('hr_review').$type<SectionReview>().notNull(),
    hrManagerReview: jsonb('hr_manager_review').$type<SectionReview>().notNull(),
    directManagerReview: jsonb('direct_manager_review').$type<SectionReview>().notNull(),
    generalManagerReview: jsonb('general_manager_review').$type<GeneralManagerApproval>().notNull(),

    // Pipeline Status & Ownership
    status: text('status').notNull().default('new'),
    lastActionDate: text('last_action_date'),
    lastActionType: text('last_action_type'),
    notes: text('notes'),
    tags: jsonb('tags').$type<string[]>(),
    createdByUserId: text('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    lastUpdated: timestamp('last_updated', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('applications_status_idx').on(table.status),
    index('applications_assigned_dept_idx').on(table.assignedDepartment),
    index('applications_last_updated_idx').on(table.lastUpdated),
  ]
);

/**
 * 4. Application Signatures Table (التوقيعات المعتمدة لكل مرحلة - بالاسم فقط في الواجهة)
 */
export const applicationSignatures = pgTable(
  'application_signatures',
  {
    id: text('id').primaryKey(),
    applicationId: text('application_id')
      .notNull()
      .references(() => applications.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    stage: text('stage').notNull(),
    stageLabel: text('stage_label').notNull(),
    fullName: text('full_name').notNull(),
    email: text('email').notNull(),
    role: text('role').notNull(),
    jobTitle: text('job_title').notNull(),
    department: text('department').notNull(),
    action: text('action').notNull(),
    decision: text('decision').notNull(),
    signedAt: timestamp('signed_at', { withTimezone: true }).defaultNow().notNull(),
    signedAtArabic: text('signed_at_arabic').notNull(),
    immutable: boolean('immutable').notNull().default(true),
  },
  (table) => [
    uniqueIndex('app_signatures_app_stage_uidx').on(table.applicationId, table.stage),
    index('app_signatures_application_idx').on(table.applicationId),
  ]
);

/**
 * 5. Approval History Table (سجل الموافقات والرفض والتعديلات)
 */
export const approvalHistory = pgTable(
  'approval_history',
  {
    id: text('id').primaryKey(),
    applicationId: text('application_id')
      .notNull()
      .references(() => applications.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    userName: text('user_name').notNull(),
    userEmail: text('user_email').notNull(),
    role: text('role').notNull(),
    jobTitle: text('job_title'),
    department: text('department'),
    stage: text('stage'),
    stageLabel: text('stage_label'),
    action: text('action').notNull(),
    decision: text('decision').notNull(),
    oldStatus: text('old_status').notNull(),
    newStatus: text('new_status').notNull(),
    notice: text('notice'),
    signature: text('signature'),
    signatureId: text('signature_id').references(() => applicationSignatures.id, {
      onDelete: 'set null',
    }),
    salary: text('salary'),
    metadata: jsonb('metadata').$type<ApprovalHistoryEntry['metadata'] | null>(),
    dateArabic: text('date_arabic').notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('approval_history_application_idx').on(table.applicationId),
    index('approval_history_timestamp_idx').on(table.timestamp),
  ]
);

/**
 * 6. Notifications Table (إشعارات النظام المرتبطة بالطلبات)
 */
export const notifications = pgTable(
  'notifications',
  {
    id: text('id').primaryKey(),
    applicantId: text('applicant_id').references(() => applications.id, {
      onDelete: 'cascade',
    }),
    applicantName: text('applicant_name').notNull(),
    position: text('position').notNull().default(''),
    targetRole: text('target_role').notNull(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    timestampText: text('timestamp_text').notNull(),
    isRead: boolean('is_read').notNull().default(false),
    priority: text('priority').notNull().default('high'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('notifications_target_role_idx').on(table.targetRole),
    index('notifications_applicant_idx').on(table.applicantId),
  ]
);

/**
 * 7. Audit Logs Table (سجل الرقابة والتعديلات والأمان الشامل)
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: text('id').primaryKey(),
    userId: text('user_id'),
    userName: text('user_name'),
    userEmail: text('user_email'),
    userRole: text('user_role'),
    performedByName: text('performed_by_name'),
    performedByEmail: text('performed_by_email'),
    performedByRole: text('performed_by_role'),
    action: text('action').notNull(),
    targetId: text('target_id'),
    targetType: text('target_type').notNull(),
    targetName: text('target_name'),
    previousValue: jsonb('previous_value'),
    newValue: jsonb('new_value'),
    details: text('details').notNull(),
    metadata: jsonb('metadata'),
    dateArabic: text('date_arabic').notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('audit_logs_timestamp_idx').on(table.timestamp),
    index('audit_logs_action_idx').on(table.action),
  ]
);

/**
 * 8. System Settings Table (إعدادات النظام وحالة الترحيل)
 */
export const systemSettings = pgTable('system_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').$type<Record<string, any>>().notNull(),
  description: text('description'),
  updatedBy: text('updated_by'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * 9. Salary Structures Table (هيكل الرواتب المعتمد من الموارد البشرية)
 */
export const salaryStructures = pgTable('salary_structures', {
  id: text('id').primaryKey(),
  level1Salary: integer('level1_salary'),
  level2Salary: integer('level2_salary'),
  level3Salary: integer('level3_salary'),
  currency: text('currency').notNull().default('ج.م'),
  isApproved: boolean('is_approved').notNull().default(false),
  updatedByUserId: text('updated_by_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  updatedByName: text('updated_by_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * 10. Salary Structure History Table (سجل تعديلات هيكل الرواتب)
 */
export const salaryStructureHistory = pgTable(
  'salary_structure_history',
  {
    id: text('id').primaryKey(),
    structureId: text('structure_id')
      .notNull()
      .references(() => salaryStructures.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    userName: text('user_name').notNull(),
    userEmail: text('user_email').notNull(),
    userRole: text('user_role').notNull(),
    previousValues: jsonb('previous_values')
      .$type<{ level1Salary: number | null; level2Salary: number | null; level3Salary: number | null }>()
      .notNull(),
    newValues: jsonb('new_values')
      .$type<{ level1Salary: number | null; level2Salary: number | null; level3Salary: number | null }>()
      .notNull(),
    notes: text('notes'),
    dateArabic: text('date_arabic').notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('salary_structure_history_ts_idx').on(table.timestamp)]
);

/**
 * 11. Salary Proposals Table (مقترحات الرواتب من مدير الموارد البشرية ومدير الإدارة)
 */
export const salaryProposals = pgTable(
  'salary_proposals',
  {
    id: text('id').primaryKey(),
    applicationId: text('application_id')
      .notNull()
      .references(() => applications.id, { onDelete: 'cascade' }),
    stage: text('stage').notNull(), // 'hr_manager' | 'direct_manager'
    proposerUserId: text('proposer_user_id').references(() => users.id, { onDelete: 'set null' }),
    proposerName: text('proposer_name').notNull(),
    proposerEmail: text('proposer_email').notNull().default(''),
    proposerRole: text('proposer_role').notNull(),
    proposerDepartment: text('proposer_department'),
    proposedAmount: integer('proposed_amount').notNull(),
    currency: text('currency').notNull().default('ج.م'),
    formattedAmount: text('formatted_amount').notNull(),
    notes: text('notes'),
    status: text('status').notNull().default('active'), // 'active' | 'selected' | 'not_selected'
    proposedAt: timestamp('proposed_at', { withTimezone: true }).defaultNow().notNull(),
    proposedAtArabic: text('proposed_at_arabic').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('salary_proposals_app_stage_uidx').on(table.applicationId, table.stage),
    index('salary_proposals_app_idx').on(table.applicationId),
  ]
);

/* ========================
   RELATIONS
   ======================== */

export const departmentsRelations = relations(departments, ({ many }) => ({
  users: many(users),
  applications: many(applications),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  departmentRef: one(departments, {
    fields: [users.departmentId],
    references: [departments.id],
  }),
  createdApplications: many(applications),
  signatures: many(applicationSignatures),
  approvalActions: many(approvalHistory),
  salaryProposals: many(salaryProposals),
  salaryStructureUpdates: many(salaryStructures),
  salaryStructureHistoryEntries: many(salaryStructureHistory),
}));

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  departmentRef: one(departments, {
    fields: [applications.assignedDepartmentId],
    references: [departments.id],
  }),
  createdBy: one(users, {
    fields: [applications.createdByUserId],
    references: [users.id],
  }),
  signatures: many(applicationSignatures),
  approvalHistory: many(approvalHistory),
  salaryProposals: many(salaryProposals),
  notifications: many(notifications),
}));

export const applicationSignaturesRelations = relations(applicationSignatures, ({ one }) => ({
  application: one(applications, {
    fields: [applicationSignatures.applicationId],
    references: [applications.id],
  }),
  user: one(users, {
    fields: [applicationSignatures.userId],
    references: [users.id],
  }),
}));

export const approvalHistoryRelations = relations(approvalHistory, ({ one }) => ({
  application: one(applications, {
    fields: [approvalHistory.applicationId],
    references: [applications.id],
  }),
  user: one(users, {
    fields: [approvalHistory.userId],
    references: [users.id],
  }),
  signatureRecord: one(applicationSignatures, {
    fields: [approvalHistory.signatureId],
    references: [applicationSignatures.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  application: one(applications, {
    fields: [notifications.applicantId],
    references: [applications.id],
  }),
}));

export const salaryStructuresRelations = relations(salaryStructures, ({ one, many }) => ({
  updatedByUser: one(users, {
    fields: [salaryStructures.updatedByUserId],
    references: [users.id],
  }),
  history: many(salaryStructureHistory),
}));

export const salaryStructureHistoryRelations = relations(salaryStructureHistory, ({ one }) => ({
  structure: one(salaryStructures, {
    fields: [salaryStructureHistory.structureId],
    references: [salaryStructures.id],
  }),
  user: one(users, {
    fields: [salaryStructureHistory.userId],
    references: [users.id],
  }),
}));

export const salaryProposalsRelations = relations(salaryProposals, ({ one }) => ({
  application: one(applications, {
    fields: [salaryProposals.applicationId],
    references: [applications.id],
  }),
  proposer: one(users, {
    fields: [salaryProposals.proposerUserId],
    references: [users.id],
  }),
}));

