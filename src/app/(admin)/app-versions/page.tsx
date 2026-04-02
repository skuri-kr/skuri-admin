"use client";

import { AlertCircle, RefreshCw, Smartphone } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import {
  PageErrorState,
  PageLoadingState,
} from "@/components/admin/page-status";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getAuthorizedJson } from "@/lib/api/authenticated-client";
import { ApiError, getJson } from "@/lib/api/http";
import { getApiBaseUrl } from "@/lib/env/public-env";
import { formatDateTime } from "@/lib/format/date";
import type {
  ApiResponse,
  AppPlatform,
  AppVersion,
  AppVersionAdminUpdateResponse,
} from "@/features/admin/types";
import { type ReactNode, useEffect, useMemo, useState, useTransition } from "react";

const appPlatforms = ["ios", "android"] as const;

const platformLabels: Record<AppPlatform, string> = {
  ios: "iOS",
  android: "Android",
};

interface AppVersionFormState {
  minimumVersion: string;
  forceUpdate: "true" | "false";
  title: string;
  message: string;
  showButton: "true" | "false";
  buttonText: string;
  buttonUrl: string;
}

function createDefaultFormState(): AppVersionFormState {
  return {
    minimumVersion: "1.0.0",
    forceUpdate: "false",
    title: "",
    message: "",
    showButton: "false",
    buttonText: "",
    buttonUrl: "",
  };
}

function toFormState(version: AppVersion): AppVersionFormState {
  return {
    minimumVersion: version.minimumVersion,
    forceUpdate: version.forceUpdate ? "true" : "false",
    title: version.title ?? "",
    message: version.message ?? "",
    showButton: version.showButton ? "true" : "false",
    buttonText: version.buttonText ?? "",
    buttonUrl: version.buttonUrl ?? "",
  };
}

function createDefaultForms() {
  return appPlatforms.reduce(
    (accumulator, platform) => {
      accumulator[platform] = createDefaultFormState();
      return accumulator;
    },
    {} as Record<AppPlatform, AppVersionFormState>,
  );
}

function hasButton(form: AppVersionFormState) {
  return form.showButton === "true";
}

function validateForm(form: AppVersionFormState) {
  if (!form.minimumVersion.trim()) {
    return "minimumVersion은 비어 있을 수 없습니다.";
  }
  if (form.minimumVersion.trim().length > 20) {
    return "minimumVersion은 20자 이하여야 합니다.";
  }
  if (form.title.trim().length > 100) {
    return "제목은 100자 이하여야 합니다.";
  }
  if (form.message.trim().length > 500) {
    return "메시지는 500자 이하여야 합니다.";
  }
  if (!hasButton(form)) {
    return null;
  }
  if (!form.buttonText.trim() || !form.buttonUrl.trim()) {
    return "버튼 노출 시 buttonText와 buttonUrl을 모두 입력해야 합니다.";
  }
  if (form.buttonText.trim().length > 100) {
    return "buttonText는 100자 이하여야 합니다.";
  }
  if (form.buttonUrl.trim().length > 500) {
    return "buttonUrl은 500자 이하여야 합니다.";
  }
  return null;
}

function buildComparableSnapshot(form: AppVersionFormState) {
  return {
    minimumVersion: form.minimumVersion,
    forceUpdate: form.forceUpdate,
    title: form.title,
    message: form.message,
    showButton: form.showButton,
    buttonText: form.buttonText,
    buttonUrl: form.buttonUrl,
  };
}

function statusClasses(active: boolean) {
  return active
    ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
    : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300";
}

function buttonClasses(active: boolean) {
  return active
    ? "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300"
    : "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-300";
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="text-sm leading-6">{value}</div>
    </div>
  );
}

export default function AppVersionsPage() {
  const { user, isAdminVerified } = useAuth();
  const [activePlatform, setActivePlatform] = useState<AppPlatform>("ios");
  const [versionsByPlatform, setVersionsByPlatform] = useState<
    Record<AppPlatform, AppVersion>
  >({
    ios: {
      platform: "ios",
      minimumVersion: "1.0.0",
      forceUpdate: false,
      title: null,
      message: null,
      showButton: false,
      buttonText: null,
      buttonUrl: null,
    },
    android: {
      platform: "android",
      minimumVersion: "1.0.0",
      forceUpdate: false,
      title: null,
      message: null,
      showButton: false,
      buttonText: null,
      buttonUrl: null,
    },
  });
  const [formsByPlatform, setFormsByPlatform] = useState<
    Record<AppPlatform, AppVersionFormState>
  >(createDefaultForms());
  const [lastSavedAtByPlatform, setLastSavedAtByPlatform] = useState<
    Partial<Record<AppPlatform, string>>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isSavePending, startSaveTransition] = useTransition();

  useEffect(() => {
    if (!user || !isAdminVerified) {
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const versionEntries = await Promise.all(
          appPlatforms.map(async (platform) => {
            const response = await getJson<ApiResponse<AppVersion>>(
              `${getApiBaseUrl()}/v1/app-versions/${platform}`,
              {
                signal: controller.signal,
                cache: "no-store",
              },
            );

            return [platform, response.data] as const;
          }),
        );

        const nextVersions = versionEntries.reduce(
          (accumulator, [platform, version]) => {
            accumulator[platform] = version;
            return accumulator;
          },
          {} as Record<AppPlatform, AppVersion>,
        );

        setVersionsByPlatform(nextVersions);
        setFormsByPlatform({
          ios: toFormState(nextVersions.ios),
          android: toFormState(nextVersions.android),
        });
      } catch {
        if (!controller.signal.aborted) {
          setError("앱 버전 설정을 불러오지 못했습니다.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => controller.abort();
  }, [isAdminVerified, refreshKey, user]);

  const activeVersion = versionsByPlatform[activePlatform];
  const activeForm = formsByPlatform[activePlatform];

  const validationError = useMemo(() => validateForm(activeForm), [activeForm]);

  const isDirty = useMemo(
    () =>
      JSON.stringify(buildComparableSnapshot(activeForm)) !==
      JSON.stringify(buildComparableSnapshot(toFormState(activeVersion))),
    [activeForm, activeVersion],
  );

  if (loading) {
    return <PageLoadingState label="앱 버전 설정을 불러오는 중입니다." />;
  }

  if (error) {
    return <PageErrorState title="앱 버전 로드 실패" message={error} />;
  }

  const updateForm = <K extends keyof AppVersionFormState>(
    key: K,
    value: AppVersionFormState[K],
  ) => {
    setFormsByPlatform((current) => ({
      ...current,
      [activePlatform]: {
        ...current[activePlatform],
        [key]: value,
      },
    }));
  };

  const updateShowButton = (value: AppVersionFormState["showButton"]) => {
    setFormsByPlatform((current) => ({
      ...current,
      [activePlatform]: {
        ...current[activePlatform],
        showButton: value,
        buttonText: value === "true" ? current[activePlatform].buttonText : "",
        buttonUrl: value === "true" ? current[activePlatform].buttonUrl : "",
      },
    }));
  };

  const resetForm = () => {
    setFormsByPlatform((current) => ({
      ...current,
      [activePlatform]: toFormState(activeVersion),
    }));
    setSaveError(null);
    setSaveSuccess(null);
  };

  const handleSave = () => {
    if (!user || validationError) {
      if (validationError) {
        setSaveError(validationError);
      }
      return;
    }

    startSaveTransition(() => {
      void (async () => {
        setSaveError(null);
        setSaveSuccess(null);

        try {
          const response = await getAuthorizedJson<
            ApiResponse<AppVersionAdminUpdateResponse>
          >(user, `${getApiBaseUrl()}/v1/admin/app-versions/${activePlatform}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              minimumVersion: activeForm.minimumVersion.trim(),
              forceUpdate: activeForm.forceUpdate === "true",
              title: activeForm.title.trim() || null,
              message: activeForm.message.trim() || null,
              showButton: activeForm.showButton === "true",
              buttonText:
                activeForm.showButton === "true"
                  ? activeForm.buttonText.trim()
                  : null,
              buttonUrl:
                activeForm.showButton === "true"
                  ? activeForm.buttonUrl.trim()
                  : null,
            }),
          });

          setLastSavedAtByPlatform((current) => ({
            ...current,
            [activePlatform]: response.data.updatedAt,
          }));
          setSaveSuccess(
            `${platformLabels[activePlatform]} 앱 버전 설정을 저장했습니다.`,
          );
          setRefreshKey((current) => current + 1);
        } catch (caughtError) {
          if (caughtError instanceof ApiError) {
            setSaveError(caughtError.message);
            return;
          }

          setSaveError("앱 버전 설정 저장 중 오류가 발생했습니다.");
        }
      })();
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">앱 버전 관리</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Spring public 버전 응답을 기준으로 현재 live 설정을 불러오고, 관리자
          PUT API로 플랫폼별 최소 버전과 업데이트 안내 문구를 저장합니다.
        </p>
      </div>

      <Tabs
        value={activePlatform}
        onValueChange={(value) => setActivePlatform(value as AppPlatform)}
      >
        <TabsList className="w-full justify-start">
          {appPlatforms.map((platform) => (
            <TabsTrigger key={platform} value={platform} className="min-w-28">
              {platformLabels[platform]}
            </TabsTrigger>
          ))}
        </TabsList>

        {appPlatforms.map((platform) => {
          const version = versionsByPlatform[platform];
          const form = formsByPlatform[platform];
          const buttonVisible = hasButton(form);
          const lastSavedAt = lastSavedAtByPlatform[platform] ?? null;

          return (
            <TabsContent key={platform} value={platform} className="pt-4">
              <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <Card>
                  <CardHeader>
                    <CardTitle>{platformLabels[platform]} 설정 편집</CardTitle>
                    <CardDescription>
                      minimumVersion, forceUpdate, 버튼 노출 여부와 안내 문구를
                      수정합니다.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {saveError && platform === activePlatform ? (
                      <Alert variant="destructive">
                        <AlertCircle className="size-4" />
                        <AlertTitle>저장 실패</AlertTitle>
                        <AlertDescription>{saveError}</AlertDescription>
                      </Alert>
                    ) : null}

                    {saveSuccess && platform === activePlatform ? (
                      <Alert>
                        <RefreshCw className="size-4" />
                        <AlertTitle>저장 완료</AlertTitle>
                        <AlertDescription>{saveSuccess}</AlertDescription>
                      </Alert>
                    ) : null}

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`${platform}-minimumVersion`}>
                          minimumVersion
                        </Label>
                        <Input
                          id={`${platform}-minimumVersion`}
                          value={form.minimumVersion}
                          onChange={(event) =>
                            updateForm("minimumVersion", event.target.value)
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          Public API 기본값은 1.0.0입니다.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>forceUpdate</Label>
                        <Select
                          value={form.forceUpdate}
                          onValueChange={(value) =>
                            updateForm(
                              "forceUpdate",
                              value as AppVersionFormState["forceUpdate"],
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="false">false</SelectItem>
                            <SelectItem value="true">true</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`${platform}-title`}>title</Label>
                        <Input
                          id={`${platform}-title`}
                          value={form.title}
                          onChange={(event) =>
                            updateForm("title", event.target.value)
                          }
                          placeholder="업데이트 안내"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>showButton</Label>
                        <Select
                          value={form.showButton}
                          onValueChange={(value) =>
                            updateShowButton(
                              value as AppVersionFormState["showButton"],
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="false">false</SelectItem>
                            <SelectItem value="true">true</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          true일 때만 buttonText/buttonUrl을 함께 보냅니다.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`${platform}-message`}>message</Label>
                      <Textarea
                        id={`${platform}-message`}
                        className="min-h-40"
                        value={form.message}
                        onChange={(event) =>
                          updateForm("message", event.target.value)
                        }
                        placeholder="안정성 개선을 위한 업데이트입니다."
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`${platform}-buttonText`}>buttonText</Label>
                        <Input
                          id={`${platform}-buttonText`}
                          disabled={!buttonVisible}
                          value={form.buttonText}
                          onChange={(event) =>
                            updateForm("buttonText", event.target.value)
                          }
                          placeholder="업데이트"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`${platform}-buttonUrl`}>buttonUrl</Label>
                        <Input
                          id={`${platform}-buttonUrl`}
                          disabled={!buttonVisible}
                          value={form.buttonUrl}
                          onChange={(event) =>
                            updateForm("buttonUrl", event.target.value)
                          }
                          placeholder="https://apps.apple.com/..."
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm text-muted-foreground">
                        마지막 관리자 저장 시각:{" "}
                        {lastSavedAt ? formatDateTime(lastSavedAt) : "-"}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          disabled={!isDirty || isSavePending}
                          onClick={resetForm}
                        >
                          변경 취소
                        </Button>
                        <Button
                          disabled={!isDirty || Boolean(validationError)}
                          onClick={handleSave}
                        >
                          저장
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>현재 live 응답</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300">
                          {platformLabels[platform]}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={statusClasses(version.forceUpdate)}
                        >
                          {version.forceUpdate ? "강제 업데이트" : "선택 업데이트"}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={buttonClasses(version.showButton)}
                        >
                          {version.showButton ? "버튼 노출" : "버튼 숨김"}
                        </Badge>
                      </div>

                      <InfoRow
                        label="minimumVersion"
                        value={
                          <p className="text-lg font-semibold">
                            {version.minimumVersion}
                          </p>
                        }
                      />
                      <InfoRow label="title" value={version.title ?? "-"} />
                      <InfoRow
                        label="message"
                        value={
                          <p className="whitespace-pre-wrap">{version.message ?? "-"}</p>
                        }
                      />
                      <InfoRow
                        label="button"
                        value={
                          version.showButton
                            ? `${version.buttonText ?? "-"} / ${version.buttonUrl ?? "-"}`
                            : "-"
                        }
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>저장 전 체크</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                      <p>
                        Spring 검증 규칙과 동일하게 버튼을 노출할 때는 buttonText,
                        buttonUrl이 모두 필요합니다.
                      </p>
                      <p>
                        저장 후에는 public{" "}
                        <code className="rounded bg-muted px-1 py-0.5 text-xs">
                          GET /v1/app-versions/{platform}
                        </code>{" "}
                        응답을 다시 불러와 화면을 갱신합니다.
                      </p>
                      {validationError && platform === activePlatform ? (
                        <Alert>
                          <Smartphone className="size-4" />
                          <AlertTitle>저장 전 확인 필요</AlertTitle>
                          <AlertDescription>{validationError}</AlertDescription>
                        </Alert>
                      ) : null}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
