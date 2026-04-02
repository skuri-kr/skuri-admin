"use client";

import { FormField } from "@/components/admin/form-field";
import { SectionAlert } from "@/components/admin/section-alert";
import { SelectField } from "@/components/admin/users/select-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format/date";
import type { AdminBoardPostSummary } from "@/features/admin/types";
import {
  categoryOptions,
  pageSizeOptions,
  moderationStatusOptions,
  type BoardCategoryOption,
  type BoardModerationFilterOption,
  type BoardPageSizeOption,
} from "@/components/admin/boards/constants";
import {
  formatText,
  moderationClasses,
} from "@/components/admin/boards/helpers";

interface PostsSectionProps {
  query: string;
  category: BoardCategoryOption;
  moderationStatus: BoardModerationFilterOption;
  authorId: string;
  pageSize: BoardPageSizeOption;
  hasPrevious: boolean;
  hasNext: boolean;
  posts: AdminBoardPostSummary[];
  postsError: string | null;
  selectedPostId: string | null;
  onQueryChange: (value: string) => void;
  onCategoryChange: (value: BoardCategoryOption) => void;
  onModerationStatusChange: (value: BoardModerationFilterOption) => void;
  onAuthorIdChange: (value: string) => void;
  onPageSizeChange: (value: BoardPageSizeOption) => void;
  onResetFilters: () => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onSelectPost: (postId: string) => void;
}

export function PostsSection({
  query,
  category,
  moderationStatus,
  authorId,
  pageSize,
  hasPrevious,
  hasNext,
  posts,
  postsError,
  selectedPostId,
  onQueryChange,
  onCategoryChange,
  onModerationStatusChange,
  onAuthorIdChange,
  onPageSizeChange,
  onResetFilters,
  onPreviousPage,
  onNextPage,
  onSelectPost,
}: PostsSectionProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>게시글 필터</CardTitle>
          <CardDescription>
            query/category/status/authorId 기준으로 서버 목록을 조회합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <FormField label="검색" htmlFor="post-query">
              <Input
                id="post-query"
                value={query}
                placeholder="제목, 본문, 작성자"
                onChange={(event) => onQueryChange(event.target.value)}
              />
            </FormField>
            <SelectField
              label="카테고리"
              value={category}
              options={categoryOptions}
              onChange={(value) => onCategoryChange(value as BoardCategoryOption)}
              getLabel={(option) => (option === "ALL" ? "전체" : option)}
            />
            <SelectField
              label="moderation"
              value={moderationStatus}
              options={moderationStatusOptions}
              onChange={(value) =>
                onModerationStatusChange(value as BoardModerationFilterOption)
              }
              getLabel={(option) => (option === "ALL" ? "전체" : option)}
            />
            <FormField label="authorId" htmlFor="post-author-id">
              <Input
                id="post-author-id"
                value={authorId}
                placeholder="특정 작성자 UID"
                onChange={(event) => onAuthorIdChange(event.target.value)}
              />
            </FormField>
            <SelectField
              label="page size"
              value={pageSize}
              options={pageSizeOptions}
              onChange={(value) => onPageSizeChange(value as BoardPageSizeOption)}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              게시글 목록 기본 정렬은 <code>createdAt DESC</code>입니다.
            </p>
            <div className="flex flex-wrap gap-2">
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

      {postsError ? (
        <SectionAlert title="게시글 목록 조회 실패" description={postsError} />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>게시글 목록</CardTitle>
          <CardDescription>
            행을 누르면 상세 modal에서 본문과 moderation 액션을 확인할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-border/70">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>상태</TableHead>
                  <TableHead>카테고리</TableHead>
                  <TableHead>제목</TableHead>
                  <TableHead>작성자</TableHead>
                  <TableHead>익명</TableHead>
                  <TableHead>반응</TableHead>
                  <TableHead>생성일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.length ? (
                  posts.map((post) => {
                    const active = post.id === selectedPostId;
                    return (
                      <TableRow
                        key={post.id}
                        className={cn(
                          "cursor-pointer",
                          active && "bg-muted/60 hover:bg-muted/60",
                        )}
                        onClick={() => onSelectPost(post.id)}
                      >
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={moderationClasses(post.moderationStatus)}
                          >
                            {post.moderationStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{post.category}</Badge>
                        </TableCell>
                        <TableCell className="min-w-72">
                          <div className="space-y-1">
                            <p className="font-medium">{post.title}</p>
                            <p className="text-xs text-muted-foreground">{post.id}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p>{formatText(post.authorNickname)}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatText(post.authorRealname)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{post.isAnonymous ? "true" : "false"}</TableCell>
                        <TableCell>
                          댓글 {post.commentCount} / 좋아요 {post.likeCount}
                        </TableCell>
                        <TableCell>{formatDateTime(post.createdAt)}</TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-12 text-center text-sm text-muted-foreground"
                    >
                      현재 조건에 맞는 게시글이 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
