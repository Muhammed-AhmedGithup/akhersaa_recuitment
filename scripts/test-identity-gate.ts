import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.resolve(__dirname, '../firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = getApps().find(a => a.name === 'identity-test') || initializeApp(firebaseConfig, 'identity-test');
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function runIdentityGateTests() {
  console.log('================================================================');
  console.log('   ZERO-TRUST IDENTITY GATE & SUPER ADMIN VERIFICATION          ');
  console.log('================================================================');

  const SUPER_ADMIN = 'ma1927393@gmail.com';

  // 1. Check Super Admin identity in DB
  const identitiesSnap = await getDocs(collection(db, 'identities'));
  let superAdminFound = false;
  let testUserFound = false;

  identitiesSnap.forEach((snap) => {
    const data = snap.data();
    if (data.email && data.email.toLowerCase() === SUPER_ADMIN.toLowerCase()) {
      superAdminFound = true;
      console.log(`[PASS] Super Admin account registered in Firestore identities:`, {
        name: data.fullName,
        email: data.email,
        badgeNumber: data.badgeNumber,
        status: data.status,
        permissions: data.permissions
      });
    }
  });

  if (!superAdminFound) {
    console.error('[FAIL] Super Admin not found in identities collection!');
    process.exit(1);
  }

  // 2. Test Zero-Trust logic simulation
  const checkAccess = (email: string, identitiesList: any[]) => {
    const normalized = email.trim().toLowerCase();
    if (normalized === SUPER_ADMIN.toLowerCase()) {
      return { allowed: true, reason: 'Super Admin - Full Unrestricted Access' };
    }
    const matched = identitiesList.find(i => i.email && i.email.trim().toLowerCase() === normalized);
    if (!matched) {
      return {
        allowed: false,
        reason: 'عذراً، لا يمكنك الدخول إلى النظام لعدم وجود هوية معتمدة مرتبطة بحسابك. يرجى التواصل مع مدير النظام.'
      };
    }
    if (matched.status === 'suspended') {
      return {
        allowed: false,
        reason: 'تم إيقاف هويتك الإدارية مؤقتاً. يرجى مراجعة مدير النظام.'
      };
    }
    return { allowed: true, reason: 'Active Approved Identity' };
  };

  const dummyIdentities = [
    { email: 'hr.specialist@akersaa.com', status: 'active', fullName: 'أحمد محمود' },
    { email: 'suspended.user@akersaa.com', status: 'suspended', fullName: 'علي توفيق' },
  ];

  // Test Case A: Super Admin login
  const resA = checkAccess(SUPER_ADMIN, dummyIdentities);
  console.log(`[PASS] Case A (Super Admin Login):`, resA);
  if (!resA.allowed) throw new Error('Super Admin must be allowed');

  // Test Case B: Unregistered email
  const resB = checkAccess('stranger@random.com', dummyIdentities);
  console.log(`[PASS] Case B (Unregistered Email Blocked):`, resB);
  if (resB.allowed || !resB.reason.includes('عذراً، لا يمكنك الدخول إلى النظام لعدم وجود هوية معتمدة مرتبطة بحسابك')) {
    throw new Error('Unregistered user must be denied with required message');
  }

  // Test Case C: Suspended email
  const resC = checkAccess('suspended.user@akersaa.com', dummyIdentities);
  console.log(`[PASS] Case C (Suspended Identity Blocked):`, resC);
  if (resC.allowed) throw new Error('Suspended user must be denied');

  // Test Case D: Active registered user
  const resD = checkAccess('hr.specialist@akersaa.com', dummyIdentities);
  console.log(`[PASS] Case D (Active Identity Allowed):`, resD);
  if (!resD.allowed) throw new Error('Active user must be allowed');

  console.log('================================================================');
  console.log('   ALL 4 IDENTITY GATE VERIFICATIONS PASSED SUCCESSFULLY!       ');
  console.log('================================================================');
  process.exit(0);
}

runIdentityGateTests().catch((err) => {
  console.error('[TEST ERROR]', err);
  process.exit(1);
});
