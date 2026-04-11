# 헬린이맵

헬린이맵은 `지도 위에서 운동시설을 탐색하고`, `리뷰/제보/외부 텍스트 기반으로 시설 정보를 보강하는` 운동시설 지도 서비스입니다.

핵심 방향은 일반적인 목록형 서비스가 아니라, `거지맵 스타일의 full-screen map + overlay panel UI`를 유지하면서 실데이터 중심으로 탐색 경험을 만드는 것입니다.

## 현재 상태 요약

- 지도는 항상 전체 화면 배경으로 렌더링됩니다.
- 상단 헤더, 티커, 필터 버튼군, 좌우 패널, 하단 탭은 모두 지도 위 overlay 구조입니다.
- Supabase `gyms` 실데이터를 viewport 기준으로 조회합니다.
- 전국 전체 preload는 하지 않고, 현재 지도 bounds 안의 시설만 가져옵니다.
- 데스크탑에서는 좌측 상세 패널, 모바일에서는 바텀시트 중심으로 동작합니다.
- 하단 탭은 현재 `맵 / 커뮤니티` 2개만 유지합니다.
- 커뮤니티는 익명 닉네임 + 글 비밀번호 기반 수정/삭제 흐름을 사용합니다.
- 개인정보처리방침 링크는 우측 하단 작은 floating pill로만 노출합니다.

## 주요 페이지

- `/`
  지도 메인 페이지. 실데이터 운동시설 마커, 좌측 패널, 우측 정보 패널, 필터 팝오버, floating 탭바가 포함됩니다.
- `/community`
  커뮤니티 메인. 일반 글과 핫딜을 카테고리 탭으로 함께 보여줍니다.
- `/community/[id]`
  글 상세. 댓글, 대댓글, 글 비밀번호 기반 수정/삭제를 제공합니다.
- `/hotdeals`
  기존 핫딜 전용 페이지. 현재는 유지되지만 주요 진입은 커뮤니티 카테고리로 흡수되는 방향입니다.
- `/report`
  시설 제보 / 핫딜 제보 진입점입니다.
- `/privacy`
  개인정보처리방침 페이지입니다.

## 최근 큰 변경 맥락

### 1. 지도 UI / 패널 구조

- 기존 split layout을 제거하고 `full-screen map + overlay panels` 구조로 정리했습니다.
- 상단 헤더, 티커, 필터 영역은 glass 스타일로 구성했습니다.
- 좌측 패널 상태는 아래 5단계를 사용합니다.

```ts
'ranking' | 'list' | 'favorites' | 'detail' | 'closed'
```

- 시설 선택 시 패널 뒤로 마커가 가려지지 않도록 지도 중심 보정 로직이 들어가 있습니다.
- 최근에는 과도한 좌우 이동을 줄이기 위해 panel open 시 map pan offset을 최소화하는 쪽으로 조정 중입니다.
- 리뷰가 많지 않은 시설도 한줄 요약, 가격, 운영 정보, 이용자 반응을 한 패널 안에서 볼 수 있게 상세 패널을 확장했습니다.

### 2. 실데이터 전환 및 조회 안정화

- mock 장소 데이터 중심 구조를 줄이고, Supabase `gyms` 실데이터를 viewport 기준으로 조회하도록 바꿨습니다.
- 지도는 `idle` 이벤트 기준으로 bounds 재조회하며, 너무 넓은 영역은 확대 유도 메시지를 보여줍니다.
- `useViewportGyms()`에는 stale request 방지, 중복 fetch 억제, `hasFetched` 상태를 넣어 로딩/빈상태 CTA가 너무 자주 뜨지 않게 조정했습니다.
- 필터가 켜진 상태에서 지도를 옮기면 전체 데이터가 다시 보이던 문제를 줄이기 위해 서버-side query limit과 fetch dedupe도 보강했습니다.

### 3. 커뮤니티 / 핫딜 정리

- 하단 탭 명칭을 `헬린이방`에서 `커뮤니티`로 정리했습니다.
- 광고가 실제로 없을 때는 빈 광고 슬롯을 렌더하지 않도록 정리했습니다.
- 커뮤니티 카테고리는 현재 아래 묶음을 기준으로 처리합니다.

```text
헬스
필라테스·요가
크로스핏
러닝
수영
운동용품
루틴/팁
자유
핫딜
```

- 기존 raw 카테고리 값은 DB/API 내부에서 유지될 수 있지만, UI와 조회는 위 묶음 기준으로 처리합니다.
- 글 수정/삭제는 `글 비밀번호` 기반으로 동작합니다.
- 핫딜은 별도 route도 남아 있지만, 서비스 UX상으로는 커뮤니티 카테고리로 통합하는 방향입니다.

### 4. 제보 / 리뷰 기반 정보 보강

- 시설 제보는 익명으로 저장됩니다.
- 안내 문구는 `익명으로 제보되며, 관리자 검토 후 지도에 반영됩니다.`를 유지합니다.
- 가격 입력은 `일일권 / 월이용권 / 연회원권` 중 하나를 선택하고 숫자를 입력하는 방식입니다.
- `모름 / 없음` 체크 시 가격 선택과 입력이 비활성화됩니다.
- 리뷰/제보에서는 `헬린이가 많아요 / 영업 별로 안해요 / 가성비가 좋아요` 같은 신호를 배지 후보로 활용합니다.

### 5. 외부 텍스트 + AI 배지 파이프라인

- 내부 `reviews`, `reports` 뿐 아니라 외부 검색 API 텍스트를 `external_reviews` raw layer에 적재합니다.
- 그 위에서:
  - `gym_text_evidence`
  - `gym_label_candidates`
  - `gym_labels`
  - `gym_scores`
  - `gym_summaries`
  순으로 점진적 파이프라인을 구축했습니다.
- 외부 raw가 실제로 붙은 gym만 저비용 모델로 분류하는 방식이라, 전수 분류보다 비용을 크게 낮췄습니다.

## 기술 스택

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase
- Kakao Maps SDK
- Kakao Local API
- Naver Search API
- Kakao Daum Search API
- OpenAI API (`gpt-5.4-nano` 또는 유사 저비용 분류 모델)

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

`.env.local.example` 기준:

```bash
NEXT_PUBLIC_KAKAO_MAP_KEY=
KAKAO_REST_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NAVER_SEARCH_CLIENT_ID=
NAVER_SEARCH_CLIENT_SECRET=
OPENAI_API_KEY=
TURNSTILE_SECRET_KEY=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
```

필수에 가까운 값:

- `NEXT_PUBLIC_KAKAO_MAP_KEY`
  지도 SDK 로드용
- `KAKAO_REST_API_KEY`
  seed 스크립트와 Daum 검색 API 호출용
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
  seed, 서버 측 상세 조회, DB 반영에 필요
- `NAVER_SEARCH_CLIENT_ID`
- `NAVER_SEARCH_CLIENT_SECRET`
  external raw 텍스트 수집용
- `OPENAI_API_KEY`
  AI 한줄평 / 배지 후보 분류용

## 데이터 적재

### gyms seed 대상 도시

현재 `cityBounds.cjs` 기준 주요 대상은 아래입니다.

- 서울
- 부산
- 인천
- 대구
- 대전
- 광주
- 울산
- 수원
- 성남
- 용인
- 화성
- 부천
- 남양주
- 안산
- 평택
- 안양
- 시흥
- 고양
- 의정부
- 김포
- 광명
- 하남
- 군포
- 의왕
- 청주
- 천안
- 창원
- 전주
- 포항
- 원주
- 춘천

### seed 실행

```bash
npm run seed:gyms -- --city=seoul
npm run seed:gyms -- --city=busan
npm run seed:gyms -- --city=all
```

seed 로직 특징:

- 도시 bbox를 작은 rect tile로 나눕니다.
- 각 tile에서 카카오 로컬 API keyword search를 수행합니다.
- 키워드는 `헬스장 / 피트니스 / PT / 필라테스 / 크로스핏 / 요가 / 수영장`입니다.
- 결과는 `external_place_id` 기준 upsert 됩니다.
- `source`는 `kakao_local`로 저장합니다.
- 전국 전체 preload는 하지 않습니다.

관련 스크립트:

- `scripts/seed/cityBounds.cjs`
- `scripts/seed/kakaoLocal.cjs`
- `scripts/seed/seedMajorCities.cjs`

## viewport 기반 지도 조회 흐름

1. `KakaoMap`이 `idle` 이벤트에서 현재 bounds를 읽습니다.
2. `MapPage`가 현재 필터 상태와 bounds를 `useViewportGyms()`에 전달합니다.
3. `useViewportGyms()`가 `/api/gyms`를 호출합니다.
4. 서버는 `gyms`에서 현재 visible bounds 안의 데이터만 조회합니다.
5. 마커 렌더링에는 최소 필드만 사용합니다.
6. 시설을 선택하면 상세 정보는 `/api/gyms/[id]`로 lazy fetch 합니다.

핵심 원칙:

- 전국 전체 preload 금지
- visible bounds 기준 조회
- UI 흐름 유지
- 시설 클릭 시 선택/상세 패널 상태 유지
- stale request와 중복 fetch 억제

## 시설 분류 규칙

실제 카카오 장소명과 category 값이 항상 깔끔하지 않아서, 현재는 이름/원본 category/검색 keyword를 함께 보고 정규화합니다.

대표 규칙:

- `요가`가 들어가면 `요가`
- `필라테스`, `필라`가 들어가면 `필라테스`
- `크로스핏`이 들어가면 `크로스핏`
- `클라이밍`, `볼더`가 들어가면 `클라이밍`
- `수영`, `스윔`, `swim`, `풀`, `pool`, `물놀이`, `스쿠버`, `다이빙`은 `수영`
- `헬스`, `짐`, `gym`, `피트니스`, `스포`, `바디`, `머슬`, `웨이트`, `체육`, `체육관`, `체력단련장`, `스포츠센터` 등은 `헬스`
- 위 기준으로도 분류가 애매하면 마커는 업체명 대신 `기타`로 표시

노이즈 제외 예:

- 워터파크
- 워터월드
- 해수욕장
- 분수
- 아쿠아리움

관련 파일:

- `src/lib/gymCategory.ts`
- `scripts/seed/kakaoLocal.cjs`
- `src/components/map/KakaoMap.tsx`

## 리뷰 / 배지 / 점수 파이프라인

### 개요

현재 배지 파이프라인은 아래 흐름을 가집니다.

```text
reviews / reports / external_reviews
-> gym_text_evidence
-> gym_label_candidates
-> gym_labels (published)
-> gym_scores / gym_summaries
```

### 핵심 테이블

- `external_reviews`
  검색 API 기반 raw 텍스트 저장소
- `gym_text_evidence`
  리뷰/제보/외부 텍스트에서 추출한 중간 evidence
- `gym_label_candidates`
  공개 전 label 후보
- `gym_labels`
  실제 지도/UI에서 노출하는 published badge
- `gym_scores`
  추천 정렬용 내부 점수
- `gym_summaries`
  시설 한줄 요약

### 현재 사용하는 공개 배지

- `beginner_friendly`
- `introvert_friendly`
- `value_friendly`

UI 노출은 카테고리에 따라 조금 다르게 표현합니다.

- 헬스 카테고리: `헬린이 친화`
- 그 외 카테고리: `초보 친화`

### 배지 / 점수 스크립트

```bash
npm run reviews:fetch
npm run badges:evidence
npm run pricing:normalize
npm run badges:ai-candidates
npm run badges:candidates
npm run badges:publish
npm run scores:gyms
```

예시:

```bash
npm run reviews:fetch -- --city=서울 --categories=gym
npm run badges:evidence -- --city=서울 --categories=gym
npm run pricing:normalize -- --city=서울 --categories=gym
npm run badges:ai-candidates -- --city=서울 --categories=gym --aiBudgetUsd=5
npm run badges:candidates -- --city=서울 --categories=gym
npm run badges:publish -- --city=서울 --categories=gym
npm run scores:gyms -- --city=서울 --categories=gym
```

## 커뮤니티 동작 방식

### 글쓰기

- 익명 닉네임은 자동 생성되며 사용자가 수정할 수 있습니다.
- 글 작성 시 비밀번호가 필요합니다.
- 같은 글을 수정/삭제할 때 동일한 비밀번호를 사용합니다.

### 댓글

- 익명 닉네임 기반 댓글 작성
- 한 단계 대댓글 지원
- 리뷰/평가 UX는 현재 별도 정리 작업이 진행 중입니다.
- 커뮤니티 UI는 광고가 실제로 연결되기 전까지 빈 슬롯을 렌더하지 않습니다.

## 제보 동작 방식

- 시설 제보는 `reports` 테이블에 저장됩니다.
- 현재 서비스 문구는 `익명으로 제보되며, 관리자 검토 후 지도에 반영됩니다.` 입니다.
- 즉시 지도 반영 구조가 아니라 검토 후 반영 구조입니다.
- 가격 제보는 `일일권 / 월이용권 / 연회원권` 중 하나를 선택해 저장합니다.

## 주요 파일 구조

```text
src/app
  /                지도 메인
  /community       커뮤니티 메인
  /community/[id]  커뮤니티 상세
  /hotdeals        기존 핫딜 페이지
  /report          제보
  /privacy         개인정보처리방침
  /api/gyms        viewport gyms 조회
  /api/gyms/[id]   gym 상세 조회
  /api/posts       커뮤니티 글 API
  /api/comments    댓글 API
  /api/reports     제보 API
  /api/reviews     리뷰 API
  /api/hotdeals    핫딜 API

src/components/map
  MapPage.tsx
  KakaoMap.tsx
  GymDetailPanel.tsx

src/components/gym
  GymCard.tsx
  GymFilter.tsx
  ReviewSection.tsx

src/components/ui
  BrandLockup.tsx
  FloatingTabBar.tsx
  NavBar.tsx
  StarRating.tsx

src/lib
  gyms.ts
  gymCategory.ts
  session.ts
  badges/
  pricing/
  scoring/
  supabase/

scripts/seed
  cityBounds.cjs
  kakaoLocal.cjs
  seedMajorCities.cjs

scripts/reviews
  fetchExternalReviews.cjs

scripts/badges
  normalizeEvidence.cjs
  classifyCandidatesWithAI.cjs
  computeCandidates.cjs
  publishGymLabels.cjs

scripts/pricing
  normalizeGymPrices.cjs

scripts/scoring
  computeGymScores.cjs
```

## migration 파일

현재 repo에 포함된 주요 migration:

- `20260409_gym_indexes.sql`
- `20260409_gym_category_cleanup.sql`
- `20260409_post_categories.sql`
- `20260409_comment_threads.sql`
- `20260409_post_passwords.sql`
- `20260409_review_media_passwords.sql`
- `20260409_review_report_rating_signals.sql`
- `20260409_badge_pipeline_mvp.sql`
- `20260409_external_reviews_pipeline.sql`

운영 DB에 아직 적용되지 않았다면 실제 기능 동작 전 반드시 반영해야 합니다.

## 운영 메모

- `src/middleware.ts`는 Next 16 기준 deprecation warning이 있습니다.
  현재 빌드는 되지만, 추후 `proxy`로 전환하는 게 좋습니다.
- 개인정보처리방침 링크는 의도적으로 우측 하단 작은 floating pill에만 두었습니다.
- 지도/커뮤니티의 전체 톤은 통일하되, 서비스 경험의 중심은 계속 지도입니다.
- UI를 다시 손볼 때도 `지도 full-screen background + overlay panel` 원칙은 유지하는 편이 좋습니다.
- 현재 진행 중인 우선순위는 데이터 추가보다도 `모바일 겹침`, `패널 열림 UX`, `리뷰/제보 입력 경험`, `가격 표시 정확성` 같은 서비스 품질 보정입니다.

## 다음 작업 후보

- map panel open 시 과도한 중심 이동 최소화
- 모바일 overlay / 상단 버튼 / safe-area spacing 재정리
- 리뷰 작성과 별점 평가를 `평가하기` 단일 흐름으로 통합
- 제보 페이지 별점 UI 개선
- 관리자 검토 후 `reports -> gyms/gym_prices` 승인 플로우 구현
- `middleware -> proxy` 전환

## 참고

이 프로젝트는 현재 `기능을 새로 만드는 것`보다 `기존 흐름을 유지하면서 실데이터 연결과 UX 정리`를 우선하는 방향으로 진행 중입니다.
