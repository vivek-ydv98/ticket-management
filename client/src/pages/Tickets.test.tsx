import { vi } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('../lib/auth-client');
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQuery: vi.fn(),
    useQueryClient: vi.fn(() => ({
      invalidateQueries: vi.fn(),
    })),
  };
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
  vi.mocked(useQuery).mockImplementation((config: any) => {
    const key = config.queryKey?.[0];
    if (key === 'assignees') {
      return {
        data: [
          { id: '1', name: 'Agent Smith', email: 'Agent Smith' },
          { id: '2', name: 'Agent 2', email: 'agent2@example.com' }
        ],
        isLoading: false,
        isError: false,
        error: null,
      } as any;
    }
    return {
      data: { tickets: mockTickets, total: mockTickets.length, totalPages: 1 },
      isLoading: false,
      isError: false,
      error: null,
    } as any;
  });
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

  it('supports selecting status, category, and priority filters', async () => {
    render(<TicketsPage />);

    // We have multiple comboboxes: status, category, priority. Let's retrieve them by their text contents
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBe(3);

    // Filter by status
    fireEvent.change(selects[0], { target: { value: TicketStatus.OPEN } });
    expect(useQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        queryKey: ["tickets", TicketStatus.OPEN, "", "", "createdAt", "desc", "", 1],
      })
    );

    // Filter by category
    fireEvent.change(selects[1], { target: { value: TicketCategory.TECHNICAL } });
    expect(useQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        queryKey: ["tickets", TicketStatus.OPEN, TicketCategory.TECHNICAL, "", "createdAt", "desc", "", 1],
      })
    );

    // Filter by priority
    fireEvent.change(selects[2], { target: { value: TicketPriority.HIGH } });
    expect(useQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        queryKey: ["tickets", TicketStatus.OPEN, TicketCategory.TECHNICAL, TicketPriority.HIGH, "createdAt", "desc", "", 1],
      })
    );
  });

  it('supports sorting by clicking headers', async () => {
    render(<TicketsPage />);

    // Click on the Ticket ID header to sort descending
    const ticketIdHeader = screen.getByRole('button', { name: /ticket id/i });
    fireEvent.click(ticketIdHeader);

    expect(useQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        queryKey: ["tickets", "", "", "", "id", "desc", "", 1],
      })
    );

    // Click again to sort ascending
    fireEvent.click(ticketIdHeader);
    expect(useQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        queryKey: ["tickets", "", "", "", "id", "asc", "", 1],
      })
    );
  });

  it('opens details drawer when a ticket row is clicked', async () => {
    render(<TicketsPage />);

    // Click on the first ticket row (using the ID cell, as subject link stops propagation)
    const ticketRowId = screen.getByText('#1');
    fireEvent.click(ticketRowId);

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

  it('supports pagination controls', async () => {
    // Mock 12 tickets to force 2 pages
    const manyTickets = Array.from({ length: 12 }, (_, i) => ({
      id: i + 1,
      title: `Ticket #${i + 1}`,
      description: `Description #${i + 1}`,
      status: TicketStatus.OPEN,
      category: TicketCategory.TECHNICAL,
      priority: TicketPriority.HIGH,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignedTo: null,
    }));

    vi.mocked(useQuery).mockReturnValue({
      data: { tickets: manyTickets.slice(0, 10), total: 12, totalPages: 2 },
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<TicketsPage />);

    // Check that showing info is rendered correctly
    expect(screen.getByText(/showing/i).closest('p')).toHaveTextContent("Showing 1 to 10 of 12 tickets");

    // Verify Previous button is disabled on page 1
    const prevButton = screen.getByRole('button', { name: /previous/i });
    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(prevButton).toBeDisabled();
    expect(nextButton).not.toBeDisabled();

    // Click Next button
    fireEvent.click(nextButton);
    expect(useQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        queryKey: ["tickets", "", "", "", "createdAt", "desc", "", 2],
      })
    );
  });
});
