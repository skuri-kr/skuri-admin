"use client";

import Image from "next/image";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { FormField } from "@/components/admin/form-field";
import {
  InlineGroup,
  PageStack,
  ResponsiveGrid,
  SectionStack,
  TwoColumnGrid,
} from "@/components/admin/layout";
import { PageLoadingState } from "@/components/admin/page-status";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  AdminCreateChatRoomResponse,
  ApiResponse,
  ChatMessage,
  ChatMessagePage,
  ChatRoomDetail,
  ChatRoomLastMessage,
  ChatRoomSummary,
  ChatRoomType,
} from "@/features/admin/types";
import { useAuth } from "@/features/auth/auth-context";
import { getAuthorizedJson } from "@/lib/api/authenticated-client";
import { ApiError } from "@/lib/api/http";
import { getApiBaseUrl } from "@/lib/env/public-env";
import { formatDateTime } from "@/lib/format/date";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";

const roomTypeOptions = ["ALL", "UNIVERSITY", "DEPARTMENT", "GAME", "CUSTOM"] as const;
const createRoomTypeOptions = ["UNIVERSITY", "DEPARTMENT", "GAME", "CUSTOM"] as const;
const joinedFilterOptions = ["ALL", "JOINED"] as const;
const defaultMessagePageSize = 20;

function roomTypeBadgeClass(type: ChatRoomType) {
  switch (type) {
    case "UNIVERSITY":
      return "border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300";
    case "DEPARTMENT":
      return "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300";
    case "GAME":
      return "border border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/50 dark:text-orange-300";
    case "CUSTOM":
      return "border border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300";
    case "PARTY":
      return "border border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-900 dark:bg-pink-950/50 dark:text-pink-300";
  }
}

function messageTypeBadgeClass(type: ChatMessage["type"]) {
  switch (type) {
    case "TEXT":
      return "border border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-300";
    case "IMAGE":
      return "border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300";
    case "SYSTEM":
      return "border border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300";
    case "ACCOUNT":
      return "border border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/50 dark:text-orange-300";
    case "ARRIVED":
      return "border border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950/50 dark:text-teal-300";
    case "END":
      return "border border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300";
  }
}

function formatText(value: string | null | undefined) {
  return value && value.trim().length ? value : "-";
}

function isManagedPublicRoom(room: ChatRoomSummary | ChatRoomDetail) {
  return room.isPublic && room.type !== "PARTY";
}

function formatLastMessagePreview(lastMessage: ChatRoomLastMessage | null) {
  if (!lastMessage) {
    return "메시지 없음";
  }

  switch (lastMessage.type) {
    case "IMAGE":
      return "이미지";
    case "ACCOUNT":
      return "계좌 정보";
    case "ARRIVED":
      return "도착/정산";
    case "END":
      return lastMessage.text ?? "파티 종료";
    case "SYSTEM":
    case "TEXT":
    default:
      return lastMessage.text ?? "메시지 없음";
  }
}

function InfoField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function renderMessageContent(message: ChatMessage) {
  switch (message.type) {
    case "IMAGE":
      return message.imageUrl ? (
        <div className="overflow-hidden rounded-lg border bg-muted/30">
          <Image
            src={message.imageUrl}
            alt="채팅 이미지"
            width={1120}
            height={720}
            className="max-h-[280px] w-full object-contain"
            unoptimized
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">이미지 URL 없음</p>
      );
    case "ACCOUNT":
      return message.accountData ? (
        <TwoColumnGrid>
          <InfoField label="은행명">{formatText(message.accountData.bankName)}</InfoField>
          <InfoField label="계좌번호">
            <span className="break-all">
              {formatText(message.accountData.accountNumber)}
            </span>
          </InfoField>
          <InfoField label="예금주">{formatText(message.accountData.accountHolder)}</InfoField>
          <InfoField label="이름 숨김">
            <Badge
              variant="outline"
              className={
                message.accountData.hideName
                  ? "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/50 dark:text-orange-300"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
              }
            >
              {message.accountData.hideName ? "ON" : "OFF"}
            </Badge>
          </InfoField>
        </TwoColumnGrid>
      ) : (
        <p className="text-sm text-muted-foreground">계좌 정보 없음</p>
      );
    case "ARRIVED":
      return message.arrivalData ? (
        <TwoColumnGrid>
          <InfoField label="택시비">{message.arrivalData.taxiFare ?? "-"}</InfoField>
          <InfoField label="정산 인원">
            {message.arrivalData.splitMemberCount ?? "-"}
          </InfoField>
          <InfoField label="1인당 금액">
            {message.arrivalData.perPersonAmount ?? "-"}
          </InfoField>
          <InfoField label="정산 대상 멤버 수">
            {message.arrivalData.settlementTargetMemberIds?.length ?? 0}
          </InfoField>
        </TwoColumnGrid>
      ) : (
        <p className="text-sm text-muted-foreground">도착 정보 없음</p>
      );
    case "TEXT":
    case "SYSTEM":
    case "END":
    default:
      return <p className="whitespace-pre-wrap text-sm">{formatText(message.text)}</p>;
  }
}

export default function ChatRoomsPage() {
  const { user, isAdminVerified } = useAuth();
  const [selectedType, setSelectedType] =
    useState<(typeof roomTypeOptions)[number]>("ALL");
  const [selectedJoinedFilter, setSelectedJoinedFilter] =
    useState<(typeof joinedFilterOptions)[number]>("ALL");
  const [refreshKey, setRefreshKey] = useState(0);
  const [rooms, setRooms] = useState<ChatRoomSummary[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [createName, setCreateName] = useState("");
  const [createType, setCreateType] =
    useState<(typeof createRoomTypeOptions)[number]>("CUSTOM");
  const [createDescription, setCreateDescription] = useState("");
  const [createPending, setCreatePending] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
  const [selectedRoomDetail, setSelectedRoomDetail] = useState<ChatRoomDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [messageRefreshKey, setMessageRefreshKey] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [messagesHasNext, setMessagesHasNext] = useState(false);
  const [messagesNextCursorCreatedAt, setMessagesNextCursorCreatedAt] =
    useState<string | null>(null);
  const [messagesNextCursorId, setMessagesNextCursorId] = useState<string | null>(null);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);

  const [roomActionPending, setRoomActionPending] = useState(false);
  const [roomActionError, setRoomActionError] = useState<string | null>(null);
  const [roomActionSuccess, setRoomActionSuccess] = useState<string | null>(null);

  const previousSelectedRoomIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !isAdminVerified) {
      return;
    }

    const controller = new AbortController();

    const loadRooms = async () => {
      setListLoading(true);
      setListError(null);

      try {
        const params = new URLSearchParams();

        if (selectedType !== "ALL") {
          params.set("type", selectedType);
        }
        if (selectedJoinedFilter === "JOINED") {
          params.set("joined", "true");
        }

        const response = await getAuthorizedJson<ApiResponse<ChatRoomSummary[]>>(
          user,
          `${getApiBaseUrl()}/v1/chat-rooms${params.size ? `?${params.toString()}` : ""}`,
          { signal: controller.signal },
        );

        if (!controller.signal.aborted) {
          setRooms(response.data.filter(isManagedPublicRoom));
        }
      } catch (caughtError) {
        if (!controller.signal.aborted) {
          setListError(
            caughtError instanceof ApiError
              ? caughtError.message
              : "공개 채팅방 목록을 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setListLoading(false);
        }
      }
    };

    void loadRooms();

    return () => controller.abort();
  }, [isAdminVerified, refreshKey, selectedJoinedFilter, selectedType, user]);

  useEffect(() => {
    if (!rooms.length) {
      if (!isRoomDialogOpen) {
        setSelectedRoomId(null);
      }
      return;
    }

    setSelectedRoomId((current) =>
      current && rooms.some((room) => room.id === current)
        ? current
        : isRoomDialogOpen
          ? current
          : null,
    );
  }, [isRoomDialogOpen, rooms]);

  useEffect(() => {
    if (!user || !isAdminVerified || !selectedRoomId || !isRoomDialogOpen) {
      setSelectedRoomDetail(null);
      setDetailLoading(false);
      setDetailError(null);
      return;
    }

    const controller = new AbortController();

    const loadRoomDetail = async () => {
      setDetailLoading(true);
      setDetailError(null);

      try {
        const response = await getAuthorizedJson<ApiResponse<ChatRoomDetail>>(
          user,
          `${getApiBaseUrl()}/v1/chat-rooms/${selectedRoomId}`,
          { signal: controller.signal },
        );

        if (!controller.signal.aborted) {
          setSelectedRoomDetail(response.data);
        }
      } catch (caughtError) {
        if (!controller.signal.aborted) {
          setSelectedRoomDetail(null);
          setDetailError(
            caughtError instanceof ApiError
              ? caughtError.message
              : "채팅방 상세를 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setDetailLoading(false);
        }
      }
    };

    void loadRoomDetail();

    return () => controller.abort();
  }, [isAdminVerified, isRoomDialogOpen, selectedRoomId, user]);

  useEffect(() => {
    const currentSelectedRoomId = selectedRoomDetail?.id ?? null;

    if (previousSelectedRoomIdRef.current === currentSelectedRoomId) {
      return;
    }

    previousSelectedRoomIdRef.current = currentSelectedRoomId;
    setRoomActionError(null);
    setRoomActionSuccess(null);
    setMessages([]);
    setMessagesError(null);
    setMessagesHasNext(false);
    setMessagesNextCursorCreatedAt(null);
    setMessagesNextCursorId(null);
  }, [selectedRoomDetail]);

  useEffect(() => {
    if (!user || !isAdminVerified || !selectedRoomDetail || !isRoomDialogOpen) {
      setMessages([]);
      setMessagesError(null);
      setMessagesLoading(false);
      setMessagesHasNext(false);
      setMessagesNextCursorCreatedAt(null);
      setMessagesNextCursorId(null);
      return;
    }

    if (!selectedRoomDetail.joined) {
      setMessages([]);
      setMessagesError(null);
      setMessagesLoading(false);
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
          `${getApiBaseUrl()}/v1/chat-rooms/${selectedRoomDetail.id}/messages?${params.toString()}`,
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
              : "채팅 메시지를 불러오지 못했습니다.",
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
  }, [isAdminVerified, isRoomDialogOpen, messageRefreshKey, selectedRoomDetail, user]);

  const selectedRoomSummary = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) ?? null,
    [rooms, selectedRoomId],
  );

  const dialogRoomLabel =
    selectedRoomDetail?.name ?? selectedRoomSummary?.name ?? "공개 채팅방 상세";
  const totalRooms = rooms.length;
  const joinedRooms = rooms.filter((room) => room.joined).length;
  const customRooms = rooms.filter((room) => room.type === "CUSTOM").length;

  const handleOpenRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
    setIsRoomDialogOpen(true);
  };

  const handleCreateRoom = async () => {
    if (!user) {
      return;
    }

    setCreatePending(true);
    setCreateError(null);
    setCreateSuccess(null);

    try {
      const response = await getAuthorizedJson<ApiResponse<AdminCreateChatRoomResponse>>(
        user,
        `${getApiBaseUrl()}/v1/admin/chat-rooms`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: createName.trim(),
            type: createType,
            description: createDescription.trim() || null,
            isPublic: true,
          }),
        },
      );

      setCreateName("");
      setCreateDescription("");
      setCreateType("CUSTOM");
      setCreateSuccess(`채팅방 ${response.data.name}을(를) 생성했습니다.`);
      setRefreshKey((current) => current + 1);
      setSelectedRoomId(response.data.id);
      setIsRoomDialogOpen(true);
    } catch (caughtError) {
      setCreateError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "채팅방을 생성하지 못했습니다.",
      );
    } finally {
      setCreatePending(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!user || !selectedRoomDetail) {
      return;
    }

    setRoomActionPending(true);
    setRoomActionError(null);
    setRoomActionSuccess(null);

    try {
      const response = await getAuthorizedJson<ApiResponse<ChatRoomDetail>>(
        user,
        `${getApiBaseUrl()}/v1/chat-rooms/${selectedRoomDetail.id}/join`,
        { method: "POST" },
      );

      setSelectedRoomDetail(response.data);
      setRoomActionSuccess("채팅방에 참여했습니다.");
      setRefreshKey((current) => current + 1);
      setMessageRefreshKey((current) => current + 1);
    } catch (caughtError) {
      setRoomActionError(
        caughtError instanceof ApiError ? caughtError.message : "채팅방에 참여하지 못했습니다.",
      );
    } finally {
      setRoomActionPending(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!user || !selectedRoomDetail) {
      return;
    }

    setRoomActionPending(true);
    setRoomActionError(null);
    setRoomActionSuccess(null);

    try {
      const response = await getAuthorizedJson<ApiResponse<ChatRoomDetail>>(
        user,
        `${getApiBaseUrl()}/v1/chat-rooms/${selectedRoomDetail.id}/members/me`,
        { method: "DELETE" },
      );

      setSelectedRoomDetail(response.data);
      setMessages([]);
      setMessagesHasNext(false);
      setMessagesNextCursorCreatedAt(null);
      setMessagesNextCursorId(null);
      setRoomActionSuccess("채팅방에서 나갔습니다.");
      setRefreshKey((current) => current + 1);
    } catch (caughtError) {
      setRoomActionError(
        caughtError instanceof ApiError ? caughtError.message : "채팅방에서 나가지 못했습니다.",
      );
    } finally {
      setRoomActionPending(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!user || !selectedRoomDetail) {
      return;
    }

    if (!isManagedPublicRoom(selectedRoomDetail)) {
      setRoomActionError("이 화면에서는 PARTY 또는 비공개 채팅방을 삭제할 수 없습니다.");
      return;
    }

    if (!window.confirm(`채팅방 "${selectedRoomDetail.name}"을(를) 삭제하시겠습니까?`)) {
      return;
    }

    setRoomActionPending(true);
    setRoomActionError(null);
    setRoomActionSuccess(null);

    try {
      await getAuthorizedJson<ApiResponse<null>>(
        user,
        `${getApiBaseUrl()}/v1/admin/chat-rooms/${selectedRoomDetail.id}`,
        { method: "DELETE" },
      );

      setIsRoomDialogOpen(false);
      setSelectedRoomId(null);
      setSelectedRoomDetail(null);
      setMessages([]);
      setRefreshKey((current) => current + 1);
      setCreateSuccess(`채팅방 ${selectedRoomDetail.name}을(를) 삭제했습니다.`);
    } catch (caughtError) {
      setRoomActionError(
        caughtError instanceof ApiError ? caughtError.message : "채팅방을 삭제하지 못했습니다.",
      );
    } finally {
      setRoomActionPending(false);
    }
  };

  const handleLoadMoreMessages = async () => {
    if (
      !user ||
      !selectedRoomDetail ||
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
        `${getApiBaseUrl()}/v1/chat-rooms/${selectedRoomDetail.id}/messages?${params.toString()}`,
      );

      setMessages((current) => [...current, ...response.data.messages]);
      setMessagesHasNext(response.data.hasNext);
      setMessagesNextCursorCreatedAt(response.data.nextCursor?.createdAt ?? null);
      setMessagesNextCursorId(response.data.nextCursor?.id ?? null);
    } catch (caughtError) {
      setMessagesError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "이전 메시지를 불러오지 못했습니다.",
      );
    } finally {
      setLoadingMoreMessages(false);
    }
  };

  if (listLoading && !rooms.length) {
    return <PageLoadingState label="공개 채팅방 목록을 불러오는 중입니다." />;
  }

  return (
    <PageStack>
      <SectionStack className="gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Chat Rooms
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">공개 채팅방 관리</h1>
        <p className="text-sm text-muted-foreground">
          현재는 공개 채팅방 목록/상세/메시지 조회, 관리자 생성/삭제, 참여/나가기까지
          운영할 수 있습니다. 멤버 목록과 강퇴 같은 관리자 전용 액션은 아직 백엔드 gap
          으로 남아 있습니다.
        </p>
      </SectionStack>

      <ResponsiveGrid>
        <Card>
          <CardContent className="space-y-1 pt-6">
            <p className="text-sm text-muted-foreground">운영 대상 채팅방</p>
            <p className="text-3xl font-semibold tracking-tight">{totalRooms}</p>
            <p className="text-sm text-muted-foreground">
              PARTY 타입은 이 화면에서 제외됩니다.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 pt-6">
            <p className="text-sm text-muted-foreground">참여 중인 채팅방</p>
            <p className="text-3xl font-semibold tracking-tight">{joinedRooms}</p>
            <p className="text-sm text-muted-foreground">
              메시지 조회는 joined=true 방에서만 가능합니다.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 pt-6">
            <p className="text-sm text-muted-foreground">커스텀 공개방</p>
            <p className="text-3xl font-semibold tracking-tight">{customRooms}</p>
            <p className="text-sm text-muted-foreground">
              관리자 생성 응답과 목록을 함께 사용합니다.
            </p>
          </CardContent>
        </Card>
      </ResponsiveGrid>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>공개 채팅방 생성</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <TwoColumnGrid>
              <FormField label="채팅방 이름" htmlFor="create-room-name">
                <Input
                  id="create-room-name"
                  value={createName}
                  placeholder="예: 성결대 전체 채팅방"
                  onChange={(event) => setCreateName(event.target.value)}
                />
              </FormField>

              <FormField label="채팅방 타입">
                <Select value={createType} onValueChange={(value) => setCreateType(value as (typeof createRoomTypeOptions)[number])}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {createRoomTypeOptions.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </TwoColumnGrid>

            <FormField label="설명" htmlFor="create-room-description">
              <Textarea
                id="create-room-description"
                value={createDescription}
                className="min-h-[132px]"
                placeholder="채팅방 설명을 입력하세요."
                onChange={(event) => setCreateDescription(event.target.value)}
              />
            </FormField>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>생성 제약</AlertTitle>
              <AlertDescription>
                관리자 생성은 `isPublic=true` 공개방만 허용되고, `PARTY` 타입은 만들 수
                없습니다.
              </AlertDescription>
            </Alert>

            {createSuccess ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>완료</AlertTitle>
                <AlertDescription>{createSuccess}</AlertDescription>
              </Alert>
            ) : null}

            {createError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>생성 실패</AlertTitle>
                <AlertDescription>{createError}</AlertDescription>
              </Alert>
            ) : null}

            <Button
              disabled={!createName.trim() || createPending}
              onClick={handleCreateRoom}
            >
              {createPending ? "생성 중..." : "채팅방 생성"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>목록 필터</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="타입">
              <Select
                value={selectedType}
                onValueChange={(value) =>
                  setSelectedType(value as (typeof roomTypeOptions)[number])
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roomTypeOptions.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type === "ALL" ? "전체" : type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="참여 상태">
              <Select
                value={selectedJoinedFilter}
                onValueChange={(value) =>
                  setSelectedJoinedFilter(value as (typeof joinedFilterOptions)[number])
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {joinedFilterOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === "ALL" ? "전체" : "참여 중만"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <p className="text-sm text-muted-foreground">
              현재는 공개 채팅방 관리 화면이므로 PARTY 타입은 클라이언트에서 제외합니다.
            </p>

            <Button
              variant="outline"
              onClick={() => {
                setSelectedType("ALL");
                setSelectedJoinedFilter("ALL");
              }}
            >
              필터 초기화
            </Button>
          </CardContent>
        </Card>
      </div>

      {listError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>채팅방 목록 조회 실패</AlertTitle>
          <AlertDescription>{listError}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>공개 채팅방 목록</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>채팅방</TableHead>
                <TableHead>타입</TableHead>
                <TableHead>참여/멤버</TableHead>
                <TableHead>마지막 메시지</TableHead>
                <TableHead className="text-right">상세</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms.map((room) => (
                <TableRow key={room.id}>
                  <TableCell className="whitespace-normal">
                    <div className="space-y-1">
                      <p className="font-semibold">{room.name}</p>
                      <p className="break-all text-xs text-muted-foreground">{room.id}</p>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {formatText(room.description)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={roomTypeBadgeClass(room.type)}>
                      {room.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <div className="space-y-1">
                      <Badge
                        variant="outline"
                        className={
                          room.joined
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
                            : "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-300"
                        }
                      >
                        {room.joined ? "참여 중" : "미참여"}
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        멤버 {room.memberCount}명 · 미읽음 {room.unreadCount}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <div className="space-y-1">
                      <p className="line-clamp-2 text-sm">
                        {formatLastMessagePreview(room.lastMessage)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(room.lastMessageAt)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => handleOpenRoom(room.id)}>
                      상세 보기
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {!rooms.length ? (
            <p className="text-sm text-muted-foreground">
              현재 조건에 맞는 운영 대상 공개 채팅방이 없습니다.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>남은 백엔드 gap</AlertTitle>
        <AlertDescription>
          관리자 전용 목록 API, 멤버 목록 조회, 강제 퇴장, 시스템 메시지 발송은 아직 없어
          placeholder로 남겨둡니다.
        </AlertDescription>
      </Alert>

      <Dialog open={isRoomDialogOpen} onOpenChange={setIsRoomDialogOpen}>
        <DialogContent className="max-w-5xl p-0">
          <DialogHeader className="border-b px-6 pt-6">
            <DialogTitle>{dialogRoomLabel}</DialogTitle>
            <DialogDescription>
              공개 채팅방 상세, 참여 상태, 메시지 이력, 관리자 삭제
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[86vh] overflow-y-auto px-6 pb-6">
            <PageStack className="gap-5 py-5">
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <CardTitle>채팅방 상세</CardTitle>
                    {selectedRoomDetail ? (
                      <InlineGroup>
                        <Badge
                          variant="outline"
                          className={roomTypeBadgeClass(selectedRoomDetail.type)}
                        >
                          {selectedRoomDetail.type}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={
                            selectedRoomDetail.joined
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
                              : "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-300"
                          }
                        >
                          {selectedRoomDetail.joined ? "참여 중" : "미참여"}
                        </Badge>
                      </InlineGroup>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {detailLoading ? (
                    <p className="text-sm text-muted-foreground">
                      채팅방 상세를 불러오는 중입니다.
                    </p>
                  ) : detailError ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>상세 조회 실패</AlertTitle>
                      <AlertDescription>{detailError}</AlertDescription>
                    </Alert>
                  ) : !selectedRoomDetail ? (
                    <p className="text-sm text-muted-foreground">
                      채팅방을 선택하면 상세 정보가 표시됩니다.
                    </p>
                  ) : (
                    <>
                      <TwoColumnGrid>
                        <InfoField label="채팅방 이름">{selectedRoomDetail.name}</InfoField>
                        <InfoField label="채팅방 ID">
                          <span className="break-all">{selectedRoomDetail.id}</span>
                        </InfoField>
                        <InfoField label="공개 여부">
                          <Badge
                            variant="outline"
                            className={
                              selectedRoomDetail.isPublic
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
                                : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
                            }
                          >
                            {selectedRoomDetail.isPublic ? "공개" : "비공개"}
                          </Badge>
                        </InfoField>
                        <InfoField label="멤버 수">{selectedRoomDetail.memberCount}</InfoField>
                        <InfoField label="미읽음 메시지">
                          {selectedRoomDetail.unreadCount}
                        </InfoField>
                        <InfoField label="음소거">
                          <Badge
                            variant="outline"
                            className={
                              selectedRoomDetail.isMuted
                                ? "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/50 dark:text-orange-300"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
                            }
                          >
                            {selectedRoomDetail.isMuted ? "ON" : "OFF"}
                          </Badge>
                        </InfoField>
                        <InfoField label="마지막 메시지 시각">
                          {formatDateTime(selectedRoomDetail.lastMessageAt)}
                        </InfoField>
                        <InfoField label="lastReadAt">
                          {formatDateTime(selectedRoomDetail.lastReadAt)}
                        </InfoField>
                      </TwoColumnGrid>

                      <InfoField label="설명">
                        <p className="whitespace-pre-wrap text-sm">
                          {formatText(selectedRoomDetail.description)}
                        </p>
                      </InfoField>

                      <InfoField label="마지막 메시지">
                        {selectedRoomDetail.lastMessage ? (
                          <div className="space-y-2 rounded-lg border p-3">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <Badge
                                variant="outline"
                                className={messageTypeBadgeClass(
                                  selectedRoomDetail.lastMessage.type as ChatMessage["type"],
                                )}
                              >
                                {selectedRoomDetail.lastMessage.type}
                              </Badge>
                              <p className="text-xs text-muted-foreground">
                                {formatDateTime(selectedRoomDetail.lastMessage.createdAt)}
                              </p>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {formatLastMessagePreview(selectedRoomDetail.lastMessage)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              sender: {formatText(selectedRoomDetail.lastMessage.senderName)}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            마지막 메시지가 없습니다.
                          </p>
                        )}
                      </InfoField>

                      <InlineGroup>
                        <Button
                          variant={selectedRoomDetail.joined ? "secondary" : "default"}
                          disabled={roomActionPending}
                          onClick={selectedRoomDetail.joined ? handleLeaveRoom : handleJoinRoom}
                        >
                          {roomActionPending
                            ? "처리 중..."
                            : selectedRoomDetail.joined
                              ? "채팅방 나가기"
                              : "채팅방 참여"}
                        </Button>
                        <Button
                          variant="destructive"
                          disabled={roomActionPending}
                          onClick={handleDeleteRoom}
                        >
                          관리자 삭제
                        </Button>
                        <Button
                          variant="outline"
                          disabled={!selectedRoomDetail.joined}
                          onClick={() => setMessageRefreshKey((current) => current + 1)}
                        >
                          메시지 새로고침
                        </Button>
                      </InlineGroup>

                      {roomActionSuccess ? (
                        <Alert>
                          <CheckCircle2 className="h-4 w-4" />
                          <AlertTitle>완료</AlertTitle>
                          <AlertDescription>{roomActionSuccess}</AlertDescription>
                        </Alert>
                      ) : null}

                      {roomActionError ? (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>작업 실패</AlertTitle>
                          <AlertDescription>{roomActionError}</AlertDescription>
                        </Alert>
                      ) : null}
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>메시지 이력</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!selectedRoomDetail ? (
                    <p className="text-sm text-muted-foreground">
                      채팅방 상세를 먼저 불러오세요.
                    </p>
                  ) : !selectedRoomDetail.joined ? (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>메시지 조회 전 참여 필요</AlertTitle>
                      <AlertDescription>
                        공개 채팅방도 joined=true 상태여야
                        `GET /v1/chat-rooms/{'{chatRoomId}'}/messages`를 호출할 수 있습니다.
                      </AlertDescription>
                    </Alert>
                  ) : messagesLoading ? (
                    <p className="text-sm text-muted-foreground">
                      채팅 메시지를 불러오는 중입니다.
                    </p>
                  ) : messagesError ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>메시지 조회 실패</AlertTitle>
                      <AlertDescription>{messagesError}</AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <SectionStack className="gap-3">
                        {messages.length ? (
                          messages.map((message) => (
                            <div key={message.id} className="space-y-3 rounded-lg border p-4">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-semibold">
                                      {formatText(message.senderName)}
                                    </p>
                                    <Badge
                                      variant="outline"
                                      className={messageTypeBadgeClass(message.type)}
                                    >
                                      {message.type}
                                    </Badge>
                                  </div>
                                  <p className="break-all text-xs text-muted-foreground">
                                    senderId: {message.senderId}
                                  </p>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {formatDateTime(message.createdAt)}
                                </p>
                              </div>
                              {renderMessageContent(message)}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            표시할 메시지가 없습니다.
                          </p>
                        )}
                      </SectionStack>

                      {messagesHasNext ? (
                        <Button
                          variant="outline"
                          disabled={loadingMoreMessages}
                          onClick={handleLoadMoreMessages}
                        >
                          {loadingMoreMessages
                            ? "불러오는 중..."
                            : "이전 메시지 더 불러오기"}
                        </Button>
                      ) : null}
                    </>
                  )}
                </CardContent>
              </Card>
            </PageStack>
          </div>
        </DialogContent>
      </Dialog>
    </PageStack>
  );
}
