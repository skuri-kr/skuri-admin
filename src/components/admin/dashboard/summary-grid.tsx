"use client";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import type { AdminDashboardSummary } from "@/features/admin/types";

interface DashboardSummaryGridProps {
  summary: AdminDashboardSummary | null;
}

export function DashboardSummaryGrid({
  summary,
}: DashboardSummaryGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <SummaryCard
        label="오늘 신규 가입"
        value={summary?.newMembersToday}
        hint="Asia/Seoul 오늘 00:00부터 집계"
      />
      <SummaryCard
        label="전체 회원 수"
        value={summary?.totalMembers}
        hint="WITHDRAWN tombstone 포함"
      />
      <SummaryCard
        label="관리자 수"
        value={summary?.adminCount}
        hint="isAdmin=true 기준"
      />
      <SummaryCard
        label="OPEN 파티"
        value={summary?.openPartyCount}
        hint="현재 모집 중인 파티 수"
      />
      <SummaryCard
        label="PENDING 문의"
        value={summary?.pendingInquiryCount}
        hint="아직 처리 전인 문의"
      />
      <SummaryCard
        label="PENDING 신고"
        value={summary?.pendingReportCount}
        hint="아직 처리 전인 신고"
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | null | undefined;
  hint: string;
}) {
  return (
    <Card className="rounded-3xl">
      <CardContent className="space-y-1 pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-3xl font-semibold tracking-tight">{value ?? "-"}</p>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
