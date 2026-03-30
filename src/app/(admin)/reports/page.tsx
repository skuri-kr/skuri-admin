"use client";

import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Field,
  Grid,
  Heading,
  HStack,
  NativeSelect,
  Stack,
  Table,
  Text,
  Textarea,
  Input,
} from "@chakra-ui/react";
import { useAuth } from "@/features/auth/auth-context";
import { PageErrorState, PageLoadingState } from "@/components/admin/page-status";
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

function statusPalette(status: AdminReportStatus) {
  switch (status) {
    case "PENDING":
      return "orange";
    case "REVIEWING":
      return "blue";
    case "ACTIONED":
      return "green";
    case "REJECTED":
      return "red";
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
  const [isSavePending, startSaveTransition] = useTransition();
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

        const response = await getAuthorizedJson<
          ApiResponse<PageResponse<AdminReport>>
        >(user, `${getApiBaseUrl()}/v1/admin/reports?${query.toString()}`, {
          signal: controller.signal,
        });

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
    <Stack gap="6">
      <Stack gap="3">
        <Text
          fontSize="xs"
          fontWeight="700"
          letterSpacing="0.18em"
          textTransform="uppercase"
          color="gray.500"
        >
          Support
        </Text>
        <Heading size="2xl">신고 운영</Heading>
        <Text color="gray.600" _dark={{ color: "gray.300" }}>
          변경된 Spring Admin API 계약에 맞춰 신고 목록 조회와 상태 처리 흐름을
          연결했습니다. 상태 전이는 백엔드 엔티티 규칙
          `PENDING → REVIEWING/ACTIONED/REJECTED`,
          `REVIEWING → ACTIONED/REJECTED`를 따릅니다.
        </Text>
      </Stack>

      <Grid
        templateColumns={{ base: "1fr", md: "repeat(3, minmax(0, 1fr))" }}
        gap="4"
      >
        <Card.Root>
          <Card.Body gap="1">
            <Text fontSize="sm" color="gray.500">
              전체 신고
            </Text>
            <Heading size="xl">{pageData?.totalElements ?? 0}</Heading>
            <Text fontSize="sm" color="gray.500">
              현재 페이지 {(pageData?.page ?? 0) + 1}
            </Text>
          </Card.Body>
        </Card.Root>
        <Card.Root>
          <Card.Body gap="1">
            <Text fontSize="sm" color="gray.500">
              처리 대기/검토
            </Text>
            <Heading size="xl">
              {
                reports.filter(
                  (item) =>
                    item.status === "PENDING" || item.status === "REVIEWING",
                ).length
              }
            </Heading>
            <Text fontSize="sm" color="gray.500">
              현재 페이지 기준
            </Text>
          </Card.Body>
        </Card.Root>
        <Card.Root>
          <Card.Body gap="1">
            <Text fontSize="sm" color="gray.500">
              선택된 신고
            </Text>
            <Heading size="md">
              {selectedReport?.targetType ?? "선택된 신고 없음"}
            </Heading>
            <Text fontSize="sm" color="gray.500">
              {selectedReport ? selectedReport.id : "목록에서 신고를 선택하세요."}
            </Text>
          </Card.Body>
        </Card.Root>
      </Grid>

      <Card.Root>
        <Card.Body>
          <Grid
            templateColumns={{ base: "1fr", md: "repeat(4, minmax(0, 1fr))" }}
            gap="4"
          >
            <Field.Root>
              <Field.Label>상태 필터</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field
                  value={selectedStatus}
                  onChange={(event) =>
                    setSelectedStatus(
                      event.target.value as (typeof statusOptions)[number],
                    )
                  }
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status === "ALL" ? "전체" : status}
                    </option>
                  ))}
                </NativeSelect.Field>
              </NativeSelect.Root>
            </Field.Root>

            <Field.Root>
              <Field.Label>대상 필터</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field
                  value={selectedTargetType}
                  onChange={(event) =>
                    setSelectedTargetType(
                      event.target.value as (typeof targetTypeOptions)[number],
                    )
                  }
                >
                  {targetTypeOptions.map((targetType) => (
                    <option key={targetType} value={targetType}>
                      {targetType === "ALL" ? "전체" : targetType}
                    </option>
                  ))}
                </NativeSelect.Field>
              </NativeSelect.Root>
            </Field.Root>

            <Field.Root maxW="120px">
              <Field.Label>page size</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field
                  value={pageSize}
                  onChange={(event) => setPageSize(event.target.value)}
                >
                  {["20", "50", "100"].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </NativeSelect.Field>
              </NativeSelect.Root>
            </Field.Root>

            <Field.Root>
              <Field.Label>페이지 이동</Field.Label>
              <HStack>
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
              </HStack>
            </Field.Root>
          </Grid>
        </Card.Body>
      </Card.Root>

      <Grid
        templateColumns={{ base: "1fr", xl: "minmax(0, 1.6fr) minmax(360px, 1fr)" }}
        gap="5"
      >
        <Card.Root>
          <Card.Header>
            <Heading size="md">신고 목록</Heading>
          </Card.Header>
          <Card.Body gap="4">
            <Box overflowX="auto">
              <Table.Root size="sm">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>대상</Table.ColumnHeader>
                    <Table.ColumnHeader>카테고리</Table.ColumnHeader>
                    <Table.ColumnHeader>상태</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="end">생성일</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {reports.map((report) => {
                    const active = report.id === selectedReport?.id;
                    return (
                      <Table.Row
                        key={report.id}
                        bg={active ? "orange.50" : undefined}
                        cursor="pointer"
                        onClick={() => setSelectedReportId(report.id)}
                      >
                        <Table.Cell>
                          <Stack gap="1">
                            <Text fontWeight="semibold">{report.targetType}</Text>
                            <Text
                              fontSize="xs"
                              color="gray.500"
                              wordBreak="break-all"
                            >
                              targetId: {report.targetId}
                            </Text>
                          </Stack>
                        </Table.Cell>
                        <Table.Cell>
                          <Stack gap="1">
                            <Text>{report.category}</Text>
                            <Text
                              fontSize="xs"
                              color="gray.500"
                              lineClamp={2}
                            >
                              {report.reason}
                            </Text>
                          </Stack>
                        </Table.Cell>
                        <Table.Cell>
                          <Badge colorPalette={statusPalette(report.status)}>
                            {report.status}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell textAlign="end">
                          <Text fontSize="sm" color="gray.500">
                            {formatDateTime(report.createdAt)}
                          </Text>
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table.Root>
            </Box>

            {!reports.length ? (
              <Text fontSize="sm" color="gray.500">
                현재 조건에 맞는 신고가 없습니다.
              </Text>
            ) : null}
          </Card.Body>
        </Card.Root>

        <Card.Root>
          <Card.Header>
            <Heading size="md">신고 처리</Heading>
          </Card.Header>
          <Card.Body gap="4">
            {selectedReport ? (
              <Stack gap="4">
                <Stack gap="2">
                  <HStack justify="space-between" align="start">
                    <Stack gap="1">
                      <Heading size="sm">{selectedReport.targetType}</Heading>
                      <Text fontSize="sm" color="gray.500">
                        신고 ID {selectedReport.id}
                      </Text>
                    </Stack>
                    <Badge colorPalette={statusPalette(selectedReport.status)}>
                      {selectedReport.status}
                    </Badge>
                  </HStack>

                  <Text fontSize="sm" color="gray.600" _dark={{ color: "gray.300" }}>
                    {selectedReport.reason}
                  </Text>
                </Stack>

                <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap="4">
                  <Field.Root>
                    <Field.Label>신고자 ID</Field.Label>
                    <Input value={selectedReport.reporterId} readOnly />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>대상 작성자 ID</Field.Label>
                    <Input value={selectedReport.targetAuthorId ?? "-"} readOnly />
                  </Field.Root>
                </Grid>

                <Field.Root>
                  <Field.Label>상태</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={draftStatus}
                      onChange={(event) =>
                        setDraftStatus(event.target.value as AdminReportStatus)
                      }
                    >
                      {allowedStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>

                <Field.Root>
                  <Field.Label>조치 내용</Field.Label>
                  <Input
                    value={draftAction}
                    onChange={(event) => setDraftAction(event.target.value)}
                    placeholder="DELETE_POST"
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label>관리자 메모</Field.Label>
                  <Textarea
                    autoresize
                    minH="180px"
                    value={draftMemo}
                    onChange={(event) => setDraftMemo(event.target.value)}
                    placeholder="처리 근거와 후속 조치를 기록하세요."
                  />
                </Field.Root>

                {saveError ? (
                  <Alert.Root status="error">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>저장 실패</Alert.Title>
                      <Alert.Description>{saveError}</Alert.Description>
                    </Alert.Content>
                  </Alert.Root>
                ) : null}

                {saveSuccess ? (
                  <Alert.Root status="success">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>저장 완료</Alert.Title>
                      <Alert.Description>{saveSuccess}</Alert.Description>
                    </Alert.Content>
                  </Alert.Root>
                ) : null}

                <HStack justify="space-between" align="center">
                  <Text fontSize="sm" color="gray.500">
                    생성 {formatDateTime(selectedReport.createdAt)} / 수정{" "}
                    {formatDateTime(selectedReport.updatedAt)}
                  </Text>
                  <Button
                    colorPalette="orange"
                    onClick={handleUpdateReport}
                    loading={isSavePending}
                    disabled={!hasPendingChanges || Boolean(saveValidationError)}
                  >
                    상태 저장
                  </Button>
                </HStack>
              </Stack>
            ) : (
              <Text color="gray.500">목록에서 신고를 선택해주세요.</Text>
            )}
          </Card.Body>
        </Card.Root>
      </Grid>
    </Stack>
  );
}
