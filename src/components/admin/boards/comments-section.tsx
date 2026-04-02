"use client";

import { MessageSquareText } from "lucide-react";
import { FormField } from "@/components/admin/form-field";
import { SectionAlert } from "@/components/admin/section-alert";
import { SelectField } from "@/components/admin/users/select-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  AdminBoardCommentSummary,
  BoardModerationStatus,
} from "@/features/admin/types";
import { formatDateTime } from "@/lib/format/date";
import {
  moderationStatusOptions,
  pageSizeOptions,
  type BoardModerationFilterOption,
  type BoardPageSizeOption,
} from "@/components/admin/boards/constants";
import {
  availableModerationTargets,
  formatText,
  moderationActionIcon,
  moderationActionLabel,
  moderationClasses,
} from "@/components/admin/boards/helpers";

interface CommentsSectionProps {
  query: string;
  moderationStatus: BoardModerationFilterOption;
  authorId: string;
  postId: string;
  pageSize: BoardPageSizeOption;
  hasPrevious: boolean;
  hasNext: boolean;
  comments: AdminBoardCommentSummary[];
  commentsError: string | null;
  commentModerationError: string | null;
  commentModerationSuccess: string | null;
  commentModerationPendingId: string | null;
  onQueryChange: (value: string) => void;
  onModerationStatusChange: (value: BoardModerationFilterOption) => void;
  onAuthorIdChange: (value: string) => void;
  onPostIdChange: (value: string) => void;
  onPageSizeChange: (value: BoardPageSizeOption) => void;
  onResetFilters: () => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onSelectPost: (postId: string) => void;
  onCommentModeration: (
    commentId: string,
    status: BoardModerationStatus,
  ) => void | Promise<void>;
}

export function CommentsSection({
  query,
  moderationStatus,
  authorId,
  postId,
  pageSize,
  hasPrevious,
  hasNext,
  comments,
  commentsError,
  commentModerationError,
  commentModerationSuccess,
  commentModerationPendingId,
  onQueryChange,
  onModerationStatusChange,
  onAuthorIdChange,
  onPostIdChange,
  onPageSizeChange,
  onResetFilters,
  onPreviousPage,
  onNextPage,
  onSelectPost,
  onCommentModeration,
}: CommentsSectionProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>댓글 필터</CardTitle>
          <CardDescription>
            query/postId/authorId/moderation 기준으로 댓글을 조회합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="검색" htmlFor="comment-query">
              <Input
                id="comment-query"
                value={query}
                placeholder="댓글, 게시글, 작성자"
                onChange={(event) => onQueryChange(event.target.value)}
              />
            </FormField>
            <SelectField
              label="moderation"
              value={moderationStatus}
              options={moderationStatusOptions}
              onChange={(value) =>
                onModerationStatusChange(value as BoardModerationFilterOption)
              }
              getLabel={(option) => (option === "ALL" ? "전체" : option)}
            />
            <FormField label="postId" htmlFor="comment-post-id">
              <Input
                id="comment-post-id"
                value={postId}
                placeholder="특정 게시글 ID"
                onChange={(event) => onPostIdChange(event.target.value)}
              />
            </FormField>
            <FormField label="authorId" htmlFor="comment-author-id">
              <Input
                id="comment-author-id"
                value={authorId}
                placeholder="특정 작성자 UID"
                onChange={(event) => onAuthorIdChange(event.target.value)}
              />
            </FormField>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              댓글 목록 기본 정렬은 <code>createdAt DESC</code>입니다.
            </p>
            <div className="flex flex-wrap gap-2">
              <SelectField
                label=""
                value={pageSize}
                options={pageSizeOptions}
                onChange={(value) => onPageSizeChange(value as BoardPageSizeOption)}
                widthClassName="w-24"
              />
              <Button variant="outline" onClick={onResetFilters}>
                필터 초기화
              </Button>
              <Button variant="outline" disabled={!hasPrevious} onClick={onPreviousPage}>
                이전
              </Button>
              <Button variant="outline" disabled={!hasNext} onClick={onNextPage}>
                다음
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {commentModerationSuccess ? (
        <Alert>
          <MessageSquareText className="size-4" />
          <AlertTitle>댓글 moderation 완료</AlertTitle>
          <AlertDescription>{commentModerationSuccess}</AlertDescription>
        </Alert>
      ) : null}

      {commentModerationError ? (
        <SectionAlert title="댓글 moderation 실패" description={commentModerationError} />
      ) : null}

      {commentsError ? (
        <SectionAlert title="댓글 목록 조회 실패" description={commentsError} />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>댓글 목록</CardTitle>
          <CardDescription>
            댓글 단위 moderation과 게시글 상세 이동을 함께 지원합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {comments.length ? (
            comments.map((comment) => {
              const targets = availableModerationTargets(comment.moderationStatus);
              return (
                <div
                  key={comment.id}
                  className="space-y-3 rounded-2xl border border-border/70 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium">{comment.postTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        postId: {comment.postId}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={moderationClasses(comment.moderationStatus)}
                    >
                      {comment.moderationStatus}
                    </Badge>
                  </div>

                  <p className="whitespace-pre-wrap text-sm">
                    {comment.contentPreview}
                  </p>

                  <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                    <p>
                      작성자: {formatText(comment.authorNickname)} /{" "}
                      {formatText(comment.authorRealname)}
                    </p>
                    <p>parentCommentId: {formatText(comment.parentCommentId)}</p>
                    <p className="break-all">authorId: {comment.authorId}</p>
                    <p>createdAt: {formatDateTime(comment.createdAt)}</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSelectPost(comment.postId)}
                    >
                      게시글 상세 보기
                    </Button>
                    <div className="flex flex-wrap gap-2">
                      {targets.length ? (
                        targets.map((target) => {
                          const Icon = moderationActionIcon(target);
                          return (
                            <Button
                              key={target}
                              size="sm"
                              variant={target === "DELETED" ? "destructive" : "outline"}
                              disabled={commentModerationPendingId === comment.id}
                              onClick={() => void onCommentModeration(comment.id, target)}
                            >
                              <Icon className="size-4" />
                              {moderationActionLabel(target)}
                            </Button>
                          );
                        })
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          변경 가능한 moderation 액션 없음
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">
              현재 조건에 맞는 댓글이 없습니다.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
