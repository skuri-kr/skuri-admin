import type { User } from "firebase/auth";
import { ApiError, type ApiErrorShape } from "@/lib/api/http";
import { getApiBaseUrl } from "@/lib/env/public-env";

export type ImageUploadContext =
  | "POST_IMAGE"
  | "CHAT_IMAGE"
  | "APP_NOTICE_IMAGE"
  | "CAMPUS_BANNER_IMAGE"
  | "PROFILE_IMAGE"
  | "INQUIRY_IMAGE";

export interface ImageUploadResult {
  url: string;
  thumbUrl: string | null;
  width: number | null;
  height: number | null;
  size: number | null;
  mime: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

async function parseApiError(response: Response) {
  const fallbackMessage = `HTTP ${response.status}`;

  try {
    const data = (await response.json()) as ApiErrorShape;
    return new ApiError(
      response.status,
      data.message ?? fallbackMessage,
      data.errorCode,
    );
  } catch {
    return new ApiError(response.status, fallbackMessage);
  }
}

export async function uploadAuthorizedImage(
  user: User,
  context: ImageUploadContext,
  file: File,
) {
  const token = await user.getIdToken();
  const formData = new FormData();
  formData.set("context", context);
  formData.set("file", file);

  const response = await fetch(`${getApiBaseUrl()}/v1/images`, {
    method: "POST",
    body: formData,
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw await parseApiError(response);
  }

  const payload = (await response.json()) as ApiResponse<ImageUploadResult>;
  return payload.data;
}
