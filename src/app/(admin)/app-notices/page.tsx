"use client";

import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Field,
  Grid,
  Heading,
  HStack,
  Image,
  Input,
  Link,
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
import { uploadAuthorizedImage } from "@/lib/api/image-upload";
import { ApiError } from "@/lib/api/http";
import { getApiBaseUrl } from "@/lib/env/public-env";
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

function priorityPalette(priority: AppNotice["priority"]) {
  switch (priority) {
    case "HIGH":
      return "red";
    case "NORMAL":
      return "blue";
    case "LOW":
      return "gray";
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
    <Stack gap="6">
      <Stack gap="3">
        <Text
          fontSize="xs"
          fontWeight="700"
          letterSpacing="0.18em"
          textTransform="uppercase"
          color="gray.500"
        >
          Notice
        </Text>
        <Heading size="2xl">앱 공지 관리</Heading>
        <Text color="gray.600" _dark={{ color: "gray.300" }}>
          앱 공지 생성, 수정, 삭제를 현재 Spring 계약에 맞춰 연결했습니다.
          이미지 업로드는 별도 URL 입력 방식으로 두고, 관리 화면에서는 목록과
          unread count를 함께 확인합니다.
        </Text>
      </Stack>

      <SimpleGrid columns={{ base: 1, md: 3 }} gap="4">
        <Card.Root>
          <Card.Body gap="1">
            <Text fontSize="sm" color="gray.500">
              총 공지
            </Text>
            <Heading size="xl">{items.length}</Heading>
          </Card.Body>
        </Card.Root>
        <Card.Root>
          <Card.Body gap="1">
            <Text fontSize="sm" color="gray.500">
              읽지 않은 공지
            </Text>
            <Heading size="xl">{unreadCount ?? "-"}</Heading>
          </Card.Body>
        </Card.Root>
        <Card.Root>
          <Card.Body gap="1">
            <Text fontSize="sm" color="gray.500">
              최고 우선순위 공지
            </Text>
            <Heading size="xl">
              {items.filter((item) => item.priority === "HIGH").length}
            </Heading>
          </Card.Body>
        </Card.Root>
      </SimpleGrid>

      <Grid
        templateColumns={{ base: "1fr", xl: "minmax(0, 1fr) minmax(0, 1fr)" }}
        gap="5"
      >
        <Card.Root>
          <Card.Header>
            <Heading size="md">앱 공지 생성</Heading>
          </Card.Header>
          <Card.Body gap="4">
            <Field.Root invalid={Boolean(createValidationError && createError)}>
              <Field.Label>제목</Field.Label>
              <Input
                value={createForm.title}
                onChange={(event) => updateCreateForm("title", event.target.value)}
                placeholder="서버 점검 안내"
              />
            </Field.Root>

            <Field.Root>
              <Field.Label>본문</Field.Label>
              <Textarea
                value={createForm.content}
                onChange={(event) =>
                  updateCreateForm("content", event.target.value)
                }
                placeholder="공지 내용을 입력해주세요."
                autoresize
                maxH="14lh"
              />
            </Field.Root>

            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="4">
              <Field.Root>
                <Field.Label>카테고리</Field.Label>
                <NativeSelect.Root>
                  <NativeSelect.Field
                    value={createForm.category}
                    onChange={(event) =>
                      updateCreateForm(
                        "category",
                        event.target.value as AppNotice["category"],
                      )
                    }
                  >
                    {appNoticeCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </NativeSelect.Field>
                </NativeSelect.Root>
              </Field.Root>

              <Field.Root>
                <Field.Label>우선순위</Field.Label>
                <NativeSelect.Root>
                  <NativeSelect.Field
                    value={createForm.priority}
                    onChange={(event) =>
                      updateCreateForm(
                        "priority",
                        event.target.value as AppNotice["priority"],
                      )
                    }
                  >
                    {appNoticePriorities.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </NativeSelect.Field>
                </NativeSelect.Root>
              </Field.Root>
            </Grid>

            <Field.Root>
              <Field.Label>공지 이미지 업로드</Field.Label>
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
              <Field.HelperText>
                JPEG, PNG, WebP 업로드를 지원합니다. 현재 {createImageUrls.length}
                개 이미지가 등록됩니다.
                {isCreateImageUploading ? " 업로드 중입니다." : ""}
              </Field.HelperText>
            </Field.Root>

            {createImageUploadError ? (
              <Alert.Root status="error" rounded="xl">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>이미지 업로드 실패</Alert.Title>
                  <Alert.Description>{createImageUploadError}</Alert.Description>
                </Alert.Content>
              </Alert.Root>
            ) : null}

            {createImageUrls.length ? (
              <SimpleGrid columns={{ base: 1, md: 2 }} gap="3">
                {createImageUrls.map((url, index) => (
                  <Box key={`${url}-${index}`} rounded="xl" borderWidth="1px" p="3">
                    <Stack gap="3">
                      <Image
                        src={url}
                        alt={`생성할 앱 공지 이미지 ${index + 1}`}
                        rounded="lg"
                        h="160px"
                        w="full"
                        objectFit="cover"
                      />
                      <Button
                        size="xs"
                        variant="outline"
                        colorPalette="red"
                        onClick={() =>
                          setCreateImageUrls(
                            createImageUrls.filter((_, imageIndex) => imageIndex !== index),
                          )
                        }
                      >
                        제거
                      </Button>
                    </Stack>
                  </Box>
                ))}
              </SimpleGrid>
            ) : null}

            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="4">
              <Field.Root>
                <Field.Label>액션 URL</Field.Label>
                <Input
                  value={createForm.actionUrl}
                  onChange={(event) =>
                    updateCreateForm("actionUrl", event.target.value)
                  }
                  placeholder="https://status.skuri.app"
                />
              </Field.Root>

              <Field.Root>
                <Field.Label>게시 시각</Field.Label>
                <Input
                  type="datetime-local"
                  value={createForm.publishedAt}
                  onChange={(event) =>
                    updateCreateForm("publishedAt", event.target.value)
                  }
                />
              </Field.Root>
            </Grid>

            {createSuccess ? (
              <Alert.Root status="success" rounded="xl">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>생성 완료</Alert.Title>
                  <Alert.Description>{createSuccess}</Alert.Description>
                </Alert.Content>
              </Alert.Root>
            ) : null}

            {createError ? (
              <Alert.Root status="error" rounded="xl">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>생성 실패</Alert.Title>
                  <Alert.Description>{createError}</Alert.Description>
                </Alert.Content>
              </Alert.Root>
            ) : null}

            <Button
              colorPalette="orange"
              onClick={handleCreate}
              loading={isCreatePending}
              disabled={Boolean(createValidationError) || isCreateImageUploading}
            >
              앱 공지 생성
            </Button>
          </Card.Body>
        </Card.Root>

        <Card.Root>
          <Card.Header>
            <Heading size="md">선택 공지 수정</Heading>
          </Card.Header>
          <Card.Body gap="4">
            {selectedNotice ? (
              <>
                <HStack justify="space-between" align="start">
                  <Stack gap="1">
                    <Text fontSize="sm" color="gray.500">
                      선택된 공지
                    </Text>
                    <Heading size="sm">{selectedNotice.title}</Heading>
                  </Stack>
                  <HStack gap="2">
                    <Badge colorPalette={priorityPalette(selectedNotice.priority)}>
                      {selectedNotice.priority}
                    </Badge>
                    <Badge variant="outline">{selectedNotice.category}</Badge>
                  </HStack>
                </HStack>

                <Field.Root>
                  <Field.Label>제목</Field.Label>
                  <Input
                    value={editForm.title}
                    onChange={(event) => updateEditForm("title", event.target.value)}
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label>본문</Field.Label>
                  <Textarea
                    value={editForm.content}
                    onChange={(event) =>
                      updateEditForm("content", event.target.value)
                    }
                    autoresize
                    maxH="14lh"
                  />
                </Field.Root>

                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="4">
                  <Field.Root>
                    <Field.Label>카테고리</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        value={editForm.category}
                        onChange={(event) =>
                          updateEditForm(
                            "category",
                            event.target.value as AppNotice["category"],
                          )
                        }
                      >
                        {appNoticeCategories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </NativeSelect.Field>
                    </NativeSelect.Root>
                  </Field.Root>

                  <Field.Root>
                    <Field.Label>우선순위</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        value={editForm.priority}
                        onChange={(event) =>
                          updateEditForm(
                            "priority",
                            event.target.value as AppNotice["priority"],
                          )
                        }
                      >
                        {appNoticePriorities.map((priority) => (
                          <option key={priority} value={priority}>
                            {priority}
                          </option>
                        ))}
                      </NativeSelect.Field>
                    </NativeSelect.Root>
                  </Field.Root>
                </Grid>

                <Field.Root>
                  <Field.Label>공지 이미지 업로드</Field.Label>
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
                  <Field.HelperText>
                    새 이미지를 업로드하면 기존 목록 뒤에 추가됩니다. 개별 제거도
                    가능합니다.
                  </Field.HelperText>
                </Field.Root>

                {editImageUploadError ? (
                  <Alert.Root status="error" rounded="xl">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>이미지 업로드 실패</Alert.Title>
                      <Alert.Description>{editImageUploadError}</Alert.Description>
                    </Alert.Content>
                  </Alert.Root>
                ) : null}

                {selectedNoticeImageUrls.length ? (
                  <SimpleGrid columns={{ base: 1, md: 2 }} gap="3">
                    {selectedNoticeImageUrls.map((url, index) => (
                      <Box key={`${url}-${index}`} rounded="xl" borderWidth="1px" p="3">
                        <Stack gap="3">
                          <Image
                            src={url}
                            alt={`앱 공지 이미지 ${index + 1}`}
                            rounded="lg"
                            h="160px"
                            w="full"
                            objectFit="cover"
                          />
                          <Button
                            size="xs"
                            variant="outline"
                            colorPalette="red"
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
                        </Stack>
                      </Box>
                    ))}
                  </SimpleGrid>
                ) : (
                  <Text fontSize="sm" color="gray.500">
                    등록된 이미지가 없습니다.
                  </Text>
                )}

                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="4">
                  <Field.Root>
                    <Field.Label>액션 URL</Field.Label>
                    <Input
                      value={editForm.actionUrl}
                      onChange={(event) =>
                        updateEditForm("actionUrl", event.target.value)
                      }
                    />
                    <Field.HelperText>
                      PATCH 계약상 비우기는 미지원입니다. 제거가 필요하면 백엔드
                      확장이 필요합니다.
                    </Field.HelperText>
                  </Field.Root>

                  <Field.Root>
                    <Field.Label>게시 시각</Field.Label>
                    <Input
                      type="datetime-local"
                      value={editForm.publishedAt}
                      onChange={(event) =>
                        updateEditForm("publishedAt", event.target.value)
                      }
                    />
                  </Field.Root>
                </Grid>

                {selectedNotice.actionUrl ? (
                  <Box
                    rounded="xl"
                    bg="blackAlpha.50"
                    p="3"
                    _dark={{ bg: "whiteAlpha.100" }}
                  >
                    <Text fontSize="sm" color="gray.500">
                      현재 액션 URL
                    </Text>
                    <Link href={selectedNotice.actionUrl} target="_blank" rel="noreferrer">
                      {selectedNotice.actionUrl}
                    </Link>
                  </Box>
                ) : null}

                {editSuccess ? (
                  <Alert.Root status="success" rounded="xl">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>저장 완료</Alert.Title>
                      <Alert.Description>{editSuccess}</Alert.Description>
                    </Alert.Content>
                  </Alert.Root>
                ) : null}

                {editError ? (
                  <Alert.Root status="error" rounded="xl">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>저장 실패</Alert.Title>
                      <Alert.Description>{editError}</Alert.Description>
                    </Alert.Content>
                  </Alert.Root>
                ) : null}

                {deleteError ? (
                  <Alert.Root status="error" rounded="xl">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>삭제 실패</Alert.Title>
                      <Alert.Description>{deleteError}</Alert.Description>
                    </Alert.Content>
                  </Alert.Root>
                ) : null}

                <HStack justify="space-between" wrap="wrap" gap="3">
                  <Text fontSize="sm" color="gray.500">
                    생성일 {formatDateTime(selectedNotice.createdAt)} / 수정일{" "}
                    {formatDateTime(selectedNotice.updatedAt)}
                  </Text>
                  <HStack>
                    <Button
                      variant="outline"
                      colorPalette="red"
                      onClick={handleDelete}
                      loading={isDeletePending}
                    >
                      삭제
                    </Button>
                    <Button
                      colorPalette="orange"
                      onClick={handleUpdate}
                      loading={isEditPending}
                      disabled={
                        !isEditDirty ||
                        Boolean(editValidationError) ||
                        isEditImageUploading
                      }
                    >
                      저장
                    </Button>
                  </HStack>
                </HStack>
              </>
            ) : (
              <Box
                rounded="2xl"
                borderWidth="1px"
                borderStyle="dashed"
                borderColor="blackAlpha.200"
                p="8"
                textAlign="center"
              >
                <Text>수정할 공지를 먼저 선택해주세요.</Text>
              </Box>
            )}
          </Card.Body>
        </Card.Root>
      </Grid>

      <Card.Root>
        <Card.Header>
          <Heading size="md">공지 목록</Heading>
        </Card.Header>
        <Card.Body>
          <Box overflowX="auto">
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>공지</Table.ColumnHeader>
                  <Table.ColumnHeader>카테고리</Table.ColumnHeader>
                  <Table.ColumnHeader>우선순위</Table.ColumnHeader>
                  <Table.ColumnHeader>이미지</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="end">게시일</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {items.map((notice) => {
                  const active = notice.id === selectedNotice?.id;
                  return (
                    <Table.Row
                      key={notice.id}
                      bg={active ? "orange.50" : undefined}
                      cursor="pointer"
                      onClick={() => setSelectedNoticeId(notice.id)}
                      _hover={{ bg: active ? "orange.100" : "blackAlpha.50" }}
                      _dark={{
                        bg: active ? "orange.950" : undefined,
                        _hover: {
                          bg: active ? "orange.900" : "whiteAlpha.100",
                        },
                      }}
                    >
                      <Table.Cell>
                        <Stack gap="1">
                          <Text fontWeight="600">{notice.title}</Text>
                          <Text
                            fontSize="sm"
                            color="gray.500"
                            lineClamp={2}
                            _dark={{ color: "gray.400" }}
                          >
                            {notice.content}
                          </Text>
                        </Stack>
                      </Table.Cell>
                      <Table.Cell>{notice.category}</Table.Cell>
                      <Table.Cell>
                        <Badge colorPalette={priorityPalette(notice.priority)}>
                          {notice.priority}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        {notice.imageUrls[0] ? (
                          <HStack gap="3">
                            <Image
                              src={notice.imageUrls[0]}
                              alt={`${notice.title} 대표 이미지`}
                              boxSize="12"
                              rounded="md"
                              objectFit="cover"
                            />
                            <Text>{notice.imageUrls.length}개</Text>
                          </HStack>
                        ) : (
                          <Text color="gray.500">없음</Text>
                        )}
                      </Table.Cell>
                      <Table.Cell textAlign="end">
                        {formatDateTime(notice.publishedAt)}
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Root>
          </Box>
        </Card.Body>
      </Card.Root>
    </Stack>
  );
}
