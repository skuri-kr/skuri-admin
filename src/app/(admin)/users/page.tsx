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
} from "@chakra-ui/react";
import { PageLoadingState } from "@/components/admin/page-status";
import type {
  AdminMemberActivity,
  AdminMemberDetail,
  AdminMemberNotificationSetting,
  AdminMemberRecentComment,
  AdminMemberRecentInquiry,
  AdminMemberRecentParty,
  AdminMemberRecentPost,
  AdminMemberRecentReport,
  AdminMemberStatus,
  AdminMemberSummary,
  ApiResponse,
  PageResponse,
} from "@/features/admin/types";
import { useAuth } from "@/features/auth/auth-context";
import { getAuthorizedJson } from "@/lib/api/authenticated-client";
import { ApiError } from "@/lib/api/http";
import { getApiBaseUrl } from "@/lib/env/public-env";
import { formatDate, formatDateTime } from "@/lib/format/date";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { FiArrowDown, FiArrowUp } from "react-icons/fi";

const statusOptions = ["ALL", "ACTIVE", "WITHDRAWN"] as const;
const adminFilterOptions = ["ALL", "ADMIN", "MEMBER"] as const;
const pageSizeOptions = ["20", "50", "100"] as const;
type MemberSortField =
  | "id"
  | "realname"
  | "email"
  | "nickname"
  | "department"
  | "studentId"
  | "joinedAt"
  | "lastLogin"
  | "lastLoginOs"
  | "currentAppVersion";
type MemberSortDirection = "ASC" | "DESC";

function memberStatusPalette(status: AdminMemberStatus) {
  switch (status) {
    case "ACTIVE":
      return "green";
    case "WITHDRAWN":
      return "red";
  }
}

function adminRolePalette(isAdmin: boolean) {
  return isAdmin ? "teal" : "gray";
}

function formatText(value: string | null | undefined) {
  return value && value.trim().length ? value : "-";
}

function formatOsLabel(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  switch (value.toLowerCase()) {
    case "ios":
      return "iOS";
    case "android":
      return "Android";
    default:
      return value;
  }
}

function booleanBadge(value: boolean) {
  return (
    <Badge colorPalette={value ? "green" : "gray"} variant="subtle">
      {value ? "ON" : "OFF"}
    </Badge>
  );
}

function listItemText(value: string | null | undefined) {
  return value && value.trim().length ? value : "기록 없음";
}

function detailToSummary(
  detail: AdminMemberDetail,
  previousSummary: AdminMemberSummary | null,
): AdminMemberSummary {
  return {
    id: detail.id,
    email: detail.email,
    nickname: detail.nickname,
    realname: detail.realname,
    studentId: detail.studentId,
    department: detail.department,
    isAdmin: detail.isAdmin,
    joinedAt: detail.joinedAt,
    lastLogin: detail.lastLogin,
    lastLoginOs: previousSummary?.lastLoginOs ?? null,
    currentAppVersion: previousSummary?.currentAppVersion ?? null,
    status: detail.status,
  };
}

function recentStatusPalette(status: string) {
  switch (status) {
    case "OPEN":
    case "ACTIVE":
    case "PENDING":
    case "REVIEWING":
      return "blue";
    case "RESOLVED":
    case "ACTIONED":
    case "ARRIVED":
    case "ENDED":
      return "green";
    case "WITHDRAWN":
    case "REJECTED":
    case "CLOSED":
      return "red";
    default:
      return "gray";
  }
}

function partyRolePalette(role: AdminMemberRecentParty["role"]) {
  return role === "LEADER" ? "teal" : "orange";
}

function renderRecentPost(item: AdminMemberRecentPost) {
  return (
    <Stack key={item.id} gap="1" rounded="lg" borderWidth="1px" p="3">
      <HStack justify="space-between" align="start">
        <Text fontWeight="semibold" lineClamp={1}>
          {listItemText(item.title)}
        </Text>
        <Badge colorPalette="purple">{item.category}</Badge>
      </HStack>
      <Text fontSize="xs" color="gray.500">
        {formatDateTime(item.createdAt)}
      </Text>
    </Stack>
  );
}

function renderRecentComment(item: AdminMemberRecentComment) {
  return (
    <Stack key={item.id} gap="1" rounded="lg" borderWidth="1px" p="3">
      <Text fontWeight="semibold" lineClamp={1}>
        {listItemText(item.postTitle)}
      </Text>
      <Text fontSize="sm" color="gray.600" _dark={{ color: "gray.300" }} lineClamp={2}>
        {listItemText(item.contentPreview)}
      </Text>
      <HStack justify="space-between" align="start">
        <Text fontSize="xs" color="gray.500">
          postId: {item.postId}
        </Text>
        <Text fontSize="xs" color="gray.500">
          {formatDateTime(item.createdAt)}
        </Text>
      </HStack>
    </Stack>
  );
}

function renderRecentParty(item: AdminMemberRecentParty) {
  return (
    <Stack key={`${item.role}-${item.id}`} gap="1" rounded="lg" borderWidth="1px" p="3">
      <HStack justify="space-between" align="start">
        <Text fontWeight="semibold" lineClamp={1}>
          {listItemText(item.routeSummary)}
        </Text>
        <HStack>
          <Badge colorPalette={partyRolePalette(item.role)}>{item.role}</Badge>
          <Badge colorPalette={recentStatusPalette(item.status)}>{item.status}</Badge>
        </HStack>
      </HStack>
      <Text fontSize="sm" color="gray.600" _dark={{ color: "gray.300" }}>
        출발 {formatDateTime(item.departureTime)}
      </Text>
      <Text fontSize="xs" color="gray.500">
        생성 {formatDateTime(item.createdAt)}
      </Text>
    </Stack>
  );
}

function renderRecentInquiry(item: AdminMemberRecentInquiry) {
  return (
    <Stack key={item.id} gap="1" rounded="lg" borderWidth="1px" p="3">
      <HStack justify="space-between" align="start">
        <Text fontWeight="semibold" lineClamp={1}>
          {listItemText(item.subject)}
        </Text>
        <Badge colorPalette={recentStatusPalette(item.status)}>{item.status}</Badge>
      </HStack>
      <Text fontSize="sm" color="gray.600" _dark={{ color: "gray.300" }}>
        {item.type}
      </Text>
      <Text fontSize="xs" color="gray.500">
        {formatDateTime(item.createdAt)}
      </Text>
    </Stack>
  );
}

function renderRecentReport(item: AdminMemberRecentReport) {
  return (
    <Stack key={item.id} gap="1" rounded="lg" borderWidth="1px" p="3">
      <HStack justify="space-between" align="start">
        <Text fontWeight="semibold" lineClamp={1}>
          {item.targetType} / {item.category}
        </Text>
        <Badge colorPalette={recentStatusPalette(item.status)}>{item.status}</Badge>
      </HStack>
      <Text fontSize="sm" color="gray.600" _dark={{ color: "gray.300" }} lineClamp={1}>
        targetId: {item.targetId}
      </Text>
      <Text fontSize="xs" color="gray.500">
        {formatDateTime(item.createdAt)}
      </Text>
    </Stack>
  );
}

export default function UsersPage() {
  const { user, memberProfile, isAdminVerified } = useAuth();
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [selectedStatus, setSelectedStatus] =
    useState<(typeof statusOptions)[number]>("ALL");
  const [selectedAdminFilter, setSelectedAdminFilter] =
    useState<(typeof adminFilterOptions)[number]>("ALL");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState<(typeof pageSizeOptions)[number]>("20");
  const [sortField, setSortField] = useState<MemberSortField>("joinedAt");
  const [sortDirection, setSortDirection] = useState<MemberSortDirection>("DESC");
  const [refreshKey, setRefreshKey] = useState(0);
  const [pageData, setPageData] = useState<PageResponse<AdminMemberSummary> | null>(
    null,
  );
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedMemberDetail, setSelectedMemberDetail] =
    useState<AdminMemberDetail | null>(null);
  const [selectedMemberActivity, setSelectedMemberActivity] =
    useState<AdminMemberActivity | null>(null);
  const [draftIsAdmin, setDraftIsAdmin] = useState<"true" | "false">("false");
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isSavePending, startSaveTransition] = useTransition();
  const previousSelectedMemberIdRef = useRef<string | null>(null);

  useEffect(() => {
    setCurrentPage(0);
  }, [department, pageSize, query, selectedAdminFilter, selectedStatus, sortDirection, sortField]);

  useEffect(() => {
    if (!user || !isAdminVerified) {
      return;
    }

    const controller = new AbortController();

    const loadMembers = async () => {
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
        if (department.trim()) {
          params.set("department", department.trim());
        }
        if (selectedStatus !== "ALL") {
          params.set("status", selectedStatus);
        }
        if (selectedAdminFilter !== "ALL") {
          params.set("isAdmin", selectedAdminFilter === "ADMIN" ? "true" : "false");
        }
        params.set("sortBy", sortField);
        params.set("sortDirection", sortDirection);

        const response = await getAuthorizedJson<
          ApiResponse<PageResponse<AdminMemberSummary>>
        >(user, `${getApiBaseUrl()}/v1/admin/members?${params.toString()}`, {
          signal: controller.signal,
        });

        setPageData(response.data);
      } catch (caughtError) {
        if (!controller.signal.aborted) {
          setListError(
            caughtError instanceof ApiError
              ? caughtError.message
              : "회원 목록을 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setListLoading(false);
        }
      }
    };

    void loadMembers();

    return () => controller.abort();
  }, [
    currentPage,
    department,
    isAdminVerified,
    pageSize,
    query,
    refreshKey,
    selectedAdminFilter,
    selectedStatus,
    sortDirection,
    sortField,
    user,
  ]);

  const members = useMemo(() => pageData?.content ?? [], [pageData]);

  useEffect(() => {
    if (!members.length) {
      setSelectedMemberId(null);
      setSelectedMemberDetail(null);
      setSelectedMemberActivity(null);
      return;
    }

    setSelectedMemberId((current) =>
      current && members.some((member) => member.id === current)
        ? current
        : null,
    );
  }, [members]);

  useEffect(() => {
    if (!user || !isAdminVerified || !selectedMemberId || !isMemberDialogOpen) {
      setSelectedMemberDetail(null);
      setSelectedMemberActivity(null);
      setDetailLoading(false);
      setActivityLoading(false);
      setDetailError(null);
      setActivityError(null);
      return;
    }

    const controller = new AbortController();

    const loadDetail = async () => {
      setDetailLoading(true);
      setDetailError(null);

      try {
        const response = await getAuthorizedJson<ApiResponse<AdminMemberDetail>>(
          user,
          `${getApiBaseUrl()}/v1/admin/members/${selectedMemberId}`,
          {
            signal: controller.signal,
          },
        );

        setSelectedMemberDetail(response.data);
      } catch (caughtError) {
        if (!controller.signal.aborted) {
          setDetailError(
            caughtError instanceof ApiError
              ? caughtError.message
              : "회원 상세를 불러오지 못했습니다.",
          );
          setSelectedMemberDetail(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setDetailLoading(false);
        }
      }
    };

    void loadDetail();

    return () => controller.abort();
  }, [isAdminVerified, isMemberDialogOpen, selectedMemberId, user]);

  useEffect(() => {
    if (!user || !isAdminVerified || !selectedMemberDetail || !isMemberDialogOpen) {
      setSelectedMemberActivity(null);
      setActivityLoading(false);
      setActivityError(null);
      return;
    }

    if (selectedMemberDetail.status === "WITHDRAWN") {
      setSelectedMemberActivity(null);
      setActivityLoading(false);
      setActivityError("탈퇴한 회원의 활동 요약은 조회할 수 없습니다.");
      return;
    }

    const controller = new AbortController();

    const loadActivity = async () => {
      setActivityLoading(true);
      setActivityError(null);

      try {
        const response = await getAuthorizedJson<ApiResponse<AdminMemberActivity>>(
          user,
          `${getApiBaseUrl()}/v1/admin/members/${selectedMemberDetail.id}/activity`,
          {
            signal: controller.signal,
          },
        );

        setSelectedMemberActivity(response.data);
      } catch (caughtError) {
        if (!controller.signal.aborted) {
          setSelectedMemberActivity(null);
          setActivityError(
            caughtError instanceof ApiError
              ? caughtError.message
              : "회원 활동 요약을 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setActivityLoading(false);
        }
      }
    };

    void loadActivity();

    return () => controller.abort();
  }, [isAdminVerified, isMemberDialogOpen, selectedMemberDetail, user]);

  useEffect(() => {
    const nextSelectedMemberId = selectedMemberDetail?.id ?? null;

    if (previousSelectedMemberIdRef.current === nextSelectedMemberId) {
      return;
    }

    previousSelectedMemberIdRef.current = nextSelectedMemberId;

    if (!selectedMemberDetail) {
      setDraftIsAdmin("false");
      setSaveError(null);
      setSaveSuccess(null);
      return;
    }

    setDraftIsAdmin(selectedMemberDetail.isAdmin ? "true" : "false");
    setSaveError(null);
    setSaveSuccess(null);
  }, [selectedMemberDetail]);

  const selectedMemberSummary = useMemo(
    () => members.find((member) => member.id === selectedMemberId) ?? null,
    [members, selectedMemberId],
  );
  const dialogMemberLabel =
    selectedMemberDetail?.nickname ??
    selectedMemberDetail?.realname ??
    selectedMemberSummary?.nickname ??
    selectedMemberSummary?.realname ??
    selectedMemberSummary?.email ??
    "회원 상세";

  const notificationRows = useMemo(() => {
    if (!selectedMemberDetail) {
      return [];
    }

    const settings: AdminMemberNotificationSetting =
      selectedMemberDetail.notificationSetting;

    return [
      ["전체 알림", settings.allNotifications],
      ["파티", settings.partyNotifications],
      ["공지", settings.noticeNotifications],
      ["게시글 좋아요", settings.boardLikeNotifications],
      ["댓글", settings.commentNotifications],
      ["북마크 게시글 댓글", settings.bookmarkedPostCommentNotifications],
      ["시스템", settings.systemNotifications],
      ["학사 일정", settings.academicScheduleNotifications],
      ["학사 일정 전날", settings.academicScheduleDayBeforeEnabled],
      ["학사 일정 전체 이벤트", settings.academicScheduleAllEventsEnabled],
    ] as const;
  }, [selectedMemberDetail]);

  const noticeNotificationEntries = useMemo(() => {
    if (!selectedMemberDetail) {
      return [];
    }

    return Object.entries(
      selectedMemberDetail.notificationSetting.noticeNotificationsDetail ?? {},
    );
  }, [selectedMemberDetail]);

  const selfRoleChangeBlocked =
    selectedMemberDetail?.id != null &&
    memberProfile?.id != null &&
    selectedMemberDetail.id === memberProfile.id;
  const withdrawnRoleChangeBlocked = selectedMemberDetail?.status === "WITHDRAWN";
  const requestedIsAdmin = draftIsAdmin === "true";
  const hasPendingRoleChange = Boolean(
    selectedMemberDetail && requestedIsAdmin !== selectedMemberDetail.isAdmin,
  );

  const handleSaveAdminRole = () => {
    if (!user || !selectedMemberDetail) {
      return;
    }

    if (selfRoleChangeBlocked) {
      setSaveError("자기 자신의 관리자 권한은 변경할 수 없습니다.");
      return;
    }

    if (withdrawnRoleChangeBlocked) {
      setSaveError("탈퇴 회원의 관리자 권한은 변경할 수 없습니다.");
      return;
    }

    startSaveTransition(() => {
      void (async () => {
        setSaveError(null);
        setSaveSuccess(null);

        try {
          const response = await getAuthorizedJson<ApiResponse<AdminMemberDetail>>(
            user,
            `${getApiBaseUrl()}/v1/admin/members/${selectedMemberDetail.id}/admin-role`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                isAdmin: requestedIsAdmin,
              }),
            },
          );

          setSelectedMemberDetail(response.data);
          setDraftIsAdmin(response.data.isAdmin ? "true" : "false");
          setPageData((current) => {
            if (!current) {
              return current;
            }

            return {
              ...current,
              content: current.content.map((member) =>
                member.id === response.data.id
                  ? detailToSummary(response.data, member)
                  : member,
              ),
            };
          });
          setRefreshKey((current) => current + 1);
          setSaveSuccess("관리자 권한을 저장했습니다.");
        } catch (caughtError) {
          if (caughtError instanceof ApiError) {
            setSaveError(caughtError.message);
          } else {
            setSaveError("관리자 권한을 저장하지 못했습니다.");
          }
        }
      })();
    });
  };

  if (listLoading && !pageData) {
    return <PageLoadingState label="회원 목록을 불러오는 중입니다." />;
  }

  const handleSort = (field: MemberSortField) => {
    if (field === sortField) {
      setSortDirection((current) => (current === "ASC" ? "DESC" : "ASC"));
      return;
    }

    setSortField(field);
    setSortDirection("ASC");
  };

  const renderSortIndicator = (field: MemberSortField) => {
    if (sortField !== field) {
      return null;
    }

    return sortDirection === "ASC" ? <FiArrowUp size={14} /> : <FiArrowDown size={14} />;
  };

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
          Members
        </Text>
        <Heading size="2xl">사용자 관리</Heading>
        <Text color="gray.600" _dark={{ color: "gray.300" }}>
          회원 목록은 기존 콘솔 기준 칼럼과 서버 정렬을 사용합니다. 상세 조회,
          활동 요약, 관리자 권한 변경까지는 현재 Spring Admin API에 맞춰 운영할
          수 있습니다. 상태 변경만 follow-up API를 기다리는 중입니다.
        </Text>
      </Stack>

      <Grid
        templateColumns={{ base: "1fr", md: "repeat(3, minmax(0, 1fr))" }}
        gap="4"
      >
        <Card.Root>
          <Card.Body gap="1">
            <Text fontSize="sm" color="gray.500">
              전체 회원
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
              현재 페이지 관리자 수
            </Text>
            <Heading size="xl">
              {members.filter((member) => member.isAdmin).length}
            </Heading>
            <Text fontSize="sm" color="gray.500">
              탈퇴 회원 {members.filter((member) => member.status === "WITHDRAWN").length}
            </Text>
          </Card.Body>
        </Card.Root>
        <Card.Root>
          <Card.Body gap="1">
            <Text fontSize="sm" color="gray.500">
              상세 조회 방식
            </Text>
            <Heading size="md">
              목록에서 회원 선택
            </Heading>
            <Text fontSize="sm" color="gray.500">
              행을 클릭하면 상세, 활동 요약, 관리자 권한, 계좌 정보, 알림 설정을 modal에서 확인합니다.
            </Text>
          </Card.Body>
        </Card.Root>
      </Grid>

      <Card.Root>
        <Card.Body>
          <Grid
            templateColumns={{ base: "1fr", md: "repeat(5, minmax(0, 1fr))" }}
            gap="4"
          >
            <Field.Root>
              <Field.Label>검색</Field.Label>
              <Input
                value={query}
                placeholder="이메일, 닉네임, 실명, 학번"
                onChange={(event) => setQuery(event.target.value)}
              />
            </Field.Root>

            <Field.Root>
              <Field.Label>학과</Field.Label>
              <Input
                value={department}
                placeholder="예: 컴퓨터공학과"
                onChange={(event) => setDepartment(event.target.value)}
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
              <Field.Label>권한</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field
                  value={selectedAdminFilter}
                  onChange={(event) =>
                    setSelectedAdminFilter(
                      event.target.value as (typeof adminFilterOptions)[number],
                    )
                  }
                >
                  {adminFilterOptions.map((adminFilter) => (
                    <option key={adminFilter} value={adminFilter}>
                      {adminFilter === "ALL"
                        ? "전체"
                        : adminFilter === "ADMIN"
                          ? "관리자"
                          : "일반 회원"}
                    </option>
                  ))}
                </NativeSelect.Field>
              </NativeSelect.Root>
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
              학과 필터는 canonical 학과명을 기준으로 검증됩니다. 표 헤더를 클릭하면 서버 정렬이 적용됩니다.
            </Text>
            <HStack>
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("");
                  setDepartment("");
                  setSelectedStatus("ALL");
                  setSelectedAdminFilter("ALL");
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
            <Alert.Title>회원 목록 조회 실패</Alert.Title>
            <Alert.Description>{listError}</Alert.Description>
          </Alert.Content>
        </Alert.Root>
      ) : null}

      <Card.Root>
        <Card.Header>
          <Heading size="md">회원 목록</Heading>
        </Card.Header>
        <Card.Body gap="4">
          <Box overflowX="auto">
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader cursor="pointer" onClick={() => handleSort("id")} userSelect="none">
                    <HStack gap="1">
                      <Text>UID</Text>
                      {renderSortIndicator("id")}
                    </HStack>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader cursor="pointer" onClick={() => handleSort("realname")} userSelect="none">
                    <HStack gap="1">
                      <Text>이름</Text>
                      {renderSortIndicator("realname")}
                    </HStack>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader cursor="pointer" onClick={() => handleSort("email")} userSelect="none">
                    <HStack gap="1">
                      <Text>이메일</Text>
                      {renderSortIndicator("email")}
                    </HStack>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader cursor="pointer" onClick={() => handleSort("nickname")} userSelect="none">
                    <HStack gap="1">
                      <Text>닉네임</Text>
                      {renderSortIndicator("nickname")}
                    </HStack>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader cursor="pointer" onClick={() => handleSort("department")} userSelect="none">
                    <HStack gap="1">
                      <Text>학과</Text>
                      {renderSortIndicator("department")}
                    </HStack>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader cursor="pointer" onClick={() => handleSort("studentId")} userSelect="none">
                    <HStack gap="1">
                      <Text>학번</Text>
                      {renderSortIndicator("studentId")}
                    </HStack>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader cursor="pointer" onClick={() => handleSort("joinedAt")} userSelect="none">
                    <HStack gap="1">
                      <Text>가입일</Text>
                      {renderSortIndicator("joinedAt")}
                    </HStack>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader cursor="pointer" onClick={() => handleSort("lastLogin")} userSelect="none">
                    <HStack gap="1">
                      <Text>최근로그인</Text>
                      {renderSortIndicator("lastLogin")}
                    </HStack>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader cursor="pointer" onClick={() => handleSort("lastLoginOs")} userSelect="none">
                    <HStack gap="1">
                      <Text>OS</Text>
                      {renderSortIndicator("lastLoginOs")}
                    </HStack>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader cursor="pointer" onClick={() => handleSort("currentAppVersion")} userSelect="none">
                    <HStack gap="1">
                      <Text>앱버전</Text>
                      {renderSortIndicator("currentAppVersion")}
                    </HStack>
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {members.map((member) => {
                  const active = member.id === selectedMemberId;
                  const osLabel = formatOsLabel(member.lastLoginOs);
                  return (
                    <Table.Row
                      key={member.id}
                      bg={active ? "teal.50" : undefined}
                      _dark={{ bg: active ? "whiteAlpha.100" : undefined }}
                      _hover={{ bg: "blackAlpha.50", _dark: { bg: "whiteAlpha.100" } }}
                      cursor="pointer"
                      onClick={() => {
                        setSelectedMemberId(member.id);
                        setIsMemberDialogOpen(true);
                      }}
                    >
                      <Table.Cell>
                        <Text fontSize="xs" fontFamily="mono" wordBreak="break-all">
                          {member.id}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text>{formatText(member.realname)}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontSize="sm" wordBreak="break-all">
                          {member.email}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text>{formatText(member.nickname)}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text>{formatText(member.department)}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text>{formatText(member.studentId)}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text>{formatDate(member.joinedAt)}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontSize="sm" color="gray.500">
                          {formatDateTime(member.lastLogin)}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        {osLabel ? (
                          <Badge
                            colorPalette={member.lastLoginOs?.toLowerCase() === "ios" ? "purple" : "green"}
                            variant="subtle"
                          >
                            {osLabel}
                          </Badge>
                        ) : (
                          <Text color="gray.500">-</Text>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <Text>{formatText(member.currentAppVersion)}</Text>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Root>
          </Box>

          {!members.length ? (
            <Text fontSize="sm" color="gray.500">
              현재 조건에 맞는 회원이 없습니다.
            </Text>
          ) : null}
        </Card.Body>
      </Card.Root>

      <Alert.Root status="info" rounded="xl">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>남은 백엔드 gap</Alert.Title>
          <Alert.Description>
            사용자 관리에서는 상태 변경 API만 아직 없어 placeholder로 남겨두고 있습니다.
          </Alert.Description>
        </Alert.Content>
      </Alert.Root>

      <Dialog.Root
        lazyMount
        open={isMemberDialogOpen}
        onOpenChange={(details) => setIsMemberDialogOpen(details.open)}
      >
        <Dialog.Backdrop />
        <Dialog.Positioner px={{ base: "4", md: "6" }}>
          <Dialog.Content maxW="5xl" maxH="85vh">
            <Dialog.Header>
              <Stack gap="1">
                <Dialog.Title>{dialogMemberLabel}</Dialog.Title>
                <Text fontSize="sm" color="gray.500">
                  회원 상세, 활동 요약, 관리자 권한, 계좌 정보, 알림 설정
                </Text>
              </Stack>
            </Dialog.Header>
            <Dialog.CloseTrigger />
            <Dialog.Body overflowY="auto" pb="6">
              <Stack gap="5">
                <Card.Root>
                  <Card.Header>
                    <Heading size="md">회원 상세</Heading>
                  </Card.Header>
                  <Card.Body gap="4">
                    {detailLoading ? (
                      <Text fontSize="sm" color="gray.500">
                        회원 상세를 불러오는 중입니다.
                      </Text>
                    ) : detailError ? (
                      <Alert.Root status="error" rounded="xl">
                        <Alert.Indicator />
                        <Alert.Content>
                          <Alert.Title>회원 상세 조회 실패</Alert.Title>
                          <Alert.Description>{detailError}</Alert.Description>
                        </Alert.Content>
                      </Alert.Root>
                    ) : !selectedMemberDetail ? (
                      <Text fontSize="sm" color="gray.500">
                        회원을 선택하면 상세 정보가 표시됩니다.
                      </Text>
                    ) : (
                      <Stack gap="4">
                        <Grid
                          templateColumns={{ base: "1fr", md: "repeat(2, minmax(0, 1fr))" }}
                          gap="4"
                        >
                          <Field.Root>
                            <Field.Label>이메일</Field.Label>
                            <Text wordBreak="break-all">{selectedMemberDetail.email}</Text>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>회원 ID</Field.Label>
                            <Text wordBreak="break-all">{selectedMemberDetail.id}</Text>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>닉네임</Field.Label>
                            <Text>{formatText(selectedMemberDetail.nickname)}</Text>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>실명</Field.Label>
                            <Text>{formatText(selectedMemberDetail.realname)}</Text>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>학번</Field.Label>
                            <Text>{formatText(selectedMemberDetail.studentId)}</Text>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>학과</Field.Label>
                            <Text>{formatText(selectedMemberDetail.department)}</Text>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>가입일</Field.Label>
                            <Text>{formatDateTime(selectedMemberDetail.joinedAt)}</Text>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>마지막 로그인</Field.Label>
                            <Text>{formatDateTime(selectedMemberDetail.lastLogin)}</Text>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>최근 로그인 OS</Field.Label>
                            <Text>{formatText(selectedMemberSummary?.lastLoginOs)}</Text>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>최근 앱버전</Field.Label>
                            <Text>{formatText(selectedMemberSummary?.currentAppVersion)}</Text>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>회원 상태</Field.Label>
                            <Badge colorPalette={memberStatusPalette(selectedMemberDetail.status)}>
                              {selectedMemberDetail.status}
                            </Badge>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>현재 권한</Field.Label>
                            <Badge colorPalette={adminRolePalette(selectedMemberDetail.isAdmin)}>
                              {selectedMemberDetail.isAdmin ? "관리자" : "일반"}
                            </Badge>
                          </Field.Root>
                        </Grid>

                        <Field.Root>
                          <Field.Label>프로필 이미지</Field.Label>
                          {selectedMemberDetail.photoUrl ? (
                            <Image
                              src={selectedMemberDetail.photoUrl}
                              alt={`${selectedMemberDetail.realname ?? selectedMemberDetail.nickname ?? selectedMemberDetail.id} 프로필 이미지`}
                              maxW="240px"
                              maxH="240px"
                              rounded="xl"
                              objectFit="cover"
                              borderWidth="1px"
                              borderColor="border.muted"
                            />
                          ) : (
                            <Text color="gray.500">등록된 이미지가 없습니다.</Text>
                          )}
                        </Field.Root>

                        {selectedMemberDetail.withdrawnAt ? (
                          <Field.Root>
                            <Field.Label>탈퇴 시각</Field.Label>
                            <Text>{formatDateTime(selectedMemberDetail.withdrawnAt)}</Text>
                          </Field.Root>
                        ) : null}
                      </Stack>
                    )}
                  </Card.Body>
                </Card.Root>

                <Card.Root>
                  <Card.Header>
                    <HStack justify="space-between" align="start">
                      <Heading size="md">회원 활동 요약</Heading>
                      {selectedMemberActivity ? (
                        <Text fontSize="xs" color="gray.500">
                          생성 {formatDateTime(selectedMemberActivity.generatedAt)}
                        </Text>
                      ) : null}
                    </HStack>
                  </Card.Header>
                  <Card.Body gap="4">
                    {!selectedMemberDetail ? (
                      <Text fontSize="sm" color="gray.500">
                        회원 상세를 선택하세요.
                      </Text>
                    ) : activityLoading ? (
                      <Text fontSize="sm" color="gray.500">
                        활동 요약을 불러오는 중입니다.
                      </Text>
                    ) : activityError ? (
                      <Alert.Root
                        status={selectedMemberDetail.status === "WITHDRAWN" ? "warning" : "error"}
                        rounded="xl"
                      >
                        <Alert.Indicator />
                        <Alert.Content>
                          <Alert.Title>
                            {selectedMemberDetail.status === "WITHDRAWN"
                              ? "활동 요약 비제공"
                              : "활동 요약 조회 실패"}
                          </Alert.Title>
                          <Alert.Description>{activityError}</Alert.Description>
                        </Alert.Content>
                      </Alert.Root>
                    ) : selectedMemberActivity ? (
                      <Stack gap="5">
                        <Grid
                          templateColumns={{
                            base: "repeat(2, minmax(0, 1fr))",
                            md: "repeat(3, minmax(0, 1fr))",
                          }}
                          gap="3"
                        >
                          <Card.Root variant="subtle">
                            <Card.Body gap="1">
                              <Text fontSize="sm" color="gray.500">
                                게시글
                              </Text>
                              <Heading size="lg">{selectedMemberActivity.counts.posts}</Heading>
                            </Card.Body>
                          </Card.Root>
                          <Card.Root variant="subtle">
                            <Card.Body gap="1">
                              <Text fontSize="sm" color="gray.500">
                                댓글
                              </Text>
                              <Heading size="lg">
                                {selectedMemberActivity.counts.comments}
                              </Heading>
                            </Card.Body>
                          </Card.Root>
                          <Card.Root variant="subtle">
                            <Card.Body gap="1">
                              <Text fontSize="sm" color="gray.500">
                                생성 파티
                              </Text>
                              <Heading size="lg">
                                {selectedMemberActivity.counts.partiesCreated}
                              </Heading>
                            </Card.Body>
                          </Card.Root>
                          <Card.Root variant="subtle">
                            <Card.Body gap="1">
                              <Text fontSize="sm" color="gray.500">
                                참여 파티
                              </Text>
                              <Heading size="lg">
                                {selectedMemberActivity.counts.partiesJoined}
                              </Heading>
                            </Card.Body>
                          </Card.Root>
                          <Card.Root variant="subtle">
                            <Card.Body gap="1">
                              <Text fontSize="sm" color="gray.500">
                                문의
                              </Text>
                              <Heading size="lg">
                                {selectedMemberActivity.counts.inquiries}
                              </Heading>
                            </Card.Body>
                          </Card.Root>
                          <Card.Root variant="subtle">
                            <Card.Body gap="1">
                              <Text fontSize="sm" color="gray.500">
                                신고
                              </Text>
                              <Heading size="lg">
                                {selectedMemberActivity.counts.reportsSubmitted}
                              </Heading>
                            </Card.Body>
                          </Card.Root>
                        </Grid>

                        <Grid
                          templateColumns={{ base: "1fr", md: "repeat(2, minmax(0, 1fr))" }}
                          gap="4"
                        >
                          <Field.Root>
                            <Field.Label>최근 게시글</Field.Label>
                            <Stack gap="3">
                              {selectedMemberActivity.recentPosts.length ? (
                                selectedMemberActivity.recentPosts.map(renderRecentPost)
                              ) : (
                                <Text fontSize="sm" color="gray.500">
                                  기록이 없습니다.
                                </Text>
                              )}
                            </Stack>
                          </Field.Root>

                          <Field.Root>
                            <Field.Label>최근 댓글</Field.Label>
                            <Stack gap="3">
                              {selectedMemberActivity.recentComments.length ? (
                                selectedMemberActivity.recentComments.map(renderRecentComment)
                              ) : (
                                <Text fontSize="sm" color="gray.500">
                                  기록이 없습니다.
                                </Text>
                              )}
                            </Stack>
                          </Field.Root>

                          <Field.Root>
                            <Field.Label>최근 파티</Field.Label>
                            <Stack gap="3">
                              {selectedMemberActivity.recentParties.length ? (
                                selectedMemberActivity.recentParties.map(renderRecentParty)
                              ) : (
                                <Text fontSize="sm" color="gray.500">
                                  기록이 없습니다.
                                </Text>
                              )}
                            </Stack>
                          </Field.Root>

                          <Field.Root>
                            <Field.Label>최근 문의</Field.Label>
                            <Stack gap="3">
                              {selectedMemberActivity.recentInquiries.length ? (
                                selectedMemberActivity.recentInquiries.map(renderRecentInquiry)
                              ) : (
                                <Text fontSize="sm" color="gray.500">
                                  기록이 없습니다.
                                </Text>
                              )}
                            </Stack>
                          </Field.Root>
                        </Grid>

                        <Field.Root>
                          <Field.Label>최근 신고</Field.Label>
                          <Stack gap="3">
                            {selectedMemberActivity.recentReports.length ? (
                              selectedMemberActivity.recentReports.map(renderRecentReport)
                            ) : (
                              <Text fontSize="sm" color="gray.500">
                                기록이 없습니다.
                              </Text>
                            )}
                          </Stack>
                        </Field.Root>
                      </Stack>
                    ) : (
                      <Text fontSize="sm" color="gray.500">
                        활동 요약 데이터가 없습니다.
                      </Text>
                    )}
                  </Card.Body>
                </Card.Root>

                <Card.Root>
                  <Card.Header>
                    <Heading size="md">관리자 권한 변경</Heading>
                  </Card.Header>
                  <Card.Body gap="4">
                    {selectedMemberDetail ? (
                      <>
                        <Field.Root>
                          <Field.Label>변경할 권한</Field.Label>
                          <NativeSelect.Root>
                            <NativeSelect.Field
                              value={draftIsAdmin}
                              onChange={(event) =>
                                setDraftIsAdmin(event.target.value as "true" | "false")
                              }
                            >
                              <option value="true">관리자</option>
                              <option value="false">일반 회원</option>
                            </NativeSelect.Field>
                          </NativeSelect.Root>
                        </Field.Root>

                        {selfRoleChangeBlocked ? (
                          <Alert.Root status="warning" rounded="xl">
                            <Alert.Indicator />
                            <Alert.Content>
                              <Alert.Title>자기 계정 보호</Alert.Title>
                              <Alert.Description>
                                자기 자신의 관리자 권한은 변경할 수 없습니다.
                              </Alert.Description>
                            </Alert.Content>
                          </Alert.Root>
                        ) : null}

                        {withdrawnRoleChangeBlocked ? (
                          <Alert.Root status="warning" rounded="xl">
                            <Alert.Indicator />
                            <Alert.Content>
                              <Alert.Title>탈퇴 회원</Alert.Title>
                              <Alert.Description>
                                탈퇴한 회원은 관리자 권한 변경 대상이 아닙니다.
                              </Alert.Description>
                            </Alert.Content>
                          </Alert.Root>
                        ) : null}

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

                        <Button
                          alignSelf="flex-start"
                          colorPalette="teal"
                          disabled={
                            isSavePending ||
                            !hasPendingRoleChange ||
                            selfRoleChangeBlocked ||
                            withdrawnRoleChangeBlocked
                          }
                          loading={isSavePending}
                          onClick={handleSaveAdminRole}
                        >
                          권한 저장
                        </Button>
                      </>
                    ) : (
                      <Text fontSize="sm" color="gray.500">
                        회원을 선택하면 권한 변경 패널이 활성화됩니다.
                      </Text>
                    )}
                  </Card.Body>
                </Card.Root>

                <Grid templateColumns={{ base: "1fr", xl: "repeat(2, minmax(0, 1fr))" }} gap="5">
                  <Card.Root>
                    <Card.Header>
                      <Heading size="md">계좌 정보</Heading>
                    </Card.Header>
                    <Card.Body gap="4">
                      {!selectedMemberDetail ? (
                        <Text fontSize="sm" color="gray.500">
                          회원 상세를 선택하세요.
                        </Text>
                      ) : selectedMemberDetail.bankAccount ? (
                        <Grid
                          templateColumns={{ base: "1fr", md: "repeat(2, minmax(0, 1fr))" }}
                          gap="4"
                        >
                          <Field.Root>
                            <Field.Label>은행명</Field.Label>
                            <Text>{formatText(selectedMemberDetail.bankAccount.bankName)}</Text>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>계좌번호</Field.Label>
                            <Text wordBreak="break-all">
                              {formatText(selectedMemberDetail.bankAccount.accountNumber)}
                            </Text>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>예금주</Field.Label>
                            <Text>
                              {formatText(selectedMemberDetail.bankAccount.accountHolder)}
                            </Text>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>이름 숨김</Field.Label>
                            {booleanBadge(Boolean(selectedMemberDetail.bankAccount.hideName))}
                          </Field.Root>
                        </Grid>
                      ) : (
                        <Text fontSize="sm" color="gray.500">
                          등록된 계좌 정보가 없습니다.
                        </Text>
                      )}
                    </Card.Body>
                  </Card.Root>

                  <Card.Root>
                    <Card.Header>
                      <Heading size="md">알림 설정</Heading>
                    </Card.Header>
                    <Card.Body gap="4">
                      {!selectedMemberDetail ? (
                        <Text fontSize="sm" color="gray.500">
                          회원 상세를 선택하세요.
                        </Text>
                      ) : (
                        <>
                          <Grid
                            templateColumns={{ base: "1fr", md: "repeat(2, minmax(0, 1fr))" }}
                            gap="4"
                          >
                            {notificationRows.map(([label, value]) => (
                              <Field.Root key={label}>
                                <Field.Label>{label}</Field.Label>
                                {booleanBadge(value)}
                              </Field.Root>
                            ))}
                          </Grid>

                          <Field.Root>
                            <Field.Label>공지 상세 알림</Field.Label>
                            {noticeNotificationEntries.length ? (
                              <HStack gap="2" flexWrap="wrap">
                                {noticeNotificationEntries.map(([label, value]) => (
                                  <Badge
                                    key={label}
                                    colorPalette={value ? "green" : "gray"}
                                    variant="subtle"
                                  >
                                    {label}: {value ? "ON" : "OFF"}
                                  </Badge>
                                ))}
                              </HStack>
                            ) : (
                              <Text fontSize="sm" color="gray.500">
                                세부 공지 알림 설정이 없습니다.
                              </Text>
                            )}
                          </Field.Root>
                        </>
                      )}
                    </Card.Body>
                  </Card.Root>
                </Grid>
              </Stack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Stack>
  );
}
