# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm start          # Start dev server (uses craco)
npm run build      # Production build
npm test           # Run tests in watch mode
npm test -- --watchAll=false  # Run tests once
```

## Architecture

This is a React 19 budget tracking app using Create React App with CRACO for webpack customization. Backend is Supabase (PostgreSQL).

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
└── shared/utils/  # Color utilities, icon mappings
```

### Key Concepts
- **User vs Group context**: Most operations accept either `userId` or `groupId` for personal vs shared household budgets
- **Categories**: User/group-specific, support soft delete (`is_deleted`), sortable, with `is_shared_total` flag for cumulative view
- **Transactions**: Store amount as negative for expenses, positive for income
- **Fixed costs**: Recurring expenses auto-added based on `day` field when app loads
- **Monthly budget**: Tracked separately per month/user/group

### UI Framework
- Material UI (MUI) v7 for components
- Recharts for data visualization
- @dnd-kit for drag-and-drop category reordering
- CSS Modules (`.module.css`) and plain CSS for styling

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
