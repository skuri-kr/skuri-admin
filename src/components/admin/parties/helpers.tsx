import { Badge } from "@/components/ui/badge";
import type {
  AdminPartyMemberSettlement,
  AdminPartyStatus,
  AdminPartyStatusAction,
} from "@/features/admin/types";
import { formatDateTime } from "@/lib/format/date";

export function formatText(value: string | null | undefined) {
  return value && value.trim().length ? value : "-";
}

export function partyStatusClasses(status: AdminPartyStatus) {
  switch (status) {
    case "OPEN":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300";
    case "CLOSED":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300";
    case "ARRIVED":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300";
    case "ENDED":
      return "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-300";
  }
}

export function settlementStatusClasses(status: string | null | undefined) {
  switch ((status ?? "").toUpperCase()) {
    case "PENDING":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300";
    case "COMPLETED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300";
    case "FAILED":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300";
    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-300";
  }
}

export function actionLabel(action: AdminPartyStatusAction) {
  switch (action) {
    case "CLOSE":
      return "모집 마감";
    case "REOPEN":
      return "모집 재개";
    case "CANCEL":
      return "파티 취소";
    case "END":
      return "강제 종료";
  }
}

export function allowedActions(status: AdminPartyStatus): AdminPartyStatusAction[] {
  switch (status) {
    case "OPEN":
      return ["CLOSE", "CANCEL"];
    case "CLOSED":
      return ["REOPEN", "CANCEL"];
    case "ARRIVED":
      return ["END"];
    case "ENDED":
      return [];
  }
}

export function canRemoveMember(status: AdminPartyStatus, isLeader: boolean) {
  if (isLeader) {
    return false;
  }

  return status !== "ARRIVED" && status !== "ENDED";
}

export function renderSettlementMember(item: AdminPartyMemberSettlement) {
  return (
    <div
      key={item.memberId}
      className="space-y-2 rounded-2xl border border-border/70 p-3"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium">{item.displayName}</p>
        <Badge
          variant="outline"
          className={
            item.settled
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
              : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300"
          }
        >
          {item.settled ? "정산 완료" : "정산 대기"}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">memberId: {item.memberId}</p>
      <div className="flex flex-wrap items-start justify-between gap-2 text-sm text-muted-foreground">
        <p>settledAt: {formatDateTime(item.settledAt)}</p>
        <p>leftParty: {item.leftParty ? "true" : "false"}</p>
      </div>
    </div>
  );
}
