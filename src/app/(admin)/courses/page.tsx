"use client";

import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  Heading,
  HStack,
  Input,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { useAuth } from "@/features/auth/auth-context";
import { getAuthorizedJson } from "@/lib/api/authenticated-client";
import { ApiError } from "@/lib/api/http";
import { getApiBaseUrl } from "@/lib/env/public-env";
import type {
  AdminBulkCoursesResponse,
  ApiResponse,
} from "@/features/admin/types";
import { useMemo, useState, useTransition } from "react";

const defaultBulkPayload = {
  semester: "2026-1",
  courses: [
    {
      code: "01255",
      division: "001",
      name: "민법총칙",
      credits: 3,
      professor: "문상혁",
      department: "법학과",
      grade: 2,
      category: "전공선택",
      location: "영401",
      note: null,
      schedule: [
        { dayOfWeek: 1, startPeriod: 3, endPeriod: 4 },
        { dayOfWeek: 3, startPeriod: 3, endPeriod: 4 },
      ],
    },
  ],
};

function parseBulkPayload(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("업로드 JSON은 비어 있을 수 없습니다.");
  }

  const parsed = JSON.parse(trimmed) as unknown;
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("요청 본문은 object여야 합니다.");
  }

  const payload = parsed as {
    semester?: unknown;
    courses?: unknown;
  };

  if (typeof payload.semester !== "string" || !payload.semester.trim()) {
    throw new Error("semester는 비어 있지 않은 문자열이어야 합니다.");
  }
  if (!Array.isArray(payload.courses) || payload.courses.length === 0) {
    throw new Error("courses는 최소 1개 이상이어야 합니다.");
  }

  return parsed;
}

export default function CoursesPage() {
  const { user, isAdminVerified } = useAuth();
  const [bulkJson, setBulkJson] = useState(
    JSON.stringify(defaultBulkPayload, null, 2),
  );
  const [deleteSemester, setDeleteSemester] = useState("2026-1");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<AdminBulkCoursesResponse | null>(
    null,
  );
  const [isBulkPending, startBulkTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();

  const bulkValidationError = useMemo(() => {
    try {
      parseBulkPayload(bulkJson);
      return null;
    } catch (error) {
      return error instanceof Error
        ? error.message
        : "업로드 JSON 형식이 올바르지 않습니다.";
    }
  }, [bulkJson]);

  const deleteValidationError = deleteSemester.trim()
    ? null
    : "삭제할 semester를 입력해주세요.";

  const handleBulkUpload = () => {
    if (!user || !isAdminVerified || bulkValidationError) {
      if (bulkValidationError) {
        setActionError(bulkValidationError);
      }
      return;
    }

    startBulkTransition(() => {
      void (async () => {
        setActionError(null);
        setActionSuccess(null);

        try {
          const payload = parseBulkPayload(bulkJson);
          const response = await getAuthorizedJson<
            ApiResponse<AdminBulkCoursesResponse>
          >(user, `${getApiBaseUrl()}/v1/admin/courses/bulk`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          setLastResult(response.data);
          setActionSuccess(
            `${response.data.semester} 학기 강의 bulk 업로드를 완료했습니다.`,
          );
        } catch (caughtError) {
          if (caughtError instanceof ApiError) {
            setActionError(caughtError.message);
            return;
          }

          setActionError("강의 bulk 업로드 중 오류가 발생했습니다.");
        }
      })();
    });
  };

  const handleDeleteSemester = () => {
    if (!user || !isAdminVerified || deleteValidationError) {
      if (deleteValidationError) {
        setActionError(deleteValidationError);
      }
      return;
    }

    const semester = deleteSemester.trim();
    const confirmed = window.confirm(
      `${semester} 학기의 강의를 모두 삭제하시겠습니까?`,
    );
    if (!confirmed) {
      return;
    }

    startDeleteTransition(() => {
      void (async () => {
        setActionError(null);
        setActionSuccess(null);

        try {
          const response = await getAuthorizedJson<
            ApiResponse<AdminBulkCoursesResponse>
          >(
            user,
            `${getApiBaseUrl()}/v1/admin/courses?semester=${encodeURIComponent(semester)}`,
            {
              method: "DELETE",
            },
          );

          setLastResult(response.data);
          setActionSuccess(`${semester} 학기 강의를 전체 삭제했습니다.`);
        } catch (caughtError) {
          if (caughtError instanceof ApiError) {
            setActionError(caughtError.message);
            return;
          }

          setActionError("강의 전체 삭제 중 오류가 발생했습니다.");
        }
      })();
    });
  };

  return (
    <Stack gap="6">
      <Stack gap="2">
        <Heading size="xl">강의 bulk 관리</Heading>
        <Text color="fg.muted">
          현재 계약은 학기 단위 JSON 업로드와 학기 전체 삭제만 제공합니다. 따라서
          관리자 화면도 업로드 패널과 삭제 패널 중심으로 구성합니다.
        </Text>
      </Stack>

      {actionError ? (
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>작업 실패</Alert.Title>
            <Alert.Description>{actionError}</Alert.Description>
          </Alert.Content>
        </Alert.Root>
      ) : null}

      {actionSuccess ? (
        <Alert.Root status="success">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>작업 완료</Alert.Title>
            <Alert.Description>{actionSuccess}</Alert.Description>
          </Alert.Content>
        </Alert.Root>
      ) : null}

      <Card.Root>
        <Card.Header>
          <Heading size="md">학기 강의 업로드</Heading>
        </Card.Header>
        <Card.Body>
          <Stack gap="4">
            <Field.Root>
              <Field.Label>bulk request JSON</Field.Label>
              <Textarea
                fontFamily="mono"
                minH="420px"
                value={bulkJson}
                onChange={(event) => setBulkJson(event.target.value)}
              />
              <Field.HelperText>
                semester/code/division 기준 업서트이며, 같은 학기의 누락 강의는 삭제됩니다.
              </Field.HelperText>
            </Field.Root>

            {bulkValidationError ? (
              <Alert.Root status="warning">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>업로드 전 확인 필요</Alert.Title>
                  <Alert.Description>{bulkValidationError}</Alert.Description>
                </Alert.Content>
              </Alert.Root>
            ) : null}

            <HStack justify="end">
              <Button
                colorPalette="blue"
                disabled={Boolean(bulkValidationError)}
                loading={isBulkPending}
                onClick={handleBulkUpload}
              >
                bulk 업로드 실행
              </Button>
            </HStack>
          </Stack>
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Header>
          <Heading size="md">학기 전체 삭제</Heading>
        </Card.Header>
        <Card.Body>
          <Stack gap="4">
            <HStack align="end" wrap="wrap">
              <Field.Root maxW="240px">
                <Field.Label>semester</Field.Label>
                <Input
                  value={deleteSemester}
                  onChange={(event) => setDeleteSemester(event.target.value)}
                  placeholder="2026-1"
                />
              </Field.Root>
              <Button
                colorPalette="red"
                disabled={Boolean(deleteValidationError)}
                loading={isDeletePending}
                variant="outline"
                onClick={handleDeleteSemester}
              >
                학기 전체 삭제
              </Button>
            </HStack>
          </Stack>
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Header>
          <Heading size="md">마지막 실행 결과</Heading>
        </Card.Header>
        <Card.Body>
          {lastResult ? (
            <HStack wrap="wrap">
              <Badge colorPalette="blue">{lastResult.semester}</Badge>
              <Badge colorPalette="green">created {lastResult.created}</Badge>
              <Badge colorPalette="yellow">updated {lastResult.updated}</Badge>
              <Badge colorPalette="red">deleted {lastResult.deleted}</Badge>
            </HStack>
          ) : (
            <Text color="fg.muted" fontSize="sm">
              아직 실행 결과가 없습니다.
            </Text>
          )}
        </Card.Body>
      </Card.Root>
    </Stack>
  );
}
