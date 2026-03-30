# SKURI Admin

Spring 기반 `skuri-backend`를 운영하기 위한 관리자 웹 프로젝트입니다.

기존 [sktaxi-admin](/Users/jisung/sktaxi-admin) 이 Firebase/Firestore 직접 제어 콘솔이었다면, 이 프로젝트는 Firebase 인증을 유지하되 실제 운영 데이터 조회/수정은 Spring Admin API를 기준으로 동작합니다.

## 현재 상태

- 런타임: Next.js App Router
- UI: Chakra UI 3
- 배포 대상: Vercel
- Chakra MCP: `.cursor/mcp.json` 설정 완료
- 구현 완료:
  - Firebase 로그인 화면
  - 공통 관리자 셸/권한 가드
  - 학교 공지 목록 + 동기화
  - 문의 목록 + 상태 변경
  - 앱 공지 목록 + 생성/수정/삭제
  - 캠퍼스 배너 목록 + 생성/수정/삭제/정렬
  - 앱 버전 플랫폼별 조회 + 저장
  - 법적 문서 목록/상세 + 생성/수정/삭제
  - 학식 메뉴 주차 조회 + 생성/수정/삭제
  - 학사 일정 목록/필터 + 생성/수정/삭제 + 연간 JSON bulk sync
  - 강의 bulk JSON 업로드 + 공식 온라인 강의(`isOnline`) 등록 + 학기 전체 삭제
  - 신고 목록/필터/페이지네이션 + 상태 처리
  - 사용자 목록/검색/필터 + 상세 조회 + 관리자 권한 변경
  - 택시 파티 목록/필터 + 상세 조회 + 상태 변경 + 일반 멤버 강퇴 + 시스템 메시지 + join request 조회
  - 게시글 목록/필터 + 게시글 상세 + 게시글 moderation + 댓글 목록/필터 + 댓글 moderation
  - 공개 채팅방 목록/필터 + 생성/상세/참여/메시지 조회/삭제
- 검증:
  - `npm run lint`
  - `npm run build`
- `agent-browser`로 `/login`, 보호 라우트 `/notices`, `/app-versions`, `/legal-documents`, `/cafeteria`, `/academic-schedules`, `/courses`, `/reports`, `/chat-rooms` 확인
- 상세 계획 문서:
  - [docs/implementation-plan.md](/Users/jisung/skuri-admin/docs/implementation-plan.md)
  - [docs/backend-api-gap.md](/Users/jisung/skuri-admin/docs/backend-api-gap.md)

## 시작

```bash
npm install
npm run dev
```

## 현재 결정사항

- 프로젝트 루트: `/Users/jisung/skuri-admin`
- 1차 범위:
  - Spring API만으로 바로 구현 가능한 운영 화면
  - API가 부족한 영역은 placeholder 화면 + 백엔드 요청 문서화
- `/users`는 목록/상세/활동 요약/관리자 권한 변경까지 실제 API 연결 가능하고, 상태 변경만 follow-up placeholder로 유지
- `/dashboard`는 `summary/activity/recent-items` read-model API를 연결한 실제 운영 화면으로 구현됐다. KPI 카드, 최근 7일/30일 활동 그래프, 최근 운영 항목 피드를 제공한다. `totalMembers`는 WITHDRAWN tombstone을 포함하고, 최근 공지 source는 app notice 기준이다.
- `/parties`는 관리자 목록/상세/상태 변경에 이어, 일반 멤버 강퇴/운영 시스템 메시지/pending join request 조회까지 실제 API 연결 가능하다. join request 승인/거절, 리더 교체/승계, 시스템 메시지 pin은 follow-up 범위로 남긴다.
- `/boards`는 게시글 목록/상세 조회, 게시글 moderation, 댓글 목록/댓글 moderation까지 실제 API에 연결됐다. 신고 연계 뷰와 pin 정책은 follow-up 범위로 남긴다.
- `/users` 목록은 이름 컬럼에 `realname`, OS 컬럼에 `lastLoginOs`, 앱버전 컬럼에 `currentAppVersion`을 사용한다. 둘 다 최근 활성 FCM 토큰의 `platform`, `app_version` 기준이다.
- `/users` 회원목록 표는 `UID, 이름, 이메일, 닉네임, 학과, 학번, 가입일, 최근로그인, OS, 앱버전` 칼럼으로 고정하고, 각 헤더 클릭 시 서버 정렬(`sortBy/sortDirection`)을 사용한다. 상세 정보는 row click modal로 연다.
- `POST /v1/members/me/fcm-tokens`는 optional `appVersion`을 받으며, 신규 토큰 등록 시 미전송하면 `null`, 기존 토큰 재등록 시 `null` 또는 빈 문자열이면 기존 값을 유지한다.
- `/users`의 관리자 권한 변경은 자기 자신의 계정 대상 요청을 허용하지 않는다. 회원 상세의 `bankAccount`는 그대로 노출되며, 감사 로그는 최소 필드만 저장한다.
- `/users` 활동 요약은 ACTIVE 회원 + 현재 저장 데이터 기준이며, 탈퇴 회원은 `409 MEMBER_ACTIVITY_NOT_AVAILABLE_FOR_WITHDRAWN`을 반환한다.
- `/chat-rooms`는 PARTY 타입을 제외한 공개 채팅방 운영 화면으로 구현하고, 목록/상세/참여/메시지 조회/관리자 생성/삭제를 지원한다.
- `/courses`는 공식 강의 bulk 업로드 시 `isOnline`을 지원한다. 공식 온라인 강의는 시간표 응답에서 `courses[]`에만 보이고 `slots[]`에는 포함되지 않지만, 공식 강의와 직접 입력 강의 저장 모델은 계속 분리한다.
- `/academic-schedules`는 기존 단건 CRUD를 유지하면서, 연간 JSON 업로드용 `PUT /v1/admin/academic-schedules/bulk`를 실제 화면에서 사용한다. bulk sync 자연키는 `title + startDate + endDate + type`이고 `single/multi` 소문자 입력도 허용된다. 기존 Firebase 스크립트처럼 배열만 붙여넣는 형식도 관리자 화면에서 자동으로 scope를 추론해 보낼 수 있다.

## 참고 기준

- 백엔드 계약 기준: [docs/api-specification.md](/Users/jisung/skuri-backend/docs/api-specification.md)
- 백엔드 역할/권한 기준: [docs/role-definition.md](/Users/jisung/skuri-backend/docs/role-definition.md)
- 백엔드 전체 개요: [docs/project-overview.md](/Users/jisung/skuri-backend/docs/project-overview.md)
