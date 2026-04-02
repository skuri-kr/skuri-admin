"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

export function Provider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider>
        {children}
      </TooltipProvider>
    </ThemeProvider>
  );
}
