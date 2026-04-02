"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import {
  getMissingFirebasePublicEnv,
  isFirebaseConfigured,
} from "@/lib/env/public-env";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const {
    signInWithEmailPassword,
    signInWithGoogle,
    isAdminVerified,
    loading,
    authError,
  } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();
  const firebaseReady = isFirebaseConfigured();
  const missingEnv = getMissingFirebasePublicEnv();

  useEffect(() => {
    if (!loading && isAdminVerified) {
      startTransition(() => {
        router.replace("/dashboard");
      });
    }
  }, [isAdminVerified, loading, router]);

  const handleEmailLogin = async () => {
    try {
      await signInWithEmailPassword(email, password);
      startTransition(() => {
        router.replace("/dashboard");
      });
    } catch {}
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
      startTransition(() => {
        router.replace("/dashboard");
      });
    } catch {}
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,hsl(var(--primary)/0.08),transparent_40%,hsl(var(--chart-2)/0.08))] px-6 py-12">
      <Card className="w-full max-w-md rounded-[2rem] border-border/70 shadow-2xl shadow-black/5">
        <CardHeader className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            SKURI Admin
          </p>
          <div className="space-y-2">
            <CardTitle className="text-3xl">관리자 로그인</CardTitle>
            <CardDescription className="leading-6">
              Firebase 로그인 후 Spring API에서 관리자 권한을 확인합니다.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {!firebaseReady ? (
            <Alert className="rounded-2xl">
              <TriangleAlert className="size-4" />
              <AlertTitle>Firebase 공개 환경변수가 비어 있습니다.</AlertTitle>
              <AlertDescription>{missingEnv.join(", ")}</AlertDescription>
            </Alert>
          ) : null}

          {authError ? (
            <Alert variant="destructive" className="rounded-2xl">
              <TriangleAlert className="size-4" />
              <AlertTitle>로그인 실패</AlertTitle>
              <AlertDescription>{authError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@sungkyul.ac.kr"
                type="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="비밀번호"
                type="password"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Button
              className="w-full"
              onClick={() => void handleEmailLogin()}
              disabled={!firebaseReady || !email || !password || loading || isPending}
            >
              {loading || isPending ? "로그인 중..." : "이메일로 로그인"}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => void handleGoogleLogin()}
              disabled={!firebaseReady || loading || isPending}
            >
              Google로 로그인
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
