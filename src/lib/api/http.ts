export interface ApiErrorShape {
  success?: false;
  message?: string;
  errorCode?: string;
  timestamp?: string;
}

export class ApiError extends Error {
  status: number;
  errorCode?: string;

  constructor(status: number, message: string, errorCode?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errorCode = errorCode;
  }
}

async function parseError(response: Response) {
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

export async function getJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, init);

  if (!response.ok) {
    throw await parseError(response);
  }

  return (await response.json()) as T;
}

