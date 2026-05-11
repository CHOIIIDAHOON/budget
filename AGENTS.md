# AGENTS.md

## Project Rules for Codex

### Scope
These rules apply to this repository and should be treated as always-on guidance.

### UI/SCSS Change Validation (from `budget-puppeteer`)
For any SCSS/CSS/style/layout/UI change, follow this loop:
1. Check current screen before editing
2. Edit code
3. Check screen after editing
4. Verify mobile layout at 390px width
5. If broken, fix and re-verify

Mobile validation requirements:
- No horizontal scroll
- No text overflow/truncation unless intentional
- No overlapping elements
- Tap targets should remain usable (minimum ~44px)
- Font size should remain readable on mobile (generally >= 14px)

### Real Data Verification (from `budget-supabase`)
When the request is about real saved data/records/table values, prefer direct DB verification over code-only inference.

Reporting rule:
- Clearly separate code/API analysis from actual DB query results.

Safety rule:
- Prefer `SELECT` queries
- Use `LIMIT` for sampling
- Query only needed columns for sensitive data

### Path Alias
- `@/` maps to `src/` (configured in `craco.config.js`)

### Architecture Notes
- React app with feature-based structure under `src/features`
- Main domain feature: `src/features/budget`
- Shared utilities: `src/shared/utils`
- API layer: `src/api`

### Mobile-Only Product Constraints
This app is mobile-first/mobile-only.
- Design target width: 390px
- Vertical scrolling only
- Desktop/tablet-specific responsive design is not required unless explicitly requested

### Page Component Convention
- Place each page in its own folder under `pages/`
- Keep `.jsx` and `.scss` together in that folder
- Existing codebase convention favors class components for pages

### Form Input Convention
Prefer existing shared form components over raw HTML controls where applicable:
- `NumericTextBox`
- `DropDown`
- `TextBox`
- `DatePicker`

### Shared Utils Convention
If logic is reusable across components, extract to `src/shared/utils/` instead of inlining in component files.

### UX Feedback Convention
After user actions like save/edit/delete/add, show toast feedback via `UIFeedbackContext` (`showSnackbar`).

### Domain Data Concepts
- Operations may use `userId` or `groupId` context
- Categories support soft delete (`is_deleted`) and ordering
- Transactions: expenses are negative, income is positive
- Fixed costs are recurring and can be auto-added
- Monthly budget is tracked separately per month/user/group
