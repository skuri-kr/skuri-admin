import { Eye, EyeOff, Trash2 } from "lucide-react";
import type { BoardModerationStatus } from "@/features/admin/types";

export function moderationClasses(status: BoardModerationStatus) {
  switch (status) {
    case "VISIBLE":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300";
    case "HIDDEN":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300";
    case "DELETED":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300";
  }
}

export function availableModerationTargets(
  current: BoardModerationStatus,
): BoardModerationStatus[] {
  switch (current) {
    case "VISIBLE":
      return ["HIDDEN", "DELETED"];
    case "HIDDEN":
      return ["VISIBLE", "DELETED"];
    case "DELETED":
      return [];
  }
}

export function moderationActionLabel(target: BoardModerationStatus) {
  switch (target) {
    case "VISIBLE":
      return "복구";
    case "HIDDEN":
      return "숨김";
    case "DELETED":
      return "삭제";
  }
}

export function moderationActionIcon(target: BoardModerationStatus) {
  switch (target) {
    case "VISIBLE":
      return Eye;
    case "HIDDEN":
      return EyeOff;
    case "DELETED":
      return Trash2;
  }
}

export function moderationLabel(status: BoardModerationStatus) {
  switch (status) {
    case "VISIBLE":
      return "노출";
    case "HIDDEN":
      return "숨김";
    case "DELETED":
      return "삭제";
  }
}

export function formatText(value: string | null | undefined) {
  return value && value.trim().length ? value : "-";
}
