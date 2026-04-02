"use client";

import Image from "next/image";
import { AlertCircle } from "lucide-react";
import { DetailField } from "@/components/admin/detail-field";
import { SectionAlert } from "@/components/admin/section-alert";
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
import type {
  AdminBoardPostDetail,
  AdminBoardPostSummary,
  BoardModerationStatus,
} from "@/features/admin/types";
import { formatDateTime } from "@/lib/format/date";
import {
  availableModerationTargets,
  formatText,
  moderationActionIcon,
  moderationActionLabel,
  moderationClasses,
} from "@/components/admin/boards/helpers";

interface PostDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPostDetail: AdminBoardPostDetail | null;
  selectedPostSummary: AdminBoardPostSummary | null;
  postDetailLoading: boolean;
  postDetailError: string | null;
  postModerationPending: boolean;
  postModerationError: string | null;
  postModerationSuccess: string | null;
  onPostModeration: (status: BoardModerationStatus) => void | Promise<void>;
}

export function PostDetailDialog({
  open,
  onOpenChange,
  selectedPostDetail,
  selectedPostSummary,
  postDetailLoading,
  postDetailError,
  postModerationPending,
  postModerationError,
  postModerationSuccess,
  onPostModeration,
}: PostDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            {selectedPostDetail?.title ?? selectedPostSummary?.title ?? "게시글 상세"}
          </DialogTitle>
          <DialogDescription>
            관리자 상세와 moderation 액션은 이 modal에서 처리합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {postDetailLoading ? (
                <p className="text-sm text-muted-foreground">
                  게시글 상세를 불러오는 중입니다.
                </p>
              ) : postDetailError ? (
                <SectionAlert title="게시글 상세 조회 실패" description={postDetailError} />
              ) : !selectedPostDetail ? (
                <p className="text-sm text-muted-foreground">
                  게시글을 선택하면 상세 정보가 표시됩니다.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <DetailField
                      label="게시글 ID"
                      value={<p className="break-all">{selectedPostDetail.id}</p>}
                    />
                    <DetailField
                      label="moderation"
                      value={
                        <Badge
                          variant="outline"
                          className={moderationClasses(selectedPostDetail.moderationStatus)}
                        >
                          {selectedPostDetail.moderationStatus}
                        </Badge>
                      }
                    />
                    <DetailField label="카테고리" value={selectedPostDetail.category} />
                    <DetailField
                      label="익명 여부"
                      value={selectedPostDetail.isAnonymous ? "true" : "false"}
                    />
                    <DetailField
                      label="작성자"
                      value={`${formatText(selectedPostDetail.authorNickname)} / ${formatText(selectedPostDetail.authorRealname)}`}
                    />
                    <DetailField
                      label="authorId"
                      value={<p className="break-all">{selectedPostDetail.authorId}</p>}
                    />
                    <DetailField
                      label="생성일"
                      value={formatDateTime(selectedPostDetail.createdAt)}
                    />
                    <DetailField
                      label="수정일"
                      value={formatDateTime(selectedPostDetail.updatedAt)}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-4">
                    <DetailField label="조회수" value={selectedPostDetail.viewCount} />
                    <DetailField label="좋아요" value={selectedPostDetail.likeCount} />
                    <DetailField label="댓글 수" value={selectedPostDetail.commentCount} />
                    <DetailField label="북마크 수" value={selectedPostDetail.bookmarkCount} />
                  </div>

                  <DetailField
                    label="본문"
                    value={<p className="whitespace-pre-wrap">{selectedPostDetail.content}</p>}
                  />

                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      이미지
                    </Label>
                    {selectedPostDetail.images.length ? (
                      <div className="space-y-3">
                        {selectedPostDetail.images.map((image, index) => (
                          <div
                            key={`${image.url}-${index}`}
                            className="space-y-2 rounded-2xl border border-border/70 p-3"
                          >
                            <Image
                              src={image.thumbUrl ?? image.url}
                              alt={`게시글 이미지 ${index + 1}`}
                              width={image.width ?? 960}
                              height={image.height ?? 640}
                              unoptimized
                              className="max-h-[260px] rounded-xl border border-border/70 object-contain"
                            />
                            <p className="text-xs text-muted-foreground">
                              thumb: {formatText(image.thumbUrl)} / {image.width ?? "-"}x
                              {image.height ?? "-"} / {image.size ?? "-"} bytes /{" "}
                              {formatText(image.mime)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        첨부 이미지가 없습니다.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>게시글 moderation</CardTitle>
              <CardDescription>
                <code>VISIBLE → HIDDEN</code>, <code>HIDDEN → VISIBLE</code>,{" "}
                <code>VISIBLE/HIDDEN → DELETED</code>만 허용합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedPostDetail ? (
                <p className="text-sm text-muted-foreground">
                  게시글 상세를 선택하세요.
                </p>
              ) : (
                <>
                  {postModerationSuccess ? (
                    <Alert>
                      <AlertCircle className="size-4" />
                      <AlertTitle>게시글 moderation 완료</AlertTitle>
                      <AlertDescription>{postModerationSuccess}</AlertDescription>
                    </Alert>
                  ) : null}

                  {postModerationError ? (
                    <SectionAlert
                      title="게시글 moderation 실패"
                      description={postModerationError}
                    />
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    {availableModerationTargets(selectedPostDetail.moderationStatus).length ? (
                      availableModerationTargets(selectedPostDetail.moderationStatus).map(
                        (target) => {
                          const Icon = moderationActionIcon(target);
                          return (
                            <Button
                              key={target}
                              variant={target === "DELETED" ? "destructive" : "outline"}
                              disabled={postModerationPending}
                              onClick={() => void onPostModeration(target)}
                            >
                              <Icon className="size-4" />
                              {moderationActionLabel(target)}
                            </Button>
                          );
                        },
                      )
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        변경 가능한 moderation 액션이 없습니다.
                      </p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
