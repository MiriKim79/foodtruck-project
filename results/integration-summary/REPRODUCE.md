# 검증 재현 방법

## 실험 구성 (엔진·실행기·평가기 무변경)
- 저장소 밖 임시 폴더에 `java/`, `src/`, `run.js`를 복사한다 (`run.js`의 `match()`/`compile()`을 하네스가 호출).
- **상대 `teams/B`**: main 기준 전략 = `git show main:teams/A/MyStrategy.java` (main `7882840`). 저장소에 `teams/B`가 없어 이 파일을 고정 상대로 사용했다.
- **실험 대상 `teams/<변형>`**: `teams/A/MyStrategy.java`에서 상수 `ORDER_GATE`, `COOK_MODE`, `PROMOTION_LIMIT`(, `PROMO_END_MARGIN`)만 `sed`로 바꾼 복사본.
  변형 이름: `results/integration/README.md` 표 참조 (M=main, C2=접수ON/FCFS, D1=접수OFF/DP=최종 후보 등).
- 경기 조건: 시드마다 `[변형,B]`/`[B,변형]` 자리 × 좌우반전 = 4경기. 시드는 하네스 인자로 지정.

## 명령 (임시 폴더에서)
```bash
# 컴파일 (최초 1회)
node -e "const R=require('./run.js');['B','M','C2','D1'].forEach(t=>R.compile(t))"
# 경기 실행: harness.js <변형> B <시드 목록>  (실행 위치의 out/에 JSON 저장, 컴파일 생략: SKIPC=1)
SKIPC=1 node harness.js D1 B 2026,2027,2028,2029,2030          # 공개
SKIPC=1 node harness.js D1 B $(seq -s, 4001 4020)               # 신규
SKIPC=1 node harness.js D1 B $(seq -s, 5001 5030)               # 홀드아웃
```
`harness.js`는 `results/integration/harness.js` 한 벌만 보관한다 (다른 결과 폴더의 사본은 동일 파일이라 커밋하지 않았다).

## 요약 재생성 (저장소 루트에서)
```bash
node results/integration-summary/make_summary.js   # summary.csv, paired_final_vs_gate_on.csv 생성
```
시드 단위 짝비교(시드당 4경기 평균의 차이) + 95% 부트스트랩(10,000회, 고정 난수열). 시드 20·30개 기준의 구간이며 경기 80·120개를 독립 표본으로 보지 않았다.

## 코드 버전
- 실험은 `feat/integration` `4475ae5` 시점 코드의 상수 치환 복사본으로 실행했다.
- 최종 코드 `dbc68d0`는 위 코드에서 상수 2개(`ORDER_GATE=false`, `COOK_MODE="DP"`)만 다르다. 최종 코드와 홀드아웃에 쓴 D1 복사본은 주석 한 줄만 다르고 로직이 동일함을 `diff`로 확인했으며, 최종 코드를 공개 시드 20경기로 다시 실행해 경기별 매출·완료·환불이 D1과 모두 일치했다.
- 환경: JDK 17.0.19, Node 24.18, Windows 11. `max_choose_ms`는 여러 프로세스를 동시에 실행한 값이며 단독 실행 시 약 60~80ms였다.

## 원자료 위치
| 집합 | 위치 |
|---|---|
| 공개 2026~2030 | `results/integration/raw/` |
| 신규 4001~4020 | `results/integration-validation-4001-4020/raw/` |
| 홀드아웃 5001~5030 | `results/integration-holdout-5001-5030/raw/` |
(JSON 각 약 110~125KB, 합계 약 350KB → 커밋 적합)
