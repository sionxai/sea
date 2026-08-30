import "server-only";

import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const expectedProjectId = "sea-forest-kit-sionxai";
export const firebaseProjectId = process.env.FIREBASE_PROJECT_ID ?? expectedProjectId;

export class FirebaseConfigurationError extends Error {
  constructor(message: string) { super(message); this.name = "FirebaseConfigurationError"; }
}

const app = getApps()[0] ?? (process.env.FIRESTORE_EMULATOR_HOST
  ? initializeApp({ projectId: firebaseProjectId })
  // Production uses ADC instead of a service-account file so credentials are
  // never part of this repository. The emulator does not need credentials.
  : initializeApp({ projectId: firebaseProjectId, credential: applicationDefault() }));

export const firestore = getFirestore(app);

let credentialCheck: Promise<void> | undefined;

export function assertFirebaseServerReady() {
  const usingEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
  const production = process.env.NODE_ENV === "production";
  if (!production && !usingEmulator && process.env.ALLOW_LIVE_FIRESTORE !== "true") {
    return Promise.reject(new FirebaseConfigurationError("FIRESTORE_EMULATOR_HOST is required outside production unless ALLOW_LIVE_FIRESTORE=true."));
  }
  if (usingEmulator && !production) return Promise.resolve();
  credentialCheck ??= (async () => {
    if (usingEmulator) throw new FirebaseConfigurationError("FIRESTORE_EMULATOR_HOST must not be configured in production.");
    if (production && firebaseProjectId !== expectedProjectId) throw new FirebaseConfigurationError("FIREBASE_PROJECT_ID does not match the configured production project.");
    const credential = app.options.credential;
    if (!credential) throw new FirebaseConfigurationError("Application Default Credentials are required for live Firestore access.");
    try { await credential.getAccessToken(); }
    catch { throw new FirebaseConfigurationError("Application Default Credentials are unavailable for live Firestore access."); }
  })();
  return credentialCheck;
}
