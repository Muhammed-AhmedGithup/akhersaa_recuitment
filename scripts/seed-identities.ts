import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, getDocs, collection } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.resolve(__dirname, '../firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = getApps().find(a => a.name === 'seed-script') || initializeApp(firebaseConfig, 'seed-script');
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const SUPER_ADMIN_EMAIL = 'ma1927393@gmail.com';

const FULL_PERMISSIONS = {
  view_data: true,
  add_data: true,
  edit_data: true,
  delete_data: true,
  view_reports: true,
  approve_decisions: true,
  manage_employees: true,
  manage_identities: true,
  manage_departments: true,
};

async function seed() {
  console.log('Seeding initial identities and departments to Firestore...');

  // 1. Super Admin Identity
  const superAdminId = 'identity_super_admin';
  await setDoc(doc(db, 'identities', superAdminId), {
    id: superAdminId,
    fullName: 'المدير الرئيسي للنظام (Super Admin)',
    email: SUPER_ADMIN_EMAIL,
    badgeNumber: 'ID-0001',
    department: 'الإدارة العامة ورئاسة مجلس الإدارة',
    jobTitle: 'المدير العام ورئيس مجلس الإدارة',
    userType: 'dept_manager',
    status: 'active',
    assignedRole: 'general_manager',
    permissions: FULL_PERMISSIONS,
    isSuperAdmin: true,
    phone: '01000000000',
    nationalId: '29001010100000',
    notes: 'الحساب الرئيسي ذو الصلاحيات المطلقة - غير قابل للإيقاف أو الحذف',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdByEmail: 'system',
  });
  console.log(`[SEED] Super Admin written: ${SUPER_ADMIN_EMAIL}`);

  // 2. Foundation Departments
  const departmentsData = [
    { id: 'dept-fin', name: 'إدارة المالية', code: 'FIN', description: 'الشؤون المالية والخزينة والحسابات والميزانيات', managerEmail: 'finance.manager@akersaa.com', managerName: 'أ. مجدي عثمان السيد' },
    { id: 'dept-exec', name: 'إدارة التنفيذية', code: 'EXEC', description: 'الإشراف التنفيذي وسير العمليات الإدارية والفروع', managerEmail: 'exec.manager@akersaa.com', managerName: 'م. طارق كمال الديب' },
    { id: 'dept-tech', name: 'إدارة التقنية', code: 'TECH', description: 'نظم المعلومات والتحول الرقمي والبنية التقنية', managerEmail: 'tech.manager@akersaa.com', managerName: 'م. حسام الدين شريف' },
    { id: 'dept-serv', name: 'إدارة الخدمات', code: 'SERV', description: 'الخدمات اللوجستية، الأمن، النقل والصيانة', managerEmail: 'services.manager@akersaa.com', managerName: 'أ. مصطفى كامل الباجوري' },
    { id: 'dept-prod', name: 'إدارة الإنتاج', code: 'PROD', description: 'خطوط تصنيع الحلويات الشرقية والغربية والمعجنات', managerEmail: 'prod.manager@akersaa.com', managerName: 'الشيف إبراهيم الشناوي' },
    { id: 'dept-ctrl', name: 'إدارة الرقابة', code: 'CTRL', description: 'توكيد الجودة، سلامة الغذاء، والتفتيش الميداني', managerEmail: 'control.manager@akersaa.com', managerName: 'د. عماد عبد الرحمن' },
    { id: 'dept-mktg', name: 'إدارة التسويق', code: 'MKTG', description: 'التسويق الرقمي، الهوية المؤسسية، والعلامات التجارية', managerEmail: 'marketing.manager@akersaa.com', managerName: 'أ. دينا فاروق النجار' },
    { id: 'dept-sales', name: 'إدارة المبيعات', code: 'SALES', description: 'فروع منافذ البيع والتوزيع المباشر وخدمة العملاء', managerEmail: 'sales.manager@akersaa.com', managerName: 'أ. خالد فهمي رضوان' },
    { id: 'dept-hr', name: 'إدارة الموارد البشرية', code: 'HR', description: 'التوظيف، التدريب، شؤون العاملين والمستحقات', managerEmail: 'hr.manager@akersaa.com', managerName: 'أ. عاطف إبراهيم زهران' },
  ];

  for (const dept of departmentsData) {
    await setDoc(doc(db, 'departments', dept.id), {
      ...dept,
      employeesCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  console.log(`[SEED] ${departmentsData.length} departments seeded successfully.`);

  // 3. HR Specialists & Approved Department Managers identities
  const initialIdentities = [
    {
      id: 'id-hr-mgr',
      fullName: 'أ. عاطف إبراهيم زهران',
      email: 'hr.manager@akersaa.com',
      badgeNumber: 'ID-1001',
      department: 'إدارة الموارد البشرية',
      jobTitle: 'مدير عام الموارد البشرية',
      userType: 'dept_manager',
      status: 'active',
      assignedRole: 'hr_manager',
      permissions: {
        view_data: true,
        add_data: true,
        edit_data: true,
        delete_data: false,
        view_reports: true,
        approve_decisions: true,
        manage_employees: true,
        manage_identities: false,
        manage_departments: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'id-hr-specialist',
      fullName: 'أ. سارة عبد المنعم البغدادي',
      email: 'hr.specialist@akersaa.com',
      badgeNumber: 'ID-1002',
      department: 'إدارة الموارد البشرية',
      jobTitle: 'أخصائي أول توظيف واستقطاب كفاءات',
      userType: 'employee',
      status: 'active',
      assignedRole: 'hr',
      permissions: {
        view_data: true,
        add_data: true,
        edit_data: true,
        delete_data: false,
        view_reports: true,
        approve_decisions: false,
        manage_employees: false,
        manage_identities: false,
        manage_departments: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  for (const idObj of initialIdentities) {
    await setDoc(doc(db, 'identities', idObj.id), idObj);
  }
  console.log(`[SEED] Initial identities seeded successfully.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('[SEED ERROR]', err);
  process.exit(1);
});
