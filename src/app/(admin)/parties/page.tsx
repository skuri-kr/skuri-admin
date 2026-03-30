"use client";

import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Dialog,
  Field,
  Grid,
  Heading,
  HStack,
  Input,
  NativeSelect,
  Stack,
  Table,
  Textarea,
  Text,
} from "@chakra-ui/react";
import { PageLoadingState } from "@/components/admin/page-status";
import type {
  AdminPartyDetail,
  AdminPartyJoinRequest,
  AdminPartyMemberSettlement,
  AdminPartyStatus,
  AdminPartyStatusAction,
  AdminPartyStatusUpdateResponse,
  AdminPartySummary,
  AdminPartySystemMessageResponse,
  ApiResponse,
  PageResponse,
} from "@/features/admin/types";
import { useAuth } from "@/features/auth/auth-context";
import { getAuthorizedJson } from "@/lib/api/authenticated-client";
import { ApiError } from "@/lib/api/http";
import { getApiBaseUrl } from "@/lib/env/public-env";
import { formatDateTime } from "@/lib/format/date";
import { useEffect, useMemo, useState } from "react";

const statusOptions = ["ALL", "OPEN", "CLOSED", "ARRIVED", "ENDED"] as const;
const pageSizeOptions = ["20", "50", "100"] as const;

function formatText(value: string | null | undefined) {
  return value && value.trim().length ? value : "-";
}

function partyStatusPalette(status: AdminPartyStatus) {
  switch (status) {
    case "OPEN":
      return "green";
    case "CLOSED":
      return "orange";
    case "ARRIVED":
      return "blue";
    case "ENDED":
      return "gray";
  }
}

function settlementStatusPalette(status: string | null | undefined) {
  switch ((status ?? "").toUpperCase()) {
    case "PENDING":
      return "orange";
    case "COMPLETED":
      return "green";
    case "FAILED":
      return "red";
    default:
      return "gray";
  }
}

function actionLabel(action: AdminPartyStatusAction) {
  switch (action) {
    case "CLOSE":
      return "모집 마감";
    case "REOPEN":
      return "모집 재개";
    case "CANCEL":
      return "파티 취소";
    case "END":
      return "강제 종료";
  }
}

function allowedActions(status: AdminPartyStatus): AdminPartyStatusAction[] {
  switch (status) {
    case "OPEN":
      return ["CLOSE", "CANCEL"];
    case "CLOSED":
      return ["REOPEN", "CANCEL"];
    case "ARRIVED":
      return ["END"];
    case "ENDED":
      return [];
  }
}

function canRemoveMember(status: AdminPartyStatus, isLeader: boolean) {
  if (isLeader) {
    return false;
  }

  return status !== "ARRIVED" && status !== "ENDED";
}

function renderSettlementMember(item: AdminPartyMemberSettlement) {
  return (
    <Stack key={item.memberId} gap="2" rounded="lg" borderWidth="1px" p="3">
      <HStack justify="space-between" align="start">
        <Text fontWeight="semibold">{item.displayName}</Text>
        <Badge colorPalette={item.settled ? "green" : "orange"}>
          {item.settled ? "정산 완료" : "정산 대기"}
        </Badge>
      </HStack>
      <Text fontSize="sm" color="gray.500">
        memberId: {item.memberId}
      </Text>
      <HStack justify="space-between" align="start" flexWrap="wrap">
        <Text fontSize="sm" color="gray.500">
          settledAt: {formatDateTime(item.settledAt)}
        </Text>
        <Text fontSize="sm" color="gray.500">
          leftParty: {item.leftParty ? "true" : "false"}
        </Text>
      </HStack>
    </Stack>
  );
}

export default function PartiesPage() {
  const { user, isAdminVerified } = useAuth();

  const [query, setQuery] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [selectedStatus, setSelectedStatus] =
    useState<(typeof statusOptions)[number]>("ALL");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState<(typeof pageSizeOptions)[number]>("20");
  const [refreshKey, setRefreshKey] = useState(0);

  const [pageData, setPageData] = useState<PageResponse<AdminPartySummary> | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [isPartyDialogOpen, setIsPartyDialogOpen] = useState(false);
  const [selectedPartyDetail, setSelectedPartyDetail] = useState<AdminPartyDetail | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);
  const [joinRequests, setJoinRequests] = useState<AdminPartyJoinRequest[]>([]);
  const [joinRequestsLoading, setJoinRequestsLoading] = useState(false);
  const [joinRequestsError, setJoinRequestsError] = useState<string | null>(null);

  const [selectedAction, setSelectedAction] = useState<AdminPartyStatusAction | "">("");
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [memberActionError, setMemberActionError] = useState<string | null>(null);
  const [memberActionSuccess, setMemberActionSuccess] = useState<string | null>(null);
  const [systemMessage, setSystemMessage] = useState("");
  const [systemMessagePending, setSystemMessagePending] = useState(false);
  const [systemMessageError, setSystemMessageError] = useState<string | null>(null);
  const [systemMessageSuccess, setSystemMessageSuccess] = useState<string | null>(null);

  useEffect(() => {
    setCurrentPage(0);
  }, [departureDate, pageSize, query, selectedStatus]);

  useEffect(() => {
    if (!user || !isAdminVerified) {
      return;
    }

    const controller = new AbortController();

    const loadParties = async () => {
      setListLoading(true);
      setListError(null);

      try {
        const params = new URLSearchParams({
          page: String(currentPage),
          size: pageSize,
        });

        if (query.trim()) {
          params.set("query", query.trim());
        }
        if (departureDate) {
          params.set("departureDate", departureDate);
        }
        if (selectedStatus !== "ALL") {
          params.set("status", selectedStatus);
        }

        const response = await getAuthorizedJson<
          ApiResponse<PageResponse<AdminPartySummary>>
        >(user, `${getApiBaseUrl()}/v1/admin/parties?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setPageData(response.data);
        }
      } catch (caughtError) {
        if (!controller.signal.aborted) {
          setListError(
            caughtError instanceof ApiError
              ? caughtError.message
              : "택시 파티 목록을 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setListLoading(false);
        }
      }
    };

    void loadParties();

    return () => controller.abort();
  }, [
    currentPage,
    departureDate,
    isAdminVerified,
    pageSize,
    query,
    refreshKey,
    selectedStatus,
    user,
  ]);

  useEffect(() => {
    if (!user || !isAdminVerified || !selectedPartyId || !isPartyDialogOpen) {
      setSelectedPartyDetail(null);
      setDetailLoading(false);
      setDetailError(null);
      setJoinRequests([]);
      setJoinRequestsLoading(false);
      setJoinRequestsError(null);
      return;
    }

    const controller = new AbortController();

    const loadDetail = async () => {
      setDetailLoading(true);
      setDetailError(null);

      try {
        const response = await getAuthorizedJson<ApiResponse<AdminPartyDetail>>(
          user,
          `${getApiBaseUrl()}/v1/admin/parties/${selectedPartyId}`,
          { signal: controller.signal },
        );

        if (!controller.signal.aborted) {
          setSelectedPartyDetail(response.data);
        }
      } catch (caughtError) {
        if (!controller.signal.aborted) {
          setSelectedPartyDetail(null);
          setDetailError(
            caughtError instanceof ApiError
              ? caughtError.message
              : "택시 파티 상세를 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setDetailLoading(false);
        }
      }
    };

    void loadDetail();

    return () => controller.abort();
  }, [detailRefreshKey, isAdminVerified, isPartyDialogOpen, selectedPartyId, user]);

  useEffect(() => {
    if (!user || !isAdminVerified || !selectedPartyId || !isPartyDialogOpen) {
      setJoinRequests([]);
      setJoinRequestsLoading(false);
      setJoinRequestsError(null);
      return;
    }

    const controller = new AbortController();

    const loadJoinRequests = async () => {
      setJoinRequestsLoading(true);
      setJoinRequestsError(null);

      try {
        const response = await getAuthorizedJson<ApiResponse<AdminPartyJoinRequest[]>>(
          user,
          `${getApiBaseUrl()}/v1/admin/parties/${selectedPartyId}/join-requests`,
          { signal: controller.signal },
        );

        if (!controller.signal.aborted) {
          setJoinRequests(response.data);
        }
      } catch (caughtError) {
        if (!controller.signal.aborted) {
          setJoinRequests([]);
          setJoinRequestsError(
            caughtError instanceof ApiError
              ? caughtError.message
              : "합류 요청 목록을 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setJoinRequestsLoading(false);
        }
      }
    };

    void loadJoinRequests();

    return () => controller.abort();
  }, [detailRefreshKey, isAdminVerified, isPartyDialogOpen, selectedPartyId, user]);

  useEffect(() => {
    if (!selectedPartyDetail) {
      setSelectedAction("");
      setActionError(null);
      setActionSuccess(null);
      setMemberActionError(null);
      setMemberActionSuccess(null);
      setRemovingMemberId(null);
      setSystemMessage("");
      setSystemMessageError(null);
      setSystemMessageSuccess(null);
      return;
    }

    const nextAllowedAction = allowedActions(selectedPartyDetail.status)[0] ?? "";
    setSelectedAction(nextAllowedAction);
    setActionError(null);
    setActionSuccess(null);
    setMemberActionError(null);
    setMemberActionSuccess(null);
    setRemovingMemberId(null);
    setSystemMessageError(null);
    setSystemMessageSuccess(null);
  }, [selectedPartyDetail]);

  const parties = useMemo(() => pageData?.content ?? [], [pageData]);
  const selectedPartySummary = useMemo(
    () => parties.find((party) => party.id === selectedPartyId) ?? null,
    [parties, selectedPartyId],
  );

  const currentPageStatusCounts = useMemo(
    () =>
      parties.reduce<Record<AdminPartyStatus, number>>(
        (accumulator, party) => {
          accumulator[party.status] += 1;
          return accumulator;
        },
        {
          OPEN: 0,
          CLOSED: 0,
          ARRIVED: 0,
          ENDED: 0,
        },
      ),
    [parties],
  );

  const availableActions = selectedPartyDetail
    ? allowedActions(selectedPartyDetail.status)
    : [];

  const handleStatusAction = async () => {
    if (!user || !selectedPartyDetail || !selectedAction) {
      return;
    }

    setActionPending(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const response = await getAuthorizedJson<ApiResponse<AdminPartyStatusUpdateResponse>>(
        user,
        `${getApiBaseUrl()}/v1/admin/parties/${selectedPartyDetail.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: selectedAction,
          }),
        },
      );

      setSelectedPartyDetail((current) =>
        current
          ? {
              ...current,
              status: response.data.status,
              endReason: response.data.endReason ?? current.endReason,
            }
          : current,
      );
      setPageData((current) =>
        current
          ? {
              ...current,
              content: current.content.map((party) =>
                party.id === response.data.id
                  ? {
                      ...party,
                      status: response.data.status,
                    }
                  : party,
              ),
            }
          : current,
      );
      setRefreshKey((current) => current + 1);
      setDetailRefreshKey((current) => current + 1);
      setActionSuccess(`${actionLabel(selectedAction)} 처리했습니다.`);
    } catch (caughtError) {
      setActionError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "택시 파티 상태를 변경하지 못했습니다.",
      );
    } finally {
      setActionPending(false);
    }
  };

  const handleRemoveMember = async (memberId: string, nickname: string | null) => {
    if (!user || !selectedPartyDetail) {
      return;
    }

    const confirmed = window.confirm(
      `${formatText(nickname)} (${memberId}) 멤버를 이 파티에서 제거할까요?`,
    );

    if (!confirmed) {
      return;
    }

    setRemovingMemberId(memberId);
    setMemberActionError(null);
    setMemberActionSuccess(null);

    try {
      await getAuthorizedJson<ApiResponse<null>>(
        user,
        `${getApiBaseUrl()}/v1/admin/parties/${selectedPartyDetail.id}/members/${memberId}`,
        { method: "DELETE" },
      );

      setSelectedPartyDetail((current) =>
        current
          ? {
              ...current,
              currentMembers: Math.max(current.currentMembers - 1, 0),
              members: current.members.filter((member) => member.id !== memberId),
            }
          : current,
      );
      setPageData((current) =>
        current
          ? {
              ...current,
              content: current.content.map((party) =>
                party.id === selectedPartyDetail.id
                  ? {
                      ...party,
                      currentMembers: Math.max(party.currentMembers - 1, 0),
                    }
                  : party,
              ),
            }
          : current,
      );
      setRefreshKey((current) => current + 1);
      setDetailRefreshKey((current) => current + 1);
      setMemberActionSuccess(`${formatText(nickname)} 멤버를 제거했습니다.`);
    } catch (caughtError) {
      setMemberActionError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "멤버를 제거하지 못했습니다.",
      );
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleSendSystemMessage = async () => {
    if (!user || !selectedPartyDetail) {
      return;
    }

    const trimmedMessage = systemMessage.trim();

    if (!trimmedMessage.length) {
      setSystemMessageError("메시지를 입력한 뒤 전송하세요.");
      setSystemMessageSuccess(null);
      return;
    }

    setSystemMessagePending(true);
    setSystemMessageError(null);
    setSystemMessageSuccess(null);

    try {
      const response = await getAuthorizedJson<
        ApiResponse<AdminPartySystemMessageResponse>
      >(user, `${getApiBaseUrl()}/v1/admin/parties/${selectedPartyDetail.id}/messages/system`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmedMessage,
        }),
      });

      setSystemMessage("");
      setSystemMessageSuccess(
        `${response.data.senderName} 이름으로 시스템 메시지를 전송했습니다. (${formatDateTime(
          response.data.createdAt,
        )})`,
      );
    } catch (caughtError) {
      setSystemMessageError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "시스템 메시지를 전송하지 못했습니다.",
      );
    } finally {
      setSystemMessagePending(false);
    }
  };

  if (listLoading && !pageData) {
    return <PageLoadingState label="택시 파티 목록을 불러오는 중입니다." />;
  }

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
          Taxi Party
        </Text>
        <Heading size="2xl">택시 파티 관리</Heading>
        <Text color="gray.600" _dark={{ color: "gray.300" }}>
          관리자용 목록/상세/상태 변경에 이어 일반 멤버 강퇴, 운영 시스템 메시지,
          pending join request 조회까지 현재 Spring Admin API에 맞춰 연결했습니다.
        </Text>
      </Stack>

      <Grid templateColumns={{ base: "1fr", md: "repeat(3, minmax(0, 1fr))" }} gap="4">
        <Card.Root>
          <Card.Body gap="1">
            <Text fontSize="sm" color="gray.500">
              전체 파티
            </Text>
            <Heading size="xl">{pageData?.totalElements ?? 0}</Heading>
            <Text fontSize="sm" color="gray.500">
              현재 페이지 {(pageData?.page ?? 0) + 1} / {pageData?.totalPages ?? 1}
            </Text>
          </Card.Body>
        </Card.Root>
        <Card.Root>
          <Card.Body gap="1">
            <Text fontSize="sm" color="gray.500">
              현재 페이지 상태 분포
            </Text>
            <Text fontSize="sm">OPEN {currentPageStatusCounts.OPEN}</Text>
            <Text fontSize="sm">CLOSED {currentPageStatusCounts.CLOSED}</Text>
            <Text fontSize="sm">ARRIVED {currentPageStatusCounts.ARRIVED}</Text>
            <Text fontSize="sm">ENDED {currentPageStatusCounts.ENDED}</Text>
          </Card.Body>
        </Card.Root>
        <Card.Root>
          <Card.Body gap="1">
            <Text fontSize="sm" color="gray.500">
              운영 제약
            </Text>
            <Heading size="md">상태 머신 재사용</Heading>
            <Text fontSize="sm" color="gray.500">
              `OPEN→CLOSED`, `CLOSED→OPEN`, `OPEN/CLOSED→CANCEL`, `ARRIVED→END`
              만 허용합니다.
            </Text>
          </Card.Body>
        </Card.Root>
      </Grid>

      <Card.Root>
        <Card.Body>
          <Grid templateColumns={{ base: "1fr", md: "repeat(4, minmax(0, 1fr))" }} gap="4">
            <Field.Root>
              <Field.Label>검색</Field.Label>
              <Input
                value={query}
                placeholder="출발지, 도착지, 리더 UID/닉네임"
                onChange={(event) => setQuery(event.target.value)}
              />
            </Field.Root>

            <Field.Root>
              <Field.Label>상태</Field.Label>
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
              <Field.Label>출발일</Field.Label>
              <Input
                type="date"
                value={departureDate}
                onChange={(event) => setDepartureDate(event.target.value)}
              />
            </Field.Root>

            <Field.Root maxW={{ base: "full", md: "120px" }}>
              <Field.Label>page size</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field
                  value={pageSize}
                  onChange={(event) =>
                    setPageSize(
                      event.target.value as (typeof pageSizeOptions)[number],
                    )
                  }
                >
                  {pageSizeOptions.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </NativeSelect.Field>
              </NativeSelect.Root>
            </Field.Root>
          </Grid>

          <HStack mt="4" justify="space-between" flexWrap="wrap">
            <Text fontSize="sm" color="gray.500">
              기본 정렬은 `departureTime DESC`, tie-breaker는 `createdAt DESC`입니다.
            </Text>
            <HStack>
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("");
                  setDepartureDate("");
                  setSelectedStatus("ALL");
                  setPageSize("20");
                }}
              >
                필터 초기화
              </Button>
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
          </HStack>
        </Card.Body>
      </Card.Root>

      {listError ? (
        <Alert.Root status="error" rounded="xl">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>택시 파티 목록 조회 실패</Alert.Title>
            <Alert.Description>{listError}</Alert.Description>
          </Alert.Content>
        </Alert.Root>
      ) : null}

      <Card.Root>
        <Card.Header>
          <Heading size="md">택시 파티 목록</Heading>
        </Card.Header>
        <Card.Body gap="4">
          <Box overflowX="auto">
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>상태</Table.ColumnHeader>
                  <Table.ColumnHeader>리더</Table.ColumnHeader>
                  <Table.ColumnHeader>경로</Table.ColumnHeader>
                  <Table.ColumnHeader>출발</Table.ColumnHeader>
                  <Table.ColumnHeader>인원</Table.ColumnHeader>
                  <Table.ColumnHeader>생성일</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {parties.map((party) => {
                  const active = party.id === selectedPartyId;
                  return (
                    <Table.Row
                      key={party.id}
                      bg={active ? "teal.50" : undefined}
                      _dark={{ bg: active ? "whiteAlpha.100" : undefined }}
                      _hover={{ bg: "blackAlpha.50", _dark: { bg: "whiteAlpha.100" } }}
                      cursor="pointer"
                      onClick={() => {
                        setSelectedPartyId(party.id);
                        setIsPartyDialogOpen(true);
                      }}
                    >
                      <Table.Cell>
                        <Badge colorPalette={partyStatusPalette(party.status)}>
                          {party.status}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Stack gap="1">
                          <Text fontWeight="semibold">
                            {formatText(party.leaderNickname)}
                          </Text>
                          <Text fontSize="xs" color="gray.500" wordBreak="break-all">
                            {party.leaderId}
                          </Text>
                        </Stack>
                      </Table.Cell>
                      <Table.Cell>
                        <Stack gap="1">
                          <Text>{party.routeSummary}</Text>
                          <Text fontSize="xs" color="gray.500" wordBreak="break-all">
                            {party.id}
                          </Text>
                        </Stack>
                      </Table.Cell>
                      <Table.Cell>
                        <Text>{formatDateTime(party.departureTime)}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text>
                          {party.currentMembers} / {party.maxMembers}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text>{formatDateTime(party.createdAt)}</Text>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Root>
          </Box>

          {!parties.length ? (
            <Text fontSize="sm" color="gray.500">
              현재 조건에 맞는 택시 파티가 없습니다.
            </Text>
          ) : null}
        </Card.Body>
      </Card.Root>

      <Alert.Root status="info" rounded="xl">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>남은 follow-up</Alert.Title>
          <Alert.Description>
            관리자 join request 승인/거절, 리더 교체/승계, 시스템 메시지 pin/공지 강조
            정책은 아직 follow-up입니다.
          </Alert.Description>
        </Alert.Content>
      </Alert.Root>

      <Dialog.Root
        lazyMount
        open={isPartyDialogOpen}
        onOpenChange={(details) => setIsPartyDialogOpen(details.open)}
      >
        <Dialog.Backdrop />
        <Dialog.Positioner px={{ base: "4", md: "6" }}>
          <Dialog.Content maxW="6xl" maxH="85vh">
            <Dialog.Header>
              <Stack gap="1">
                <Dialog.Title>
                  {selectedPartyDetail?.routeSummary ??
                    selectedPartySummary?.routeSummary ??
                    "택시 파티 상세"}
                </Dialog.Title>
                <Text fontSize="sm" color="gray.500">
                  상세 조회, 상태 변경, 일반 멤버 강퇴, 운영 시스템 메시지, pending
                  join request 조회까지 이 modal에서 처리합니다.
                </Text>
              </Stack>
            </Dialog.Header>
            <Dialog.CloseTrigger />
            <Dialog.Body overflowY="auto" pb="6">
              <Stack gap="5">
                <Card.Root>
                  <Card.Header>
                    <Heading size="md">기본 정보</Heading>
                  </Card.Header>
                  <Card.Body gap="4">
                    {detailLoading ? (
                      <Text fontSize="sm" color="gray.500">
                        택시 파티 상세를 불러오는 중입니다.
                      </Text>
                    ) : detailError ? (
                      <Alert.Root status="error" rounded="xl">
                        <Alert.Indicator />
                        <Alert.Content>
                          <Alert.Title>상세 조회 실패</Alert.Title>
                          <Alert.Description>{detailError}</Alert.Description>
                        </Alert.Content>
                      </Alert.Root>
                    ) : !selectedPartyDetail ? (
                      <Text fontSize="sm" color="gray.500">
                        파티를 선택하면 상세 정보가 표시됩니다.
                      </Text>
                    ) : (
                      <Stack gap="4">
                        <Grid
                          templateColumns={{ base: "1fr", md: "repeat(2, minmax(0, 1fr))" }}
                          gap="4"
                        >
                          <Field.Root>
                            <Field.Label>파티 ID</Field.Label>
                            <Text wordBreak="break-all">{selectedPartyDetail.id}</Text>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>상태</Field.Label>
                            <Badge colorPalette={partyStatusPalette(selectedPartyDetail.status)}>
                              {selectedPartyDetail.status}
                            </Badge>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>리더</Field.Label>
                            <Text>
                              {formatText(selectedPartyDetail.leader.nickname)} (
                              {selectedPartyDetail.leader.id})
                            </Text>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>모집 인원</Field.Label>
                            <Text>
                              {selectedPartyDetail.currentMembers} /{" "}
                              {selectedPartyDetail.maxMembers}
                            </Text>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>출발 시각</Field.Label>
                            <Text>{formatDateTime(selectedPartyDetail.departureTime)}</Text>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>대기 중인 합류 요청</Field.Label>
                            <Text>{selectedPartyDetail.pendingJoinRequestCount}</Text>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>생성일</Field.Label>
                            <Text>{formatDateTime(selectedPartyDetail.createdAt)}</Text>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>수정일</Field.Label>
                            <Text>{formatDateTime(selectedPartyDetail.updatedAt)}</Text>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>endReason</Field.Label>
                            <Text>{formatText(selectedPartyDetail.endReason)}</Text>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>종료 시각</Field.Label>
                            <Text>{formatDateTime(selectedPartyDetail.endedAt)}</Text>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>채팅방 ID</Field.Label>
                            <Text wordBreak="break-all">
                              {formatText(selectedPartyDetail.chatRoomId)}
                            </Text>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>settlementStatus</Field.Label>
                            <Badge
                              colorPalette={settlementStatusPalette(
                                selectedPartyDetail.settlementStatus,
                              )}
                            >
                              {formatText(selectedPartyDetail.settlementStatus)}
                            </Badge>
                          </Field.Root>
                        </Grid>

                        <Grid
                          templateColumns={{ base: "1fr", md: "repeat(2, minmax(0, 1fr))" }}
                          gap="4"
                        >
                          <Field.Root>
                            <Field.Label>출발지</Field.Label>
                            <Text>
                              {selectedPartyDetail.departure.name} (
                              {selectedPartyDetail.departure.lat},{" "}
                              {selectedPartyDetail.departure.lng})
                            </Text>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>도착지</Field.Label>
                            <Text>
                              {selectedPartyDetail.destination.name} (
                              {selectedPartyDetail.destination.lat},{" "}
                              {selectedPartyDetail.destination.lng})
                            </Text>
                          </Field.Root>
                        </Grid>

                        <Field.Root>
                          <Field.Label>상세 메모</Field.Label>
                          <Text whiteSpace="pre-wrap">
                            {formatText(selectedPartyDetail.detail)}
                          </Text>
                        </Field.Root>

                        <Field.Root>
                          <Field.Label>태그</Field.Label>
                          {selectedPartyDetail.tags.length ? (
                            <HStack gap="2" flexWrap="wrap">
                              {selectedPartyDetail.tags.map((tag) => (
                                <Badge key={tag} colorPalette="purple" variant="subtle">
                                  {tag}
                                </Badge>
                              ))}
                            </HStack>
                          ) : (
                            <Text fontSize="sm" color="gray.500">
                              태그가 없습니다.
                            </Text>
                          )}
                        </Field.Root>
                      </Stack>
                    )}
                  </Card.Body>
                </Card.Root>

                <Grid templateColumns={{ base: "1fr", xl: "repeat(2, minmax(0, 1fr))" }} gap="5">
                  <Card.Root>
                    <Card.Header>
                      <Heading size="md">참여 멤버</Heading>
                    </Card.Header>
                    <Card.Body gap="3">
                      {memberActionSuccess ? (
                        <Alert.Root status="success" rounded="xl">
                          <Alert.Indicator />
                          <Alert.Content>
                            <Alert.Title>멤버 제거 완료</Alert.Title>
                            <Alert.Description>{memberActionSuccess}</Alert.Description>
                          </Alert.Content>
                        </Alert.Root>
                      ) : null}

                      {memberActionError ? (
                        <Alert.Root status="error" rounded="xl">
                          <Alert.Indicator />
                          <Alert.Content>
                            <Alert.Title>멤버 제거 실패</Alert.Title>
                            <Alert.Description>{memberActionError}</Alert.Description>
                          </Alert.Content>
                        </Alert.Root>
                      ) : null}

                      <Text fontSize="sm" color="gray.500">
                        leader는 제거할 수 없고, `ARRIVED`/`ENDED` 상태에서는 일반 멤버
                        제거도 허용되지 않습니다.
                      </Text>

                      {!selectedPartyDetail ? (
                        <Text fontSize="sm" color="gray.500">
                          파티 상세를 선택하세요.
                        </Text>
                      ) : selectedPartyDetail.members.length ? (
                        selectedPartyDetail.members.map((member) => (
                          <Stack key={member.id} gap="2" rounded="lg" borderWidth="1px" p="3">
                            <HStack justify="space-between" align="start">
                              <Text fontWeight="semibold">
                                {formatText(member.nickname)}
                              </Text>
                              <HStack>
                                <Badge colorPalette={member.isLeader ? "teal" : "gray"}>
                                  {member.isLeader ? "리더" : "멤버"}
                                </Badge>
                                {!member.isLeader ? (
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    colorPalette="red"
                                    disabled={
                                      removingMemberId === member.id ||
                                      !canRemoveMember(
                                        selectedPartyDetail.status,
                                        member.isLeader,
                                      )
                                    }
                                    loading={removingMemberId === member.id}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void handleRemoveMember(member.id, member.nickname);
                                    }}
                                  >
                                    강퇴
                                  </Button>
                                ) : null}
                              </HStack>
                            </HStack>
                            <Text fontSize="sm" color="gray.500" wordBreak="break-all">
                              {member.id}
                            </Text>
                            <Text fontSize="sm" color="gray.500">
                              joinedAt: {formatDateTime(member.joinedAt)}
                            </Text>
                          </Stack>
                        ))
                      ) : (
                        <Text fontSize="sm" color="gray.500">
                          참여 멤버 정보가 없습니다.
                        </Text>
                      )}
                    </Card.Body>
                  </Card.Root>

                  <Card.Root>
                    <Card.Header>
                      <Heading size="md">정산 정보</Heading>
                    </Card.Header>
                    <Card.Body gap="4">
                      {!selectedPartyDetail ? (
                        <Text fontSize="sm" color="gray.500">
                          파티 상세를 선택하세요.
                        </Text>
                      ) : selectedPartyDetail.settlement ? (
                        <Stack gap="4">
                          <Grid
                            templateColumns={{ base: "1fr", md: "repeat(2, minmax(0, 1fr))" }}
                            gap="4"
                          >
                            <Field.Root>
                              <Field.Label>정산 상태</Field.Label>
                              <Badge
                                colorPalette={settlementStatusPalette(
                                  selectedPartyDetail.settlement.status,
                                )}
                              >
                                {selectedPartyDetail.settlement.status}
                              </Badge>
                            </Field.Root>
                            <Field.Root>
                              <Field.Label>택시비</Field.Label>
                              <Text>{selectedPartyDetail.settlement.taxiFare ?? "-"}</Text>
                            </Field.Root>
                            <Field.Root>
                              <Field.Label>정산 인원</Field.Label>
                              <Text>
                                {selectedPartyDetail.settlement.splitMemberCount ?? "-"}
                              </Text>
                            </Field.Root>
                            <Field.Root>
                              <Field.Label>1인당 금액</Field.Label>
                              <Text>
                                {selectedPartyDetail.settlement.perPersonAmount ?? "-"}
                              </Text>
                            </Field.Root>
                          </Grid>

                          <Field.Root>
                            <Field.Label>정산 계좌</Field.Label>
                            {selectedPartyDetail.settlement.account ? (
                              <Grid
                                templateColumns={{
                                  base: "1fr",
                                  md: "repeat(2, minmax(0, 1fr))",
                                }}
                                gap="4"
                              >
                                <Text>
                                  은행명:{" "}
                                  {formatText(
                                    selectedPartyDetail.settlement.account.bankName,
                                  )}
                                </Text>
                                <Text>
                                  계좌번호:{" "}
                                  {formatText(
                                    selectedPartyDetail.settlement.account.accountNumber,
                                  )}
                                </Text>
                                <Text>
                                  예금주:{" "}
                                  {formatText(
                                    selectedPartyDetail.settlement.account.accountHolder,
                                  )}
                                </Text>
                                <Text>
                                  이름 숨김:{" "}
                                  {selectedPartyDetail.settlement.account.hideName
                                    ? "true"
                                    : "false"}
                                </Text>
                              </Grid>
                            ) : (
                              <Text fontSize="sm" color="gray.500">
                                계좌 정보가 없습니다.
                              </Text>
                            )}
                          </Field.Root>

                          <Field.Root>
                            <Field.Label>멤버 정산 상태</Field.Label>
                            <Stack gap="3">
                              {selectedPartyDetail.settlement.memberSettlements.length ? (
                                selectedPartyDetail.settlement.memberSettlements.map(
                                  renderSettlementMember,
                                )
                              ) : (
                                <Text fontSize="sm" color="gray.500">
                                  멤버 정산 정보가 없습니다.
                                </Text>
                              )}
                            </Stack>
                          </Field.Root>
                        </Stack>
                      ) : (
                        <Text fontSize="sm" color="gray.500">
                          정산 정보가 없습니다.
                        </Text>
                      )}
                    </Card.Body>
                  </Card.Root>
                </Grid>

                <Grid templateColumns={{ base: "1fr", xl: "repeat(2, minmax(0, 1fr))" }} gap="5">
                  <Card.Root>
                    <Card.Header>
                      <Heading size="md">Pending Join Request</Heading>
                    </Card.Header>
                    <Card.Body gap="3">
                      <Text fontSize="sm" color="gray.500">
                        현재는 최신 요청 조회만 가능하고 승인/거절은 follow-up입니다.
                      </Text>

                      {joinRequestsLoading ? (
                        <Text fontSize="sm" color="gray.500">
                          join request 목록을 불러오는 중입니다.
                        </Text>
                      ) : joinRequestsError ? (
                        <Alert.Root status="error" rounded="xl">
                          <Alert.Indicator />
                          <Alert.Content>
                            <Alert.Title>join request 조회 실패</Alert.Title>
                            <Alert.Description>{joinRequestsError}</Alert.Description>
                          </Alert.Content>
                        </Alert.Root>
                      ) : joinRequests.length ? (
                        joinRequests.map((request) => (
                          <Stack
                            key={request.requestId}
                            gap="2"
                            rounded="lg"
                            borderWidth="1px"
                            p="3"
                          >
                            <HStack justify="space-between" align="start">
                              <Stack gap="1">
                                <Text fontWeight="semibold">
                                  {formatText(request.nickname)}
                                </Text>
                                <Text fontSize="sm" color="gray.500">
                                  {formatText(request.realname)}
                                </Text>
                              </Stack>
                              <Badge colorPalette="purple">PENDING</Badge>
                            </HStack>
                            <Text fontSize="sm" color="gray.500" wordBreak="break-all">
                              requestId: {request.requestId}
                            </Text>
                            <Text fontSize="sm" color="gray.500" wordBreak="break-all">
                              memberId: {request.memberId}
                            </Text>
                            <Text fontSize="sm" color="gray.500">
                              {formatText(request.department)} /{" "}
                              {formatText(request.studentId)}
                            </Text>
                            <Text fontSize="sm" color="gray.500">
                              requestedAt: {formatDateTime(request.requestedAt)}
                            </Text>
                          </Stack>
                        ))
                      ) : (
                        <Text fontSize="sm" color="gray.500">
                          현재 대기 중인 join request가 없습니다.
                        </Text>
                      )}
                    </Card.Body>
                  </Card.Root>

                  <Card.Root>
                    <Card.Header>
                      <Heading size="md">운영 시스템 메시지</Heading>
                    </Card.Header>
                    <Card.Body gap="4">
                      <Text fontSize="sm" color="gray.500">
                        party chat room이 있을 때만 전송할 수 있고, 표시 기준은
                        `senderName=관리자`, `senderPhotoUrl=null`입니다.
                      </Text>

                      {!selectedPartyDetail?.chatRoomId ? (
                        <Alert.Root status="warning" rounded="xl">
                          <Alert.Indicator />
                          <Alert.Content>
                            <Alert.Title>채팅방 없음</Alert.Title>
                            <Alert.Description>
                              이 파티는 chat room이 없어 운영 시스템 메시지를 보낼 수
                              없습니다.
                            </Alert.Description>
                          </Alert.Content>
                        </Alert.Root>
                      ) : null}

                      <Field.Root>
                        <Field.Label>메시지</Field.Label>
                        <Textarea
                          value={systemMessage}
                          placeholder="파티 참여자에게 보낼 운영 안내 메시지를 입력하세요."
                          minH="160px"
                          maxLength={500}
                          onChange={(event) => setSystemMessage(event.target.value)}
                        />
                      </Field.Root>

                      <HStack justify="space-between" align="start" flexWrap="wrap">
                        <Text fontSize="sm" color="gray.500">
                          공백만 입력할 수 없고 최대 500자입니다.
                        </Text>
                        <Text fontSize="sm" color="gray.500">
                          {systemMessage.length} / 500
                        </Text>
                      </HStack>

                      {systemMessageSuccess ? (
                        <Alert.Root status="success" rounded="xl">
                          <Alert.Indicator />
                          <Alert.Content>
                            <Alert.Title>시스템 메시지 전송 완료</Alert.Title>
                            <Alert.Description>{systemMessageSuccess}</Alert.Description>
                          </Alert.Content>
                        </Alert.Root>
                      ) : null}

                      {systemMessageError ? (
                        <Alert.Root status="error" rounded="xl">
                          <Alert.Indicator />
                          <Alert.Content>
                            <Alert.Title>시스템 메시지 전송 실패</Alert.Title>
                            <Alert.Description>{systemMessageError}</Alert.Description>
                          </Alert.Content>
                        </Alert.Root>
                      ) : null}

                      <Button
                        alignSelf="flex-start"
                        colorPalette="purple"
                        disabled={
                          !selectedPartyDetail?.chatRoomId ||
                          !systemMessage.trim().length ||
                          systemMessagePending
                        }
                        loading={systemMessagePending}
                        onClick={handleSendSystemMessage}
                      >
                        시스템 메시지 전송
                      </Button>
                    </Card.Body>
                  </Card.Root>
                </Grid>

                <Card.Root>
                  <Card.Header>
                    <Heading size="md">상태 변경</Heading>
                  </Card.Header>
                  <Card.Body gap="4">
                    {!selectedPartyDetail ? (
                      <Text fontSize="sm" color="gray.500">
                        파티 상세를 선택하세요.
                      </Text>
                    ) : (
                      <>
                        <Field.Root maxW={{ base: "full", md: "240px" }}>
                          <Field.Label>변경 액션</Field.Label>
                          <NativeSelect.Root>
                            <NativeSelect.Field
                              value={selectedAction}
                              onChange={(event) =>
                                setSelectedAction(
                                  event.target.value as AdminPartyStatusAction | "",
                                )
                              }
                            >
                              {availableActions.length ? (
                                availableActions.map((action) => (
                                  <option key={action} value={action}>
                                    {actionLabel(action)}
                                  </option>
                                ))
                              ) : (
                                <option value="">현재 상태에서 가능한 액션 없음</option>
                              )}
                            </NativeSelect.Field>
                          </NativeSelect.Root>
                        </Field.Root>

                        <Text fontSize="sm" color="gray.500">
                          현재 정책은 `OPEN→CLOSE`, `CLOSED→REOPEN`, `OPEN/CLOSED→CANCEL`,
                          `ARRIVED→END`만 허용합니다.
                        </Text>

                        {actionSuccess ? (
                          <Alert.Root status="success" rounded="xl">
                            <Alert.Indicator />
                            <Alert.Content>
                              <Alert.Title>상태 변경 완료</Alert.Title>
                              <Alert.Description>{actionSuccess}</Alert.Description>
                            </Alert.Content>
                          </Alert.Root>
                        ) : null}

                        {actionError ? (
                          <Alert.Root status="error" rounded="xl">
                            <Alert.Indicator />
                            <Alert.Content>
                              <Alert.Title>상태 변경 실패</Alert.Title>
                              <Alert.Description>{actionError}</Alert.Description>
                            </Alert.Content>
                          </Alert.Root>
                        ) : null}

                        <Button
                          alignSelf="flex-start"
                          colorPalette="teal"
                          disabled={!selectedAction || actionPending}
                          loading={actionPending}
                          onClick={handleStatusAction}
                        >
                          상태 변경 실행
                        </Button>
                      </>
                    )}
                  </Card.Body>
                </Card.Root>
              </Stack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Stack>
  );
}
