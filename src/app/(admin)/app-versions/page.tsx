"use client";

import {
  Alert,
  Badge,
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
  Tabs,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { useAuth } from "@/features/auth/auth-context";
import { PageErrorState, PageLoadingState } from "@/components/admin/page-status";
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
import { useEffect, useMemo, useState, useTransition } from "react";

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

  const validationError = useMemo(
    () => validateForm(activeForm),
    [activeForm],
  );

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
    <Stack gap="6">
      <Stack gap="2">
        <Heading size="xl">앱 버전 관리</Heading>
        <Text color="fg.muted">
          Spring public 버전 응답을 기준으로 현재 live 설정을 불러오고,
          관리자 PUT API로 플랫폼별 최소 버전과 업데이트 안내 문구를 저장합니다.
        </Text>
      </Stack>

      <Tabs.Root
        fitted
        lazyMount
        value={activePlatform}
        onValueChange={(details) =>
          setActivePlatform(details.value as AppPlatform)
        }
      >
        <Tabs.List>
          {appPlatforms.map((platform) => (
            <Tabs.Trigger key={platform} value={platform}>
              {platformLabels[platform]}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {appPlatforms.map((platform) => {
          const version = versionsByPlatform[platform];
          const form = formsByPlatform[platform];
          const buttonVisible = hasButton(form);
          const lastSavedAt = lastSavedAtByPlatform[platform] ?? null;

          return (
            <Tabs.Content key={platform} value={platform} pt="6">
              <Grid gap="6" templateColumns={{ base: "1fr", xl: "1.1fr 0.9fr" }}>
                <Card.Root>
                  <Card.Header>
                    <Heading size="md">{platformLabels[platform]} 설정 편집</Heading>
                  </Card.Header>
                  <Card.Body>
                    <Stack gap="5">
                      {saveError && platform === activePlatform ? (
                        <Alert.Root status="error">
                          <Alert.Indicator />
                          <Alert.Content>
                            <Alert.Title>저장 실패</Alert.Title>
                            <Alert.Description>{saveError}</Alert.Description>
                          </Alert.Content>
                        </Alert.Root>
                      ) : null}

                      {saveSuccess && platform === activePlatform ? (
                        <Alert.Root status="success">
                          <Alert.Indicator />
                          <Alert.Content>
                            <Alert.Title>저장 완료</Alert.Title>
                            <Alert.Description>{saveSuccess}</Alert.Description>
                          </Alert.Content>
                        </Alert.Root>
                      ) : null}

                      <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
                        <Field.Root invalid={platform === activePlatform && Boolean(validationError && !form.minimumVersion.trim())}>
                          <Field.Label>minimumVersion</Field.Label>
                          <Input
                            value={form.minimumVersion}
                            onChange={(event) =>
                              updateForm("minimumVersion", event.target.value)
                            }
                          />
                          <Field.HelperText>
                            Public API 기본값은 1.0.0입니다.
                          </Field.HelperText>
                        </Field.Root>

                        <Field.Root>
                          <Field.Label>forceUpdate</Field.Label>
                          <NativeSelect.Root>
                            <NativeSelect.Field
                              value={form.forceUpdate}
                              onChange={(event) =>
                                updateForm(
                                  "forceUpdate",
                                  event.target.value as AppVersionFormState["forceUpdate"],
                                )
                              }
                            >
                              <option value="false">false</option>
                              <option value="true">true</option>
                            </NativeSelect.Field>
                          </NativeSelect.Root>
                        </Field.Root>

                        <Field.Root>
                          <Field.Label>title</Field.Label>
                          <Input
                            value={form.title}
                            onChange={(event) =>
                              updateForm("title", event.target.value)
                            }
                            placeholder="업데이트 안내"
                          />
                        </Field.Root>

                        <Field.Root>
                          <Field.Label>showButton</Field.Label>
                          <NativeSelect.Root>
                            <NativeSelect.Field
                              value={form.showButton}
                              onChange={(event) =>
                                updateShowButton(
                                  event.target.value as AppVersionFormState["showButton"],
                                )
                              }
                            >
                              <option value="false">false</option>
                              <option value="true">true</option>
                            </NativeSelect.Field>
                          </NativeSelect.Root>
                          <Field.HelperText>
                            true일 때만 buttonText/buttonUrl을 함께 보냅니다.
                          </Field.HelperText>
                        </Field.Root>
                      </SimpleGrid>

                      <Field.Root>
                        <Field.Label>message</Field.Label>
                        <Textarea
                          autoresize
                          minH="160px"
                          value={form.message}
                          onChange={(event) =>
                            updateForm("message", event.target.value)
                          }
                          placeholder="안정성 개선을 위한 업데이트입니다."
                        />
                      </Field.Root>

                      <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
                        <Field.Root invalid={platform === activePlatform && buttonVisible && !form.buttonText.trim()}>
                          <Field.Label>buttonText</Field.Label>
                          <Input
                            disabled={!buttonVisible}
                            value={form.buttonText}
                            onChange={(event) =>
                              updateForm("buttonText", event.target.value)
                            }
                            placeholder="업데이트"
                          />
                        </Field.Root>

                        <Field.Root invalid={platform === activePlatform && buttonVisible && !form.buttonUrl.trim()}>
                          <Field.Label>buttonUrl</Field.Label>
                          <Input
                            disabled={!buttonVisible}
                            value={form.buttonUrl}
                            onChange={(event) =>
                              updateForm("buttonUrl", event.target.value)
                            }
                            placeholder="https://apps.apple.com/..."
                          />
                        </Field.Root>
                      </SimpleGrid>

                      <HStack justify="space-between" wrap="wrap">
                        <Text color="fg.muted" fontSize="sm">
                          마지막 관리자 저장 시각:{" "}
                          {lastSavedAt ? formatDateTime(lastSavedAt) : "-"}
                        </Text>
                        <HStack>
                          <Button
                            disabled={!isDirty || isSavePending}
                            variant="ghost"
                            onClick={resetForm}
                          >
                            변경 취소
                          </Button>
                          <Button
                            colorPalette="blue"
                            disabled={!isDirty || Boolean(validationError)}
                            loading={isSavePending && platform === activePlatform}
                            onClick={handleSave}
                          >
                            저장
                          </Button>
                        </HStack>
                      </HStack>
                    </Stack>
                  </Card.Body>
                </Card.Root>

                <Stack gap="6">
                  <Card.Root>
                    <Card.Header>
                      <Heading size="md">현재 live 응답</Heading>
                    </Card.Header>
                    <Card.Body>
                      <Stack gap="4">
                        <HStack wrap="wrap">
                          <Badge colorPalette="blue">{platformLabels[platform]}</Badge>
                          <Badge
                            colorPalette={version.forceUpdate ? "red" : "green"}
                          >
                            {version.forceUpdate ? "강제 업데이트" : "선택 업데이트"}
                          </Badge>
                          <Badge
                            colorPalette={version.showButton ? "purple" : "gray"}
                          >
                            {version.showButton ? "버튼 노출" : "버튼 숨김"}
                          </Badge>
                        </HStack>

                        <Stack gap="1">
                          <Text color="fg.muted" fontSize="sm">
                            minimumVersion
                          </Text>
                          <Text fontSize="lg" fontWeight="semibold">
                            {version.minimumVersion}
                          </Text>
                        </Stack>

                        <Stack gap="1">
                          <Text color="fg.muted" fontSize="sm">
                            title
                          </Text>
                          <Text>{version.title ?? "-"}</Text>
                        </Stack>

                        <Stack gap="1">
                          <Text color="fg.muted" fontSize="sm">
                            message
                          </Text>
                          <Text whiteSpace="pre-wrap">
                            {version.message ?? "-"}
                          </Text>
                        </Stack>

                        <Stack gap="1">
                          <Text color="fg.muted" fontSize="sm">
                            button
                          </Text>
                          <Text>
                            {version.showButton
                              ? `${version.buttonText ?? "-"} / ${version.buttonUrl ?? "-"}`
                              : "-"}
                          </Text>
                        </Stack>
                      </Stack>
                    </Card.Body>
                  </Card.Root>

                  <Card.Root>
                    <Card.Header>
                      <Heading size="md">저장 전 체크</Heading>
                    </Card.Header>
                    <Card.Body>
                      <Stack gap="3">
                        <Text color="fg.muted" fontSize="sm">
                          Spring 검증 규칙과 동일하게 버튼을 노출할 때는
                          buttonText, buttonUrl이 모두 필요합니다.
                        </Text>
                        <Text color="fg.muted" fontSize="sm">
                          저장 후에는 public GET /v1/app-versions/{platform}
                          응답을 다시 불러와 화면을 갱신합니다.
                        </Text>
                        {validationError && platform === activePlatform ? (
                          <Alert.Root status="warning">
                            <Alert.Indicator />
                            <Alert.Content>
                              <Alert.Title>저장 전 확인 필요</Alert.Title>
                              <Alert.Description>{validationError}</Alert.Description>
                            </Alert.Content>
                          </Alert.Root>
                        ) : null}
                      </Stack>
                    </Card.Body>
                  </Card.Root>
                </Stack>
              </Grid>
            </Tabs.Content>
          );
        })}
      </Tabs.Root>
    </Stack>
  );
}
