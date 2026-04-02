"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { MetricCard } from "@/components/admin/metric-card";
import { PageErrorState, PageLoadingState } from "@/components/admin/page-status";
import { FormField } from "@/components/admin/form-field";
import {
  InlineGroup,
  PageStack,
  ResponsiveGrid,
  SectionStack,
} from "@/components/admin/layout";
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
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

function categoryClass(category: string) {
  switch (category) {
    case "학사":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300";
    case "학생":
      return "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/50 dark:text-orange-300";
    case "장학/등록/학자금":
      return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300";
    case "공모/행사":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300";
    case "취업/진로개발/창업":
      return "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950/50 dark:text-teal-300";
    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-300";
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
    <PageStack>
      <SectionStack className="gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Notice
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">학교 공지 운영</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          공지 목록 조회와 RSS 동기화 실행을 Spring 계약에 맞춰 연결했습니다.
          카테고리 목록은 백엔드 NoticeCategory enum 기준으로 고정합니다.
        </p>
      </SectionStack>

      <ResponsiveGrid>
        <MetricCard
          label="전체 공지 수"
          value={pageData.totalElements}
          description={`현재 페이지 ${pageData.page + 1} / ${Math.max(pageData.totalPages, 1)}`}
        />
        <MetricCard
          label="읽지 않은 항목"
          value={pageData.content.filter((notice) => !notice.isRead).length}
          description="현재 페이지 기준"
        />
        <MetricCard
          label="마지막 동기화"
          value={syncResult ? formatDateTime(syncResult.syncedAt) : "아직 실행 전"}
          description={`created ${syncResult?.created ?? 0} / updated ${syncResult?.updated ?? 0}`}
        />
      </ResponsiveGrid>

      <Card>
        <CardContent className="space-y-5 pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="카테고리">
              <Select value={category || "__all__"} onValueChange={(value) => setCategory(value === "__all__" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="전체 카테고리" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">전체 카테고리</SelectItem>
                  {noticeCategories.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="검색어">
              <Input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="제목 또는 요약 검색"
              />
            </FormField>

            <FormField label="운영 액션">
              <InlineGroup className="items-stretch">
                <Button onClick={handleApplyFilters} className="flex-1">
                  필터 적용
                </Button>
                <Button variant="outline" onClick={handleResetFilters} className="flex-1">
                  초기화
                </Button>
              </InlineGroup>
            </FormField>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">
              현재 조건: {appliedCategory || "전체"} /{" "}
              {appliedSearchText.trim() || "검색어 없음"}
            </p>
            <Button onClick={handleSync} disabled={isSyncPending}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {isSyncPending ? "동기화 중..." : "학교 공지 동기화 실행"}
            </Button>
          </div>

          {syncMessage ? (
            <Alert>
              <RefreshCw className="h-4 w-4" />
              <AlertTitle>동기화 완료</AlertTitle>
              <AlertDescription>{syncMessage}</AlertDescription>
            </Alert>
          ) : null}

          {syncError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>동기화 실패</AlertTitle>
              <AlertDescription>{syncError}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>공지</TableHead>
                  <TableHead className="hidden lg:table-cell">게시처</TableHead>
                  <TableHead>게시일</TableHead>
                  <TableHead className="text-right">반응</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageData.content.map((notice) => (
                  <TableRow key={notice.id}>
                    <TableCell>
                      <div className="min-w-0 max-w-[30vw] space-y-2">
                        <InlineGroup className="gap-2">
                          <Badge className={categoryClass(notice.category)}>
                            {notice.category}
                          </Badge>
                          {notice.isBookmarked ? (
                            <Badge variant="outline">북마크됨</Badge>
                          ) : null}
                          {!notice.isRead ? (
                            <Badge variant="destructive">미확인</Badge>
                          ) : null}
                        </InlineGroup>
                        <p className="font-medium">{notice.title}</p>
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {notice.rssPreview || "요약 미리보기가 없습니다."}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="space-y-1">
                        <p>{notice.department || "-"}</p>
                        <p className="text-sm text-muted-foreground">
                          {notice.author || "-"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{formatDateTime(notice.postedAt)}</TableCell>
                    <TableCell className="text-right">
                      <p className="text-sm text-muted-foreground">
                        조회 {notice.viewCount}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        댓글 {notice.commentCount} / 북마크 {notice.bookmarkCount}
                      </p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {!pageData.content.length ? (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              <p>조건에 맞는 학교 공지가 없습니다.</p>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">
              페이지당 {pageData.size}건 표시
            </p>
            <InlineGroup>
              <Button
                variant="outline"
                onClick={() => setPage((current) => Math.max(current - 1, 0))}
                disabled={!pageData.hasPrevious}
              >
                이전
              </Button>
              <p className="min-w-24 text-center text-sm">
                {pageData.page + 1} / {Math.max(pageData.totalPages, 1)}
              </p>
              <Button
                variant="outline"
                onClick={() => setPage((current) => current + 1)}
                disabled={!pageData.hasNext}
              >
                다음
              </Button>
            </InlineGroup>
          </div>
        </CardContent>
      </Card>
    </PageStack>
  );
}
