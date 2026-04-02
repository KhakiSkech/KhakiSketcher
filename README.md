<h1 align="center">KhakiSketcher</h1>

<p align="center">
  <strong>확실한 개발을 위한 Multi-model 오케스트레이터</strong><br>
  Sonnet이 구현하고, Codex가 검증하고, Gemini가 확인한다.<br>
  <strong>Reliable development through cross-model verification.</strong>
</p>

<p align="center">
  <a href="https://github.com/KhakiSketch/KhakiSketcher/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/Claude%20Code-plugin-purple.svg" alt="Claude Code Plugin">
  <img src="https://img.shields.io/badge/context-~800_tokens-green.svg" alt="Low overhead">
  <img src="https://img.shields.io/badge/zero_dependencies-zero_build-brightgreen.svg" alt="Zero deps">
</p>

---

## KhakiSketcher가 해결하는 문제

**Sonnet 혼자서는 한계가 있습니다.**

복잡한 아키텍처 결정에서 논리적 오류를 놓치고, 스크린샷의 2px 어긋남을 볼 수 없고, 자신이 작성한 코드의 회귀 위험을 스스로 판단하기 어렵습니다.

KhakiSketcher는 **각 모델이 강한 것만 하도록** 분배합니다:

| 문제 | Sonnet 단독 | KhakiSketcher |
|------|-------------|---------------|
| 복잡한 버그 | 원인 파악 누락 가능 | Codex가 5-Whys 분석 → Sonnet이 수정 |
| 아키텍처 설계 | 경험에 의존 | Codex가 결합도/응집도 분석 → Sonnet이 구현 |
| UI 구현 | 시각적 검증 불가 | Gemini가 pixel 단위 QA → Sonnet이 수정 |
| 코드 리뷰 | 자기 검증의 한계 | Codex가 PASS/FAIL 판정 |

**핵심**: 자동화가 아닙니다. **교차 검증(Cross-validation)** 입니다.

---

## 모델 역할

| 모델 | 역할 | 비유 |
|------|------|------|
| **Claude Sonnet** | 구현 + 오케스트레이션 | 실무자 — 모든 코드를 직접 작성 |
| **Codex CLI** | Deep reasoning (Opus 대체) | 시니어 아키텍트 — 분석, 리뷰, 디버깅만 (코드 작성 안 함) |
| **Gemini CLI** | Vision 분석 | 디자이너/QA — 스크린샷, UI QA, 시각 비교만 (코드 작성 안 함) |

### 엄격한 정책

- **Sonnet만 코드를 작성합니다.** Codex와 Gemini는 절대 코드를 수정하지 않습니다.
- **필요한 순간에만** 외부 모델을 호출합니다. 간단한 작업은 Sonnet이 직접 처리합니다.
- CLI가 설치되지 않았거나 rate limit에 걸리면 **자동으로 다른 CLI로 fallback** 합니다.

---

## 동작 방식

### 기본 원리: Execute → Verify → Feedback Loop

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│  Sonnet  │────▶│  Codex  │────▶│  Sonnet  │
│ (구현)   │     │ (검증)  │     │ (수정)   │
└─────────┘     └─────────┘     └─────────┘
      ▲                               │
      └───────────────────────────────┘
              FAIL → 재시도 (max 3회)
              PASS → 완료
```

1. Sonnet이 코드를 구현합니다
2. 외부 모델(Codex/Gemini)이 결과를 검증합니다
3. PASS면 완료, FAIL이면 피드백 기반으로 수정 후 재검증

---

## 실제 사용 시나리오

### 1. 일반 구현 — 외부 모델 불필요

```
👤 "로그인 페이지 만들어줘"
👤 "Add a login page"

→ Sonnet이 직접 구현 → 완료
  (Codex/Gemini 개입 없음)
```

### 2. 복잡한 버그 — Codex 검증 루프

```
👤 "프로덕션에서만 간헐적으로 에러 나"
👤 "Intermittent crash in production"

1. Sonnet: 컨텍스트 수집 (에러 로그, 스택트레이스, 소스 코드)
2. Sonnet → codex exec "5-Whys 근본원인 분석"
3. Codex: 경쟁 가설 → 증거 → 근본원인 도출
4. Sonnet: 근본원인 기반 수정 구현
5. Sonnet: 테스트 실행 + 재현 테스트 작성
6. Sonnet → codex exec "회귀 리뷰 (PASS/FAIL 판정)"
7. PASS → 완료 / FAIL → 4번으로 복귀 (max 3회)
```

### 3. 아키텍처 리팩터링 — Codex 심층 분석

```
👤 "이 모듈 구조가 너무 엉망이야. 리팩터해줘"
👤 "Refactor this module structure"

1. Sonnet: 의존성 맵핑 (import chains, module boundaries)
2. Sonnet → codex exec "결합도/응집도 분석 + 마이그레이션 전략"
3. Codex: SOLID 위반, 순환 의존성, 변경 영향 범위 분석
4. Sonnet: 단계별 구현 계획 수립
5. Sonnet: 계획에 따라 단계별 구현 (각 단계마다 테스트)
6. Sonnet → codex exec "아키텍처 리뷰"
7. PASS → 완료 / FAIL → 수정 후 재리뷰 (max 3회)
```

### 4. UI 구현 — Gemini 시각 검증

```
👤 "이 목업대로 페이지 만들어줘"
👤 "Implement this mockup"

1. Sonnet → gemini -p @mockup.png "레이아웃/간격/색상 분석"
2. Gemini: grid system, spacing, typography, 접근성 분석
3. Sonnet: 분석 결과 기반 UI 구현
4. Sonnet → gemini -p @result.png @mockup.png "QA 비교"
5. Gemini: 0-100점 평가 + 차이점 나열
6. 85점 이상 → 완료 / 미만 → 수정 후 재검증 (max 3회)
```

### 5. 코드 리뷰 — Codex 구조화 판정

```
👤 "이 PR 리뷰해줘"
👤 "Review this PR"

1. Sonnet: git diff 수집
2. Sonnet → codex exec "구조화된 코드 리뷰"
3. Codex: 로직 결함, 보안, 성능, 컨벤션 검사
4. 판정: PASS / FAIL_MINOR / FAIL_MAJOR / FAIL_CRITICAL
5. PASS → 리뷰 완료
   FAIL_MINOR → Sonnet이 self-fix 후 재리뷰
   FAIL_MAJOR → 사용자에게 에스컬레이션
   FAIL_CRITICAL → 즉시 중단, 사용자 확인 필요
```

---

## Skill 목록

| Skill | 사용 시나리오 | 외부 CLI |
|-------|--------------|----------|
| `/ksk:plan` | Codex+Gemini 교차 검증 계획. 한 번에 완성 | `codex exec` + `gemini -p` |
| `/ksk:run` | 모든 작업의 진입점. 자동 분류 후 라우팅 | — |
| `/ksk:complex-debug` | 크래시, race condition, 간헐적 버그 | `codex exec` |
| `/ksk:architecture` | 구조 분석, 리팩터링, 마이그레이션 | `codex exec` |
| `/ksk:ui-redesign` | 목업 구현, 디자인 변경, UI 개선 | `gemini -p @image` |
| `/ksk:visual-qa` | Before/After 비교, pixel-level QA | `gemini -p @image` |
| `/ksk:code-review` | PR 리뷰, PASS/FAIL 구조화 판정 | `codex exec` |
| `/ksk:test` | 테스트 전략, 실행, 커버리지 분석 | — |

모든 Skill은 **검증 루프(verify loop)** 를 포함합니다: 분석 → 구현 → 테스트 → 리뷰 (최대 3회 반복).

---

## Agent 목록

| Agent | 역할 | 특징 |
|-------|------|------|
| `architect` | 아키텍처 분석 | 읽기 전용, Codex 호출 |
| `debugger` | 근본원인 분석 | 읽기 전용, 5-Whys 방법론 |
| `vision-analyst` | 시각 분석 | 읽기 전용, Gemini 호출 |

Agent는 **직접 코드를 수정하지 않습니다.** 분석 결과만 반환하며, 구현은 항상 Sonnet이 담당합니다.

---

## 자연어 라우팅

한국어/영어 자연어로 요청하면, Sonnet이 의도를 파악하여 적절한 Skill로 라우팅합니다:

| 사용자 요청 | 라우팅 |
|-------------|--------|
| "에러나" / "안돼" / "crash" / "bug" | 간단 → 직접 수정 / 복잡 → `/ksk:complex-debug` |
| "구조가 이상해" / "리팩터" / "refactor" | `/ksk:architecture` |
| "디자인 바꿔" / "목업대로" / "UI looks off" | `/ksk:ui-redesign` |
| "비교해봐" / "before/after" | `/ksk:visual-qa` |
| "리뷰해줘" / "검토" / "review" | `/ksk:code-review` |
| "만들어줘" / "추가" / "implement" | Sonnet 직접 처리 |
| "테스트" / "test" | `/ksk:test` |
| 판단 안 설 때 | `/ksk:run` (자동 분류) |

---

## 설치

### 사전 요구사항

- [Claude Code](https://claude.ai/code) CLI (필수)
- [Codex CLI](https://github.com/openai/codex) (선택 — reasoning용)
- [Gemini CLI](https://github.com/google-gemini/gemini-cli) (선택 — vision용)

### 플러그인 설치

```bash
claude plugin install https://github.com/KhakiSketch/KhakiSketcher
```

빌드 없음. npm install 없음. 마크다운 + 셸 스크립트만으로 동작합니다.

### 세션 시작 시 자동 감지

KhakiSketcher는 세션 시작 시 설치된 CLI를 자동 감지합니다:
- Codex + Gemini 모두 있음 → 전체 기능
- Codex만 있음 → reasoning 가능, vision은 text-only fallback
- Gemini만 있음 → vision 가능, reasoning은 Gemini가 대체
- 둘 다 없음 → Sonnet만으로 동작 ( 외부 검증 없음)

---

## 아키텍처

```
KhakiSketcher/
  CLAUDE.md                    라우팅 정책 (~800 토큰, 가벼운 컨텍스트)
  .claude-plugin/plugin.json   플러그인 메타데이터
  hooks/hooks.json             2개 훅 (session-init, security)
  agents/                      3개 Agent 정의
  skills/                      7개 Skill 워크플로우
  scripts/
    session-init.mjs           CLI 감지 + 정책 주입
    security-guard.mjs         위험 명령 차단
    run.cjs                    훅 실행기 (ESM shim)
```

### 설계 원칙

| 원칙 | 설명 |
|------|------|
| **CLI-native** | Skill이 `codex exec` / `gemini -p`를 Bash로 직접 호출. MCP Layer 없음 |
| **Zero build** | TypeScript 없음, 번들링 없음. 마크다운 + 셸 스크립트만 |
| **Minimal context** | 무조건 로드 ~800 토큰. MCP tool schema 오버헤드 없음 |
| **Model-agnostic** | 모델명 하드코딩 없음. CLI가 최신 모델을 자동 사용 |
| **Graceful degradation** | CLI 미설치 / rate limit → 자동 fallback, 크래시 없음 |

### MCP를 사용하지 않는 이유

기존 v0.1.0에서는 8개의 MCP 도구가 `codex exec` / `gemini -p`를 감싸는 래퍼 역할을 했습니다. 하지만:

- MCP tool schema만 ~625 토큰 소모
- 784KB 번들 + esbuild 빌드 파이프라인 유지비용
- Skill이 Bash로 직접 호출하면 MCP 전체가 불필요

v0.2.0에서 MCP Layer를 완전히 제거하고, **Skill이 CLI를 직접 호출**하는 구조로 전환했습니다.

---

## 컨텍스트 오버헤드 비교

| 항목 | 타 오케스트레이터 | KhakiSketcher |
|------|------------------|---------------|
| MCP 도구 | 수십 개 (수천 토큰) | **0개** |
| 무조건 로드 | 수천 토큰 | **~800 토큰** |
| 빌드 필요 | TypeScript + 번들링 | **없음** |
| 런타임 의존성 | npm packages | **없음** |

---

## About KhakiSketch

[KhakiSketch](https://khakisketch.co.kr/) — 청주의 2인 개발 스튜디오. CS 전공자 두 명이 Next.js, React, TypeScript, Python, FastAPI, PostgreSQL, Flutter, Supabase로 스타트업 MVP, 비즈니스 자동화, 프로덕션 앱을 만듭니다.

KhakiSketcher는 우리의 일상적인 개발 경험에서 탄생했습니다. 모든 라우팅 규칙, 검증 루프, 에이전트 프롬프트는 **실제 디버깅 세션과 프로덕션 인시던트**에서 검증된 것입니다.

---

## License

[MIT](LICENSE)

<p align="center">
  <a href="https://khakisketch.co.kr/">khakisketch.co.kr</a> · <a href="https://github.com/KhakiSketch">GitHub</a>
</p>
