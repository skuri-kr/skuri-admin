export const pageSizeOptions = ["20", "50", "100"] as const;
export const categoryOptions = [
  "ALL",
  "GENERAL",
  "QUESTION",
  "REVIEW",
  "ANNOUNCEMENT",
] as const;
export const moderationStatusOptions = ["ALL", "VISIBLE", "HIDDEN", "DELETED"] as const;

export type BoardPageSizeOption = (typeof pageSizeOptions)[number];
export type BoardCategoryOption = (typeof categoryOptions)[number];
export type BoardModerationFilterOption = (typeof moderationStatusOptions)[number];
