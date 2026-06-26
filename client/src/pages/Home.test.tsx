import { vi } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('../lib/auth-client');
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return { ...actual, useQuery: vi.fn() };
});

import { useSession } from '../lib/auth-client';
import { useQuery } from '@tanstack/react-query';
import { Role } from '@/core/src/index';

import { render, screen } from '../test/render';
import Home from './Home';

// ─── Shared fixtures ────────────────────────────────────────────────────────

const mockAdminSession = {
  data: {
    user: {
      name: 'Admin User',
      role: Role.ADMIN,
    },
  },
  isPending: false,
};

const mockRegularUserSession = {
  data: {
    user: {
      name: 'Regular User',
      role: Role.AGENT,
    },
  },
  isPending: false,
};

const mockTickets = [
  ...Array.from({ length: 100 }, (_, i) => ({
    id: i + 1,
    title: "issue with payment processing",
    description: "Payment error.",
    status: "OPEN",
    priority: "HIGH",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    assignedTo: "Agent Smith"
  })),
  ...Array.from({ length: 24 }, (_, i) => ({
    id: 101 + i,
    title: "Resolved issue",
    description: "Resolved.",
    status: "RESOLVED",
    priority: "MEDIUM",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    assignedTo: "Agent Smith"
  }))
];

function setupMocks() {
  vi.mocked(useQuery).mockReturnValue({
    data: mockTickets,
    isLoading: false,
    isError: false,
    error: null,
  } as any);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Home', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('renders dashboard header for admin user', async () => {
    useSession.mockReturnValue(mockAdminSession);
    render(<Home />);

    // Should see admin-only link
    expect(screen.getByRole('link', { name: /user management/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveClass(/text-brand/);
  });

  it('renders dashboard header for regular user', async () => {
    useSession.mockReturnValue(mockRegularUserSession);
    render(<Home />);

    // Should NOT see admin-only link
    expect(screen.queryByRole('link', { name: /user management/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveClass(/text-brand/);
  });

  it('renders welcome section', async () => {
    useSession.mockReturnValue(mockAdminSession);
    render(<Home />);

    expect(screen.getByRole('heading', { name: /welcome to the support dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/monitor ticket trends, team performance, and customer satisfaction metrics in real-time/i)).toBeInTheDocument();
  });

  it('renders statistic cards', async () => {
    useSession.mockReturnValue(mockAdminSession);
    render(<Home />);

    // Check for the dynamic stat card values
    expect(screen.getByText("124")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("24")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();

    // Check that the 24 value is in the resolved tickets card
    const resolvedValue = screen.getByText("24");
    expect(resolvedValue).toHaveClass(/text-3xl/);
    const card = resolvedValue.closest('div');
    expect(card.querySelector('h3')).toHaveTextContent('Resolved Tickets');
  });

  it('renders recent tickets card', async () => {
    useSession.mockReturnValue(mockAdminSession);
    render(<Home />);

    expect(screen.getByRole('heading', { name: /recent tickets/i })).toBeInTheDocument();
    expect(screen.getByText(/last 5 tickets updated/i)).toBeInTheDocument();
    
    // The top 5 tickets should be displayed, which are the first 5 in the array
    expect(screen.getAllByText(/issue with payment processing/i)).toHaveLength(5);
    expect(screen.getByRole('link', { name: /view all tickets/i })).toBeInTheDocument();
  });

  it('renders team performance card', async () => {
    useSession.mockReturnValue(mockAdminSession);
    render(<Home />);

    expect(screen.getByRole('heading', { name: /team performance/i })).toBeInTheDocument();
    expect(screen.getAllByText(/agent smith/i).length).toBeGreaterThan(0);
    // Path updated to /users from /agents as per recent navigation changes
    expect(screen.getByRole('link', { name: /view team stats/i })).toBeInTheDocument();
  });

  it('shows sign out button', async () => {
    useSession.mockReturnValue(mockAdminSession);
    render(<Home />);

    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });

  it('shows online status indicator', async () => {
    useSession.mockReturnValue(mockAdminSession);
    render(<Home />);

    expect(screen.getByText(/online/i)).toBeInTheDocument();
    expect(screen.getByText(/welcome back, admin user/i)).toBeInTheDocument();
  });
});