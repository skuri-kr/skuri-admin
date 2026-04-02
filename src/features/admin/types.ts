export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export type AdminMemberStatus = "ACTIVE" | "WITHDRAWN";

export interface AdminMemberSummary {
  id: string;
  email: string;
  nickname: string | null;
  realname: string | null;
  studentId: string | null;
  department: string | null;
  isAdmin: boolean;
  joinedAt: string;
  lastLogin: string | null;
  lastLoginOs: string | null;
  currentAppVersion: string | null;
  status: AdminMemberStatus;
}

export interface AdminMemberBankAccount {
  bankName: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
  hideName: boolean | null;
}

export interface AdminMemberNotificationSetting {
  allNotifications: boolean;
  partyNotifications: boolean;
  noticeNotifications: boolean;
  boardLikeNotifications: boolean;
  commentNotifications: boolean;
  bookmarkedPostCommentNotifications: boolean;
  systemNotifications: boolean;
  academicScheduleNotifications: boolean;
  academicScheduleDayBeforeEnabled: boolean;
  academicScheduleAllEventsEnabled: boolean;
  noticeNotificationsDetail: Record<string, boolean>;
}

export interface AdminMemberDetail extends AdminMemberSummary {
  photoUrl: string | null;
  withdrawnAt: string | null;
  bankAccount: AdminMemberBankAccount | null;
  notificationSetting: AdminMemberNotificationSetting;
}

export type AdminMemberPartyRole = "LEADER" | "JOINED";

export interface AdminMemberActivityCounts {
  posts: number;
  comments: number;
  partiesCreated: number;
  partiesJoined: number;
  inquiries: number;
  reportsSubmitted: number;
}

export interface AdminMemberRecentPost {
  id: string;
  title: string;
  category: string;
  createdAt: string;
}

export interface AdminMemberRecentComment {
  id: string;
  postId: string;
  postTitle: string;
  contentPreview: string;
  createdAt: string;
}

export interface AdminMemberRecentParty {
  id: string;
  role: AdminMemberPartyRole;
  status: string;
  routeSummary: string;
  departureTime: string;
  createdAt: string;
}

export interface AdminMemberRecentInquiry {
  id: string;
  type: string;
  subject: string;
  status: string;
  createdAt: string;
}

export interface AdminMemberRecentReport {
  id: string;
  targetType: string;
  targetId: string;
  category: string;
  status: string;
  createdAt: string;
}

export interface AdminMemberActivity {
  memberId: string;
  generatedAt: string;
  counts: AdminMemberActivityCounts;
  recentPosts: AdminMemberRecentPost[];
  recentComments: AdminMemberRecentComment[];
  recentParties: AdminMemberRecentParty[];
  recentInquiries: AdminMemberRecentInquiry[];
  recentReports: AdminMemberRecentReport[];
}

export type AdminPartyStatus = "OPEN" | "CLOSED" | "ARRIVED" | "ENDED";
export type AdminPartyStatusAction = "CLOSE" | "REOPEN" | "CANCEL" | "END";
export type AdminPartyEndReason =
  | "ARRIVED"
  | "FORCE_ENDED"
  | "CANCELLED"
  | "TIMEOUT"
  | "WITHDRAWED";

export interface AdminPartySummary {
  id: string;
  status: AdminPartyStatus;
  leaderId: string;
  leaderNickname: string | null;
  routeSummary: string;
  departureTime: string;
  currentMembers: number;
  maxMembers: number;
  createdAt: string;
}

export interface AdminPartyPersonSummary {
  id: string;
  nickname: string | null;
  photoUrl: string | null;
}

export interface AdminPartyMemberSummary extends AdminPartyPersonSummary {
  isLeader: boolean;
  joinedAt: string;
}

export interface AdminPartyJoinRequest {
  requestId: string;
  memberId: string;
  nickname: string | null;
  realname: string | null;
  photoUrl: string | null;
  department: string | null;
  studentId: string | null;
  requestedAt: string;
}

export interface AdminPartyLocation {
  name: string;
  lat: number;
  lng: number;
}

export interface AdminPartySettlementAccount {
  bankName: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
  hideName: boolean | null;
}

export interface AdminPartyMemberSettlement {
  memberId: string;
  displayName: string;
  settled: boolean;
  settledAt: string | null;
  leftParty: boolean;
  leftAt: string | null;
}

export interface AdminPartySettlement {
  status: string;
  taxiFare: number | null;
  splitMemberCount: number | null;
  perPersonAmount: number | null;
  settlementTargetMemberIds: string[];
  account: AdminPartySettlementAccount | null;
  memberSettlements: AdminPartyMemberSettlement[];
}

export interface AdminPartyDetail extends AdminPartySummary {
  endReason: AdminPartyEndReason | null;
  leader: AdminPartyPersonSummary;
  departure: AdminPartyLocation;
  destination: AdminPartyLocation;
  members: AdminPartyMemberSummary[];
  tags: string[];
  detail: string | null;
  pendingJoinRequestCount: number;
  settlementStatus: string | null;
  settlement: AdminPartySettlement | null;
  chatRoomId: string | null;
  updatedAt: string;
  endedAt: string | null;
}

export interface AdminPartyStatusUpdateResponse {
  id: string;
  status: AdminPartyStatus;
  endReason?: AdminPartyEndReason | null;
}

export interface AdminPartySystemMessageResponse {
  id: string;
  chatRoomId: string;
  senderId: string;
  senderName: string;
  senderPhotoUrl: string | null;
  type: string;
  text: string | null;
  createdAt: string;
}

export type ChatRoomType = "UNIVERSITY" | "DEPARTMENT" | "GAME" | "CUSTOM" | "PARTY";
export type ChatMessageType = "TEXT" | "IMAGE" | "SYSTEM" | "ACCOUNT" | "ARRIVED" | "END";

export interface ChatRoomLastMessage {
  type: ChatMessageType | string;
  text: string | null;
  senderName: string | null;
  createdAt: string | null;
}

export interface ChatRoomSummary {
  id: string;
  type: ChatRoomType;
  name: string;
  description: string | null;
  isPublic: boolean;
  memberCount: number;
  joined: boolean;
  unreadCount: number;
  lastMessage: ChatRoomLastMessage | null;
  lastMessageAt: string | null;
  isMuted: boolean;
}

export interface ChatRoomDetail extends ChatRoomSummary {
  lastReadAt: string | null;
}

export interface ChatAccountData {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  hideName: boolean | null;
}

export interface ChatArrivalData {
  taxiFare: number | null;
  splitMemberCount: number | null;
  perPersonAmount: number | null;
  settlementTargetMemberIds: string[] | null;
  memberSettlements: unknown[] | null;
  accountData: ChatAccountData | null;
}

export interface ChatMessage {
  id: string;
  chatRoomId: string;
  senderId: string;
  senderName: string;
  senderPhotoUrl: string | null;
  type: ChatMessageType;
  text: string | null;
  imageUrl: string | null;
  accountData: ChatAccountData | null;
  arrivalData: ChatArrivalData | null;
  createdAt: string;
}

export interface ChatMessageCursor {
  createdAt: string;
  id: string;
}

export interface ChatMessagePage {
  messages: ChatMessage[];
  hasNext: boolean;
  nextCursor: ChatMessageCursor | null;
}

export interface AdminCreateChatRoomResponse {
  id: string;
  name: string;
  type: ChatRoomType;
}

export interface InquiryAttachment {
  url: string;
  thumbUrl: string | null;
  width: number | null;
  height: number | null;
  size: number | null;
  mime: string | null;
}

export interface AdminInquiry {
  id: string;
  memberId: string;
  type: string;
  subject: string;
  content: string;
  status: "PENDING" | "IN_PROGRESS" | "RESOLVED";
  attachments: InquiryAttachment[];
  memo: string | null;
  userEmail: string | null;
  userName: string | null;
  userRealname: string | null;
  userStudentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotice {
  id: string;
  title: string;
  content: string;
  category: "UPDATE" | "MAINTENANCE" | "EVENT" | "GENERAL";
  priority: "HIGH" | "NORMAL" | "LOW";
  imageUrls: string[];
  actionUrl: string | null;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppNoticeUnreadCount {
  count: number;
}

export type AppPlatform = "ios" | "android";

export interface AppVersion {
  platform: AppPlatform;
  minimumVersion: string;
  forceUpdate: boolean;
  message: string | null;
  title: string | null;
  showButton: boolean;
  buttonText: string | null;
  buttonUrl: string | null;
}

export interface AppVersionAdminUpdateResponse {
  platform: AppPlatform;
  minimumVersion: string;
  forceUpdate: boolean;
  updatedAt: string;
}

export interface AppNoticeCreateResponse {
  id: string;
  title: string;
  createdAt: string;
}

export interface NoticeListItem {
  id: string;
  title: string;
  rssPreview: string | null;
  category: string;
  department: string | null;
  author: string | null;
  postedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  bookmarkCount: number;
  isRead: boolean;
  isLiked: boolean;
  isBookmarked: boolean;
  isCommentedByMe: boolean;
  thumbnailUrl: string | null;
}

export interface NoticeSyncResult {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  syncedAt: string;
}

export interface AdminDashboardSummary {
  newMembersToday: number;
  totalMembers: number;
  adminCount: number;
  openPartyCount: number;
  pendingInquiryCount: number;
  pendingReportCount: number;
  generatedAt: string;
}

export interface AdminDashboardActivityPoint {
  date: string;
  newMembers: number;
  inquiriesCreated: number;
  reportsCreated: number;
  partiesCreated: number;
}

export interface AdminDashboardActivity {
  days: 7 | 30;
  timezone: string;
  series: AdminDashboardActivityPoint[];
}

export type AdminDashboardRecentItemType =
  | "INQUIRY"
  | "REPORT"
  | "APP_NOTICE"
  | "PARTY";

export interface AdminDashboardRecentItem {
  type: AdminDashboardRecentItemType;
  id: string;
  title: string;
  subtitle: string;
  status: string;
  createdAt: string;
}

export type BoardModerationStatus = "VISIBLE" | "HIDDEN" | "DELETED";

export interface AdminBoardPostSummary {
  id: string;
  category: "GENERAL" | "QUESTION" | "REVIEW" | "ANNOUNCEMENT" | string;
  title: string;
  authorId: string;
  authorNickname: string | null;
  authorRealname: string | null;
  isAnonymous: boolean;
  commentCount: number;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
  moderationStatus: BoardModerationStatus;
  thumbnailUrl: string | null;
}

export interface BoardImage {
  url: string;
  thumbUrl: string | null;
  width: number | null;
  height: number | null;
  size: number | null;
  mime: string | null;
}

export interface AdminBoardPostDetail extends AdminBoardPostSummary {
  content: string;
  viewCount: number;
  bookmarkCount: number;
  images: BoardImage[];
}

export interface AdminBoardCommentSummary {
  id: string;
  postId: string;
  postTitle: string;
  authorId: string;
  authorNickname: string | null;
  authorRealname: string | null;
  contentPreview: string;
  parentCommentId: string | null;
  createdAt: string;
  moderationStatus: BoardModerationStatus;
}

export interface BoardModerationResponse {
  id: string;
  moderationStatus: BoardModerationStatus;
}

export interface CampusBanner {
  id: string;
  badgeLabel: string;
  titleLabel: string;
  descriptionLabel: string;
  buttonLabel: string;
  paletteKey: string;
  imageUrl: string | null;
  actionType: string;
  actionTarget: string | null;
  actionParams: Record<string, unknown> | null;
  actionUrl: string | null;
  isActive: boolean;
  displayStartAt: string | null;
  displayEndAt: string | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CampusBannerOrderResponse {
  id: string;
  displayOrder: number;
}

export type LegalDocumentKey = "termsOfUse" | "privacyPolicy";
export type LegalDocumentBannerIconKey = "document" | "shield";
export type LegalDocumentBannerTone = "green" | "blue";
export type LegalDocumentBannerLineTone = "primary" | "secondary";

export interface LegalDocumentBannerLine {
  text: string;
  tone: LegalDocumentBannerLineTone;
}

export interface LegalDocumentBanner {
  iconKey: LegalDocumentBannerIconKey;
  lines: LegalDocumentBannerLine[];
  title: string;
  tone: LegalDocumentBannerTone;
}

export interface LegalDocumentSection {
  id: string;
  paragraphs: string[];
  title: string;
}

export interface LegalDocumentAdminSummary {
  id: LegalDocumentKey;
  title: string;
  isActive: boolean;
  updatedAt: string;
}

export interface LegalDocumentAdminResponse {
  id: LegalDocumentKey;
  title: string;
  banner: LegalDocumentBanner;
  sections: LegalDocumentSection[];
  footerLines: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LegalDocumentDeleteResponse {
  id: LegalDocumentKey;
}

export interface CafeteriaMenu {
  weekId: string;
  weekStart: string;
  weekEnd: string;
  menus: Record<string, Record<string, string[]>>;
  menuEntries?: Record<
    string,
    Record<
      string,
      Array<{
        title: string;
        badges: Array<{
          code: string;
          label: string;
        }>;
      }>
    >
  >;
}

export type AcademicScheduleType = "SINGLE" | "MULTI";

export interface AcademicSchedule {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  type: AcademicScheduleType;
  isPrimary: boolean;
  description: string | null;
}

export interface AcademicScheduleBulkSyncResponse {
  scopeStartDate: string;
  scopeEndDate: string;
  created: number;
  updated: number;
  deleted: number;
}

export interface AdminBulkCoursesResponse {
  semester: string;
  created: number;
  updated: number;
  deleted: number;
}

export type AdminReportStatus =
  | "PENDING"
  | "REVIEWING"
  | "ACTIONED"
  | "REJECTED";

export type AdminReportTargetType =
  | "POST"
  | "COMMENT"
  | "MEMBER"
  | "CHAT_MESSAGE"
  | "CHAT_ROOM"
  | "TAXI_PARTY";

export interface AdminReport {
  id: string;
  reporterId: string;
  targetType: AdminReportTargetType;
  targetId: string;
  targetAuthorId: string | null;
  category: string;
  reason: string;
  status: AdminReportStatus;
  action: string | null;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}
