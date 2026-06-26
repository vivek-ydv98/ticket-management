import { vi } from 'vitest';

// ─── Mocks (hoisted – must precede imports) ──────────────────────────────────

vi.mock('axios');
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueryClient: vi.fn(),
  };
});

// ─── Imports ─────────────────────────────────────────────────────────────────

import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '../test/render';
import userEvent from '@testing-library/user-event';
import CreateUserForm from './CreateUserForm';
import { Role } from '@/core/src/index';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockInvalidateQueries = vi.fn();

/** Render the form in the open state with fresh spies. */
function renderOpen(onClose = vi.fn()) {
  vi.mocked(useQueryClient).mockReturnValue({
    invalidateQueries: mockInvalidateQueries,
  } as any);

  return { ...render(<CreateUserForm isOpen={true} onClose={onClose} />), onClose };
}

/** Fill all three fields with valid data. */
async function fillValidForm() {
  await userEvent.type(screen.getByLabelText(/full name/i), 'Jane Doe');
  await userEvent.type(screen.getByLabelText(/email address/i), 'jane@example.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'SecurePass1');
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CreateUserForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  describe('rendering', () => {
    it('renders nothing when isOpen is false', () => {
      vi.mocked(useQueryClient).mockReturnValue({ invalidateQueries: vi.fn() } as any);
      const { container } = render(<CreateUserForm isOpen={false} onClose={vi.fn()} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('renders the modal heading when isOpen is true', () => {
      renderOpen();
      expect(screen.getByRole('heading', { name: /create new user/i })).toBeInTheDocument();
    });

    it('renders Name, Email, and Password fields', () => {
      renderOpen();
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('renders the Cancel and Create User buttons', () => {
      renderOpen();
      expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create user/i })).toBeInTheDocument();
    });

    it('all fields are empty on first open', () => {
      renderOpen();
      expect(screen.getByLabelText(/full name/i)).toHaveValue('');
      expect(screen.getByLabelText(/email address/i)).toHaveValue('');
      expect(screen.getByLabelText(/password/i)).toHaveValue('');
    });

    it('password field has type="password"', () => {
      renderOpen();
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password');
    });
  });

  // ── Validation ─────────────────────────────────────────────────────────────

  describe('validation', () => {
    it('shows required-field errors when submitted with all fields empty', async () => {
      renderOpen();
      fireEvent.click(screen.getByRole('button', { name: /create user/i }));

      await waitFor(() => {
        // Zod schema: name ≥ 3 chars, valid email, password ≥ 8 chars
        expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    });

    it('shows a name error when name is too short', async () => {
      renderOpen();
      await userEvent.type(screen.getByLabelText(/full name/i), 'Jo');
      fireEvent.click(screen.getByRole('button', { name: /create user/i }));

      await waitFor(() => {
        expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument();
      });
    });

    it('shows an email format error for an invalid email', async () => {
      renderOpen();

      // jsdom's type="email" input silently discards non-conforming values,
      // so we mock the value getter on the specific element instance and fire
      // a change event — this is what react-hook-form reads from e.target.value.
      const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
      Object.defineProperty(emailInput, 'value', {
        writable: true,
        configurable: true,
        value: 'not-an-email',
      });
      fireEvent.change(emailInput);

      fireEvent.click(screen.getByRole('button', { name: /create user/i }));

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it('shows a password error when password is fewer than 8 characters', async () => {
      renderOpen();
      await userEvent.type(screen.getByLabelText(/password/i), 'short');
      fireEvent.click(screen.getByRole('button', { name: /create user/i }));

      await waitFor(() => {
        expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it('does not show errors when all fields are valid', async () => {
      vi.mocked(axios.post).mockResolvedValue({ data: {} });
      renderOpen();
      await fillValidForm();
      fireEvent.click(screen.getByRole('button', { name: /create user/i }));

      await waitFor(() => {
        expect(screen.queryByText(/at least 3 characters/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/valid email/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/at least 8 characters/i)).not.toBeInTheDocument();
      });
    });
  });

  // ── Successful submission ──────────────────────────────────────────────────

  describe('successful submission', () => {
    it('calls POST /api/users with the correct payload', async () => {
      vi.mocked(axios.post).mockResolvedValue({ data: {} });
      renderOpen();
      await fillValidForm();
      fireEvent.click(screen.getByRole('button', { name: /create user/i }));

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          '/api/users',
          { name: 'Jane Doe', email: 'jane@example.com', password: 'SecurePass1' },
          { withCredentials: true },
        );
      });
    });

    it('calls onClose after a successful submission', async () => {
      vi.mocked(axios.post).mockResolvedValue({ data: {} });
      const { onClose } = renderOpen();
      await fillValidForm();
      fireEvent.click(screen.getByRole('button', { name: /create user/i }));

      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    });

    it('invalidates the "users" query after a successful submission', async () => {
      vi.mocked(axios.post).mockResolvedValue({ data: {} });
      renderOpen();
      await fillValidForm();
      fireEvent.click(screen.getByRole('button', { name: /create user/i }));

      await waitFor(() =>
        expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['users'] }),
      );
    });
  });

  // ── Error handling ─────────────────────────────────────────────────────────

  describe('server error handling', () => {
    it('displays the server error message returned in response.data.message', async () => {
      vi.mocked(axios.post).mockRejectedValue({
        response: { data: { message: 'Email already in use.' } },
      });
      renderOpen();
      await fillValidForm();
      fireEvent.click(screen.getByRole('button', { name: /create user/i }));

      await waitFor(() => {
        expect(screen.getByText('Email already in use.')).toBeInTheDocument();
      });
    });

    it('displays the server error returned in response.data.error when message is absent', async () => {
      vi.mocked(axios.post).mockRejectedValue({
        response: { data: { error: 'Something went wrong.' } },
      });
      renderOpen();
      await fillValidForm();
      fireEvent.click(screen.getByRole('button', { name: /create user/i }));

      await waitFor(() => {
        expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
      });
    });

    it('displays a generic fallback message when no server message is available', async () => {
      vi.mocked(axios.post).mockRejectedValue({ response: { data: {} } });
      renderOpen();
      await fillValidForm();
      fireEvent.click(screen.getByRole('button', { name: /create user/i }));

      await waitFor(() => {
        expect(screen.getByText(/an error occurred while creating the user/i)).toBeInTheDocument();
      });
    });

    it('does not call onClose when the request fails', async () => {
      vi.mocked(axios.post).mockRejectedValue({
        response: { data: { message: 'Server error' } },
      });
      const { onClose } = renderOpen();
      await fillValidForm();
      fireEvent.click(screen.getByRole('button', { name: /create user/i }));

      await waitFor(() => screen.getByText('Server error'));
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  // ── Loading / submitting state ─────────────────────────────────────────────

  describe('loading state', () => {
    it('shows "Creating…" and disables the submit button while submitting', async () => {
      // Never resolves so we can inspect the in-flight state
      vi.mocked(axios.post).mockReturnValue(new Promise(() => {}));
      renderOpen();
      await fillValidForm();
      fireEvent.click(screen.getByRole('button', { name: /create user/i }));

      await waitFor(() => {
        expect(screen.getByText(/creating…/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /creating…/i })).toBeDisabled();
      });
    });
  });

  // ── Field reset ────────────────────────────────────────────────────────────

  describe('field reset', () => {
    it('resets all fields when the form is closed and re-opened', async () => {
      vi.mocked(axios.post).mockResolvedValue({ data: {} });
      const onClose = vi.fn();
      vi.mocked(useQueryClient).mockReturnValue({ invalidateQueries: vi.fn() } as any);

      const { rerender } = render(<CreateUserForm isOpen={true} onClose={onClose} />);

      // Type into the name field then cancel
      await userEvent.type(screen.getByLabelText(/full name/i), 'Typed Name');
      fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));

      // Re-open (simulate parent toggling isOpen back to true)
      rerender(<CreateUserForm isOpen={true} onClose={onClose} />);

      expect(screen.getByLabelText(/full name/i)).toHaveValue('');
    });
  });

  // ── Edit Mode ──────────────────────────────────────────────────────────────

  describe('edit mode', () => {
    const mockUserToEdit = {
      id: 'user-123',
      name: 'Existing User',
      email: 'existing@example.com',
      role: Role.AGENT,
      createdAt: '2026-06-26T00:00:00.000Z',
    };

    it('renders with edit mode title and pre-populated values', () => {
      vi.mocked(useQueryClient).mockReturnValue({ invalidateQueries: vi.fn() } as any);
      render(<CreateUserForm isOpen={true} onClose={vi.fn()} userToEdit={mockUserToEdit} />);

      expect(screen.getByRole('heading', { name: /edit user/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/full name/i)).toHaveValue('Existing User');
      expect(screen.getByLabelText(/email address/i)).toHaveValue('existing@example.com');
      expect(screen.getByLabelText(/password/i)).toHaveValue('');
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('placeholder', 'Leave blank to keep unchanged');
    });

    it('submits updated user data to PUT /api/users/:id', async () => {
      vi.mocked(axios.put).mockResolvedValue({ data: {} });
      const onClose = vi.fn();
      vi.mocked(useQueryClient).mockReturnValue({ invalidateQueries: mockInvalidateQueries } as any);

      render(<CreateUserForm isOpen={true} onClose={onClose} userToEdit={mockUserToEdit} />);

      // Submit form without touching the optional password field
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          '/api/users/user-123',
          { name: 'Existing User', email: 'existing@example.com', password: '' },
          { withCredentials: true },
        );
      });
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['users'] });
    });

    it('fails validation in edit mode if password is too short', async () => {
      vi.mocked(useQueryClient).mockReturnValue({ invalidateQueries: vi.fn() } as any);
      render(<CreateUserForm isOpen={true} onClose={vi.fn()} userToEdit={mockUserToEdit} />);

      // Type a short password
      await userEvent.type(screen.getByLabelText(/password/i), 'short');
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
      });
      expect(axios.put).not.toHaveBeenCalled();
    });
  });
});
