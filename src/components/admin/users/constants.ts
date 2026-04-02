export const statusOptions = ["ALL", "ACTIVE", "WITHDRAWN"] as const;
export const adminFilterOptions = ["ALL", "ADMIN", "MEMBER"] as const;
export const pageSizeOptions = ["20", "50", "100"] as const;

export type MemberListStatusOption = (typeof statusOptions)[number];
export type MemberAdminFilterOption = (typeof adminFilterOptions)[number];
export type MemberPageSizeOption = (typeof pageSizeOptions)[number];

export type MemberSortField =
  | "id"
  | "realname"
  | "email"
  | "nickname"
  | "department"
  | "studentId"
  | "joinedAt"
  | "lastLogin"
  | "lastLoginOs"
  | "currentAppVersion";

export type MemberSortDirection = "ASC" | "DESC";
