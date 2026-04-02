"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { AdminPartySummary } from "@/features/admin/types";
import { formatDateTime } from "@/lib/format/date";
import { formatText, partyStatusClasses } from "@/components/admin/parties/helpers";

interface PartiesTableProps {
  parties: AdminPartySummary[];
  selectedPartyId: string | null;
  onSelectParty: (partyId: string) => void;
}

export function PartiesTable({
  parties,
  selectedPartyId,
  onSelectParty,
}: PartiesTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/70">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>상태</TableHead>
            <TableHead>리더</TableHead>
            <TableHead>경로</TableHead>
            <TableHead>출발</TableHead>
            <TableHead>인원</TableHead>
            <TableHead>생성일</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {parties.length ? (
            parties.map((party) => {
              const active = party.id === selectedPartyId;
              return (
                <TableRow
                  key={party.id}
                  className={cn(
                    "cursor-pointer",
                    active && "bg-muted/60 hover:bg-muted/60",
                  )}
                  onClick={() => onSelectParty(party.id)}
                >
                  <TableCell>
                    <Badge variant="outline" className={partyStatusClasses(party.status)}>
                      {party.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium">{formatText(party.leaderNickname)}</p>
                      <p className="text-xs text-muted-foreground">{party.leaderId}</p>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-72">
                    <div className="space-y-1">
                      <p>{party.routeSummary}</p>
                      <p className="text-xs text-muted-foreground">{party.id}</p>
                    </div>
                  </TableCell>
                  <TableCell>{formatDateTime(party.departureTime)}</TableCell>
                  <TableCell>
                    {party.currentMembers} / {party.maxMembers}
                  </TableCell>
                  <TableCell>{formatDateTime(party.createdAt)}</TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell
                colSpan={6}
                className="py-12 text-center text-sm text-muted-foreground"
              >
                현재 조건에 맞는 택시 파티가 없습니다.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
