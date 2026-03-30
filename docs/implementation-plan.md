# SKURI Admin 구현 계획

> 최종 수정일: 2026-03-29
> 프로젝트 루트: `/Users/jisung/skuri-admin`

## 1. 목적

이 프로젝트는 기존 Firebase 직접 제어형 관리자 콘솔이 아니라, Spring 기반 `skuri-backend` 운영 API를 기준으로 동작하는 새로운 SKURI 관리자 웹입니다.

핵심 원칙은 아래와 같습니다.

1. 운영 데이터의 source of truth는 Spring + MySQL이다.
2. 관리자 인증은 기존과 동일하게 Firebase 로그인 + Firebase ID Token을 사용한다.
3. 프론트는 직접 Firestore를 수정하지 않는다.
4. Spring API가 없는 운영 기능은 임의 우회 구현하지 않고 placeholder로 먼저 고정한다.
5. 백엔드 확장이 필요한 항목은 [backend-api-gap.md](/Users/jisung/skuri-admin/docs/backend-api-gap.md) 에서 별도로 관리한다.

## 1.1 현재 구현 스냅샷

2026-03-29 기준으로 아래 항목은 실제 화면/코드까지 연결됐다.

- `/login`: Firebase Web SDK 기반 관리자 로그인 UI 구현
- 공통 Admin Shell: 사이드바, 상단 헤더, 권한 가드 구현
- `/app-notices`: 공지 목록 + unread count 조회 + 생성/수정/삭제 구현
- `/campus-banners`: 관리자 배너 목록 + 생성/수정/삭제/정렬 구현
- `/app-versions`: 플랫폼별 live 설정 조회 + 관리자 저장 구현
- `/legal-documents`: 문서 키별 목록/상세 조회 + 생성/수정/삭제 구현
- `/cafeteria`: 현재 주/주차 조회 + 주차 메뉴 생성/수정/삭제 구현
- `/academic-schedules`: 목록/필터 조회 + 일정 생성/수정/삭제 + 연간 JSON bulk sync 구현
- `/courses`: 학기 강의 bulk 업로드 + 공식 온라인 강의(`isOnline`) 등록 + 학기 전체 삭제 구현
- `/reports`: 신고 목록/필터/페이지네이션 + 상태 처리 구현
- `/notices`: 학교 공지 목록 조회 + 카테고리/검색 필터 + sync 실행 구현
- `/inquiries`: 문의 목록 조회 + 상태/메모 변경 구현

아래 항목은 아직 일부 placeholder 또는 follow-up 기능이 남아 있다.

- `/parties`
- `/chat-rooms`

## 2. 기준 문서

### 백엔드 기준

- [project-overview.md](/Users/jisung/skuri-backend/docs/project-overview.md)
- [implementation-roadmap.md](/Users/jisung/skuri-backend/docs/implementation-roadmap.md)
- [api-specification.md](/Users/jisung/skuri-backend/docs/api-specification.md)
- [domain-analysis.md](/Users/jisung/skuri-backend/docs/domain-analysis.md)
- [erd.md](/Users/jisung/skuri-backend/docs/erd.md)
- [role-definition.md](/Users/jisung/skuri-backend/docs/role-definition.md)

### 기존 관리자 참고

- [README.md](/Users/jisung/sktaxi-admin/README.md)
- [admin-web-storyboard.md](/Users/jisung/sktaxi-admin/admin-web-storyboard.md)

## 3. 확정된 기술 선택

| 항목 | 결정 |
|---|---|
| 런타임 | Next.js App Router |
| 언어 | TypeScript |
| UI 시스템 | Chakra UI 3 |
| 배포 | Vercel |
| 로컬 개발 위치 | `/Users/jisung/skuri-admin` |
| Chakra MCP | `.cursor/mcp.json`에 `@chakra-ui/react-mcp` 등록 |

## 4. 인증/권한 전략

### 4.1 로그인 구조

새 관리자 웹도 Firebase 로그인을 유지한다.

이유는 백엔드 관리자 API가 아래 전제를 갖기 때문이다.

- 모든 Admin API는 Firebase ID Token 기반 인증
- Spring 인증 필터가 `members.isAdmin`을 조회해 `ROLE_ADMIN`을 부여
- `/v1/admin/**` 접근 거부 시 `403 ADMIN_REQUIRED`

따라서 프론트는 다음 순서로 동작한다.

1. Firebase Web SDK로 관리자 로그인
2. ID Token 확보
3. Spring API 호출 시 `Authorization: Bearer <token>` 전달
4. `401`, `403 ADMIN_REQUIRED`, `403 MEMBER_WITHDRAWN`를 공통 처리

### 4.2 프론트 가드

1차 구현 기준 라우트 가드는 아래 수준으로 둔다.

- `/login`: 공개
- 관리자 라우트: 로그인 필요
- 첫 Admin API 호출에서 `ADMIN_REQUIRED` 수신 시 접근 차단 + 로그인 화면/에러 상태로 이동

## 5. 라우팅 계획

1차 라우트 초안은 아래와 같다.

| 경로 | 목적 | 상태 |
|---|---|---|
| `/login` | Firebase 관리자 로그인 | 구현 |
| `/dashboard` | 운영 요약 대시보드 | KPI 카드 + 활동 그래프 + 최근 운영 피드 구현 |
| `/users` | 회원 목록/상세/활동 요약/권한 변경 | 부분 구현 |
| `/parties` | 택시 파티 운영 조회/개입 | 부분 구현 |
| `/chat-rooms` | 공개 채팅방 목록/상세/참여/메시지 운영 | 부분 구현 |
| `/boards` | 게시글/댓글 운영 | 부분 구현 |
| `/notices` | 학교 공지 목록/상세 + sync 진입 | 부분 구현 |
| `/app-notices` | 앱 공지 관리 | 부분 구현 |
| `/campus-banners` | 캠퍼스 홈 배너 관리 | 부분 구현 |
| `/app-versions` | 앱 버전 관리 | 부분 구현 |
| `/legal-documents` | 약관/개인정보 처리방침 관리 | 부분 구현 |
| `/cafeteria` | 학식 메뉴 관리 | 부분 구현 |
| `/academic-schedules` | 학사 일정 관리 | 부분 구현 |
| `/courses` | 강의 bulk 업로드/삭제 | 부분 구현 |
| `/inquiries` | 문의 운영 | 부분 구현 |
| `/reports` | 신고 운영 | 부분 구현 |

## 6. 기능 범위 분류

### 6.1 바로 구현 가능한 영역

아래 화면은 현재 Spring 계약만으로 CRUD 또는 운영 액션 구현이 가능하다.

| 모듈 | 근거 API |
|---|---|
| 앱 공지 | `POST/PATCH/DELETE /v1/admin/app-notices`, `GET /v1/app-notices` |
| 캠퍼스 배너 | `GET/POST/PATCH/DELETE/PUT /v1/admin/campus-banners*`, `GET /v1/campus-banners` |
| 앱 버전 | `PUT /v1/admin/app-versions/{platform}`, `GET /v1/app-versions/{platform}` |
| 법적 문서 | `GET/PUT/DELETE /v1/admin/legal-documents*`, `GET /v1/legal-documents/{documentKey}` |
| 학교 공지 목록 | `GET /v1/notices`, `GET /v1/notices/{id}`, `POST /v1/admin/notices/sync` |
| 학식 메뉴 | `POST/PUT/DELETE /v1/admin/cafeteria-menus*`, `GET /v1/cafeteria-menus*` |
| 학사 일정 | `POST/PUT/DELETE /v1/admin/academic-schedules*`, `PUT /v1/admin/academic-schedules/bulk`, `GET /v1/academic-schedules` |
| 강의 bulk | `POST /v1/admin/courses/bulk`, `DELETE /v1/admin/courses` |
| 문의 | `GET /v1/admin/inquiries`, `PATCH /v1/admin/inquiries/{id}/status` |
| 신고 | `GET /v1/admin/reports`, `PATCH /v1/admin/reports/{id}/status` |
| 대시보드 read model | `GET /v1/admin/dashboard/summary`, `GET /v1/admin/dashboard/activity`, `GET /v1/admin/dashboard/recent-items` |
| 사용자 관리(P1) | `GET /v1/admin/members`, `GET /v1/admin/members/{memberId}`, `GET /v1/admin/members/{memberId}/activity`, `PATCH /v1/admin/members/{memberId}/admin-role` |
| 택시 파티 관리 | `GET /v1/admin/parties`, `GET /v1/admin/parties/{partyId}`, `PATCH /v1/admin/parties/{partyId}/status`, `DELETE /v1/admin/parties/{partyId}/members/{memberId}`, `POST /v1/admin/parties/{partyId}/messages/system`, `GET /v1/admin/parties/{partyId}/join-requests` |
| 게시물 관리(P1) | `GET /v1/admin/posts`, `GET /v1/admin/posts/{postId}`, `PATCH /v1/admin/posts/{postId}/moderation`, `GET /v1/admin/comments`, `PATCH /v1/admin/comments/{commentId}/moderation` |

### 6.2 부분 구현 가능한 영역

현재 API로 일부는 구현 가능하지만, 기존 관리자 수준의 운영 개입은 부족하다.

| 모듈 | 지금 가능한 것 | 부족한 것 |
|---|---|---|
| 택시 파티 관리 | 목록/필터/상세 조회, 상태 변경(`CLOSE/REOPEN/CANCEL/END`), 일반 멤버 강퇴, 운영 시스템 메시지, 관리자 join request 조회 | 관리자 join request 승인/거절, 리더 교체/승계, 시스템 메시지 pin |
| 게시물 관리 | 게시글 목록/상세 조회, 게시글 moderation(`VISIBLE/HIDDEN/DELETED`), 댓글 목록/댓글 moderation | 신고 연계 운영 뷰(`GET /v1/admin/posts/{postId}/reports`), pin 정책 |
| 공개 채팅방 관리 | `GET /v1/chat-rooms`, `GET /v1/chat-rooms/{id}`, `GET /v1/chat-rooms/{id}/messages`, `POST/DELETE /v1/admin/chat-rooms*` | 멤버 목록, 관리자 강퇴, 공지성 시스템 메시지 발송, 운영 필터 |
| 학교 공지 운영 | 공지 목록/상세 조회, sync 실행 | sync 이력, 수동 숨김/핀/카테고리 보정 같은 운영 액션 |
| 대시보드 | summary/activity/recent-items read API로 KPI 카드, 활동 그래프, 최근 운영 피드 구현 가능 | ACTIVE-only 회원 수, 학교 공지 sync 이력 같은 추가 운영 지표는 별도 API 논의 필요 |

### 6.3 placeholder가 필요한 영역

아래는 화면 진입과 정보 구조는 먼저 만들 수 있지만, 실운영 기능은 백엔드 확장 후 본격 구현한다.

| 모듈 | placeholder 이유 |
|---|---|
| 대시보드 심화 KPI | 기본 KPI/추이/최근 운영 피드는 구현됐지만, ACTIVE-only 회원 수/학교 공지 sync 이력 같은 추가 운영 지표는 별도 API 논의가 필요 |

## 7. 프론트 아키텍처 계획

## 7.1 디렉터리 초안

```text
src/
  app/
    (public)/
      login/
    (admin)/
      dashboard/
      users/
      parties/
      chat-rooms/
      boards/
      notices/
      app-notices/
      campus-banners/
      app-versions/
      legal-documents/
      cafeteria/
      academic-schedules/
      courses/
      inquiries/
      reports/
  components/
    layout/
    navigation/
    feedback/
    tables/
    forms/
  features/
    auth/
    dashboard/
    notices/
    support/
    campus/
    academic/
    chat-rooms/
  lib/
    api/
    env/
    format/
    guards/
  types/
```

### 7.2 공통 레이아웃

공통 레이아웃은 아래 흐름으로 설계한다.

1. 좌측 사이드바
2. 상단 헤더
3. 페이지 타이틀 + 보조 액션
4. 필터 바
5. 데이터 테이블 + 상세 modal/패널

초기 디자인 방향:

- 단순 대시보드 템플릿 복붙 대신 SKURI 운영 툴 느낌의 밀도 있는 콘솔
- Chakra UI 토큰 기반 레이아웃
- 데스크톱 우선, 태블릿까지 대응
- 모바일은 조회 중심 fallback

### 7.3 데이터 접근 원칙

1차 구현에서는 화면 특성에 맞춰 `server component + client component`를 혼합한다.

- 목록의 초기 로딩과 SEO가 필요 없는 운영 화면이라도 App Router 구조를 유지
- 인증 토큰이 필요한 호출은 클라이언트 측 fetch wrapper를 우선 사용
- 대량 폼/뮤테이션이 많은 화면은 별도 `features/*` 단위로 분리

주의:

- React Query 도입은 유력하지만 아직 고정하지 않는다.
- 우선은 공통 API 클라이언트, 에러 매핑, 인증 재시도 정책부터 고정한다.

## 8. 페이지별 구현 계획

### 8.1 대시보드

1차 목표:

- 운영 화면 진입점
- `GET /v1/admin/dashboard/summary`로 KPI 카드 노출
- `GET /v1/admin/dashboard/activity`로 최근 7일/30일 추이 그래프 노출
- `GET /v1/admin/dashboard/recent-items`로 최근 운영 항목 피드 노출

구현 메모:

- 날짜/일자 버킷은 `Asia/Seoul` 기준으로 고정한다.
- `totalMembers`는 backend 계약상 `members` 전체 row 기준이며 `WITHDRAWN` tombstone도 포함한다.
- 최근 공지 source는 app notice다. 학교 공지 sync 이력은 별도 API가 없으므로 대시보드 카드/피드에 섞지 않는다.

### 8.2 사용자 관리

1차 목표:

- 회원 목록/검색/필터 연결
- 회원 상세/활동 요약/계좌/알림 정보를 modal로 묶어 조회
- 관리자 권한 부여/회수 연결

현재 구현 범위:

- `GET /v1/admin/members`
- `GET /v1/admin/members/{memberId}`
- `GET /v1/admin/members/{memberId}/activity`
- `PATCH /v1/admin/members/{memberId}/admin-role`
- self role change는 `400 SELF_ADMIN_ROLE_CHANGE_NOT_ALLOWED`로 차단
- 회원목록 표는 `UID, 이름, 이메일, 닉네임, 학과, 학번, 가입일, 최근로그인, OS, 앱버전` 칼럼을 사용하고, 각 헤더 클릭 시 서버 정렬(`sortBy/sortDirection`)을 적용
- 목록 이름 컬럼은 `realname`, OS/app version 컬럼은 최근 활성 FCM 토큰의 `lastLoginOs`, `currentAppVersion`을 사용
- `POST /v1/members/me/fcm-tokens`는 optional `appVersion`을 받으며, 신규 토큰 등록 시 미전송하면 `null`, 기존 토큰 재등록 시 `null` 또는 빈 문자열이면 기존 값을 유지
- 활동 요약은 ACTIVE 회원 + 현재 저장 데이터 기준으로 제공되고, 탈퇴 회원은 `409 MEMBER_ACTIVITY_NOT_AVAILABLE_FOR_WITHDRAWN`으로 비제공
- 회원 상세 응답의 `bankAccount`는 유지, admin-role 감사 로그는 최소 필드만 저장

남은 placeholder/follow-up:

- 회원 상태 변경(`PATCH /v1/admin/members/{memberId}/status`)
- 마지막 관리자 수 계산 같은 추가 운영 보호 정책

### 8.3 택시 파티 관리

1차 목표:

- `/parties` 목록/필터/상세 조회 구현
- 상태 변경 action(`CLOSE`, `REOPEN`, `CANCEL`, `END`) 연결
- 관리자 강퇴/시스템 메시지/pending join request 조회까지 실제 API 연결 가능

현재 구현 범위:

- `GET /v1/admin/parties`
- `GET /v1/admin/parties/{partyId}`
- `PATCH /v1/admin/parties/{partyId}/status`
- `DELETE /v1/admin/parties/{partyId}/members/{memberId}`
- `POST /v1/admin/parties/{partyId}/messages/system`
- `GET /v1/admin/parties/{partyId}/join-requests`
- 목록은 `status`, `departureDate`, `query`, `page`, `size` 필터와 기본 정렬 `departureTime DESC`, `createdAt DESC`를 사용
- 상세 modal에서 기본 정보, 참여 멤버, 정산 정보, 상태 변경, 일반 멤버 강퇴, 운영 시스템 메시지, pending join request 조회를 처리할 수 있음
- 상태 변경 액션은 `CLOSE`, `REOPEN`, `CANCEL`, `END`를 지원하지만 기존 TaxiParty 상태 머신만 재사용
- `END`는 `ARRIVED -> ENDED(FORCE_ENDED)`일 때만 허용
- 관리자 멤버 제거는 leader를 제외한 일반 멤버만 허용하고, `ARRIVED`/`ENDED`에서는 제거할 수 없음
- 관리자 시스템 메시지는 party chat room이 있을 때만 생성되며, 표시 기준은 `senderName=관리자`, `senderPhotoUrl=null`
- 관리자 join request 조회는 현재 `PENDING`만 `requestedAt DESC`로 제공

남은 placeholder/follow-up:

- 관리자 join request 승인/거절 액션
- 리더 교체/승계 정책
- 관리자 시스템 메시지 pin/공지 강조 정책

### 8.4 공개 채팅방 관리

1차 목표:

- 목록/상세/메시지 이력 조회
- 관리자 채팅방 생성/삭제
- 참여/나가기 액션 연결
- 멤버/운영 액션은 placeholder

### 8.5 게시물 관리

1차 목표:

- `/boards` 목록/필터/상세 조회 구현
- 게시글 moderation(`VISIBLE/HIDDEN/DELETED`) 연결
- 댓글 목록/댓글 moderation 연결

현재 구현 범위:

- `GET /v1/admin/posts`
- `GET /v1/admin/posts/{postId}`
- `PATCH /v1/admin/posts/{postId}/moderation`
- `GET /v1/admin/comments`
- `PATCH /v1/admin/comments/{commentId}/moderation`
- `/boards`에서 게시글 목록/필터, 게시글 상세 modal, 게시글 moderation, 댓글 목록/필터, 댓글 moderation을 처리할 수 있음
- 목록 기본 정렬은 게시글/댓글 모두 `createdAt DESC`
- `DELETED`는 기존 soft delete 재사용이고 hard delete는 없다.
- `HIDDEN` 게시글은 public 목록/상세/내 게시글/북마크에서 제외된다.
- `HIDDEN` 댓글은 public 댓글 응답에서 thread 구조 유지를 위해 placeholder로 마스킹된다.

남은 placeholder/follow-up:

- `GET /v1/admin/posts/{postId}/reports`
- pin/공지 고정 정책

### 8.6 학교 공지

1차 목표:

- 공지 목록/상세
- `sync` 실행
- 카테고리/검색/페이지네이션 지원

### 8.7 Support / Campus / Academic

1차 목표:

- 실제 운영 CRUD 우선 구현
- 이 영역을 관리자 콘솔의 첫 번째 완성 묶음으로 본다.

우선순위:

1. 문의 / 신고
2. 앱 공지 / 앱 버전
3. 캠퍼스 배너 / 법적 문서
4. 학식 / 학사 일정
5. 강의 bulk

구현 메모:

- 관리자 강의 bulk 업로드는 공식 강의에도 `isOnline`을 사용할 수 있다.
- `isOnline=true`인 공식 강의는 현재 직접 입력 온라인 강의와 같은 의미로 취급하며, 시간표 응답에서는 `courses[]`에만 보이고 `slots[]`에는 포함되지 않는다.
- 공식 강의(`Course`)와 직접 입력 강의(`UserTimetableManualCourse`)는 저장 모델을 합치지 않는다.

## 9. 환경 변수 계획

최소 환경 변수 초안:

```bash
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

주의:

- 이 프로젝트는 Firebase Auth를 로그인 수단으로 사용한다.
- 그러나 실제 운영 데이터는 Spring API를 통해서만 다룬다.
- Firestore 직접 수정용 관리자 서비스 계정은 넣지 않는다.

## 10. Vercel 배포 계획

1. Git 저장소 연결
2. Vercel 프로젝트 생성
3. 위 환경 변수 등록
4. Preview/Production 환경 분리
5. 로그인/권한/401/403 시나리오 점검

## 11. 검증 계획

최소 검증 기준:

1. `npm run lint`
2. `npm run build`
3. 로그인 없이 관리자 라우트 접근 차단
4. `401`, `403 ADMIN_REQUIRED` 공통 처리
5. 구현 완료 화면별 정상/예외 케이스 확인
6. placeholder 화면에서 백엔드 의존 항목이 명확히 보이는지 확인
7. 상태 전이/관리자 메모가 백엔드 규칙과 일치하는지 확인

## 12. 실행 순서

### Milestone 1

- Next.js 프로젝트 생성
- Chakra UI 설치
- Chakra MCP 설정
- 계획 문서/백엔드 갭 문서 작성

### Milestone 2

- Firebase 로그인
- Admin shell
- 공통 API 클라이언트

### Milestone 3

- Support / Campus / Notice / Academic 화면 구현

### Milestone 4

- Dashboard partial 구현
- Chat room partial 구현
- Placeholder 화면 고도화

### Milestone 5

- 백엔드 확장 API 연결
- placeholder 제거
