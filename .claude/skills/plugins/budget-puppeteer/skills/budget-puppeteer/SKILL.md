---
name: budget-puppeteer
description: >
  SCSS/스타일/화면 레이아웃을 수정할 때 반드시 Puppeteer MCP로 수정 전/후 화면을
  확인하고 모바일 레이아웃 깨짐 여부를 검증하는 규칙.
  "scss 수정", "스타일 변경", "화면 레이아웃", "디자인 수정", "css", "스타일 추가",
  "UI 수정" 등 화면/스타일 관련 작업이라면 무조건 이 스킬을 먼저 참고할 것.
  수정 전 확인 → 코드 수정 → 수정 후 확인 → 모바일 깨짐 검증 → 문제 있으면 재수정.
---

# Puppeteer로 화면 확인 및 검증하기

## 핵심 원칙

SCSS/스타일을 수정할 때는 **수정 전**과 **수정 후** 두 번 반드시 스크린샷을 찍는다.
수정 후 모바일 화면에서 텍스트나 레이아웃이 깨져 있으면 **재수정**한다. 완료가 아니다.

## 작업 루프

```
[1] 수정 전 스크린샷 → 현재 상태 파악
[2] SCSS 코드 수정
[3] 수정 후 스크린샷 → 결과 확인
[4] 모바일 깨짐 체크 (아래 기준 참고)
    ↓ 문제 없음        ↓ 문제 있음
  [완료]           [2]로 돌아가 재수정
```

## 모바일 뷰포트 설정

이 앱은 모바일 전용이다. 스크린샷을 찍기 전에 반드시 모바일 뷰포트로 설정한다.

```javascript
// 모바일 뷰포트로 변경 후 스크린샷
mcp__puppeteer__puppeteer_evaluate {
  script: "window.resizeTo(390, 844)"
}
mcp__puppeteer__puppeteer_screenshot
```

## 깨짐 판단 기준

수정 후 스크린샷에서 아래 중 하나라도 발견되면 재수정 필요:

- **텍스트 잘림/오버플로우** — 글자가 컨테이너 밖으로 넘치거나 `...`으로 잘림
- **레이아웃 겹침** — 요소들이 서로 겹쳐 있음
- **버튼/입력창 크기 이상** — 너무 작거나 화면 밖으로 나감
- **스크롤 깨짐** — 가로 스크롤이 생기거나 내용이 잘려 보임
- **폰트 크기 과소** — 모바일에서 읽기 힘들 정도로 작음 (12px 미만)
- **의도와 다른 결과** — 요청한 디자인과 실제 결과가 다름

## Puppeteer MCP 사용법

```javascript
// 페이지 이동
mcp__puppeteer__puppeteer_navigate { url: "http://localhost:3000/budget" }

// 스크린샷
mcp__puppeteer__puppeteer_screenshot

// 특정 요소 스크롤 후 확인
mcp__puppeteer__puppeteer_evaluate {
  script: "document.querySelector('.target-class').scrollIntoView()"
}
mcp__puppeteer__puppeteer_screenshot
```

## 주의사항

- 앱이 실행 중이어야 한다 (`http://localhost:3000`)
- 수정 후 스크린샷 없이 "완료"라고 하지 말 것
- 깨짐이 발견되면 사용자에게 먼저 알리고 재수정 진행
