"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { AlertCircle } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { AdminDashboardActivity } from "@/features/admin/types";
import { SegmentedSelect } from "@/components/admin/dashboard/segmented-select";
import { useMemo, useState } from "react";

export const activityMetricConfig = {
  newMembers: { label: "회원가입", color: "#0f766e" },
  inquiriesCreated: { label: "문의접수", color: "#2563eb" },
  reportsCreated: { label: "신고접수", color: "#dc2626" },
  partiesCreated: { label: "파티생성", color: "#7c3aed" },
} satisfies ChartConfig;

export type ActivityMetricKey = keyof typeof activityMetricConfig;

const activityMetricKeys = Object.keys(
  activityMetricConfig,
) as ActivityMetricKey[];

interface DashboardActivityPanelProps {
  activityDays: "7" | "30";
  onDaysChange: (value: "7" | "30") => void;
  activity: AdminDashboardActivity | null;
  activityLoading: boolean;
  activityError: string | null;
}

export function DashboardActivityPanel({
  activityDays,
  onDaysChange,
  activity,
  activityLoading,
  activityError,
}: DashboardActivityPanelProps) {
  const [visibleMetrics, setVisibleMetrics] = useState<
    Record<ActivityMetricKey, boolean>
  >({
    newMembers: true,
    inquiriesCreated: true,
    reportsCreated: true,
    partiesCreated: true,
  });

  const chartData = useMemo(
    () =>
      (activity?.series ?? []).map((point) => ({
        ...point,
        shortDate: point.date.slice(5),
      })),
    [activity],
  );

  const hasVisibleMetrics = activityMetricKeys.some((key) => visibleMetrics[key]);

  return (
    <Card className="rounded-3xl">
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>최근 활동 추이</CardTitle>
            <CardDescription>
              날짜 버킷은 `Asia/Seoul`, series는 오래된 날짜부터 정렬됩니다.
            </CardDescription>
          </div>
          <SegmentedSelect
            label="기간"
            value={activityDays}
            options={["7", "30"]}
            onChange={(value) => onDaysChange(value as "7" | "30")}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {activityError ? (
          <Alert variant="destructive" className="rounded-2xl">
            <AlertCircle className="size-4" />
            <AlertTitle>활동 추이 조회 실패</AlertTitle>
            <AlertDescription>{activityError}</AlertDescription>
          </Alert>
        ) : activityLoading && !activity ? (
          <p className="text-sm text-muted-foreground">
            활동 추이를 불러오는 중입니다.
          </p>
        ) : chartData.length ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {activityMetricKeys.map((metric) => (
                  <Button
                    key={metric}
                    size="sm"
                    variant={visibleMetrics[metric] ? "default" : "outline"}
                    onClick={() =>
                      setVisibleMetrics((current) => ({
                        ...current,
                        [metric]: !current[metric],
                      }))
                    }
                  >
                    <span
                      className="size-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          activityMetricConfig[metric].color as string | undefined,
                      }}
                    />
                    {activityMetricConfig[metric].label}
                  </Button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                timezone: {activity?.timezone}
              </p>
            </div>

            {hasVisibleMetrics ? (
              <ChartContainer
                className="h-[280px] w-full md:h-[360px]"
                config={activityMetricConfig}
              >
                <LineChart
                  accessibilityLayer
                  data={chartData}
                  margin={{ top: 12, right: 12, bottom: 4, left: -20 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="shortDate"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    width={32}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(label) => `날짜: ${label}`}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  {activityMetricKeys.map((metric) =>
                    visibleMetrics[metric] ? (
                      <Line
                        key={metric}
                        type="monotone"
                        dataKey={metric}
                        stroke={`var(--color-${metric})`}
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    ) : null,
                  )}
                </LineChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground">
                최소 한 개 이상의 지표를 선택해야 그래프가 표시됩니다.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            최근 활동 데이터가 없습니다.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
