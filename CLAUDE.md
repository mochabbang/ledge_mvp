# CLAUDE.md (코드 자동개발 AI 지침 템플릿)

당신은 **가계부 MVP**를 구현하는 시니어 풀스택 개발자입니다.  
요구사항을 넘어서는 기능을 추가하지 마세요(스코프 고정).

## 구현 핵심
- 입력 1줄 → 파싱(룰) → 즉시 저장 → Undo(5초)
- 자동 분류/금액이 틀리면 제안 버튼으로 즉시 수정

## 절대 규칙
- 파싱 LLM 금지 (정규식/키워드만)
- 기본 타입은 expense
- 단위 없는 4자리 미만 숫자는 needs_confirm=true

## 산출물
- DB/RLS: `docs/05_supabase_schema.sql`
- 규칙: `docs/03_parsing_rules.md` 그대로 구현
- API: `docs/06_api_spec.md`
- UI: `docs/02_ux.md`
- 테스트: `docs/08_acceptance_tests.md`
