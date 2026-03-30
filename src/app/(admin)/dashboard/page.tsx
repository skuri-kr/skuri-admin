"use client";

import dynamic from "next/dynamic";
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Grid,
  Heading,
  HStack,
  NativeSelect,
  Stack,
  Text,
} from "@chakra-ui/react";
import { PageLoadingState } from "@/components/admin/page-status";
import type {
  AdminDashboardActivity,
  AdminDashboardRecentItem,
  AdminDashboardRecentItemType,
  AdminDashboardSummary,
  ApiResponse,
} from "@/features/admin/types";
import { useAuth } from "@/features/auth/auth-context";
import { getAuthorizedJson } from "@/lib/api/authenticated-client";
import { ApiError } from "@/lib/api/http";
import { getApiBaseUrl } from "@/lib/env/public-env";
import { formatDateTime } from "@/lib/format/date";
import { useColorModeValue } from "@/components/ui/color-mode";
import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";

const activityDayOptions = ["7", "30"] as const;
const recentLimitOptions = ["10", "20", "30"] as const;
const ResponsiveContainer = dynamic(
  () => import("recharts").then((mod) => mod.ResponsiveContainer),
  { ssr: false },
);

const activityMetricConfig = {
  newMembers: { label: "회원가입", color: "#0f766e" },
  inquiriesCreated: { label: "문의접수", color: "#2563eb" },
  reportsCreated: { label: "신고접수", color: "#dc2626" },
  partiesCreated: { label: "파티생성", color: "#7c3aed" },
} as const;

type ActivityMetricKey = keyof typeof activityMetricConfig;

const activityMetricKeys = Object.keys(
  activityMetricConfig,
) as ActivityMetricKey[];

function recentTypePalette(type: AdminDashboardRecentItemType) {
  switch (type) {
    case "INQUIRY":
      return "blue";
    case "REPORT":
      return "red";
    case "APP_NOTICE":
      return "purple";
    case "PARTY":
      return "teal";
  }
}

export default function DashboardPage() {
  const { user, isAdminVerified } = useAuth();
  const chartGridColor = useColorModeValue(
    "rgba(148, 163, 184, 0.22)",
    "rgba(148, 163, 184, 0.18)",
  );
  const chartAxisColor = useColorModeValue("#64748b", "#94a3b8");
  const chartTooltipBg = useColorModeValue("#ffffff", "#111827");
  const chartTooltipBorder = useColorModeValue("#e2e8f0", "#334155");

  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [activityDays, setActivityDays] =
    useState<(typeof activityDayOptions)[number]>("7");
  const [activity, setActivity] = useState<AdminDashboardActivity | null>(null);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [visibleMetrics, setVisibleMetrics] = useState<
    Record<ActivityMetricKey, boolean>
  >({
    newMembers: true,
    inquiriesCreated: true,
    reportsCreated: true,
    partiesCreated: true,
  });

  const [recentLimit, setRecentLimit] =
    useState<(typeof recentLimitOptions)[number]>("10");
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
        const response = await getAuthorizedJson<ApiResponse<AdminDashboardRecentItem[]>>(
          user,
          `${getApiBaseUrl()}/v1/admin/dashboard/recent-items?limit=${recentLimit}`,
          { signal: controller.signal },
        );

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

  const chartData = useMemo(
    () =>
      (activity?.series ?? []).map((point) => ({
        ...point,
        shortDate: point.date.slice(5),
      })),
    [activity],
  );
  const hasVisibleMetrics = activityMetricKeys.some((key) => visibleMetrics[key]);

  if (summaryLoading && activityLoading && recentLoading && !summary && !activity) {
    return <PageLoadingState label="대시보드 데이터를 불러오는 중입니다." />;
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
          Operations Dashboard
        </Text>
        <Heading size="2xl">대시보드</Heading>
        <Text color="gray.600" _dark={{ color: "gray.300" }}>
          관리자 KPI 요약, 최근 활동 추이, 최근 운영 항목 피드를 현재 Spring
          read-model API 기준으로 연결했습니다.
        </Text>
      </Stack>

      {summaryError ? (
        <Alert.Root status="error" rounded="xl">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>요약 조회 실패</Alert.Title>
            <Alert.Description>{summaryError}</Alert.Description>
          </Alert.Content>
        </Alert.Root>
      ) : null}

      <Grid templateColumns={{ base: "1fr", md: "repeat(2, minmax(0, 1fr))", xl: "repeat(3, minmax(0, 1fr))" }} gap="4">
        <Card.Root>
          <Card.Body gap="1">
            <Text fontSize="sm" color="gray.500">
              오늘 신규 가입
            </Text>
            <Heading size="2xl">{summary?.newMembersToday ?? "-"}</Heading>
            <Text fontSize="sm" color="gray.500">
              Asia/Seoul 오늘 00:00부터 집계
            </Text>
          </Card.Body>
        </Card.Root>
        <Card.Root>
          <Card.Body gap="1">
            <Text fontSize="sm" color="gray.500">
              전체 회원 수
            </Text>
            <Heading size="2xl">{summary?.totalMembers ?? "-"}</Heading>
            <Text fontSize="sm" color="gray.500">
              WITHDRAWN tombstone 포함
            </Text>
          </Card.Body>
        </Card.Root>
        <Card.Root>
          <Card.Body gap="1">
            <Text fontSize="sm" color="gray.500">
              관리자 수
            </Text>
            <Heading size="2xl">{summary?.adminCount ?? "-"}</Heading>
            <Text fontSize="sm" color="gray.500">
              isAdmin=true 기준
            </Text>
          </Card.Body>
        </Card.Root>
        <Card.Root>
          <Card.Body gap="1">
            <Text fontSize="sm" color="gray.500">
              OPEN 파티
            </Text>
            <Heading size="2xl">{summary?.openPartyCount ?? "-"}</Heading>
            <Text fontSize="sm" color="gray.500">
              현재 모집 중인 파티 수
            </Text>
          </Card.Body>
        </Card.Root>
        <Card.Root>
          <Card.Body gap="1">
            <Text fontSize="sm" color="gray.500">
              PENDING 문의
            </Text>
            <Heading size="2xl">{summary?.pendingInquiryCount ?? "-"}</Heading>
            <Text fontSize="sm" color="gray.500">
              아직 처리 전인 문의
            </Text>
          </Card.Body>
        </Card.Root>
        <Card.Root>
          <Card.Body gap="1">
            <Text fontSize="sm" color="gray.500">
              PENDING 신고
            </Text>
            <Heading size="2xl">{summary?.pendingReportCount ?? "-"}</Heading>
            <Text fontSize="sm" color="gray.500">
              아직 처리 전인 신고
            </Text>
          </Card.Body>
        </Card.Root>
      </Grid>

      <Grid templateColumns={{ base: "1fr", "2xl": "minmax(0, 1.2fr) minmax(0, 0.8fr)" }} gap="6">
        <Card.Root>
          <Card.Header>
            <HStack justify="space-between" align="start" flexWrap="wrap">
              <Stack gap="1">
                <Heading size="md">최근 활동 추이</Heading>
                <Text fontSize="sm" color="gray.500">
                  날짜 버킷은 `Asia/Seoul`, series는 오래된 날짜부터 정렬됩니다.
                </Text>
              </Stack>
              <FieldLikeSelect
                label="기간"
                value={activityDays}
                options={activityDayOptions}
                onChange={(value) =>
                  setActivityDays(value as (typeof activityDayOptions)[number])
                }
              />
            </HStack>
          </Card.Header>
          <Card.Body gap="4">
            {activityError ? (
              <Alert.Root status="error" rounded="xl">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>활동 추이 조회 실패</Alert.Title>
                  <Alert.Description>{activityError}</Alert.Description>
                </Alert.Content>
              </Alert.Root>
            ) : activityLoading && !activity ? (
              <Text fontSize="sm" color="gray.500">
                활동 추이를 불러오는 중입니다.
              </Text>
            ) : chartData.length ? (
              <Stack gap="3">
                <HStack justify="space-between" align="start" flexWrap="wrap" gap="3">
                  <HStack flexWrap="wrap" gap="2">
                    {activityMetricKeys.map((metric) => (
                      <Button
                        key={metric}
                        size="sm"
                        variant={visibleMetrics[metric] ? "subtle" : "outline"}
                        onClick={() =>
                          setVisibleMetrics((current) => ({
                            ...current,
                            [metric]: !current[metric],
                          }))
                        }
                      >
                        <HStack gap="2">
                          <Box
                            boxSize="2.5"
                            rounded="full"
                            bg={activityMetricConfig[metric].color}
                            flexShrink="0"
                          />
                          <Text>{activityMetricConfig[metric].label}</Text>
                        </HStack>
                      </Button>
                    ))}
                  </HStack>
                  <Text fontSize="sm" color="gray.500">
                    timezone: {activity?.timezone}
                  </Text>
                </HStack>

                {hasVisibleMetrics ? (
                  <Box h={{ base: "280px", md: "360px" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{ top: 12, right: 12, bottom: 4, left: -20 }}
                      >
                        <CartesianGrid
                          stroke={chartGridColor}
                          strokeDasharray="3 3"
                        />
                        <XAxis
                          dataKey="shortDate"
                          tickLine={false}
                          axisLine={false}
                          stroke={chartAxisColor}
                        />
                        <YAxis
                          allowDecimals={false}
                          tickLine={false}
                          axisLine={false}
                          stroke={chartAxisColor}
                          width={32}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: chartTooltipBg,
                            border: `1px solid ${chartTooltipBorder}`,
                            borderRadius: "12px",
                          }}
                          labelFormatter={(label) => `날짜: ${label}`}
                        />
                        <Legend />
                        {activityMetricKeys.map((metric) =>
                          visibleMetrics[metric] ? (
                            <Line
                              key={metric}
                              type="monotone"
                              dataKey={metric}
                              name={activityMetricConfig[metric].label}
                              stroke={activityMetricConfig[metric].color}
                              strokeWidth={2.5}
                              dot={{ r: 3 }}
                              activeDot={{ r: 5 }}
                            />
                          ) : null,
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                ) : (
                  <Text fontSize="sm" color="gray.500">
                    최소 한 개 이상의 지표를 선택해야 그래프가 표시됩니다.
                  </Text>
                )}
              </Stack>
            ) : (
              <Text fontSize="sm" color="gray.500">
                최근 활동 데이터가 없습니다.
              </Text>
            )}
          </Card.Body>
        </Card.Root>

        <Card.Root>
          <Card.Header>
            <HStack justify="space-between" align="start" flexWrap="wrap">
              <Stack gap="1">
                <Heading size="md">최근 운영 항목</Heading>
                <Text fontSize="sm" color="gray.500">
                  Inquiry, Report, App Notice, Party를 `createdAt DESC`로 병합합니다.
                </Text>
              </Stack>
              <FieldLikeSelect
                label="limit"
                value={recentLimit}
                options={recentLimitOptions}
                onChange={(value) =>
                  setRecentLimit(value as (typeof recentLimitOptions)[number])
                }
              />
            </HStack>
          </Card.Header>
          <Card.Body gap="4">
            {recentError ? (
              <Alert.Root status="error" rounded="xl">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>최근 운영 항목 조회 실패</Alert.Title>
                  <Alert.Description>{recentError}</Alert.Description>
                </Alert.Content>
              </Alert.Root>
            ) : recentLoading && !recentItems.length ? (
              <Text fontSize="sm" color="gray.500">
                최근 운영 항목을 불러오는 중입니다.
              </Text>
            ) : recentItems.length ? (
              <Stack gap="3">
                {recentItems.map((item) => (
                  <Stack key={`${item.type}-${item.id}`} gap="2" rounded="xl" borderWidth="1px" p="4">
                    <HStack justify="space-between" align="start">
                      <Badge colorPalette={recentTypePalette(item.type)}>{item.type}</Badge>
                      <Text fontSize="sm" color="gray.500">
                        {formatDateTime(item.createdAt)}
                      </Text>
                    </HStack>
                    <Text fontWeight="semibold">{item.title}</Text>
                    <Text fontSize="sm" color="gray.500">
                      {item.subtitle}
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      status: {item.status}
                    </Text>
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Text fontSize="sm" color="gray.500">
                최근 운영 항목이 없습니다.
              </Text>
            )}
          </Card.Body>
        </Card.Root>
      </Grid>

      <Alert.Root status="info" rounded="xl">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>집계 기준 메모</Alert.Title>
          <Alert.Description>
            `totalMembers`는 전체 `members` row 기준이라 `WITHDRAWN` tombstone을
            포함합니다. 최근 운영 항목의 공지 source는 학교 공지 sync 이력이 아니라
            게시된 app notice입니다.
          </Alert.Description>
        </Alert.Content>
      </Alert.Root>

      {summary?.generatedAt ? (
        <Text fontSize="sm" color="gray.500">
          generatedAt: {formatDateTime(summary.generatedAt)}
        </Text>
      ) : null}
    </Stack>
  );
}

function FieldLikeSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <Stack gap="1" minW="88px">
      <Text fontSize="xs" fontWeight="600" color="gray.500">
        {label}
      </Text>
      <NativeSelect.Root size="sm">
        <NativeSelect.Field value={value} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </NativeSelect.Field>
      </NativeSelect.Root>
    </Stack>
  );
}
