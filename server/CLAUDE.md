
Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";
import { createRoot } from "react-dom/client";

// import .css files directly and it works
import './index.css';

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.

## AI Model

All OpenAI API calls in this project use **`gpt-5-nano`** as the default model.

- Polish reply endpoint (`POST /api/tickets/polish`): `gpt-5-nano`
- Summarize ticket endpoint (`POST /api/tickets/:id/summarize`): `gpt-5-nano`
- Auto-classify on ticket creation (`POST /api/tickets`): `gpt-5-nano` — **non-blocking**
- When adding new AI-powered features, always use `openai("gpt-5-nano")` with the Vercel AI SDK `generateText` helper.
- If the `OPENAI_API_KEY` is missing, set to `"mock"`, or contains `"your_openai_api_key"`, the system automatically falls back to the local mock function — no API calls are made.

### Auto-Classification (non-blocking)

When a ticket is created via `POST /api/tickets` **without** an explicit `category`, the server:

1. Responds with `201` immediately — the client is never blocked.
2. Fires `classifyTicketAsync()` in the background (fire-and-forget).
3. GPT classifies the ticket into one of: `GENERAL`, `TECHNICAL`, `REFUND_REQUEST`.
4. The ticket row is updated via `prisma.ticket.update` once the classification is ready.

**Fallback (`classifyByKeywords`)** — used when the API key is absent or GPT fails:
- Keyword lists for `REFUND_REQUEST` (refund, charge, invoice, billing …) and `TECHNICAL` (error, bug, crash, timeout, api …).
- Defaults to `GENERAL` if no keywords match.
