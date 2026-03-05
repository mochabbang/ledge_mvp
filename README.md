# 가계부 MVP (C: 자유 텍스트 + 자동 제안 버튼)

이 리포지토리는 **코드 자동개발 AI**가 바로 구현할 수 있도록, **룰 기반(rule-based) 명세**를 파일 단위로 분리한 문서 묶음입니다.  
(LLM 파싱 금지 / 비용 0원 / 정규식+키워드 룰만 사용)

## 핵심 컨셉 (MVP 성공 확률 최상)
- 입력은 **1줄**: 예) `외주 50만원`, `점심 1.2`, `광고비 12만`
- 입력 즉시 저장 + **Undo(5초)**로 되돌리기
- 자동 분류가 틀리면 **제안 버튼(토글/가감)**으로 1초 수정

## 문서 목록
- `docs/01_scope.md` : 범위/목표/비기능
- `docs/02_ux.md` : 화면/UX/상태 흐름(Undo 포함)
- `docs/03_parsing_rules.md` : 룰 기반 파서 규칙(금액/타입/확인 필요)
- `docs/04_data_model.md` : 데이터 모델(Goal/Transaction) + 제약
- `docs/05_supabase_schema.sql` : Supabase 테이블/인덱스/RLS SQL
- `docs/06_api_spec.md` : API(parse-and-save/update/summary)
- `docs/07_roadmap_2w.md` : 2주 실행 로드맵
- `docs/08_acceptance_tests.md` : 수용 기준/테스트 케이스(파서 포함)
- `RULES.md` : 구현 시 지켜야 할 “절대 규칙”
- `CLAUDE.md` : (선택) 코드 생성 AI 지침 템플릿

## MVP 정책(결정)
- 저장 정책: **즉시 저장 + Undo(5초)** (기본)
- 카테고리: MVP는 필수 아님(선택 4개만)
- 기본 타입: 키워드 없으면 **지출**(보수적으로)

> 날짜 기준: 2026-02-27 (Asia/Seoul)
