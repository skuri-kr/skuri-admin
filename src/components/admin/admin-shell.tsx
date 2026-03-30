"use client";

import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Separator,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useAuth } from "@/features/auth/auth-context";
import { ColorModeButton } from "@/components/ui/color-mode";
import { getAdminSections } from "@/lib/admin/modules";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";

export function AdminShell({ children }: { children: ReactNode }) {
  const { loading, isAdminVerified, authError, signOutUser, memberProfile } =
    useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const sections = getAdminSections();

  useEffect(() => {
    if (!loading && !isAdminVerified) {
      router.replace("/login");
    }
  }, [isAdminVerified, loading, router]);

  if (loading) {
    return (
      <Flex minH="100vh" align="center" justify="center">
        <Stack align="center" gap="4">
          <Spinner size="xl" />
          <Text>관리자 권한을 확인하는 중입니다.</Text>
        </Stack>
      </Flex>
    );
  }

  if (!isAdminVerified) {
    return (
      <Flex minH="100vh" align="center" justify="center" px="6">
        <Stack
          maxW="lg"
          gap="4"
          rounded="2xl"
          borderWidth="1px"
          borderColor="blackAlpha.100"
          bg="white"
          px="6"
          py="6"
          textAlign="center"
          shadow="sm"
          _dark={{ bg: "gray.900", borderColor: "whiteAlpha.200" }}
        >
          <Heading size="lg">관리자 접근이 필요합니다.</Heading>
          <Text color="gray.600" _dark={{ color: "gray.300" }}>
            {authError ?? "로그인 상태를 다시 확인해주세요."}
          </Text>
          <Button onClick={() => router.replace("/login")}>로그인 화면으로</Button>
        </Stack>
      </Flex>
    );
  }

  return (
    <Flex minH="100vh" bg="gray.50" _dark={{ bg: "gray.950" }}>
      <Box
        w={{ base: "full", lg: "280px" }}
        borderRightWidth={{ base: "0", lg: "1px" }}
        borderColor="blackAlpha.100"
        bg="white"
        px="5"
        py="6"
        _dark={{ bg: "gray.900", borderColor: "whiteAlpha.200" }}
      >
        <Stack gap="6">
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
            <Heading size="md">운영 콘솔</Heading>
            <Text fontSize="sm" color="gray.600" _dark={{ color: "gray.300" }}>
              {memberProfile?.nickname || memberProfile?.email}
            </Text>
          </Stack>

          {sections.map((section) => (
            <Stack key={section.title} gap="3">
              <Text
                fontSize="xs"
                fontWeight="700"
                letterSpacing="0.14em"
                textTransform="uppercase"
                color="gray.500"
              >
                {section.title}
              </Text>
              <Stack gap="1">
                {section.modules.map((module) => {
                  const active = pathname === module.path;
                  return (
                    <Button
                      key={module.key}
                      justifyContent="flex-start"
                      variant={active ? "solid" : "ghost"}
                      colorPalette={active ? "orange" : "gray"}
                      onClick={() => router.push(module.path)}
                    >
                      {module.navigationLabel}
                    </Button>
                  );
                })}
              </Stack>
            </Stack>
          ))}
        </Stack>
      </Box>

      <Box flex="1" minW="0">
        <Flex
          align="center"
          justify="space-between"
          px={{ base: "5", md: "8" }}
          py="4"
          borderBottomWidth="1px"
          borderColor="blackAlpha.100"
          bg="whiteAlpha.900"
          backdropFilter="blur(12px)"
          _dark={{
            borderColor: "whiteAlpha.200",
            bg: "blackAlpha.500",
          }}
        >
          <Stack gap="1">
            <Text fontSize="sm" color="gray.500">
              Spring Admin API Console
            </Text>
            <HStack gap="2">
              <Heading size="md">관리자 작업 공간</Heading>
              <Separator orientation="vertical" height="4" />
              <Text fontSize="sm" color="gray.500">
                {pathname}
              </Text>
            </HStack>
          </Stack>

          <HStack gap="2">
            <ColorModeButton />
            <Button variant="outline" onClick={() => void signOutUser()}>
              로그아웃
            </Button>
          </HStack>
        </Flex>

        <Box px={{ base: "5", md: "8" }} py={{ base: "6", md: "8" }}>
          {children}
        </Box>
      </Box>
    </Flex>
  );
}

