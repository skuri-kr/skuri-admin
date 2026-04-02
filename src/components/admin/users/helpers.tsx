import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  AdminMemberStatus,
  AdminMemberRecentParty,
} from "@/features/admin/types";

export function formatText(value: string | null | undefined) {
  return value && value.trim().length ? value : "-";
}

export function formatOsLabel(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  switch (value.toLowerCase()) {
    case "ios":
      return "iOS";
    case "android":
      return "Android";
    default:
      return value;
  }
}

export function listItemText(value: string | null | undefined) {
  return value && value.trim().length ? value : "기록 없음";
}

export function memberStatusClasses(status: AdminMemberStatus) {
  return status === "ACTIVE"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
    : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300";
}

export function adminRoleClasses(isAdmin: boolean) {
  return isAdmin
    ? "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950/50 dark:text-teal-300"
    : "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-300";
}

export function recentStatusClasses(status: string) {
  switch (status) {
    case "OPEN":
    case "ACTIVE":
    case "PENDING":
    case "REVIEWING":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300";
    case "RESOLVED":
    case "ACTIONED":
    case "ARRIVED":
    case "ENDED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300";
    case "WITHDRAWN":
    case "REJECTED":
    case "CLOSED":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300";
    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-300";
  }
}

export function partyRoleClasses(role: AdminMemberRecentParty["role"]) {
  return role === "LEADER"
    ? "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950/50 dark:text-teal-300"
    : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300";
}

export function booleanBadge(value: boolean) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full",
        value
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
          : "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-300",
      )}
    >
      {value ? "ON" : "OFF"}
    </Badge>
  );
}
