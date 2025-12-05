import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();

// Support two ways to configure credentials:
// 1) Full service account JSON in FIREBASE_SERVICE_ACCOUNT (preferred in local dev)
// 2) Individual fields FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY

function initAdmin() {
  if (admin.apps.length) return admin.app();

  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (saJson) {
    const cred = JSON.parse(saJson);
    return admin.initializeApp({
      credential: admin.credential.cert(cred)
    });
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  // Private keys from .env often need newline fixes and unquoting
  if (privateKey && privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin credentials: set FIREBASE_SERVICE_ACCOUNT or FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY');
  }

  return admin.initializeApp({
    credential: admin.credential.cert({ project_id: projectId, client_email: clientEmail, private_key: privateKey })
  });
}

export function getAdmin() {
  return initAdmin();
}

export async function verifyIdToken(idToken) {
  const app = getAdmin();
  const auth = app.auth();
  // Throws on invalid or expired
  return await auth.verifyIdToken(idToken);
}
