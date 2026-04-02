"use client";

import {
  AlertCircle,
  CheckCircle2,
  TriangleAlert,
} from "lucide-react";
import { FormField } from "@/components/admin/form-field";
import {
  InlineGroup,
  PageStack,
  ResponsiveGrid,
  SectionStack,
  TwoColumnGrid,
} from "@/components/admin/layout";
import { useAuth } from "@/features/auth/auth-context";
import { PageErrorState, PageLoadingState } from "@/components/admin/page-status";
import { getAuthorizedJson } from "@/lib/api/authenticated-client";
import { ApiError } from "@/lib/api/http";
import { getApiBaseUrl } from "@/lib/env/public-env";
import { formatDateTime } from "@/lib/format/date";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
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
    <PageStack>
      <SectionStack className="gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">법적 문서 관리</h1>
        <p className="text-sm text-muted-foreground">
          `termsOfUse`, `privacyPolicy` 두 고정 문서를 Spring 관리자 API에 맞춰
          생성/전체 수정/삭제합니다. 저장되지 않은 문서 키도 미리 선택해 작성할 수
          있습니다.
        </p>
      </SectionStack>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionStack className="gap-6">
          <Card>
            <CardHeader>
              <CardTitle>문서 키 상태</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>문서</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>수정 시각</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documentKeys.map((documentKey) => {
                    const summary = summaryByKey[documentKey];
                    const isSelected = selectedDocumentKey === documentKey;

                    return (
                      <TableRow
                        key={documentKey}
                        className={
                          isSelected ? "cursor-pointer bg-muted/40" : "cursor-pointer"
                        }
                        onClick={() => setSelectedDocumentKey(documentKey)}
                      >
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-semibold">
                              {documentLabels[documentKey]}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {documentKey}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {summary ? (
                            <Badge
                              className={
                                summary.isActive
                                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
                                  : "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300"
                              }
                            >
                              {summary.isActive ? "공개중" : "비공개"}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">미생성</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-muted-foreground">
                            {summary ? formatDateTime(summary.updatedAt) : "-"}
                          </p>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>선택한 문서 요약</CardTitle>
            </CardHeader>
            <CardContent>
              <SectionStack>
                <InlineGroup>
                  <Badge variant="secondary">
                    {documentLabels[selectedDocumentKey]}
                  </Badge>
                  <Badge
                    className={
                      selectedDocument
                        ? selectedDocument.isActive
                          ? "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
                          : "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300"
                        : "border border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-300"
                    }
                  >
                    {selectedDocument
                      ? selectedDocument.isActive
                        ? "공개중"
                        : "비공개"
                      : "미생성"}
                  </Badge>
                </InlineGroup>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">생성 시각</p>
                  <p>
                    {selectedDocument
                      ? formatDateTime(selectedDocument.createdAt)
                      : "-"}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">수정 시각</p>
                  <p>
                    {selectedDocument
                      ? formatDateTime(selectedDocument.updatedAt)
                      : "-"}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    섹션 수 / 배너 라인 수
                  </p>
                  <p>
                    {selectedDocument
                      ? `${selectedDocument.sections.length}개 / ${selectedDocument.banner.lines.length}개`
                      : "저장된 문서 없음"}
                  </p>
                </div>
              </SectionStack>
            </CardContent>
          </Card>
        </SectionStack>

        <SectionStack className="gap-6">
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

          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <TwoColumnGrid>
                <FormField label="문서 제목">
                  <Input
                    value={form.title}
                    onChange={(event) => updateForm("title", event.target.value)}
                  />
                </FormField>

                <FormField label="공개 여부">
                  <Select
                    value={form.isActive}
                    onValueChange={(value) =>
                      updateForm(
                        "isActive",
                        value as LegalDocumentFormState["isActive"],
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">true</SelectItem>
                      <SelectItem value="false">false</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </TwoColumnGrid>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>상단 배너</CardTitle>
            </CardHeader>
            <CardContent>
              <SectionStack className="gap-5">
                <ResponsiveGrid>
                  <FormField label="iconKey">
                    <Select
                      value={form.bannerIconKey}
                      onValueChange={(value) =>
                        updateForm("bannerIconKey", value as LegalDocumentBannerIconKey)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {bannerIconKeys.map((iconKey) => (
                          <SelectItem key={iconKey} value={iconKey}>
                            {iconKey}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField label="tone">
                    <Select
                      value={form.bannerTone}
                      onValueChange={(value) =>
                        updateForm("bannerTone", value as LegalDocumentBannerTone)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {bannerTones.map((tone) => (
                          <SelectItem key={tone} value={tone}>
                            {tone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField label="배너 제목">
                    <Input
                      value={form.bannerTitle}
                      onChange={(event) =>
                        updateForm("bannerTitle", event.target.value)
                      }
                    />
                  </FormField>
                </ResponsiveGrid>

                <SectionStack className="gap-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <p className="font-semibold">배너 라인</p>
                    <Button size="sm" variant="outline" onClick={addBannerLine}>
                      라인 추가
                    </Button>
                  </div>

                  {form.bannerLines.map((line, index) => (
                    <Card
                      key={`${selectedDocumentKey}-banner-${index}`}
                      className="bg-muted/30"
                    >
                      <CardContent className="pt-6">
                        <SectionStack className="gap-3">
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <p className="font-medium">라인 {index + 1}</p>
                            <Button
                              disabled={form.bannerLines.length === 1}
                              size="sm"
                              variant="secondary"
                              onClick={() => removeBannerLine(index)}
                            >
                              삭제
                            </Button>
                          </div>

                          <div className="grid gap-4 md:grid-cols-4">
                            <FormField label="tone">
                              <Select
                                value={line.tone}
                                onValueChange={(value) =>
                                  updateBannerLine(index, {
                                    tone: value as LegalDocumentBannerLineTone,
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {bannerLineTones.map((tone) => (
                                    <SelectItem key={tone} value={tone}>
                                      {tone}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormField>

                            <FormField label="text" className="md:col-span-3">
                              <Input
                                value={line.text}
                                onChange={(event) =>
                                  updateBannerLine(index, {
                                    text: event.target.value,
                                  })
                                }
                              />
                            </FormField>
                          </div>
                        </SectionStack>
                      </CardContent>
                    </Card>
                  ))}
                </SectionStack>
              </SectionStack>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>본문 섹션</CardTitle>
            </CardHeader>
            <CardContent>
              <SectionStack>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm text-muted-foreground">
                    각 섹션의 문단은 줄바꿈 기준으로 분리됩니다.
                  </p>
                  <Button size="sm" variant="outline" onClick={addSection}>
                    섹션 추가
                  </Button>
                </div>

                {form.sections.map((section, index) => (
                  <Card key={`${selectedDocumentKey}-section-${index}`}>
                    <CardContent className="pt-6">
                      <SectionStack>
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <p className="font-medium">섹션 {index + 1}</p>
                          <Button
                            disabled={form.sections.length === 1}
                            size="sm"
                            variant="secondary"
                            onClick={() => removeSection(index)}
                          >
                            삭제
                          </Button>
                        </div>

                        <TwoColumnGrid>
                          <FormField label="id">
                            <Input
                              value={section.id}
                              onChange={(event) =>
                                updateSection(index, { id: event.target.value })
                              }
                              placeholder="article-01"
                            />
                          </FormField>

                          <FormField label="title">
                            <Input
                              value={section.title}
                              onChange={(event) =>
                                updateSection(index, { title: event.target.value })
                              }
                              placeholder="제1조(목적)"
                            />
                          </FormField>
                        </TwoColumnGrid>

                        <FormField label="paragraphs">
                          <Textarea
                            className="min-h-[160px]"
                            value={section.paragraphsText}
                            onChange={(event) =>
                              updateSection(index, {
                                paragraphsText: event.target.value,
                              })
                            }
                          />
                        </FormField>
                      </SectionStack>
                    </CardContent>
                  </Card>
                ))}
              </SectionStack>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>하단 안내 및 작업</CardTitle>
            </CardHeader>
            <CardContent>
              <SectionStack>
                <FormField
                  label="footerLines"
                  hint="비워두면 빈 배열로 저장됩니다. 각 줄이 1개 문구입니다."
                >
                  <Textarea
                    className="min-h-[120px]"
                    value={form.footerLinesText}
                    onChange={(event) =>
                      updateForm("footerLinesText", event.target.value)
                    }
                  />
                </FormField>

                {validationError ? (
                  <Alert>
                    <TriangleAlert className="h-4 w-4" />
                    <AlertTitle>저장 전 확인 필요</AlertTitle>
                    <AlertDescription>{validationError}</AlertDescription>
                  </Alert>
                ) : null}

                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm text-muted-foreground">
                    삭제 후에는 같은 문서 키로 다시 생성할 수 있습니다.
                  </p>
                  <InlineGroup>
                    <Button
                      disabled={!isDirty || isSavePending || isDeletePending}
                      variant="secondary"
                      onClick={resetForm}
                    >
                      변경 취소
                    </Button>
                    <Button
                      disabled={!selectedDocument}
                      variant="outline"
                      onClick={handleDelete}
                    >
                      {isDeletePending ? "삭제 중..." : "삭제"}
                    </Button>
                    <Button
                      disabled={!isDirty || Boolean(validationError) || isSavePending}
                      onClick={handleSave}
                    >
                      {isSavePending
                        ? selectedDocument
                          ? "저장 중..."
                          : "생성 중..."
                        : selectedDocument
                          ? "저장"
                          : "생성"}
                    </Button>
                  </InlineGroup>
                </div>
              </SectionStack>
            </CardContent>
          </Card>
        </SectionStack>
      </div>
    </PageStack>
  );
}
