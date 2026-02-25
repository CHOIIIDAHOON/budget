# CLAUDE.md

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
재사용 가능한 폼 입력 컴포넌트는 `features/budget/components/` 하위에 **동일 이름의 폴더**로 관리한다.

#### 컴포넌트 명칭
| 역할 | 컴포넌트명 | 경로 |
|------|-----------|------|
| 숫자 입력 (금액) | `NumericTextBox` | `components/NumericTextBox/` |
| 드롭다운 선택 | `DropDown` | `components/dropdown/` |
| 일반 텍스트 입력 | `TextBox` | `components/TextBox/` |
| 날짜 입력 | `DatePicker` | `components/DatePicker/` |

#### 공통 Props 인터페이스
모든 입력 컴포넌트는 아래 props를 **공통으로** 지원한다:
- `name` — 필드명 (`e.target.name`으로 전달)
- `value` — controlled value
- `onChange(e)` — `{ target: { name, value } }` 형태의 표준 이벤트
- `onFocus(e)` — 포커스 이벤트 (optional)
- `onBlur(e)` — 블러 이벤트 (optional)

컴포넌트 고유 props는 공통 props에 추가한다 (예: `NumericTextBox`의 `type`, `onTypeChange`, `onPreset` / `TextBox`의 `suggestions` / `DatePicker`의 `fixDate`, `onFixDateChange`).

### UI Framework
- Material UI (MUI) v7 for components
- Recharts for data visualization
- @dnd-kit for drag-and-drop category reordering
- CSS Modules (`.module.css`) and plain CSS for styling (신규 페이지는 `.scss` 사용)

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
