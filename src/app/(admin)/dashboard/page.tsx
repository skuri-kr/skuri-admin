"use client";

import { AlertCircle } from "lucide-react";
import { DashboardActivityPanel } from "@/components/admin/dashboard/activity-panel";
import { DashboardRecentItemsPanel } from "@/components/admin/dashboard/recent-items-panel";
import { DashboardSummaryGrid } from "@/components/admin/dashboard/summary-grid";
import { PageLoadingState } from "@/components/admin/page-status";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import type {
  AdminDashboardActivity,
  AdminDashboardRecentItem,
  AdminDashboardSummary,
  ApiResponse,
} from "@/features/admin/types";
import { useAuth } from "@/features/auth/auth-context";
import { getAuthorizedJson } from "@/lib/api/authenticated-client";
import { ApiError } from "@/lib/api/http";
import { getApiBaseUrl } from "@/lib/env/public-env";
import { formatDateTime } from "@/lib/format/date";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const { user, isAdminVerified } = useAuth();

  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [activityDays, setActivityDays] = useState<"7" | "30">("7");
  const [activity, setActivity] = useState<AdminDashboardActivity | null>(null);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState<string | null>(null);

  const [recentLimit, setRecentLimit] = useState<"10" | "20" | "30">("10");
  const [recentItems, setRecentItems] = useState<AdminDashboardRecentItem[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentError, setRecentError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isAdminVerified) {
      return;
    }

    const controller = new AbortController();

    const loadSummary = async () => {
      setSummaryLoading(true);
      setSummaryError(null);

      try {
        const response = await getAuthorizedJson<ApiResponse<AdminDashboardSummary>>(
          user,
          `${getApiBaseUrl()}/v1/admin/dashboard/summary`,
          { signal: controller.signal },
        );

        if (!controller.signal.aborted) {
          setSummary(response.data);
        }
      } catch (caughtError) {
        if (!controller.signal.aborted) {
          setSummaryError(
            caughtError instanceof ApiError
              ? caughtError.message
              : "대시보드 요약을 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setSummaryLoading(false);
        }
      }
    };

    void loadSummary();

    return () => controller.abort();
  }, [isAdminVerified, user]);

  useEffect(() => {
    if (!user || !isAdminVerified) {
      return;
    }

    const controller = new AbortController();

    const loadActivity = async () => {
      setActivityLoading(true);
      setActivityError(null);

      try {
        const response = await getAuthorizedJson<ApiResponse<AdminDashboardActivity>>(
          user,
          `${getApiBaseUrl()}/v1/admin/dashboard/activity?days=${activityDays}`,
          { signal: controller.signal },
        );

        if (!controller.signal.aborted) {
          setActivity(response.data);
        }
      } catch (caughtError) {
        if (!controller.signal.aborted) {
          setActivityError(
            caughtError instanceof ApiError
              ? caughtError.message
              : "대시보드 활동 추이를 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setActivityLoading(false);
        }
      }
    };

    void loadActivity();

    return () => controller.abort();
  }, [activityDays, isAdminVerified, user]);

  useEffect(() => {
    if (!user || !isAdminVerified) {
      return;
    }

    const controller = new AbortController();

    const loadRecentItems = async () => {
      setRecentLoading(true);
      setRecentError(null);

      try {
        const response = await getAuthorizedJson<
          ApiResponse<AdminDashboardRecentItem[]>
        >(user, `${getApiBaseUrl()}/v1/admin/dashboard/recent-items?limit=${recentLimit}`, {
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setRecentItems(response.data);
        }
      } catch (caughtError) {
        if (!controller.signal.aborted) {
          setRecentError(
            caughtError instanceof ApiError
              ? caughtError.message
              : "최근 운영 항목을 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setRecentLoading(false);
        }
      }
    };

    void loadRecentItems();

    return () => controller.abort();
  }, [isAdminVerified, recentLimit, user]);

  if (summaryLoading && activityLoading && recentLoading && !summary && !activity) {
    return <PageLoadingState label="대시보드 데이터를 불러오는 중입니다." />;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Operations Dashboard
        </p>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">대시보드</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            관리자 KPI 요약, 최근 활동 추이, 최근 운영 항목 피드를 현재 Spring
            read-model API 기준으로 연결했습니다.
          </p>
        </div>
      </div>

      {summaryError ? (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertCircle className="size-4" />
          <AlertTitle>요약 조회 실패</AlertTitle>
          <AlertDescription>{summaryError}</AlertDescription>
        </Alert>
      ) : null}

      <DashboardSummaryGrid summary={summary} />

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <DashboardActivityPanel
          activityDays={activityDays}
          onDaysChange={setActivityDays}
          activity={activity}
          activityLoading={activityLoading}
          activityError={activityError}
        />

        <DashboardRecentItemsPanel
          recentLimit={recentLimit}
          onLimitChange={setRecentLimit}
          recentItems={recentItems}
          recentLoading={recentLoading}
          recentError={recentError}
        />
      </div>

      <Alert className="rounded-2xl">
        <AlertCircle className="size-4" />
        <AlertTitle>집계 기준 메모</AlertTitle>
        <AlertDescription>
          `totalMembers`는 전체 `members` row 기준이라 `WITHDRAWN` tombstone을
          포함합니다. 최근 운영 항목의 공지 source는 학교 공지 sync 이력이 아니라
          게시된 app notice입니다.
        </AlertDescription>
      </Alert>

      {summary?.generatedAt ? (
        <p className="text-sm text-muted-foreground">
          generatedAt: {formatDateTime(summary.generatedAt)}
        </p>
      ) : null}
    </div>
  );
}
