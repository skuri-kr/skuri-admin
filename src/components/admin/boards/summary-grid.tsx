"use client";

import { MetricCard } from "@/components/admin/metric-card";
import type {
  AdminBoardCommentSummary,
  AdminBoardPostSummary,
  BoardModerationStatus,
  PageResponse,
} from "@/features/admin/types";

interface BoardsSummaryGridProps {
  postsData: PageResponse<AdminBoardPostSummary> | null;
  commentsData: PageResponse<AdminBoardCommentSummary> | null;
  postCounts: Record<BoardModerationStatus, number>;
  commentCounts: Record<BoardModerationStatus, number>;
}

export function BoardsSummaryGrid({
  postsData,
  commentsData,
  postCounts,
  commentCounts,
}: BoardsSummaryGridProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-4">
      <MetricCard
        label="게시글 수"
        value={postsData?.totalElements ?? 0}
        description={`현재 페이지 ${postCounts.VISIBLE} visible / ${postCounts.HIDDEN} hidden / ${postCounts.DELETED} deleted`}
      />
      <MetricCard
        label="댓글 수"
        value={commentsData?.totalElements ?? 0}
        description={`현재 페이지 ${commentCounts.VISIBLE} visible / ${commentCounts.HIDDEN} hidden / ${commentCounts.DELETED} deleted`}
      />
      <MetricCard
        label="게시글 기본 정렬"
        value="createdAt DESC"
        description="query/category/status/authorId 필터를 지원합니다."
      />
      <MetricCard
        label="남은 follow-up"
        value="신고 연계 뷰"
        description="post reports 연계 뷰와 pin 정책은 아직 구현 범위 밖입니다."
      />
    </div>
  );
}
