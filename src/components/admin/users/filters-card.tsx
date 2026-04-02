"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/admin/form-field";
import { SelectField } from "@/components/admin/users/select-field";
import {
  adminFilterOptions,
  pageSizeOptions,
  statusOptions,
  type MemberAdminFilterOption,
  type MemberListStatusOption,
  type MemberPageSizeOption,
} from "@/components/admin/users/constants";

interface MembersFiltersCardProps {
  query: string;
  department: string;
  selectedStatus: MemberListStatusOption;
  selectedAdminFilter: MemberAdminFilterOption;
  pageSize: MemberPageSizeOption;
  hasPrevious: boolean;
  hasNext: boolean;
  onQueryChange: (value: string) => void;
  onDepartmentChange: (value: string) => void;
  onStatusChange: (value: MemberListStatusOption) => void;
  onAdminFilterChange: (value: MemberAdminFilterOption) => void;
  onPageSizeChange: (value: MemberPageSizeOption) => void;
  onResetFilters: () => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

export function MembersFiltersCard({
  query,
  department,
  selectedStatus,
  selectedAdminFilter,
  pageSize,
  hasPrevious,
  hasNext,
  onQueryChange,
  onDepartmentChange,
  onStatusChange,
  onAdminFilterChange,
  onPageSizeChange,
  onResetFilters,
  onPreviousPage,
  onNextPage,
}: MembersFiltersCardProps) {
  return (
    <Card className="rounded-3xl">
      <CardContent className="space-y-4 pt-6">
        <div className="grid gap-4 md:grid-cols-5">
          <FormField label="검색" htmlFor="member-query" className="md:col-span-1">
            <Input
              id="member-query"
              value={query}
              placeholder="이메일, 닉네임, 실명, 학번"
              onChange={(event) => onQueryChange(event.target.value)}
            />
          </FormField>

          <FormField
            label="학과"
            htmlFor="member-department"
            className="md:col-span-1"
          >
            <Input
              id="member-department"
              value={department}
              placeholder="예: 컴퓨터공학과"
              onChange={(event) => onDepartmentChange(event.target.value)}
            />
          </FormField>

          <SelectField
            label="상태"
            value={selectedStatus}
            options={statusOptions}
            onChange={(value) => onStatusChange(value as MemberListStatusOption)}
            getLabel={(status) => (status === "ALL" ? "전체" : status)}
          />

          <SelectField
            label="권한"
            value={selectedAdminFilter}
            options={adminFilterOptions}
            onChange={(value) =>
              onAdminFilterChange(value as MemberAdminFilterOption)
            }
            getLabel={(adminFilter) =>
              adminFilter === "ALL"
                ? "전체"
                : adminFilter === "ADMIN"
                  ? "관리자"
                  : "일반 회원"
            }
          />

          <SelectField
            label="page size"
            value={pageSize}
            options={pageSizeOptions}
            onChange={(value) => onPageSizeChange(value as MemberPageSizeOption)}
            widthClassName="md:max-w-[120px]"
          />
        </div>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            학과 필터는 canonical 학과명을 기준으로 검증됩니다. 표 헤더를 클릭하면
            서버 정렬이 적용됩니다.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onResetFilters}>
              필터 초기화
            </Button>
            <Button variant="outline" disabled={!hasPrevious} onClick={onPreviousPage}>
              이전
            </Button>
            <Button variant="outline" disabled={!hasNext} onClick={onNextPage}>
              다음
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
