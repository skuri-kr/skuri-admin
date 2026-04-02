"use client";

import { MetricCard } from "@/components/admin/metric-card";
import type { AdminPartyStatus, AdminPartySummary, PageResponse } from "@/features/admin/types";

interface PartiesSummaryGridProps {
  pageData: PageResponse<AdminPartySummary> | null;
  currentPageStatusCounts: Record<AdminPartyStatus, number>;
}

export function PartiesSummaryGrid({
  pageData,
  currentPageStatusCounts,
}: PartiesSummaryGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <MetricCard
        label="전체 파티"
        value={pageData?.totalElements ?? 0}
        description={`현재 페이지 ${(pageData?.page ?? 0) + 1} / ${pageData?.totalPages ?? 1}`}
      />
      <MetricCard
        label="현재 페이지 상태 분포"
        value={`OPEN ${currentPageStatusCounts.OPEN}`}
        description={`CLOSED ${currentPageStatusCounts.CLOSED} · ARRIVED ${currentPageStatusCounts.ARRIVED} · ENDED ${currentPageStatusCounts.ENDED}`}
      />
      <MetricCard
        label="운영 제약"
        value="상태 머신 재사용"
        description="OPEN→CLOSE, CLOSED→REOPEN, OPEN/CLOSED→CANCEL, ARRIVED→END만 허용합니다."
      />
    </div>
  );
}
