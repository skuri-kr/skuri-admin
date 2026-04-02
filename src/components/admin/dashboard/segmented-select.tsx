"use client";

import { Button } from "@/components/ui/button";

interface SegmentedSelectProps {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}

export function SegmentedSelect({
  label,
  value,
  options,
  onChange,
}: SegmentedSelectProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1">
        {options.map((option) => (
          <Button
            key={option}
            type="button"
            size="sm"
            variant={value === option ? "default" : "ghost"}
            className="min-w-11"
            onClick={() => onChange(option)}
          >
            {option}
          </Button>
        ))}
      </div>
    </div>
  );
}
