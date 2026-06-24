# SKURI Admin 백엔드 API 갭 문서

> 최종 수정일: 2026-03-29
> 이 문서는 프론트 구현 중 확인된 Spring Admin API 확장 요청 목록을 정리한다.
> 현재 문서화만 수행하며, `skuri-backend` 수정은 포함하지 않는다.

## 1. 목적

새 관리자 웹은 Spring API만을 데이터 기준으로 사용한다.

하지만 기존 운영 콘솔 수준의 기능을 구현하려면 일부 Admin API가 추가로 필요하다.
이 문서는 어떤 화면이 왜 placeholder로 남는지, 어떤 API가 있으면 완전 구현으로 전환되는지를 정리한다.

## 2. 우선순위 분류

| 우선순위 | 의미 |
|---|---|
| P1 | 화면 핵심 기능이 막힘. 가장 먼저 필요 |
| P2 | 읽기 전용 구현은 가능하지만 운영 액션이 제한됨 |
| P3 | 있으면 좋지만 1차 오픈을 막지는 않음 |

## 3. 기능별 갭

### 3.1 대시보드 KPI

현재 상태:

- 2026-03-29 기준 backend read-model API가 구현됐다.
  - `GET /v1/admin/dashboard/summary`
  - `GET /v1/admin/dashboard/activity`
  - `GET /v1/admin/dashboard/recent-items`
- 이제 `/dashboard`는 프론트가 실제 운영 데이터로 구현 가능하다.
- 집계 기준 메모:
  - `newMembersToday`는 `Asia/Seoul` 기준 오늘 `00:00 ~ generatedAt`의 `joinedAt` 수다.
  - `totalMembers`는 `members` 전체 row 기준이며 `WITHDRAWN` tombstone도 포함한다.
  - `recent-items`의 공지 source는 app notice이며, 학교 공지 sync 이력은 이번 계약에 포함되지 않는다.

응답 예시:

```json
{
  "success": true,
  "data": {
    "newMembersToday": 12,
    "totalMembers": 4831,
    "adminCount": 4,
    "openPartyCount": 17,
    "pendingInquiryCount": 9,
    "pendingReportCount": 3,
    "generatedAt": "2026-03-29T18:00:00"
  }
}
```

남은 필요 API:

- 없음. 대시보드 read 범위는 현재 계약으로 구현 가능하다.

### 3.2 사용자 관리

현재 상태:

- 2026-03-29 기준 P1 구현 완료:
  - `GET /v1/admin/members`
  - `GET /v1/admin/members/{memberId}`
  - `GET /v1/admin/members/{memberId}/activity`
  - `PATCH /v1/admin/members/{memberId}/admin-role`
- `/users` 화면은 회원 목록/검색/필터, 상세 조회, 활동 요약, 관리자 권한 변경까지 실제 구현 가능하다.
- `lastLoginAt` 대신 실제 계약 필드명은 `lastLogin`이다.
- `/users` 목록의 이름 컬럼은 `realname`, OS 컬럼은 `lastLoginOs`를 사용한다.
- `lastLoginOs`는 최근 활성 FCM 토큰의 `fcm_tokens.platform` 기준이다.
- `/users` 목록의 `currentAppVersion`은 최근 활성 FCM 토큰의 `fcm_tokens.app_version` 기준이다.
- 자기 자신의 계정에 대한 관리자 권한 변경은 `400 SELF_ADMIN_ROLE_CHANGE_NOT_ALLOWED`로 차단된다.
- 회원 상세 응답의 `bankAccount`는 유지되며, admin-role 감사 로그는 최소 필드만 저장한다.
- 활동 요약은 ACTIVE 회원 + 현재 저장 데이터 기준이며, 탈퇴 회원은 `409 MEMBER_ACTIVITY_NOT_AVAILABLE_FOR_WITHDRAWN`으로 조회할 수 없다.
- `POST /v1/members/me/fcm-tokens`는 optional `appVersion`을 받으며, 신규 토큰 등록 시 미전송하면 `null`, 기존 토큰 재등록 시 `null` 또는 빈 문자열이면 기존 값을 유지한다.

남은 필요 API:

| 우선순위 | 제안 API | 목적 |
|---|---|---|
| P2 | `PATCH /v1/admin/members/{memberId}/status` | 운영 상태 변경(차단/복구 등) |

회원 목록 최소 요구 필드:

- `id`
- `email`
- `nickname`
- `realname`
- `studentId`
- `department`
- `isAdmin`
- `joinedAt`
- `lastLogin`
- `lastLoginOs`
- `currentAppVersion`
- `status`

### 3.3 택시 파티 관리

현재 상태:

- 2026-03-29 기준 backend P1 + follow-up 계약이 추가되어 아래 API는 실제 구현 가능 상태다.
  - `GET /v1/admin/parties`
  - `GET /v1/admin/parties/{partyId}`
  - `PATCH /v1/admin/parties/{partyId}/status`
  - `DELETE /v1/admin/parties/{partyId}/members/{memberId}`
  - `POST /v1/admin/parties/{partyId}/messages/system`
  - `GET /v1/admin/parties/{partyId}/join-requests`
- 관리자 상태 변경 action은 `CLOSE`, `REOPEN`, `CANCEL`, `END`를 지원한다.
- 단, 기존 TaxiParty 상태 머신을 그대로 재사용하므로 임의 상태 점프는 불가하다.
  - `END`는 `ARRIVED`에서만 가능
  - `CANCEL`은 `OPEN`, `CLOSED`에서만 가능
- 관리자 멤버 제거는 leader를 제외한 일반 멤버만 허용한다.
- 관리자 시스템 메시지는 party chat room이 있을 때만 생성되고, 표시 기준은 `senderName=관리자`, `senderPhotoUrl=null`이다.
- 관리자 join request 조회는 현재 `PENDING`만 latest-first로 제공한다.

남은 추가 필요 API:

| 우선순위 | 제안 API | 목적 |
|---|---|---|
| P3 | `PATCH /v1/admin/join-requests/{requestId}/approve-or-decline` | 관리자 관점 join request 처리 |
| P3 | `PATCH /v1/admin/parties/{partyId}/leader` | 리더 교체/승계 정책 |
| P3 | `POST /v1/admin/parties/{partyId}/messages/system/{messageId}/pin` | 운영 고정 공지/배지 처리 |

P1에서 실제 제공되는 `PATCH /status` action:

- `CLOSE`
- `REOPEN`
- `CANCEL`
- `END`

### 3.4 공개 채팅방 관리

현재 상태:

- 2026-04-06 기준 backend에서 관리자 공개 채팅방 read API와 관리자 파티 채팅 read API가 구현됐다.
- `GET /v1/chat-rooms`
- `GET /v1/chat-rooms/{chatRoomId}`
- `POST /v1/chat-rooms/{chatRoomId}/join`
- `DELETE /v1/chat-rooms/{chatRoomId}/members/me`
- `GET /v1/chat-rooms/{chatRoomId}/messages`
- `GET /v1/admin/chat-rooms`
- `GET /v1/admin/chat-rooms/{chatRoomId}`
- `GET /v1/admin/chat-rooms/{chatRoomId}/messages`
- `POST /v1/admin/chat-rooms`
- `DELETE /v1/admin/chat-rooms/{chatRoomId}`
- `GET /v1/admin/parties/{partyId}/messages`

즉, 운영 화면에서 필요한 공개 채팅방 전체 목록/상세/메시지 조회와 파티 채팅 이력 조회까지는 가능하다.
남은 gap은 멤버 관리와 공지성 운영 액션 중심이다.

추가 필요 API:

| 우선순위 | 제안 API | 목적 |
|---|---|---|
| P1 | `GET /v1/admin/chat-rooms/{chatRoomId}/members` | 멤버 목록 조회 |
| P2 | `DELETE /v1/admin/chat-rooms/{chatRoomId}/members/{memberId}` | 관리자 강제 퇴장 |
| P2 | `POST /v1/admin/chat-rooms/{chatRoomId}/messages/system` | 운영 공지/경고 메시지 |
| P3 | `PATCH /v1/admin/chat-rooms/{chatRoomId}` | 이름/설명/노출 상태 수정 |

### 3.5 게시물 관리

현재 상태:

- 2026-03-29 기준 backend P1 계약이 구현됐다.
  - `GET /v1/admin/posts`
  - `GET /v1/admin/posts/{postId}`
  - `PATCH /v1/admin/posts/{postId}/moderation`
  - `GET /v1/admin/comments`
  - `PATCH /v1/admin/comments/{commentId}/moderation`
- `/boards` 화면은 이제 관리자 목록/상세/게시글 moderation/댓글 moderation을 실제 API 기준으로 구현할 수 있다.
- moderation 상태는 `VISIBLE`, `HIDDEN`, `DELETED`를 사용한다.
- `DELETED`는 기존 soft delete를 재사용하고, `HIDDEN`은 public 조회에서만 제외/마스킹된다.
- pin/공지 고정과 신고 연계 운영 뷰는 아직 backend 범위에 포함되지 않았다.

남은 필요 API:

| 우선순위 | 제안 API | 목적 |
|---|---|---|
| P2 | `GET /v1/admin/posts/{postId}/reports` | 신고 연계 운영 뷰 |

### 3.6 학교 공지 운영

현재 상태:

- `GET /v1/notices`
- `GET /v1/notices/{noticeId}`
- `POST /v1/admin/notices/sync`

학교 공지 목록과 sync 실행은 구현 가능하다.
다만 운영 이력이나 sync 상태를 보기 위한 API는 아직 없다.

추가 필요 API:

| 우선순위 | 제안 API | 목적 |
|---|---|---|
| P3 | `GET /v1/admin/notices/sync-history` | 최근 sync 결과 추적 |
| P3 | `GET /v1/admin/notices/{noticeId}` | 관리자 보조 메타 포함 상세 |

### 3.7 강의 bulk 운영

현재 상태:

- `POST /v1/admin/courses/bulk`
- `DELETE /v1/admin/courses`
- 관리자 bulk 업로드는 공식 강의에도 `isOnline`을 사용할 수 있다.
- `isOnline=true`인 공식 강의는 현재 직접 입력 온라인 강의와 같은 의미로 취급되며, `/v1/courses`와 `/v1/timetables/my`에 실제 값이 반영된다.
- 공식 강의(`Course`)와 직접 입력 강의(`UserTimetableManualCourse`)는 저장 모델을 분리한 채 유지한다.

남은 필요 API:

- 없음. 강의 bulk 운영의 현재 범위에는 추가 backend 갭이 없다.

### 3.8 학사 일정 운영

현재 상태:

- 2026-03-29 기준으로 아래 API만으로 학사 일정 운영 범위를 구현할 수 있다.
  - `GET /v1/academic-schedules`
  - `POST /v1/admin/academic-schedules`
  - `PUT /v1/admin/academic-schedules/{scheduleId}`
  - `DELETE /v1/admin/academic-schedules/{scheduleId}`
  - `PUT /v1/admin/academic-schedules/bulk`
- 새 bulk sync는 `scopeStartDate ~ scopeEndDate` 범위 안의 기존 일정만 대상으로 한다.
- 자연키는 `title + startDate + endDate + type`이며, `description`, `isPrimary`만 변경 가능 필드다.
- legacy 업로드 스크립트 호환을 위해 bulk API는 `single | multi | SINGLE | MULTI`를 모두 허용한다.

남은 필요 API:

- 없음. 학사 일정 운영의 현재 범위에는 추가 backend 갭이 없다.

### 3.9 신고 운영

현재 상태:

- 현재 계약 기준으로 목록/필터/페이지네이션과 상태 처리 UI를 구현했다.
- 즉시 필요한 핵심 갭은 해소되었고, 남은 것은 운영 편의성 보강 수준이다.

추가로 있으면 좋은 API:

| 우선순위 | 제안 API | 목적 |
|---|---|---|
| P2 | `GET /v1/admin/reports/{reportId}` | 목록에 없는 부가 정보까지 포함한 상세 조회 |
| P2 | `GET /v1/admin/reports/stats` | 상태별 건수 카드와 대시보드 집계 |
| P3 | `GET /v1/admin/reports/{reportId}/history` | 상태 변경 이력/감사 로그 조회 |

## 4. placeholder 정책

백엔드 API가 준비되기 전까지 프론트는 아래 정책을 따른다.

1. 라우트는 먼저 만든다.
2. 표/필터/액션 UI는 최종 형태를 보여주되 실제 제출은 막는다.
3. 화면 내에 "백엔드 API 확장 필요" 상태를 명시한다.
4. 필요한 API 이름과 목적을 화면 또는 관련 문서에서 바로 확인 가능하게 둔다.

## 5. 백엔드 요청 시 확인할 정책

새 API를 요청할 때 아래 항목을 반드시 함께 정해야 한다.

1. 관리자 override 범위
2. 감사 로그 저장 형식
3. 검색/정렬/페이지네이션 규약
4. 개인정보 마스킹 규칙
5. 상태 변경 실패 시 표준 에러 코드

## 6. 프론트 관점에서 가장 먼저 필요한 백엔드 확장 순서

1. `PATCH /v1/admin/join-requests/{requestId}/approve-or-decline`
2. `GET /v1/admin/chat-rooms/{chatRoomId}/members`
3. `PATCH /v1/admin/members/{memberId}/status`
4. `GET /v1/admin/posts/{postId}/reports`
