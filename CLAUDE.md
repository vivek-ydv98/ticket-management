# Helpdesk - AI-Powered Ticket Management System

## Project Overview
A ticket management system that uses AI to classify, respond to, and route support tickets. See `project-scoped.md` for full requirements and `implementation-plan.md` for phased task breakdown.

## Tech Stack
- **Frontend**: React + TypeScript + Vite (port 5173) + shadcn/ui
- **Backend**: Express + TypeScript + Bun (port 3000)
- **Database**: PostgreSQL with Prisma ORM
- **AI**: Anthropic Claude API via Vercel AI SDK (`@ai-sdk/anthropic`)
- **Auth**: Better Auth (email/password, database sessions)
- **Job Queue**: pg-boss (PostgreSQL-backed, runs in `pgboss` schema)

## Project Structure
```
/core     - Shared code (Zod schemas, types) — Bun workspace package
/client   - React frontend (Vite)
/server   - Express backend
```

## Development
### Start server
```bash
cd server && bun run dev
```

### Start client
```bash
cd client && bun run dev
```
The client proxies `/api/*` requests to the server via Vite config (target is configurable via `VITE_API_URL` env var, defaults to `http://localhost:3000`).

### Linting
```bash
# Client linting (ESLint)
cd client && bun run lint

# Note: Server linting is not configured by default; follow existing code style
```

### Building for Production
```bash
# Client production build
cd client && bun run build

# Server production build (transpile TypeScript)
cd server && bun run build
# Note: Build script may need to be added; currently relies on Bun's native TypeScript execution
```

### Database Seeding
```bash
cd server && bun run seed
```

## Testing

### End-to-End Tests (Playwright)
Use the `playwright-e2e-writer` agent to generate Playwright tests. Provide a prompt describing the feature or user flow you want to test (e.g., “Create a test that logs in a user and checks they are redirected to the dashboard”). The agent will output a TypeScript test file placed in `/e2e` following the project’s conventions.

To run the tests:
- Ensure the development servers are running (client on :5173, server on :3000) or use the `webServer` configuration in `playwright.config.ts`.
- Execute with: `npx playwright test` or `bun playwright test`.
- For UI mode: `bun test:e2e:ui`
- For headed mode: `bun test:e2e:headed`
- To run a specific test file: `bun playwright test tests/example.spec.ts`
- For CI, set `NODE_ENV=test` to use the test database.

### Component Tests (Vitest + React Testing Library)
We use Vitest and React Testing Library for frontend component tests. The tests are located in `client/src` alongside the pages or components they test (e.g., `client/src/pages/Users.test.tsx`).

#### Rules for Writing Component Tests
- **Do not mock `@tanstack/react-query` globally/blindly.** Mock only the hooks you need (like `useQuery`) using a mock factory to preserve the `QueryClientProvider` and other exports:
  ```typescript
  vi.mock('@tanstack/react-query', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@tanstack/react-query')>();
    return {
      ...actual,
      useQuery: vi.fn(),
    };
  });
  ```
- **Use the custom `render` helper:** Import `render` from `../test/render` rather than `@testing-library/react` directly. This helper automatically wraps the component in `QueryClientProvider` and `MemoryRouter`.
- **Mocking Auth:** Mock `../lib/auth-client` for session and authentication status:
  ```typescript
  vi.mock('../lib/auth-client');
  import { useSession } from '../lib/auth-client';
  ```

#### To Run Component Tests
From the `client` directory:
- Run tests in watch mode (interactive/re-runs on save):
  ```bash
  cd client && bun run test
  ```
- Run tests once (e.g., for CI/CD or one-off verification):
  ```bash
  cd client && bun run test:run
  ```
- To run a specific test file: `bun test src/path/to/Component.test.tsx`
- Run tests with coverage: `bun run test --coverage`

## Key Conventions
- Use Bun as the runtime and package manager (not npm/yarn)
- Use TypeScript throughout
- Use Context7 MCP server to fetch up-to-date documentation for libraries
- Use shadcn/ui components for all UI (import from `@/components/ui/*`)
- Use Axios for HTTP requests with `withCredentials: true` for cookie-based authentication
- Use TanStack React Query (`@tanstack/react-query`) for data fetching, caching, and state management
- **Define shared Zod schemas in the `/core` package and import them in both client and server to ensure validation consistency.**
- Follow the existing code style for formatting (no formatter configured by default; follow Prettier-like conventions implicitly)

## Common Development Patterns
### Adding a New API Endpoint (Server)
1. Create a new route file in `server/src/routes/` (or appropriate folder)
2. Define the route handler using Express async handlers
3. Register the route in `server/src/index.ts` or the appropriate router file
4. Validate input/output using Zod schemas from `/core`
5. Handle errors with appropriate HTTP status codes
6. Add unit/integration tests as needed

### Adding a New React Component (Client)
1. Create the component file in `client/src/components/` (or subdirectory)
2. Use TypeScript functional component with explicit props interface
3. Utilize shadcn/ui primitives from `@/components/ui/` for consistent UI
4. Use React Query for data fetching if needed
5. Export the component from the appropriate index file if intended for reuse
6. Write a corresponding test file alongside the component

### Adding/Updating Shared Zod Schemas (Core)
1. Edit the schema file in `core/src/schemas/` (e.g., `user.ts`)
2. Ensure the schema is exported from `core/src/index.ts`
3. Run any affected tests to validate changes
4. Update any dependencies that use the schema (client and server validation)

### Using the Custom Test Render Helper
In client component tests, import the custom render helper:
```typescript
import { render } from '@/test/render';
// Then use it instead of RTL's render:
render(<Component />);
```
This provider wrapper includes:
- QueryClientProvider (React Query)
- MemoryRouter (React Router)
- Auth context (if needed)
- Any other providers required by the component

## Writing End-to-End Tests
Use the `playwright-e2e-writer` agent to generate Playwright tests. Provide a prompt describing the feature or user flow you want to test (e.g., “Create a test that logs in a user and checks they are redirected to the dashboard”). The agent will output a TypeScript test file placed in `/e2e` following the project’s conventions.

To run the tests:
- Ensure the development servers are running (client on :5173, server on :3000) or use the `webServer` configuration in `playwright.config.ts`.
- Execute with: `npx playwright test` or `bun playwright test`.
- For CI, set `NODE_ENV=test` to use the test database.

## Writing & Running Component Tests
We use Vitest and React Testing Library for frontend component tests. The tests are located in `client/src` alongside the pages or components they test (e.g., `client/src/pages/Users.test.tsx`).

### Rules for Writing Component Tests
- **Do not mock `@tanstack/react-query` globally/blindly.** Mock only the hooks you need (like `useQuery`) using a mock factory to preserve the `QueryClientProvider` and other exports:
  ```typescript
  vi.mock('@tanstack/react-query', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@tanstack/react-query')>();
    return {
      ...actual,
      useQuery: vi.fn(),
    };
  });
  ```
- **Use the custom `render` helper:** Import `render` from `../test/render` rather than `@testing-library/react` directly. This helper automatically wraps the component in `QueryClientProvider` and `MemoryRouter`.
- **Mocking Auth:** Mock `../lib/auth-client` for session and authentication status:
  ```typescript
  vi.mock('../lib/auth-client');
  import { useSession } from '../lib/auth-client';
  ```

### To Run Component Tests
From the `client` directory:
- Run tests in watch mode (interactive/re-runs on save):
  ```bash
  cd client && bun run test
  ```
- Run tests once (e.g., for CI/CD or one-off verification):
  ```bash
  cd client && bun run test:run
  ```