"use client";

import { AlertCircle } from "lucide-react";
import { PartiesFiltersCard } from "@/components/admin/parties/filters-card";
import { PartyDetailDialog } from "@/components/admin/parties/party-detail-dialog";
import { PartiesSummaryGrid } from "@/components/admin/parties/summary-grid";
import { PartiesTable } from "@/components/admin/parties/parties-table";
import {
  type PartyListStatusOption,
  type PartyPageSizeOption,
} from "@/components/admin/parties/constants";
import {
  actionLabel,
  allowedActions,
  formatText,
} from "@/components/admin/parties/helpers";
import { PageLoadingState } from "@/components/admin/page-status";
import { SectionAlert } from "@/components/admin/section-alert";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  AdminPartyDetail,
  AdminPartyJoinRequest,
  AdminPartyStatus,
  AdminPartyStatusAction,
  AdminPartyStatusUpdateResponse,
  AdminPartySummary,
  AdminPartySystemMessageResponse,
  ApiResponse,
  ChatMessage,
  ChatMessagePage,
  PageResponse,
} from "@/features/admin/types";
import { useAuth } from "@/features/auth/auth-context";
import { getAuthorizedJson } from "@/lib/api/authenticated-client";
import { ApiError } from "@/lib/api/http";
import { getApiBaseUrl } from "@/lib/env/public-env";
import { formatDateTime } from "@/lib/format/date";
import { useEffect, useMemo, useState } from "react";

const defaultMessagePageSize = 20;

export default function PartiesPage() {
  const { user, isAdminVerified } = useAuth();

  const [query, setQuery] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [selectedStatus, setSelectedStatus] =
    useState<PartyListStatusOption>("ALL");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState<PartyPageSizeOption>("20");
  const [refreshKey, setRefreshKey] = useState(0);

  const [pageData, setPageData] = useState<PageResponse<AdminPartySummary> | null>(
    null,
  );
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [isPartyDialogOpen, setIsPartyDialogOpen] = useState(false);
  const [selectedPartyDetail, setSelectedPartyDetail] =
    useState<AdminPartyDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);
  const [joinRequests, setJoinRequests] = useState<AdminPartyJoinRequest[]>([]);
  const [joinRequestsLoading, setJoinRequestsLoading] = useState(false);
  const [joinRequestsError, setJoinRequestsError] = useState<string | null>(null);
  const [messageRefreshKey, setMessageRefreshKey] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [messagesHasNext, setMessagesHasNext] = useState(false);
  const [messagesNextCursorCreatedAt, setMessagesNextCursorCreatedAt] =
    useState<string | null>(null);
  const [messagesNextCursorId, setMessagesNextCursorId] = useState<string | null>(
    null,
  );
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);

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
  const [systemMessageSuccess, setSystemMessageSuccess] = useState<string | null>(
    null,
  );

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
      setMessages([]);
      setMessagesLoading(false);
      setMessagesError(null);
      setMessagesHasNext(false);
      setMessagesNextCursorCreatedAt(null);
      setMessagesNextCursorId(null);
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
      setMessages([]);
      setMessagesLoading(false);
      setMessagesError(null);
      setMessagesHasNext(false);
      setMessagesNextCursorCreatedAt(null);
      setMessagesNextCursorId(null);
      return;
    }

    if (detailLoading) {
      return;
    }

    if (selectedPartyDetail && !selectedPartyDetail.chatRoomId) {
      setMessages([]);
      setMessagesLoading(false);
      setMessagesError(null);
      setMessagesHasNext(false);
      setMessagesNextCursorCreatedAt(null);
      setMessagesNextCursorId(null);
      return;
    }

    const controller = new AbortController();

    const loadMessages = async () => {
      setMessagesLoading(true);
      setMessagesError(null);

      try {
        const params = new URLSearchParams({
          size: String(defaultMessagePageSize),
        });
        const response = await getAuthorizedJson<ApiResponse<ChatMessagePage>>(
          user,
          `${getApiBaseUrl()}/v1/admin/parties/${selectedPartyId}/messages?${params.toString()}`,
          { signal: controller.signal },
        );

        if (!controller.signal.aborted) {
          setMessages(response.data.messages);
          setMessagesHasNext(response.data.hasNext);
          setMessagesNextCursorCreatedAt(response.data.nextCursor?.createdAt ?? null);
          setMessagesNextCursorId(response.data.nextCursor?.id ?? null);
        }
      } catch (caughtError) {
        if (!controller.signal.aborted) {
          setMessages([]);
          setMessagesError(
            caughtError instanceof ApiError
              ? caughtError.message
              : "파티 채팅 메시지를 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setMessagesLoading(false);
        }
      }
    };

    void loadMessages();

    return () => controller.abort();
  }, [
    detailLoading,
    isAdminVerified,
    isPartyDialogOpen,
    messageRefreshKey,
    selectedPartyDetail,
    selectedPartyId,
    user,
  ]);

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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: selectedAction }),
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
                  ? { ...party, status: response.data.status }
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
      >(
        user,
        `${getApiBaseUrl()}/v1/admin/parties/${selectedPartyDetail.id}/messages/system`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmedMessage }),
        },
      );

      setSystemMessage("");
      setSystemMessageSuccess(
        `${response.data.senderName} 이름으로 시스템 메시지를 전송했습니다. (${formatDateTime(
          response.data.createdAt,
        )})`,
      );
      setMessageRefreshKey((current) => current + 1);
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

  const handleLoadMoreMessages = async () => {
    if (
      !user ||
      !selectedPartyId ||
      !messagesHasNext ||
      !messagesNextCursorCreatedAt ||
      !messagesNextCursorId
    ) {
      return;
    }

    setLoadingMoreMessages(true);
    setMessagesError(null);

    try {
      const params = new URLSearchParams({
        size: String(defaultMessagePageSize),
        cursorCreatedAt: messagesNextCursorCreatedAt,
        cursorId: messagesNextCursorId,
      });
      const response = await getAuthorizedJson<ApiResponse<ChatMessagePage>>(
        user,
        `${getApiBaseUrl()}/v1/admin/parties/${selectedPartyId}/messages?${params.toString()}`,
      );

      setMessages((current) => [...current, ...response.data.messages]);
      setMessagesHasNext(response.data.hasNext);
      setMessagesNextCursorCreatedAt(response.data.nextCursor?.createdAt ?? null);
      setMessagesNextCursorId(response.data.nextCursor?.id ?? null);
    } catch (caughtError) {
      setMessagesError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "이전 파티 채팅 메시지를 불러오지 못했습니다.",
      );
    } finally {
      setLoadingMoreMessages(false);
    }
  };

  if (listLoading && !pageData) {
    return <PageLoadingState label="택시 파티 목록을 불러오는 중입니다." />;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Taxi Party
        </p>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">택시 파티 관리</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            관리자용 목록, 상세, 상태 변경에 이어 일반 멤버 강퇴, 운영 시스템
            메시지, pending join request 조회, 파티 채팅 이력 조회까지 현재 Spring Admin API에 맞춰
            연결한 화면입니다.
          </p>
        </div>
      </div>

      <PartiesSummaryGrid
        pageData={pageData}
        currentPageStatusCounts={currentPageStatusCounts}
      />

      <PartiesFiltersCard
        query={query}
        departureDate={departureDate}
        selectedStatus={selectedStatus}
        pageSize={pageSize}
        hasPrevious={Boolean(pageData?.hasPrevious)}
        hasNext={Boolean(pageData?.hasNext)}
        onQueryChange={setQuery}
        onDepartureDateChange={setDepartureDate}
        onStatusChange={setSelectedStatus}
        onPageSizeChange={setPageSize}
        onResetFilters={() => {
          setQuery("");
          setDepartureDate("");
          setSelectedStatus("ALL");
          setPageSize("20");
        }}
        onPreviousPage={() => setCurrentPage((current) => Math.max(0, current - 1))}
        onNextPage={() => setCurrentPage((current) => current + 1)}
      />

      {listError ? (
        <SectionAlert title="택시 파티 목록 조회 실패" description={listError} />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>택시 파티 목록</CardTitle>
          <CardDescription>
            행을 누르면 상세 modal에서 멤버 강퇴, 시스템 메시지, 상태 변경까지 처리할
            수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PartiesTable
            parties={parties}
            selectedPartyId={selectedPartyId}
            onSelectParty={(partyId) => {
              setSelectedPartyId(partyId);
              setIsPartyDialogOpen(true);
            }}
          />
        </CardContent>
      </Card>

      <Alert>
        <AlertCircle className="size-4" />
        <AlertTitle>남은 follow-up</AlertTitle>
        <AlertDescription>
          관리자 join request 승인/거절, 리더 교체/승계, 시스템 메시지 pin/공지 강조
          정책은 아직 follow-up입니다.
        </AlertDescription>
      </Alert>

      <PartyDetailDialog
        open={isPartyDialogOpen}
        onOpenChange={setIsPartyDialogOpen}
        selectedPartyDetail={selectedPartyDetail}
        selectedPartySummary={selectedPartySummary}
        detailLoading={detailLoading}
        detailError={detailError}
        joinRequests={joinRequests}
        joinRequestsLoading={joinRequestsLoading}
        joinRequestsError={joinRequestsError}
        selectedAction={selectedAction}
        availableActions={availableActions}
        actionPending={actionPending}
        actionError={actionError}
        actionSuccess={actionSuccess}
        removingMemberId={removingMemberId}
        memberActionError={memberActionError}
        memberActionSuccess={memberActionSuccess}
        systemMessage={systemMessage}
        systemMessagePending={systemMessagePending}
        systemMessageError={systemMessageError}
        systemMessageSuccess={systemMessageSuccess}
        onSelectedActionChange={setSelectedAction}
        onSystemMessageChange={setSystemMessage}
        onStatusAction={handleStatusAction}
        onRemoveMember={handleRemoveMember}
        onSendSystemMessage={handleSendSystemMessage}
        messages={messages}
        messagesLoading={messagesLoading}
        messagesError={messagesError}
        messagesHasNext={messagesHasNext}
        loadingMoreMessages={loadingMoreMessages}
        onLoadMoreMessages={handleLoadMoreMessages}
        onRefreshMessages={() => setMessageRefreshKey((current) => current + 1)}
      />
    </div>
  );
}
