"use client";

import {
  AlertCircle,
  CheckCircle2,
  TriangleAlert,
} from "lucide-react";
import { FormField } from "@/components/admin/form-field";
import {
  InlineGroup,
  PageStack,
  SectionStack,
  TwoColumnGrid,
} from "@/components/admin/layout";
import { useAuth } from "@/features/auth/auth-context";
import { PageErrorState, PageLoadingState } from "@/components/admin/page-status";
import { getAuthorizedJson } from "@/lib/api/authenticated-client";
import { ApiError } from "@/lib/api/http";
import { getApiBaseUrl } from "@/lib/env/public-env";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type {
  AcademicSchedule,
  AcademicScheduleBulkSyncResponse,
  AcademicScheduleType,
  ApiResponse,
} from "@/features/admin/types";
import { formatDateTime } from "@/lib/format/date";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

const academicScheduleTypes = ["SINGLE", "MULTI"] as const;

const defaultBulkPayload = {
  scopeStartDate: "2026-03-01",
  scopeEndDate: "2027-02-28",
  schedules: [
    {
      title: "입학식 / 개강",
      startDate: "2026-03-03",
      endDate: "2026-03-03",
      type: "single",
      description: "정상수업",
      isPrimary: true,
    },
    {
      title: "수강신청 변경기간",
      startDate: "2026-03-04",
      endDate: "2026-03-09",
      type: "multi",
      description: null,
      isPrimary: true,
    },
  ],
};

interface AcademicScheduleBulkItem {
  title: string;
  startDate: string;
  endDate: string;
  type: string;
  isPrimary: boolean;
  description: string | null;
}

interface AcademicScheduleBulkPayload {
  scopeStartDate: string;
  scopeEndDate: string;
  schedules: AcademicScheduleBulkItem[];
}

interface AcademicScheduleFilters {
  startDate: string;
  endDate: string;
  primary: "all" | "true" | "false";
}

interface AcademicScheduleFormState {
  title: string;
  startDate: string;
  endDate: string;
  type: AcademicScheduleType;
  isPrimary: "true" | "false";
  description: string;
}

function createDefaultFormState(): AcademicScheduleFormState {
  return {
    title: "",
    startDate: "",
    endDate: "",
    type: "SINGLE",
    isPrimary: "true",
    description: "",
  };
}

function toFormState(schedule: AcademicSchedule): AcademicScheduleFormState {
  return {
    title: schedule.title,
    startDate: schedule.startDate,
    endDate: schedule.endDate,
    type: schedule.type,
    isPrimary: schedule.isPrimary ? "true" : "false",
    description: schedule.description ?? "",
  };
}

function validateForm(form: AcademicScheduleFormState) {
  if (!form.title.trim()) {
    return "title은 비어 있을 수 없습니다.";
  }
  if (form.title.trim().length > 200) {
    return "title은 200자 이하여야 합니다.";
  }
  if (!form.startDate) {
    return "startDate를 입력해주세요.";
  }
  if (!form.endDate) {
    return "endDate를 입력해주세요.";
  }
  if (form.startDate > form.endDate) {
    return "startDate는 endDate보다 늦을 수 없습니다.";
  }
  if (form.type === "SINGLE" && form.startDate !== form.endDate) {
    return "SINGLE 일정은 startDate와 endDate가 같아야 합니다.";
  }
  if (form.description.trim().length > 500) {
    return "description은 500자 이하여야 합니다.";
  }
  return null;
}

function buildComparableSnapshot(form: AcademicScheduleFormState) {
  return {
    title: form.title,
    startDate: form.startDate,
    endDate: form.endDate,
    type: form.type,
    isPrimary: form.isPrimary,
    description: form.description,
  };
}

function buildSearchParams(filters: AcademicScheduleFilters) {
  const params = new URLSearchParams();
  if (filters.startDate) {
    params.set("startDate", filters.startDate);
  }
  if (filters.endDate) {
    params.set("endDate", filters.endDate);
  }
  if (filters.primary !== "all") {
    params.set("primary", filters.primary);
  }
  return params.toString();
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseBulkItem(value: unknown, index: number): AcademicScheduleBulkItem {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new Error(`schedules[${index}]는 object여야 합니다.`);
  }

  const item = value as Record<string, unknown>;
  if (typeof item.title !== "string" || !item.title.trim()) {
    throw new Error(`schedules[${index}].title은 비어 있지 않은 문자열이어야 합니다.`);
  }
  if (!isIsoDate(item.startDate)) {
    throw new Error(`schedules[${index}].startDate는 yyyy-MM-dd 형식이어야 합니다.`);
  }
  if (!isIsoDate(item.endDate)) {
    throw new Error(`schedules[${index}].endDate는 yyyy-MM-dd 형식이어야 합니다.`);
  }
  if (typeof item.type !== "string" || !item.type.trim()) {
    throw new Error(`schedules[${index}].type은 비어 있지 않은 문자열이어야 합니다.`);
  }
  if (typeof item.isPrimary !== "boolean") {
    throw new Error(`schedules[${index}].isPrimary는 boolean이어야 합니다.`);
  }
  if (
    item.description !== null &&
    item.description !== undefined &&
    typeof item.description !== "string"
  ) {
    throw new Error(`schedules[${index}].description은 문자열 또는 null이어야 합니다.`);
  }

  return {
    title: item.title,
    startDate: item.startDate,
    endDate: item.endDate,
    type: item.type,
    isPrimary: item.isPrimary,
    description:
      typeof item.description === "string" ? item.description : null,
  };
}

function parseBulkPayload(value: string): AcademicScheduleBulkPayload {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("bulk JSON은 비어 있을 수 없습니다.");
  }

  const parsed = JSON.parse(trimmed) as unknown;
  const parseSchedules = (items: unknown[]) => {
    if (!items.length) {
      throw new Error("schedules는 최소 1개 이상이어야 합니다.");
    }
    return items.map((item, index) => parseBulkItem(item, index));
  };

  if (Array.isArray(parsed)) {
    const schedules = parseSchedules(parsed);
    const scopeStartDate = schedules.reduce(
      (min, item) => (item.startDate < min ? item.startDate : min),
      schedules[0].startDate,
    );
    const scopeEndDate = schedules.reduce(
      (max, item) => (item.endDate > max ? item.endDate : max),
      schedules[0].endDate,
    );

    return {
      scopeStartDate,
      scopeEndDate,
      schedules,
    };
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("bulk 요청 본문은 object 또는 array여야 합니다.");
  }

  const payload = parsed as {
    scopeStartDate?: unknown;
    scopeEndDate?: unknown;
    schedules?: unknown;
  };

  if (!isIsoDate(payload.scopeStartDate)) {
    throw new Error("scopeStartDate는 yyyy-MM-dd 형식이어야 합니다.");
  }
  if (!isIsoDate(payload.scopeEndDate)) {
    throw new Error("scopeEndDate는 yyyy-MM-dd 형식이어야 합니다.");
  }
  if (!Array.isArray(payload.schedules)) {
    throw new Error("schedules는 배열이어야 합니다.");
  }

  return {
    scopeStartDate: payload.scopeStartDate,
    scopeEndDate: payload.scopeEndDate,
    schedules: parseSchedules(payload.schedules),
  };
}

export default function AcademicSchedulesPage() {
  const { user, isAdminVerified } = useAuth();
  const [filters, setFilters] = useState<AcademicScheduleFilters>({
    startDate: "",
    endDate: "",
    primary: "all",
  });
  const [items, setItems] = useState<AcademicSchedule[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<AcademicScheduleFormState>(
    createDefaultFormState(),
  );
  const [editForm, setEditForm] = useState<AcademicScheduleFormState>(
    createDefaultFormState(),
  );
  const [bulkJson, setBulkJson] = useState(
    JSON.stringify(defaultBulkPayload, null, 2),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSuccess, setBulkSuccess] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [lastBulkResult, setLastBulkResult] =
    useState<AcademicScheduleBulkSyncResponse | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isBulkPending, startBulkTransition] = useTransition();
  const [isCreatePending, startCreateTransition] = useTransition();
  const [isEditPending, startEditTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const preferredSelectedIdRef = useRef<string | null>(null);
  const previousSelectedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !isAdminVerified) {
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);
      setListError(null);

      try {
        const query = buildSearchParams(filters);
        const url = query
          ? `${getApiBaseUrl()}/v1/academic-schedules?${query}`
          : `${getApiBaseUrl()}/v1/academic-schedules`;

        const response = await getAuthorizedJson<ApiResponse<AcademicSchedule[]>>(
          user,
          url,
          {
            signal: controller.signal,
          },
        );

        setItems(response.data);
      } catch (caughtError) {
        if (!controller.signal.aborted) {
          const message =
            caughtError instanceof ApiError
              ? caughtError.message
              : "학사 일정 목록을 불러오지 못했습니다.";
          setError(message);
          setListError(message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => controller.abort();
  }, [filters, isAdminVerified, refreshKey, user]);

  useEffect(() => {
    if (!items.length) {
      setSelectedScheduleId(null);
      return;
    }

    const preferredId = preferredSelectedIdRef.current;
    if (preferredId && items.some((item) => item.id === preferredId)) {
      setSelectedScheduleId(preferredId);
      preferredSelectedIdRef.current = null;
      return;
    }

    setSelectedScheduleId((current) =>
      current && items.some((item) => item.id === current) ? current : items[0].id,
    );
  }, [items]);

  const selectedSchedule = useMemo(
    () =>
      items.find((item) => item.id === selectedScheduleId) ?? items[0] ?? null,
    [items, selectedScheduleId],
  );

  useEffect(() => {
    const nextSelectedId = selectedSchedule?.id ?? null;
    if (previousSelectedIdRef.current === nextSelectedId) {
      return;
    }

    previousSelectedIdRef.current = nextSelectedId;

    if (!selectedSchedule) {
      setEditForm(createDefaultFormState());
      return;
    }

    setEditForm(toFormState(selectedSchedule));
    setEditError(null);
    setEditSuccess(null);
    setDeleteError(null);
  }, [selectedSchedule]);

  const createValidationError = useMemo(
    () => validateForm(createForm),
    [createForm],
  );
  const bulkValidationError = useMemo(() => {
    try {
      const payload = parseBulkPayload(bulkJson);
      if (payload.scopeStartDate > payload.scopeEndDate) {
        return "scopeStartDate는 scopeEndDate보다 늦을 수 없습니다.";
      }
      return null;
    } catch (error) {
      return error instanceof Error
        ? error.message
        : "bulk JSON 형식이 올바르지 않습니다.";
    }
  }, [bulkJson]);
  const editValidationError = useMemo(
    () => validateForm(editForm),
    [editForm],
  );

  const isEditDirty = useMemo(() => {
    if (!selectedSchedule) {
      return false;
    }

    return (
      JSON.stringify(buildComparableSnapshot(editForm)) !==
      JSON.stringify(buildComparableSnapshot(toFormState(selectedSchedule)))
    );
  }, [editForm, selectedSchedule]);

  if (loading) {
    return <PageLoadingState label="학사 일정 데이터를 불러오는 중입니다." />;
  }

  if (error) {
    return <PageErrorState title="학사 일정 로드 실패" message={error} />;
  }

  const updateCreateForm = <K extends keyof AcademicScheduleFormState>(
    key: K,
    value: AcademicScheduleFormState[K],
  ) => {
    setCreateForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "type" && value === "SINGLE" && current.startDate) {
        next.endDate = current.startDate;
      }
      if (key === "startDate" && current.type === "SINGLE") {
        next.endDate = value as string;
      }
      return next;
    });
  };

  const updateEditForm = <K extends keyof AcademicScheduleFormState>(
    key: K,
    value: AcademicScheduleFormState[K],
  ) => {
    setEditForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "type" && value === "SINGLE" && current.startDate) {
        next.endDate = current.startDate;
      }
      if (key === "startDate" && current.type === "SINGLE") {
        next.endDate = value as string;
      }
      return next;
    });
  };

  const handleCreate = () => {
    if (!user || createValidationError) {
      if (createValidationError) {
        setCreateError(createValidationError);
      }
      return;
    }

    startCreateTransition(() => {
      void (async () => {
        setCreateError(null);
        setCreateSuccess(null);

        try {
          const response = await getAuthorizedJson<ApiResponse<AcademicSchedule>>(
            user,
            `${getApiBaseUrl()}/v1/admin/academic-schedules`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                title: createForm.title.trim(),
                startDate: createForm.startDate,
                endDate: createForm.endDate,
                type: createForm.type,
                isPrimary: createForm.isPrimary === "true",
                description: createForm.description.trim() || null,
              }),
            },
          );

          preferredSelectedIdRef.current = response.data.id;
          setCreateForm(createDefaultFormState());
          setCreateSuccess("학사 일정을 추가했습니다.");
          setRefreshKey((current) => current + 1);
        } catch (caughtError) {
          if (caughtError instanceof ApiError) {
            setCreateError(caughtError.message);
            return;
          }

          setCreateError("학사 일정 생성 중 오류가 발생했습니다.");
        }
      })();
    });
  };

  const handleBulkSync = () => {
    if (!user || bulkValidationError) {
      if (bulkValidationError) {
        setBulkError(bulkValidationError);
      }
      return;
    }

    startBulkTransition(() => {
      void (async () => {
        setBulkError(null);
        setBulkSuccess(null);

        try {
          const payload = parseBulkPayload(bulkJson);
          const response = await getAuthorizedJson<
            ApiResponse<AcademicScheduleBulkSyncResponse>
          >(user, `${getApiBaseUrl()}/v1/admin/academic-schedules/bulk`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          setLastBulkResult(response.data);
          setBulkSuccess(
            `${response.data.scopeStartDate} ~ ${response.data.scopeEndDate} 학사 일정 bulk sync를 완료했습니다.`,
          );
          setRefreshKey((current) => current + 1);
        } catch (caughtError) {
          if (caughtError instanceof ApiError) {
            setBulkError(caughtError.message);
            return;
          }

          setBulkError("학사 일정 bulk sync 중 오류가 발생했습니다.");
        }
      })();
    });
  };

  const handleUpdate = () => {
    if (!user || !selectedSchedule || editValidationError) {
      if (editValidationError) {
        setEditError(editValidationError);
      }
      return;
    }

    startEditTransition(() => {
      void (async () => {
        setEditError(null);
        setEditSuccess(null);

        try {
          await getAuthorizedJson<ApiResponse<AcademicSchedule>>(
            user,
            `${getApiBaseUrl()}/v1/admin/academic-schedules/${selectedSchedule.id}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                title: editForm.title.trim(),
                startDate: editForm.startDate,
                endDate: editForm.endDate,
                type: editForm.type,
                isPrimary: editForm.isPrimary === "true",
                description: editForm.description.trim() || null,
              }),
            },
          );

          preferredSelectedIdRef.current = selectedSchedule.id;
          setEditSuccess("학사 일정 수정을 저장했습니다.");
          setRefreshKey((current) => current + 1);
        } catch (caughtError) {
          if (caughtError instanceof ApiError) {
            setEditError(caughtError.message);
            return;
          }

          setEditError("학사 일정 수정 중 오류가 발생했습니다.");
        }
      })();
    });
  };

  const handleDelete = () => {
    if (!user || !selectedSchedule) {
      setDeleteError("삭제할 학사 일정을 선택해주세요.");
      return;
    }

    const confirmed = window.confirm(
      `${selectedSchedule.title} 일정을 삭제하시겠습니까?`,
    );
    if (!confirmed) {
      return;
    }

    startDeleteTransition(() => {
      void (async () => {
        setDeleteError(null);

        try {
          await getAuthorizedJson<ApiResponse<null>>(
            user,
            `${getApiBaseUrl()}/v1/admin/academic-schedules/${selectedSchedule.id}`,
            {
              method: "DELETE",
            },
          );

          setRefreshKey((current) => current + 1);
        } catch (caughtError) {
          if (caughtError instanceof ApiError) {
            setDeleteError(caughtError.message);
            return;
          }

          setDeleteError("학사 일정 삭제 중 오류가 발생했습니다.");
        }
      })();
    });
  };

  return (
    <PageStack>
      <SectionStack className="gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">학사 일정 관리</h1>
        <p className="text-sm text-muted-foreground">
          공개 목록 API를 기반으로 기간/중요 일정 필터를 적용하고, 관리자 CRUD 및
          연간 JSON bulk sync API로 일정을 관리합니다.
        </p>
      </SectionStack>

      <Card>
        <CardHeader>
          <CardTitle>연간 JSON bulk sync</CardTitle>
        </CardHeader>
        <CardContent>
          <SectionStack>
            {bulkError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>bulk sync 실패</AlertTitle>
                <AlertDescription>{bulkError}</AlertDescription>
              </Alert>
            ) : null}

            {bulkSuccess ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>bulk sync 완료</AlertTitle>
                <AlertDescription>{bulkSuccess}</AlertDescription>
              </Alert>
            ) : null}

            <FormField
              label="bulk request JSON"
              hint="wrapper object 형식(`scopeStartDate`, `scopeEndDate`, `schedules`)과 기존 Firebase 스크립트처럼 배열만 붙여넣는 형식 둘 다 지원합니다."
            >
              <Textarea
                className="min-h-[320px] font-mono text-xs"
                value={bulkJson}
                onChange={(event) => setBulkJson(event.target.value)}
              />
            </FormField>

            {bulkValidationError ? (
              <Alert>
                <TriangleAlert className="h-4 w-4" />
                <AlertTitle>업로드 전 확인 필요</AlertTitle>
                <AlertDescription>{bulkValidationError}</AlertDescription>
              </Alert>
            ) : null}

            {lastBulkResult ? (
              <InlineGroup>
                <Badge variant="secondary">
                  {lastBulkResult.scopeStartDate} ~ {lastBulkResult.scopeEndDate}
                </Badge>
                <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
                  created {lastBulkResult.created}
                </Badge>
                <Badge className="border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300">
                  updated {lastBulkResult.updated}
                </Badge>
                <Badge variant="destructive">
                  deleted {lastBulkResult.deleted}
                </Badge>
              </InlineGroup>
            ) : null}

            <div className="flex justify-end">
              <Button
                disabled={Boolean(bulkValidationError) || isBulkPending}
                onClick={handleBulkSync}
              >
                {isBulkPending ? "bulk sync 실행 중..." : "bulk sync 실행"}
              </Button>
            </div>
          </SectionStack>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>목록 필터</CardTitle>
        </CardHeader>
        <CardContent>
          <InlineGroup className="items-end">
            <FormField label="startDate" className="w-full max-w-[220px]">
              <Input
                type="date"
                value={filters.startDate}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    startDate: event.target.value,
                  }))
                }
              />
            </FormField>

            <FormField label="endDate" className="w-full max-w-[220px]">
              <Input
                type="date"
                value={filters.endDate}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    endDate: event.target.value,
                  }))
                }
              />
            </FormField>

            <FormField label="primary" className="w-full max-w-[220px]">
              <Select
                value={filters.primary}
                onValueChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    primary: value as AcademicScheduleFilters["primary"],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">all</SelectItem>
                  <SelectItem value="true">true</SelectItem>
                  <SelectItem value="false">false</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <Button
              variant="secondary"
              onClick={() =>
                setFilters({
                  startDate: "",
                  endDate: "",
                  primary: "all",
                })
              }
            >
              필터 초기화
            </Button>
          </InlineGroup>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionStack className="gap-6">
          <Card>
            <CardHeader>
              <CardTitle>일정 목록</CardTitle>
            </CardHeader>
            <CardContent>
              <SectionStack>
                {listError ? (
                  <Alert>
                    <TriangleAlert className="h-4 w-4" />
                    <AlertTitle>목록 확인 필요</AlertTitle>
                    <AlertDescription>{listError}</AlertDescription>
                  </Alert>
                ) : null}

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>제목</TableHead>
                      <TableHead>기간</TableHead>
                      <TableHead>구분</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow
                        key={item.id}
                        className={
                          selectedSchedule?.id === item.id
                            ? "cursor-pointer bg-muted/40"
                            : "cursor-pointer"
                        }
                        onClick={() => setSelectedScheduleId(item.id)}
                      >
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-semibold">{item.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.description ?? "-"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">
                            {item.startDate} ~ {item.endDate}
                          </p>
                        </TableCell>
                        <TableCell>
                          <InlineGroup>
                            <Badge
                              className={
                                item.isPrimary
                                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
                                  : "border border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-300"
                              }
                            >
                              {item.isPrimary ? "주요" : "일반"}
                            </Badge>
                            <Badge variant="secondary">{item.type}</Badge>
                          </InlineGroup>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {!items.length ? (
                  <p className="text-sm text-muted-foreground">
                    현재 조건에 맞는 학사 일정이 없습니다.
                  </p>
                ) : null}
              </SectionStack>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>일정 추가</CardTitle>
            </CardHeader>
            <CardContent>
              <SectionStack>
                {createError ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>생성 실패</AlertTitle>
                    <AlertDescription>{createError}</AlertDescription>
                  </Alert>
                ) : null}

                {createSuccess ? (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>생성 완료</AlertTitle>
                    <AlertDescription>{createSuccess}</AlertDescription>
                  </Alert>
                ) : null}

                <ScheduleForm
                  form={createForm}
                  onChange={updateCreateForm}
                  validationError={createValidationError}
                />

                <div className="flex justify-end">
                  <Button
                    disabled={Boolean(createValidationError) || isCreatePending}
                    onClick={handleCreate}
                  >
                    {isCreatePending ? "추가 중..." : "추가"}
                  </Button>
                </div>
              </SectionStack>
            </CardContent>
          </Card>
        </SectionStack>

        <Card>
          <CardHeader>
            <CardTitle>선택 일정 편집</CardTitle>
          </CardHeader>
          <CardContent>
            <SectionStack>
              {selectedSchedule ? (
                <p className="text-sm text-muted-foreground">
                  마지막 조회 기준 선택 일정: {selectedSchedule.title} (
                  {formatDateTime(`${selectedSchedule.startDate}T00:00:00`)})
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  목록에서 수정할 일정을 선택해주세요.
                </p>
              )}

              {editError ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>수정 실패</AlertTitle>
                  <AlertDescription>{editError}</AlertDescription>
                </Alert>
              ) : null}

              {editSuccess ? (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>수정 완료</AlertTitle>
                  <AlertDescription>{editSuccess}</AlertDescription>
                </Alert>
              ) : null}

              {deleteError ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>삭제 실패</AlertTitle>
                  <AlertDescription>{deleteError}</AlertDescription>
                </Alert>
              ) : null}

              <ScheduleForm
                disabled={!selectedSchedule}
                form={editForm}
                onChange={updateEditForm}
                validationError={editValidationError}
              />

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-muted-foreground">
                  SINGLE 일정은 startDate와 endDate가 동일해야 합니다.
                </p>
                <InlineGroup>
                  <Button
                    disabled={!selectedSchedule}
                    variant="outline"
                    onClick={handleDelete}
                  >
                    {isDeletePending ? "삭제 중..." : "삭제"}
                  </Button>
                  <Button
                    disabled={
                      !selectedSchedule ||
                      !isEditDirty ||
                      Boolean(editValidationError) ||
                      isEditPending
                    }
                    onClick={handleUpdate}
                  >
                    {isEditPending ? "저장 중..." : "저장"}
                  </Button>
                </InlineGroup>
              </div>
            </SectionStack>
          </CardContent>
        </Card>
      </div>
    </PageStack>
  );
}

interface ScheduleFormProps {
  form: AcademicScheduleFormState;
  onChange: <K extends keyof AcademicScheduleFormState>(
    key: K,
    value: AcademicScheduleFormState[K],
  ) => void;
  validationError: string | null;
  disabled?: boolean;
}

function ScheduleForm({
  form,
  onChange,
  validationError,
  disabled = false,
}: ScheduleFormProps) {
  return (
    <SectionStack>
      <FormField label="title">
        <Input
          disabled={disabled}
          value={form.title}
          onChange={(event) => onChange("title", event.target.value)}
        />
      </FormField>

      <TwoColumnGrid className="max-w-2xl">
        <FormField label="startDate">
          <Input
            disabled={disabled}
            type="date"
            value={form.startDate}
            onChange={(event) => onChange("startDate", event.target.value)}
          />
        </FormField>

        <FormField label="endDate">
          <Input
            disabled={disabled}
            type="date"
            value={form.endDate}
            onChange={(event) => onChange("endDate", event.target.value)}
          />
        </FormField>
      </TwoColumnGrid>

      <TwoColumnGrid className="max-w-2xl">
        <FormField label="type">
          <Select
            disabled={disabled}
            value={form.type}
            onValueChange={(value) => onChange("type", value as AcademicScheduleType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {academicScheduleTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="isPrimary">
          <Select
            disabled={disabled}
            value={form.isPrimary}
            onValueChange={(value) =>
              onChange("isPrimary", value as AcademicScheduleFormState["isPrimary"])
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">true</SelectItem>
              <SelectItem value="false">false</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </TwoColumnGrid>

      <FormField label="description">
        <Textarea
          disabled={disabled}
          className="min-h-[140px]"
          value={form.description}
          onChange={(event) => onChange("description", event.target.value)}
        />
      </FormField>

      {validationError ? (
        <Alert>
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>저장 전 확인 필요</AlertTitle>
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      ) : null}
    </SectionStack>
  );
}
