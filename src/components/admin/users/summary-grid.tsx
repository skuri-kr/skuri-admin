"use client";

import { UserRoundCog } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { AdminMemberSummary, PageResponse } from "@/features/admin/types";

interface MembersSummaryGridProps {
  pageData: PageResponse<AdminMemberSummary> | null;
  members: AdminMemberSummary[];
}

function SummaryCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card className="rounded-3xl">
      <CardContent className="space-y-1 pt-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{label}</p>
          {icon}
        </div>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

export function MembersSummaryGrid({
  pageData,
  members,
}: MembersSummaryGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <SummaryCard
        label="전체 회원"
        value={pageData?.totalElements ?? 0}
        hint={`현재 페이지 ${(pageData?.page ?? 0) + 1} / ${pageData?.totalPages ?? 1}`}
      />
      <SummaryCard
        label="현재 페이지 관리자 수"
        value={members.filter((member) => member.isAdmin).length}
        hint={`탈퇴 회원 ${members.filter((member) => member.status === "WITHDRAWN").length}`}
      />
      <SummaryCard
        label="상세 조회 방식"
        value="목록에서 회원 선택"
        hint="행을 클릭하면 상세, 활동 요약, 관리자 권한, 계좌 정보, 알림 설정을 modal에서 확인합니다."
        icon={<UserRoundCog className="size-5 text-muted-foreground" />}
      />
    </div>
  );
}
