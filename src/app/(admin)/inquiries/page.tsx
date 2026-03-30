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
  Link,
  NativeSelect,
  Stack,
  Table,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { useAuth } from "@/features/auth/auth-context";
import { PageErrorState, PageLoadingState } from "@/components/admin/page-status";
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

function statusPalette(status: AdminInquiry["status"]) {
  switch (status) {
    case "PENDING":
      return "orange";
    case "IN_PROGRESS":
      return "blue";
    case "RESOLVED":
      return "green";
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
  const [isSavePending, startSaveTransition] = useTransition();
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

        const response = await getAuthorizedJson<
          ApiResponse<PageResponse<AdminInquiry>>
        >(user, `${getApiBaseUrl()}/v1/admin/inquiries?${query.toString()}`, {
          signal: controller.signal,
        });

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
        <Heading size="2xl">문의 운영</Heading>
        <Text color="gray.600" _dark={{ color: "gray.300" }}>
          목록 조회와 상태 변경을 모두 현재 Spring Admin API 계약에 맞춰
          연결했습니다. 상태 전이 규칙은 백엔드 엔티티의
          `PENDING → IN_PROGRESS/RESOLVED`, `IN_PROGRESS → RESOLVED`
          흐름을 따릅니다.
        </Text>
      </Stack>

      <Grid
        templateColumns={{ base: "1fr", md: "repeat(3, minmax(0, 1fr))" }}
        gap="4"
      >
        <Card.Root>
          <Card.Body gap="1">
            <Text fontSize="sm" color="gray.500">
              전체 문의
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
              진행 중 문의
            </Text>
            <Heading size="xl">
              {inquiries.filter((item) => item.status === "IN_PROGRESS").length}
            </Heading>
            <Text fontSize="sm" color="gray.500">
              현재 페이지 기준
            </Text>
          </Card.Body>
        </Card.Root>
        <Card.Root>
          <Card.Body gap="1">
            <Text fontSize="sm" color="gray.500">
              선택된 문의
            </Text>
            <Heading size="md">
              {selectedInquiry?.subject ?? "선택된 문의 없음"}
            </Heading>
            <Text fontSize="sm" color="gray.500">
              {selectedInquiry ? selectedInquiry.id : "목록에서 문의를 선택하세요."}
            </Text>
          </Card.Body>
        </Card.Root>
      </Grid>

      <Card.Root>
        <Card.Body>
          <Field.Root maxW={{ base: "full", md: "320px" }}>
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
        </Card.Body>
      </Card.Root>

      <Grid
        templateColumns={{ base: "1fr", xl: "minmax(0, 1.6fr) minmax(360px, 1fr)" }}
        gap="5"
      >
        <Card.Root>
          <Card.Header>
            <Heading size="md">문의 목록</Heading>
          </Card.Header>
          <Card.Body gap="4">
            <Box overflowX="auto">
              <Table.Root size="sm">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>문의</Table.ColumnHeader>
                    <Table.ColumnHeader>사용자</Table.ColumnHeader>
                    <Table.ColumnHeader>상태</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="end">생성일</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {inquiries.map((inquiry) => {
                    const active = inquiry.id === selectedInquiry?.id;
                    return (
                      <Table.Row
                        key={inquiry.id}
                        bg={active ? "orange.50" : undefined}
                        cursor="pointer"
                        onClick={() => setSelectedInquiryId(inquiry.id)}
                        _hover={{ bg: active ? "orange.100" : "blackAlpha.50" }}
                        _dark={{
                          bg: active ? "orange.950" : undefined,
                          _hover: {
                            bg: active ? "orange.900" : "whiteAlpha.100",
                          },
                        }}
                      >
                        <Table.Cell>
                          <Stack gap="1" minW={0}>
                            <Text fontWeight="600">{inquiry.subject}</Text>
                            <Text fontSize="sm" color="gray.500">
                              {inquiry.type} · 첨부 {inquiry.attachments.length}건
                            </Text>
                          </Stack>
                        </Table.Cell>
                        <Table.Cell>
                          <Text>{inquiry.userName || inquiry.userEmail || inquiry.memberId}</Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Badge colorPalette={statusPalette(inquiry.status)}>
                            {inquiry.status}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell textAlign="end">
                          {formatDateTime(inquiry.createdAt)}
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table.Root>
            </Box>

            {!inquiries.length ? (
              <Box
                rounded="2xl"
                borderWidth="1px"
                borderStyle="dashed"
                borderColor="blackAlpha.200"
                p="8"
                textAlign="center"
              >
                <Text>조건에 맞는 문의가 없습니다.</Text>
              </Box>
            ) : null}
          </Card.Body>
        </Card.Root>

        <Card.Root>
          <Card.Header>
            <Heading size="md">문의 상세 및 처리</Heading>
          </Card.Header>
          <Card.Body gap="5">
            {selectedInquiry ? (
              <>
                <Stack gap="3">
                  <HStack justify="space-between" align="start">
                    <Stack gap="1">
                      <Text fontSize="sm" color="gray.500">
                        {selectedInquiry.type}
                      </Text>
                      <Heading size="md">{selectedInquiry.subject}</Heading>
                    </Stack>
                    <Badge colorPalette={statusPalette(selectedInquiry.status)}>
                      {selectedInquiry.status}
                    </Badge>
                  </HStack>
                  <Text color="gray.700" _dark={{ color: "gray.200" }}>
                    {selectedInquiry.content}
                  </Text>
                </Stack>

                <Grid
                  templateColumns={{ base: "1fr", md: "repeat(2, minmax(0, 1fr))" }}
                  gap="3"
                >
                  <Box>
                    <Text fontSize="sm" color="gray.500">
                      사용자
                    </Text>
                    <Text>
                      {selectedInquiry.userName ||
                        selectedInquiry.userEmail ||
                        selectedInquiry.memberId}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="gray.500">
                      학번
                    </Text>
                    <Text>{selectedInquiry.userStudentId || "-"}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="gray.500">
                      생성일
                    </Text>
                    <Text>{formatDateTime(selectedInquiry.createdAt)}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="gray.500">
                      수정일
                    </Text>
                    <Text>{formatDateTime(selectedInquiry.updatedAt)}</Text>
                  </Box>
                </Grid>

                <Box
                  rounded="xl"
                  borderWidth="1px"
                  borderColor="blackAlpha.100"
                  bg="blackAlpha.50"
                  p="4"
                  _dark={{ bg: "whiteAlpha.100", borderColor: "whiteAlpha.200" }}
                >
                  <Stack gap="2">
                    <Text fontSize="sm" fontWeight="600">
                      첨부 파일
                    </Text>
                    {selectedInquiry.attachments.length ? (
                      <Stack gap="1">
                        {selectedInquiry.attachments.map((attachment) => (
                          <Link
                            key={attachment.url}
                            href={attachment.url}
                            target="_blank"
                            rel="noreferrer"
                            color="orange.500"
                          >
                            {attachment.mime || "첨부 파일"} · {attachment.size ?? "-"} bytes
                          </Link>
                        ))}
                      </Stack>
                    ) : (
                      <Text color="gray.500">첨부 파일이 없습니다.</Text>
                    )}
                  </Stack>
                </Box>

                <Field.Root>
                  <Field.Label>변경할 상태</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={draftStatus}
                      onChange={(event) =>
                        setDraftStatus(
                          event.target.value as AdminInquiry["status"],
                        )
                      }
                    >
                      {statusOptions
                        .filter(
                          (status): status is AdminInquiry["status"] =>
                            status !== "ALL",
                        )
                        .map((status) => (
                          <option
                            key={status}
                            value={status}
                            disabled={!allowedStatuses.includes(status)}
                          >
                            {status}
                          </option>
                        ))}
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>

                <Field.Root>
                  <Field.Label>운영 메모</Field.Label>
                  <Textarea
                    value={draftMemo}
                    onChange={(event) => setDraftMemo(event.target.value)}
                    placeholder="처리 내용이나 후속 조치를 남겨주세요."
                    autoresize
                    maxH="12lh"
                  />
                  <Field.HelperText>{draftMemo.length} / 500</Field.HelperText>
                </Field.Root>

                {saveSuccess ? (
                  <Alert.Root status="success" rounded="xl">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>저장 완료</Alert.Title>
                      <Alert.Description>{saveSuccess}</Alert.Description>
                    </Alert.Content>
                  </Alert.Root>
                ) : null}

                {saveError ? (
                  <Alert.Root status="error" rounded="xl">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>저장 실패</Alert.Title>
                      <Alert.Description>{saveError}</Alert.Description>
                    </Alert.Content>
                  </Alert.Root>
                ) : null}

                <HStack justify="space-between" align="center">
                  <Text fontSize="sm" color="gray.500" maxW="xs">
                    `memo`는 백엔드에서 `trimToNull` 처리되므로 공백만 입력하면
                    null로 저장됩니다.
                  </Text>
                  <Button
                    colorPalette="orange"
                    onClick={handleUpdateInquiry}
                    loading={isSavePending}
                    disabled={!hasPendingChanges || draftMemo.length > 500}
                  >
                    상태 저장
                  </Button>
                </HStack>
              </>
            ) : (
              <Box
                rounded="2xl"
                borderWidth="1px"
                borderStyle="dashed"
                borderColor="blackAlpha.200"
                p="8"
                textAlign="center"
              >
                <Text>문의가 없어서 상세 정보를 표시할 수 없습니다.</Text>
              </Box>
            )}
          </Card.Body>
        </Card.Root>
      </Grid>
    </Stack>
  );
}
