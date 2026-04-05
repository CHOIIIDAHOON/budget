---
name: budget-supabase
description: >
  실제 DB 데이터를 확인해야 할 때 Supabase MCP를 사용하는 규칙.
  "데이터 확인", "DB에서 가져와", "실제 데이터가 어떻게 돼있어", "데이터가 저장됐는지",
  "쿼리 결과", "테이블 데이터", "레코드 확인", "값이 맞는지 확인" 등
  실제 데이터베이스 내용을 봐야 하는 상황이라면 무조건 이 스킬을 참고할 것.
  코드/API 분석만으로 부족할 때 Supabase MCP로 직접 DB를 조회한다.
---

# Supabase MCP로 데이터 확인하기

## 핵심 원칙

코드나 API 응답만으로 데이터 구조/값을 추측하지 말고, 실제 DB에 Supabase MCP로 직접 쿼리해서 확인한다.

## 언제 사용하는가

- 특정 테이블에 실제로 어떤 데이터가 있는지 확인할 때
- 컬럼명/타입/값 형식을 직접 확인해야 할 때
- 코드를 작성하기 전에 실제 데이터 구조를 파악할 때
- 버그 원인 파악을 위해 DB 상태를 확인할 때
- API가 반환하는 값이 예상과 다를 때

## Supabase MCP 사용법

```
// SQL 실행으로 데이터 조회
mcp__supabase__execute_sql {
  query: "SELECT * FROM table_name LIMIT 10"
}

// 테이블 목록 확인
mcp__supabase__list_tables

// 특정 조건으로 데이터 조회
mcp__supabase__execute_sql {
  query: "SELECT column1, column2 FROM table WHERE condition = 'value'"
}
```

## 작업 순서

1. **테이블 구조 파악** — 필요시 `list_tables`로 테이블 목록 확인
2. **실제 데이터 조회** — `execute_sql`로 샘플 데이터 확인
3. **구조 파악 후 코드 작성** — 실제 컬럼명/타입 기반으로 정확하게 작성
4. **저장 결과 검증** — 작업 후 데이터가 의도대로 저장됐는지 확인

## 주의사항

- SELECT 위주로 사용하고, INSERT/UPDATE/DELETE는 꼭 필요한 경우에만 사용
- 민감한 데이터가 포함된 경우 필요한 컬럼만 조회
- 대량 데이터 조회 시 `LIMIT` 사용 필수
