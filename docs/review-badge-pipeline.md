# Review Badge Pipeline

`gyms` 실데이터를 기준으로 외부 리뷰 raw 저장 -> evidence 생성 -> 가격 정규화 -> candidate 계산 -> published label 반영 -> gym score 계산까지 이어지는 1차 배치 문서입니다.

룰 기반 evidence만으로 신호가 약할 때는 `AI 후보 분류`를 추가로 돌릴 수 있습니다. 이 단계는 `external_reviews`, `reviews`, `reports`, `gym_prices`를 묶어서 `gym_label_candidates`와 `gym_summaries`를 직접 채웁니다.

기본값으로는 비용 보호를 위해 아래 제한이 자동 적용됩니다.
- 약한 신호 gym은 AI 호출 대상에서 제외
- 시설당 snippet 최대 8개
- AI 분류 배치 기본 예산 상한: `$8`

## 필요한 환경 변수

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NAVER_SEARCH_CLIENT_ID`
- `NAVER_SEARCH_CLIENT_SECRET`
- `KAKAO_REST_API_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (optional, default: `gpt-5.4-nano`)

## 1차 샘플 실행

```bash
npm run reviews:fetch -- --city=서울 --limit=40
npm run badges:evidence -- --city=서울 --limit=40
npm run pricing:normalize -- --city=서울 --limit=40
npm run badges:ai-candidates -- --city=서울 --limit=40
npm run badges:candidates -- --city=서울 --limit=40
npm run badges:publish -- --city=서울 --limit=40
npm run scores:gyms -- --city=서울 --limit=40
```

## 특정 gym_id만 실행

```bash
npm run reviews:fetch -- --gymIds=<gym_id_1>,<gym_id_2>
npm run badges:evidence -- --gymIds=<gym_id_1>,<gym_id_2>
npm run pricing:normalize -- --gymIds=<gym_id_1>,<gym_id_2>
npm run badges:ai-candidates -- --gymIds=<gym_id_1>,<gym_id_2>
npm run badges:candidates -- --gymIds=<gym_id_1>,<gym_id_2>
npm run badges:publish -- --gymIds=<gym_id_1>,<gym_id_2>
npm run scores:gyms -- --gymIds=<gym_id_1>,<gym_id_2>
```

## dry-run

```bash
npm run reviews:fetch -- --city=서울 --limit=20 --dry-run
npm run badges:evidence -- --city=서울 --limit=20 --dry-run
npm run pricing:normalize -- --city=서울 --limit=20 --dry-run
npm run badges:ai-candidates -- --city=서울 --limit=20 --dry-run
npm run badges:candidates -- --city=서울 --limit=20 --dry-run
npm run badges:publish -- --city=서울 --limit=20 --dry-run
npm run scores:gyms -- --city=서울 --limit=20 --dry-run
```

## 처리 원칙

- 현재 `gyms`에 있는 시설만 대상으로 잡습니다.
- 외부 텍스트는 `네이버 블로그/카페`, `Daum 블로그/카페/웹문서` 검색 API로 수집합니다.
- 문서 매칭이 애매하면 `external_reviews.match_status = ambiguous / unmatched`로 저장하고 evidence 계산에서는 제외합니다.
- 같은 reviewer/hash + 유사 문구 반복은 uniqueness 감점으로 과대 반영을 줄입니다.
- `value_friendly`는 텍스트 감상문만으로 publish하지 않고, `gym_prices.normalized_monthly_price` 비교 결과를 우선 사용합니다.
- `badges:ai-candidates`는 룰 기반 evidence가 약한 경우에도 문맥을 읽어 후보를 만들어줄 수 있지만, 여전히 애매하면 false로 두도록 프롬프트를 보수적으로 설정했습니다.
- 기본 provider는 OpenAI nano 계열이며, 검색 API raw/내부 리뷰/제보/가격을 함께 읽어 `gym_label_candidates`와 `gym_summaries`를 채웁니다.

## 카테고리 범위 지정

공공 수영장/물놀이터처럼 매칭이 잘 안 되는 표본을 줄이려면 카테고리를 함께 제한할 수 있습니다.

```bash
npm run reviews:fetch -- --city=서울 --categories=gym,pilates,crossfit,yoga --limit=20
```

## AI 비용 제어

예산과 최대 분류 gym 수를 직접 제한할 수 있습니다.

```bash
npm run badges:ai-candidates -- --city=서울 --limit=200 --aiBudgetUsd=5
npm run badges:ai-candidates -- --city=서울 --limit=500 --aiBudgetUsd=8 --aiMaxGyms=250
```

- `--aiBudgetUsd`
  - 예상 비용 기준 상한
- `--aiMaxGyms`
  - 실제 AI 호출할 gym 수 상한
