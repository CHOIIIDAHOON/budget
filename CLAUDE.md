# CLAUDE.md

### Skills

이 프로젝트에는 두 가지 로컬 스킬이 활성화되어 있다:

| 스킬 | 트리거 | 동작 |
| ---- | ------ | ---- |
| `budget-puppeteer` | SCSS/스타일/UI 수정 작업 | 수정 전 스크린샷 → 코드 수정 → 수정 후 스크린샷 → 모바일 깨짐 검증 → 문제 시 재수정 |
| `budget-supabase` | 실제 DB 데이터 확인 필요 시 | Supabase MCP `execute_sql`로 DB 직접 조회 |

### Path Alias

`@/` maps to `src/` (configured in craco.config.js)

### Project Structure

```
src/
├── api/           # Supabase client and API functions
│   ├── supabase.js    # Supabase client instance
│   ├── budgetApi.js   # All data operations (transactions, categories, budgets, fixed costs)
│   └── index.js       # Re-exports for clean imports
├── app/           # App entry point and global styles
├── features/
│   ├── auth/      # Sign in/up pages
│   └── budget/    # Main budget feature
│       ├── components/  # UI components (forms, lists, charts, dialogs)
│       └── pages/       # Page components and layouts
│           └── BudgetInput/   # Example: page subfolder pattern
│               ├── BudgetInputPage.jsx
│               └── BudgetInputPage.scss
└── shared/
    ├── utils/     # Reusable utility functions
    │   ├── color.js   # Color manipulation (darkenColor)
    │   ├── date.js    # Date utilities (getToday - KST aware)
    │   └── iconMap.js # Icon mappings
    └── config/    # Shared configuration (e.g. colorThemes.js)
```

### 모바일 전용 앱

이 앱은 **모바일 전용**이다. 모든 UI/스타일 작업 시 모바일 기준으로만 생각한다.

- 뷰포트: 390px 기준 (iPhone 기준)
- 터치 타겟: 버튼/입력 최소 44px 이상
- 폰트: 최소 14px 이상, 읽기 편한 크기
- 가로 스크롤 금지 — 항상 세로 스크롤만 허용
- PC/태블릿 반응형 고려 불필요

### Page Component Convention

- 각 페이지는 `pages/` 하위에 **동일 이름의 폴더**를 만들고, 그 안에 `.jsx` + `.scss`를 함께 둔다
  - 함수형으로 말고 클래스형으로 만든다.
  - 예: `pages/BudgetInput/BudgetInputPage.jsx` + `BudgetInputPage.scss`
- 페이지 컴포넌트는 **클래스형(class component)** 으로 작성한다
- CSS는 **`.scss`** 파일로 작성한다 (plain CSS가 아닌 SCSS)

### Shared Utils Convention

- 여러 컴포넌트에서 재사용될 수 있는 순수 함수는 반드시 `src/shared/utils/` 에 분리한다
- 예시:
  - 날짜 계산 → `shared/utils/date.js`
  - 색상 처리 → `shared/utils/color.js`
  - 아이콘 매핑 → `shared/utils/iconMap.js`
- 컴포넌트 내부에 인라인으로 두지 말고, util로 추출하여 import해서 사용한다

### Key Concepts

- **User vs Group context**: Most operations accept either `userId` or `groupId` for personal vs shared household budgets
- **Categories**: User/group-specific, support soft delete (`is_deleted`), sortable, with `is_shared_total` flag for cumulative view
- **Transactions**: Store amount as negative for expenses, positive for income
- **Fixed costs**: Recurring expenses auto-added based on `day` field when app loads
- **Monthly budget**: Tracked separately per month/user/group

### Form Control Components Convention

폼 입력은 반드시 아래 전용 컴포넌트를 사용한다. `<input>`, `<select>` 등 기본 HTML 요소를 직접 쓰지 말 것.

```javascript
import { DropDown, NumericTextBox, TextBox, DatePicker } from "../../components";
```

#### 컴포넌트 명칭

| 역할             | 컴포넌트명       | 경로                         |
| ---------------- | ---------------- | ---------------------------- |
| 숫자 입력 (금액) | `NumericTextBox` | `components/NumericTextBox/` |
| 드롭다운 선택    | `DropDown`       | `components/dropdown/`       |
| 일반 텍스트 입력 | `TextBox`        | `components/TextBox/`        |
| 날짜 입력        | `DatePicker`     | `components/DatePicker/`     |

#### 공통 Props 인터페이스

모든 입력 컴포넌트는 아래 props를 **공통으로** 지원한다:

- `name` — 필드명 (`e.target.name`으로 전달)
- `value` — controlled value
- `onChange(e)` — `{ target: { name, value } }` 형태의 표준 이벤트
- `onFocus(e)` — 포커스 이벤트 (optional)
- `onBlur(e)` — 블러 이벤트 (optional)

컴포넌트 고유 props는 공통 props에 추가한다 (예: `NumericTextBox`의 `type`, `onTypeChange`, `onPreset` / `TextBox`의 `suggestions` / `DatePicker`의 `fixDate`, `onFixDateChange`).

### UIFeedback — Toast / Popup / Loading

저장·입력·수정·삭제 등 사용자 액션 후에는 **반드시 `showSnackbar` (토스트)를 띄운다**.

#### 클래스형 컴포넌트에서 사용법

```javascript
import { UIFeedbackContext } from "../../components";

class MyPage extends React.Component {
  static contextType = UIFeedbackContext;

  handleSave = async () => {
    await saveData(...);
    this.context.showSnackbar('저장 완료', '내역이 저장되었습니다.', '✅');
  };

  handleDelete = async () => {
    await deleteData(...);
    this.context.showSnackbar('삭제 완료', '', '🗑️');
  };
}
```

#### API

| 메서드 | 용도 | 시그니처 |
| ------ | ---- | -------- |
| `showSnackbar` | 토스트 알림 (큐 지원) | `showSnackbar(title, desc?, icon?)` |
| `showPopup` | 확인 팝업 | `showPopup(message, color?)` |
| `showLoading` | 전체 로딩 오버레이 | `showLoading()` |
| `hideLoading` | 로딩 숨기기 | `hideLoading()` |

#### 언제 토스트를 띄우는가

- 데이터 **저장** 성공 → `showSnackbar('저장 완료', '...', '✅')`
- 데이터 **수정** 성공 → `showSnackbar('수정 완료', '...', '✏️')`
- 데이터 **삭제** 성공 → `showSnackbar('삭제 완료', '', '🗑️')`
- 항목 **추가** 성공 → `showSnackbar('추가 완료', '...', '➕')`
- 오류 발생 → `showSnackbar('오류', 에러메시지, '❌')`

### Routing

React Router v7 with routes:

- `/auth/signin`, `/auth/signup` - Authentication
- `/budget` - Main app (default redirect)

### State Management

Local React state in BudgetLayout.jsx manages:

- Active user/group selection
- Categories list
- Tab navigation (input, monthly, summary, total)
- Fixed cost auto-input notifications
