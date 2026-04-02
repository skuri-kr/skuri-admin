"use client";

import { AlertCircle, ShieldAlert } from "lucide-react";
import { MemberDetailDialog } from "@/components/admin/users/member-detail-dialog";
import { MembersFiltersCard } from "@/components/admin/users/filters-card";
import { MembersSummaryGrid } from "@/components/admin/users/summary-grid";
import { MembersTable } from "@/components/admin/users/members-table";
import {
  type MemberAdminFilterOption,
  type MemberListStatusOption,
  type MemberPageSizeOption,
  type MemberSortDirection,
  type MemberSortField,
} from "@/components/admin/users/constants";
import { PageLoadingState } from "@/components/admin/page-status";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  AdminMemberActivity,
  AdminMemberDetail,
  AdminMemberSummary,
  ApiResponse,
  PageResponse,
} from "@/features/admin/types";
import { useAuth } from "@/features/auth/auth-context";
import { getAuthorizedJson } from "@/lib/api/authenticated-client";
import { ApiError } from "@/lib/api/http";
import { getApiBaseUrl } from "@/lib/env/public-env";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

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

export default function UsersPage() {
  const { user, memberProfile, isAdminVerified } = useAuth();
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [selectedStatus, setSelectedStatus] =
    useState<MemberListStatusOption>("ALL");
  const [selectedAdminFilter, setSelectedAdminFilter] =
    useState<MemberAdminFilterOption>("ALL");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState<MemberPageSizeOption>("20");
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

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Members
        </p>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">사용자 관리</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            회원 목록은 기존 콘솔 기준 칼럼과 서버 정렬을 사용합니다. 상세 조회,
            활동 요약, 관리자 권한 변경까지는 현재 Spring Admin API에 맞춰 운영할
            수 있습니다. 상태 변경만 follow-up API를 기다리는 중입니다.
          </p>
        </div>
      </div>

      <MembersSummaryGrid pageData={pageData} members={members} />

      <MembersFiltersCard
        query={query}
        department={department}
        selectedStatus={selectedStatus}
        selectedAdminFilter={selectedAdminFilter}
        pageSize={pageSize}
        hasPrevious={Boolean(pageData?.hasPrevious)}
        hasNext={Boolean(pageData?.hasNext)}
        onQueryChange={setQuery}
        onDepartmentChange={setDepartment}
        onStatusChange={setSelectedStatus}
        onAdminFilterChange={setSelectedAdminFilter}
        onPageSizeChange={setPageSize}
        onResetFilters={() => {
          setQuery("");
          setDepartment("");
          setSelectedStatus("ALL");
          setSelectedAdminFilter("ALL");
          setPageSize("20");
        }}
        onPreviousPage={() => setCurrentPage((current) => Math.max(0, current - 1))}
        onNextPage={() => setCurrentPage((current) => current + 1)}
      />

      {listError ? (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertCircle className="size-4" />
          <AlertTitle>회원 목록 조회 실패</AlertTitle>
          <AlertDescription>{listError}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>회원 목록</CardTitle>
          <CardDescription>
            행 클릭 시 상세 modal을 엽니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <MembersTable
            members={members}
            selectedMemberId={selectedMemberId}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            onSelectMember={(memberId) => {
              setSelectedMemberId(memberId);
              setIsMemberDialogOpen(true);
            }}
          />

          {!members.length ? (
            <p className="text-sm text-muted-foreground">
              현재 조건에 맞는 회원이 없습니다.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Alert className="rounded-2xl">
        <ShieldAlert className="size-4" />
        <AlertTitle>남은 백엔드 gap</AlertTitle>
        <AlertDescription>
          사용자 관리에서는 상태 변경 API만 아직 없어 placeholder로 남겨두고
          있습니다.
        </AlertDescription>
      </Alert>

      <MemberDetailDialog
        open={isMemberDialogOpen}
        onOpenChange={setIsMemberDialogOpen}
        dialogMemberLabel={dialogMemberLabel}
        selectedMemberDetail={selectedMemberDetail}
        selectedMemberSummary={selectedMemberSummary}
        selectedMemberActivity={selectedMemberActivity}
        detailLoading={detailLoading}
        detailError={detailError}
        activityLoading={activityLoading}
        activityError={activityError}
        draftIsAdmin={draftIsAdmin}
        onDraftIsAdminChange={setDraftIsAdmin}
        saveSuccess={saveSuccess}
        saveError={saveError}
        isSavePending={isSavePending}
        hasPendingRoleChange={hasPendingRoleChange}
        selfRoleChangeBlocked={selfRoleChangeBlocked}
        withdrawnRoleChangeBlocked={withdrawnRoleChangeBlocked}
        onSaveAdminRole={handleSaveAdminRole}
      />
    </div>
  );
}
