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
  CampusBanner,
  CampusBannerOrderResponse,
} from "@/features/admin/types";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

const bannerPaletteKeys = ["GREEN", "BLUE", "PURPLE", "RED", "YELLOW"] as const;
const bannerActionTypes = ["IN_APP", "EXTERNAL_URL"] as const;
const bannerActionTargets = [
  "TAXI_MAIN",
  "NOTICE_MAIN",
  "TIMETABLE_DETAIL",
  "CAFETERIA_DETAIL",
  "ACADEMIC_CALENDAR_DETAIL",
] as const;

interface CampusBannerFormState {
  badgeLabel: string;
  titleLabel: string;
  descriptionLabel: string;
  buttonLabel: string;
  paletteKey: CampusBanner["paletteKey"];
  imageUrl: string;
  actionType: CampusBanner["actionType"];
  actionTarget: NonNullable<CampusBanner["actionTarget"]> | "";
  actionParamsText: string;
  actionUrl: string;
  isActive: "true" | "false";
  displayStartAt: string;
  displayEndAt: string;
}

function createDefaultBannerFormState(): CampusBannerFormState {
  return {
    badgeLabel: "",
    titleLabel: "",
    descriptionLabel: "",
    buttonLabel: "",
    paletteKey: "GREEN",
    imageUrl: "",
    actionType: "IN_APP",
    actionTarget: "TAXI_MAIN",
    actionParamsText: "",
    actionUrl: "",
    isActive: "true",
    displayStartAt: "",
    displayEndAt: "",
  };
}

function toBannerFormState(item: CampusBanner): CampusBannerFormState {
  return {
    badgeLabel: item.badgeLabel,
    titleLabel: item.titleLabel,
    descriptionLabel: item.descriptionLabel,
    buttonLabel: item.buttonLabel,
    paletteKey: item.paletteKey,
    imageUrl: item.imageUrl ?? "",
    actionType: item.actionType as CampusBanner["actionType"],
    actionTarget:
      (item.actionTarget as NonNullable<CampusBanner["actionTarget"]>) ?? "",
    actionParamsText: item.actionParams
      ? JSON.stringify(item.actionParams, null, 2)
      : "",
    actionUrl: item.actionUrl ?? "",
    isActive: item.isActive ? "true" : "false",
    displayStartAt: toDateTimeLocalInputValue(item.displayStartAt),
    displayEndAt: toDateTimeLocalInputValue(item.displayEndAt),
  };
}

function parseActionParamsText(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = JSON.parse(trimmed) as unknown;
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("actionParams는 JSON object여야 합니다.");
  }

  return parsed;
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  const next = [...items];
  const [removed] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, removed);
  return next;
}

export default function CampusBannersPage() {
  const { user, isAdminVerified } = useAuth();
  const [items, setItems] = useState<CampusBanner[]>([]);
  const [savedOrderIds, setSavedOrderIds] = useState<string[]>([]);
  const [selectedBannerId, setSelectedBannerId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<CampusBannerFormState>(
    createDefaultBannerFormState(),
  );
  const [editForm, setEditForm] = useState<CampusBannerFormState>(
    createDefaultBannerFormState(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [createImageUploadError, setCreateImageUploadError] = useState<string | null>(
    null,
  );
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [editImageUploadError, setEditImageUploadError] = useState<string | null>(
    null,
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isCreatePending, startCreateTransition] = useTransition();
  const [isEditPending, startEditTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [isOrderPending, startOrderTransition] = useTransition();
  const [isCreateImageUploading, setIsCreateImageUploading] = useState(false);
  const [isEditImageUploading, setIsEditImageUploading] = useState(false);
  const preferredSelectedIdRef = useRef<string | null>(null);
  const previousSelectedBannerIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !isAdminVerified) {
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await getAuthorizedJson<ApiResponse<CampusBanner[]>>(
          user,
          `${getApiBaseUrl()}/v1/admin/campus-banners`,
          {
            signal: controller.signal,
          },
        );

        setItems(response.data);
        setSavedOrderIds(response.data.map((item) => item.id));
      } catch {
        if (!controller.signal.aborted) {
          setError("캠퍼스 배너 목록을 불러오지 못했습니다.");
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
      setSelectedBannerId(null);
      return;
    }

    const preferredId = preferredSelectedIdRef.current;
    if (preferredId && items.some((item) => item.id === preferredId)) {
      setSelectedBannerId(preferredId);
      preferredSelectedIdRef.current = null;
      return;
    }

    setSelectedBannerId((current) =>
      current && items.some((item) => item.id === current) ? current : items[0].id,
    );
  }, [items]);

  const selectedBanner = useMemo(
    () =>
      items.find((item) => item.id === selectedBannerId) ?? items[0] ?? null,
    [items, selectedBannerId],
  );

  useEffect(() => {
    const nextSelectedId = selectedBanner?.id ?? null;
    if (previousSelectedBannerIdRef.current === nextSelectedId) {
      return;
    }

    previousSelectedBannerIdRef.current = nextSelectedId;

    if (!selectedBanner) {
      setEditForm(createDefaultBannerFormState());
      return;
    }

    setEditForm(toBannerFormState(selectedBanner));
    setEditError(null);
    setEditSuccess(null);
    setDeleteError(null);
    setEditImageUploadError(null);
  }, [selectedBanner]);

  const currentOrderIds = items.map((item) => item.id);
  const isOrderDirty = currentOrderIds.join(",") !== savedOrderIds.join(",");

  const createActionParamsError = useMemo(() => {
    try {
      if (createForm.actionType === "EXTERNAL_URL" && createForm.actionParamsText.trim()) {
        return "EXTERNAL_URL 타입에서는 actionParams를 비워야 합니다.";
      }
      parseActionParamsText(createForm.actionParamsText);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "actionParams 형식이 올바르지 않습니다.";
    }
  }, [createForm.actionParamsText, createForm.actionType]);

  const editActionParamsError = useMemo(() => {
    try {
      if (editForm.actionType === "EXTERNAL_URL" && editForm.actionParamsText.trim()) {
        return "EXTERNAL_URL 타입에서는 actionParams를 비워야 합니다.";
      }
      parseActionParamsText(editForm.actionParamsText);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "actionParams 형식이 올바르지 않습니다.";
    }
  }, [editForm.actionParamsText, editForm.actionType]);

  if (loading) {
    return <PageLoadingState label="캠퍼스 배너를 불러오는 중입니다." />;
  }

  if (error) {
    return <PageErrorState title="캠퍼스 배너 로드 실패" message={error} />;
  }

  const updateCreateForm = <K extends keyof CampusBannerFormState>(
    key: K,
    value: CampusBannerFormState[K],
  ) => {
    setCreateForm((current) => ({ ...current, [key]: value }));
  };

  const updateEditForm = <K extends keyof CampusBannerFormState>(
    key: K,
    value: CampusBannerFormState[K],
  ) => {
    setEditForm((current) => ({ ...current, [key]: value }));
  };

  const updateCreateActionType = (nextType: CampusBanner["actionType"]) => {
    setCreateForm((current) => ({
      ...current,
      actionType: nextType,
      actionTarget: nextType === "IN_APP" ? current.actionTarget || "TAXI_MAIN" : "",
      actionParamsText: nextType === "IN_APP" ? current.actionParamsText : "",
      actionUrl: nextType === "EXTERNAL_URL" ? current.actionUrl : "",
    }));
  };

  const updateEditActionType = (nextType: CampusBanner["actionType"]) => {
    setEditForm((current) => ({
      ...current,
      actionType: nextType,
      actionTarget: nextType === "IN_APP" ? current.actionTarget || "TAXI_MAIN" : "",
      actionParamsText: nextType === "IN_APP" ? current.actionParamsText : "",
      actionUrl: nextType === "EXTERNAL_URL" ? current.actionUrl : "",
    }));
  };

  const validateBannerForm = (
    form: CampusBannerFormState,
    actionParamsError: string | null,
  ) => {
    if (!form.badgeLabel.trim()) {
      return "배지 라벨은 비어 있을 수 없습니다.";
    }
    if (!form.titleLabel.trim()) {
      return "제목 라벨은 비어 있을 수 없습니다.";
    }
    if (!form.descriptionLabel.trim()) {
      return "설명 라벨은 비어 있을 수 없습니다.";
    }
    if (!form.buttonLabel.trim()) {
      return "버튼 라벨은 비어 있을 수 없습니다.";
    }
    if (!form.imageUrl.trim()) {
      return "이미지는 비어 있을 수 없습니다.";
    }
    if (actionParamsError) {
      return actionParamsError;
    }
    if (form.actionType === "IN_APP" && !form.actionTarget) {
      return "IN_APP 타입에서는 actionTarget이 필요합니다.";
    }
    if (form.actionType === "IN_APP" && form.actionUrl.trim()) {
      return "IN_APP 타입에서는 actionUrl을 비워야 합니다.";
    }
    if (form.actionType === "EXTERNAL_URL" && !form.actionUrl.trim()) {
      return "EXTERNAL_URL 타입에서는 actionUrl이 필요합니다.";
    }
    if (
      form.displayStartAt &&
      form.displayEndAt &&
      form.displayEndAt < form.displayStartAt
    ) {
      return "displayEndAt은 displayStartAt보다 빠를 수 없습니다.";
    }
    return null;
  };

  const createValidationError = validateBannerForm(createForm, createActionParamsError);
  const editValidationError = selectedBanner
    ? validateBannerForm(editForm, editActionParamsError)
    : "수정할 배너를 선택해주세요.";

  const isEditDirty = Boolean(
    selectedBanner &&
      (editForm.badgeLabel !== selectedBanner.badgeLabel ||
        editForm.titleLabel !== selectedBanner.titleLabel ||
        editForm.descriptionLabel !== selectedBanner.descriptionLabel ||
        editForm.buttonLabel !== selectedBanner.buttonLabel ||
        editForm.paletteKey !== selectedBanner.paletteKey ||
        editForm.imageUrl !== (selectedBanner.imageUrl ?? "") ||
        editForm.actionType !== selectedBanner.actionType ||
        editForm.actionTarget !== (selectedBanner.actionTarget ?? "") ||
        editForm.actionParamsText !==
          (selectedBanner.actionParams
            ? JSON.stringify(selectedBanner.actionParams, null, 2)
            : "") ||
        editForm.actionUrl !== (selectedBanner.actionUrl ?? "") ||
        editForm.isActive !== (selectedBanner.isActive ? "true" : "false") ||
        editForm.displayStartAt !==
          toDateTimeLocalInputValue(selectedBanner.displayStartAt) ||
        editForm.displayEndAt !==
          toDateTimeLocalInputValue(selectedBanner.displayEndAt)),
  );

  const buildBannerPayload = (form: CampusBannerFormState) => ({
    badgeLabel: form.badgeLabel.trim(),
    titleLabel: form.titleLabel.trim(),
    descriptionLabel: form.descriptionLabel.trim(),
    buttonLabel: form.buttonLabel.trim(),
    paletteKey: form.paletteKey,
    imageUrl: form.imageUrl.trim(),
    actionType: form.actionType,
    actionTarget: form.actionType === "IN_APP" ? form.actionTarget || null : null,
    actionParams:
      form.actionType === "IN_APP"
        ? parseActionParamsText(form.actionParamsText)
        : null,
    actionUrl: form.actionType === "EXTERNAL_URL" ? form.actionUrl.trim() : null,
    isActive: form.isActive === "true",
    displayStartAt: fromDateTimeLocalInputValue(form.displayStartAt),
    displayEndAt: fromDateTimeLocalInputValue(form.displayEndAt),
  });

  const handleCreateImageUpload = async (file: File | null) => {
    if (!user || !file) {
      return;
    }

    setCreateImageUploadError(null);
    setIsCreateImageUploading(true);

    try {
      const uploaded = await uploadAuthorizedImage(
        user,
        "CAMPUS_BANNER_IMAGE",
        file,
      );
      setCreateForm((current) => ({ ...current, imageUrl: uploaded.url }));
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setCreateImageUploadError(caughtError.message);
      } else {
        setCreateImageUploadError("배너 이미지 업로드에 실패했습니다.");
      }
    } finally {
      setIsCreateImageUploading(false);
    }
  };

  const handleEditImageUpload = async (file: File | null) => {
    if (!user || !file) {
      return;
    }

    setEditImageUploadError(null);
    setIsEditImageUploading(true);

    try {
      const uploaded = await uploadAuthorizedImage(
        user,
        "CAMPUS_BANNER_IMAGE",
        file,
      );
      setEditForm((current) => ({ ...current, imageUrl: uploaded.url }));
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setEditImageUploadError(caughtError.message);
      } else {
        setEditImageUploadError("배너 이미지 업로드에 실패했습니다.");
      }
    } finally {
      setIsEditImageUploading(false);
    }
  };

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
          const response = await getAuthorizedJson<ApiResponse<CampusBanner>>(
            user,
            `${getApiBaseUrl()}/v1/admin/campus-banners`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(buildBannerPayload(createForm)),
            },
          );

          preferredSelectedIdRef.current = response.data.id;
          setCreateForm(createDefaultBannerFormState());
          setCreateImageUploadError(null);
          setCreateSuccess(`캠퍼스 배너 "${response.data.titleLabel}"를 생성했습니다.`);
          setRefreshKey((current) => current + 1);
        } catch (caughtError) {
          if (caughtError instanceof ApiError) {
            setCreateError(caughtError.message);
          } else {
            setCreateError("캠퍼스 배너를 생성하지 못했습니다.");
          }
        }
      })();
    });
  };

  const handleUpdate = () => {
    if (!user || !selectedBanner || editValidationError) {
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
          const response = await getAuthorizedJson<ApiResponse<CampusBanner>>(
            user,
            `${getApiBaseUrl()}/v1/admin/campus-banners/${selectedBanner.id}`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(buildBannerPayload(editForm)),
            },
          );

          preferredSelectedIdRef.current = response.data.id;
          setEditForm(toBannerFormState(response.data));
          setEditSuccess(`캠퍼스 배너 "${response.data.titleLabel}"를 저장했습니다.`);
          setRefreshKey((current) => current + 1);
        } catch (caughtError) {
          if (caughtError instanceof ApiError) {
            setEditError(caughtError.message);
          } else {
            setEditError("캠퍼스 배너를 수정하지 못했습니다.");
          }
        }
      })();
    });
  };

  const handleDelete = () => {
    if (!user || !selectedBanner) {
      return;
    }

    if (!window.confirm(`"${selectedBanner.titleLabel}" 배너를 삭제할까요?`)) {
      return;
    }

    startDeleteTransition(() => {
      void (async () => {
        setDeleteError(null);
        setEditSuccess(null);

        try {
          await getAuthorizedJson<ApiResponse<null>>(
            user,
            `${getApiBaseUrl()}/v1/admin/campus-banners/${selectedBanner.id}`,
            {
              method: "DELETE",
            },
          );

          preferredSelectedIdRef.current = null;
          setEditSuccess(`캠퍼스 배너 "${selectedBanner.titleLabel}"를 삭제했습니다.`);
          setRefreshKey((current) => current + 1);
        } catch (caughtError) {
          if (caughtError instanceof ApiError) {
            setDeleteError(caughtError.message);
          } else {
            setDeleteError("캠퍼스 배너를 삭제하지 못했습니다.");
          }
        }
      })();
    });
  };

  const handleMoveBanner = (bannerId: string, direction: "up" | "down") => {
    setOrderError(null);
    setOrderSuccess(null);
    setItems((current) => {
      const index = current.findIndex((item) => item.id === bannerId);
      if (index < 0) {
        return current;
      }

      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      return moveItem(current, index, nextIndex).map((item, orderIndex) => ({
        ...item,
        displayOrder: orderIndex + 1,
      }));
    });
  };

  const handleSaveOrder = () => {
    if (!user || !isOrderDirty) {
      return;
    }

    startOrderTransition(() => {
      void (async () => {
        setOrderError(null);
        setOrderSuccess(null);

        try {
          const response = await getAuthorizedJson<
            ApiResponse<CampusBannerOrderResponse[]>
          >(user, `${getApiBaseUrl()}/v1/admin/campus-banners/order`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              bannerIds: items.map((item) => item.id),
            }),
          });

          setSavedOrderIds(items.map((item) => item.id));
          setItems((current) =>
            [...current].map((item) => ({
              ...item,
              displayOrder:
                response.data.find((order) => order.id === item.id)?.displayOrder ??
                item.displayOrder,
            })),
          );
          setOrderSuccess("캠퍼스 배너 순서를 저장했습니다.");
        } catch (caughtError) {
          if (caughtError instanceof ApiError) {
            setOrderError(caughtError.message);
          } else {
            setOrderError("캠퍼스 배너 순서를 저장하지 못했습니다.");
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
          Campus
        </Text>
        <Heading size="2xl">캠퍼스 배너 관리</Heading>
        <Text color="gray.600" _dark={{ color: "gray.300" }}>
          배너 생성, 수정, 삭제와 순서 변경을 현재 Spring 계약에 맞춰 연결했습니다.
          `actionType` 제약과 `actionParams` JSON object 규칙도 백엔드와 동일하게
          검증합니다.
        </Text>
      </Stack>

      <SimpleGrid columns={{ base: 1, md: 3 }} gap="4">
        <Card.Root>
          <Card.Body gap="1">
            <Text fontSize="sm" color="gray.500">
              전체 배너
            </Text>
            <Heading size="xl">{items.length}</Heading>
          </Card.Body>
        </Card.Root>
        <Card.Root>
          <Card.Body gap="1">
            <Text fontSize="sm" color="gray.500">
              활성 배너
            </Text>
            <Heading size="xl">
              {items.filter((item) => item.isActive).length}
            </Heading>
          </Card.Body>
        </Card.Root>
        <Card.Root>
          <Card.Body gap="1">
            <Text fontSize="sm" color="gray.500">
              순서 변경 대기
            </Text>
            <Heading size="xl">{isOrderDirty ? "Yes" : "No"}</Heading>
          </Card.Body>
        </Card.Root>
      </SimpleGrid>

      <Grid
        templateColumns={{ base: "1fr", xl: "minmax(0, 1fr) minmax(0, 1fr)" }}
        gap="5"
      >
        <Card.Root>
          <Card.Header>
            <Heading size="md">배너 생성</Heading>
          </Card.Header>
          <Card.Body gap="4">
            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="4">
              <Field.Root>
                <Field.Label>배지 라벨</Field.Label>
                <Input
                  value={createForm.badgeLabel}
                  onChange={(event) =>
                    updateCreateForm("badgeLabel", event.target.value)
                  }
                />
              </Field.Root>
              <Field.Root>
                <Field.Label>제목 라벨</Field.Label>
                <Input
                  value={createForm.titleLabel}
                  onChange={(event) =>
                    updateCreateForm("titleLabel", event.target.value)
                  }
                />
              </Field.Root>
            </Grid>

            <Field.Root>
              <Field.Label>설명 라벨</Field.Label>
              <Textarea
                value={createForm.descriptionLabel}
                onChange={(event) =>
                  updateCreateForm("descriptionLabel", event.target.value)
                }
                autoresize
                maxH="10lh"
              />
            </Field.Root>

            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="4">
              <Field.Root>
                <Field.Label>버튼 라벨</Field.Label>
                <Input
                  value={createForm.buttonLabel}
                  onChange={(event) =>
                    updateCreateForm("buttonLabel", event.target.value)
                  }
                />
              </Field.Root>
              <Field.Root>
                <Field.Label>팔레트</Field.Label>
                <NativeSelect.Root>
                  <NativeSelect.Field
                    value={createForm.paletteKey}
                    onChange={(event) =>
                      updateCreateForm(
                        "paletteKey",
                        event.target.value as CampusBanner["paletteKey"],
                      )
                    }
                  >
                    {bannerPaletteKeys.map((key) => (
                      <option key={key} value={key}>
                        {key}
                      </option>
                    ))}
                  </NativeSelect.Field>
                </NativeSelect.Root>
              </Field.Root>
            </Grid>

            <Field.Root>
              <Field.Label>배너 이미지 업로드</Field.Label>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  event.target.value = "";
                  void handleCreateImageUpload(file);
                }}
              />
              <Field.HelperText>
                JPEG, PNG, WebP 업로드를 지원합니다.
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

            {createForm.imageUrl ? (
              <Image
                src={createForm.imageUrl}
                alt="생성할 캠퍼스 배너 미리보기"
                rounded="xl"
                h="180px"
                w="full"
                objectFit="cover"
              />
            ) : (
              <Text fontSize="sm" color="gray.500">
                업로드한 이미지가 여기 미리보기로 표시됩니다.
              </Text>
            )}

            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="4">
              <Field.Root>
                <Field.Label>액션 타입</Field.Label>
                <NativeSelect.Root>
                  <NativeSelect.Field
                    value={createForm.actionType}
                    onChange={(event) =>
                      updateCreateActionType(
                        event.target.value as CampusBanner["actionType"],
                      )
                    }
                  >
                    {bannerActionTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </NativeSelect.Field>
                </NativeSelect.Root>
              </Field.Root>
              <Field.Root>
                <Field.Label>활성 여부</Field.Label>
                <NativeSelect.Root>
                  <NativeSelect.Field
                    value={createForm.isActive}
                    onChange={(event) =>
                      updateCreateForm(
                        "isActive",
                        event.target.value as "true" | "false",
                      )
                    }
                  >
                    <option value="true">활성</option>
                    <option value="false">비활성</option>
                  </NativeSelect.Field>
                </NativeSelect.Root>
              </Field.Root>
            </Grid>

            {createForm.actionType === "IN_APP" ? (
              <>
                <Field.Root>
                  <Field.Label>인앱 이동 대상</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={createForm.actionTarget}
                      onChange={(event) =>
                        updateCreateForm(
                          "actionTarget",
                          event.target.value as CampusBannerFormState["actionTarget"],
                        )
                      }
                    >
                      {bannerActionTargets.map((target) => (
                        <option key={target} value={target}>
                          {target}
                        </option>
                      ))}
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>
                <Field.Root invalid={Boolean(createActionParamsError)}>
                  <Field.Label>추가 파라미터 JSON</Field.Label>
                  <Textarea
                    value={createForm.actionParamsText}
                    onChange={(event) =>
                      updateCreateForm("actionParamsText", event.target.value)
                    }
                    placeholder='{"initialView":"all"}'
                    autoresize
                    maxH="10lh"
                  />
                  <Field.HelperText>
                    비워 두면 `null`로 전송됩니다.
                  </Field.HelperText>
                </Field.Root>
              </>
            ) : (
              <Field.Root>
                <Field.Label>외부 이동 URL</Field.Label>
                <Input
                  value={createForm.actionUrl}
                  onChange={(event) =>
                    updateCreateForm("actionUrl", event.target.value)
                  }
                  placeholder="https://www.sungkyul.ac.kr"
                />
              </Field.Root>
            )}

            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="4">
              <Field.Root>
                <Field.Label>노출 시작 시각</Field.Label>
                <Input
                  type="datetime-local"
                  value={createForm.displayStartAt}
                  onChange={(event) =>
                    updateCreateForm("displayStartAt", event.target.value)
                  }
                />
              </Field.Root>
              <Field.Root>
                <Field.Label>노출 종료 시각</Field.Label>
                <Input
                  type="datetime-local"
                  value={createForm.displayEndAt}
                  onChange={(event) =>
                    updateCreateForm("displayEndAt", event.target.value)
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
              배너 생성
            </Button>
          </Card.Body>
        </Card.Root>

        <Card.Root>
          <Card.Header>
            <Heading size="md">선택 배너 수정</Heading>
          </Card.Header>
          <Card.Body gap="4">
            {selectedBanner ? (
              <>
                <HStack justify="space-between" align="start">
                  <Stack gap="1">
                    <Text fontSize="sm" color="gray.500">
                      선택된 배너
                    </Text>
                    <Heading size="sm">{selectedBanner.titleLabel}</Heading>
                  </Stack>
                  <HStack gap="2">
                    <Badge colorPalette={selectedBanner.isActive ? "green" : "gray"}>
                      {selectedBanner.isActive ? "ACTIVE" : "INACTIVE"}
                    </Badge>
                    <Badge variant="outline">#{selectedBanner.displayOrder}</Badge>
                  </HStack>
                </HStack>

                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="4">
                  <Field.Root>
                    <Field.Label>배지 라벨</Field.Label>
                    <Input
                      value={editForm.badgeLabel}
                      onChange={(event) =>
                        updateEditForm("badgeLabel", event.target.value)
                      }
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>제목 라벨</Field.Label>
                    <Input
                      value={editForm.titleLabel}
                      onChange={(event) =>
                        updateEditForm("titleLabel", event.target.value)
                      }
                    />
                  </Field.Root>
                </Grid>

                <Field.Root>
                  <Field.Label>설명 라벨</Field.Label>
                  <Textarea
                    value={editForm.descriptionLabel}
                    onChange={(event) =>
                      updateEditForm("descriptionLabel", event.target.value)
                    }
                    autoresize
                    maxH="10lh"
                  />
                </Field.Root>

                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="4">
                  <Field.Root>
                    <Field.Label>버튼 라벨</Field.Label>
                    <Input
                      value={editForm.buttonLabel}
                      onChange={(event) =>
                        updateEditForm("buttonLabel", event.target.value)
                      }
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>팔레트</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        value={editForm.paletteKey}
                        onChange={(event) =>
                          updateEditForm(
                            "paletteKey",
                            event.target.value as CampusBanner["paletteKey"],
                          )
                        }
                      >
                        {bannerPaletteKeys.map((key) => (
                          <option key={key} value={key}>
                            {key}
                          </option>
                        ))}
                      </NativeSelect.Field>
                    </NativeSelect.Root>
                  </Field.Root>
                </Grid>

                <Field.Root>
                  <Field.Label>배너 이미지 교체</Field.Label>
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      event.target.value = "";
                      void handleEditImageUpload(file);
                    }}
                  />
                  <Field.HelperText>
                    새 이미지를 업로드하면 현재 배너 이미지를 교체합니다.
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

                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="4">
                  <Field.Root>
                    <Field.Label>액션 타입</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        value={editForm.actionType}
                        onChange={(event) =>
                          updateEditActionType(
                            event.target.value as CampusBanner["actionType"],
                          )
                        }
                      >
                        {bannerActionTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </NativeSelect.Field>
                    </NativeSelect.Root>
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>활성 여부</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        value={editForm.isActive}
                        onChange={(event) =>
                          updateEditForm(
                            "isActive",
                            event.target.value as "true" | "false",
                          )
                        }
                      >
                        <option value="true">활성</option>
                        <option value="false">비활성</option>
                      </NativeSelect.Field>
                    </NativeSelect.Root>
                  </Field.Root>
                </Grid>

                {editForm.actionType === "IN_APP" ? (
                  <>
                    <Field.Root>
                      <Field.Label>인앱 이동 대상</Field.Label>
                      <NativeSelect.Root>
                        <NativeSelect.Field
                          value={editForm.actionTarget}
                          onChange={(event) =>
                            updateEditForm(
                              "actionTarget",
                              event.target.value as CampusBannerFormState["actionTarget"],
                            )
                          }
                        >
                          {bannerActionTargets.map((target) => (
                            <option key={target} value={target}>
                              {target}
                            </option>
                          ))}
                        </NativeSelect.Field>
                      </NativeSelect.Root>
                    </Field.Root>
                    <Field.Root invalid={Boolean(editActionParamsError)}>
                      <Field.Label>추가 파라미터 JSON</Field.Label>
                      <Textarea
                        value={editForm.actionParamsText}
                        onChange={(event) =>
                          updateEditForm("actionParamsText", event.target.value)
                        }
                        autoresize
                        maxH="10lh"
                      />
                    </Field.Root>
                  </>
                ) : (
                  <Field.Root>
                    <Field.Label>외부 이동 URL</Field.Label>
                    <Input
                      value={editForm.actionUrl}
                      onChange={(event) =>
                        updateEditForm("actionUrl", event.target.value)
                      }
                    />
                  </Field.Root>
                )}

                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="4">
                  <Field.Root>
                    <Field.Label>노출 시작 시각</Field.Label>
                    <Input
                      type="datetime-local"
                      value={editForm.displayStartAt}
                      onChange={(event) =>
                        updateEditForm("displayStartAt", event.target.value)
                      }
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>노출 종료 시각</Field.Label>
                    <Input
                      type="datetime-local"
                      value={editForm.displayEndAt}
                      onChange={(event) =>
                        updateEditForm("displayEndAt", event.target.value)
                      }
                    />
                  </Field.Root>
                </Grid>

                {editForm.imageUrl ? (
                  <Image
                    src={editForm.imageUrl}
                    alt={selectedBanner.titleLabel}
                    rounded="xl"
                    h="180px"
                    w="full"
                    objectFit="cover"
                  />
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
                    수정일 {formatDateTime(selectedBanner.updatedAt)}
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
                <Text>수정할 배너를 먼저 선택해주세요.</Text>
              </Box>
            )}
          </Card.Body>
        </Card.Root>
      </Grid>

      <Card.Root>
        <Card.Header>
          <HStack justify="space-between" align="center" wrap="wrap" gap="3">
            <Heading size="md">배너 목록 및 순서</Heading>
            <HStack>
              <Button
                variant="outline"
                onClick={() => setRefreshKey((current) => current + 1)}
              >
                새로고침
              </Button>
              <Button
                colorPalette="orange"
                onClick={handleSaveOrder}
                loading={isOrderPending}
                disabled={!isOrderDirty}
              >
                순서 저장
              </Button>
            </HStack>
          </HStack>
        </Card.Header>
        <Card.Body gap="4">
          {orderSuccess ? (
            <Alert.Root status="success" rounded="xl">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>순서 저장 완료</Alert.Title>
                <Alert.Description>{orderSuccess}</Alert.Description>
              </Alert.Content>
            </Alert.Root>
          ) : null}

          {orderError ? (
            <Alert.Root status="error" rounded="xl">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>순서 저장 실패</Alert.Title>
                <Alert.Description>{orderError}</Alert.Description>
              </Alert.Content>
            </Alert.Root>
          ) : null}

          <Box overflowX="auto">
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>순서</Table.ColumnHeader>
                  <Table.ColumnHeader>배너</Table.ColumnHeader>
                  <Table.ColumnHeader>액션</Table.ColumnHeader>
                  <Table.ColumnHeader>활성</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="end">정렬</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {items.map((banner, index) => {
                  const active = banner.id === selectedBanner?.id;
                  return (
                    <Table.Row
                      key={banner.id}
                      bg={active ? "orange.50" : undefined}
                      cursor="pointer"
                      onClick={() => setSelectedBannerId(banner.id)}
                      _hover={{ bg: active ? "orange.100" : "blackAlpha.50" }}
                      _dark={{
                        bg: active ? "orange.950" : undefined,
                        _hover: {
                          bg: active ? "orange.900" : "whiteAlpha.100",
                        },
                      }}
                    >
                      <Table.Cell>#{index + 1}</Table.Cell>
                      <Table.Cell>
                        <Stack gap="1">
                          <Text fontWeight="600">{banner.titleLabel}</Text>
                          <Text fontSize="sm" color="gray.500">
                            {banner.badgeLabel} · {banner.buttonLabel}
                          </Text>
                        </Stack>
                      </Table.Cell>
                      <Table.Cell>
                        <Text>{banner.actionType}</Text>
                        <Text fontSize="sm" color="gray.500">
                          {banner.actionTarget || banner.actionUrl || "-"}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge colorPalette={banner.isActive ? "green" : "gray"}>
                          {banner.isActive ? "ACTIVE" : "INACTIVE"}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell textAlign="end">
                        <HStack justify="flex-end">
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleMoveBanner(banner.id, "up");
                            }}
                            disabled={index === 0}
                          >
                            위로
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleMoveBanner(banner.id, "down");
                            }}
                            disabled={index === items.length - 1}
                          >
                            아래로
                          </Button>
                        </HStack>
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
