"use client";

import { AlertCircle, CheckCircle2, TriangleAlert } from "lucide-react";
import { FormField } from "@/components/admin/form-field";
import {
  InlineGroup,
  PageStack,
  SectionStack,
  TwoColumnGrid,
} from "@/components/admin/layout";
import { useAuth } from "@/features/auth/auth-context";
import { PageErrorState, PageLoadingState } from "@/components/admin/page-status";
import { getAuthorizedJson } from "@/lib/api/authenticated-client";
import { ApiError } from "@/lib/api/http";
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ApiResponse, CafeteriaMenu } from "@/features/admin/types";
import { useEffect, useMemo, useState, useTransition } from "react";

type RestaurantKey = "rollNoodles" | "theBab" | "fryRice";

interface CafeteriaBadgeInput {
  code: string;
  label: string;
}

interface CafeteriaMenuEntryInput {
  title: string;
  badges: CafeteriaBadgeInput[];
}

interface CafeteriaFormState {
  weekId: string;
  weekStart: string;
  weekEnd: string;
  rollNoodlesText: string;
  theBabText: string;
  fryRiceText: string;
}

const restaurantFields: Array<{
  key: RestaurantKey;
  label: string;
  placeholder: string;
}> = [
  {
    key: "rollNoodles",
    label: "Roll & Noodles",
    placeholder: "예)\n계란라면\n치즈라면\n유부우동",
  },
  {
    key: "theBab",
    label: "The Bab",
    placeholder:
      "예)\n묵은지참치마요비빔밥\n참치마요비빔밥\n마그마참치마요비빔밥",
  },
  {
    key: "fryRice",
    label: "Fry & Rice",
    placeholder: "예)\n로제크림카레\n케네디소시지로제크림카레\n왕새우튀김로제크림카레",
  },
];

const TAKEOUT_BADGE_CODE = "TAKEOUT";
const TAKEOUT_BADGE_LABEL = "테이크아웃";
const TAKEOUT_SUFFIX = "ⓣ";

function getDefaultCafeteriaWeekId(date = new Date()) {
  const baseDate = new Date(date);
  if (baseDate.getDay() === 0) {
    baseDate.setDate(baseDate.getDate() + 1);
  }

  const utcDate = new Date(
    Date.UTC(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate()),
  );
  const isoDay = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - isoDay);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(
    ((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );

  return `${utcDate.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

function getWeekRangeFromWeekId(weekId: string) {
  const match = weekId.trim().match(/^(\d{4})-W(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const week = Number(match[2]);
  if (week < 1 || week > 53) {
    return null;
  }

  const januaryFourth = new Date(Date.UTC(year, 0, 4));
  const isoDay = januaryFourth.getUTCDay() || 7;
  const mondayOfFirstWeek = new Date(januaryFourth);
  mondayOfFirstWeek.setUTCDate(januaryFourth.getUTCDate() - isoDay + 1);

  const weekStartDate = new Date(mondayOfFirstWeek);
  weekStartDate.setUTCDate(mondayOfFirstWeek.getUTCDate() + (week - 1) * 7);

  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setUTCDate(weekStartDate.getUTCDate() + 4);

  return {
    weekStart: weekStartDate.toISOString().slice(0, 10),
    weekEnd: weekEndDate.toISOString().slice(0, 10),
  };
}

function createDefaultFormState(weekId = ""): CafeteriaFormState {
  const weekRange = getWeekRangeFromWeekId(weekId);

  return {
    weekId,
    weekStart: weekRange?.weekStart ?? "",
    weekEnd: weekRange?.weekEnd ?? "",
    rollNoodlesText: "",
    theBabText: "",
    fryRiceText: "",
  };
}

function parseMenuLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function hasTakeoutBadge(badges: CafeteriaBadgeInput[] | undefined) {
  return (badges ?? []).some(
    (badge) =>
      badge.code.trim().toUpperCase() === TAKEOUT_BADGE_CODE ||
      badge.label.trim() === TAKEOUT_BADGE_LABEL,
  );
}

function parseMenuLine(value: string): CafeteriaMenuEntryInput | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const isTakeout = trimmed.endsWith(TAKEOUT_SUFFIX);
  const title = isTakeout ? trimmed.slice(0, -TAKEOUT_SUFFIX.length).trim() : trimmed;
  if (!title) {
    return null;
  }

  return {
    title,
    badges: isTakeout
      ? [
          {
            code: TAKEOUT_BADGE_CODE,
            label: TAKEOUT_BADGE_LABEL,
          },
        ]
      : [],
  };
}

function formatMenuEntry(entry: CafeteriaMenuEntryInput) {
  return `${entry.title}${hasTakeoutBadge(entry.badges) ? TAKEOUT_SUFFIX : ""}`;
}

function formatMenuLines(items: string[] | undefined) {
  return (items ?? []).join("\n");
}

function buildDateRange(startDate: string, endDate: string) {
  const dates: string[] = [];
  const current = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function buildMenuPayloadFromForm(form: CafeteriaFormState) {
  const restaurantEntries: Record<RestaurantKey, CafeteriaMenuEntryInput[]> = {
    rollNoodles: parseMenuLines(form.rollNoodlesText)
      .map(parseMenuLine)
      .filter((entry): entry is CafeteriaMenuEntryInput => entry !== null),
    theBab: parseMenuLines(form.theBabText)
      .map(parseMenuLine)
      .filter((entry): entry is CafeteriaMenuEntryInput => entry !== null),
    fryRice: parseMenuLines(form.fryRiceText)
      .map(parseMenuLine)
      .filter((entry): entry is CafeteriaMenuEntryInput => entry !== null),
  };
  const restaurantMenus: Record<RestaurantKey, string[]> = {
    rollNoodles: restaurantEntries.rollNoodles.map((entry) => entry.title),
    theBab: restaurantEntries.theBab.map((entry) => entry.title),
    fryRice: restaurantEntries.fryRice.map((entry) => entry.title),
  };
  const dates = buildDateRange(form.weekStart, form.weekEnd);

  if (!dates.length) {
    throw new Error("weekStart와 weekEnd 기준 날짜 범위를 만들 수 없습니다.");
  }

  return {
    menus: Object.fromEntries(
      dates.map((date) => [
        date,
        {
          rollNoodles: [...restaurantMenus.rollNoodles],
          theBab: [...restaurantMenus.theBab],
          fryRice: [...restaurantMenus.fryRice],
        },
      ]),
    ) as Record<string, Record<string, string[]>>,
    menuEntries: Object.fromEntries(
      dates.map((date) => [
        date,
        {
          rollNoodles: restaurantEntries.rollNoodles.map((entry) => ({
            title: entry.title,
            badges: entry.badges.map((badge) => ({ ...badge })),
          })),
          theBab: restaurantEntries.theBab.map((entry) => ({
            title: entry.title,
            badges: entry.badges.map((badge) => ({ ...badge })),
          })),
          fryRice: restaurantEntries.fryRice.map((entry) => ({
            title: entry.title,
            badges: entry.badges.map((badge) => ({ ...badge })),
          })),
        },
      ]),
    ) as Record<string, Record<string, CafeteriaMenuEntryInput[]>>,
  };
}

function getRepresentativeEntriesForDate(
  menu: CafeteriaMenu,
  date: string,
  key: RestaurantKey,
) {
  const entries = menu.menuEntries?.[date]?.[key];
  if (entries && entries.length > 0) {
    return entries.map((entry) => ({
      title: entry.title,
      badges: (entry.badges ?? []).map((badge) => ({
        code: badge.code,
        label: badge.label,
      })),
    }));
  }

  return (menu.menus[date]?.[key] ?? []).map((title) => ({
    title,
    badges: [] as CafeteriaBadgeInput[],
  }));
}

function buildRepresentativeRestaurants(menu: CafeteriaMenu) {
  const dates = Object.keys(menu.menus).sort();
  const firstDate = dates[0] ?? "";

  return {
    rollNoodles: getRepresentativeEntriesForDate(menu, firstDate, "rollNoodles"),
    theBab: getRepresentativeEntriesForDate(menu, firstDate, "theBab"),
    fryRice: getRepresentativeEntriesForDate(menu, firstDate, "fryRice"),
  };
}

function areMenusUniform(menu: CafeteriaMenu) {
  const dates = Object.keys(menu.menus).sort();
  if (dates.length <= 1) {
    return true;
  }

  const baseline = buildRepresentativeRestaurants(menu);
  const baselineSnapshot = JSON.stringify(baseline);

  return dates.every((date) => {
    return (
      JSON.stringify({
        rollNoodles: getRepresentativeEntriesForDate(menu, date, "rollNoodles"),
        theBab: getRepresentativeEntriesForDate(menu, date, "theBab"),
        fryRice: getRepresentativeEntriesForDate(menu, date, "fryRice"),
      }) === baselineSnapshot
    );
  });
}

function toFormState(menu: CafeteriaMenu): CafeteriaFormState {
  const representative = buildRepresentativeRestaurants(menu);

  return {
    weekId: menu.weekId,
    weekStart: menu.weekStart,
    weekEnd: menu.weekEnd,
    rollNoodlesText: formatMenuLines(
      representative.rollNoodles.map(formatMenuEntry),
    ),
    theBabText: formatMenuLines(representative.theBab.map(formatMenuEntry)),
    fryRiceText: formatMenuLines(representative.fryRice.map(formatMenuEntry)),
  };
}

function validateForm(form: CafeteriaFormState) {
  if (!/^\d{4}-W\d{2}$/.test(form.weekId.trim())) {
    return "weekId 형식은 yyyy-Www 이어야 합니다.";
  }
  if (!form.weekStart) {
    return "weekStart를 입력해주세요.";
  }
  if (!form.weekEnd) {
    return "weekEnd를 입력해주세요.";
  }
  if (form.weekEnd < form.weekStart) {
    return "weekEnd는 weekStart보다 빠를 수 없습니다.";
  }

  const totalMenuCount =
    parseMenuLines(form.rollNoodlesText)
      .map(parseMenuLine)
      .filter(Boolean).length +
    parseMenuLines(form.theBabText)
      .map(parseMenuLine)
      .filter(Boolean).length +
    parseMenuLines(form.fryRiceText)
      .map(parseMenuLine)
      .filter(Boolean).length;

  if (!totalMenuCount) {
    return "최소 한 개 이상의 메뉴를 입력해주세요.";
  }

  return null;
}

export default function CafeteriaPage() {
  const { user, isAdminVerified } = useAuth();
  const [form, setForm] = useState<CafeteriaFormState>(createDefaultFormState());
  const [loadedMenu, setLoadedMenu] = useState<CafeteriaMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isLookupPending, startLookupTransition] = useTransition();
  const [isSavePending, startSaveTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();

  useEffect(() => {
    if (!loadedMenu && !form.weekId) {
      setForm(createDefaultFormState(getDefaultCafeteriaWeekId()));
    }
  }, [form.weekId, loadedMenu]);

  useEffect(() => {
    if (!user || !isAdminVerified) {
      return;
    }

    const controller = new AbortController();

    const loadCurrentWeek = async () => {
      const defaultWeekId = getDefaultCafeteriaWeekId();
      setLoading(true);
      setError(null);

      try {
        const response = await getAuthorizedJson<ApiResponse<CafeteriaMenu>>(
          user,
          `${getApiBaseUrl()}/v1/cafeteria-menus/${defaultWeekId}`,
          {
            signal: controller.signal,
          },
        );

        setLoadedMenu(response.data);
        setForm(toFormState(response.data));
      } catch (caughtError) {
        if (controller.signal.aborted) {
          return;
        }

        if (caughtError instanceof ApiError && caughtError.status === 404) {
          setLoadedMenu(null);
          setForm(createDefaultFormState(defaultWeekId));
        } else {
          setError("기본 편집 주차 학식 메뉴를 불러오지 못했습니다.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadCurrentWeek();

    return () => controller.abort();
  }, [isAdminVerified, user]);

  const validationError = useMemo(() => validateForm(form), [form]);
  const isExistingWeek = loadedMenu?.weekId === form.weekId;
  const targetDates = useMemo(
    () =>
      form.weekStart && form.weekEnd && form.weekStart <= form.weekEnd
        ? buildDateRange(form.weekStart, form.weekEnd)
        : [],
    [form.weekEnd, form.weekStart],
  );
  const hasNonUniformLoadedMenu = useMemo(
    () => (loadedMenu ? !areMenusUniform(loadedMenu) : false),
    [loadedMenu],
  );

  if (loading) {
    return <PageLoadingState label="학식 메뉴 데이터를 불러오는 중입니다." />;
  }

  if (error) {
    return <PageErrorState title="학식 메뉴 로드 실패" message={error} />;
  }

  const updateForm = <K extends keyof CafeteriaFormState>(
    key: K,
    value: CafeteriaFormState[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleLookup = () => {
    if (!user) {
      setActionError("인증이 필요합니다.");
      return;
    }

    const requestedWeekId = form.weekId.trim().toUpperCase();
    if (!requestedWeekId) {
      setActionError("조회할 weekId를 입력해주세요.");
      return;
    }

    startLookupTransition(() => {
      void (async () => {
        setActionError(null);
        setActionSuccess(null);

        try {
          const response = await getAuthorizedJson<ApiResponse<CafeteriaMenu>>(
            user,
            `${getApiBaseUrl()}/v1/cafeteria-menus/${requestedWeekId}`,
          );

          setLoadedMenu(response.data);
          setForm(toFormState(response.data));
          setActionSuccess(`${requestedWeekId} 주차 학식 메뉴를 불러왔습니다.`);
        } catch (caughtError) {
          if (caughtError instanceof ApiError && caughtError.status === 404) {
            setLoadedMenu(null);
            setForm(createDefaultFormState(requestedWeekId));
            setActionSuccess(
              `${requestedWeekId} 주차에는 저장된 학식 메뉴가 없어 신규 생성 모드로 전환했습니다.`,
            );
            return;
          }

          if (caughtError instanceof ApiError) {
            setActionError(caughtError.message);
            return;
          }

          setActionError("학식 메뉴 조회 중 오류가 발생했습니다.");
        }
      })();
    });
  };

  const handleLoadCurrentWeek = () => {
    if (!user) {
      setActionError("인증이 필요합니다.");
      return;
    }

    startLookupTransition(() => {
      void (async () => {
        const defaultWeekId = getDefaultCafeteriaWeekId();
        setActionError(null);
        setActionSuccess(null);

        try {
          const response = await getAuthorizedJson<ApiResponse<CafeteriaMenu>>(
            user,
            `${getApiBaseUrl()}/v1/cafeteria-menus/${defaultWeekId}`,
          );

          setLoadedMenu(response.data);
          setForm(toFormState(response.data));
          setActionSuccess(`${defaultWeekId} 주차 학식 메뉴를 불러왔습니다.`);
        } catch (caughtError) {
          if (caughtError instanceof ApiError && caughtError.status === 404) {
            setLoadedMenu(null);
            setForm(createDefaultFormState(defaultWeekId));
            setActionSuccess(
              `${defaultWeekId} 주차에 저장된 학식 메뉴가 없어 신규 생성 모드로 전환했습니다.`,
            );
            return;
          }

          if (caughtError instanceof ApiError) {
            setActionError(caughtError.message);
            return;
          }

          setActionError("현재 주차 학식 메뉴 조회 중 오류가 발생했습니다.");
        }
      })();
    });
  };

  const handleSave = () => {
    if (!user || validationError) {
      if (validationError) {
        setActionError(validationError);
      }
      return;
    }

    startSaveTransition(() => {
      void (async () => {
        setActionError(null);
        setActionSuccess(null);

        try {
          const { menus, menuEntries } = buildMenuPayloadFromForm(form);
          const url = isExistingWeek
            ? `${getApiBaseUrl()}/v1/admin/cafeteria-menus/${form.weekId}`
            : `${getApiBaseUrl()}/v1/admin/cafeteria-menus`;
          const method = isExistingWeek ? "PUT" : "POST";
          const body = isExistingWeek
            ? {
                weekStart: form.weekStart,
                weekEnd: form.weekEnd,
                menus,
                menuEntries,
              }
            : {
                weekId: form.weekId.trim().toUpperCase(),
                weekStart: form.weekStart,
                weekEnd: form.weekEnd,
                menus,
                menuEntries,
              };

          const response = await getAuthorizedJson<ApiResponse<CafeteriaMenu>>(
            user,
            url,
            {
              method,
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(body),
            },
          );

          setLoadedMenu(response.data);
          setForm(toFormState(response.data));
          setActionSuccess(
            `${response.data.weekId} 주차 학식 메뉴를 ${isExistingWeek ? "수정" : "등록"}했습니다.`,
          );
        } catch (caughtError) {
          if (caughtError instanceof ApiError) {
            setActionError(caughtError.message);
            return;
          }

          setActionError("학식 메뉴 저장 중 오류가 발생했습니다.");
        }
      })();
    });
  };

  const handleDelete = () => {
    if (!user || !isExistingWeek || !loadedMenu) {
      setActionError("삭제할 저장된 주차 메뉴가 없습니다.");
      return;
    }

    const confirmed = window.confirm(
      `${loadedMenu.weekId} 주차 학식 메뉴를 삭제하시겠습니까?`,
    );
    if (!confirmed) {
      return;
    }

    startDeleteTransition(() => {
      void (async () => {
        setActionError(null);
        setActionSuccess(null);

        try {
          await getAuthorizedJson<ApiResponse<null>>(
            user,
            `${getApiBaseUrl()}/v1/admin/cafeteria-menus/${loadedMenu.weekId}`,
            {
              method: "DELETE",
            },
          );

          setLoadedMenu(null);
          setForm(createDefaultFormState(loadedMenu.weekId));
          setActionSuccess(`${loadedMenu.weekId} 주차 학식 메뉴를 삭제했습니다.`);
        } catch (caughtError) {
          if (caughtError instanceof ApiError) {
            setActionError(caughtError.message);
            return;
          }

          setActionError("학식 메뉴 삭제 중 오류가 발생했습니다.");
        }
      })();
    });
  };

  return (
    <PageStack>
      <SectionStack className="gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">학식 메뉴 관리</h1>
        <p className="text-sm text-muted-foreground">
          `rollNoodles`, `theBab`, `fryRice` 3개 식당 메뉴를 줄바꿈 단위로
          입력하면, 저장 시 주차 범위의 각 날짜에 동일한 메뉴가 적용됩니다.
          메뉴명 뒤에 {TAKEOUT_SUFFIX}를 붙이면 테이크아웃 배지로 저장됩니다.
        </p>
      </SectionStack>

      {actionError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>작업 실패</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      {actionSuccess ? (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>작업 완료</AlertTitle>
          <AlertDescription>{actionSuccess}</AlertDescription>
        </Alert>
      ) : null}

      {hasNonUniformLoadedMenu ? (
        <Alert>
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>기존 메뉴 메타데이터가 날짜별로 다릅니다.</AlertTitle>
          <AlertDescription>
            현재 편집기는 날짜별 메뉴명/배지 차이를 유지하지 않고, 저장 시
            weekStart부터 weekEnd까지 모든 날짜에 동일한 메뉴 구성을
            덮어씁니다.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>주차 조회</CardTitle>
        </CardHeader>
        <CardContent>
          <SectionStack>
            <InlineGroup>
              <Badge
                className={
                  isExistingWeek
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
                    : "border border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-300"
                }
              >
                {isExistingWeek ? "저장된 주차" : "신규 생성 모드"}
              </Badge>
              <p className="text-sm text-muted-foreground">
                현재 폼 기준 weekId: {form.weekId || "-"}
              </p>
            </InlineGroup>

            <InlineGroup className="items-end">
              <FormField label="weekId" className="w-full max-w-60">
                <Input
                  value={form.weekId}
                  onChange={(event) => updateForm("weekId", event.target.value)}
                  placeholder="2026-W13"
                />
              </FormField>
              <InlineGroup>
                <Button
                  variant="outline"
                  disabled={isLookupPending}
                  onClick={handleLookup}
                >
                  {isLookupPending ? "조회 중..." : "weekId 조회"}
                </Button>
                <Button
                  variant="secondary"
                  disabled={isLookupPending}
                  onClick={handleLoadCurrentWeek}
                >
                  {isLookupPending ? "불러오는 중..." : "현재 주 불러오기"}
                </Button>
              </InlineGroup>
            </InlineGroup>
          </SectionStack>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>주차 메뉴 편집</CardTitle>
        </CardHeader>
        <CardContent>
          <SectionStack className="gap-5">
            <InlineGroup>
              <Badge variant="secondary">{form.weekId || "weekId 미입력"}</Badge>
              <p className="text-sm text-muted-foreground">
                weekId와 weekStart는 같은 ISO 주차여야 합니다.
              </p>
            </InlineGroup>

            <TwoColumnGrid className="max-w-2xl">
              <FormField label="weekStart">
                <Input
                  type="date"
                  value={form.weekStart}
                  onChange={(event) => updateForm("weekStart", event.target.value)}
                />
              </FormField>

              <FormField label="weekEnd">
                <Input
                  type="date"
                  value={form.weekEnd}
                  onChange={(event) => updateForm("weekEnd", event.target.value)}
                />
              </FormField>
            </TwoColumnGrid>

            <div className="grid gap-4 xl:grid-cols-3">
              {restaurantFields.map((field) => (
                <FormField
                  key={field.key}
                  label={field.label}
                  hint={`한 줄에 메뉴 하나씩 입력합니다. 테이크아웃 메뉴는 뒤에 ${TAKEOUT_SUFFIX}를 붙이세요.`}
                >
                  <Textarea
                    className="min-h-[360px]"
                    value={form[`${field.key}Text`]}
                    onChange={(event) =>
                      updateForm(
                        `${field.key}Text` as keyof CafeteriaFormState,
                        event.target.value,
                      )
                    }
                    placeholder={field.placeholder}
                  />
                </FormField>
              ))}
            </div>

            <Card className="bg-muted/30">
              <CardContent className="space-y-2 pt-6">
                <h2 className="text-sm font-semibold">저장 범위 미리보기</h2>
                <p className="text-sm text-muted-foreground">
                  입력한 메뉴는 아래 날짜들에 동일하게 저장됩니다.
                </p>
                <InlineGroup>
                  {targetDates.length ? (
                    targetDates.map((date) => (
                      <Badge key={date} variant="secondary">
                        {date}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      weekStart와 weekEnd를 입력하면 저장 대상 날짜를 표시합니다.
                    </p>
                  )}
                </InlineGroup>
              </CardContent>
            </Card>

            {validationError ? (
              <Alert>
                <TriangleAlert className="h-4 w-4" />
                <AlertTitle>저장 전 확인 필요</AlertTitle>
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">
                현재 계약에는 주차 전체 목록 API가 없어 current/weekId 단건 조회만
                제공합니다.
              </p>
              <InlineGroup>
                <Button
                  disabled={!isExistingWeek}
                  variant="outline"
                  onClick={handleDelete}
                >
                  {isDeletePending ? "삭제 중..." : "삭제"}
                </Button>
                <Button
                  disabled={Boolean(validationError) || isSavePending}
                  onClick={handleSave}
                >
                  {isSavePending ? "저장 중..." : isExistingWeek ? "저장" : "등록"}
                </Button>
              </InlineGroup>
            </div>
          </SectionStack>
        </CardContent>
      </Card>
    </PageStack>
  );
}
