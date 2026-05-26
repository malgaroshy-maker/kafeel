# Contributing to Kafeel | المساهمة في كفيل

Thank you for your interest in contributing to Kafeel! This document provides guidelines for contributing to the project.

## 🚀 Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/kafeel.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Install dependencies: `npm install`
5. Copy environment config: `cp .env.example .env`
6. Start development server: `npm run dev`

## 📋 Development Workflow

### Branch Naming
- `feature/` — New features
- `fix/` — Bug fixes
- `docs/` — Documentation updates
- `refactor/` — Code refactoring

### Commit Messages
Use clear, descriptive commit messages:
```
feat: add customer search filter
fix: resolve calculator margin rounding
docs: update API documentation
refactor: extract financial engine
```

### Code Style
- **TypeScript** — Strict mode enabled
- **React** — Functional components with hooks
- **CSS** — Vanilla CSS with HSL design tokens (no Tailwind)
- **RTL-first** — All UI must support Arabic RTL layout
- **Font** — Cairo (Google Fonts)

## 🧪 Testing

Run the test suite before submitting:

```bash
npm test
```

All 25 financial engine tests must pass.

## 📤 Pull Request Process

1. Ensure all tests pass: `npm test`
2. Verify the build succeeds: `npm run build`
3. Update documentation if needed
4. Submit a PR with a clear description of changes
5. Wait for review and address any feedback

## 🏗️ Architecture Notes

- **Supabase** — Backend, auth, storage, and realtime
- **RLS** — All database access is controlled via Row-Level Security
- **Edge Functions** — Server-side logic uses Deno-based Supabase Edge Functions
- **Financial Engine** — Pure functions in `src/lib/financialEngine.ts` (no side effects)

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.
