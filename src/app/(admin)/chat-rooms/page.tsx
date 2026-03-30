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
  Image,
  Input,
  NativeSelect,
  Stack,
  Table,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { PageLoadingState } from "@/components/admin/page-status";
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
import { useEffect, useMemo, useRef, useState } from "react";

const roomTypeOptions = ["ALL", "UNIVERSITY", "DEPARTMENT", "GAME", "CUSTOM"] as const;
const createRoomTypeOptions = ["UNIVERSITY", "DEPARTMENT", "GAME", "CUSTOM"] as const;
const joinedFilterOptions = ["ALL", "JOINED"] as const;
const defaultMessagePageSize = 20;

function roomTypePalette(type: ChatRoomType) {
  switch (type) {
    case "UNIVERSITY":
      return "blue";
    case "DEPARTMENT":
      return "green";
    case "GAME":
      return "orange";
    case "CUSTOM":
      return "purple";
    case "PARTY":
      return "pink";
  }
}

function messageTypePalette(type: ChatMessage["type"]) {
  switch (type) {
    case "TEXT":
      return "gray";
    case "IMAGE":
      return "blue";
    case "SYSTEM":
      return "purple";
    case "ACCOUNT":
      return "orange";
    case "ARRIVED":
      return "teal";
    case "END":
      return "red";
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

function renderMessageContent(message: ChatMessage) {
  switch (message.type) {
    case "IMAGE":
      return message.imageUrl ? (
        <Image
          src={message.imageUrl}
          alt="채팅 이미지"
          rounded="lg"
          maxH="280px"
          objectFit="contain"
          borderWidth="1px"
          borderColor="border.muted"
        />
      ) : (
        <Text color="gray.500">이미지 URL 없음</Text>
      );
    case "ACCOUNT":
      return message.accountData ? (
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, minmax(0, 1fr))" }} gap="3">
          <Field.Root>
            <Field.Label>은행명</Field.Label>
            <Text>{formatText(message.accountData.bankName)}</Text>
          </Field.Root>
          <Field.Root>
            <Field.Label>계좌번호</Field.Label>
            <Text wordBreak="break-all">{formatText(message.accountData.accountNumber)}</Text>
          </Field.Root>
          <Field.Root>
            <Field.Label>예금주</Field.Label>
            <Text>{formatText(message.accountData.accountHolder)}</Text>
          </Field.Root>
          <Field.Root>
            <Field.Label>이름 숨김</Field.Label>
            <Badge colorPalette={message.accountData.hideName ? "orange" : "green"}>
              {message.accountData.hideName ? "ON" : "OFF"}
            </Badge>
          </Field.Root>
        </Grid>
      ) : (
        <Text color="gray.500">계좌 정보 없음</Text>
      );
    case "ARRIVED":
      return message.arrivalData ? (
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, minmax(0, 1fr))" }} gap="3">
          <Field.Root>
            <Field.Label>택시비</Field.Label>
            <Text>{message.arrivalData.taxiFare ?? "-"}</Text>
          </Field.Root>
          <Field.Root>
            <Field.Label>정산 인원</Field.Label>
            <Text>{message.arrivalData.splitMemberCount ?? "-"}</Text>
          </Field.Root>
          <Field.Root>
            <Field.Label>1인당 금액</Field.Label>
            <Text>{message.arrivalData.perPersonAmount ?? "-"}</Text>
          </Field.Root>
          <Field.Root>
            <Field.Label>정산 대상 멤버 수</Field.Label>
            <Text>{message.arrivalData.settlementTargetMemberIds?.length ?? 0}</Text>
          </Field.Root>
        </Grid>
      ) : (
        <Text color="gray.500">도착 정보 없음</Text>
      );
    case "TEXT":
    case "SYSTEM":
    case "END":
    default:
      return <Text whiteSpace="pre-wrap">{formatText(message.text)}</Text>;
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
    <Stack gap="6">
      <Stack gap="3">
        <Text
          fontSize="xs"
          fontWeight="700"
          letterSpacing="0.18em"
          textTransform="uppercase"
          color="gray.500"
        >
          Chat Rooms
        </Text>
        <Heading size="2xl">공개 채팅방 관리</Heading>
        <Text color="gray.600" _dark={{ color: "gray.300" }}>
          현재는 공개 채팅방 목록/상세/메시지 조회, 관리자 생성/삭제, 참여/나가기까지
          운영할 수 있습니다. 멤버 목록과 강퇴 같은 관리자 전용 액션은 아직 백엔드 gap
          으로 남아 있습니다.
        </Text>
      </Stack>

      <Grid templateColumns={{ base: "1fr", md: "repeat(3, minmax(0, 1fr))" }} gap="4">
        <Card.Root>
          <Card.Body gap="1">
            <Text fontSize="sm" color="gray.500">
              운영 대상 채팅방
            </Text>
            <Heading size="xl">{totalRooms}</Heading>
            <Text fontSize="sm" color="gray.500">
              PARTY 타입은 이 화면에서 제외됩니다.
            </Text>
          </Card.Body>
        </Card.Root>
        <Card.Root>
          <Card.Body gap="1">
            <Text fontSize="sm" color="gray.500">
              참여 중인 채팅방
            </Text>
            <Heading size="xl">{joinedRooms}</Heading>
            <Text fontSize="sm" color="gray.500">
              메시지 조회는 joined=true 방에서만 가능합니다.
            </Text>
          </Card.Body>
        </Card.Root>
        <Card.Root>
          <Card.Body gap="1">
            <Text fontSize="sm" color="gray.500">
              커스텀 공개방
            </Text>
            <Heading size="xl">{customRooms}</Heading>
            <Text fontSize="sm" color="gray.500">
              관리자 생성 응답과 목록을 함께 사용합니다.
            </Text>
          </Card.Body>
        </Card.Root>
      </Grid>

      <Grid templateColumns={{ base: "1fr", xl: "1.2fr 1fr" }} gap="5">
        <Card.Root>
          <Card.Header>
            <Heading size="md">공개 채팅방 생성</Heading>
          </Card.Header>
          <Card.Body gap="4">
            <Grid templateColumns={{ base: "1fr", md: "repeat(2, minmax(0, 1fr))" }} gap="4">
              <Field.Root>
                <Field.Label>채팅방 이름</Field.Label>
                <Input
                  value={createName}
                  placeholder="예: 성결대 전체 채팅방"
                  onChange={(event) => setCreateName(event.target.value)}
                />
              </Field.Root>

              <Field.Root>
                <Field.Label>채팅방 타입</Field.Label>
                <NativeSelect.Root>
                  <NativeSelect.Field
                    value={createType}
                    onChange={(event) =>
                      setCreateType(
                        event.target.value as (typeof createRoomTypeOptions)[number],
                      )
                    }
                  >
                    {createRoomTypeOptions.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </NativeSelect.Field>
                </NativeSelect.Root>
              </Field.Root>
            </Grid>

            <Field.Root>
              <Field.Label>설명</Field.Label>
              <Textarea
                value={createDescription}
                minH="132px"
                placeholder="채팅방 설명을 입력하세요."
                onChange={(event) => setCreateDescription(event.target.value)}
              />
            </Field.Root>

            <Alert.Root status="info" rounded="xl">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>생성 제약</Alert.Title>
                <Alert.Description>
                  관리자 생성은 `isPublic=true` 공개방만 허용되고, `PARTY` 타입은 만들 수
                  없습니다.
                </Alert.Description>
              </Alert.Content>
            </Alert.Root>

            {createSuccess ? (
              <Alert.Root status="success" rounded="xl">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>완료</Alert.Title>
                  <Alert.Description>{createSuccess}</Alert.Description>
                </Alert.Content>
              </Alert.Root>
            ) : null}

            {createError ? (
              <Alert.Root status="error" rounded="xl">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>생성 실패</Alert.Title>
                  <Alert.Description>{createError}</Alert.Description>
                </Alert.Content>
              </Alert.Root>
            ) : null}

            <Button
              alignSelf="flex-start"
              colorPalette="teal"
              loading={createPending}
              disabled={!createName.trim()}
              onClick={handleCreateRoom}
            >
              채팅방 생성
            </Button>
          </Card.Body>
        </Card.Root>

        <Card.Root>
          <Card.Header>
            <Heading size="md">목록 필터</Heading>
          </Card.Header>
          <Card.Body gap="4">
            <Field.Root>
              <Field.Label>타입</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field
                  value={selectedType}
                  onChange={(event) =>
                    setSelectedType(event.target.value as (typeof roomTypeOptions)[number])
                  }
                >
                  {roomTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type === "ALL" ? "전체" : type}
                    </option>
                  ))}
                </NativeSelect.Field>
              </NativeSelect.Root>
            </Field.Root>

            <Field.Root>
              <Field.Label>참여 상태</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field
                  value={selectedJoinedFilter}
                  onChange={(event) =>
                    setSelectedJoinedFilter(
                      event.target.value as (typeof joinedFilterOptions)[number],
                    )
                  }
                >
                  {joinedFilterOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === "ALL" ? "전체" : "참여 중만"}
                    </option>
                  ))}
                </NativeSelect.Field>
              </NativeSelect.Root>
            </Field.Root>

            <Text fontSize="sm" color="gray.500">
              현재는 공개 채팅방 관리 화면이므로 PARTY 타입은 클라이언트에서 제외합니다.
            </Text>

            <Button
              variant="outline"
              alignSelf="flex-start"
              onClick={() => {
                setSelectedType("ALL");
                setSelectedJoinedFilter("ALL");
              }}
            >
              필터 초기화
            </Button>
          </Card.Body>
        </Card.Root>
      </Grid>

      {listError ? (
        <Alert.Root status="error" rounded="xl">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>채팅방 목록 조회 실패</Alert.Title>
            <Alert.Description>{listError}</Alert.Description>
          </Alert.Content>
        </Alert.Root>
      ) : null}

      <Card.Root>
        <Card.Header>
          <Heading size="md">공개 채팅방 목록</Heading>
        </Card.Header>
        <Card.Body gap="4">
          <Box overflowX="auto">
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>채팅방</Table.ColumnHeader>
                  <Table.ColumnHeader>타입</Table.ColumnHeader>
                  <Table.ColumnHeader>참여/멤버</Table.ColumnHeader>
                  <Table.ColumnHeader>마지막 메시지</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="end">상세</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {rooms.map((room) => (
                  <Table.Row key={room.id}>
                    <Table.Cell>
                      <Stack gap="1">
                        <Text fontWeight="semibold">{room.name}</Text>
                        <Text fontSize="xs" color="gray.500" wordBreak="break-all">
                          {room.id}
                        </Text>
                        <Text
                          fontSize="sm"
                          color="gray.600"
                          _dark={{ color: "gray.300" }}
                          lineClamp={2}
                        >
                          {formatText(room.description)}
                        </Text>
                      </Stack>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge colorPalette={roomTypePalette(room.type)}>{room.type}</Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Stack gap="1">
                        <Badge colorPalette={room.joined ? "green" : "gray"}>
                          {room.joined ? "참여 중" : "미참여"}
                        </Badge>
                        <Text fontSize="sm" color="gray.500">
                          멤버 {room.memberCount}명 · 미읽음 {room.unreadCount}
                        </Text>
                      </Stack>
                    </Table.Cell>
                    <Table.Cell>
                      <Stack gap="1">
                        <Text fontSize="sm" lineClamp={2}>
                          {formatLastMessagePreview(room.lastMessage)}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {formatDateTime(room.lastMessageAt)}
                        </Text>
                      </Stack>
                    </Table.Cell>
                    <Table.Cell textAlign="end">
                      <Button size="xs" variant="ghost" onClick={() => handleOpenRoom(room.id)}>
                        상세 보기
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>

          {!rooms.length ? (
            <Text fontSize="sm" color="gray.500">
              현재 조건에 맞는 운영 대상 공개 채팅방이 없습니다.
            </Text>
          ) : null}
        </Card.Body>
      </Card.Root>

      <Alert.Root status="info" rounded="xl">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>남은 백엔드 gap</Alert.Title>
          <Alert.Description>
            관리자 전용 목록 API, 멤버 목록 조회, 강제 퇴장, 시스템 메시지 발송은 아직 없어
            placeholder로 남겨둡니다.
          </Alert.Description>
        </Alert.Content>
      </Alert.Root>

      <Dialog.Root
        lazyMount
        open={isRoomDialogOpen}
        onOpenChange={(details) => setIsRoomDialogOpen(details.open)}
      >
        <Dialog.Backdrop />
        <Dialog.Positioner px={{ base: "4", md: "6" }}>
          <Dialog.Content maxW="5xl" maxH="86vh">
            <Dialog.Header>
              <Stack gap="1">
                <Dialog.Title>{dialogRoomLabel}</Dialog.Title>
                <Text fontSize="sm" color="gray.500">
                  공개 채팅방 상세, 참여 상태, 메시지 이력, 관리자 삭제
                </Text>
              </Stack>
            </Dialog.Header>
            <Dialog.CloseTrigger />
            <Dialog.Body overflowY="auto" pb="6">
              <Stack gap="5">
                <Card.Root>
                  <Card.Header>
                    <HStack justify="space-between" align="start" flexWrap="wrap">
                      <Heading size="md">채팅방 상세</Heading>
                      {selectedRoomDetail ? (
                        <HStack>
                          <Badge colorPalette={roomTypePalette(selectedRoomDetail.type)}>
                            {selectedRoomDetail.type}
                          </Badge>
                          <Badge colorPalette={selectedRoomDetail.joined ? "green" : "gray"}>
                            {selectedRoomDetail.joined ? "참여 중" : "미참여"}
                          </Badge>
                        </HStack>
                      ) : null}
                    </HStack>
                  </Card.Header>
                  <Card.Body gap="4">
                    {detailLoading ? (
                      <Text fontSize="sm" color="gray.500">
                        채팅방 상세를 불러오는 중입니다.
                      </Text>
                    ) : detailError ? (
                      <Alert.Root status="error" rounded="xl">
                        <Alert.Indicator />
                        <Alert.Content>
                          <Alert.Title>상세 조회 실패</Alert.Title>
                          <Alert.Description>{detailError}</Alert.Description>
                        </Alert.Content>
                      </Alert.Root>
                    ) : !selectedRoomDetail ? (
                      <Text fontSize="sm" color="gray.500">
                        채팅방을 선택하면 상세 정보가 표시됩니다.
                      </Text>
                    ) : (
                      <>
                        <Grid
                          templateColumns={{ base: "1fr", md: "repeat(2, minmax(0, 1fr))" }}
                          gap="4"
                        >
                          <Field.Root>
                            <Field.Label>채팅방 이름</Field.Label>
                            <Text>{selectedRoomDetail.name}</Text>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>채팅방 ID</Field.Label>
                            <Text wordBreak="break-all">{selectedRoomDetail.id}</Text>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>공개 여부</Field.Label>
                            <Badge colorPalette={selectedRoomDetail.isPublic ? "green" : "red"}>
                              {selectedRoomDetail.isPublic ? "공개" : "비공개"}
                            </Badge>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>멤버 수</Field.Label>
                            <Text>{selectedRoomDetail.memberCount}</Text>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>미읽음 메시지</Field.Label>
                            <Text>{selectedRoomDetail.unreadCount}</Text>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>음소거</Field.Label>
                            <Badge colorPalette={selectedRoomDetail.isMuted ? "orange" : "green"}>
                              {selectedRoomDetail.isMuted ? "ON" : "OFF"}
                            </Badge>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>마지막 메시지 시각</Field.Label>
                            <Text>{formatDateTime(selectedRoomDetail.lastMessageAt)}</Text>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>lastReadAt</Field.Label>
                            <Text>{formatDateTime(selectedRoomDetail.lastReadAt)}</Text>
                          </Field.Root>
                        </Grid>

                        <Field.Root>
                          <Field.Label>설명</Field.Label>
                          <Text whiteSpace="pre-wrap">{formatText(selectedRoomDetail.description)}</Text>
                        </Field.Root>

                        <Field.Root>
                          <Field.Label>마지막 메시지</Field.Label>
                          {selectedRoomDetail.lastMessage ? (
                            <Stack gap="2" rounded="lg" borderWidth="1px" p="3">
                              <HStack justify="space-between" align="start" flexWrap="wrap">
                                <Badge colorPalette={messageTypePalette(selectedRoomDetail.lastMessage.type as ChatMessage["type"])}>
                                  {selectedRoomDetail.lastMessage.type}
                                </Badge>
                                <Text fontSize="xs" color="gray.500">
                                  {formatDateTime(selectedRoomDetail.lastMessage.createdAt)}
                                </Text>
                              </HStack>
                              <Text fontSize="sm" color="gray.600" _dark={{ color: "gray.300" }}>
                                {formatLastMessagePreview(selectedRoomDetail.lastMessage)}
                              </Text>
                              <Text fontSize="xs" color="gray.500">
                                sender: {formatText(selectedRoomDetail.lastMessage.senderName)}
                              </Text>
                            </Stack>
                          ) : (
                            <Text fontSize="sm" color="gray.500">
                              마지막 메시지가 없습니다.
                            </Text>
                          )}
                        </Field.Root>

                        <HStack flexWrap="wrap">
                          <Button
                            colorPalette={selectedRoomDetail.joined ? "orange" : "teal"}
                            loading={roomActionPending}
                            onClick={
                              selectedRoomDetail.joined ? handleLeaveRoom : handleJoinRoom
                            }
                          >
                            {selectedRoomDetail.joined ? "채팅방 나가기" : "채팅방 참여"}
                          </Button>
                          <Button
                            variant="outline"
                            colorPalette="red"
                            loading={roomActionPending}
                            onClick={handleDeleteRoom}
                          >
                            관리자 삭제
                          </Button>
                          <Button
                            variant="ghost"
                            disabled={!selectedRoomDetail.joined}
                            onClick={() => setMessageRefreshKey((current) => current + 1)}
                          >
                            메시지 새로고침
                          </Button>
                        </HStack>

                        {roomActionSuccess ? (
                          <Alert.Root status="success" rounded="xl">
                            <Alert.Indicator />
                            <Alert.Content>
                              <Alert.Title>완료</Alert.Title>
                              <Alert.Description>{roomActionSuccess}</Alert.Description>
                            </Alert.Content>
                          </Alert.Root>
                        ) : null}

                        {roomActionError ? (
                          <Alert.Root status="error" rounded="xl">
                            <Alert.Indicator />
                            <Alert.Content>
                              <Alert.Title>작업 실패</Alert.Title>
                              <Alert.Description>{roomActionError}</Alert.Description>
                            </Alert.Content>
                          </Alert.Root>
                        ) : null}
                      </>
                    )}
                  </Card.Body>
                </Card.Root>

                <Card.Root>
                  <Card.Header>
                    <Heading size="md">메시지 이력</Heading>
                  </Card.Header>
                  <Card.Body gap="4">
                    {!selectedRoomDetail ? (
                      <Text fontSize="sm" color="gray.500">
                        채팅방 상세를 먼저 불러오세요.
                      </Text>
                    ) : !selectedRoomDetail.joined ? (
                      <Alert.Root status="warning" rounded="xl">
                        <Alert.Indicator />
                        <Alert.Content>
                          <Alert.Title>메시지 조회 전 참여 필요</Alert.Title>
                          <Alert.Description>
                            공개 채팅방도 joined=true 상태여야
                            `GET /v1/chat-rooms/{'{chatRoomId}'}/messages`를 호출할 수
                            있습니다.
                          </Alert.Description>
                        </Alert.Content>
                      </Alert.Root>
                    ) : messagesLoading ? (
                      <Text fontSize="sm" color="gray.500">
                        채팅 메시지를 불러오는 중입니다.
                      </Text>
                    ) : messagesError ? (
                      <Alert.Root status="error" rounded="xl">
                        <Alert.Indicator />
                        <Alert.Content>
                          <Alert.Title>메시지 조회 실패</Alert.Title>
                          <Alert.Description>{messagesError}</Alert.Description>
                        </Alert.Content>
                      </Alert.Root>
                    ) : (
                      <>
                        <Stack gap="3">
                          {messages.length ? (
                            messages.map((message) => (
                              <Stack key={message.id} gap="3" rounded="lg" borderWidth="1px" p="4">
                                <HStack justify="space-between" align="start" flexWrap="wrap">
                                  <Stack gap="1">
                                    <HStack>
                                      <Text fontWeight="semibold">{formatText(message.senderName)}</Text>
                                      <Badge colorPalette={messageTypePalette(message.type)}>
                                        {message.type}
                                      </Badge>
                                    </HStack>
                                    <Text fontSize="xs" color="gray.500" wordBreak="break-all">
                                      senderId: {message.senderId}
                                    </Text>
                                  </Stack>
                                  <Text fontSize="xs" color="gray.500">
                                    {formatDateTime(message.createdAt)}
                                  </Text>
                                </HStack>
                                {renderMessageContent(message)}
                              </Stack>
                            ))
                          ) : (
                            <Text fontSize="sm" color="gray.500">
                              표시할 메시지가 없습니다.
                            </Text>
                          )}
                        </Stack>

                        {messagesHasNext ? (
                          <Button
                            variant="outline"
                            alignSelf="flex-start"
                            loading={loadingMoreMessages}
                            onClick={handleLoadMoreMessages}
                          >
                            이전 메시지 더 불러오기
                          </Button>
                        ) : null}
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
