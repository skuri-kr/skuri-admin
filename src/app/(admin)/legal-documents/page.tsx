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
  Table,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { useAuth } from "@/features/auth/auth-context";
import { PageErrorState, PageLoadingState } from "@/components/admin/page-status";
import { getAuthorizedJson } from "@/lib/api/authenticated-client";
import { ApiError } from "@/lib/api/http";
import { getApiBaseUrl } from "@/lib/env/public-env";
import { formatDateTime } from "@/lib/format/date";
import type {
  ApiResponse,
  LegalDocumentAdminResponse,
  LegalDocumentAdminSummary,
  LegalDocumentBannerIconKey,
  LegalDocumentBannerLineTone,
  LegalDocumentBannerTone,
  LegalDocumentDeleteResponse,
  LegalDocumentKey,
} from "@/features/admin/types";
import { useEffect, useMemo, useState, useTransition } from "react";

const documentKeys = ["termsOfUse", "privacyPolicy"] as const;
const bannerIconKeys = ["document", "shield"] as const;
const bannerTones = ["green", "blue"] as const;
const bannerLineTones = ["primary", "secondary"] as const;

const documentLabels: Record<LegalDocumentKey, string> = {
  termsOfUse: "이용약관",
  privacyPolicy: "개인정보 처리방침",
};

interface BannerLineFormState {
  text: string;
  tone: LegalDocumentBannerLineTone;
}

interface SectionFormState {
  id: string;
  title: string;
  paragraphsText: string;
}

interface LegalDocumentFormState {
  title: string;
  bannerIconKey: LegalDocumentBannerIconKey;
  bannerTitle: string;
  bannerTone: LegalDocumentBannerTone;
  bannerLines: BannerLineFormState[];
  sections: SectionFormState[];
  footerLinesText: string;
  isActive: "true" | "false";
}

function createDefaultBannerLine(): BannerLineFormState {
  return {
    text: "",
    tone: "primary",
  };
}

function createDefaultSection(): SectionFormState {
  return {
    id: "",
    title: "",
    paragraphsText: "",
  };
}

function createDefaultFormState(
  documentKey: LegalDocumentKey,
): LegalDocumentFormState {
  return {
    title: documentLabels[documentKey],
    bannerIconKey: documentKey === "privacyPolicy" ? "shield" : "document",
    bannerTitle: `SKURI ${documentLabels[documentKey]}`,
    bannerTone: documentKey === "privacyPolicy" ? "blue" : "green",
    bannerLines: [createDefaultBannerLine()],
    sections: [createDefaultSection()],
    footerLinesText: "",
    isActive: "true",
  };
}

function toFormState(
  document: LegalDocumentAdminResponse,
): LegalDocumentFormState {
  return {
    title: document.title,
    bannerIconKey: document.banner.iconKey,
    bannerTitle: document.banner.title,
    bannerTone: document.banner.tone,
    bannerLines: document.banner.lines.map((line) => ({
      text: line.text,
      tone: line.tone,
    })),
    sections: document.sections.map((section) => ({
      id: section.id,
      title: section.title,
      paragraphsText: section.paragraphs.join("\n"),
    })),
    footerLinesText: document.footerLines.join("\n"),
    isActive: document.isActive ? "true" : "false",
  };
}

function parseMultilineValues(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildComparableSnapshot(form: LegalDocumentFormState) {
  return {
    title: form.title.trim(),
    banner: {
      iconKey: form.bannerIconKey,
      title: form.bannerTitle.trim(),
      tone: form.bannerTone,
      lines: form.bannerLines.map((line) => ({
        text: line.text.trim(),
        tone: line.tone,
      })),
    },
    sections: form.sections.map((section) => ({
      id: section.id.trim(),
      title: section.title.trim(),
      paragraphs: parseMultilineValues(section.paragraphsText),
    })),
    footerLines: parseMultilineValues(form.footerLinesText),
    isActive: form.isActive === "true",
  };
}

function validateForm(form: LegalDocumentFormState) {
  if (!form.title.trim()) {
    return "문서 제목은 비어 있을 수 없습니다.";
  }
  if (!form.bannerTitle.trim()) {
    return "배너 제목은 비어 있을 수 없습니다.";
  }
  if (!form.bannerLines.length) {
    return "배너 라인은 최소 1개 이상이어야 합니다.";
  }
  const emptyBannerLine = form.bannerLines.findIndex((line) => !line.text.trim());
  if (emptyBannerLine >= 0) {
    return `배너 라인 ${emptyBannerLine + 1}의 문구를 입력해주세요.`;
  }
  if (!form.sections.length) {
    return "본문 섹션은 최소 1개 이상이어야 합니다.";
  }

  for (let index = 0; index < form.sections.length; index += 1) {
    const section = form.sections[index];
    if (!section.id.trim()) {
      return `섹션 ${index + 1}의 id를 입력해주세요.`;
    }
    if (!section.title.trim()) {
      return `섹션 ${index + 1}의 제목을 입력해주세요.`;
    }
    if (!parseMultilineValues(section.paragraphsText).length) {
      return `섹션 ${index + 1}의 문단을 최소 1개 이상 입력해주세요.`;
    }
  }

  return null;
}

export default function LegalDocumentsPage() {
  const { user, isAdminVerified } = useAuth();
  const [selectedDocumentKey, setSelectedDocumentKey] =
    useState<LegalDocumentKey>("termsOfUse");
  const [summaries, setSummaries] = useState<LegalDocumentAdminSummary[]>([]);
  const [documentsByKey, setDocumentsByKey] = useState<
    Record<LegalDocumentKey, LegalDocumentAdminResponse | null>
  >({
    termsOfUse: null,
    privacyPolicy: null,
  });
  const [form, setForm] = useState<LegalDocumentFormState>(
    createDefaultFormState("termsOfUse"),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isSavePending, startSaveTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();

  useEffect(() => {
    if (!user || !isAdminVerified) {
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const summaryPromise = getAuthorizedJson<
          ApiResponse<LegalDocumentAdminSummary[]>
        >(user, `${getApiBaseUrl()}/v1/admin/legal-documents`, {
          signal: controller.signal,
        });

        const detailPromise = Promise.all(
          documentKeys.map(async (documentKey) => {
            try {
              const response = await getAuthorizedJson<
                ApiResponse<LegalDocumentAdminResponse>
              >(user, `${getApiBaseUrl()}/v1/admin/legal-documents/${documentKey}`, {
                signal: controller.signal,
              });

              return [documentKey, response.data] as const;
            } catch (caughtError) {
              if (caughtError instanceof ApiError && caughtError.status === 404) {
                return [documentKey, null] as const;
              }

              throw caughtError;
            }
          }),
        );

        const [summaryResponse, detailEntries] = await Promise.all([
          summaryPromise,
          detailPromise,
        ]);

        const nextDocuments = detailEntries.reduce(
          (accumulator, [documentKey, document]) => {
            accumulator[documentKey] = document;
            return accumulator;
          },
          {
            termsOfUse: null,
            privacyPolicy: null,
          } as Record<LegalDocumentKey, LegalDocumentAdminResponse | null>,
        );

        setSummaries(summaryResponse.data);
        setDocumentsByKey(nextDocuments);
      } catch {
        if (!controller.signal.aborted) {
          setError("법적 문서 데이터를 불러오지 못했습니다.");
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

  const selectedDocument = documentsByKey[selectedDocumentKey];

  useEffect(() => {
    setForm(
      selectedDocument
        ? toFormState(selectedDocument)
        : createDefaultFormState(selectedDocumentKey),
    );
    setActionError(null);
    setActionSuccess(null);
  }, [selectedDocument, selectedDocumentKey]);

  const summaryByKey = useMemo(
    () =>
      summaries.reduce(
        (accumulator, summary) => {
          accumulator[summary.id] = summary;
          return accumulator;
        },
        {} as Partial<Record<LegalDocumentKey, LegalDocumentAdminSummary>>,
      ),
    [summaries],
  );

  const validationError = useMemo(() => validateForm(form), [form]);

  const isDirty = useMemo(() => {
    const baseForm = selectedDocument
      ? toFormState(selectedDocument)
      : createDefaultFormState(selectedDocumentKey);

    return (
      JSON.stringify(buildComparableSnapshot(form)) !==
      JSON.stringify(buildComparableSnapshot(baseForm))
    );
  }, [form, selectedDocument, selectedDocumentKey]);

  if (loading) {
    return <PageLoadingState label="법적 문서 데이터를 불러오는 중입니다." />;
  }

  if (error) {
    return <PageErrorState title="법적 문서 로드 실패" message={error} />;
  }

  const updateForm = <K extends keyof LegalDocumentFormState>(
    key: K,
    value: LegalDocumentFormState[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateBannerLine = (
    index: number,
    patch: Partial<BannerLineFormState>,
  ) => {
    setForm((current) => ({
      ...current,
      bannerLines: current.bannerLines.map((line, currentIndex) =>
        currentIndex === index ? { ...line, ...patch } : line,
      ),
    }));
  };

  const addBannerLine = () => {
    setForm((current) => ({
      ...current,
      bannerLines: [...current.bannerLines, createDefaultBannerLine()],
    }));
  };

  const removeBannerLine = (index: number) => {
    setForm((current) => ({
      ...current,
      bannerLines: current.bannerLines.filter(
        (_, currentIndex) => currentIndex !== index,
      ),
    }));
  };

  const updateSection = (index: number, patch: Partial<SectionFormState>) => {
    setForm((current) => ({
      ...current,
      sections: current.sections.map((section, currentIndex) =>
        currentIndex === index ? { ...section, ...patch } : section,
      ),
    }));
  };

  const addSection = () => {
    setForm((current) => ({
      ...current,
      sections: [...current.sections, createDefaultSection()],
    }));
  };

  const removeSection = (index: number) => {
    setForm((current) => ({
      ...current,
      sections: current.sections.filter(
        (_, currentIndex) => currentIndex !== index,
      ),
    }));
  };

  const resetForm = () => {
    setForm(
      selectedDocument
        ? toFormState(selectedDocument)
        : createDefaultFormState(selectedDocumentKey),
    );
    setActionError(null);
    setActionSuccess(null);
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
          await getAuthorizedJson<ApiResponse<LegalDocumentAdminResponse>>(
            user,
            `${getApiBaseUrl()}/v1/admin/legal-documents/${selectedDocumentKey}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                title: form.title.trim(),
                banner: {
                  iconKey: form.bannerIconKey,
                  title: form.bannerTitle.trim(),
                  tone: form.bannerTone,
                  lines: form.bannerLines.map((line) => ({
                    text: line.text.trim(),
                    tone: line.tone,
                  })),
                },
                sections: form.sections.map((section) => ({
                  id: section.id.trim(),
                  title: section.title.trim(),
                  paragraphs: parseMultilineValues(section.paragraphsText),
                })),
                footerLines: parseMultilineValues(form.footerLinesText),
                isActive: form.isActive === "true",
              }),
            },
          );

          setActionSuccess(
            `${documentLabels[selectedDocumentKey]} 문서를 저장했습니다.`,
          );
          setRefreshKey((current) => current + 1);
        } catch (caughtError) {
          if (caughtError instanceof ApiError) {
            setActionError(caughtError.message);
            return;
          }

          setActionError("법적 문서 저장 중 오류가 발생했습니다.");
        }
      })();
    });
  };

  const handleDelete = () => {
    if (!user) {
      return;
    }

    if (!selectedDocument) {
      setActionError("삭제할 저장된 문서가 없습니다.");
      return;
    }

    const confirmed = window.confirm(
      `${documentLabels[selectedDocumentKey]} 문서를 삭제하시겠습니까?`,
    );
    if (!confirmed) {
      return;
    }

    startDeleteTransition(() => {
      void (async () => {
        setActionError(null);
        setActionSuccess(null);

        try {
          await getAuthorizedJson<ApiResponse<LegalDocumentDeleteResponse>>(
            user,
            `${getApiBaseUrl()}/v1/admin/legal-documents/${selectedDocumentKey}`,
            {
              method: "DELETE",
            },
          );

          setActionSuccess(
            `${documentLabels[selectedDocumentKey]} 문서를 삭제했습니다.`,
          );
          setRefreshKey((current) => current + 1);
        } catch (caughtError) {
          if (caughtError instanceof ApiError) {
            setActionError(caughtError.message);
            return;
          }

          setActionError("법적 문서 삭제 중 오류가 발생했습니다.");
        }
      })();
    });
  };

  return (
    <Stack gap="6">
      <Stack gap="2">
        <Heading size="xl">법적 문서 관리</Heading>
        <Text color="fg.muted">
          `termsOfUse`, `privacyPolicy` 두 고정 문서를 Spring 관리자 API에 맞춰
          생성/전체 수정/삭제합니다. 저장되지 않은 문서 키도 미리 선택해 작성할 수
          있습니다.
        </Text>
      </Stack>

      <Grid gap="6" templateColumns={{ base: "1fr", xl: "0.9fr 1.1fr" }}>
        <Stack gap="6">
          <Card.Root>
            <Card.Header>
              <Heading size="md">문서 키 상태</Heading>
            </Card.Header>
            <Card.Body>
              <Table.Root interactive size="sm">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>문서</Table.ColumnHeader>
                    <Table.ColumnHeader>상태</Table.ColumnHeader>
                    <Table.ColumnHeader>수정 시각</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {documentKeys.map((documentKey) => {
                    const summary = summaryByKey[documentKey];
                    const isSelected = selectedDocumentKey === documentKey;

                    return (
                      <Table.Row
                        key={documentKey}
                        bg={isSelected ? "bg.subtle" : undefined}
                        cursor="pointer"
                        onClick={() => setSelectedDocumentKey(documentKey)}
                      >
                        <Table.Cell>
                          <Stack gap="1">
                            <Text fontWeight="semibold">
                              {documentLabels[documentKey]}
                            </Text>
                            <Text color="fg.muted" fontSize="xs">
                              {documentKey}
                            </Text>
                          </Stack>
                        </Table.Cell>
                        <Table.Cell>
                          {summary ? (
                            <Badge
                              colorPalette={summary.isActive ? "green" : "yellow"}
                            >
                              {summary.isActive ? "공개중" : "비공개"}
                            </Badge>
                          ) : (
                            <Badge colorPalette="gray">미생성</Badge>
                          )}
                        </Table.Cell>
                        <Table.Cell>
                          <Text color="fg.muted" fontSize="sm">
                            {summary ? formatDateTime(summary.updatedAt) : "-"}
                          </Text>
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table.Root>
            </Card.Body>
          </Card.Root>

          <Card.Root>
            <Card.Header>
              <Heading size="md">선택한 문서 요약</Heading>
            </Card.Header>
            <Card.Body>
              <Stack gap="4">
                <HStack wrap="wrap">
                  <Badge colorPalette="blue">
                    {documentLabels[selectedDocumentKey]}
                  </Badge>
                  <Badge
                    colorPalette={
                      selectedDocument
                        ? selectedDocument.isActive
                          ? "green"
                          : "yellow"
                        : "gray"
                    }
                  >
                    {selectedDocument
                      ? selectedDocument.isActive
                        ? "공개중"
                        : "비공개"
                      : "미생성"}
                  </Badge>
                </HStack>

                <Stack gap="1">
                  <Text color="fg.muted" fontSize="sm">
                    생성 시각
                  </Text>
                  <Text>
                    {selectedDocument
                      ? formatDateTime(selectedDocument.createdAt)
                      : "-"}
                  </Text>
                </Stack>

                <Stack gap="1">
                  <Text color="fg.muted" fontSize="sm">
                    수정 시각
                  </Text>
                  <Text>
                    {selectedDocument
                      ? formatDateTime(selectedDocument.updatedAt)
                      : "-"}
                  </Text>
                </Stack>

                <Stack gap="1">
                  <Text color="fg.muted" fontSize="sm">
                    섹션 수 / 배너 라인 수
                  </Text>
                  <Text>
                    {selectedDocument
                      ? `${selectedDocument.sections.length}개 / ${selectedDocument.banner.lines.length}개`
                      : "저장된 문서 없음"}
                  </Text>
                </Stack>
              </Stack>
            </Card.Body>
          </Card.Root>
        </Stack>

        <Stack gap="6">
          {actionError ? (
            <Alert.Root status="error">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>작업 실패</Alert.Title>
                <Alert.Description>{actionError}</Alert.Description>
              </Alert.Content>
            </Alert.Root>
          ) : null}

          {actionSuccess ? (
            <Alert.Root status="success">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>작업 완료</Alert.Title>
                <Alert.Description>{actionSuccess}</Alert.Description>
              </Alert.Content>
            </Alert.Root>
          ) : null}

          <Card.Root>
            <Card.Header>
              <Heading size="md">기본 정보</Heading>
            </Card.Header>
            <Card.Body>
              <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
                <Field.Root>
                  <Field.Label>문서 제목</Field.Label>
                  <Input
                    value={form.title}
                    onChange={(event) => updateForm("title", event.target.value)}
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label>공개 여부</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={form.isActive}
                      onChange={(event) =>
                        updateForm(
                          "isActive",
                          event.target.value as LegalDocumentFormState["isActive"],
                        )
                      }
                    >
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>
              </SimpleGrid>
            </Card.Body>
          </Card.Root>

          <Card.Root>
            <Card.Header>
              <Heading size="md">상단 배너</Heading>
            </Card.Header>
            <Card.Body>
              <Stack gap="5">
                <SimpleGrid columns={{ base: 1, md: 3 }} gap="4">
                  <Field.Root>
                    <Field.Label>iconKey</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        value={form.bannerIconKey}
                        onChange={(event) =>
                          updateForm(
                            "bannerIconKey",
                            event.target.value as LegalDocumentBannerIconKey,
                          )
                        }
                      >
                        {bannerIconKeys.map((iconKey) => (
                          <option key={iconKey} value={iconKey}>
                            {iconKey}
                          </option>
                        ))}
                      </NativeSelect.Field>
                    </NativeSelect.Root>
                  </Field.Root>

                  <Field.Root>
                    <Field.Label>tone</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        value={form.bannerTone}
                        onChange={(event) =>
                          updateForm(
                            "bannerTone",
                            event.target.value as LegalDocumentBannerTone,
                          )
                        }
                      >
                        {bannerTones.map((tone) => (
                          <option key={tone} value={tone}>
                            {tone}
                          </option>
                        ))}
                      </NativeSelect.Field>
                    </NativeSelect.Root>
                  </Field.Root>

                  <Field.Root>
                    <Field.Label>배너 제목</Field.Label>
                    <Input
                      value={form.bannerTitle}
                      onChange={(event) =>
                        updateForm("bannerTitle", event.target.value)
                      }
                    />
                  </Field.Root>
                </SimpleGrid>

                <Stack gap="3">
                  <HStack justify="space-between" wrap="wrap">
                    <Text fontWeight="semibold">배너 라인</Text>
                    <Button size="sm" variant="outline" onClick={addBannerLine}>
                      라인 추가
                    </Button>
                  </HStack>

                  {form.bannerLines.map((line, index) => (
                    <Card.Root key={`${selectedDocumentKey}-banner-${index}`} variant="subtle">
                      <Card.Body>
                        <Stack gap="3">
                          <HStack justify="space-between" wrap="wrap">
                            <Text fontWeight="medium">라인 {index + 1}</Text>
                            <Button
                              disabled={form.bannerLines.length === 1}
                              size="sm"
                              variant="ghost"
                              onClick={() => removeBannerLine(index)}
                            >
                              삭제
                            </Button>
                          </HStack>

                          <SimpleGrid columns={{ base: 1, md: 4 }} gap="4">
                            <Field.Root>
                              <Field.Label>tone</Field.Label>
                              <NativeSelect.Root>
                                <NativeSelect.Field
                                  value={line.tone}
                                  onChange={(event) =>
                                    updateBannerLine(index, {
                                      tone:
                                        event.target.value as LegalDocumentBannerLineTone,
                                    })
                                  }
                                >
                                  {bannerLineTones.map((tone) => (
                                    <option key={tone} value={tone}>
                                      {tone}
                                    </option>
                                  ))}
                                </NativeSelect.Field>
                              </NativeSelect.Root>
                            </Field.Root>

                            <Field.Root gridColumn={{ md: "span 3" }}>
                              <Field.Label>text</Field.Label>
                              <Input
                                value={line.text}
                                onChange={(event) =>
                                  updateBannerLine(index, {
                                    text: event.target.value,
                                  })
                                }
                              />
                            </Field.Root>
                          </SimpleGrid>
                        </Stack>
                      </Card.Body>
                    </Card.Root>
                  ))}
                </Stack>
              </Stack>
            </Card.Body>
          </Card.Root>

          <Card.Root>
            <Card.Header>
              <Heading size="md">본문 섹션</Heading>
            </Card.Header>
            <Card.Body>
              <Stack gap="4">
                <HStack justify="space-between" wrap="wrap">
                  <Text color="fg.muted" fontSize="sm">
                    각 섹션의 문단은 줄바꿈 기준으로 분리됩니다.
                  </Text>
                  <Button size="sm" variant="outline" onClick={addSection}>
                    섹션 추가
                  </Button>
                </HStack>

                {form.sections.map((section, index) => (
                  <Card.Root key={`${selectedDocumentKey}-section-${index}`} variant="outline">
                    <Card.Body>
                      <Stack gap="4">
                        <HStack justify="space-between" wrap="wrap">
                          <Text fontWeight="medium">섹션 {index + 1}</Text>
                          <Button
                            disabled={form.sections.length === 1}
                            size="sm"
                            variant="ghost"
                            onClick={() => removeSection(index)}
                          >
                            삭제
                          </Button>
                        </HStack>

                        <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
                          <Field.Root>
                            <Field.Label>id</Field.Label>
                            <Input
                              value={section.id}
                              onChange={(event) =>
                                updateSection(index, { id: event.target.value })
                              }
                              placeholder="article-01"
                            />
                          </Field.Root>

                          <Field.Root>
                            <Field.Label>title</Field.Label>
                            <Input
                              value={section.title}
                              onChange={(event) =>
                                updateSection(index, { title: event.target.value })
                              }
                              placeholder="제1조(목적)"
                            />
                          </Field.Root>
                        </SimpleGrid>

                        <Field.Root>
                          <Field.Label>paragraphs</Field.Label>
                          <Textarea
                            autoresize
                            minH="160px"
                            value={section.paragraphsText}
                            onChange={(event) =>
                              updateSection(index, {
                                paragraphsText: event.target.value,
                              })
                            }
                          />
                        </Field.Root>
                      </Stack>
                    </Card.Body>
                  </Card.Root>
                ))}
              </Stack>
            </Card.Body>
          </Card.Root>

          <Card.Root>
            <Card.Header>
              <Heading size="md">하단 안내 및 작업</Heading>
            </Card.Header>
            <Card.Body>
              <Stack gap="4">
                <Field.Root>
                  <Field.Label>footerLines</Field.Label>
                  <Textarea
                    autoresize
                    minH="120px"
                    value={form.footerLinesText}
                    onChange={(event) =>
                      updateForm("footerLinesText", event.target.value)
                    }
                  />
                  <Field.HelperText>
                    비워두면 빈 배열로 저장됩니다. 각 줄이 1개 문구입니다.
                  </Field.HelperText>
                </Field.Root>

                {validationError ? (
                  <Alert.Root status="warning">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>저장 전 확인 필요</Alert.Title>
                      <Alert.Description>{validationError}</Alert.Description>
                    </Alert.Content>
                  </Alert.Root>
                ) : null}

                <HStack justify="space-between" wrap="wrap">
                  <Text color="fg.muted" fontSize="sm">
                    삭제 후에는 같은 문서 키로 다시 생성할 수 있습니다.
                  </Text>
                  <HStack>
                    <Button
                      disabled={!isDirty || isSavePending || isDeletePending}
                      variant="ghost"
                      onClick={resetForm}
                    >
                      변경 취소
                    </Button>
                    <Button
                      colorPalette="red"
                      disabled={!selectedDocument}
                      loading={isDeletePending}
                      variant="outline"
                      onClick={handleDelete}
                    >
                      삭제
                    </Button>
                    <Button
                      colorPalette="blue"
                      disabled={!isDirty || Boolean(validationError)}
                      loading={isSavePending}
                      onClick={handleSave}
                    >
                      {selectedDocument ? "저장" : "생성"}
                    </Button>
                  </HStack>
                </HStack>
              </Stack>
            </Card.Body>
          </Card.Root>
        </Stack>
      </Grid>
    </Stack>
  );
}
