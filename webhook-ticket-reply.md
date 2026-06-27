# Implementation Plan: Webhook Ticket Auto-Resolution Reply Formatting

This plan outlines the changes required to address the customer by their first name, use the signature `code with ai support` in lowercase, maintain a professional tone, and ensure robust fallback.

## 1. Analysis and Research
- We need to extract the `getCustomerFirstName` helper function from `/home/enjay/claudeC/ticket-management/server/routes/tickets.ts` and put it in `/home/enjay/claudeC/ticket-management/server/lib/email.ts` as an exported shared function.
- We will import this function in `/home/enjay/claudeC/ticket-management/server/lib/autoResolve.ts` and in `/home/enjay/claudeC/ticket-management/server/routes/tickets.ts`.
- In `server/lib/autoResolve.ts`:
  - Update `runMockResolveFallback` to retrieve the customer's first name using `getCustomerFirstName(ticketId, description)` and address them as `Hi [First Name],` (or `Hi there,` fallback).
  - Update the sign-off in `runMockResolveFallback` to:
    ```
    Best regards,
    code with ai support
    ```
  - Update `runAIResolution` to pass the first name into the AI prompt and explicitly instruct the model to address the customer by their first name and sign off with:
    ```
    Best regards,
    code with ai support
    ```
  - Enhance `autoResolveTicketAsync` to catch any errors from `runAIResolution` and attempt falling back to `runMockResolveFallback` before resetting the ticket to `OPEN`.

## 2. Component/File Updates
- [server/lib/email.ts](file:///home/enjay/claudeC/ticket-management/server/lib/email.ts): Add and export `getCustomerFirstName` helper function.
- [server/routes/tickets.ts](file:///home/enjay/claudeC/ticket-management/server/routes/tickets.ts): Import `getCustomerFirstName` from `../lib/email` and remove its local duplicate definition.
- [server/lib/autoResolve.ts](file:///home/enjay/claudeC/ticket-management/server/lib/autoResolve.ts): Import `getCustomerFirstName`, update mock fallback, update system prompts/AI generation rules, and add OpenAI-to-mock error fallback logic.
- [server/lib/autoResolve.test.ts](file:///home/enjay/claudeC/ticket-management/server/lib/autoResolve.test.ts): Update unit tests to verify first name addressing and the new sign-off.

## 3. Verification Results
- **Backend Unit Tests**: Verified successfully with 35 tests passing.
- **Webhook E2E Scenarios**:
  - **Scenario 1 (Auto-Resolvable)**: Sent password query for customer "Alice Cooper". Successfully auto-resolved the ticket, extracted the first name ("Alice"), and signed off with "code with ai support" in lowercase.
  - **Scenario 2 (Non-Resolvable)**: Sent office location query for customer "Bob Dylan". Successfully left the ticket as `OPEN` and did not trigger any automated reply since the query does not map to any knowledge base article.

