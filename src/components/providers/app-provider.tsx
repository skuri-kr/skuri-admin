"use client";

import { Provider } from "@/components/ui/provider";
import { AuthProvider } from "@/features/auth/auth-context";
import type { ReactNode } from "react";

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <Provider>
      <AuthProvider>{children}</AuthProvider>
    </Provider>
  );
}

