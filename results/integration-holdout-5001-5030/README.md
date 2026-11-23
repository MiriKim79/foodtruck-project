# 최종 홀드아웃 검증 (시드 5001~5030, 전략당 120경기)
- 시드 5001~5030은 이 실험이 최초 사용 (저장소 문서·CSV·스크립트에서 사용 흔적 없음). 이후 튜닝 금지.
- 코드 버전: feat/integration @ 4475ae5 의 teams/A/MyStrategy.java (git blob sha1 f38769fc, 상수만 변경한 복사본으로 실행)
- 비교 변형: M = main 기준 전략(= 상대 B와 동일), C2 = ORDER_GATE=true/COOK_MODE=FCFS/PROMOTION_LIMIT=false,
  D1 = ORDER_GATE=false/COOK_MODE=DP/PROMOTION_LIMIT=false (PROMO_END_MARGIN=4) ← 최종 후보
- 상대: 항상 main 기준 전략 1종 (다른 상대는 미검증)
- 하네스: harness.js (run.js의 match() 호출, 엔진 무변경), 집계: an3.js (공개/신규/홀드아웃 3개 집합 모두 출력)
- raw/: 경기별 원자료
