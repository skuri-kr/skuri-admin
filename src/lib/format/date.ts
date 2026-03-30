export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

export function toDateTimeLocalInputValue(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.replace("Z", "").slice(0, 16);
}

export function fromDateTimeLocalInputValue(value: string) {
  if (!value.trim()) {
    return null;
  }

  return value.length === 16 ? `${value}:00` : value;
}
