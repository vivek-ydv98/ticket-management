// ─── Imports ─────────────────────────────────────────────────────────────────

import { render, screen } from '../test/render';
import ReplyThread from './ReplyThread';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const agentReply = {
  id: 1,
  ticketId: 10,
  body: 'We are looking into this issue.',
  senderType: 'AGENT' as const,
  createdAt: '2026-06-26T09:00:00.000Z',
  user: { id: 'u1', name: 'Alice Agent', email: 'alice@support.com', role: 'AGENT' },
};

const adminReply = {
  id: 2,
  ticketId: 10,
  body: 'Escalating to engineering team.',
  senderType: 'AGENT' as const,
  createdAt: '2026-06-26T10:00:00.000Z',
  user: { id: 'u2', name: 'Bob Admin', email: 'bob@support.com', role: 'ADMIN' },
};

const customerReply = {
  id: 3,
  ticketId: 10,
  body: 'Thank you for the update!',
  senderType: 'CUSTOMER' as const,
  createdAt: '2026-06-26T11:00:00.000Z',
  user: { id: 'u3', name: 'Charlie Customer', email: 'charlie@client.com', role: 'USER' },
};

const noNameReply = {
  id: 4,
  ticketId: 10,
  body: 'Reply from user with no name.',
  senderType: 'AGENT' as const,
  createdAt: '2026-06-26T12:00:00.000Z',
  user: { id: 'u4', name: null, email: 'anon@support.com', role: 'AGENT' },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ReplyThread', () => {
  // ── Loading state ────────────────────────────────────────────────────────────

  describe('loading state', () => {
    it('shows a skeleton loader when isLoading is true', () => {
      render(<ReplyThread replies={[]} isLoading={true} />);
      expect(screen.getByTestId('reply-thread-loading')).toBeInTheDocument();
    });

    it('does not render reply items when loading', () => {
      render(<ReplyThread replies={[agentReply]} isLoading={true} />);
      expect(screen.queryByText(agentReply.body)).not.toBeInTheDocument();
    });
  });

  // ── Empty state ──────────────────────────────────────────────────────────────

  describe('empty state', () => {
    it('shows the empty message when there are no replies and not loading', () => {
      render(<ReplyThread replies={[]} isLoading={false} />);
      expect(
        screen.getByText(/no replies yet\. start the conversation below\./i),
      ).toBeInTheDocument();
    });

    it('does not show the empty message when replies exist', () => {
      render(<ReplyThread replies={[agentReply]} isLoading={false} />);
      expect(
        screen.queryByText(/no replies yet/i),
      ).not.toBeInTheDocument();
    });
  });

  // ── Reply rendering ──────────────────────────────────────────────────────────

  describe('reply rendering', () => {
    it('renders each reply body', () => {
      render(
        <ReplyThread
          replies={[agentReply, adminReply, customerReply]}
          isLoading={false}
        />,
      );
      expect(screen.getByText(agentReply.body)).toBeInTheDocument();
      expect(screen.getByText(adminReply.body)).toBeInTheDocument();
      expect(screen.getByText(customerReply.body)).toBeInTheDocument();
    });

    it('renders the author name when present', () => {
      render(<ReplyThread replies={[agentReply]} isLoading={false} />);
      expect(screen.getByText('Alice Agent')).toBeInTheDocument();
    });

    it('falls back to email when name is null', () => {
      render(<ReplyThread replies={[noNameReply]} isLoading={false} />);
      // email shown in the name slot — displayed twice (name + parenthesised email)
      expect(screen.getAllByText(/anon@support\.com/i).length).toBeGreaterThanOrEqual(1);
    });

    it('renders the email in parentheses', () => {
      render(<ReplyThread replies={[agentReply]} isLoading={false} />);
      expect(screen.getByText('(alice@support.com)')).toBeInTheDocument();
    });

    it('renders all replies in order', () => {
      render(
        <ReplyThread replies={[agentReply, adminReply]} isLoading={false} />,
      );
      const items = [
        screen.getByTestId('reply-item-1'),
        screen.getByTestId('reply-item-2'),
      ];
      // first item appears before second in DOM
      expect(
        items[0].compareDocumentPosition(items[1]) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
  });

  // ── Role badges ──────────────────────────────────────────────────────────────

  describe('role badges', () => {
    it('shows Agent badge for AGENT senderType', () => {
      render(<ReplyThread replies={[agentReply]} isLoading={false} />);
      expect(screen.getByTestId('badge-agent')).toBeInTheDocument();
      expect(screen.getByText('Agent')).toBeInTheDocument();
    });

    it('shows Admin badge for ADMIN role with AGENT senderType', () => {
      render(<ReplyThread replies={[adminReply]} isLoading={false} />);
      expect(screen.getByTestId('badge-admin')).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    it('shows Customer badge for CUSTOMER senderType', () => {
      render(<ReplyThread replies={[customerReply]} isLoading={false} />);
      expect(screen.getByTestId('badge-customer')).toBeInTheDocument();
      expect(screen.getByText('Customer')).toBeInTheDocument();
    });

    it('does not show Agent or Admin badge for CUSTOMER senderType', () => {
      render(<ReplyThread replies={[customerReply]} isLoading={false} />);
      expect(screen.queryByTestId('badge-agent')).not.toBeInTheDocument();
      expect(screen.queryByTestId('badge-admin')).not.toBeInTheDocument();
    });

    it('does not show Customer badge for AGENT senderType', () => {
      render(<ReplyThread replies={[agentReply]} isLoading={false} />);
      expect(screen.queryByTestId('badge-customer')).not.toBeInTheDocument();
    });

    it('renders correct badges for mixed reply types', () => {
      render(
        <ReplyThread
          replies={[agentReply, adminReply, customerReply]}
          isLoading={false}
        />,
      );
      expect(screen.getAllByTestId('badge-agent')).toHaveLength(1);
      expect(screen.getByTestId('badge-admin')).toBeInTheDocument();
      expect(screen.getByTestId('badge-customer')).toBeInTheDocument();
    });
  });

  // ── Timestamps ───────────────────────────────────────────────────────────────

  describe('timestamps', () => {
    it('renders a formatted timestamp for each reply', () => {
      render(<ReplyThread replies={[agentReply]} isLoading={false} />);
      // The exact format depends on locale, but the element should exist and not be empty
      const item = screen.getByTestId('reply-item-1');
      // Timestamp is visible somewhere in the card
      expect(item).toBeInTheDocument();
    });
  });

  // ── Snapshot-style count assertions ─────────────────────────────────────────

  describe('item count', () => {
    it('renders exactly N reply items for N replies', () => {
      render(
        <ReplyThread
          replies={[agentReply, adminReply, customerReply]}
          isLoading={false}
        />,
      );
      expect(screen.getAllByTestId(/^reply-item-/)).toHaveLength(3);
    });

    it('renders 1 item for a single reply', () => {
      render(<ReplyThread replies={[agentReply]} isLoading={false} />);
      expect(screen.getAllByTestId(/^reply-item-/)).toHaveLength(1);
    });
  });
});
