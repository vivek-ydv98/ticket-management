import { test, expect, type Page } from '@playwright/test';

/**
 * Ticket Details E2E tests.
 *
 * SCOPE RULE: Only test behaviours that unit tests CANNOT cover:
 *  1. Real authentication / redirect enforcement (session cookies, server middleware)
 *  2. Real HTTP mutations persisted to the database (PATCH status, POST reply)
 *  3. UI reflecting server state after navigation / page reload
 *  4. Cache-invalidation causing live UI updates without a manual reload
 *
 * DO NOT duplicate: rendering, badge logic, form validation, disabled states —
 * all of those are covered by ReplyForm/ReplyThread/TicketDetails unit tests.
 */

// ─── Auth helpers ─────────────────────────────────────────────────────────────

async function login(page: Page) {
  await page.goto('/');
  await page.getByLabel(/email/i).fill('admin@example.com');
  await page.getByLabel(/password/i).fill('password123');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('/', { timeout: 10_000 });
}

/** Navigate to the tickets list and return the ID of the first ticket. */
async function getFirstTicketId(page: Page): Promise<number> {
  await page.goto('/tickets');
  const firstRow = page.locator('table tbody tr').first();
  await firstRow.waitFor({ state: 'visible', timeout: 10_000 });
  const href = await firstRow.locator('a').first().getAttribute('href');
  const match = href?.match(/\/tickets\/(\d+)/);
  if (!match) throw new Error('Could not find ticket ID from table row link');
  return Number(match[1]);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Ticket Details — E2E', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ── 1. Auth guard ──────────────────────────────────────────────────────────
  // Verifies the server-side middleware, not just frontend rendering.

  test('redirects unauthenticated users to the login page', async ({ page }) => {
    // Clear cookies to simulate a logged-out session
    await page.context().clearCookies();
    await page.goto('/tickets/1');
    await expect(page).toHaveURL(/\/(login|sign-in|auth)/i, { timeout: 8_000 });
  });

  // ── 2. Real page load with server data ────────────────────────────────────
  // Verifies the full stack: auth → API call → DB query → UI render.

  test('loads and displays a real ticket from the database', async ({ page }) => {
    const id = await getFirstTicketId(page);
    await page.goto(`/tickets/${id}`);

    await expect(page.getByText(`Ticket #${id}`)).toBeVisible({ timeout: 10_000 });
    // Properties sidebar is present and has selects
    await expect(page.locator('select').first()).toBeVisible();
  });

  // ── 3. Status update persists to the database ─────────────────────────────
  // Unit tests mock axios.patch; only E2E proves it actually writes to the DB.

  test('updating status persists after page reload', async ({ page }) => {
    const id = await getFirstTicketId(page);
    await page.goto(`/tickets/${id}`);
    await page.waitForSelector('select', { timeout: 10_000 });

    // Find the status select (first combobox in the Properties panel)
    const statusSelect = page.locator('select').first();
    const currentValue = await statusSelect.inputValue();

    // Pick a different status
    const newStatus = currentValue === 'OPEN' ? 'RESOLVED' : 'OPEN';
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes(`/api/tickets/${id}`) && res.request().method() === 'PATCH',
      { timeout: 8_000 },
    );
    await statusSelect.selectOption(newStatus);
    await responsePromise;

    // Reload the page — the value should still be the one we set
    await page.reload();
    await page.waitForSelector('select', { timeout: 10_000 });

    const reloadedValue = await page.locator('select').first().inputValue();
    expect(reloadedValue).toBe(newStatus);

    // Restore original status to avoid polluting other tests
    const restorePromise = page.waitForResponse(
      (res) => res.url().includes(`/api/tickets/${id}`) && res.request().method() === 'PATCH',
      { timeout: 8_000 },
    );
    await page.locator('select').first().selectOption(currentValue);
    await restorePromise;
  });

  // ── 4. Reply persists and appears after reload ─────────────────────────────
  // Unit tests mock axios.post; only E2E confirms the reply is saved in the DB
  // and returned on the next page load.

  test('posting a reply persists it after page reload', async ({ page }) => {
    const id = await getFirstTicketId(page);
    await page.goto(`/tickets/${id}`);

    const uniqueBody = `E2E test reply – ${Date.now()}`;
    await page.getByPlaceholder('Type your message here...').fill(uniqueBody);

    // Wait for the POST request to complete
    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().includes(`/api/tickets/${id}/replies`) &&
        res.request().method() === 'POST',
      { timeout: 8_000 },
    );
    await page.getByRole('button', { name: /submit reply/i }).click();
    await responsePromise;

    // The new reply should appear in the thread without a reload (cache invalidation)
    await expect(page.getByText(uniqueBody)).toBeVisible({ timeout: 8_000 });

    // Reload and confirm it's still there (actual DB persistence)
    await page.reload();
    await expect(page.getByText(uniqueBody)).toBeVisible({ timeout: 10_000 });
  });

  // ── 5. Reply count header reflects real data ───────────────────────────────
  // Verifies the full round-trip: GET /replies → count rendered in the header.

  test('Replies count header reflects the real number of replies', async ({ page }) => {
    const id = await getFirstTicketId(page);
    await page.goto(`/tickets/${id}`);

    // Fetch the actual count from the API
    const res = await page.request.get(
      `http://localhost:3000/api/tickets/${id}/replies`,
      { headers: { Cookie: await page.context().cookies().then(cookies =>
          cookies.map(c => `${c.name}=${c.value}`).join('; ')
        ) } },
    );
    const replies = await res.json() as unknown[];
    const expectedCount = replies.length;

    await expect(
      page.getByText(`Replies (${expectedCount})`),
    ).toBeVisible({ timeout: 10_000 });
  });
});
