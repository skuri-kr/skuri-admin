"use client";

import { AlertCircle, MailQuestion } from "lucide-react";
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
  AdminInquiry,
  ApiResponse,
  PageResponse,
} from "@/features/admin/types";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

const statusOptions = ["ALL", "PENDING", "IN_PROGRESS", "RESOLVED"] as const;
const statusWorkflow = {
  PENDING: ["PENDING", "IN_PROGRESS", "RESOLVED"],
  IN_PROGRESS: ["IN_PROGRESS", "RESOLVED"],
  RESOLVED: ["RESOLVED"],
} as const;

function statusClasses(status: AdminInquiry["status"]) {
  switch (status) {
    case "PENDING":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300";
    case "IN_PROGRESS":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300";
    case "RESOLVED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300";
  }
}

export default function InquiriesPage() {
  const { user, isAdminVerified } = useAuth();
  const [selectedStatus, setSelectedStatus] =
    useState<(typeof statusOptions)[number]>("ALL");
  const [pageData, setPageData] = useState<PageResponse<AdminInquiry> | null>(
    null,
  );
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<AdminInquiry["status"]>("PENDING");
  const [draftMemo, setDraftMemo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [, startSaveTransition] = useTransition();
  const previousSelectedInquiryIdRef = useRef<string | null>(null);

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
          page: "0",
          size: "20",
        });

        if (selectedStatus !== "ALL") {
          query.set("status", selectedStatus);
        }

        const response = await getAuthorizedJson<ApiResponse<PageResponse<AdminInquiry>>>(
          user,
          `${getApiBaseUrl()}/v1/admin/inquiries?${query.toString()}`,
          { signal: controller.signal },
        );

        setPageData(response.data);
      } catch {
        if (!controller.signal.aborted) {
          setError("문의 목록을 불러오지 못했습니다.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => controller.abort();
  }, [isAdminVerified, selectedStatus, user]);

  const inquiries = useMemo(() => pageData?.content ?? [], [pageData]);

  useEffect(() => {
    if (!inquiries.length) {
      setSelectedInquiryId(null);
      return;
    }

    setSelectedInquiryId((current) =>
      current && inquiries.some((item) => item.id === current)
        ? current
        : inquiries[0].id,
    );
  }, [inquiries]);

  const selectedInquiry = useMemo(
    () =>
      inquiries.find((item) => item.id === selectedInquiryId) ??
      inquiries[0] ??
      null,
    [inquiries, selectedInquiryId],
  );

  useEffect(() => {
    const nextSelectedInquiryId = selectedInquiry?.id ?? null;

    if (previousSelectedInquiryIdRef.current === nextSelectedInquiryId) {
      return;
    }

    previousSelectedInquiryIdRef.current = nextSelectedInquiryId;

    if (!selectedInquiry) {
      setDraftStatus("PENDING");
      setDraftMemo("");
      return;
    }

    setDraftStatus(selectedInquiry.status);
    setDraftMemo(selectedInquiry.memo ?? "");
    setSaveError(null);
    setSaveSuccess(null);
  }, [selectedInquiry]);

  if (loading) {
    return <PageLoadingState label="문의 목록을 불러오는 중입니다." />;
  }

  if (error) {
    return <PageErrorState title="문의 목록 로드 실패" message={error} />;
  }

  const handleUpdateInquiry = () => {
    if (!user || !selectedInquiry) {
      return;
    }

    startSaveTransition(() => {
      void (async () => {
        setSaveError(null);
        setSaveSuccess(null);

        try {
          const response = await getAuthorizedJson<ApiResponse<AdminInquiry>>(
            user,
            `${getApiBaseUrl()}/v1/admin/inquiries/${selectedInquiry.id}/status`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                status: draftStatus,
                memo: draftMemo,
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
          setDraftMemo(response.data.memo ?? "");
          setSaveSuccess("문의 상태와 메모를 저장했습니다.");
        } catch (caughtError) {
          if (caughtError instanceof ApiError) {
            setSaveError(caughtError.message);
          } else {
            setSaveError("문의 상태를 저장하지 못했습니다.");
          }
        }
      })();
    });
  };

  const hasPendingChanges = Boolean(
    selectedInquiry &&
      (draftStatus !== selectedInquiry.status ||
        draftMemo !== (selectedInquiry.memo ?? "")),
  );
  const allowedStatuses = selectedInquiry
    ? (statusWorkflow[selectedInquiry.status] as readonly AdminInquiry["status"][])
    : (["PENDING", "IN_PROGRESS", "RESOLVED"] as const);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Support
        </p>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">문의 운영</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            목록 조회와 상태 변경을 현재 Spring Admin API 계약에 맞춰 연결했습니다.
            상태 전이 규칙은 백엔드 엔티티의{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              PENDING → IN_PROGRESS/RESOLVED
            </code>{" "}
            및{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              IN_PROGRESS → RESOLVED
            </code>{" "}
            흐름을 따릅니다.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="전체 문의"
          value={pageData?.totalElements ?? 0}
          description={`현재 페이지 ${(pageData?.page ?? 0) + 1}`}
        />
        <MetricCard
          label="진행 중 문의"
          value={inquiries.filter((item) => item.status === "IN_PROGRESS").length}
          description="현재 페이지 기준"
        />
        <MetricCard
          label="선택된 문의"
          value={selectedInquiry?.subject ?? "선택된 문의 없음"}
          description={
            selectedInquiry ? selectedInquiry.id : "목록에서 문의를 선택하세요."
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>상태 필터</CardTitle>
        </CardHeader>
        <CardContent className="max-w-xs">
          <div className="space-y-2">
            <Label>상태</Label>
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
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>문의 목록</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>문의</TableHead>
                    <TableHead>사용자</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">생성일</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inquiries.length ? (
                    inquiries.map((inquiry) => {
                      const active = inquiry.id === selectedInquiry?.id;
                      return (
                        <TableRow
                          key={inquiry.id}
                          className={cn(
                            "cursor-pointer",
                            active && "bg-muted/60 hover:bg-muted/60",
                          )}
                          onClick={() => setSelectedInquiryId(inquiry.id)}
                        >
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-semibold">{inquiry.subject}</p>
                              <p className="text-sm text-muted-foreground">
                                {inquiry.type} · 첨부 {inquiry.attachments.length}건
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {inquiry.userName ||
                              inquiry.userEmail ||
                              inquiry.memberId}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={statusClasses(inquiry.status)}
                            >
                              {inquiry.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatDateTime(inquiry.createdAt)}
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
                        조건에 맞는 문의가 없습니다.
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
            <CardTitle>문의 상세 및 처리</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {selectedInquiry ? (
              <>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        {selectedInquiry.type}
                      </p>
                      <h2 className="text-lg font-semibold">
                        {selectedInquiry.subject}
                      </h2>
                    </div>
                    <Badge
                      variant="outline"
                      className={statusClasses(selectedInquiry.status)}
                    >
                      {selectedInquiry.status}
                    </Badge>
                  </div>
                  <p className="text-sm leading-6 text-foreground/90">
                    {selectedInquiry.content}
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <DetailField
                    label="사용자"
                    value={
                      selectedInquiry.userName ||
                      selectedInquiry.userEmail ||
                      selectedInquiry.memberId
                    }
                  />
                  <DetailField
                    label="학번"
                    value={selectedInquiry.userStudentId || "-"}
                  />
                  <DetailField
                    label="생성일"
                    value={formatDateTime(selectedInquiry.createdAt)}
                  />
                  <DetailField
                    label="수정일"
                    value={formatDateTime(selectedInquiry.updatedAt)}
                  />
                </div>

                <div className="space-y-2 rounded-2xl border border-border/70 bg-muted/30 p-4">
                  <p className="text-sm font-semibold">첨부 파일</p>
                  {selectedInquiry.attachments.length ? (
                    <div className="space-y-1">
                      {selectedInquiry.attachments.map((attachment) => (
                        <a
                          key={attachment.url}
                          href={attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-sm text-orange-600 underline underline-offset-4"
                        >
                          {attachment.mime || "첨부 파일"} · {attachment.size ?? "-"} bytes
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      첨부 파일이 없습니다.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>변경할 상태</Label>
                  <Select
                    value={draftStatus}
                    onValueChange={(value) =>
                      setDraftStatus(value as AdminInquiry["status"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions
                        .filter(
                          (status): status is AdminInquiry["status"] => status !== "ALL",
                        )
                        .map((status) => (
                          <SelectItem
                            key={status}
                            value={status}
                            disabled={!allowedStatuses.includes(status)}
                          >
                            {status}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inquiry-memo">운영 메모</Label>
                  <Textarea
                    id="inquiry-memo"
                    className="min-h-40"
                    value={draftMemo}
                    onChange={(event) => setDraftMemo(event.target.value)}
                    placeholder="처리 내용이나 후속 조치를 남겨주세요."
                  />
                  <p className="text-xs text-muted-foreground">
                    {draftMemo.length} / 500
                  </p>
                </div>

                {saveSuccess ? (
                  <Alert>
                    <MailQuestion className="size-4" />
                    <AlertTitle>저장 완료</AlertTitle>
                    <AlertDescription>{saveSuccess}</AlertDescription>
                  </Alert>
                ) : null}

                {saveError ? (
                  <Alert variant="destructive">
                    <AlertCircle className="size-4" />
                    <AlertTitle>저장 실패</AlertTitle>
                    <AlertDescription>{saveError}</AlertDescription>
                  </Alert>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="max-w-xs text-sm text-muted-foreground">
                    <code className="rounded bg-muted px-1 py-0.5 text-xs">
                      memo
                    </code>
                    는 백엔드에서 <code>trimToNull</code> 처리되므로 공백만 입력하면
                    null로 저장됩니다.
                  </p>
                  <Button
                    onClick={handleUpdateInquiry}
                    disabled={!hasPendingChanges || draftMemo.length > 500}
                  >
                    상태 저장
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                문의가 없어서 상세 정보를 표시할 수 없습니다.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
