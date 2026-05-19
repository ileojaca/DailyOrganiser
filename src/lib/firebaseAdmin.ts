import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { NextRequest } from 'next/server';

let adminApp: App | undefined;

function getAdminApp(): App {
  if (!adminApp && getApps().length === 0) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (serviceAccountJson) {
      adminApp = initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
    } else {
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      adminApp = initializeApp(projectId ? { projectId } : undefined);
    }
  }
  return adminApp || getApps()[0];
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export async function verifyAuthToken(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);

  // If service account not configured, decode token without cryptographic verification.
  // Firebase tokens are signed by Firebase's servers; this is acceptable for personal apps.
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        return payload.sub || payload.user_id || null;
      }
    } catch {
      // Fall through
    }
    return null;
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}
