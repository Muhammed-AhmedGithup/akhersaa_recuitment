/**
 * Automated Authorization & Workflow Test Suite
 * Validates the 10 Mandatory Security Scenarios for Recruitment Management System
 */

import { validateWorkflowTransition, canUserViewApplication } from '../src/utils/workflowAuthorization';
import { UserRole, ApplicationStatus, JobApplication, DepartmentType } from '../src/types';

interface TestCase {
  id: number;
  name: string;
  role: UserRole;
  userDepartment?: string;
  applicant: Partial<JobApplication>;
  action: 'approve' | 'reject' | 'forward' | 'waitlist';
  targetDepartment?: DepartmentType;
  expectedAllowed: boolean;
  expectedStatusCode: number;
  expectedTargetStatus?: ApplicationStatus;
}

const testCases: TestCase[] = [
  // 1. HR on hr_pending -> Allowed (200, moves to hr_manager_pending)
  {
    id: 1,
    name: '1. HR can approve hr_pending -> moves to hr_manager_pending',
    role: 'hr',
    applicant: { id: 'app-1', status: 'hr_pending', fullName: 'أحمد علي' },
    action: 'approve',
    targetDepartment: 'إدارة المالية',
    expectedAllowed: true,
    expectedStatusCode: 200,
    expectedTargetStatus: 'hr_manager_pending',
  },
  // 2. HR on hr_manager_pending -> Forbidden (403)
  {
    id: 2,
    name: '2. HR CANNOT modify hr_manager_pending (403 Forbidden)',
    role: 'hr',
    applicant: { id: 'app-2', status: 'hr_manager_pending', fullName: 'محمد خالد' },
    action: 'approve',
    expectedAllowed: false,
    expectedStatusCode: 403,
  },
  // 3. HR Manager on hr_pending -> Forbidden (403)
  {
    id: 3,
    name: '3. HR Manager CANNOT act on hr_pending before HR approval (403 Forbidden)',
    role: 'hr_manager',
    applicant: { id: 'app-3', status: 'hr_pending', fullName: 'سارة يوسف' },
    action: 'approve',
    expectedAllowed: false,
    expectedStatusCode: 403,
  },
  // 4. HR Manager on hr_manager_pending -> Allowed (200, moves to assigned department)
  {
    id: 4,
    name: '4. HR Manager can approve hr_manager_pending -> moves to dept_finance_pending',
    role: 'hr_manager',
    applicant: { id: 'app-4', status: 'hr_manager_pending', assignedDepartment: 'إدارة المالية', fullName: 'خالد إبراهيم' },
    action: 'approve',
    targetDepartment: 'إدارة المالية',
    expectedAllowed: true,
    expectedStatusCode: 200,
    expectedTargetStatus: 'dept_finance_pending',
  },
  // 5. Finance Manager on dept_finance_pending -> Allowed (200, moves to gm_pending)
  {
    id: 5,
    name: '5. Finance Manager approves their dept_finance_pending -> moves to gm_pending',
    role: 'dept_finance',
    userDepartment: 'إدارة المالية',
    applicant: { id: 'app-5', status: 'dept_finance_pending', assignedDepartment: 'إدارة المالية', fullName: 'عمر محمود' },
    action: 'approve',
    expectedAllowed: true,
    expectedStatusCode: 200,
    expectedTargetStatus: 'gm_pending',
  },
  // 6. Finance Manager on dept_tech_pending -> Forbidden (403 Department Isolation)
  {
    id: 6,
    name: '6. Finance Manager CANNOT act on dept_tech_pending (403 Department Isolation)',
    role: 'dept_finance',
    userDepartment: 'إدارة المالية',
    applicant: { id: 'app-6', status: 'dept_tech_pending', assignedDepartment: 'إدارة التقنية', fullName: 'ياسر هشام' },
    action: 'approve',
    expectedAllowed: false,
    expectedStatusCode: 403,
  },
  // 7. Tech Manager on dept_finance_pending -> Forbidden (403 Department Isolation)
  {
    id: 7,
    name: '7. Tech Manager CANNOT act on dept_finance_pending (403 Department Isolation)',
    role: 'dept_tech',
    userDepartment: 'إدارة التقنية',
    applicant: { id: 'app-7', status: 'dept_finance_pending', assignedDepartment: 'إدارة المالية', fullName: 'كريم نبيل' },
    action: 'approve',
    expectedAllowed: false,
    expectedStatusCode: 403,
  },
  // 8. Department Manager on gm_pending -> Forbidden (403 Stage Overstepped)
  {
    id: 8,
    name: '8. Department Manager CANNOT act on gm_pending (403 Stage Overstepped)',
    role: 'dept_finance',
    userDepartment: 'إدارة المالية',
    applicant: { id: 'app-8', status: 'gm_pending', assignedDepartment: 'إدارة المالية', fullName: 'طارق زياد' },
    action: 'approve',
    expectedAllowed: false,
    expectedStatusCode: 403,
  },
  // 9. General Manager on gm_pending -> Allowed (200, moves to approved_lvl1)
  {
    id: 9,
    name: '9. General Manager can issue final decision on gm_pending (200 Approved)',
    role: 'general_manager',
    applicant: { id: 'app-9', status: 'gm_pending', assignedDepartment: 'إدارة المالية', fullName: 'سامي عبد الله' },
    action: 'approve',
    expectedAllowed: true,
    expectedStatusCode: 200,
    expectedTargetStatus: 'approved_lvl1',
  },
  // 10. General Manager on hr_pending -> Forbidden (403 Cannot skip stages)
  {
    id: 10,
    name: '10. General Manager CANNOT act on hr_pending prematurely (403 Forbidden)',
    role: 'general_manager',
    applicant: { id: 'app-10', status: 'hr_pending', fullName: 'مصطفى كامل' },
    action: 'approve',
    expectedAllowed: false,
    expectedStatusCode: 403,
  },
  // 11. Terminal status protection: Nobody can approve an already rejected application
  {
    id: 11,
    name: '11. Terminal state lock: No one can approve rejected applicant (400 Bad Request)',
    role: 'general_manager',
    applicant: { id: 'app-11', status: 'rejected', fullName: 'حسن سالم' },
    action: 'approve',
    expectedAllowed: false,
    expectedStatusCode: 400,
  },
  // 12. Quality / Control manager department mapping test
  {
    id: 12,
    name: '12. Quality/Control Manager acts on dept_control_pending (200 Allowed)',
    role: 'dept_control',
    userDepartment: 'إدارة الرقابة',
    applicant: { id: 'app-12', status: 'dept_control_pending', assignedDepartment: 'إدارة الجودة' as any, fullName: 'وليد فاروق' },
    action: 'approve',
    expectedAllowed: true,
    expectedStatusCode: 200,
    expectedTargetStatus: 'gm_pending',
  }
];

console.log('================================================================');
console.log('   RECRUITMENT SYSTEM - RBAC & WORKFLOW VALIDATION TEST SUITE   ');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

for (const tc of testCases) {
  const result = validateWorkflowTransition(
    tc.role,
    tc.userDepartment,
    tc.applicant as JobApplication,
    tc.action,
    tc.targetDepartment
  );

  const allowedMatches = result.allowed === tc.expectedAllowed;
  const statusMatches = result.statusCode === tc.expectedStatusCode;
  const targetMatches = tc.expectedAllowed ? (result.targetStatus === tc.expectedTargetStatus) : true;

  const testPassed = allowedMatches && statusMatches && targetMatches;

  if (testPassed) {
    passed++;
    console.log(`[\x1b[32mPASS\x1b[0m] Test #${tc.id}: ${tc.name}`);
    if (tc.expectedAllowed) {
      console.log(`       Transition: ${tc.applicant.status} -> ${result.targetStatus} (HTTP ${result.statusCode})`);
    } else {
      console.log(`       Denied: HTTP ${result.statusCode} | Reason: ${result.reason}`);
    }
  } else {
    failed++;
    console.log(`[\x1b[31mFAIL\x1b[0m] Test #${tc.id}: ${tc.name}`);
    console.log(`       Expected: allowed=${tc.expectedAllowed}, status=${tc.expectedStatusCode}, target=${tc.expectedTargetStatus}`);
    console.log(`       Actual:   allowed=${result.allowed}, status=${result.statusCode}, target=${result.targetStatus}`);
    console.log(`       Reason:   ${result.reason}`);
  }
}

console.log('\n----------------------------------------------------------------');
console.log('   DEPARTMENT DATA ISOLATION (VISIBILITY) TESTS                 ');
console.log('----------------------------------------------------------------\n');

const financeApp = {
  id: 'app-fin',
  assignedDepartment: 'إدارة المالية',
  status: 'dept_finance_pending' as ApplicationStatus,
} as JobApplication;

const techApp = {
  id: 'app-tech',
  assignedDepartment: 'إدارة التقنية',
  status: 'dept_tech_pending' as ApplicationStatus,
} as JobApplication;

const hrApp = {
  id: 'app-hr',
  status: 'hr_pending' as ApplicationStatus,
} as JobApplication;

// 1. Finance Manager visibility
const financeMgrSeesFinance = canUserViewApplication('dept_finance', 'إدارة المالية', financeApp);
const financeMgrSeesTech = canUserViewApplication('dept_finance', 'إدارة المالية', techApp);

if (financeMgrSeesFinance && !financeMgrSeesTech) {
  passed++;
  console.log('[\x1b[32mPASS\x1b[0m] Finance Manager sees Finance applications and CANNOT see Tech applications.');
} else {
  failed++;
  console.log('[\x1b[31mFAIL\x1b[0m] Finance Manager visibility isolation failed!');
}

// 2. Tech Manager visibility
const techMgrSeesTech = canUserViewApplication('dept_tech', 'إدارة التقنية', techApp);
const techMgrSeesFinance = canUserViewApplication('dept_tech', 'إدارة التقنية', financeApp);

if (techMgrSeesTech && !techMgrSeesFinance) {
  passed++;
  console.log('[\x1b[32mPASS\x1b[0m] Tech Manager sees Tech applications and CANNOT see Finance applications.');
} else {
  failed++;
  console.log('[\x1b[31mFAIL\x1b[0m] Tech Manager visibility isolation failed!');
}

// 3. HR Specialist visibility
const hrSeesHrPending = canUserViewApplication('hr', undefined, hrApp);
const hrSeesFinancePending = canUserViewApplication('hr', undefined, financeApp);

if (hrSeesHrPending && !hrSeesFinancePending) {
  passed++;
  console.log('[\x1b[32mPASS\x1b[0m] HR Specialist ONLY sees applications awaiting HR review (hr_pending), not department stage.');
} else {
  failed++;
  console.log('[\x1b[31mFAIL\x1b[0m] HR Specialist visibility check failed!');
}

// 4. GM Visibility
const gmSeesFinance = canUserViewApplication('general_manager', undefined, financeApp);
const gmSeesTech = canUserViewApplication('general_manager', undefined, techApp);

if (gmSeesFinance && gmSeesTech) {
  passed++;
  console.log('[\x1b[32mPASS\x1b[0m] General Manager has global oversight visibility across all departments.');
} else {
  failed++;
  console.log('[\x1b[31mFAIL\x1b[0m] GM global oversight check failed!');
}

console.log('\n================================================================');
console.log(`   SUMMARY: Total Tests: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
