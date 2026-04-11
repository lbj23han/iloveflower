# 꽃놀이맵

꽃놀이맵은 `지도 위에서 전국 꽃놀이 명소를 탐색하고`, `개화 현황·시설 정보·리뷰를 한눈에 확인하는` 꽃 명소 지도 서비스입니다.

full-screen map + overlay panel UI를 기반으로 실데이터 중심의 탐색 경험을 제공합니다.

## 현재 상태 요약

- 지도는 항상 전체 화면 배경으로 렌더링됩니다.
- 상단 헤더, 필터 버튼군, 좌우 패널, 하단 탭은 모두 지도 위 overlay 구조입니다.
- Supabase `flower_spots` 실데이터를 viewport 기준으로 조회합니다.
- 전국 전체 preload는 하지 않고, 현재 지도 bounds 안의 명소만 가져옵니다.
- 개화 상태에 따라 마커 색상이 달라집니다 (만개 → 핑크, 낙화 → 연핑크 등).
- 데스크탑에서는 좌측 상세 패널, 모바일에서는 바텀시트 중심으로 동작합니다.
- 하단 탭은 `맵 / 커뮤니티` 2개입니다.
- 커뮤니티는 익명 닉네임 + 글 비밀번호 기반 수정/삭제 흐름을 사용합니다.

## 주요 페이지

- `/`
  지도 메인. 꽃 명소 마커, 좌측 패널, 필터 팝오버, floating 탭바가 포함됩니다.
- `/gyms/[id]`
  명소 상세. 개화 현황, 꽃 종류, 시설 정보, 리뷰, 카카오맵 길찾기를 제공합니다.
- `/community`
  커뮤니티 메인. 꽃 카테고리(벚꽃·매화·진달래·유채꽃·코스모스)별 글을 탭으로 분류합니다.
- `/community/[id]`
  글 상세. 댓글, 대댓글, 글 비밀번호 기반 수정/삭제를 제공합니다.
- `/report`
  명소 제보 진입점입니다.
- `/privacy`
  개인정보처리방침 페이지입니다.

## 기술 스택

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase
- Kakao Maps SDK
- Kakao Local API

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 열면 됩니다.

### 검증 명령어

```bash
npm run lint
npm run build
```

## 환경 변수

`.env.local` 기준:

```bash
NEXT_PUBLIC_KAKAO_MAP_KEY=        # 지도 SDK 로드용
KAKAO_REST_API_KEY=               # Kakao Local API 호출용
NEXT_PUBLIC_SUPABASE_URL=         # Supabase 프로젝트 URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=        # 서버 측 DB 접근용
OPENAI_API_KEY=                   # (선택) AI 기능 사용 시
TURNSTILE_SECRET_KEY=             # (선택) 봇 방지
NEXT_PUBLIC_TURNSTILE_SITE_KEY=   # (선택) 봇 방지
ADMIN_SECRET=                     # 어드민 API 인증
```

## 데이터베이스 스키마 적용

Supabase 프로젝트 생성 후 SQL Editor에서 실행:

```bash
supabase/schema.sql
```

주요 테이블:

- `flower_spots` — 꽃 명소 기본 정보
- `bloom_status` — 연도별 개화 현황 (status, bloom_pct)
- `festivals` — 명소별 축제 일정
- `spot_reviews` — 방문 리뷰 (별점, 신호, 이미지)
- `spot_reports` — 사용자 제보
- `votes` — 좋아요/별로 투표
- `community_posts` — 커뮤니티 글
- `post_comments` — 댓글/대댓글

## viewport 기반 지도 조회 흐름

1. `KakaoMap`이 `idle` 이벤트에서 현재 bounds를 읽습니다.
2. `MapPage`가 현재 필터 상태와 bounds를 `useViewportSpots()`에 전달합니다.
3. `useViewportSpots()`가 `/api/gyms`를 호출합니다.
4. 서버는 `flower_spots`에서 현재 visible bounds 안의 데이터만 조회합니다.
5. 마커 렌더링에는 최소 필드만 사용합니다.
6. 명소 클릭 시 상세 정보는 `/api/gyms/[id]`로 lazy fetch 합니다.

핵심 원칙:

- 전국 전체 preload 금지
- visible bounds 기준 조회
- stale request와 중복 fetch 억제
- 명소 클릭 시 선택/상세 패널 상태 유지

## 필터 기능

- **꽃 종류** — 벚꽃·매화·개나리·진달래·등나무·장미·코스모스·해바라기·튤립·라벤더·유채꽃
- **개화 현황** — 개화 전·봉오리·개화 중·만개·낙화 중·종료
- **카테고리** — 공원·산·강변/호수·수목원·가로수길·사찰·농장·기타
- **시설** — 야간조명·주차 가능·반려동물·포토스팟·무료입장
- **정렬** — 추천순·거리순·개화순

## 커뮤니티 동작 방식

- 익명 닉네임 자동 생성, 사용자가 수정 가능
- 글 작성 시 비밀번호 필요 (수정/삭제 시 사용)
- 카테고리: 벚꽃 / 매화·봄꽃 / 진달래·철쭉 / 유채꽃 / 코스모스 / 꽃놀이 팁 / 자유
- 한 단계 대댓글 지원

## 제보 동작 방식

- 명소 제보는 `spot_reports` 테이블에 저장됩니다.
- 관리자 검토 후 지도에 반영됩니다.
- 어드민 페이지(`/admin/reports`)에서 제보 승인 시 `bloom_status` 및 명소 정보가 자동 업데이트됩니다.

## 주요 파일 구조

```text
src/app
  /                  지도 메인
  /gyms/[id]         명소 상세
  /community         커뮤니티 메인
  /community/[id]    커뮤니티 상세
  /report            제보
  /admin/reports     어드민 제보 관리
  /privacy           개인정보처리방침
  /api/gyms          viewport 명소 조회
  /api/gyms/[id]     명소 상세 조회
  /api/votes         투표 API
  /api/reviews       리뷰 API
  /api/reports       제보 API
  /api/posts         커뮤니티 글 API
  /api/comments      댓글 API
  /api/admin/reports 어드민 제보 API

src/components/map
  MapPage.tsx
  KakaoMap.tsx
  GymDetailPanel.tsx   (SpotDetailPanel)

src/components/gym
  GymCard.tsx          (SpotCard)
  GymFilter.tsx        (SpotFilter)
  ReviewSection.tsx
  VoteButtons.tsx

src/components/ui
  BrandLockup.tsx
  FloatingTabBar.tsx
  StarRating.tsx

src/lib
  spots.ts             명소 조회 함수
  session.ts           익명 세션 관리
  supabase/

src/types/index.ts     FlowerSpot, FlowerSpotMapItem, FlowerSpotWithDetails 등
supabase/schema.sql    전체 DB 스키마 + RLS 정책
```
