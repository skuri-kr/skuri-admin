"use client";

import { AlertCircle, BookOpen, Trash2 } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/admin/form-field";
import { InlineGroup, PageStack, SectionStack } from "@/components/admin/layout";
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
    <PageStack>
      <SectionStack className="gap-2">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Academic
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">강의 bulk 관리</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          현재 계약은 학기 단위 JSON 업로드와 학기 전체 삭제만 제공합니다. 따라서
          관리자 화면도 업로드 패널과 삭제 패널 중심으로 구성합니다.
        </p>
      </SectionStack>

      {actionError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>작업 실패</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      {actionSuccess ? (
        <Alert>
          <BookOpen className="h-4 w-4" />
          <AlertTitle>작업 완료</AlertTitle>
          <AlertDescription>{actionSuccess}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>학기 강의 업로드</CardTitle>
          <CardDescription>
            semester/code/division 기준 업서트이며, 같은 학기의 누락 강의는 삭제됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SectionStack>
            <FormField label="bulk request JSON">
              <Textarea
                className="min-h-[420px] font-mono text-xs"
                value={bulkJson}
                onChange={(event) => setBulkJson(event.target.value)}
              />
            </FormField>

            {bulkValidationError ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>업로드 전 확인 필요</AlertTitle>
                <AlertDescription>{bulkValidationError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex justify-end">
              <Button
                disabled={Boolean(bulkValidationError) || isBulkPending}
                onClick={handleBulkUpload}
              >
                {isBulkPending ? "업로드 중..." : "bulk 업로드 실행"}
              </Button>
            </div>
          </SectionStack>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>학기 전체 삭제</CardTitle>
        </CardHeader>
        <CardContent>
          <InlineGroup className="items-end">
            <FormField label="semester" className="w-full max-w-60">
              <Input
                value={deleteSemester}
                onChange={(event) => setDeleteSemester(event.target.value)}
                placeholder="2026-1"
              />
            </FormField>
            <Button
              variant="outline"
              disabled={Boolean(deleteValidationError) || isDeletePending}
              onClick={handleDeleteSemester}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeletePending ? "삭제 중..." : "학기 전체 삭제"}
            </Button>
          </InlineGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>마지막 실행 결과</CardTitle>
        </CardHeader>
        <CardContent>
          {lastResult ? (
            <InlineGroup>
              <Badge variant="secondary">{lastResult.semester}</Badge>
              <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
                created {lastResult.created}
              </Badge>
              <Badge className="border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300">
                updated {lastResult.updated}
              </Badge>
              <Badge variant="destructive">deleted {lastResult.deleted}</Badge>
            </InlineGroup>
          ) : (
            <p className="text-sm text-muted-foreground">
              아직 실행 결과가 없습니다.
            </p>
          )}
        </CardContent>
      </Card>
    </PageStack>
  );
}
