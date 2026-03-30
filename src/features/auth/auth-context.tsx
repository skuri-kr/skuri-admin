"use client";

import {
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getJson, ApiError } from "@/lib/api/http";
import {
  getFirebaseAuth,
  getGoogleAuthProvider,
} from "@/lib/firebase/client";
import { getApiBaseUrl, isFirebaseConfigured } from "@/lib/env/public-env";
import type { ApiResponse, MemberProfile } from "@/features/auth/types";

interface AuthContextValue {
  user: User | null;
  memberProfile: MemberProfile | null;
  loading: boolean;
  authError: string | null;
  isAdminVerified: boolean;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const API_BASE_URL = getApiBaseUrl();

async function fetchMemberProfile(token: string) {
  const response = await getJson<ApiResponse<MemberProfile>>(
    `${API_BASE_URL}/v1/members/me`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    },
  );

  return response.data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [memberProfile, setMemberProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const refreshPromiseRef = useRef<Promise<void> | null>(null);

  const refreshProfile = async () => {
    if (!isFirebaseConfigured()) {
      setUser(null);
      setMemberProfile(null);
      setAuthError(null);
      setLoading(false);
      return;
    }

    const firebaseAuth = getFirebaseAuth();

    if (!firebaseAuth.currentUser) {
      setUser(null);
      setMemberProfile(null);
      setAuthError(null);
      setLoading(false);
      return;
    }

    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    refreshPromiseRef.current = (async () => {
      setLoading(true);
      setAuthError(null);

      try {
        const nextUser = firebaseAuth.currentUser;

        if (!nextUser) {
          setUser(null);
          setMemberProfile(null);
          return;
        }

        const token = await nextUser.getIdToken();
        const profile = await fetchMemberProfile(token);

        if (!profile.isAdmin) {
          setAuthError("관리자 권한이 없습니다.");
          setMemberProfile(null);
          setUser(nextUser);
          await signOut(firebaseAuth);
          return;
        }

        setUser(nextUser);
        setMemberProfile(profile);
      } catch (error) {
        if (error instanceof ApiError) {
          if (error.status === 401 || error.errorCode === "ADMIN_REQUIRED") {
            setAuthError(
              error.errorCode === "ADMIN_REQUIRED"
                ? "관리자 권한이 없습니다."
                : "인증이 만료되었습니다. 다시 로그인해주세요.",
            );
            setMemberProfile(null);
            await signOut(firebaseAuth);
          } else {
            setAuthError(
              error.message || "백엔드 권한 확인 중 오류가 발생했습니다.",
            );
          }
        } else {
          setAuthError("백엔드 권한 확인 중 오류가 발생했습니다.");
        }
      } finally {
        setLoading(false);
        refreshPromiseRef.current = null;
      }
    })();

    return refreshPromiseRef.current;
  };

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }

    const firebaseAuth = getFirebaseAuth();
    const unsubscribe = onIdTokenChanged(firebaseAuth, async (nextUser) => {
      if (!nextUser) {
        setUser(null);
        setMemberProfile(null);
        setLoading(false);
        return;
      }

      setUser(nextUser);
      await refreshProfile();
    });

    return () => unsubscribe();
  }, []);

  const signInWithEmailPassword = async (email: string, password: string) => {
    if (!isFirebaseConfigured()) {
      setAuthError("Firebase 공개 환경변수가 설정되지 않았습니다.");
      throw new Error("Firebase public environment variables are not configured.");
    }

    const firebaseAuth = getFirebaseAuth();

    setAuthError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      await refreshProfile();
    } catch (error) {
      setLoading(false);
      if (error instanceof ApiError) {
        setAuthError(error.message);
      } else {
        setAuthError("이메일/비밀번호 로그인에 실패했습니다.");
      }
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    if (!isFirebaseConfigured()) {
      setAuthError("Firebase 공개 환경변수가 설정되지 않았습니다.");
      throw new Error("Firebase public environment variables are not configured.");
    }

    const firebaseAuth = getFirebaseAuth();

    setAuthError(null);
    setLoading(true);
    try {
      await signInWithPopup(firebaseAuth, getGoogleAuthProvider());
      await refreshProfile();
    } catch (error) {
      setLoading(false);
      setAuthError("구글 로그인에 실패했습니다.");
      throw error;
    }
  };

  const signOutUser = async () => {
    setAuthError(null);
    if (isFirebaseConfigured()) {
      await signOut(getFirebaseAuth());
    }
    setUser(null);
    setMemberProfile(null);
  };

  const value: AuthContextValue = {
    user,
    memberProfile,
    loading,
    authError,
    isAdminVerified: Boolean(memberProfile?.isAdmin),
    signInWithEmailPassword,
    signInWithGoogle,
    signOutUser,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
