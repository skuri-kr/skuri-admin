export type ModuleStatus = "ready" | "partial" | "placeholder";

export interface AdminModule {
  key: string;
  path: string;
  title: string;
  navigationLabel: string;
  section: string;
  status: ModuleStatus;
  summary: string;
  availableApis: string[];
  gapApis: string[];
}

export const adminModules: AdminModule[] = [
  {
    key: "dashboard",
    path: "/dashboard",
    title: "대시보드",
    navigationLabel: "대시보드",
    section: "개요",
    status: "ready",
    summary:
      "KPI 요약, 최근 7일/30일 활동 추이, 최근 운영 항목 피드를 dashboard read-model API로 연결했습니다.",
    availableApis: [
      "GET /v1/admin/dashboard/summary",
      "GET /v1/admin/dashboard/activity",
      "GET /v1/admin/dashboard/recent-items",
    ],
    gapApis: [],
  },
  {
    key: "users",
    path: "/users",
    title: "사용자 관리",
    navigationLabel: "사용자 관리",
    section: "개요",
    status: "partial",
    summary:
      "회원 목록/검색/필터, 상세 조회, 활동 요약, 관리자 권한 변경은 연결됐고 상태 변경만 follow-up입니다.",
    availableApis: [
      "GET /v1/admin/members",
      "GET /v1/admin/members/{memberId}",
      "GET /v1/admin/members/{memberId}/activity",
      "PATCH /v1/admin/members/{memberId}/admin-role",
    ],
    gapApis: ["PATCH /v1/admin/members/{memberId}/status"],
  },
  {
    key: "parties",
    path: "/parties",
    title: "택시 파티 관리",
    navigationLabel: "택시 파티",
    section: "개요",
    status: "partial",
    summary:
      "관리자 목록/상세/상태 변경과 일반 멤버 강퇴, 시스템 메시지, pending join request, 파티 채팅 이력 조회까지 연결됐습니다.",
    availableApis: [
      "GET /v1/admin/parties",
      "GET /v1/admin/parties/{partyId}",
      "GET /v1/admin/parties/{partyId}/messages",
      "PATCH /v1/admin/parties/{partyId}/status",
      "DELETE /v1/admin/parties/{partyId}/members/{memberId}",
      "POST /v1/admin/parties/{partyId}/messages/system",
      "GET /v1/admin/parties/{partyId}/join-requests",
    ],
    gapApis: [
      "PATCH /v1/admin/join-requests/{requestId}/approve-or-decline",
      "PATCH /v1/admin/parties/{partyId}/leader",
      "POST /v1/admin/parties/{partyId}/messages/system/{messageId}/pin",
    ],
  },
  {
    key: "chatRooms",
    path: "/chat-rooms",
    title: "공개 채팅방 관리",
    navigationLabel: "공개 채팅방",
    section: "커뮤니티",
    status: "partial",
    summary:
      "관리자 전용 목록/상세/메시지 조회와 관리자 생성/삭제를 운영할 수 있고, 멤버 관리와 운영 액션은 아직 부족합니다.",
    availableApis: [
      "GET /v1/admin/chat-rooms",
      "GET /v1/admin/chat-rooms/{chatRoomId}",
      "GET /v1/admin/chat-rooms/{chatRoomId}/messages",
      "POST /v1/admin/chat-rooms",
      "DELETE /v1/admin/chat-rooms/{chatRoomId}",
    ],
    gapApis: [
      "GET /v1/admin/chat-rooms/{chatRoomId}/members",
      "DELETE /v1/admin/chat-rooms/{chatRoomId}/members/{memberId}",
    ],
  },
  {
    key: "boards",
    path: "/boards",
    title: "게시물 관리",
    navigationLabel: "게시물 관리",
    section: "커뮤니티",
    status: "partial",
    summary:
      "게시글/댓글 목록 조회와 게시글 상세, 게시글·댓글 moderation까지 연결됐고 신고 연계 뷰와 pin 정책은 follow-up입니다.",
    availableApis: [
      "GET /v1/admin/posts",
      "GET /v1/admin/posts/{postId}",
      "PATCH /v1/admin/posts/{postId}/moderation",
      "GET /v1/admin/comments",
      "PATCH /v1/admin/comments/{commentId}/moderation",
    ],
    gapApis: [
      "GET /v1/admin/posts/{postId}/reports",
      "PATCH /v1/admin/posts/{postId}/pin",
    ],
  },
  {
    key: "notices",
    path: "/notices",
    title: "학교 공지",
    navigationLabel: "학교 공지",
    section: "콘텐츠",
    status: "ready",
    summary: "공지 목록/상세 조회와 공지 동기화 실행을 구현할 수 있습니다.",
    availableApis: [
      "GET /v1/notices",
      "GET /v1/notices/{noticeId}",
      "POST /v1/admin/notices/sync",
    ],
    gapApis: ["GET /v1/admin/notices/sync-history"],
  },
  {
    key: "appNotices",
    path: "/app-notices",
    title: "앱 공지 관리",
    navigationLabel: "앱 공지",
    section: "콘텐츠",
    status: "ready",
    summary: "앱 공지 생성/수정/삭제와 공개 조회를 바로 연결할 수 있습니다.",
    availableApis: [
      "GET /v1/app-notices",
      "POST /v1/admin/app-notices",
      "PATCH /v1/admin/app-notices/{appNoticeId}",
      "DELETE /v1/admin/app-notices/{appNoticeId}",
    ],
    gapApis: [],
  },
  {
    key: "campusBanners",
    path: "/campus-banners",
    title: "캠퍼스 배너 관리",
    navigationLabel: "캠퍼스 배너",
    section: "콘텐츠",
    status: "ready",
    summary: "배너 목록/상세/생성/수정/삭제/정렬 변경까지 구현 가능한 상태입니다.",
    availableApis: [
      "GET /v1/campus-banners",
      "GET /v1/admin/campus-banners",
      "GET /v1/admin/campus-banners/{bannerId}",
      "POST /v1/admin/campus-banners",
      "PATCH /v1/admin/campus-banners/{bannerId}",
      "DELETE /v1/admin/campus-banners/{bannerId}",
      "PUT /v1/admin/campus-banners/order",
    ],
    gapApis: [],
  },
  {
    key: "appVersions",
    path: "/app-versions",
    title: "앱 버전 관리",
    navigationLabel: "앱 버전",
    section: "운영",
    status: "ready",
    summary: "플랫폼별 최소 버전과 강제 업데이트 설정을 연결할 수 있습니다.",
    availableApis: [
      "GET /v1/app-versions/{platform}",
      "PUT /v1/admin/app-versions/{platform}",
    ],
    gapApis: [],
  },
  {
    key: "legalDocuments",
    path: "/legal-documents",
    title: "법적 문서 관리",
    navigationLabel: "법적 문서",
    section: "운영",
    status: "ready",
    summary:
      "약관/개인정보 처리방침 목록과 상세, 전체 수정, 삭제를 연결할 수 있습니다.",
    availableApis: [
      "GET /v1/admin/legal-documents",
      "GET /v1/admin/legal-documents/{documentKey}",
      "PUT /v1/admin/legal-documents/{documentKey}",
      "DELETE /v1/admin/legal-documents/{documentKey}",
    ],
    gapApis: [],
  },
  {
    key: "cafeteria",
    path: "/cafeteria",
    title: "학식 메뉴 관리",
    navigationLabel: "학식 메뉴",
    section: "운영",
    status: "ready",
    summary: "주차 단위 학식 메뉴 등록/수정/삭제를 바로 구현할 수 있습니다.",
    availableApis: [
      "GET /v1/cafeteria-menus",
      "GET /v1/cafeteria-menus/{weekId}",
      "POST /v1/admin/cafeteria-menus",
      "PUT /v1/admin/cafeteria-menus/{weekId}",
      "DELETE /v1/admin/cafeteria-menus/{weekId}",
    ],
    gapApis: [],
  },
  {
    key: "academicSchedules",
    path: "/academic-schedules",
    title: "학사 일정 관리",
    navigationLabel: "학사 일정",
    section: "운영",
    status: "ready",
    summary: "학사 일정 CRUD는 현재 계약으로 구현 가능합니다.",
    availableApis: [
      "GET /v1/academic-schedules",
      "POST /v1/admin/academic-schedules",
      "PUT /v1/admin/academic-schedules/{scheduleId}",
      "DELETE /v1/admin/academic-schedules/{scheduleId}",
    ],
    gapApis: [],
  },
  {
    key: "courses",
    path: "/courses",
    title: "강의 bulk 관리",
    navigationLabel: "강의 bulk",
    section: "운영",
    status: "ready",
    summary: "학기 강의 일괄 업로드와 전체 삭제를 관리자 화면에 연결할 수 있습니다.",
    availableApis: [
      "POST /v1/admin/courses/bulk",
      "DELETE /v1/admin/courses?semester=...",
    ],
    gapApis: [],
  },
  {
    key: "inquiries",
    path: "/inquiries",
    title: "문의 운영",
    navigationLabel: "문의",
    section: "지원",
    status: "ready",
    summary: "페이지네이션 목록과 상태 변경, 운영 메모를 바로 구현할 수 있습니다.",
    availableApis: [
      "GET /v1/admin/inquiries",
      "PATCH /v1/admin/inquiries/{inquiryId}/status",
    ],
    gapApis: [],
  },
  {
    key: "reports",
    path: "/reports",
    title: "신고 운영",
    navigationLabel: "신고",
    section: "지원",
    status: "ready",
    summary:
      "신고 목록 조회와 상태/조치/메모 변경을 현재 계약에 맞춰 운영할 수 있습니다.",
    availableApis: [
      "GET /v1/admin/reports",
      "PATCH /v1/admin/reports/{reportId}/status",
    ],
    gapApis: [],
  },
];

export function getAdminModule(key: string) {
  const adminModule = adminModules.find((item) => item.key === key);

  if (!adminModule) {
    throw new Error(`Unknown admin module: ${key}`);
  }

  return adminModule;
}

export function getAdminSections() {
  const sections = new Map<string, AdminModule[]>();

  adminModules.forEach((module) => {
    const existing = sections.get(module.section) ?? [];
    existing.push(module);
    sections.set(module.section, existing);
  });

  return Array.from(sections.entries()).map(([title, modules]) => ({
    title,
    modules,
  }));
}
