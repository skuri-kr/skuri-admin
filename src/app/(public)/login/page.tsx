"use client";

import {
  Alert,
  Box,
  Button,
  Heading,
  Input,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useAuth } from "@/features/auth/auth-context";
import {
  getMissingFirebasePublicEnv,
  isFirebaseConfigured,
} from "@/lib/env/public-env";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bgGradient="linear(to-br, orange.50, white, teal.50)"
      px="6"
      _dark={{ bgGradient: "linear(to-br, gray.950, gray.900, teal.950)" }}
    >
      <Stack
        w="full"
        maxW="md"
        gap="5"
        rounded="3xl"
        borderWidth="1px"
        borderColor="blackAlpha.100"
        bg="white"
        px={{ base: "6", md: "8" }}
        py={{ base: "7", md: "8" }}
        shadow="lg"
        _dark={{ bg: "gray.900", borderColor: "whiteAlpha.200" }}
      >
        <Stack gap="2">
          <Text
            fontSize="xs"
            fontWeight="700"
            letterSpacing="0.18em"
            textTransform="uppercase"
            color="gray.500"
          >
            SKURI Admin
          </Text>
          <Heading size="xl">관리자 로그인</Heading>
          <Text color="gray.600" _dark={{ color: "gray.300" }}>
            Firebase 로그인 후 Spring API에서 관리자 권한을 확인합니다.
          </Text>
        </Stack>

        {!firebaseReady ? (
          <Alert.Root status="warning" rounded="xl">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Firebase 공개 환경변수가 비어 있습니다.</Alert.Title>
              <Alert.Description>
                {missingEnv.join(", ")}
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>
        ) : null}

        {authError ? (
          <Alert.Root status="error" rounded="xl">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>로그인 실패</Alert.Title>
              <Alert.Description>{authError}</Alert.Description>
            </Alert.Content>
          </Alert.Root>
        ) : null}

        <Stack gap="3">
          <Stack gap="2">
            <Text fontSize="sm" fontWeight="600">
              이메일
            </Text>
            <Input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@sungkyul.ac.kr"
              type="email"
            />
          </Stack>

          <Stack gap="2">
            <Text fontSize="sm" fontWeight="600">
              비밀번호
            </Text>
            <Input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="비밀번호"
              type="password"
            />
          </Stack>
        </Stack>

        <Stack gap="3">
          <Button
            colorPalette="orange"
            onClick={() => void handleEmailLogin()}
            loading={loading || isPending}
            disabled={!firebaseReady || !email || !password}
          >
            이메일로 로그인
          </Button>
          <Button
            variant="outline"
            onClick={() => void handleGoogleLogin()}
            loading={loading || isPending}
            disabled={!firebaseReady}
          >
            Google로 로그인
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

