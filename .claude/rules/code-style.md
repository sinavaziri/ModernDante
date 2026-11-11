---
paths:
  - "src/**/*.{ts,tsx}"
---

# Code Style

- Use `'use client'` directive for interactive components
- Use `@/` alias for `src/` imports
- Tailwind utilities for styling; global CSS only for animations/typography
- PascalCase components, colocate types with components
- Access data through `lib/cantos.ts` functions — never import JSON directly in components
