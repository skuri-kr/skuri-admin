"use client";

import Image from "next/image";
import {
  AlertCircle,
  CheckCircle2,
  ImagePlus,
  MoveVertical,
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
    <PageStack>
      <SectionStack className="gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Campus
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">캠퍼스 배너 관리</h1>
        <p className="text-sm text-muted-foreground">
          배너 생성, 수정, 삭제와 순서 변경을 현재 Spring 계약에 맞춰 연결했습니다.
          `actionType` 제약과 `actionParams` JSON object 규칙도 백엔드와 동일하게
          검증합니다.
        </p>
      </SectionStack>

      <ResponsiveGrid>
        <Card><CardContent className="space-y-1 pt-6"><p className="text-sm text-muted-foreground">전체 배너</p><p className="text-3xl font-semibold">{items.length}</p></CardContent></Card>
        <Card><CardContent className="space-y-1 pt-6"><p className="text-sm text-muted-foreground">활성 배너</p><p className="text-3xl font-semibold">{items.filter((item) => item.isActive).length}</p></CardContent></Card>
        <Card><CardContent className="space-y-1 pt-6"><p className="text-sm text-muted-foreground">순서 변경 대기</p><p className="text-3xl font-semibold">{isOrderDirty ? "Yes" : "No"}</p></CardContent></Card>
      </ResponsiveGrid>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>배너 생성</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <TwoColumnGrid>
              <FormField label="배지 라벨"><Input value={createForm.badgeLabel} onChange={(event) => updateCreateForm("badgeLabel", event.target.value)} /></FormField>
              <FormField label="제목 라벨"><Input value={createForm.titleLabel} onChange={(event) => updateCreateForm("titleLabel", event.target.value)} /></FormField>
            </TwoColumnGrid>
            <FormField label="설명 라벨"><Textarea className="max-h-[10lh] min-h-[140px]" value={createForm.descriptionLabel} onChange={(event) => updateCreateForm("descriptionLabel", event.target.value)} /></FormField>
            <TwoColumnGrid>
              <FormField label="버튼 라벨"><Input value={createForm.buttonLabel} onChange={(event) => updateCreateForm("buttonLabel", event.target.value)} /></FormField>
              <FormField label="팔레트">
                <Select value={createForm.paletteKey} onValueChange={(value) => updateCreateForm("paletteKey", value as CampusBanner["paletteKey"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{bannerPaletteKeys.map((key) => <SelectItem key={key} value={key}>{key}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
            </TwoColumnGrid>
            <FormField label="배너 이미지 업로드" hint={`JPEG, PNG, WebP 업로드를 지원합니다.${isCreateImageUploading ? " 업로드 중입니다." : ""}`}>
              <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0] ?? null; event.target.value = ""; void handleCreateImageUpload(file); }} />
            </FormField>
            {createImageUploadError ? <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>이미지 업로드 실패</AlertTitle><AlertDescription>{createImageUploadError}</AlertDescription></Alert> : null}
            {createForm.imageUrl ? <div className="relative h-[180px] overflow-hidden rounded-xl"><Image src={createForm.imageUrl} alt="생성할 캠퍼스 배너 미리보기" fill className="object-cover" /></div> : <p className="text-sm text-muted-foreground">업로드한 이미지가 여기 미리보기로 표시됩니다.</p>}
            <TwoColumnGrid>
              <FormField label="액션 타입">
                <Select value={createForm.actionType} onValueChange={(value) => updateCreateActionType(value as CampusBanner["actionType"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{bannerActionTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="활성 여부">
                <Select value={createForm.isActive} onValueChange={(value) => updateCreateForm("isActive", value as "true" | "false")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="true">활성</SelectItem><SelectItem value="false">비활성</SelectItem></SelectContent>
                </Select>
              </FormField>
            </TwoColumnGrid>
            {createForm.actionType === "IN_APP" ? (
              <>
                <FormField label="인앱 이동 대상">
                  <Select value={createForm.actionTarget} onValueChange={(value) => updateCreateForm("actionTarget", value as CampusBannerFormState["actionTarget"])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{bannerActionTargets.map((target) => <SelectItem key={target} value={target}>{target}</SelectItem>)}</SelectContent>
                  </Select>
                </FormField>
                <FormField label="추가 파라미터 JSON" hint="비워 두면 `null`로 전송됩니다.">
                  <Textarea className="max-h-[10lh] min-h-[140px]" value={createForm.actionParamsText} onChange={(event) => updateCreateForm("actionParamsText", event.target.value)} placeholder='{"initialView":"all"}' />
                </FormField>
              </>
            ) : (
              <FormField label="외부 이동 URL"><Input value={createForm.actionUrl} onChange={(event) => updateCreateForm("actionUrl", event.target.value)} placeholder="https://www.sungkyul.ac.kr" /></FormField>
            )}
            <TwoColumnGrid>
              <FormField label="노출 시작 시각"><Input type="datetime-local" value={createForm.displayStartAt} onChange={(event) => updateCreateForm("displayStartAt", event.target.value)} /></FormField>
              <FormField label="노출 종료 시각"><Input type="datetime-local" value={createForm.displayEndAt} onChange={(event) => updateCreateForm("displayEndAt", event.target.value)} /></FormField>
            </TwoColumnGrid>
            {createSuccess ? <Alert><CheckCircle2 className="h-4 w-4" /><AlertTitle>생성 완료</AlertTitle><AlertDescription>{createSuccess}</AlertDescription></Alert> : null}
            {createError ? <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>생성 실패</AlertTitle><AlertDescription>{createError}</AlertDescription></Alert> : null}
            <Button onClick={handleCreate} disabled={Boolean(createValidationError) || isCreateImageUploading || isCreatePending}>
              <ImagePlus className="mr-2 h-4 w-4" />
              {isCreatePending ? "배너 생성 중..." : "배너 생성"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>선택 배너 수정</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {selectedBanner ? (
              <>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">선택된 배너</p><p className="text-lg font-semibold">{selectedBanner.titleLabel}</p></div>
                  <InlineGroup>
                    <Badge className={selectedBanner.isActive ? "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300" : "border border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-300"}>{selectedBanner.isActive ? "ACTIVE" : "INACTIVE"}</Badge>
                    <Badge variant="outline">#{selectedBanner.displayOrder}</Badge>
                  </InlineGroup>
                </div>
                <TwoColumnGrid>
                  <FormField label="배지 라벨"><Input value={editForm.badgeLabel} onChange={(event) => updateEditForm("badgeLabel", event.target.value)} /></FormField>
                  <FormField label="제목 라벨"><Input value={editForm.titleLabel} onChange={(event) => updateEditForm("titleLabel", event.target.value)} /></FormField>
                </TwoColumnGrid>
                <FormField label="설명 라벨"><Textarea className="max-h-[10lh] min-h-[140px]" value={editForm.descriptionLabel} onChange={(event) => updateEditForm("descriptionLabel", event.target.value)} /></FormField>
                <TwoColumnGrid>
                  <FormField label="버튼 라벨"><Input value={editForm.buttonLabel} onChange={(event) => updateEditForm("buttonLabel", event.target.value)} /></FormField>
                  <FormField label="팔레트">
                    <Select value={editForm.paletteKey} onValueChange={(value) => updateEditForm("paletteKey", value as CampusBanner["paletteKey"])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{bannerPaletteKeys.map((key) => <SelectItem key={key} value={key}>{key}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormField>
                </TwoColumnGrid>
                <FormField label="배너 이미지 교체" hint="새 이미지를 업로드하면 현재 배너 이미지를 교체합니다.">
                  <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0] ?? null; event.target.value = ""; void handleEditImageUpload(file); }} />
                </FormField>
                {editImageUploadError ? <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>이미지 업로드 실패</AlertTitle><AlertDescription>{editImageUploadError}</AlertDescription></Alert> : null}
                <TwoColumnGrid>
                  <FormField label="액션 타입">
                    <Select value={editForm.actionType} onValueChange={(value) => updateEditActionType(value as CampusBanner["actionType"])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{bannerActionTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="활성 여부">
                    <Select value={editForm.isActive} onValueChange={(value) => updateEditForm("isActive", value as "true" | "false")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="true">활성</SelectItem><SelectItem value="false">비활성</SelectItem></SelectContent>
                    </Select>
                  </FormField>
                </TwoColumnGrid>
                {editForm.actionType === "IN_APP" ? (
                  <>
                    <FormField label="인앱 이동 대상">
                      <Select value={editForm.actionTarget} onValueChange={(value) => updateEditForm("actionTarget", value as CampusBannerFormState["actionTarget"])}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{bannerActionTargets.map((target) => <SelectItem key={target} value={target}>{target}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="추가 파라미터 JSON"><Textarea className="max-h-[10lh] min-h-[140px]" value={editForm.actionParamsText} onChange={(event) => updateEditForm("actionParamsText", event.target.value)} /></FormField>
                  </>
                ) : (
                  <FormField label="외부 이동 URL"><Input value={editForm.actionUrl} onChange={(event) => updateEditForm("actionUrl", event.target.value)} /></FormField>
                )}
                <TwoColumnGrid>
                  <FormField label="노출 시작 시각"><Input type="datetime-local" value={editForm.displayStartAt} onChange={(event) => updateEditForm("displayStartAt", event.target.value)} /></FormField>
                  <FormField label="노출 종료 시각"><Input type="datetime-local" value={editForm.displayEndAt} onChange={(event) => updateEditForm("displayEndAt", event.target.value)} /></FormField>
                </TwoColumnGrid>
                {editForm.imageUrl ? <div className="relative h-[180px] overflow-hidden rounded-xl"><Image src={editForm.imageUrl} alt={selectedBanner.titleLabel} fill className="object-cover" /></div> : null}
                {editSuccess ? <Alert><CheckCircle2 className="h-4 w-4" /><AlertTitle>저장 완료</AlertTitle><AlertDescription>{editSuccess}</AlertDescription></Alert> : null}
                {editError ? <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>저장 실패</AlertTitle><AlertDescription>{editError}</AlertDescription></Alert> : null}
                {deleteError ? <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>삭제 실패</AlertTitle><AlertDescription>{deleteError}</AlertDescription></Alert> : null}
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm text-muted-foreground">수정일 {formatDateTime(selectedBanner.updatedAt)}</p>
                  <InlineGroup>
                    <Button variant="outline" onClick={handleDelete} disabled={isDeletePending}>{isDeletePending ? "삭제 중..." : "삭제"}</Button>
                    <Button onClick={handleUpdate} disabled={!isEditDirty || Boolean(editValidationError) || isEditImageUploading || isEditPending}>{isEditPending ? "저장 중..." : "저장"}</Button>
                  </InlineGroup>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed p-8 text-center"><p>수정할 배너를 먼저 선택해주세요.</p></div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>배너 목록 및 순서</CardTitle>
            <InlineGroup>
              <Button variant="outline" onClick={() => setRefreshKey((current) => current + 1)}>새로고침</Button>
              <Button onClick={handleSaveOrder} disabled={!isOrderDirty || isOrderPending}>
                <MoveVertical className="mr-2 h-4 w-4" />
                {isOrderPending ? "순서 저장 중..." : "순서 저장"}
              </Button>
            </InlineGroup>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {orderSuccess ? <Alert><CheckCircle2 className="h-4 w-4" /><AlertTitle>순서 저장 완료</AlertTitle><AlertDescription>{orderSuccess}</AlertDescription></Alert> : null}
          {orderError ? <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>순서 저장 실패</AlertTitle><AlertDescription>{orderError}</AlertDescription></Alert> : null}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>순서</TableHead>
                  <TableHead>배너</TableHead>
                  <TableHead>액션</TableHead>
                  <TableHead>활성</TableHead>
                  <TableHead className="text-right">정렬</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((banner, index) => {
                  const active = banner.id === selectedBanner?.id;
                  return (
                    <TableRow key={banner.id} className={active ? "cursor-pointer bg-muted/40" : "cursor-pointer"} onClick={() => setSelectedBannerId(banner.id)}>
                      <TableCell>#{index + 1}</TableCell>
                      <TableCell><div className="space-y-1"><p className="font-semibold">{banner.titleLabel}</p><p className="text-sm text-muted-foreground">{banner.badgeLabel} · {banner.buttonLabel}</p></div></TableCell>
                      <TableCell><p>{banner.actionType}</p><p className="text-sm text-muted-foreground">{banner.actionTarget || banner.actionUrl || "-"}</p></TableCell>
                      <TableCell><Badge className={banner.isActive ? "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300" : "border border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-300"}>{banner.isActive ? "ACTIVE" : "INACTIVE"}</Badge></TableCell>
                      <TableCell className="text-right">
                        <InlineGroup className="justify-end">
                          <Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); handleMoveBanner(banner.id, "up"); }} disabled={index === 0}>위로</Button>
                          <Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); handleMoveBanner(banner.id, "down"); }} disabled={index === items.length - 1}>아래로</Button>
                        </InlineGroup>
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
