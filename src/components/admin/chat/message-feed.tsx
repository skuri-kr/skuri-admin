"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { ChatMessage } from "@/features/admin/types";
import { formatDateTime } from "@/lib/format/date";
import {
  formatChatText,
  messageTypeBadgeClass,
  renderChatMessageContent,
} from "@/components/admin/chat/helpers";

interface ChatMessageFeedProps {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  emptyLabel: string;
  loadingLabel: string;
  hasNext: boolean;
  loadingMore: boolean;
  onLoadMore: () => void | Promise<void>;
}

export function ChatMessageFeed({
  messages,
  loading,
  error,
  emptyLabel,
  loadingLabel,
  hasNext,
  loadingMore,
  onLoadMore,
}: ChatMessageFeedProps) {
  if (loading) {
    return <p className="text-sm text-muted-foreground">{loadingLabel}</p>;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>메시지 조회 실패</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {messages.length ? (
          messages.map((message) => (
            <div key={message.id} className="space-y-3 rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{formatChatText(message.senderName)}</p>
                    <Badge
                      variant="outline"
                      className={messageTypeBadgeClass(message.type)}
                    >
                      {message.type}
                    </Badge>
                  </div>
                  <p className="break-all text-xs text-muted-foreground">
                    senderId: {message.senderId}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(message.createdAt)}
                </p>
              </div>
              {renderChatMessageContent(message)}
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        )}
      </div>

      {hasNext ? (
        <Button variant="outline" disabled={loadingMore} onClick={() => void onLoadMore()}>
          {loadingMore ? "불러오는 중..." : "이전 메시지 더 불러오기"}
        </Button>
      ) : null}
    </div>
  );
}
