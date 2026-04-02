"use client";

import { AlertCircle } from "lucide-react";
import { SegmentedSelect } from "@/components/admin/dashboard/segmented-select";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  AdminDashboardRecentItem,
  AdminDashboardRecentItemType,
} from "@/features/admin/types";
import { formatDateTime } from "@/lib/format/date";

function recentTypeClasses(type: AdminDashboardRecentItemType) {
  switch (type) {
    case "INQUIRY":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300";
    case "REPORT":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300";
    case "APP_NOTICE":
      return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300";
    case "PARTY":
      return "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950/50 dark:text-teal-300";
  }
}

interface DashboardRecentItemsPanelProps {
  recentLimit: "10" | "20" | "30";
  onLimitChange: (value: "10" | "20" | "30") => void;
  recentItems: AdminDashboardRecentItem[];
  recentLoading: boolean;
  recentError: string | null;
}

export function DashboardRecentItemsPanel({
  recentLimit,
  onLimitChange,
  recentItems,
  recentLoading,
  recentError,
}: DashboardRecentItemsPanelProps) {
  return (
    <Card className="rounded-3xl">
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>최근 운영 항목</CardTitle>
            <CardDescription>
              Inquiry, Report, App Notice, Party를 `createdAt DESC`로 병합합니다.
            </CardDescription>
          </div>
          <SegmentedSelect
            label="limit"
            value={recentLimit}
            options={["10", "20", "30"]}
            onChange={(value) => onLimitChange(value as "10" | "20" | "30")}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {recentError ? (
          <Alert variant="destructive" className="rounded-2xl">
            <AlertCircle className="size-4" />
            <AlertTitle>최근 운영 항목 조회 실패</AlertTitle>
            <AlertDescription>{recentError}</AlertDescription>
          </Alert>
        ) : recentLoading && !recentItems.length ? (
          <p className="text-sm text-muted-foreground">
            최근 운영 항목을 불러오는 중입니다.
          </p>
        ) : recentItems.length ? (
          <div className="space-y-3">
            {recentItems.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className="space-y-2 rounded-2xl border border-border/70 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <Badge
                    variant="outline"
                    className={recentTypeClasses(item.type)}
                  >
                    {item.type}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(item.createdAt)}
                  </p>
                </div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  status: {item.status}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            최근 운영 항목이 없습니다.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
