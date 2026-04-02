"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

export function PageLoadingState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-muted/30">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export function PageErrorState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <Alert variant="destructive" className="rounded-2xl">
      <AlertCircle className="size-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
