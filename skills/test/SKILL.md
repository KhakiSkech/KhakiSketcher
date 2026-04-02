# /ksk:test — Test Strategy & Execution

테스트 작성, 실행, 커버리지 분석을 위한 전용 워크플로우.

## When to Use
- 새 기능 구현 후 테스트가 필요할 때
- 실패한 테스트의 원인을 분석할 때
- 커버리지 갭을 식별하고 싶을 때
- TDD 방식으로 개발할 때

## Workflow

### Step 1 — 테스트 전략 수립
1. 변경된 파일 또는 대상 모듈을 파악
2. test-engineer 에이전트에게 위임하여 테스트 전략 수립:
   - Unit / Integration / E2E 구분
   - 경계값 분석 (boundary value analysis)
   - 등가 분할 (equivalence partitioning)

### Step 2 — 테스트 작성 (Claude Sonnet)
- 기존 테스트 패턴 및 프레임워크 확인
- 단위 테스트 먼저, 통합 테스트는 필요 시

### Step 3 — 테스트 실행
```bash
# 프레임워크에 맞게 실행
npm test / npx vitest / npx jest / pytest / go test ./...
```

### Step 4 — 실패 분석
- 실패한 테스트가 있으면 test-engineer 에이전트로 근본 원인 파악
- `ksk_reason`으로 복잡한 실패 분석

### Step 5 — 커버리지 갭 식별
- 커버리지 리포트 확인
- 놓친 경계값 또는 에러 경로 식별
- 추가 테스트 작성

## Output Format
```
## Test Results
- Tests written: N
- Tests passing: N
- Tests failing: N
- Coverage: N%
- Gaps identified: [list]
```

## Notes
- 테스트는 실제 동작을 검증해야 함 (mock 최소화)
- 한 함수에 하나의 관심사만 테스트
- 테스트 이름은 "should do X when Y" 패턴으로

Task: {{ARGUMENTS}}
