"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminMemberSummary } from "@/features/admin/types";
import { formatDate, formatDateTime } from "@/lib/format/date";
import { formatOsLabel, formatText } from "@/components/admin/users/helpers";
import type {
  MemberSortDirection,
  MemberSortField,
} from "@/components/admin/users/constants";

interface MembersTableProps {
  members: AdminMemberSummary[];
  selectedMemberId: string | null;
  sortField: MemberSortField;
  sortDirection: MemberSortDirection;
  onSort: (field: MemberSortField) => void;
  onSelectMember: (memberId: string) => void;
}

function SortableHead({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <TableHead>
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 text-left font-medium"
      >
        {children}
      </button>
    </TableHead>
  );
}

export function MembersTable({
  members,
  selectedMemberId,
  sortField,
  sortDirection,
  onSort,
  onSelectMember,
}: MembersTableProps) {
  const renderSortIndicator = (field: MemberSortField) => {
    if (sortField !== field) {
      return null;
    }

    return sortDirection === "ASC" ? (
      <ArrowUp className="size-3.5" />
    ) : (
      <ArrowDown className="size-3.5" />
    );
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHead onClick={() => onSort("id")}>
            UID
            {renderSortIndicator("id")}
          </SortableHead>
          <SortableHead onClick={() => onSort("realname")}>
            이름
            {renderSortIndicator("realname")}
          </SortableHead>
          <SortableHead onClick={() => onSort("email")}>
            이메일
            {renderSortIndicator("email")}
          </SortableHead>
          <SortableHead onClick={() => onSort("nickname")}>
            닉네임
            {renderSortIndicator("nickname")}
          </SortableHead>
          <SortableHead onClick={() => onSort("department")}>
            학과
            {renderSortIndicator("department")}
          </SortableHead>
          <SortableHead onClick={() => onSort("studentId")}>
            학번
            {renderSortIndicator("studentId")}
          </SortableHead>
          <SortableHead onClick={() => onSort("joinedAt")}>
            가입일
            {renderSortIndicator("joinedAt")}
          </SortableHead>
          <SortableHead onClick={() => onSort("lastLogin")}>
            최근로그인
            {renderSortIndicator("lastLogin")}
          </SortableHead>
          <SortableHead onClick={() => onSort("lastLoginOs")}>
            OS
            {renderSortIndicator("lastLoginOs")}
          </SortableHead>
          <SortableHead onClick={() => onSort("currentAppVersion")}>
            앱버전
            {renderSortIndicator("currentAppVersion")}
          </SortableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => {
          const active = member.id === selectedMemberId;
          const osLabel = formatOsLabel(member.lastLoginOs);

          return (
            <TableRow
              key={member.id}
              data-state={active ? "selected" : undefined}
              className="cursor-pointer"
              onClick={() => onSelectMember(member.id)}
            >
              <TableCell className="max-w-[180px] whitespace-normal break-all font-mono text-xs">
                {member.id}
              </TableCell>
              <TableCell>{formatText(member.realname)}</TableCell>
              <TableCell className="max-w-[240px] whitespace-normal break-all text-sm">
                {member.email}
              </TableCell>
              <TableCell>{formatText(member.nickname)}</TableCell>
              <TableCell>{formatText(member.department)}</TableCell>
              <TableCell>{formatText(member.studentId)}</TableCell>
              <TableCell>{formatDate(member.joinedAt)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDateTime(member.lastLogin)}
              </TableCell>
              <TableCell>
                {osLabel ? (
                  <Badge
                    variant="outline"
                    className={
                      member.lastLoginOs?.toLowerCase() === "ios"
                        ? "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
                    }
                  >
                    {osLabel}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>{formatText(member.currentAppVersion)}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
