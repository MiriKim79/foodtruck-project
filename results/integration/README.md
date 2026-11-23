# 통합 실험 재현 메모 (공개 시드 2026~2030, 20경기/조합)

임시 환경(저장소 밖)에 `java/`, `src/`, `run.js`를 복사하고 `teams/B` = main의 기준 전략(고정 상대)으로 구성한 뒤
`harness.js <변형> B`로 실행했습니다 (`run.js`의 `match()` 호출, 엔진·실행기 무변경). `an.js`는 집계 스크립트입니다.
변형은 `teams/A/MyStrategy.java`의 상수만 바꾼 복사본입니다 (ORDER_GATE / COOK_MODE / PROMOTION_LIMIT / PROMO_END_MARGIN).

| 이름 | 게이트 | 제조 | 홍보제한 | 비고 |
|---|---|---|---|---|
| M | - | - | - | 기존 main (기준) |
| C2 | ON | FCFS | OFF | 접수 C (통합 기본값) |
| C3 | ON | SJF | OFF | |
| C4 | ON | DP | OFF | |
| C5 | ON | FCFS | ON | |
| C6 | ON | DP | ON | |
| D1 / D2 / D3 | OFF | DP / SJF / DP | OFF / OFF / ON | 추가 비교 |
| E1 / E2 / E3 | ON / OFF / OFF | FCFS / DP / FCFS | OFF | E1·E2는 PROMO_END_MARGIN=8, E3는 main과 동일 동작 확인용 |
| P2 / P3 / P4 | - | - | - | 각 PR의 원본 코드 (수치 재현 확인용) |

`raw/*.json`: 경기별 원자료. 시드 2026~2030만 사용했고 신규 검증 시드는 사용하지 않았습니다.
