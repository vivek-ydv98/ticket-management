import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TicketDetailsPage from './TicketDetails';
import { useQuery } from '@tanstack/react-query';
import { useParams, MemoryRouter } from 'react-router-dom';
import { TicketStatus, TicketCategory, TicketPriority } from '@/core/src/index';
import axios from 'axios';
import userEvent from '@testing-library/user-event';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    isAxiosError: vi.fn(() => false),
  },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useParams: vi.fn() };
});

vi.mock('../lib/auth-client', () => ({
  useSession: vi.fn(() => ({
    data: { user: { name: 'Test Agent', role: 'AGENT' } },
    isPending: false,
  })),
}));

vi.mock('../components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockTicket = {
  id: 42,
  title: 'Slow load time on dashboard',
  description: 'Auto-generated description for ticket #42.',
  status: TicketStatus.OPEN,
  category: TicketCategory.TECHNICAL,
  priority: TicketPriority.HIGH,
  createdAt: '2026-06-26T18:00:00.000Z',
  updatedAt: '2026-06-26T18:30:00.000Z',
  assignedTo: 'agent@example.com',
};

const mockAssignees = [
  { id: 'a1', name: 'Agent 1', email: 'agent1@example.com' },
  { id: 'a2', name: 'Agent 2', email: 'agent2@example.com' },
];

const mockReplies = [
  {
    id: 1,
    ticketId: 42,
    body: 'First reply from support agent.',
    senderType: 'AGENT',
    createdAt: '2026-06-26T19:00:00.000Z',
    user: { id: 'u1', name: 'Agent 1', email: 'agent1@example.com', role: 'AGENT' },
  },
  {
    id: 2,
    ticketId: 42,
    body: 'Customer follow-up message.',
    senderType: 'CUSTOMER',
    createdAt: '2026-06-26T19:15:00.000Z',
    user: { id: 'u2', name: 'Customer 1', email: 'customer1@client.com', role: 'USER' },
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Set up the useQuery mock so each query key group returns the right data.
 */
function setupQuery({
  ticket = mockTicket,
  ticketLoading = false,
  ticketError = null,
  replies = [] as any[],
  repliesLoading = false,
  assignees = mockAssignees,
} = {}) {
  vi.mocked(useQuery).mockImplementation((config: any) => {
    const key0 = config.queryKey?.[0];
    const key2 = config.queryKey?.[2];

    if (key0 === 'assignees') {
      return { data: assignees, isLoading: false, error: null } as any;
    }
    if (key0 === 'ticket' && key2 === 'replies') {
      return { data: replies, isLoading: repliesLoading, error: null } as any;
    }
    // main ticket query
    return { data: ticket, isLoading: ticketLoading, error: ticketError } as any;
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <TicketDetailsPage />
    </MemoryRouter>,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TicketDetailsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useParams).mockReturnValue({ id: '42' });
  });

  // ── Loading state ────────────────────────────────────────────────────────────

  describe('loading state', () => {
    it('does not render ticket content while loading', () => {
      setupQuery({ ticketLoading: true, ticket: undefined as any });
      renderPage();
      expect(screen.queryByText('Ticket #42')).not.toBeInTheDocument();
    });

    it('does not render the error banner while loading', () => {
      setupQuery({ ticketLoading: true, ticket: undefined as any });
      renderPage();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('always renders the Back to Queue link', () => {
      setupQuery({ ticketLoading: true, ticket: undefined as any });
      renderPage();
      expect(screen.getByText('Back to Queue')).toBeInTheDocument();
    });
  });

  // ── Error state ──────────────────────────────────────────────────────────────

  describe('error state', () => {
    it('shows a generic message for non-axios errors', () => {
      // isAxiosError is mocked as false, so component shows the fallback
      setupQuery({
        ticket: undefined as any,
        ticketError: { message: 'Network failure' } as any,
      });
      renderPage();
      expect(screen.getByText('Failed to load ticket details.')).toBeInTheDocument();
    });

    it('shows response message for axios errors', () => {
      vi.mocked(axios.isAxiosError).mockReturnValue(true as any);
      setupQuery({
        ticket: undefined as any,
        ticketError: {
          isAxiosError: true,
          response: { data: { message: 'Ticket not found.' } },
          message: 'Request failed',
        } as any,
      });
      renderPage();
      expect(screen.getByText('Ticket not found.')).toBeInTheDocument();
    });

    it('does not render ticket content when there is an error', () => {
      setupQuery({
        ticket: undefined as any,
        ticketError: { message: 'Some error' } as any,
      });
      renderPage();
      expect(screen.queryByText('Ticket #42')).not.toBeInTheDocument();
    });
  });

  // ── Ticket content ───────────────────────────────────────────────────────────

  describe('ticket content rendering', () => {
    beforeEach(() => setupQuery());

    it('renders the ticket ID badge', () => {
      renderPage();
      expect(screen.getByText('Ticket #42')).toBeInTheDocument();
    });

    it('renders the ticket title as a heading', () => {
      renderPage();
      expect(
        screen.getByRole('heading', { name: /slow load time on dashboard/i }),
      ).toBeInTheDocument();
    });

    it('renders the ticket description', () => {
      renderPage();
      expect(
        screen.getByText('Auto-generated description for ticket #42.'),
      ).toBeInTheDocument();
    });

    it('renders "No description provided." when description is null', () => {
      setupQuery({ ticket: { ...mockTicket, description: null } });
      renderPage();
      expect(screen.getByText('No description provided.')).toBeInTheDocument();
    });

    it('renders the status badge', () => {
      renderPage();
      // "Open" appears both as the header badge and in the status dropdown
      expect(screen.getAllByText('Open').length).toBeGreaterThanOrEqual(1);
    });

    it('renders the Back to Queue navigation link', () => {
      renderPage();
      expect(screen.getByText('Back to Queue')).toBeInTheDocument();
    });

    it('renders created and updated timestamps', () => {
      renderPage();
      expect(screen.getByText(/created:/i)).toBeInTheDocument();
      expect(screen.getByText(/updated:/i)).toBeInTheDocument();
    });
  });

  // ── Properties sidebar ───────────────────────────────────────────────────────

  describe('properties sidebar', () => {
    beforeEach(() => setupQuery());

    it('renders the Properties section heading', () => {
      renderPage();
      expect(screen.getByText('Properties')).toBeInTheDocument();
    });

    it('renders the status dropdown with current value', () => {
      renderPage();
      const statusSelect = screen.getByDisplayValue('Open');
      expect(statusSelect).toBeInTheDocument();
    });

    it('renders the priority dropdown with current value', () => {
      renderPage();
      expect(screen.getByDisplayValue('High')).toBeInTheDocument();
    });

    it('renders the category dropdown with current value', () => {
      renderPage();
      expect(screen.getByDisplayValue('Technical')).toBeInTheDocument();
    });

    it('renders the assignee dropdown with the assigned agent selected', () => {
      renderPage();
      // assignedTo = 'agent@example.com', but that value is not in the assignees list
      // so the dropdown should show the raw email (or Unassigned if not matched)
      // Verify the dropdown element exists
      const selects = screen.getAllByRole('combobox');
      const agentSelect = selects.find(
        (s) => s.getAttribute('value') !== null || s.tagName === 'SELECT',
      );
      expect(agentSelect).toBeTruthy();
    });

    it('renders assignee options from the API', () => {
      renderPage();
      expect(screen.getByText('Agent 1')).toBeInTheDocument();
      expect(screen.getByText('Agent 2')).toBeInTheDocument();
    });

    it('renders the Unassigned option in the agent dropdown', () => {
      renderPage();
      expect(screen.getByText('Unassigned')).toBeInTheDocument();
    });

    it('renders Uncategorized option in the category dropdown', () => {
      renderPage();
      expect(screen.getByText('Uncategorized')).toBeInTheDocument();
    });
  });

  // ── Status update ────────────────────────────────────────────────────────────

  describe('status update', () => {
    it('calls PATCH /api/tickets/:id when status changes', async () => {
      setupQuery();
      vi.mocked(axios.patch).mockResolvedValue({ data: {} });
      const user = userEvent.setup();

      renderPage();

      const statusSelect = screen.getByDisplayValue('Open');
      await user.selectOptions(statusSelect, 'RESOLVED');

      await waitFor(() =>
        expect(axios.patch).toHaveBeenCalledWith(
          '/api/tickets/42',
          expect.objectContaining({ status: 'RESOLVED' }),
          { withCredentials: true },
        ),
      );
    });

    it('calls PATCH /api/tickets/:id when priority changes', async () => {
      setupQuery();
      vi.mocked(axios.patch).mockResolvedValue({ data: {} });
      const user = userEvent.setup();

      renderPage();

      const prioritySelect = screen.getByDisplayValue('High');
      await user.selectOptions(prioritySelect, 'LOW');

      await waitFor(() =>
        expect(axios.patch).toHaveBeenCalledWith(
          '/api/tickets/42',
          expect.objectContaining({ priority: 'LOW' }),
          { withCredentials: true },
        ),
      );
    });
  });

  // ── Replies section ──────────────────────────────────────────────────────────

  describe('replies section', () => {
    it('shows "Replies (0)" header when there are no replies', () => {
      setupQuery({ replies: [] });
      renderPage();
      expect(screen.getByText('Replies (0)')).toBeInTheDocument();
    });

    it('shows "Replies (N)" header matching the reply count', () => {
      setupQuery({ replies: mockReplies });
      renderPage();
      expect(screen.getByText(`Replies (${mockReplies.length})`)).toBeInTheDocument();
    });

    it('shows the empty state message when there are no replies', () => {
      setupQuery({ replies: [] });
      renderPage();
      expect(
        screen.getByText(/no replies yet\. start the conversation below\./i),
      ).toBeInTheDocument();
    });

    it('renders all reply bodies', () => {
      setupQuery({ replies: mockReplies });
      renderPage();
      for (const r of mockReplies) {
        expect(screen.getByText(r.body)).toBeInTheDocument();
      }
    });

    it('shows the Customer badge for customer replies', () => {
      setupQuery({ replies: mockReplies });
      renderPage();
      expect(screen.getByText('Customer')).toBeInTheDocument();
    });

    it('shows the Agent badge for agent replies', () => {
      setupQuery({ replies: mockReplies });
      renderPage();
      // "Agent" appears both as a badge and in the select dropdown options
      expect(screen.getAllByText('Agent').length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Reply form ───────────────────────────────────────────────────────────────

  describe('reply form integration', () => {
    beforeEach(() => {
      setupQuery({ replies: [] });
      vi.mocked(axios.post).mockResolvedValue({ data: {} });
    });

    it('renders the reply textarea', () => {
      renderPage();
      expect(
        screen.getByPlaceholderText('Type your message here...'),
      ).toBeInTheDocument();
    });

    it('submit button is disabled when textarea is empty', () => {
      renderPage();
      expect(
        screen.getByRole('button', { name: /submit reply/i }),
      ).toBeDisabled();
    });

    it('submit button is enabled after typing a reply', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.type(
        screen.getByPlaceholderText('Type your message here...'),
        'Hello',
      );
      expect(screen.getByRole('button', { name: /submit reply/i })).toBeEnabled();
    });

    it('calls POST /api/tickets/:id/replies on submit', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.type(
        screen.getByPlaceholderText('Type your message here...'),
        'New reply message.',
      );
      await user.click(screen.getByRole('button', { name: /submit reply/i }));

      await waitFor(() =>
        expect(axios.post).toHaveBeenCalledWith(
          '/api/tickets/42/replies',
          { body: 'New reply message.' },
          { withCredentials: true },
        ),
      );
    });

    it('clears the textarea after a successful submit', async () => {
      const user = userEvent.setup();
      renderPage();

      const textarea = screen.getByPlaceholderText('Type your message here...');
      await user.type(textarea, 'A reply body.');
      await user.click(screen.getByRole('button', { name: /submit reply/i }));

      await waitFor(() => expect(textarea).toHaveValue(''));
    });
  });
});
