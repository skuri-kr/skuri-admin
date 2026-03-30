import type { User } from "firebase/auth";
import { getJson } from "@/lib/api/http";

export async function getAuthorizedJson<T>(
  user: User,
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  const token = await user.getIdToken();

  return getJson<T>(input, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
}

