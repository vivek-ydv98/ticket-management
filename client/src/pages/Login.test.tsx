import { vi } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────────────────
const mockNavigate = vi.fn();
const mockLocation = { state: null };

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  };
});

vi.mock('../lib/auth-client', () => ({
  signIn: {
    email: vi.fn(),
  },
}));

// ─── Imports ─────────────────────────────────────────────────────────────────
import { signIn } from '../lib/auth-client';
import { render, screen, fireEvent, waitFor } from '../test/render';
import userEvent from '@testing-library/user-event';
import Login from './Login';

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.state = null;
  });

  it('renders email, password inputs and sign in button', () => {
    render(<Login />);
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('toggles password visibility when the eye button is clicked', async () => {
    render(<Login />);
    const passwordInput = screen.getByLabelText(/^password$/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Click the eye button to show password
    const toggleButton = screen.getByRole('button', { name: '' }); // The icon button has no accessible text name, but we can query it
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(passwordInput).toHaveAttribute('type', 'text');
    });

    // Click again to hide
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  it('shows required error messages when submitted empty', async () => {
    render(<Login />);
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('shows invalid email format error message when input is not an email', async () => {
    render(<Login />);
    const emailInput = screen.getByLabelText(/^email$/i);

    await userEvent.type(emailInput, 'not-an-email');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'password123');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/enter a valid email address/i)).toBeInTheDocument();
    });
  });

  it('calls signIn.email and redirects to root on success', async () => {
    vi.mocked(signIn.email).mockResolvedValue({ data: {}, error: null } as any);
    render(<Login />);

    await userEvent.type(screen.getByLabelText(/^email$/i), 'admin@example.com');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'password123');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(signIn.email).toHaveBeenCalledWith({
        email: 'admin@example.com',
        password: 'password123',
      });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('redirects to the previously targeted page on success if specified in location state', async () => {
    mockLocation.state = { from: { pathname: '/tickets' } } as any;
    vi.mocked(signIn.email).mockResolvedValue({ data: {}, error: null } as any);
    render(<Login />);

    await userEvent.type(screen.getByLabelText(/^email$/i), 'admin@example.com');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'password123');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/tickets/');
    });
  });

  it('displays error message from API when sign in fails', async () => {
    vi.mocked(signIn.email).mockResolvedValue({
      data: null,
      error: { message: 'Invalid email or password', status: 400 },
    } as any);
    render(<Login />);

    await userEvent.type(screen.getByLabelText(/^email$/i), 'admin@example.com');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'wrongpassword');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
