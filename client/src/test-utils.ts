// Test utilities for mocking React Query and Auth client
import { vi } from 'vitest';

console.error('test-utils.ts: setting up mock');

export const mockUseSession = vi.fn(() => {
  console.error('mockUseSession called');
  return undefined; // default, will be overridden in tests
});

// Mock the auth client module
vi.mock('../lib/auth-client', () => {
  console.error('mocking ../lib/auth-client');
  return {
    useSession: mockUseSession,
    signOut: vi.fn(),
  };
});