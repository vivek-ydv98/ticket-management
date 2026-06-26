import { vi } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('../lib/auth-client');
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return { ...actual, useQuery: vi.fn() };
});
vi.mock('axios');

// ─── Imports ────────────────────────────────────────────────────────────────

import { useSession } from '../lib/auth-client';
import { useQuery } from '@tanstack/react-query';
import { TicketStatus, TicketCategory, TicketPriority } from '@/core/src/index';

import { render, screen, fireEvent, waitFor } from '../test/render';
import TicketsPage from './Tickets';

// ─── Shared fixtures ────────────────────────────────────────────────────────

const mockSession = {
  data: { user: { name: 'Agent Smith', role: 'AGENT' } },
  isPending: false,
};

const mockTickets = [
  {
    id: 1,
    title: 'Server is down',
    description: 'We cannot access the portal.',
    status: TicketStatus.OPEN,
    category: TicketCategory.TECHNICAL,
    priority: TicketPriority.HIGH,
    createdAt: '2026-06-26T10:00:00.000Z',
    updatedAt: '2026-06-26T10:05:00.000Z',
    assignedTo: 'Agent Smith',
  },
  {
    id: 2,
    title: 'Refund query',
    description: 'I want a refund for my order.',
    status: TicketStatus.RESOLVED,
    category: TicketCategory.REFUND_REQUEST,
    priority: TicketPriority.MEDIUM,
    createdAt: '2026-06-25T09:00:00.000Z',
    updatedAt: '2026-06-25T11:00:00.000Z',
    assignedTo: null,
  },
];

function setupMocks() {
  vi.mocked(useSession).mockReturnValue(mockSession as any);
  vi.mocked(useQuery).mockReturnValue({
    data: mockTickets,
    isLoading: false,
    isError: false,
    error: null,
  } as any);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('TicketsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('renders the tickets list page correctly', () => {
    render(<TicketsPage />);
    expect(screen.getByRole('heading', { name: /tickets queue/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search by title, description/i)).toBeInTheDocument();
    expect(screen.getByText('Server is down')).toBeInTheDocument();
    expect(screen.getByText('Refund query')).toBeInTheDocument();
  });

  it('supports selecting status and category filters', async () => {
    render(<TicketsPage />);

    // We have multiple comboboxes: status, category, sort. Let's retrieve them by their text contents
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBe(3);

    // Filter by status
    fireEvent.change(selects[0], { target: { value: TicketStatus.OPEN } });
    expect(useQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        queryKey: expect.arrayContaining([TicketStatus.OPEN, "", "newest", ""]),
      })
    );

    // Filter by category
    fireEvent.change(selects[1], { target: { value: TicketCategory.TECHNICAL } });
    expect(useQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        queryKey: expect.arrayContaining([TicketStatus.OPEN, TicketCategory.TECHNICAL, "newest", ""]),
      })
    );
  });

  it('supports sorting by oldest first', async () => {
    render(<TicketsPage />);
    const selects = screen.getAllByRole('combobox');

    // Change sort to oldest
    fireEvent.change(selects[2], { target: { value: 'oldest' } });
    expect(useQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        queryKey: expect.arrayContaining(["", "", "oldest", ""]),
      })
    );
  });

  it('opens details drawer when a ticket row is clicked', async () => {
    render(<TicketsPage />);

    // Click on the first ticket row
    const ticketRowSubject = screen.getByText('Server is down');
    fireEvent.click(ticketRowSubject);

    // The drawer should open and display the ticket's full description and status
    expect(screen.getAllByText('Server is down').length).toBeGreaterThan(1);
    expect(screen.getAllByText('We cannot access the portal.').length).toBe(2);
    expect(screen.getByText('Ticket #1')).toBeInTheDocument();

    // Click close button
    const closeButton = screen.getByRole('button', { name: 'Close Details' });
    fireEvent.click(closeButton);

    // The drawer content should close or become invisible
    // (the drawer element might stay in DOM but be hidden or no longer rendered)
    await waitFor(() => {
      expect(screen.queryByText('Ticket #1')).not.toBeInTheDocument();
    });
  });
});
