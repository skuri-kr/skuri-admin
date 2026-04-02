export const statusOptions = ["ALL", "OPEN", "CLOSED", "ARRIVED", "ENDED"] as const;
export const pageSizeOptions = ["20", "50", "100"] as const;

export type PartyListStatusOption = (typeof statusOptions)[number];
export type PartyPageSizeOption = (typeof pageSizeOptions)[number];
