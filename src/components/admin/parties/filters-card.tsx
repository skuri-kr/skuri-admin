"use client";

import { FormField } from "@/components/admin/form-field";
import { SelectField } from "@/components/admin/users/select-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  pageSizeOptions,
  statusOptions,
  type PartyListStatusOption,
  type PartyPageSizeOption,
} from "@/components/admin/parties/constants";

interface PartiesFiltersCardProps {
  query: string;
  departureDate: string;
  selectedStatus: PartyListStatusOption;
  pageSize: PartyPageSizeOption;
  hasPrevious: boolean;
  hasNext: boolean;
  onQueryChange: (value: string) => void;
  onDepartureDateChange: (value: string) => void;
  onStatusChange: (value: PartyListStatusOption) => void;
  onPageSizeChange: (value: PartyPageSizeOption) => void;
  onResetFilters: () => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

export function PartiesFiltersCard({
  query,
  departureDate,
  selectedStatus,
  pageSize,
  hasPrevious,
  hasNext,
  onQueryChange,
  onDepartureDateChange,
  onStatusChange,
  onPageSizeChange,
  onResetFilters,
  onPreviousPage,
  onNextPage,
}: PartiesFiltersCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>택시 파티 필터</CardTitle>
        <CardDescription>
          query/status/departureDate 기준으로 관리자 목록을 조회합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          <FormField label="검색" htmlFor="party-query">
            <Input
              id="party-query"
              value={query}
              placeholder="출발지, 도착지, 리더 UID/닉네임"
              onChange={(event) => onQueryChange(event.target.value)}
            />
          </FormField>

          <SelectField
            label="상태"
            value={selectedStatus}
            options={statusOptions}
            onChange={(value) => onStatusChange(value as PartyListStatusOption)}
            getLabel={(status) => (status === "ALL" ? "전체" : status)}
          />

          <FormField label="출발일" htmlFor="departure-date">
            <Input
              id="departure-date"
              type="date"
              value={departureDate}
              onChange={(event) => onDepartureDateChange(event.target.value)}
            />
          </FormField>

          <SelectField
            label="page size"
            value={pageSize}
            options={pageSizeOptions}
            onChange={(value) => onPageSizeChange(value as PartyPageSizeOption)}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            기본 정렬은 <code>departureTime DESC</code>, tie-breaker는{" "}
            <code>createdAt DESC</code>입니다.
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
