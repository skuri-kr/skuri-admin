"use client";

import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Field,
  Grid,
  Heading,
  HStack,
  Input,
  NativeSelect,
  SimpleGrid,
  Stack,
  Table,
  Text,
  useBreakpointValue,
} from "@chakra-ui/react";
import { PageErrorState, PageLoadingState } from "@/components/admin/page-status";
import { useAuth } from "@/features/auth/auth-context";
import type {
  ApiResponse,
  NoticeListItem,
  NoticeSyncResult,
  PageResponse,
} from "@/features/admin/types";
import { getAuthorizedJson } from "@/lib/api/authenticated-client";
import { ApiError } from "@/lib/api/http";
import { formatDateTime } from "@/lib/format/date";
import { getApiBaseUrl } from "@/lib/env/public-env";
import { useEffect, useState, useTransition } from "react";

const noticeCategories = [
  "새소식",
  "학사",
  "학생",
  "장학/등록/학자금",
  "입학",
  "취업/진로개발/창업",
  "공모/행사",
  "교육/글로벌",
  "일반",
  "입찰구매정보",
  "사회봉사센터",
  "장애학생지원센터",
  "생활관",
  "비교과",
] as const;

function categoryPalette(category: string) {
  switch (category) {
    case "학사":
      return "blue";
    case "학생":
      return "orange";
    case "장학/등록/학자금":
      return "purple";
    case "공모/행사":
      return "green";
    case "취업/진로개발/창업":
      return "teal";
    default:
      return "gray";
  }
}

export default function NoticesPage() {
  const { user, isAdminVerified } = useAuth();
  const [pageData, setPageData] = useState<PageResponse<NoticeListItem> | null>(
    null,
  );
  const [page, setPage] = useState(0);
  const [category, setCategory] = useState("");
  const [appliedCategory, setAppliedCategory] = useState("");
  const [searchText, setSearchText] = useState("");
  const [appliedSearchText, setAppliedSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<NoticeSyncResult | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isSyncPending, startSyncTransition] = useTransition();
  const isCompact = useBreakpointValue({ base: true, lg: false }) ?? false;

  useEffect(() => {
    if (!user || !isAdminVerified) {
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const query = new URLSearchParams({
          page: String(page),
          size: "20",
        });

        if (appliedCategory) {
          query.set("category", appliedCategory);
        }

        if (appliedSearchText.trim()) {
          query.set("search", appliedSearchText.trim());
        }

        const response = await getAuthorizedJson<
          ApiResponse<PageResponse<NoticeListItem>>
        >(user, `${getApiBaseUrl()}/v1/notices?${query.toString()}`, {
          signal: controller.signal,
        });

        setPageData(response.data);
      } catch {
        if (!controller.signal.aborted) {
          setError("학교 공지 목록을 불러오지 못했습니다.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => controller.abort();
  }, [appliedCategory, appliedSearchText, isAdminVerified, page, user]);

  const handleApplyFilters = () => {
    setPage(0);
    setAppliedCategory(category);
    setAppliedSearchText(searchText);
  };

  const handleResetFilters = () => {
    setCategory("");
    setSearchText("");
    setPage(0);
    setAppliedCategory("");
    setAppliedSearchText("");
  };

  const handleSync = () => {
    if (!user) {
      return;
    }

    startSyncTransition(() => {
      void (async () => {
        setSyncError(null);
        setSyncMessage(null);

        try {
          const response = await getAuthorizedJson<ApiResponse<NoticeSyncResult>>(
            user,
            `${getApiBaseUrl()}/v1/admin/notices/sync`,
            {
              method: "POST",
            },
          );

          setSyncResult(response.data);
          setSyncMessage("학교 공지 동기화가 완료되었습니다.");
          setPage(0);
        } catch (caughtError) {
          if (caughtError instanceof ApiError) {
            setSyncError(caughtError.message);
          } else {
            setSyncError("학교 공지 동기화를 실행하지 못했습니다.");
          }
        }
      })();
    });
  };

  if (loading) {
    return <PageLoadingState label="학교 공지 목록을 불러오는 중입니다." />;
  }

  if (error || !pageData) {
    return (
      <PageErrorState
        title="학교 공지 로드 실패"
        message={error ?? "학교 공지 데이터를 확인할 수 없습니다."}
      />
    );
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
          Notice
        </Text>
        <Heading size="2xl">학교 공지 운영</Heading>
        <Text color="gray.600" _dark={{ color: "gray.300" }}>
          공지 목록 조회와 RSS 동기화 실행을 Spring 계약에 맞춰 연결했습니다.
          카테고리 목록은 백엔드 NoticeCategory enum 기준으로 고정합니다.
        </Text>
      </Stack>

      <SimpleGrid columns={{ base: 1, md: 3 }} gap="4">
        <Card.Root>
          <Card.Body gap="1">
            <Text fontSize="sm" color="gray.500">
              전체 공지 수
            </Text>
            <Heading size="xl">{pageData.totalElements}</Heading>
            <Text fontSize="sm" color="gray.500">
              현재 페이지 {pageData.page + 1} / {Math.max(pageData.totalPages, 1)}
            </Text>
          </Card.Body>
        </Card.Root>
        <Card.Root>
          <Card.Body gap="1">
            <Text fontSize="sm" color="gray.500">
              읽지 않은 항목
            </Text>
            <Heading size="xl">
              {pageData.content.filter((notice) => !notice.isRead).length}
            </Heading>
            <Text fontSize="sm" color="gray.500">
              현재 페이지 기준
            </Text>
          </Card.Body>
        </Card.Root>
        <Card.Root>
          <Card.Body gap="1">
            <Text fontSize="sm" color="gray.500">
              마지막 동기화
            </Text>
            <Heading size="md">
              {syncResult ? formatDateTime(syncResult.syncedAt) : "아직 실행 전"}
            </Heading>
            <Text fontSize="sm" color="gray.500">
              created {syncResult?.created ?? 0} / updated {syncResult?.updated ?? 0}
            </Text>
          </Card.Body>
        </Card.Root>
      </SimpleGrid>

      <Card.Root>
        <Card.Body gap="5">
          <Grid
            templateColumns={{ base: "1fr", md: "repeat(3, minmax(0, 1fr))" }}
            gap="4"
          >
            <Field.Root>
              <Field.Label>카테고리</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  <option value="">전체 카테고리</option>
                  {noticeCategories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </NativeSelect.Field>
              </NativeSelect.Root>
            </Field.Root>

            <Field.Root>
              <Field.Label>검색어</Field.Label>
              <Input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="제목 또는 요약 검색"
              />
            </Field.Root>

            <Field.Root>
              <Field.Label>운영 액션</Field.Label>
              <HStack align="stretch">
                <Button colorPalette="orange" onClick={handleApplyFilters} flex="1">
                  필터 적용
                </Button>
                <Button variant="outline" onClick={handleResetFilters} flex="1">
                  초기화
                </Button>
              </HStack>
            </Field.Root>
          </Grid>

          <HStack justify="space-between" wrap="wrap" gap="3">
            <Text fontSize="sm" color="gray.500">
              현재 조건: {appliedCategory || "전체"} /{" "}
              {appliedSearchText.trim() || "검색어 없음"}
            </Text>
            <Button
              colorPalette="teal"
              onClick={handleSync}
              loading={isSyncPending}
            >
              학교 공지 동기화 실행
            </Button>
          </HStack>

          {syncMessage ? (
            <Alert.Root status="success" rounded="xl">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>동기화 완료</Alert.Title>
                <Alert.Description>{syncMessage}</Alert.Description>
              </Alert.Content>
            </Alert.Root>
          ) : null}

          {syncError ? (
            <Alert.Root status="error" rounded="xl">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>동기화 실패</Alert.Title>
                <Alert.Description>{syncError}</Alert.Description>
              </Alert.Content>
            </Alert.Root>
          ) : null}
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Body gap="4">
          <Box overflowX="auto">
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>공지</Table.ColumnHeader>
                  {!isCompact ? <Table.ColumnHeader>게시처</Table.ColumnHeader> : null}
                  <Table.ColumnHeader>게시일</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="end">반응</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {pageData.content.map((notice) => (
                  <Table.Row key={notice.id}>
                    <Table.Cell>
                      <Stack gap="2" minW={0} maxW="30vw">
                        <HStack gap="1" wrap="wrap">
                          <Badge colorPalette={categoryPalette(notice.category)}>
                            {notice.category}
                          </Badge>
                          {notice.isBookmarked ? (
                            <Badge variant="outline" colorPalette="yellow">
                              북마크됨
                            </Badge>
                          ) : null}
                          {!notice.isRead ? (
                            <Badge variant="subtle" colorPalette="red">
                              미확인
                            </Badge>
                          ) : null}
                        </HStack>
                        <Text fontWeight="600">{notice.title}</Text>
                        <Text
                          fontSize="sm"
                          color="gray.500"
                          lineClamp={2}
                          _dark={{ color: "gray.400" }}
                        >
                          {notice.rssPreview || "요약 미리보기가 없습니다."}
                        </Text>
                      </Stack>
                    </Table.Cell>
                    {!isCompact ? (
                      <Table.Cell>
                        <Stack gap="1">
                          <Text>{notice.department || "-"}</Text>
                          <Text fontSize="sm" color="gray.500">
                            {notice.author || "-"}
                          </Text>
                        </Stack>
                      </Table.Cell>
                    ) : null}
                    <Table.Cell>{formatDateTime(notice.postedAt)}</Table.Cell>
                    <Table.Cell textAlign="end">
                      <Text fontSize="sm" color="gray.500">
                        조회 {notice.viewCount}
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        댓글 {notice.commentCount} / 북마크 {notice.bookmarkCount}
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>

          {!pageData.content.length ? (
            <Box
              rounded="2xl"
              borderWidth="1px"
              borderStyle="dashed"
              borderColor="blackAlpha.200"
              p="8"
              textAlign="center"
            >
              <Text>조건에 맞는 학교 공지가 없습니다.</Text>
            </Box>
          ) : null}

          <HStack justify="space-between" wrap="wrap" gap="3">
            <Text fontSize="sm" color="gray.500">
              페이지당 {pageData.size}건 표시
            </Text>
            <HStack>
              <Button
                variant="outline"
                onClick={() => setPage((current) => Math.max(current - 1, 0))}
                disabled={!pageData.hasPrevious}
              >
                이전
              </Button>
              <Text fontSize="sm" minW="96px" textAlign="center">
                {pageData.page + 1} / {Math.max(pageData.totalPages, 1)}
              </Text>
              <Button
                variant="outline"
                onClick={() => setPage((current) => current + 1)}
                disabled={!pageData.hasNext}
              >
                다음
              </Button>
            </HStack>
          </HStack>
        </Card.Body>
      </Card.Root>
    </Stack>
  );
}
