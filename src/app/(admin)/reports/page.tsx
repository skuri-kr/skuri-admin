"use client";

import { AlertCircle, ShieldAlert } from "lucide-react";
import { DetailField } from "@/components/admin/detail-field";
import { MetricCard } from "@/components/admin/metric-card";
import { useAuth } from "@/features/auth/auth-context";
import {
  PageErrorState,
  PageLoadingState,
} from "@/components/admin/page-status";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { cn } from "@/lib/utils";
import { getAuthorizedJson } from "@/lib/api/authenticated-client";
import { ApiError } from "@/lib/api/http";
import { getApiBaseUrl } from "@/lib/env/public-env";
import { formatDateTime } from "@/lib/format/date";
import type {
  AdminReport,
  AdminReportStatus,
  ApiResponse,
  PageResponse,
} from "@/features/admin/types";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

const statusOptions = [
  "ALL",
  "PENDING",
  "REVIEWING",
  "ACTIONED",
  "REJECTED",
] as const;
const targetTypeOptions = [
  "ALL",
  "POST",
  "COMMENT",
  "MEMBER",
  "CHAT_MESSAGE",
  "CHAT_ROOM",
  "TAXI_PARTY",
] as const;

const reportStatusWorkflow: Record<
  AdminReportStatus,
  readonly AdminReportStatus[]
> = {
  PENDING: ["PENDING", "REVIEWING", "ACTIONED", "REJECTED"],
  REVIEWING: ["REVIEWING", "ACTIONED", "REJECTED"],
  ACTIONED: ["ACTIONED"],
  REJECTED: ["REJECTED"],
};

function statusClasses(status: AdminReportStatus) {
  switch (status) {
    case "PENDING":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300";
    case "REVIEWING":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300";
    case "ACTIONED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300";
    case "REJECTED":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300";
  }
}

export default function ReportsPage() {
  const { user, isAdminVerified } = useAuth();
  const [selectedStatus, setSelectedStatus] =
    useState<(typeof statusOptions)[number]>("ALL");
  const [selectedTargetType, setSelectedTargetType] =
    useState<(typeof targetTypeOptions)[number]>("ALL");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState("20");
  const [pageData, setPageData] = useState<PageResponse<AdminReport> | null>(
    null,
  );
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<AdminReportStatus>("PENDING");
  const [draftAction, setDraftAction] = useState("");
  const [draftMemo, setDraftMemo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [, startSaveTransition] = useTransition();
  const previousSelectedReportIdRef = useRef<string | null>(null);

  useEffect(() => {
    setCurrentPage(0);
  }, [selectedStatus, selectedTargetType, pageSize]);

  useEffect(() => {
    if (!user || !isAdminVerified) {
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const query = new URLSearchParams({
          page: String(currentPage),
          size: pageSize,
        });

        if (selectedStatus !== "ALL") {
          query.set("status", selectedStatus);
        }
        if (selectedTargetType !== "ALL") {
          query.set("targetType", selectedTargetType);
        }

        const response = await getAuthorizedJson<ApiResponse<PageResponse<AdminReport>>>(
          user,
          `${getApiBaseUrl()}/v1/admin/reports?${query.toString()}`,
          { signal: controller.signal },
        );

        setPageData(response.data);
      } catch (caughtError) {
        if (!controller.signal.aborted) {
          setError(
            caughtError instanceof ApiError
              ? caughtError.message
              : "신고 목록을 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => controller.abort();
  }, [
    currentPage,
    isAdminVerified,
    pageSize,
    selectedStatus,
    selectedTargetType,
    user,
  ]);

  const reports = useMemo(() => pageData?.content ?? [], [pageData]);

  useEffect(() => {
    if (!reports.length) {
      setSelectedReportId(null);
      return;
    }

    setSelectedReportId((current) =>
      current && reports.some((item) => item.id === current)
        ? current
        : reports[0].id,
    );
  }, [reports]);

  const selectedReport = useMemo(
    () =>
      reports.find((item) => item.id === selectedReportId) ?? reports[0] ?? null,
    [reports, selectedReportId],
  );

  useEffect(() => {
    const nextSelectedReportId = selectedReport?.id ?? null;

    if (previousSelectedReportIdRef.current === nextSelectedReportId) {
      return;
    }

    previousSelectedReportIdRef.current = nextSelectedReportId;

    if (!selectedReport) {
      setDraftStatus("PENDING");
      setDraftAction("");
      setDraftMemo("");
      return;
    }

    setDraftStatus(selectedReport.status);
    setDraftAction(selectedReport.action ?? "");
    setDraftMemo(selectedReport.memo ?? "");
    setSaveError(null);
    setSaveSuccess(null);
  }, [selectedReport]);

  const saveValidationError =
    draftAction.trim().length > 100
      ? "action은 100자 이하여야 합니다."
      : draftMemo.trim().length > 500
        ? "memo는 500자 이하여야 합니다."
        : null;

  if (loading) {
    return <PageLoadingState label="신고 목록을 불러오는 중입니다." />;
  }

  if (error) {
    return <PageErrorState title="신고 목록 로드 실패" message={error} />;
  }

  const handleUpdateReport = () => {
    if (!user || !selectedReport || saveValidationError) {
      if (saveValidationError) {
        setSaveError(saveValidationError);
      }
      return;
    }

    startSaveTransition(() => {
      void (async () => {
        setSaveError(null);
        setSaveSuccess(null);

        try {
          const response = await getAuthorizedJson<ApiResponse<AdminReport>>(
            user,
            `${getApiBaseUrl()}/v1/admin/reports/${selectedReport.id}/status`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                status: draftStatus,
                action: draftAction.trim() || null,
                memo: draftMemo.trim() || null,
              }),
            },
          );

          setPageData((current) => {
            if (!current) {
              return current;
            }

            return {
              ...current,
              content: current.content.map((item) =>
                item.id === response.data.id ? response.data : item,
              ),
            };
          });
          setDraftStatus(response.data.status);
          setDraftAction(response.data.action ?? "");
          setDraftMemo(response.data.memo ?? "");
          setSaveSuccess("신고 상태와 조치 내용을 저장했습니다.");
        } catch (caughtError) {
          if (caughtError instanceof ApiError) {
            setSaveError(caughtError.message);
          } else {
            setSaveError("신고 상태를 저장하지 못했습니다.");
          }
        }
      })();
    });
  };

  const hasPendingChanges = Boolean(
    selectedReport &&
      (draftStatus !== selectedReport.status ||
        draftAction !== (selectedReport.action ?? "") ||
        draftMemo !== (selectedReport.memo ?? "")),
  );
  const allowedStatuses = selectedReport
    ? reportStatusWorkflow[selectedReport.status]
    : (["PENDING", "REVIEWING", "ACTIONED", "REJECTED"] as const);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Support
        </p>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">신고 운영</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            변경된 Spring Admin API 계약에 맞춰 신고 목록 조회와 상태 처리 흐름을
            연결했습니다. 상태 전이는{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              PENDING → REVIEWING/ACTIONED/REJECTED
            </code>{" "}
            및{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              REVIEWING → ACTIONED/REJECTED
            </code>{" "}
            규칙을 따릅니다.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="전체 신고"
          value={pageData?.totalElements ?? 0}
          description={`현재 페이지 ${(pageData?.page ?? 0) + 1}`}
        />
        <MetricCard
          label="처리 대기/검토"
          value={
            reports.filter(
              (item) => item.status === "PENDING" || item.status === "REVIEWING",
            ).length
          }
          description="현재 페이지 기준"
        />
        <MetricCard
          label="선택된 신고"
          value={selectedReport?.targetType ?? "선택된 신고 없음"}
          description={
            selectedReport ? selectedReport.id : "목록에서 신고를 선택하세요."
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>신고 필터</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>상태 필터</Label>
              <Select
                value={selectedStatus}
                onValueChange={(value) =>
                  setSelectedStatus(value as (typeof statusOptions)[number])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status === "ALL" ? "전체" : status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>대상 필터</Label>
              <Select
                value={selectedTargetType}
                onValueChange={(value) =>
                  setSelectedTargetType(value as (typeof targetTypeOptions)[number])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {targetTypeOptions.map((targetType) => (
                    <SelectItem key={targetType} value={targetType}>
                      {targetType === "ALL" ? "전체" : targetType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 max-w-[120px]">
              <Label>page size</Label>
              <Select value={pageSize} onValueChange={setPageSize}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["20", "50", "100"].map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>페이지 이동</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={!pageData?.hasPrevious}
                  onClick={() => setCurrentPage((current) => Math.max(0, current - 1))}
                >
                  이전
                </Button>
                <Button
                  variant="outline"
                  disabled={!pageData?.hasNext}
                  onClick={() => setCurrentPage((current) => current + 1)}
                >
                  다음
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>신고 목록</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>대상</TableHead>
                    <TableHead>카테고리</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">생성일</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.length ? (
                    reports.map((report) => {
                      const active = report.id === selectedReport?.id;
                      return (
                        <TableRow
                          key={report.id}
                          className={cn(
                            "cursor-pointer",
                            active && "bg-muted/60 hover:bg-muted/60",
                          )}
                          onClick={() => setSelectedReportId(report.id)}
                        >
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-semibold">{report.targetType}</p>
                              <p className="break-all text-xs text-muted-foreground">
                                targetId: {report.targetId}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p>{report.category}</p>
                              <p className="line-clamp-2 text-xs text-muted-foreground">
                                {report.reason}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={statusClasses(report.status)}
                            >
                              {report.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {formatDateTime(report.createdAt)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-12 text-center text-sm text-muted-foreground"
                      >
                        현재 조건에 맞는 신고가 없습니다.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>신고 처리</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedReport ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h2 className="text-lg font-semibold">
                        {selectedReport.targetType}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        신고 ID {selectedReport.id}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={statusClasses(selectedReport.status)}
                    >
                      {selectedReport.status}
                    </Badge>
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {selectedReport.reason}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <DetailField label="신고자 ID" value={selectedReport.reporterId} />
                  <DetailField
                    label="대상 작성자 ID"
                    value={selectedReport.targetAuthorId ?? "-"}
                  />
                </div>

                <div className="space-y-2">
                  <Label>상태</Label>
                  <Select
                    value={draftStatus}
                    onValueChange={(value) =>
                      setDraftStatus(value as AdminReportStatus)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allowedStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="report-action">조치 내용</Label>
                  <Input
                    id="report-action"
                    value={draftAction}
                    onChange={(event) => setDraftAction(event.target.value)}
                    placeholder="DELETE_POST"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="report-memo">관리자 메모</Label>
                  <Textarea
                    id="report-memo"
                    className="min-h-44"
                    value={draftMemo}
                    onChange={(event) => setDraftMemo(event.target.value)}
                    placeholder="처리 근거와 후속 조치를 기록하세요."
                  />
                </div>

                {saveError ? (
                  <Alert variant="destructive">
                    <AlertCircle className="size-4" />
                    <AlertTitle>저장 실패</AlertTitle>
                    <AlertDescription>{saveError}</AlertDescription>
                  </Alert>
                ) : null}

                {saveSuccess ? (
                  <Alert>
                    <ShieldAlert className="size-4" />
                    <AlertTitle>저장 완료</AlertTitle>
                    <AlertDescription>{saveSuccess}</AlertDescription>
                  </Alert>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    생성 {formatDateTime(selectedReport.createdAt)} / 수정{" "}
                    {formatDateTime(selectedReport.updatedAt)}
                  </p>
                  <Button
                    onClick={handleUpdateReport}
                    disabled={!hasPendingChanges || Boolean(saveValidationError)}
                  >
                    상태 저장
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                목록에서 신고를 선택해주세요.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
