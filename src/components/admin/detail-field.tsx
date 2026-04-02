"use client";

import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface DetailFieldProps {
  label: string;
  value: ReactNode;
  className?: string;
}

export function DetailField({
  label,
  value,
  className,
}: DetailFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </Label>
      <div className="text-sm leading-6">{value}</div>
    </div>
  );
}
