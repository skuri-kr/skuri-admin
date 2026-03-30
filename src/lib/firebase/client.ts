import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  type Auth,
} from "firebase/auth";
import {
  isFirebaseConfigured,
  publicEnv,
} from "@/lib/env/public-env";

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedGoogleProvider: GoogleAuthProvider | null = null;

function assertBrowser() {
  if (typeof window === "undefined") {
    throw new Error("Firebase client APIs must run in the browser.");
  }
}

function getFirebaseConfig() {
  return {
    apiKey: publicEnv.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: publicEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: publicEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: publicEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: publicEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: publicEnv.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

export function getFirebaseApp() {
  assertBrowser();

  if (!isFirebaseConfigured()) {
    throw new Error("Firebase public environment variables are not configured.");
  }

  if (!cachedApp) {
    cachedApp = getApps().length ? getApp() : initializeApp(getFirebaseConfig());
  }

  return cachedApp;
}

export function getFirebaseAuth() {
  assertBrowser();

  if (!cachedAuth) {
    cachedAuth = getAuth(getFirebaseApp());
    void setPersistence(cachedAuth, browserLocalPersistence);
  }

  return cachedAuth;
}

export function getGoogleAuthProvider() {
  assertBrowser();

  if (!cachedGoogleProvider) {
    cachedGoogleProvider = new GoogleAuthProvider();
  }

  return cachedGoogleProvider;
}
