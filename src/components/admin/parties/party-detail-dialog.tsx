"use client";

import { AlertCircle, RefreshCcw, Send, ShieldX, Users } from "lucide-react";
import { ChatMessageFeed } from "@/components/admin/chat/message-feed";
import { DetailField } from "@/components/admin/detail-field";
import { SectionAlert } from "@/components/admin/section-alert";
import { SelectField } from "@/components/admin/users/select-field";
import {
  actionLabel,
  canRemoveMember,
  formatText,
  partyStatusClasses,
  renderSettlementMember,
  settlementStatusClasses,
} from "@/components/admin/parties/helpers";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  AdminPartyDetail,
  AdminPartyJoinRequest,
  AdminPartyStatusAction,
  AdminPartySummary,
  ChatMessage,
} from "@/features/admin/types";
import { formatDateTime } from "@/lib/format/date";

interface PartyDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPartyDetail: AdminPartyDetail | null;
  selectedPartySummary: AdminPartySummary | null;
  detailLoading: boolean;
  detailError: string | null;
  joinRequests: AdminPartyJoinRequest[];
  joinRequestsLoading: boolean;
  joinRequestsError: string | null;
  selectedAction: AdminPartyStatusAction | "";
  availableActions: AdminPartyStatusAction[];
  actionPending: boolean;
  actionError: string | null;
  actionSuccess: string | null;
  removingMemberId: string | null;
  memberActionError: string | null;
  memberActionSuccess: string | null;
  systemMessage: string;
  systemMessagePending: boolean;
  systemMessageError: string | null;
  systemMessageSuccess: string | null;
  messages: ChatMessage[];
  messagesLoading: boolean;
  messagesError: string | null;
  messagesHasNext: boolean;
  loadingMoreMessages: boolean;
  onSelectedActionChange: (value: AdminPartyStatusAction | "") => void;
  onSystemMessageChange: (value: string) => void;
  onStatusAction: () => void;
  onRemoveMember: (memberId: string, nickname: string | null) => void | Promise<void>;
  onSendSystemMessage: () => void;
  onLoadMoreMessages: () => void | Promise<void>;
  onRefreshMessages: () => void;
}

export function PartyDetailDialog({
  open,
  onOpenChange,
  selectedPartyDetail,
  selectedPartySummary,
  detailLoading,
  detailError,
  joinRequests,
  joinRequestsLoading,
  joinRequestsError,
  selectedAction,
  availableActions,
  actionPending,
  actionError,
  actionSuccess,
  removingMemberId,
  memberActionError,
  memberActionSuccess,
  systemMessage,
  systemMessagePending,
  systemMessageError,
  systemMessageSuccess,
  messages,
  messagesLoading,
  messagesError,
  messagesHasNext,
  loadingMoreMessages,
  onSelectedActionChange,
  onSystemMessageChange,
  onStatusAction,
  onRemoveMember,
  onSendSystemMessage,
  onLoadMoreMessages,
  onRefreshMessages,
}: PartyDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>
            {selectedPartyDetail?.routeSummary ??
              selectedPartySummary?.routeSummary ??
              "택시 파티 상세"}
          </DialogTitle>
          <DialogDescription>
            상세 조회, 채팅 이력 확인, 상태 변경, 일반 멤버 강퇴, 운영 시스템
            메시지, pending join request 조회까지 이 modal에서 처리합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {detailLoading ? (
                <p className="text-sm text-muted-foreground">
                  택시 파티 상세를 불러오는 중입니다.
                </p>
              ) : detailError ? (
                <SectionAlert title="상세 조회 실패" description={detailError} />
              ) : !selectedPartyDetail ? (
                <p className="text-sm text-muted-foreground">
                  파티를 선택하면 상세 정보가 표시됩니다.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <DetailField
                      label="파티 ID"
                      value={<p className="break-all">{selectedPartyDetail.id}</p>}
                    />
                    <DetailField
                      label="상태"
                      value={
                        <Badge
                          variant="outline"
                          className={partyStatusClasses(selectedPartyDetail.status)}
                        >
                          {selectedPartyDetail.status}
                        </Badge>
                      }
                    />
                    <DetailField
                      label="리더"
                      value={`${formatText(selectedPartyDetail.leader.nickname)} (${selectedPartyDetail.leader.id})`}
                    />
                    <DetailField
                      label="모집 인원"
                      value={`${selectedPartyDetail.currentMembers} / ${selectedPartyDetail.maxMembers}`}
                    />
                    <DetailField
                      label="출발 시각"
                      value={formatDateTime(selectedPartyDetail.departureTime)}
                    />
                    <DetailField
                      label="대기 중인 합류 요청"
                      value={selectedPartyDetail.pendingJoinRequestCount}
                    />
                    <DetailField
                      label="생성일"
                      value={formatDateTime(selectedPartyDetail.createdAt)}
                    />
                    <DetailField
                      label="수정일"
                      value={formatDateTime(selectedPartyDetail.updatedAt)}
                    />
                    <DetailField
                      label="endReason"
                      value={formatText(selectedPartyDetail.endReason)}
                    />
                    <DetailField
                      label="종료 시각"
                      value={formatDateTime(selectedPartyDetail.endedAt)}
                    />
                    <DetailField
                      label="채팅방 ID"
                      value={
                        <p className="break-all">
                          {formatText(selectedPartyDetail.chatRoomId)}
                        </p>
                      }
                    />
                    <DetailField
                      label="settlementStatus"
                      value={
                        <Badge
                          variant="outline"
                          className={settlementStatusClasses(
                            selectedPartyDetail.settlementStatus,
                          )}
                        >
                          {formatText(selectedPartyDetail.settlementStatus)}
                        </Badge>
                      }
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <DetailField
                      label="출발지"
                      value={`${selectedPartyDetail.departure.name} (${selectedPartyDetail.departure.lat}, ${selectedPartyDetail.departure.lng})`}
                    />
                    <DetailField
                      label="도착지"
                      value={`${selectedPartyDetail.destination.name} (${selectedPartyDetail.destination.lat}, ${selectedPartyDetail.destination.lng})`}
                    />
                  </div>

                  <DetailField
                    label="상세 메모"
                    value={
                      <p className="whitespace-pre-wrap">
                        {formatText(selectedPartyDetail.detail)}
                      </p>
                    }
                  />

                  <DetailField
                    label="태그"
                    value={
                      selectedPartyDetail.tags.length ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedPartyDetail.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          태그가 없습니다.
                        </p>
                      )
                    }
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-5 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>참여 멤버</CardTitle>
                <CardDescription>
                  leader는 제거할 수 없고, ARRIVED/ENDED 상태에서는 일반 멤버 제거도
                  허용되지 않습니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {memberActionSuccess ? (
                  <Alert>
                    <Users className="size-4" />
                    <AlertTitle>멤버 제거 완료</AlertTitle>
                    <AlertDescription>{memberActionSuccess}</AlertDescription>
                  </Alert>
                ) : null}

                {memberActionError ? (
                  <SectionAlert title="멤버 제거 실패" description={memberActionError} />
                ) : null}

                {!selectedPartyDetail ? (
                  <p className="text-sm text-muted-foreground">
                    파티 상세를 선택하세요.
                  </p>
                ) : selectedPartyDetail.members.length ? (
                  selectedPartyDetail.members.map((member) => (
                    <div
                      key={member.id}
                      className="space-y-2 rounded-2xl border border-border/70 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium">{formatText(member.nickname)}</p>
                        <div className="flex flex-wrap gap-2">
                          <Badge
                            variant="outline"
                            className={
                              member.isLeader
                                ? "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950/50 dark:text-teal-300"
                                : "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-300"
                            }
                          >
                            {member.isLeader ? "리더" : "멤버"}
                          </Badge>
                          {!member.isLeader ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={
                                removingMemberId === member.id ||
                                !canRemoveMember(
                                  selectedPartyDetail.status,
                                  member.isLeader,
                                )
                              }
                              onClick={(event) => {
                                event.stopPropagation();
                                void onRemoveMember(member.id, member.nickname);
                              }}
                            >
                              <ShieldX className="size-4" />
                              강퇴
                            </Button>
                          ) : null}
                        </div>
                      </div>
                      <p className="break-all text-sm text-muted-foreground">
                        {member.id}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        joinedAt: {formatDateTime(member.joinedAt)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    참여 멤버 정보가 없습니다.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>정산 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedPartyDetail ? (
                  <p className="text-sm text-muted-foreground">
                    파티 상세를 선택하세요.
                  </p>
                ) : selectedPartyDetail.settlement ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <DetailField
                        label="정산 상태"
                        value={
                          <Badge
                            variant="outline"
                            className={settlementStatusClasses(
                              selectedPartyDetail.settlement.status,
                            )}
                          >
                            {selectedPartyDetail.settlement.status}
                          </Badge>
                        }
                      />
                      <DetailField
                        label="택시비"
                        value={selectedPartyDetail.settlement.taxiFare ?? "-"}
                      />
                      <DetailField
                        label="정산 인원"
                        value={selectedPartyDetail.settlement.splitMemberCount ?? "-"}
                      />
                      <DetailField
                        label="1인당 금액"
                        value={selectedPartyDetail.settlement.perPersonAmount ?? "-"}
                      />
                    </div>

                    <DetailField
                      label="정산 계좌"
                      value={
                        selectedPartyDetail.settlement.account ? (
                          <div className="grid gap-3 md:grid-cols-2">
                            <p>
                              은행명:{" "}
                              {formatText(selectedPartyDetail.settlement.account.bankName)}
                            </p>
                            <p>
                              계좌번호:{" "}
                              {formatText(
                                selectedPartyDetail.settlement.account.accountNumber,
                              )}
                            </p>
                            <p>
                              예금주:{" "}
                              {formatText(
                                selectedPartyDetail.settlement.account.accountHolder,
                              )}
                            </p>
                            <p>
                              이름 숨김:{" "}
                              {selectedPartyDetail.settlement.account.hideName
                                ? "true"
                                : "false"}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            계좌 정보가 없습니다.
                          </p>
                        )
                      }
                    />

                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        멤버 정산 상태
                      </Label>
                      <div className="space-y-3">
                        {selectedPartyDetail.settlement.memberSettlements.length ? (
                          selectedPartyDetail.settlement.memberSettlements.map(
                            renderSettlementMember,
                          )
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            멤버 정산 정보가 없습니다.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    정산 정보가 없습니다.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Pending Join Request</CardTitle>
                <CardDescription>
                  현재는 최신 요청 조회만 가능하고 승인/거절은 follow-up입니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {joinRequestsLoading ? (
                  <p className="text-sm text-muted-foreground">
                    join request 목록을 불러오는 중입니다.
                  </p>
                ) : joinRequestsError ? (
                  <SectionAlert
                    title="join request 조회 실패"
                    description={joinRequestsError}
                  />
                ) : joinRequests.length ? (
                  joinRequests.map((request) => (
                    <div
                      key={request.requestId}
                      className="space-y-2 rounded-2xl border border-border/70 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="font-medium">{formatText(request.nickname)}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatText(request.realname)}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300"
                        >
                          PENDING
                        </Badge>
                      </div>
                      <p className="break-all text-sm text-muted-foreground">
                        requestId: {request.requestId}
                      </p>
                      <p className="break-all text-sm text-muted-foreground">
                        memberId: {request.memberId}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatText(request.department)} / {formatText(request.studentId)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        requestedAt: {formatDateTime(request.requestedAt)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    현재 대기 중인 join request가 없습니다.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>파티 채팅 이력</CardTitle>
                    <CardDescription>
                      관리자 전용 read API로 현재 파티 멤버십 없이도 메시지 이력을 조회합니다.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!selectedPartyDetail?.chatRoomId}
                    onClick={onRefreshMessages}
                  >
                    <RefreshCcw className="size-4" />
                    메시지 새로고침
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedPartyDetail ? (
                  <p className="text-sm text-muted-foreground">
                    파티 상세를 선택하세요.
                  </p>
                ) : !selectedPartyDetail.chatRoomId ? (
                  <Alert>
                    <AlertCircle className="size-4" />
                    <AlertTitle>채팅방 없음</AlertTitle>
                    <AlertDescription>
                      이 파티는 chat room이 없어 메시지 이력을 조회할 수 없습니다.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <ChatMessageFeed
                    messages={messages}
                    loading={messagesLoading}
                    error={messagesError}
                    emptyLabel="표시할 파티 채팅 메시지가 없습니다."
                    loadingLabel="파티 채팅 메시지를 불러오는 중입니다."
                    hasNext={messagesHasNext}
                    loadingMore={loadingMoreMessages}
                    onLoadMore={onLoadMoreMessages}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>운영 시스템 메시지</CardTitle>
                <CardDescription>
                  party chat room이 있을 때만 전송할 수 있고, 표시 기준은{" "}
                  <code>senderName=관리자</code>, <code>senderPhotoUrl=null</code>
                  입니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedPartyDetail?.chatRoomId ? (
                  <Alert>
                    <AlertCircle className="size-4" />
                    <AlertTitle>채팅방 없음</AlertTitle>
                    <AlertDescription>
                      이 파티는 chat room이 없어 운영 시스템 메시지를 보낼 수
                      없습니다.
                    </AlertDescription>
                  </Alert>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="system-message">메시지</Label>
                  <Textarea
                    id="system-message"
                    value={systemMessage}
                    placeholder="파티 참여자에게 보낼 운영 안내 메시지를 입력하세요."
                    className="min-h-40"
                    maxLength={500}
                    onChange={(event) => onSystemMessageChange(event.target.value)}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                  <p>공백만 입력할 수 없고 최대 500자입니다.</p>
                  <p>{systemMessage.length} / 500</p>
                </div>

                {systemMessageSuccess ? (
                  <Alert>
                    <Send className="size-4" />
                    <AlertTitle>시스템 메시지 전송 완료</AlertTitle>
                    <AlertDescription>{systemMessageSuccess}</AlertDescription>
                  </Alert>
                ) : null}

                {systemMessageError ? (
                  <SectionAlert
                    title="시스템 메시지 전송 실패"
                    description={systemMessageError}
                  />
                ) : null}

                <Button
                  disabled={
                    !selectedPartyDetail?.chatRoomId ||
                    !systemMessage.trim().length ||
                    systemMessagePending
                  }
                  onClick={onSendSystemMessage}
                >
                  <Send className="size-4" />
                  시스템 메시지 전송
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>상태 변경</CardTitle>
              <CardDescription>
                현재 정책은 <code>OPEN→CLOSE</code>, <code>CLOSED→REOPEN</code>,{" "}
                <code>OPEN/CLOSED→CANCEL</code>, <code>ARRIVED→END</code>만
                허용합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedPartyDetail ? (
                <p className="text-sm text-muted-foreground">
                  파티 상세를 선택하세요.
                </p>
              ) : (
                <>
                  <SelectField
                    label="변경 액션"
                    value={selectedAction}
                    options={availableActions.length ? availableActions : ["__none"]}
                    onChange={(value) =>
                      onSelectedActionChange(
                        value === "__none" ? "" : (value as AdminPartyStatusAction | ""),
                      )
                    }
                    getLabel={(value) =>
                      value === "__none" ? "현재 상태에서 가능한 액션 없음" : actionLabel(value as AdminPartyStatusAction)
                    }
                    widthClassName="md:max-w-60"
                  />

                  {actionSuccess ? (
                    <Alert>
                      <AlertCircle className="size-4" />
                      <AlertTitle>상태 변경 완료</AlertTitle>
                      <AlertDescription>{actionSuccess}</AlertDescription>
                    </Alert>
                  ) : null}

                  {actionError ? (
                    <SectionAlert title="상태 변경 실패" description={actionError} />
                  ) : null}

                  <Button
                    disabled={!selectedAction || actionPending}
                    onClick={onStatusAction}
                  >
                    상태 변경 실행
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
