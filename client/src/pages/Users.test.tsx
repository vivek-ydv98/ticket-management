import { vi } from 'vitest';

// ─── Mocks (must come before any imports that trigger the mocked modules) ────

vi.mock('../lib/auth-client');
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return { ...actual, useQuery: vi.fn(), useQueryClient: vi.fn() };
});
vi.mock('axios');

// ─── Imports ────────────────────────────────────────────────────────────────

import { useSession } from '../lib/auth-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Role } from '@/core/src/index';

import { render, screen, fireEvent, waitFor } from '../test/render';
import UsersPage from './Users';

// ─── Shared fixtures ────────────────────────────────────────────────────────

const mockAdminSession = {
  data: { user: { name: 'Admin', role: Role.ADMIN } },
  isPending: false,
};

const mockUsers = [
  { id: '1', name: 'John Doe',   email: 'john@example.com', role: Role.ADMIN, createdAt: new Date().toISOString() },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: Role.AGENT, createdAt: new Date().toISOString() },
];

function setupMocks() {
  vi.mocked(useSession).mockReturnValue(mockAdminSession as any);
  vi.mocked(useQuery).mockReturnValue({
    data: mockUsers,
    isLoading: false,
    isError: false,
    error: null,
  } as any);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('UsersPage – Create User modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  it('does not show the modal on initial render', () => {
    render(<UsersPage />);
    expect(screen.queryByRole('heading', { name: /create new user/i })).not.toBeInTheDocument();
  });

  it('renders the user table with data', () => {
    render(<UsersPage />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  // ── Opening ────────────────────────────────────────────────────────────────

  it('shows the modal when "Create User" button is clicked', async () => {
    render(<UsersPage />);

    fireEvent.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create new user/i })).toBeInTheDocument();
    });

    // All three fields should be present
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  // ── Closing via × button ───────────────────────────────────────────────────

  it('hides the modal when the × (close) button is clicked', async () => {
    render(<UsersPage />);

    // Open
    fireEvent.click(screen.getByRole('button', { name: /create user/i }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create new user/i })).toBeInTheDocument();
    });

    // Close with ×
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /create new user/i })).not.toBeInTheDocument();
    });
  });

  // ── Closing via backdrop ───────────────────────────────────────────────────

  it('hides the modal when clicking the backdrop (outside the modal)', async () => {
    const { container } = render(<UsersPage />);

    // Open
    fireEvent.click(screen.getByRole('button', { name: /create user/i }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create new user/i })).toBeInTheDocument();
    });

    // The backdrop is the first child of the fixed overlay (has onClick to close)
    const backdrop = container.querySelector('.fixed.inset-0 .absolute.inset-0') as HTMLElement;
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop);

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /create new user/i })).not.toBeInTheDocument();
    });
  });

  // ── Closing via Escape ─────────────────────────────────────────────────────

  it('hides the modal when the Escape key is pressed', async () => {
    render(<UsersPage />);

    // Open
    fireEvent.click(screen.getByRole('button', { name: /create user/i }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create new user/i })).toBeInTheDocument();
    });

    // Press Escape on the document
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /create new user/i })).not.toBeInTheDocument();
    });
  });

  // ── Cancel button ──────────────────────────────────────────────────────────

  it('hides the modal when the Cancel button inside the form is clicked', async () => {
    render(<UsersPage />);

    // Open
    fireEvent.click(screen.getByRole('button', { name: /create user/i }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create new user/i })).toBeInTheDocument();
    });

    // Cancel
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /create new user/i })).not.toBeInTheDocument();
    });
  });

  // ── Re-open after close ────────────────────────────────────────────────────

  it('can re-open the modal after it has been closed', async () => {
    render(<UsersPage />);

    // Open → close → open again
    fireEvent.click(screen.getByRole('button', { name: /create user/i }));
    await waitFor(() => expect(screen.getByRole('heading', { name: /create new user/i })).toBeInTheDocument());

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('heading', { name: /create new user/i })).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /create user/i }));
    await waitFor(() => expect(screen.getByRole('heading', { name: /create new user/i })).toBeInTheDocument());
  });

  // ── Edit User Modal ────────────────────────────────────────────────────────

  describe('Edit User flow', () => {
    it('shows the edit user modal populated with user data when Edit button is clicked', async () => {
      render(<UsersPage />);

      // Find edit button for Jane Smith (id: "2")
      const editButton = screen.getByLabelText(/edit Jane Smith/i);
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /edit user/i })).toBeInTheDocument();
      });

      // Fields should be populated with Jane Smith's data
      expect(screen.getByLabelText(/full name/i)).toHaveValue('Jane Smith');
      expect(screen.getByLabelText(/email address/i)).toHaveValue('jane@example.com');
      // Password field should show the edit mode placeholder
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('placeholder', 'Leave blank to keep unchanged');
    });
  });

  // ── Delete User Flow ───────────────────────────────────────────────────────

  describe('Delete User flow', () => {
    it('shows delete button for Agent but hides it for Admin', () => {
      render(<UsersPage />);

      // Agent (Jane Smith) should have a delete button
      expect(screen.getByLabelText(/delete Jane Smith/i)).toBeInTheDocument();

      // Admin (John Doe) should not have a delete button
      expect(screen.queryByLabelText(/delete John Doe/i)).not.toBeInTheDocument();
    });

    it('opens confirmation modal and makes DELETE API call upon confirmation', async () => {
      vi.mocked(axios.delete).mockResolvedValue({ data: {} });
      const mockInvalidateQueries = vi.fn();
      vi.mocked(useQueryClient).mockReturnValue({ invalidateQueries: mockInvalidateQueries } as any);

      render(<UsersPage />);

      // Click delete on Jane Smith
      fireEvent.click(screen.getByLabelText(/delete Jane Smith/i));

      // Modal should appear
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /delete user account/i })).toBeInTheDocument();
      });
      expect(screen.getByText(/are you sure you want to delete/i)).toHaveTextContent('Jane Smith');

      // Click Delete User button in modal
      fireEvent.click(screen.getByRole('button', { name: /^delete user$/i }));

      // API call should be made
      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalledWith('/api/users/2', { withCredentials: true });
      });

      // Query client should invalidate queries
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['users'] });

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: /delete user account/i })).not.toBeInTheDocument();
      });
    });
  });
});