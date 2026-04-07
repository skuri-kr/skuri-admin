"use client";

import Image from "next/image";
import { AlertCircle, ShieldAlert } from "lucide-react";
import { DetailField } from "@/components/admin/detail-field";
import { MetricCard } from "@/components/admin/metric-card";
import { SelectField } from "@/components/admin/users/select-field";
import {
  adminRoleClasses,
  booleanBadge,
  formatText,
  listItemText,
  memberStatusClasses,
  partyRoleClasses,
  recentStatusClasses,
} from "@/components/admin/users/helpers";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format/date";
import type {
  AdminMemberActivity,
  AdminMemberDetail,
  AdminMemberRecentComment,
  AdminMemberRecentInquiry,
  AdminMemberRecentParty,
  AdminMemberRecentPost,
  AdminMemberRecentReport,
  AdminMemberSummary,
} from "@/features/admin/types";

interface MemberDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dialogMemberLabel: string;
  selectedMemberDetail: AdminMemberDetail | null;
  selectedMemberSummary: AdminMemberSummary | null;
  selectedMemberActivity: AdminMemberActivity | null;
  detailLoading: boolean;
  detailError: string | null;
  activityLoading: boolean;
  activityError: string | null;
  draftIsAdmin: "true" | "false";
  onDraftIsAdminChange: (value: "true" | "false") => void;
  saveSuccess: string | null;
  saveError: string | null;
  isSavePending: boolean;
  hasPendingRoleChange: boolean;
  selfRoleChangeBlocked: boolean;
  withdrawnRoleChangeBlocked: boolean;
  onSaveAdminRole: () => void;
}

function renderRecentPost(item: AdminMemberRecentPost) {
  return (
    <div
      key={item.id}
      className="space-y-1 rounded-2xl border border-border/70 p-3"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium">{listItemText(item.title)}</p>
        <Badge
          variant="outline"
          className="border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300"
        >
          {item.category}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        {formatDateTime(item.createdAt)}
      </p>
    </div>
  );
}

function renderRecentComment(item: AdminMemberRecentComment) {
  return (
    <div
      key={item.id}
      className="space-y-1 rounded-2xl border border-border/70 p-3"
    >
      <p className="font-medium">{listItemText(item.postTitle)}</p>
      <p className="text-sm text-muted-foreground">
        {listItemText(item.contentPreview)}
      </p>
      <div className="flex flex-wrap items-start justify-between gap-2 text-xs text-muted-foreground">
        <p>postId: {item.postId}</p>
        <p>{formatDateTime(item.createdAt)}</p>
      </div>
    </div>
  );
}

function renderRecentParty(item: AdminMemberRecentParty) {
  return (
    <div
      key={`${item.role}-${item.id}`}
      className="space-y-1 rounded-2xl border border-border/70 p-3"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium">{listItemText(item.routeSummary)}</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={partyRoleClasses(item.role)}>
            {item.role}
          </Badge>
          <Badge variant="outline" className={recentStatusClasses(item.status)}>
            {item.status}
          </Badge>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        출발 {formatDateTime(item.departureTime)}
      </p>
      <p className="text-xs text-muted-foreground">
        생성 {formatDateTime(item.createdAt)}
      </p>
    </div>
  );
}

function renderRecentInquiry(item: AdminMemberRecentInquiry) {
  return (
    <div
      key={item.id}
      className="space-y-1 rounded-2xl border border-border/70 p-3"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium">{listItemText(item.subject)}</p>
        <Badge variant="outline" className={recentStatusClasses(item.status)}>
          {item.status}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">{item.type}</p>
      <p className="text-xs text-muted-foreground">
        {formatDateTime(item.createdAt)}
      </p>
    </div>
  );
}

function renderRecentReport(item: AdminMemberRecentReport) {
  return (
    <div
      key={item.id}
      className="space-y-1 rounded-2xl border border-border/70 p-3"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium">
          {item.targetType} / {item.category}
        </p>
        <Badge variant="outline" className={recentStatusClasses(item.status)}>
          {item.status}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">targetId: {item.targetId}</p>
      <p className="text-xs text-muted-foreground">
        {formatDateTime(item.createdAt)}
      </p>
    </div>
  );
}

export function MemberDetailDialog({
  open,
  onOpenChange,
  dialogMemberLabel,
  selectedMemberDetail,
  selectedMemberSummary,
  selectedMemberActivity,
  detailLoading,
  detailError,
  activityLoading,
  activityError,
  draftIsAdmin,
  onDraftIsAdminChange,
  saveSuccess,
  saveError,
  isSavePending,
  hasPendingRoleChange,
  selfRoleChangeBlocked,
  withdrawnRoleChangeBlocked,
  onSaveAdminRole,
}: MemberDetailDialogProps) {
  const notificationRows = selectedMemberDetail
    ? ([
        [
          "전체 알림",
          selectedMemberDetail.notificationSetting.allNotifications,
        ],
        ["파티", selectedMemberDetail.notificationSetting.partyNotifications],
        ["공지", selectedMemberDetail.notificationSetting.noticeNotifications],
        [
          "게시글 좋아요",
          selectedMemberDetail.notificationSetting.boardLikeNotifications,
        ],
        ["댓글", selectedMemberDetail.notificationSetting.commentNotifications],
        [
          "북마크 게시글 댓글",
          selectedMemberDetail.notificationSetting
            .bookmarkedPostCommentNotifications,
        ],
        ["시스템", selectedMemberDetail.notificationSetting.systemNotifications],
        [
          "학사 일정",
          selectedMemberDetail.notificationSetting.academicScheduleNotifications,
        ],
        [
          "학사 일정 전날",
          selectedMemberDetail.notificationSetting
            .academicScheduleDayBeforeEnabled,
        ],
        [
          "학사 일정 전체 이벤트",
          selectedMemberDetail.notificationSetting
            .academicScheduleAllEventsEnabled,
        ],
      ] as const)
    : [];

  const noticeNotificationEntries = selectedMemberDetail
    ? Object.entries(
        selectedMemberDetail.notificationSetting.noticeNotificationsDetail ?? {},
      )
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-hidden p-0 sm:max-w-6xl">
        <DialogHeader className="border-b px-6 pt-6">
          <DialogTitle>{dialogMemberLabel}</DialogTitle>
          <DialogDescription>
            회원 상세, 활동 요약, 관리자 권한, 계좌 정보, 알림 설정
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(85vh-86px)] overflow-y-auto px-6 py-6">
          <div className="space-y-5">
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle>회원 상세</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {detailLoading ? (
                  <p className="text-sm text-muted-foreground">
                    회원 상세를 불러오는 중입니다.
                  </p>
                ) : detailError ? (
                  <Alert variant="destructive" className="rounded-2xl">
                    <AlertCircle className="size-4" />
                    <AlertTitle>회원 상세 조회 실패</AlertTitle>
                    <AlertDescription>{detailError}</AlertDescription>
                  </Alert>
                ) : !selectedMemberDetail ? (
                  <p className="text-sm text-muted-foreground">
                    회원을 선택하면 상세 정보가 표시됩니다.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <DetailField label="이메일" value={selectedMemberDetail.email} />
                      <DetailField
                        label="회원 ID"
                        value={<span className="break-all">{selectedMemberDetail.id}</span>}
                      />
                      <DetailField
                        label="닉네임"
                        value={formatText(selectedMemberDetail.nickname)}
                      />
                      <DetailField
                        label="실명"
                        value={formatText(selectedMemberDetail.realname)}
                      />
                      <DetailField
                        label="학번"
                        value={formatText(selectedMemberDetail.studentId)}
                      />
                      <DetailField
                        label="학과"
                        value={formatText(selectedMemberDetail.department)}
                      />
                      <DetailField
                        label="가입일"
                        value={formatDateTime(selectedMemberDetail.joinedAt)}
                      />
                      <DetailField
                        label="마지막 로그인"
                        value={formatDateTime(selectedMemberDetail.lastLogin)}
                      />
                      <DetailField
                        label="최근 로그인 OS"
                        value={formatText(selectedMemberSummary?.lastLoginOs)}
                      />
                      <DetailField
                        label="최근 앱버전"
                        value={formatText(selectedMemberSummary?.currentAppVersion)}
                      />
                      <DetailField
                        label="회원 상태"
                        value={
                          <Badge
                            variant="outline"
                            className={memberStatusClasses(selectedMemberDetail.status)}
                          >
                            {selectedMemberDetail.status}
                          </Badge>
                        }
                      />
                      <DetailField
                        label="현재 권한"
                        value={
                          <Badge
                            variant="outline"
                            className={adminRoleClasses(selectedMemberDetail.isAdmin)}
                          >
                            {selectedMemberDetail.isAdmin ? "관리자" : "일반"}
                          </Badge>
                        }
                      />
                    </div>

                    <DetailField
                      label="프로필 이미지"
                      value={
                        selectedMemberDetail.photoUrl ? (
                          <Image
                            src={selectedMemberDetail.photoUrl}
                            alt={`${selectedMemberDetail.realname ?? selectedMemberDetail.nickname ?? selectedMemberDetail.id} 프로필 이미지`}
                            width={240}
                            height={240}
                            unoptimized
                            className="max-h-60 max-w-60 rounded-2xl border object-cover"
                          />
                        ) : (
                          <span className="text-muted-foreground">
                            등록된 이미지가 없습니다.
                          </span>
                        )
                      }
                    />

                    {selectedMemberDetail.withdrawnAt ? (
                      <DetailField
                        label="탈퇴 시각"
                        value={formatDateTime(selectedMemberDetail.withdrawnAt)}
                      />
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-3xl">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle>회원 활동 요약</CardTitle>
                  <CardDescription>
                    저장된 activity summary 기준 최근 활동을 표시합니다.
                  </CardDescription>
                </div>
                {selectedMemberActivity ? (
                  <p className="text-xs text-muted-foreground">
                    생성 {formatDateTime(selectedMemberActivity.generatedAt)}
                  </p>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedMemberDetail ? (
                  <p className="text-sm text-muted-foreground">
                    회원 상세를 선택하세요.
                  </p>
                ) : activityLoading ? (
                  <p className="text-sm text-muted-foreground">
                    활동 요약을 불러오는 중입니다.
                  </p>
                ) : activityError ? (
                  <Alert
                    variant={
                      selectedMemberDetail.status === "WITHDRAWN"
                        ? "default"
                        : "destructive"
                    }
                    className="rounded-2xl"
                  >
                    <AlertCircle className="size-4" />
                    <AlertTitle>
                      {selectedMemberDetail.status === "WITHDRAWN"
                        ? "활동 요약 비제공"
                        : "활동 요약 조회 실패"}
                    </AlertTitle>
                    <AlertDescription>{activityError}</AlertDescription>
                  </Alert>
                ) : selectedMemberActivity ? (
                  <div className="space-y-5">
                    <div className="grid gap-3 md:grid-cols-3">
                      <MetricCard
                        label="게시글"
                        value={selectedMemberActivity.counts.posts}
                        description="현재 저장된 게시글 수"
                      />
                      <MetricCard
                        label="댓글"
                        value={selectedMemberActivity.counts.comments}
                        description="현재 저장된 댓글 수"
                      />
                      <MetricCard
                        label="생성 파티"
                        value={selectedMemberActivity.counts.partiesCreated}
                        description="leader 기준"
                      />
                      <MetricCard
                        label="참여 파티"
                        value={selectedMemberActivity.counts.partiesJoined}
                        description="joined 기준"
                      />
                      <MetricCard
                        label="문의"
                        value={selectedMemberActivity.counts.inquiries}
                        description="현재 저장된 문의 수"
                      />
                      <MetricCard
                        label="신고"
                        value={selectedMemberActivity.counts.reportsSubmitted}
                        description="현재 저장된 신고 수"
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          최근 게시글
                        </p>
                        <div className="space-y-3">
                          {selectedMemberActivity.recentPosts.length ? (
                            selectedMemberActivity.recentPosts.map(renderRecentPost)
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              기록이 없습니다.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          최근 댓글
                        </p>
                        <div className="space-y-3">
                          {selectedMemberActivity.recentComments.length ? (
                            selectedMemberActivity.recentComments.map(
                              renderRecentComment,
                            )
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              기록이 없습니다.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          최근 파티
                        </p>
                        <div className="space-y-3">
                          {selectedMemberActivity.recentParties.length ? (
                            selectedMemberActivity.recentParties.map(renderRecentParty)
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              기록이 없습니다.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          최근 문의
                        </p>
                        <div className="space-y-3">
                          {selectedMemberActivity.recentInquiries.length ? (
                            selectedMemberActivity.recentInquiries.map(
                              renderRecentInquiry,
                            )
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              기록이 없습니다.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        최근 신고
                      </p>
                      <div className="space-y-3">
                        {selectedMemberActivity.recentReports.length ? (
                          selectedMemberActivity.recentReports.map(renderRecentReport)
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            기록이 없습니다.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    활동 요약 데이터가 없습니다.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle>관리자 권한 변경</CardTitle>
                <CardDescription>
                  자기 계정과 탈퇴 회원은 변경 대상에서 제외됩니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedMemberDetail ? (
                  <>
                    <SelectField
                      label="변경할 권한"
                      value={draftIsAdmin}
                      options={["true", "false"]}
                      onChange={(value) => onDraftIsAdminChange(value as "true" | "false")}
                      getLabel={(value) => (value === "true" ? "관리자" : "일반 회원")}
                      widthClassName="max-w-[220px]"
                    />

                    {selfRoleChangeBlocked ? (
                      <Alert className="rounded-2xl">
                        <ShieldAlert className="size-4" />
                        <AlertTitle>자기 계정 보호</AlertTitle>
                        <AlertDescription>
                          자기 자신의 관리자 권한은 변경할 수 없습니다.
                        </AlertDescription>
                      </Alert>
                    ) : null}

                    {withdrawnRoleChangeBlocked ? (
                      <Alert className="rounded-2xl">
                        <ShieldAlert className="size-4" />
                        <AlertTitle>탈퇴 회원</AlertTitle>
                        <AlertDescription>
                          탈퇴한 회원은 관리자 권한 변경 대상이 아닙니다.
                        </AlertDescription>
                      </Alert>
                    ) : null}

                    {saveSuccess ? (
                      <Alert className="rounded-2xl">
                        <ShieldAlert className="size-4" />
                        <AlertTitle>저장 완료</AlertTitle>
                        <AlertDescription>{saveSuccess}</AlertDescription>
                      </Alert>
                    ) : null}

                    {saveError ? (
                      <Alert variant="destructive" className="rounded-2xl">
                        <AlertCircle className="size-4" />
                        <AlertTitle>저장 실패</AlertTitle>
                        <AlertDescription>{saveError}</AlertDescription>
                      </Alert>
                    ) : null}

                    <Button
                      disabled={
                        isSavePending ||
                        !hasPendingRoleChange ||
                        selfRoleChangeBlocked ||
                        withdrawnRoleChangeBlocked
                      }
                      onClick={onSaveAdminRole}
                    >
                      {isSavePending ? "저장 중..." : "권한 저장"}
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    회원을 선택하면 권한 변경 패널이 활성화됩니다.
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-5 xl:grid-cols-2">
              <Card className="rounded-3xl">
                <CardHeader>
                  <CardTitle>계좌 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!selectedMemberDetail ? (
                    <p className="text-sm text-muted-foreground">
                      회원 상세를 선택하세요.
                    </p>
                  ) : selectedMemberDetail.bankAccount ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <DetailField
                        label="은행명"
                        value={formatText(selectedMemberDetail.bankAccount.bankName)}
                      />
                      <DetailField
                        label="계좌번호"
                        value={
                          <span className="break-all">
                            {formatText(selectedMemberDetail.bankAccount.accountNumber)}
                          </span>
                        }
                      />
                      <DetailField
                        label="예금주"
                        value={formatText(selectedMemberDetail.bankAccount.accountHolder)}
                      />
                      <DetailField
                        label="이름 숨김"
                        value={booleanBadge(
                          Boolean(selectedMemberDetail.bankAccount.hideName),
                        )}
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      등록된 계좌 정보가 없습니다.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-3xl">
                <CardHeader>
                  <CardTitle>알림 설정</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!selectedMemberDetail ? (
                    <p className="text-sm text-muted-foreground">
                      회원 상세를 선택하세요.
                    </p>
                  ) : (
                    <>
                      <div className="grid gap-4 md:grid-cols-2">
                        {notificationRows.map(([label, value]) => (
                          <DetailField
                            key={label}
                            label={label}
                            value={booleanBadge(value)}
                          />
                        ))}
                      </div>

                      <DetailField
                        label="공지 상세 알림"
                        value={
                          noticeNotificationEntries.length ? (
                            <div className="flex flex-wrap gap-2">
                              {noticeNotificationEntries.map(([label, value]) => (
                                <Badge
                                  key={label}
                                  variant="outline"
                                  className={cn(
                                    "rounded-full",
                                    value
                                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
                                      : "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-300",
                                  )}
                                >
                                  {label}: {value ? "ON" : "OFF"}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              세부 공지 알림 설정이 없습니다.
                            </span>
                          )
                        }
                      />
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
