import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, runTransaction, getDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.resolve(__dirname, '../firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const serverAppName = 'recruitment-server-debug';
const serverApp =
  getApps().find((a) => a.name === serverAppName) ||
  initializeApp(firebaseConfig, serverAppName);
const db = getFirestore(serverApp, firebaseConfig.firestoreDatabaseId);

async function inspectApplications() {
  try {
    const colRef = collection(db, 'applications');
    const snap = await getDocs(colRef);
    console.log(`Found ${snap.size} applications in Firestore.`);
    if (snap.size > 0) {
      const first = snap.docs[0];
      console.log('Sample doc ID:', first.id);
      console.log('Sample doc status:', first.data().status);
      console.log('Sample doc assignedDepartment:', first.data().assignedDepartment);
    }
  } catch (err) {
    console.error('Error fetching docs:', err);
  }
}

inspectApplications();
