"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import type { ChatMessage, ChatMessageType, ChatRoomLastMessage, ChatRoomType } from "@/features/admin/types";

export function formatChatText(value: string | null | undefined) {
  return value && value.trim().length ? value : "-";
}

export function roomTypeBadgeClass(type: ChatRoomType) {
  switch (type) {
    case "UNIVERSITY":
      return "border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300";
    case "DEPARTMENT":
      return "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300";
    case "GAME":
      return "border border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/50 dark:text-orange-300";
    case "CUSTOM":
      return "border border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300";
    case "PARTY":
      return "border border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-900 dark:bg-pink-950/50 dark:text-pink-300";
  }
}

export function messageTypeBadgeClass(type: ChatMessageType) {
  switch (type) {
    case "TEXT":
      return "border border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-300";
    case "IMAGE":
      return "border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300";
    case "SYSTEM":
      return "border border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300";
    case "ACCOUNT":
      return "border border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/50 dark:text-orange-300";
    case "ARRIVED":
      return "border border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950/50 dark:text-teal-300";
    case "END":
      return "border border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300";
  }
}

export function formatLastMessagePreview(lastMessage: ChatRoomLastMessage | null) {
  if (!lastMessage) {
    return "메시지 없음";
  }

  switch (lastMessage.type) {
    case "IMAGE":
      return "이미지";
    case "ACCOUNT":
      return "계좌 정보";
    case "ARRIVED":
      return "도착/정산";
    case "END":
      return lastMessage.text ?? "파티 종료";
    case "SYSTEM":
    case "TEXT":
    default:
      return lastMessage.text ?? "메시지 없음";
  }
}

export function renderChatMessageContent(message: ChatMessage) {
  switch (message.type) {
    case "IMAGE":
      return message.imageUrl ? (
        <div className="overflow-hidden rounded-lg border bg-muted/30">
          <Image
            src={message.imageUrl}
            alt="채팅 이미지"
            width={1120}
            height={720}
            className="max-h-[280px] w-full object-contain"
            unoptimized
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">이미지 URL 없음</p>
      );
    case "ACCOUNT":
      return message.accountData ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">은행명</p>
            <p className="text-sm">{formatChatText(message.accountData.bankName)}</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">계좌번호</p>
            <p className="break-all text-sm">
              {formatChatText(message.accountData.accountNumber)}
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">예금주</p>
            <p className="text-sm">{formatChatText(message.accountData.accountHolder)}</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">이름 숨김</p>
            <Badge
              variant="outline"
              className={
                message.accountData.hideName
                  ? "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/50 dark:text-orange-300"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
              }
            >
              {message.accountData.hideName ? "ON" : "OFF"}
            </Badge>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">계좌 정보 없음</p>
      );
    case "ARRIVED":
      return message.arrivalData ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">택시비</p>
            <p className="text-sm">{message.arrivalData.taxiFare ?? "-"}</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">정산 인원</p>
            <p className="text-sm">{message.arrivalData.splitMemberCount ?? "-"}</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">1인당 금액</p>
            <p className="text-sm">{message.arrivalData.perPersonAmount ?? "-"}</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">정산 대상 멤버 수</p>
            <p className="text-sm">
              {message.arrivalData.settlementTargetMemberIds?.length ?? 0}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">도착 정보 없음</p>
      );
    case "TEXT":
    case "SYSTEM":
    case "END":
    default:
      return (
        <p className="whitespace-pre-wrap text-sm">
          {formatChatText(message.text)}
        </p>
      );
  }
}
