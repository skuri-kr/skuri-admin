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
import { formatDateTime } from "@/lib/format/date";
import { useEffect, useMemo, useState } from "react";

const pageSizeOptions = ["20", "50", "100"] as const;
const categoryOptions = [
  "ALL",
  "GENERAL",
  "QUESTION",
  "REVIEW",
  "ANNOUNCEMENT",
] as const;
const moderationStatusOptions = ["ALL", "VISIBLE", "HIDDEN", "DELETED"] as const;

function moderationPalette(status: BoardModerationStatus) {
  switch (status) {
    case "VISIBLE":
      return "green";
    case "HIDDEN":
      return "orange";
    case "DELETED":
      return "red";
  }
}

function moderationLabel(status: BoardModerationStatus) {
  switch (status) {
    case "VISIBLE":
      return "노출";
    case "HIDDEN":
      return "숨김";
    case "DELETED":
      return "삭제";
  }
}

function availableModerationTargets(
  current: BoardModerationStatus,
): BoardModerationStatus[] {
  switch (current) {
    case "VISIBLE":
      return ["HIDDEN", "DELETED"];
    case "HIDDEN":
      return ["VISIBLE", "DELETED"];
    case "DELETED":
      return [];
  }
}

function moderationActionLabel(target: BoardModerationStatus) {
  switch (target) {
    case "VISIBLE":
      return "복구";
    case "HIDDEN":
      return "숨김";
    case "DELETED":
      return "삭제";
  }
}

function formatText(value: string | null | undefined) {
  return value && value.trim().length ? value : "-";
}

export default function BoardsPage() {
  const { user, isAdminVerified } = useAuth();

  const [postQuery, setPostQuery] = useState("");
  const [postCategory, setPostCategory] =
    useState<(typeof categoryOptions)[number]>("ALL");
  const [postModerationStatus, setPostModerationStatus] =
    useState<(typeof moderationStatusOptions)[number]>("ALL");
  const [postAuthorId, setPostAuthorId] = useState("");
  const [postPage, setPostPage] = useState(0);
  const [postPageSize, setPostPageSize] =
    useState<(typeof pageSizeOptions)[number]>("20");
  const [postsRefreshKey, setPostsRefreshKey] = useState(0);

  const [commentQuery, setCommentQuery] = useState("");
  const [commentModerationStatus, setCommentModerationStatus] =
    useState<(typeof moderationStatusOptions)[number]>("ALL");
  const [commentAuthorId, setCommentAuthorId] = useState("");
  const [commentPostId, setCommentPostId] = useState("");
  const [commentPage, setCommentPage] = useState(0);
  const [commentPageSize, setCommentPageSize] =
    useState<(typeof pageSizeOptions)[number]>("20");
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
  const [postModerationError, setPostModerationError] = useState<string | null>(null);
  const [postModerationSuccess, setPostModerationSuccess] = useState<string | null>(null);
  const [commentModerationPendingId, setCommentModerationPendingId] = useState<
    string | null
  >(null);
  const [commentModerationError, setCommentModerationError] = useState<string | null>(
    null,
  );
  const [commentModerationSuccess, setCommentModerationSuccess] =
    useState<string | null>(null);

  useEffect(() => {
    setPostPage(0);
  }, [postAuthorId, postCategory, postModerationStatus, postPageSize, postQuery]);

  useEffect(() => {
    setCommentPage(0);
  }, [commentAuthorId, commentModerationStatus, commentPageSize, commentPostId, commentQuery]);

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
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
          }),
        },
      );

      setSelectedPostDetail((current) =>
        current
          ? {
              ...current,
              moderationStatus: response.data.moderationStatus,
            }
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
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
          }),
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
    <Stack gap="6">
      <Stack gap="3">
        <Text
          fontSize="xs"
          fontWeight="700"
          letterSpacing="0.18em"
          textTransform="uppercase"
          color="gray.500"
        >
          Board Moderation
        </Text>
        <Heading size="2xl">게시물 관리</Heading>
        <Text color="gray.600" _dark={{ color: "gray.300" }}>
          게시글 목록/상세 조회와 게시글·댓글 moderation(`VISIBLE`, `HIDDEN`,
          `DELETED`)을 현재 Spring Admin API에 맞춰 연결합니다.
        </Text>
      </Stack>

      <Grid templateColumns={{ base: "1fr", xl: "repeat(4, minmax(0, 1fr))" }} gap="4">
        <Card.Root>
          <Card.Body gap="1">
            <Text fontSize="sm" color="gray.500">
              게시글 수
            </Text>
            <Heading size="xl">{postsData?.totalElements ?? 0}</Heading>
            <Text fontSize="sm" color="gray.500">
              현재 페이지 {postCounts.VISIBLE} visible / {postCounts.HIDDEN} hidden /{" "}
              {postCounts.DELETED} deleted
            </Text>
          </Card.Body>
        </Card.Root>
        <Card.Root>
          <Card.Body gap="1">
            <Text fontSize="sm" color="gray.500">
              댓글 수
            </Text>
            <Heading size="xl">{commentsData?.totalElements ?? 0}</Heading>
            <Text fontSize="sm" color="gray.500">
              현재 페이지 {commentCounts.VISIBLE} visible / {commentCounts.HIDDEN} hidden /{" "}
              {commentCounts.DELETED} deleted
            </Text>
          </Card.Body>
        </Card.Root>
        <Card.Root>
          <Card.Body gap="1">
            <Text fontSize="sm" color="gray.500">
              게시글 기본 정렬
            </Text>
            <Heading size="md">createdAt DESC</Heading>
            <Text fontSize="sm" color="gray.500">
              query/category/status/authorId 필터를 지원합니다.
            </Text>
          </Card.Body>
        </Card.Root>
        <Card.Root>
          <Card.Body gap="1">
            <Text fontSize="sm" color="gray.500">
              남은 follow-up
            </Text>
            <Heading size="md">신고 연계 뷰, pin 정책</Heading>
            <Text fontSize="sm" color="gray.500">
              현재 PR 범위 밖 기능은 그대로 남겨둡니다.
            </Text>
          </Card.Body>
        </Card.Root>
      </Grid>

      <Grid templateColumns={{ base: "1fr", "2xl": "minmax(0, 1.1fr) minmax(0, 0.9fr)" }} gap="6">
        <Stack gap="4">
          <Card.Root>
            <Card.Header>
              <Heading size="md">게시글 필터</Heading>
            </Card.Header>
            <Card.Body>
              <Grid
                templateColumns={{ base: "1fr", md: "repeat(2, minmax(0, 1fr))", xl: "repeat(5, minmax(0, 1fr))" }}
                gap="4"
              >
                <Field.Root>
                  <Field.Label>검색</Field.Label>
                  <Input
                    value={postQuery}
                    placeholder="제목, 본문, 작성자"
                    onChange={(event) => setPostQuery(event.target.value)}
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label>카테고리</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={postCategory}
                      onChange={(event) =>
                        setPostCategory(
                          event.target.value as (typeof categoryOptions)[number],
                        )
                      }
                    >
                      {categoryOptions.map((category) => (
                        <option key={category} value={category}>
                          {category === "ALL" ? "전체" : category}
                        </option>
                      ))}
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>

                <Field.Root>
                  <Field.Label>moderation</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={postModerationStatus}
                      onChange={(event) =>
                        setPostModerationStatus(
                          event.target.value as (typeof moderationStatusOptions)[number],
                        )
                      }
                    >
                      {moderationStatusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status === "ALL" ? "전체" : status}
                        </option>
                      ))}
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>

                <Field.Root>
                  <Field.Label>authorId</Field.Label>
                  <Input
                    value={postAuthorId}
                    placeholder="특정 작성자 UID"
                    onChange={(event) => setPostAuthorId(event.target.value)}
                  />
                </Field.Root>

                <Field.Root maxW={{ base: "full", xl: "120px" }}>
                  <Field.Label>page size</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={postPageSize}
                      onChange={(event) =>
                        setPostPageSize(
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
                  게시글 목록 기본 정렬은 `createdAt DESC`입니다.
                </Text>
                <HStack>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPostQuery("");
                      setPostCategory("ALL");
                      setPostModerationStatus("ALL");
                      setPostAuthorId("");
                      setPostPageSize("20");
                    }}
                  >
                    필터 초기화
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!postsData?.hasPrevious}
                    onClick={() => setPostPage((current) => Math.max(0, current - 1))}
                  >
                    이전
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!postsData?.hasNext}
                    onClick={() => setPostPage((current) => current + 1)}
                  >
                    다음
                  </Button>
                </HStack>
              </HStack>
            </Card.Body>
          </Card.Root>

          {postsError ? (
            <Alert.Root status="error" rounded="xl">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>게시글 목록 조회 실패</Alert.Title>
                <Alert.Description>{postsError}</Alert.Description>
              </Alert.Content>
            </Alert.Root>
          ) : null}

          <Card.Root>
            <Card.Header>
              <Heading size="md">게시글 목록</Heading>
            </Card.Header>
            <Card.Body gap="4">
              <Box overflowX="auto">
                <Table.Root size="sm">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>상태</Table.ColumnHeader>
                      <Table.ColumnHeader>카테고리</Table.ColumnHeader>
                      <Table.ColumnHeader>제목</Table.ColumnHeader>
                      <Table.ColumnHeader>작성자</Table.ColumnHeader>
                      <Table.ColumnHeader>익명</Table.ColumnHeader>
                      <Table.ColumnHeader>반응</Table.ColumnHeader>
                      <Table.ColumnHeader>생성일</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {posts.map((post) => {
                      const active = post.id === selectedPostId;
                      return (
                        <Table.Row
                          key={post.id}
                          bg={active ? "teal.50" : undefined}
                          _dark={{ bg: active ? "whiteAlpha.100" : undefined }}
                          _hover={{ bg: "blackAlpha.50", _dark: { bg: "whiteAlpha.100" } }}
                          cursor="pointer"
                          onClick={() => {
                            setSelectedPostId(post.id);
                            setIsPostDialogOpen(true);
                          }}
                        >
                          <Table.Cell>
                            <Badge colorPalette={moderationPalette(post.moderationStatus)}>
                              {post.moderationStatus}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge variant="subtle">{post.category}</Badge>
                          </Table.Cell>
                          <Table.Cell>
                            <Stack gap="1">
                              <Text fontWeight="semibold">{post.title}</Text>
                              <Text fontSize="xs" color="gray.500" wordBreak="break-all">
                                {post.id}
                              </Text>
                            </Stack>
                          </Table.Cell>
                          <Table.Cell>
                            <Stack gap="1">
                              <Text>{formatText(post.authorNickname)}</Text>
                              <Text fontSize="xs" color="gray.500">
                                {formatText(post.authorRealname)}
                              </Text>
                            </Stack>
                          </Table.Cell>
                          <Table.Cell>
                            <Text>{post.isAnonymous ? "true" : "false"}</Text>
                          </Table.Cell>
                          <Table.Cell>
                            <Text>
                              댓글 {post.commentCount} / 좋아요 {post.likeCount}
                            </Text>
                          </Table.Cell>
                          <Table.Cell>
                            <Text>{formatDateTime(post.createdAt)}</Text>
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table.Root>
              </Box>

              {!posts.length ? (
                <Text fontSize="sm" color="gray.500">
                  현재 조건에 맞는 게시글이 없습니다.
                </Text>
              ) : null}
            </Card.Body>
          </Card.Root>
        </Stack>

        <Stack gap="4">
          <Card.Root>
            <Card.Header>
              <Heading size="md">댓글 필터</Heading>
            </Card.Header>
            <Card.Body>
              <Grid
                templateColumns={{ base: "1fr", md: "repeat(2, minmax(0, 1fr))" }}
                gap="4"
              >
                <Field.Root>
                  <Field.Label>검색</Field.Label>
                  <Input
                    value={commentQuery}
                    placeholder="댓글, 게시글, 작성자"
                    onChange={(event) => setCommentQuery(event.target.value)}
                  />
                </Field.Root>
                <Field.Root>
                  <Field.Label>moderation</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={commentModerationStatus}
                      onChange={(event) =>
                        setCommentModerationStatus(
                          event.target.value as (typeof moderationStatusOptions)[number],
                        )
                      }
                    >
                      {moderationStatusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status === "ALL" ? "전체" : status}
                        </option>
                      ))}
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>
                <Field.Root>
                  <Field.Label>postId</Field.Label>
                  <Input
                    value={commentPostId}
                    placeholder="특정 게시글 ID"
                    onChange={(event) => setCommentPostId(event.target.value)}
                  />
                </Field.Root>
                <Field.Root>
                  <Field.Label>authorId</Field.Label>
                  <Input
                    value={commentAuthorId}
                    placeholder="특정 작성자 UID"
                    onChange={(event) => setCommentAuthorId(event.target.value)}
                  />
                </Field.Root>
              </Grid>

              <HStack mt="4" justify="space-between" flexWrap="wrap">
                <Text fontSize="sm" color="gray.500">
                  댓글 목록 기본 정렬은 `createdAt DESC`입니다.
                </Text>
                <HStack>
                  <NativeSelect.Root width="88px">
                    <NativeSelect.Field
                      value={commentPageSize}
                      onChange={(event) =>
                        setCommentPageSize(
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
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCommentQuery("");
                      setCommentModerationStatus("ALL");
                      setCommentPostId("");
                      setCommentAuthorId("");
                      setCommentPageSize("20");
                    }}
                  >
                    필터 초기화
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!commentsData?.hasPrevious}
                    onClick={() => setCommentPage((current) => Math.max(0, current - 1))}
                  >
                    이전
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!commentsData?.hasNext}
                    onClick={() => setCommentPage((current) => current + 1)}
                  >
                    다음
                  </Button>
                </HStack>
              </HStack>
            </Card.Body>
          </Card.Root>

          {commentModerationSuccess ? (
            <Alert.Root status="success" rounded="xl">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>댓글 moderation 완료</Alert.Title>
                <Alert.Description>{commentModerationSuccess}</Alert.Description>
              </Alert.Content>
            </Alert.Root>
          ) : null}

          {commentModerationError ? (
            <Alert.Root status="error" rounded="xl">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>댓글 moderation 실패</Alert.Title>
                <Alert.Description>{commentModerationError}</Alert.Description>
              </Alert.Content>
            </Alert.Root>
          ) : null}

          {commentsError ? (
            <Alert.Root status="error" rounded="xl">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>댓글 목록 조회 실패</Alert.Title>
                <Alert.Description>{commentsError}</Alert.Description>
              </Alert.Content>
            </Alert.Root>
          ) : null}

          <Card.Root>
            <Card.Header>
              <Heading size="md">댓글 목록</Heading>
            </Card.Header>
            <Card.Body gap="4">
              <Stack gap="3">
                {comments.map((comment) => {
                  const targets = availableModerationTargets(comment.moderationStatus);
                  return (
                    <Stack key={comment.id} gap="3" rounded="xl" borderWidth="1px" p="4">
                      <HStack justify="space-between" align="start" flexWrap="wrap">
                        <Stack gap="1">
                          <Text fontWeight="semibold">{comment.postTitle}</Text>
                          <Text fontSize="xs" color="gray.500">
                            postId: {comment.postId}
                          </Text>
                        </Stack>
                        <Badge colorPalette={moderationPalette(comment.moderationStatus)}>
                          {comment.moderationStatus}
                        </Badge>
                      </HStack>

                      <Text whiteSpace="pre-wrap">{comment.contentPreview}</Text>

                      <Grid
                        templateColumns={{ base: "1fr", md: "repeat(2, minmax(0, 1fr))" }}
                        gap="3"
                      >
                        <Text fontSize="sm" color="gray.500">
                          작성자: {formatText(comment.authorNickname)} /{" "}
                          {formatText(comment.authorRealname)}
                        </Text>
                        <Text fontSize="sm" color="gray.500">
                          parentCommentId: {formatText(comment.parentCommentId)}
                        </Text>
                        <Text fontSize="sm" color="gray.500" wordBreak="break-all">
                          authorId: {comment.authorId}
                        </Text>
                        <Text fontSize="sm" color="gray.500">
                          createdAt: {formatDateTime(comment.createdAt)}
                        </Text>
                      </Grid>

                      <HStack justify="space-between" align="start" flexWrap="wrap">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => {
                            setSelectedPostId(comment.postId);
                            setIsPostDialogOpen(true);
                          }}
                        >
                          게시글 상세 보기
                        </Button>
                        <HStack>
                          {targets.length ? (
                            targets.map((target) => (
                              <Button
                                key={target}
                                size="xs"
                                variant={target === "DELETED" ? "solid" : "outline"}
                                colorPalette={target === "DELETED" ? "red" : "gray"}
                                loading={commentModerationPendingId === comment.id}
                                disabled={commentModerationPendingId === comment.id}
                                onClick={() =>
                                  void handleCommentModeration(comment.id, target)
                                }
                              >
                                {moderationActionLabel(target)}
                              </Button>
                            ))
                          ) : (
                            <Text fontSize="sm" color="gray.500">
                              변경 가능한 moderation 액션 없음
                            </Text>
                          )}
                        </HStack>
                      </HStack>
                    </Stack>
                  );
                })}
              </Stack>

              {!comments.length ? (
                <Text fontSize="sm" color="gray.500">
                  현재 조건에 맞는 댓글이 없습니다.
                </Text>
              ) : null}
            </Card.Body>
          </Card.Root>
        </Stack>
      </Grid>

      <Alert.Root status="info" rounded="xl">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>남은 follow-up</Alert.Title>
          <Alert.Description>
            신고 연계 운영 뷰({"`GET /v1/admin/posts/{postId}/reports`"})와
            pin/공지 고정 정책은 아직 구현 범위 밖입니다.
          </Alert.Description>
        </Alert.Content>
      </Alert.Root>

      <Dialog.Root
        lazyMount
        open={isPostDialogOpen}
        onOpenChange={(details) => setIsPostDialogOpen(details.open)}
      >
        <Dialog.Backdrop />
        <Dialog.Positioner px={{ base: "4", md: "6" }}>
          <Dialog.Content maxW="5xl" maxH="85vh">
            <Dialog.Header>
              <Stack gap="1">
                <Dialog.Title>
                  {selectedPostDetail?.title ?? selectedPostSummary?.title ?? "게시글 상세"}
                </Dialog.Title>
                <Text fontSize="sm" color="gray.500">
                  관리자 상세와 moderation 액션은 이 modal에서 처리합니다.
                </Text>
              </Stack>
            </Dialog.Header>
            <Dialog.CloseTrigger />
            <Dialog.Body overflowY="auto" pb="6">
              <Stack gap="5">
                <Card.Root>
                  <Card.Header>
                    <Heading size="md">기본 정보</Heading>
                  </Card.Header>
                  <Card.Body gap="4">
                    {postDetailLoading ? (
                      <Text fontSize="sm" color="gray.500">
                        게시글 상세를 불러오는 중입니다.
                      </Text>
                    ) : postDetailError ? (
                      <Alert.Root status="error" rounded="xl">
                        <Alert.Indicator />
                        <Alert.Content>
                          <Alert.Title>게시글 상세 조회 실패</Alert.Title>
                          <Alert.Description>{postDetailError}</Alert.Description>
                        </Alert.Content>
                      </Alert.Root>
                    ) : !selectedPostDetail ? (
                      <Text fontSize="sm" color="gray.500">
                        게시글을 선택하면 상세 정보가 표시됩니다.
                      </Text>
                    ) : (
                      <Stack gap="4">
                        <Grid
                          templateColumns={{ base: "1fr", md: "repeat(2, minmax(0, 1fr))" }}
                          gap="4"
                        >
                          <Field.Root>
                            <Field.Label>게시글 ID</Field.Label>
                            <Text wordBreak="break-all">{selectedPostDetail.id}</Text>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>moderation</Field.Label>
                            <Badge
                              colorPalette={moderationPalette(
                                selectedPostDetail.moderationStatus,
                              )}
                            >
                              {selectedPostDetail.moderationStatus}
                            </Badge>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>카테고리</Field.Label>
                            <Text>{selectedPostDetail.category}</Text>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>익명 여부</Field.Label>
                            <Text>{selectedPostDetail.isAnonymous ? "true" : "false"}</Text>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>작성자</Field.Label>
                            <Text>
                              {formatText(selectedPostDetail.authorNickname)} /{" "}
                              {formatText(selectedPostDetail.authorRealname)}
                            </Text>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>authorId</Field.Label>
                            <Text wordBreak="break-all">{selectedPostDetail.authorId}</Text>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>생성일</Field.Label>
                            <Text>{formatDateTime(selectedPostDetail.createdAt)}</Text>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>수정일</Field.Label>
                            <Text>{formatDateTime(selectedPostDetail.updatedAt)}</Text>
                          </Field.Root>
                        </Grid>

                        <Grid
                          templateColumns={{ base: "1fr", md: "repeat(4, minmax(0, 1fr))" }}
                          gap="4"
                        >
                          <Field.Root>
                            <Field.Label>조회수</Field.Label>
                            <Text>{selectedPostDetail.viewCount}</Text>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>좋아요</Field.Label>
                            <Text>{selectedPostDetail.likeCount}</Text>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>댓글 수</Field.Label>
                            <Text>{selectedPostDetail.commentCount}</Text>
                          </Field.Root>
                          <Field.Root>
                            <Field.Label>북마크 수</Field.Label>
                            <Text>{selectedPostDetail.bookmarkCount}</Text>
                          </Field.Root>
                        </Grid>

                        <Field.Root>
                          <Field.Label>본문</Field.Label>
                          <Text whiteSpace="pre-wrap">{selectedPostDetail.content}</Text>
                        </Field.Root>

                        <Field.Root>
                          <Field.Label>이미지</Field.Label>
                          {selectedPostDetail.images.length ? (
                            <Stack gap="3">
                              {selectedPostDetail.images.map((image, index) => (
                                <Stack key={`${image.url}-${index}`} gap="1">
                                  <Image
                                    src={image.thumbUrl ?? image.url}
                                    alt={`게시글 이미지 ${index + 1}`}
                                    rounded="xl"
                                    maxH="260px"
                                    objectFit="contain"
                                    borderWidth="1px"
                                    borderColor="border.muted"
                                  />
                                  <Text fontSize="xs" color="gray.500">
                                    thumb: {formatText(image.thumbUrl)} / {image.width ?? "-"}x
                                    {image.height ?? "-"} / {image.size ?? "-"} bytes /{" "}
                                    {formatText(image.mime)}
                                  </Text>
                                </Stack>
                              ))}
                            </Stack>
                          ) : (
                            <Text fontSize="sm" color="gray.500">
                              첨부 이미지가 없습니다.
                            </Text>
                          )}
                        </Field.Root>
                      </Stack>
                    )}
                  </Card.Body>
                </Card.Root>

                <Card.Root>
                  <Card.Header>
                    <Heading size="md">게시글 moderation</Heading>
                  </Card.Header>
                  <Card.Body gap="4">
                    {!selectedPostDetail ? (
                      <Text fontSize="sm" color="gray.500">
                        게시글 상세를 선택하세요.
                      </Text>
                    ) : (
                      <>
                        <Text fontSize="sm" color="gray.500">
                          현재 정책은 `VISIBLE → HIDDEN`, `HIDDEN → VISIBLE`,
                          `VISIBLE/HIDDEN → DELETED`이며, `DELETED`는 terminal입니다.
                        </Text>

                        {postModerationSuccess ? (
                          <Alert.Root status="success" rounded="xl">
                            <Alert.Indicator />
                            <Alert.Content>
                              <Alert.Title>게시글 moderation 완료</Alert.Title>
                              <Alert.Description>{postModerationSuccess}</Alert.Description>
                            </Alert.Content>
                          </Alert.Root>
                        ) : null}

                        {postModerationError ? (
                          <Alert.Root status="error" rounded="xl">
                            <Alert.Indicator />
                            <Alert.Content>
                              <Alert.Title>게시글 moderation 실패</Alert.Title>
                              <Alert.Description>{postModerationError}</Alert.Description>
                            </Alert.Content>
                          </Alert.Root>
                        ) : null}

                        <HStack flexWrap="wrap">
                          {availableModerationTargets(
                            selectedPostDetail.moderationStatus,
                          ).length ? (
                            availableModerationTargets(selectedPostDetail.moderationStatus).map(
                              (target) => (
                                <Button
                                  key={target}
                                  colorPalette={target === "DELETED" ? "red" : "teal"}
                                  variant={target === "DELETED" ? "solid" : "outline"}
                                  disabled={postModerationPending}
                                  loading={postModerationPending}
                                  onClick={() => void handlePostModeration(target)}
                                >
                                  {moderationActionLabel(target)}
                                </Button>
                              ),
                            )
                          ) : (
                            <Text fontSize="sm" color="gray.500">
                              변경 가능한 moderation 액션이 없습니다.
                            </Text>
                          )}
                        </HStack>
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
