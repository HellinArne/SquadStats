import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut as fbSignOut, type User, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

// Vite env vars: define these in web/.env or via import.meta.env
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export function getIdToken(): Promise<string | null> {
  return new Promise(resolve => {
    const u = auth.currentUser;
    if (u) {
      u.getIdToken().then((t: string) => resolve(t)).catch(() => resolve(null));
      return;
    }
    onAuthStateChanged(auth, async (user: User | null) => {
      if (user) resolve(await user.getIdToken()); else resolve(null);
    }, () => resolve(null));
  });
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
}

export async function signOut() {
  await fbSignOut(auth);
}

export async function signInWithEmailPassword(email: string, password: string) {
  return await signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmailPassword(email: string, password: string) {
  return await createUserWithEmailAndPassword(auth, email, password);
}
