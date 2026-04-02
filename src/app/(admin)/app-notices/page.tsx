"use client";

import Image from "next/image";
import {
  AlertCircle,
  BellRing,
  CheckCircle2,
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
import { uploadAuthorizedImage } from "@/lib/api/image-upload";
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
import {
  formatDateTime,
  fromDateTimeLocalInputValue,
  toDateTimeLocalInputValue,
} from "@/lib/format/date";
import type {
  ApiResponse,
  AppNotice,
  AppNoticeCreateResponse,
  AppNoticeUnreadCount,
} from "@/features/admin/types";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

const appNoticeCategories = [
  "UPDATE",
  "MAINTENANCE",
  "EVENT",
  "GENERAL",
] as const;
const appNoticePriorities = ["HIGH", "NORMAL", "LOW"] as const;

interface AppNoticeFormState {
  title: string;
  content: string;
  category: AppNotice["category"];
  priority: AppNotice["priority"];
  imageUrlsText: string;
  actionUrl: string;
  publishedAt: string;
}

function priorityBadgeClass(priority: AppNotice["priority"]) {
  switch (priority) {
    case "HIGH":
      return "border border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300";
    case "NORMAL":
      return "border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300";
    case "LOW":
      return "border border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-300";
  }
}

function createDefaultFormState(): AppNoticeFormState {
  return {
    title: "",
    content: "",
    category: "GENERAL",
    priority: "NORMAL",
    imageUrlsText: "",
    actionUrl: "",
    publishedAt: "",
  };
}

function getCurrentDateTimeLocalInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parseImageUrls(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function serializeImageUrls(urls: string[]) {
  return urls.join("\n");
}

function toFormState(item: AppNotice): AppNoticeFormState {
  return {
    title: item.title,
    content: item.content,
    category: item.category,
    priority: item.priority,
    imageUrlsText: item.imageUrls.join("\n"),
    actionUrl: item.actionUrl ?? "",
    publishedAt: toDateTimeLocalInputValue(item.publishedAt),
  };
}

export default function AppNoticesPage() {
  const { user, isAdminVerified } = useAuth();
  const [items, setItems] = useState<AppNotice[]>([]);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [selectedNoticeId, setSelectedNoticeId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<AppNoticeFormState>(
    createDefaultFormState(),
  );
  const [editForm, setEditForm] = useState<AppNoticeFormState>(
    createDefaultFormState(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [createImageUploadError, setCreateImageUploadError] =
    useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [editImageUploadError, setEditImageUploadError] =
    useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isCreatePending, startCreateTransition] = useTransition();
  const [isEditPending, startEditTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [isCreateImageUploading, setIsCreateImageUploading] = useState(false);
  const [isEditImageUploading, setIsEditImageUploading] = useState(false);
  const preferredSelectedIdRef = useRef<string | null>(null);
  const previousSelectedNoticeIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!createForm.publishedAt) {
      setCreateForm((current) => ({
        ...current,
        publishedAt: getCurrentDateTimeLocalInputValue(),
      }));
    }
  }, [createForm.publishedAt]);

  useEffect(() => {
    if (!user || !isAdminVerified) {
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [noticesResponse, unreadResponse] = await Promise.all([
          fetch(`${getApiBaseUrl()}/v1/app-notices`, {
            signal: controller.signal,
            cache: "no-store",
          }).then((response) => response.json() as Promise<ApiResponse<AppNotice[]>>),
          getAuthorizedJson<ApiResponse<AppNoticeUnreadCount>>(
            user,
            `${getApiBaseUrl()}/v1/members/me/app-notices/unread-count`,
            {
              signal: controller.signal,
            },
          ),
        ]);

        setItems(noticesResponse.data);
        setUnreadCount(unreadResponse.data.count);
      } catch {
        if (!controller.signal.aborted) {
          setError("앱 공지 데이터를 불러오지 못했습니다.");
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

  useEffect(() => {
    if (!items.length) {
      setSelectedNoticeId(null);
      return;
    }

    const preferredId = preferredSelectedIdRef.current;
    if (preferredId && items.some((item) => item.id === preferredId)) {
      setSelectedNoticeId(preferredId);
      preferredSelectedIdRef.current = null;
      return;
    }

    setSelectedNoticeId((current) =>
      current && items.some((item) => item.id === current) ? current : items[0].id,
    );
  }, [items]);

  const selectedNotice = useMemo(
    () =>
      items.find((item) => item.id === selectedNoticeId) ?? items[0] ?? null,
    [items, selectedNoticeId],
  );

  useEffect(() => {
    const nextSelectedId = selectedNotice?.id ?? null;
    if (previousSelectedNoticeIdRef.current === nextSelectedId) {
      return;
    }

    previousSelectedNoticeIdRef.current = nextSelectedId;

    if (!selectedNotice) {
      setEditForm(createDefaultFormState());
      return;
    }

    setEditForm(toFormState(selectedNotice));
    setEditError(null);
    setEditSuccess(null);
    setDeleteError(null);
    setEditImageUploadError(null);
  }, [selectedNotice]);

  const selectedNoticeImageUrls = useMemo(
    () => parseImageUrls(editForm.imageUrlsText),
    [editForm.imageUrlsText],
  );
  const createImageUrls = useMemo(
    () => parseImageUrls(createForm.imageUrlsText),
    [createForm.imageUrlsText],
  );

  if (loading) {
    return <PageLoadingState label="앱 공지 데이터를 불러오는 중입니다." />;
  }

  if (error) {
    return <PageErrorState title="앱 공지 로드 실패" message={error} />;
  }

  const updateCreateForm = <K extends keyof AppNoticeFormState>(
    key: K,
    value: AppNoticeFormState[K],
  ) => {
    setCreateForm((current) => ({ ...current, [key]: value }));
  };

  const updateEditForm = <K extends keyof AppNoticeFormState>(
    key: K,
    value: AppNoticeFormState[K],
  ) => {
    setEditForm((current) => ({ ...current, [key]: value }));
  };

  const setCreateImageUrls = (urls: string[]) => {
    setCreateForm((current) => ({
      ...current,
      imageUrlsText: serializeImageUrls(urls),
    }));
  };

  const setEditImageUrls = (urls: string[]) => {
    setEditForm((current) => ({
      ...current,
      imageUrlsText: serializeImageUrls(urls),
    }));
  };

  const handleCreateImageUpload = async (files: FileList | null) => {
    if (!user || !files?.length) {
      return;
    }

    setCreateImageUploadError(null);
    setIsCreateImageUploading(true);

    try {
      const uploads = await Promise.all(
        Array.from(files).map((file) =>
          uploadAuthorizedImage(user, "APP_NOTICE_IMAGE", file),
        ),
      );
      setCreateForm((current) => ({
        ...current,
        imageUrlsText: serializeImageUrls([
          ...parseImageUrls(current.imageUrlsText),
          ...uploads.map((item) => item.url),
        ]),
      }));
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setCreateImageUploadError(caughtError.message);
      } else {
        setCreateImageUploadError("공지 이미지 업로드에 실패했습니다.");
      }
    } finally {
      setIsCreateImageUploading(false);
    }
  };

  const handleEditImageUpload = async (files: FileList | null) => {
    if (!user || !files?.length) {
      return;
    }

    setEditImageUploadError(null);
    setIsEditImageUploading(true);

    try {
      const uploads = await Promise.all(
        Array.from(files).map((file) =>
          uploadAuthorizedImage(user, "APP_NOTICE_IMAGE", file),
        ),
      );
      setEditForm((current) => ({
        ...current,
        imageUrlsText: serializeImageUrls([
          ...parseImageUrls(current.imageUrlsText),
          ...uploads.map((item) => item.url),
        ]),
      }));
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setEditImageUploadError(caughtError.message);
      } else {
        setEditImageUploadError("공지 이미지 업로드에 실패했습니다.");
      }
    } finally {
      setIsEditImageUploading(false);
    }
  };

  const createValidationError =
    !createForm.title.trim()
      ? "제목은 비어 있을 수 없습니다."
      : createForm.title.trim().length > 200
        ? "제목은 200자 이하여야 합니다."
        : !createForm.content.trim()
          ? "본문은 비어 있을 수 없습니다."
          : !createForm.publishedAt
            ? "게시 시각을 입력해주세요."
            : null;

  const isEditActionUrlClearUnsupported = Boolean(
    selectedNotice?.actionUrl && !editForm.actionUrl.trim(),
  );
  const editValidationError =
    !selectedNotice
      ? "수정할 공지를 선택해주세요."
      : !editForm.title.trim()
        ? "제목은 비어 있을 수 없습니다."
        : editForm.title.trim().length > 200
          ? "제목은 200자 이하여야 합니다."
          : !editForm.content.trim()
            ? "본문은 비어 있을 수 없습니다."
            : !editForm.publishedAt
              ? "게시 시각을 입력해주세요."
              : isEditActionUrlClearUnsupported
                ? "현재 백엔드 PATCH 계약으로는 actionUrl 비우기가 지원되지 않습니다."
                : null;

  const isEditDirty = Boolean(
    selectedNotice &&
      (editForm.title !== selectedNotice.title ||
        editForm.content !== selectedNotice.content ||
        editForm.category !== selectedNotice.category ||
        editForm.priority !== selectedNotice.priority ||
        editForm.imageUrlsText !== selectedNotice.imageUrls.join("\n") ||
        editForm.actionUrl !== (selectedNotice.actionUrl ?? "") ||
        editForm.publishedAt !== toDateTimeLocalInputValue(selectedNotice.publishedAt)),
  );

  const handleCreate = () => {
    if (!user || createValidationError) {
      if (createValidationError) {
        setCreateError(createValidationError);
      }
      return;
    }

    startCreateTransition(() => {
      void (async () => {
        setCreateError(null);
        setCreateSuccess(null);

        try {
          const response = await getAuthorizedJson<
            ApiResponse<AppNoticeCreateResponse>
          >(user, `${getApiBaseUrl()}/v1/admin/app-notices`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              title: createForm.title.trim(),
              content: createForm.content.trim(),
              category: createForm.category,
              priority: createForm.priority,
              imageUrls: createImageUrls,
              actionUrl: createForm.actionUrl.trim() || null,
              publishedAt: fromDateTimeLocalInputValue(createForm.publishedAt),
            }),
          });

          preferredSelectedIdRef.current = response.data.id;
          setCreateForm(createDefaultFormState());
          setCreateImageUploadError(null);
          setCreateSuccess(`앱 공지 "${response.data.title}"를 생성했습니다.`);
          setRefreshKey((current) => current + 1);
        } catch (caughtError) {
          if (caughtError instanceof ApiError) {
            setCreateError(caughtError.message);
          } else {
            setCreateError("앱 공지를 생성하지 못했습니다.");
          }
        }
      })();
    });
  };

  const handleUpdate = () => {
    if (!user || !selectedNotice || editValidationError) {
      if (editValidationError) {
        setEditError(editValidationError);
      }
      return;
    }

    startEditTransition(() => {
      void (async () => {
        setEditError(null);
        setEditSuccess(null);

        try {
          const body: Record<string, unknown> = {
            title: editForm.title.trim(),
            content: editForm.content.trim(),
            category: editForm.category,
            priority: editForm.priority,
            imageUrls: selectedNoticeImageUrls,
            publishedAt: fromDateTimeLocalInputValue(editForm.publishedAt),
          };

          if (editForm.actionUrl.trim()) {
            body.actionUrl = editForm.actionUrl.trim();
          }

          const response = await getAuthorizedJson<ApiResponse<AppNotice>>(
            user,
            `${getApiBaseUrl()}/v1/admin/app-notices/${selectedNotice.id}`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(body),
            },
          );

          preferredSelectedIdRef.current = response.data.id;
          setEditForm(toFormState(response.data));
          setEditSuccess(`앱 공지 "${response.data.title}"를 저장했습니다.`);
          setRefreshKey((current) => current + 1);
        } catch (caughtError) {
          if (caughtError instanceof ApiError) {
            setEditError(caughtError.message);
          } else {
            setEditError("앱 공지를 수정하지 못했습니다.");
          }
        }
      })();
    });
  };

  const handleDelete = () => {
    if (!user || !selectedNotice) {
      return;
    }

    if (!window.confirm(`"${selectedNotice.title}" 공지를 삭제할까요?`)) {
      return;
    }

    startDeleteTransition(() => {
      void (async () => {
        setDeleteError(null);
        setEditSuccess(null);

        try {
          await getAuthorizedJson<ApiResponse<null>>(
            user,
            `${getApiBaseUrl()}/v1/admin/app-notices/${selectedNotice.id}`,
            {
              method: "DELETE",
            },
          );

          setEditSuccess(`앱 공지 "${selectedNotice.title}"를 삭제했습니다.`);
          preferredSelectedIdRef.current = null;
          setRefreshKey((current) => current + 1);
        } catch (caughtError) {
          if (caughtError instanceof ApiError) {
            setDeleteError(caughtError.message);
          } else {
            setDeleteError("앱 공지를 삭제하지 못했습니다.");
          }
        }
      })();
    });
  };

  return (
    <PageStack>
      <SectionStack className="gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Notice
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">앱 공지 관리</h1>
        <p className="text-sm text-muted-foreground">
          앱 공지 생성, 수정, 삭제를 현재 Spring 계약에 맞춰 연결했습니다.
          이미지 업로드와 unread count도 함께 확인합니다.
        </p>
      </SectionStack>

      <ResponsiveGrid>
        <Card>
          <CardContent className="space-y-1 pt-6">
            <p className="text-sm text-muted-foreground">총 공지</p>
            <p className="text-3xl font-semibold">{items.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 pt-6">
            <p className="text-sm text-muted-foreground">읽지 않은 공지</p>
            <p className="text-3xl font-semibold">{unreadCount ?? "-"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 pt-6">
            <p className="text-sm text-muted-foreground">최고 우선순위 공지</p>
            <p className="text-3xl font-semibold">
              {items.filter((item) => item.priority === "HIGH").length}
            </p>
          </CardContent>
        </Card>
      </ResponsiveGrid>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>앱 공지 생성</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="제목">
              <Input
                value={createForm.title}
                onChange={(event) => updateCreateForm("title", event.target.value)}
                placeholder="서버 점검 안내"
              />
            </FormField>

            <FormField label="본문">
              <Textarea
                className="max-h-[14lh] min-h-[160px]"
                value={createForm.content}
                onChange={(event) => updateCreateForm("content", event.target.value)}
                placeholder="공지 내용을 입력해주세요."
              />
            </FormField>

            <TwoColumnGrid>
              <FormField label="카테고리">
                <Select
                  value={createForm.category}
                  onValueChange={(value) =>
                    updateCreateForm("category", value as AppNotice["category"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {appNoticeCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="우선순위">
                <Select
                  value={createForm.priority}
                  onValueChange={(value) =>
                    updateCreateForm("priority", value as AppNotice["priority"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {appNoticePriorities.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {priority}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </TwoColumnGrid>

            <FormField
              label="공지 이미지 업로드"
              hint={`JPEG, PNG, WebP 업로드를 지원합니다. 현재 ${createImageUrls.length}개 이미지가 등록됩니다.${isCreateImageUploading ? " 업로드 중입니다." : ""}`}
            >
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(event) => {
                  const files = event.target.files;
                  event.target.value = "";
                  void handleCreateImageUpload(files);
                }}
              />
            </FormField>

            {createImageUploadError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>이미지 업로드 실패</AlertTitle>
                <AlertDescription>{createImageUploadError}</AlertDescription>
              </Alert>
            ) : null}

            {createImageUrls.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {createImageUrls.map((url, index) => (
                  <div key={`${url}-${index}`} className="rounded-xl border p-3">
                    <SectionStack className="gap-3">
                      <div className="relative h-40 overflow-hidden rounded-lg">
                        <Image
                          src={url}
                          alt={`생성할 앱 공지 이미지 ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setCreateImageUrls(
                            createImageUrls.filter((_, imageIndex) => imageIndex !== index),
                          )
                        }
                      >
                        제거
                      </Button>
                    </SectionStack>
                  </div>
                ))}
              </div>
            ) : null}

            <TwoColumnGrid>
              <FormField label="액션 URL">
                <Input
                  value={createForm.actionUrl}
                  onChange={(event) => updateCreateForm("actionUrl", event.target.value)}
                  placeholder="https://status.skuri.app"
                />
              </FormField>

              <FormField label="게시 시각">
                <Input
                  type="datetime-local"
                  value={createForm.publishedAt}
                  onChange={(event) => updateCreateForm("publishedAt", event.target.value)}
                />
              </FormField>
            </TwoColumnGrid>

            {createSuccess ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>생성 완료</AlertTitle>
                <AlertDescription>{createSuccess}</AlertDescription>
              </Alert>
            ) : null}

            {createError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>생성 실패</AlertTitle>
                <AlertDescription>{createError}</AlertDescription>
              </Alert>
            ) : null}

            <Button
              onClick={handleCreate}
              disabled={Boolean(createValidationError) || isCreatePending || isCreateImageUploading}
            >
              <BellRing className="mr-2 h-4 w-4" />
              {isCreatePending ? "앱 공지 생성 중..." : "앱 공지 생성"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>선택 공지 수정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedNotice ? (
              <>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">선택된 공지</p>
                    <p className="text-lg font-semibold">{selectedNotice.title}</p>
                  </div>
                  <InlineGroup>
                    <Badge className={priorityBadgeClass(selectedNotice.priority)}>
                      {selectedNotice.priority}
                    </Badge>
                    <Badge variant="outline">{selectedNotice.category}</Badge>
                  </InlineGroup>
                </div>

                <FormField label="제목">
                  <Input
                    value={editForm.title}
                    onChange={(event) => updateEditForm("title", event.target.value)}
                  />
                </FormField>

                <FormField label="본문">
                  <Textarea
                    className="max-h-[14lh] min-h-[160px]"
                    value={editForm.content}
                    onChange={(event) => updateEditForm("content", event.target.value)}
                  />
                </FormField>

                <TwoColumnGrid>
                  <FormField label="카테고리">
                    <Select
                      value={editForm.category}
                      onValueChange={(value) =>
                        updateEditForm("category", value as AppNotice["category"])
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {appNoticeCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField label="우선순위">
                    <Select
                      value={editForm.priority}
                      onValueChange={(value) =>
                        updateEditForm("priority", value as AppNotice["priority"])
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {appNoticePriorities.map((priority) => (
                          <SelectItem key={priority} value={priority}>
                            {priority}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                </TwoColumnGrid>

                <FormField
                  label="공지 이미지 업로드"
                  hint="새 이미지를 업로드하면 기존 목록 뒤에 추가됩니다. 개별 제거도 가능합니다."
                >
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={(event) => {
                      const files = event.target.files;
                      event.target.value = "";
                      void handleEditImageUpload(files);
                    }}
                  />
                </FormField>

                {editImageUploadError ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>이미지 업로드 실패</AlertTitle>
                    <AlertDescription>{editImageUploadError}</AlertDescription>
                  </Alert>
                ) : null}

                {selectedNoticeImageUrls.length ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {selectedNoticeImageUrls.map((url, index) => (
                      <div key={`${url}-${index}`} className="rounded-xl border p-3">
                        <SectionStack className="gap-3">
                          <div className="relative h-40 overflow-hidden rounded-lg">
                            <Image
                              src={url}
                              alt={`앱 공지 이미지 ${index + 1}`}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setEditImageUrls(
                                selectedNoticeImageUrls.filter(
                                  (_, imageIndex) => imageIndex !== index,
                                ),
                              )
                            }
                          >
                            제거
                          </Button>
                        </SectionStack>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    등록된 이미지가 없습니다.
                  </p>
                )}

                <TwoColumnGrid>
                  <FormField
                    label="액션 URL"
                    hint="PATCH 계약상 비우기는 미지원입니다. 제거가 필요하면 백엔드 확장이 필요합니다."
                  >
                    <Input
                      value={editForm.actionUrl}
                      onChange={(event) => updateEditForm("actionUrl", event.target.value)}
                    />
                  </FormField>

                  <FormField label="게시 시각">
                    <Input
                      type="datetime-local"
                      value={editForm.publishedAt}
                      onChange={(event) => updateEditForm("publishedAt", event.target.value)}
                    />
                  </FormField>
                </TwoColumnGrid>

                {selectedNotice.actionUrl ? (
                  <div className="rounded-xl bg-muted/40 p-3">
                    <p className="text-sm text-muted-foreground">현재 액션 URL</p>
                    <a
                      href={selectedNotice.actionUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary underline-offset-4 hover:underline"
                    >
                      {selectedNotice.actionUrl}
                    </a>
                  </div>
                ) : null}

                {editSuccess ? (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>저장 완료</AlertTitle>
                    <AlertDescription>{editSuccess}</AlertDescription>
                  </Alert>
                ) : null}

                {editError ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>저장 실패</AlertTitle>
                    <AlertDescription>{editError}</AlertDescription>
                  </Alert>
                ) : null}

                {deleteError ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>삭제 실패</AlertTitle>
                    <AlertDescription>{deleteError}</AlertDescription>
                  </Alert>
                ) : null}

                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm text-muted-foreground">
                    생성일 {formatDateTime(selectedNotice.createdAt)} / 수정일{" "}
                    {formatDateTime(selectedNotice.updatedAt)}
                  </p>
                  <InlineGroup>
                    <Button
                      variant="outline"
                      onClick={handleDelete}
                      disabled={isDeletePending}
                    >
                      {isDeletePending ? "삭제 중..." : "삭제"}
                    </Button>
                    <Button
                      onClick={handleUpdate}
                      disabled={
                        !isEditDirty ||
                        Boolean(editValidationError) ||
                        isEditImageUploading ||
                        isEditPending
                      }
                    >
                      {isEditPending ? "저장 중..." : "저장"}
                    </Button>
                  </InlineGroup>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed p-8 text-center">
                <p>수정할 공지를 먼저 선택해주세요.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>공지 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>공지</TableHead>
                  <TableHead>카테고리</TableHead>
                  <TableHead>우선순위</TableHead>
                  <TableHead>이미지</TableHead>
                  <TableHead className="text-right">게시일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((notice) => {
                  const active = notice.id === selectedNotice?.id;
                  return (
                    <TableRow
                      key={notice.id}
                      className={active ? "cursor-pointer bg-muted/40" : "cursor-pointer"}
                      onClick={() => setSelectedNoticeId(notice.id)}
                    >
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-semibold">{notice.title}</p>
                          <p className="line-clamp-2 text-sm text-muted-foreground">
                            {notice.content}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{notice.category}</TableCell>
                      <TableCell>
                        <Badge className={priorityBadgeClass(notice.priority)}>
                          {notice.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {notice.imageUrls[0] ? (
                          <InlineGroup>
                            <div className="relative h-12 w-12 overflow-hidden rounded-md">
                              <Image
                                src={notice.imageUrls[0]}
                                alt={`${notice.title} 대표 이미지`}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <p className="text-sm">{notice.imageUrls.length}개</p>
                          </InlineGroup>
                        ) : (
                          <p className="text-sm text-muted-foreground">없음</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatDateTime(notice.publishedAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </PageStack>
  );
}
