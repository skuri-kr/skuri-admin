"use client";

import { AlertCircle } from "lucide-react";
import { CommentsSection } from "@/components/admin/boards/comments-section";
import {
  type BoardCategoryOption,
  type BoardModerationFilterOption,
  type BoardPageSizeOption,
} from "@/components/admin/boards/constants";
import { PostDetailDialog } from "@/components/admin/boards/post-detail-dialog";
import {
  moderationLabel,
} from "@/components/admin/boards/helpers";
import { PostsSection } from "@/components/admin/boards/posts-section";
import { BoardsSummaryGrid } from "@/components/admin/boards/summary-grid";
import { PageLoadingState } from "@/components/admin/page-status";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type {
  AdminBoardCommentSummary,
  AdminBoardPostDetail,
  AdminBoardPostSummary,
  ApiResponse,
  BoardModerationResponse,
  BoardModerationStatus,
  PageResponse,
} from "@/features/admin/types";
import { useAuth } from "@/features/auth/auth-context";
import { getAuthorizedJson } from "@/lib/api/authenticated-client";
import { ApiError } from "@/lib/api/http";
import { getApiBaseUrl } from "@/lib/env/public-env";
import { useEffect, useMemo, useState } from "react";

export default function BoardsPage() {
  const { user, isAdminVerified } = useAuth();

  const [postQuery, setPostQuery] = useState("");
  const [postCategory, setPostCategory] =
    useState<BoardCategoryOption>("ALL");
  const [postModerationStatus, setPostModerationStatus] =
    useState<BoardModerationFilterOption>("ALL");
  const [postAuthorId, setPostAuthorId] = useState("");
  const [postPage, setPostPage] = useState(0);
  const [postPageSize, setPostPageSize] = useState<BoardPageSizeOption>("20");
  const [postsRefreshKey, setPostsRefreshKey] = useState(0);

  const [commentQuery, setCommentQuery] = useState("");
  const [commentModerationStatus, setCommentModerationStatus] =
    useState<BoardModerationFilterOption>("ALL");
  const [commentAuthorId, setCommentAuthorId] = useState("");
  const [commentPostId, setCommentPostId] = useState("");
  const [commentPage, setCommentPage] = useState(0);
  const [commentPageSize, setCommentPageSize] = useState<BoardPageSizeOption>("20");
  const [commentsRefreshKey, setCommentsRefreshKey] = useState(0);

  const [postsData, setPostsData] =
    useState<PageResponse<AdminBoardPostSummary> | null>(null);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState<string | null>(null);

  const [commentsData, setCommentsData] =
    useState<PageResponse<AdminBoardCommentSummary> | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsError, setCommentsError] = useState<string | null>(null);

  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [selectedPostDetail, setSelectedPostDetail] =
    useState<AdminBoardPostDetail | null>(null);
  const [postDetailLoading, setPostDetailLoading] = useState(false);
  const [postDetailError, setPostDetailError] = useState<string | null>(null);
  const [postDetailRefreshKey, setPostDetailRefreshKey] = useState(0);

  const [postModerationPending, setPostModerationPending] = useState(false);
  const [postModerationError, setPostModerationError] = useState<string | null>(
    null,
  );
  const [postModerationSuccess, setPostModerationSuccess] = useState<string | null>(
    null,
  );
  const [commentModerationPendingId, setCommentModerationPendingId] = useState<
    string | null
  >(null);
  const [commentModerationError, setCommentModerationError] = useState<
    string | null
  >(null);
  const [commentModerationSuccess, setCommentModerationSuccess] = useState<
    string | null
  >(null);

  useEffect(() => {
    setPostPage(0);
  }, [postAuthorId, postCategory, postModerationStatus, postPageSize, postQuery]);

  useEffect(() => {
    setCommentPage(0);
  }, [
    commentAuthorId,
    commentModerationStatus,
    commentPageSize,
    commentPostId,
    commentQuery,
  ]);

  useEffect(() => {
    if (!user || !isAdminVerified) {
      return;
    }

    const controller = new AbortController();

    const loadPosts = async () => {
      setPostsLoading(true);
      setPostsError(null);

      try {
        const params = new URLSearchParams({
          page: String(postPage),
          size: postPageSize,
        });

        if (postQuery.trim()) {
          params.set("query", postQuery.trim());
        }
        if (postAuthorId.trim()) {
          params.set("authorId", postAuthorId.trim());
        }
        if (postCategory !== "ALL") {
          params.set("category", postCategory);
        }
        if (postModerationStatus !== "ALL") {
          params.set("moderationStatus", postModerationStatus);
        }

        const response = await getAuthorizedJson<
          ApiResponse<PageResponse<AdminBoardPostSummary>>
        >(user, `${getApiBaseUrl()}/v1/admin/posts?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setPostsData(response.data);
        }
      } catch (caughtError) {
        if (!controller.signal.aborted) {
          setPostsError(
            caughtError instanceof ApiError
              ? caughtError.message
              : "게시글 목록을 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setPostsLoading(false);
        }
      }
    };

    void loadPosts();

    return () => controller.abort();
  }, [
    isAdminVerified,
    postAuthorId,
    postCategory,
    postModerationStatus,
    postPage,
    postPageSize,
    postQuery,
    postsRefreshKey,
    user,
  ]);

  useEffect(() => {
    if (!user || !isAdminVerified) {
      return;
    }

    const controller = new AbortController();

    const loadComments = async () => {
      setCommentsLoading(true);
      setCommentsError(null);

      try {
        const params = new URLSearchParams({
          page: String(commentPage),
          size: commentPageSize,
        });

        if (commentQuery.trim()) {
          params.set("query", commentQuery.trim());
        }
        if (commentPostId.trim()) {
          params.set("postId", commentPostId.trim());
        }
        if (commentAuthorId.trim()) {
          params.set("authorId", commentAuthorId.trim());
        }
        if (commentModerationStatus !== "ALL") {
          params.set("moderationStatus", commentModerationStatus);
        }

        const response = await getAuthorizedJson<
          ApiResponse<PageResponse<AdminBoardCommentSummary>>
        >(user, `${getApiBaseUrl()}/v1/admin/comments?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setCommentsData(response.data);
        }
      } catch (caughtError) {
        if (!controller.signal.aborted) {
          setCommentsError(
            caughtError instanceof ApiError
              ? caughtError.message
              : "댓글 목록을 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setCommentsLoading(false);
        }
      }
    };

    void loadComments();

    return () => controller.abort();
  }, [
    commentAuthorId,
    commentModerationStatus,
    commentPage,
    commentPageSize,
    commentPostId,
    commentQuery,
    commentsRefreshKey,
    isAdminVerified,
    user,
  ]);

  useEffect(() => {
    if (!user || !isAdminVerified || !selectedPostId || !isPostDialogOpen) {
      setSelectedPostDetail(null);
      setPostDetailLoading(false);
      setPostDetailError(null);
      return;
    }

    const controller = new AbortController();

    const loadPostDetail = async () => {
      setPostDetailLoading(true);
      setPostDetailError(null);

      try {
        const response = await getAuthorizedJson<ApiResponse<AdminBoardPostDetail>>(
          user,
          `${getApiBaseUrl()}/v1/admin/posts/${selectedPostId}`,
          { signal: controller.signal },
        );

        if (!controller.signal.aborted) {
          setSelectedPostDetail(response.data);
        }
      } catch (caughtError) {
        if (!controller.signal.aborted) {
          setSelectedPostDetail(null);
          setPostDetailError(
            caughtError instanceof ApiError
              ? caughtError.message
              : "게시글 상세를 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setPostDetailLoading(false);
        }
      }
    };

    void loadPostDetail();

    return () => controller.abort();
  }, [isAdminVerified, isPostDialogOpen, postDetailRefreshKey, selectedPostId, user]);

  useEffect(() => {
    if (!selectedPostDetail) {
      setPostModerationError(null);
      setPostModerationSuccess(null);
      return;
    }

    setPostModerationError(null);
    setPostModerationSuccess(null);
  }, [selectedPostDetail]);

  const posts = useMemo(() => postsData?.content ?? [], [postsData]);
  const comments = useMemo(() => commentsData?.content ?? [], [commentsData]);
  const selectedPostSummary = useMemo(
    () => posts.find((post) => post.id === selectedPostId) ?? null,
    [posts, selectedPostId],
  );

  const postCounts = useMemo(
    () =>
      posts.reduce<Record<BoardModerationStatus, number>>(
        (accumulator, post) => {
          accumulator[post.moderationStatus] += 1;
          return accumulator;
        },
        {
          VISIBLE: 0,
          HIDDEN: 0,
          DELETED: 0,
        },
      ),
    [posts],
  );

  const commentCounts = useMemo(
    () =>
      comments.reduce<Record<BoardModerationStatus, number>>(
        (accumulator, comment) => {
          accumulator[comment.moderationStatus] += 1;
          return accumulator;
        },
        {
          VISIBLE: 0,
          HIDDEN: 0,
          DELETED: 0,
        },
      ),
    [comments],
  );

  const handlePostModeration = async (status: BoardModerationStatus) => {
    if (!user || !selectedPostDetail) {
      return;
    }

    setPostModerationPending(true);
    setPostModerationError(null);
    setPostModerationSuccess(null);

    try {
      const response = await getAuthorizedJson<ApiResponse<BoardModerationResponse>>(
        user,
        `${getApiBaseUrl()}/v1/admin/posts/${selectedPostDetail.id}/moderation`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );

      setSelectedPostDetail((current) =>
        current
          ? { ...current, moderationStatus: response.data.moderationStatus }
          : current,
      );
      setPostsData((current) =>
        current
          ? {
              ...current,
              content: current.content.map((post) =>
                post.id === response.data.id
                  ? { ...post, moderationStatus: response.data.moderationStatus }
                  : post,
              ),
            }
          : current,
      );
      setPostsRefreshKey((current) => current + 1);
      setPostDetailRefreshKey((current) => current + 1);
      setPostModerationSuccess(
        `게시글 상태를 ${moderationLabel(response.data.moderationStatus)}로 변경했습니다.`,
      );
    } catch (caughtError) {
      setPostModerationError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "게시글 moderation 상태를 변경하지 못했습니다.",
      );
    } finally {
      setPostModerationPending(false);
    }
  };

  const handleCommentModeration = async (
    commentId: string,
    status: BoardModerationStatus,
  ) => {
    if (!user) {
      return;
    }

    setCommentModerationPendingId(commentId);
    setCommentModerationError(null);
    setCommentModerationSuccess(null);

    try {
      const response = await getAuthorizedJson<ApiResponse<BoardModerationResponse>>(
        user,
        `${getApiBaseUrl()}/v1/admin/comments/${commentId}/moderation`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );

      setCommentsData((current) =>
        current
          ? {
              ...current,
              content: current.content.map((comment) =>
                comment.id === response.data.id
                  ? { ...comment, moderationStatus: response.data.moderationStatus }
                  : comment,
              ),
            }
          : current,
      );
      setCommentsRefreshKey((current) => current + 1);
      setPostsRefreshKey((current) => current + 1);
      setPostDetailRefreshKey((current) => current + 1);
      setCommentModerationSuccess(
        `댓글 상태를 ${moderationLabel(response.data.moderationStatus)}로 변경했습니다.`,
      );
    } catch (caughtError) {
      setCommentModerationError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "댓글 moderation 상태를 변경하지 못했습니다.",
      );
    } finally {
      setCommentModerationPendingId(null);
    }
  };

  if (postsLoading && commentsLoading && !postsData && !commentsData) {
    return <PageLoadingState label="게시글/댓글 관리자 목록을 불러오는 중입니다." />;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Board Moderation
        </p>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">게시물 관리</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            게시글 목록과 댓글 moderation을 shadcn 기반 운영 화면으로 정리했습니다.
            현재 Spring Admin API 범위에서는 게시글/댓글 상태를{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">VISIBLE</code>,{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">HIDDEN</code>,{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">DELETED</code>
            로만 제어합니다.
          </p>
        </div>
      </div>

      <BoardsSummaryGrid
        postsData={postsData}
        commentsData={commentsData}
        postCounts={postCounts}
        commentCounts={commentCounts}
      />

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <PostsSection
          query={postQuery}
          category={postCategory}
          moderationStatus={postModerationStatus}
          authorId={postAuthorId}
          pageSize={postPageSize}
          hasPrevious={Boolean(postsData?.hasPrevious)}
          hasNext={Boolean(postsData?.hasNext)}
          posts={posts}
          postsError={postsError}
          selectedPostId={selectedPostId}
          onQueryChange={setPostQuery}
          onCategoryChange={setPostCategory}
          onModerationStatusChange={setPostModerationStatus}
          onAuthorIdChange={setPostAuthorId}
          onPageSizeChange={setPostPageSize}
          onResetFilters={() => {
            setPostQuery("");
            setPostCategory("ALL");
            setPostModerationStatus("ALL");
            setPostAuthorId("");
            setPostPageSize("20");
          }}
          onPreviousPage={() => setPostPage((current) => Math.max(0, current - 1))}
          onNextPage={() => setPostPage((current) => current + 1)}
          onSelectPost={(postId) => {
            setSelectedPostId(postId);
            setIsPostDialogOpen(true);
          }}
        />

        <CommentsSection
          query={commentQuery}
          moderationStatus={commentModerationStatus}
          authorId={commentAuthorId}
          postId={commentPostId}
          pageSize={commentPageSize}
          hasPrevious={Boolean(commentsData?.hasPrevious)}
          hasNext={Boolean(commentsData?.hasNext)}
          comments={comments}
          commentsError={commentsError}
          commentModerationError={commentModerationError}
          commentModerationSuccess={commentModerationSuccess}
          commentModerationPendingId={commentModerationPendingId}
          onQueryChange={setCommentQuery}
          onModerationStatusChange={setCommentModerationStatus}
          onAuthorIdChange={setCommentAuthorId}
          onPostIdChange={setCommentPostId}
          onPageSizeChange={setCommentPageSize}
          onResetFilters={() => {
            setCommentQuery("");
            setCommentModerationStatus("ALL");
            setCommentPostId("");
            setCommentAuthorId("");
            setCommentPageSize("20");
          }}
          onPreviousPage={() => setCommentPage((current) => Math.max(0, current - 1))}
          onNextPage={() => setCommentPage((current) => current + 1)}
          onSelectPost={(postId) => {
            setSelectedPostId(postId);
            setIsPostDialogOpen(true);
          }}
          onCommentModeration={handleCommentModeration}
        />
      </div>

      <Alert>
        <AlertCircle className="size-4" />
        <AlertTitle>남은 follow-up</AlertTitle>
        <AlertDescription>
          신고 연계 운영 뷰(
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            GET /v1/admin/posts/{'{postId}'}/reports
          </code>
          )와 pin/공지 고정 정책은 아직 구현 범위 밖입니다.
        </AlertDescription>
      </Alert>

      <PostDetailDialog
        open={isPostDialogOpen}
        onOpenChange={setIsPostDialogOpen}
        selectedPostDetail={selectedPostDetail}
        selectedPostSummary={selectedPostSummary}
        postDetailLoading={postDetailLoading}
        postDetailError={postDetailError}
        postModerationPending={postModerationPending}
        postModerationError={postModerationError}
        postModerationSuccess={postModerationSuccess}
        onPostModeration={handlePostModeration}
      />
    </div>
  );
}
