import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prisma } from './db';

const { mockSendMail, mockConnect, mockLogout, mockAppend, mockGetMailboxLock, mockSearch, mockFetchOne, mockMessageFlagsAdd } = vi.hoisted(() => ({
  mockSendMail: vi.fn().mockResolvedValue({ messageId: 'test-id-123' }),
  mockConnect: vi.fn().mockResolvedValue(true),
  mockLogout: vi.fn().mockResolvedValue(true),
  mockAppend: vi.fn().mockResolvedValue(true),
  mockGetMailboxLock: vi.fn().mockResolvedValue({ release: vi.fn() }),
  mockSearch: vi.fn().mockResolvedValue([{ toString: () => '1' }]),
  mockFetchOne: vi.fn().mockResolvedValue({ source: Buffer.from('From: test@example.com\nTo: support@example.com\nSubject: Test\n\nHello') }),
  mockMessageFlagsAdd: vi.fn().mockResolvedValue(true)
}));

// Mock nodemailer
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn().mockReturnValue({
      sendMail: mockSendMail
    })
  }
}));

// Mock imapflow
vi.mock('imapflow', () => ({
  ImapFlow: vi.fn().mockImplementation(() => ({
    connect: mockConnect,
    logout: mockLogout,
    append: mockAppend,
    getMailboxLock: mockGetMailboxLock,
    search: mockSearch,
    fetchOne: mockFetchOne,
    messageFlagsAdd: mockMessageFlagsAdd
  }))
}));

import { normalizeEmailContent, createTicketFromEmail, sendEmailNotification, startIMAPListener, stopIMAPListener } from './email';

// Mock prisma.ticket.create
vi.mock('./db', () => ({
  prisma: {
    ticket: {
      create: vi.fn().mockResolvedValue({
        id: 1,
        title: 'Test Ticket',
        status: 'OPEN',
        category: null, // Changed to null to reflect optional category with no default
        priority: 'MEDIUM'
      })
    }
  }
}));

describe('Email Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ALLOWED_SENDER_EMAIL = '*';
    process.env.DISABLE_OUTBOUND_EMAIL = 'false';
  });

  describe('normalizeEmailContent', () => {
    it('should handle plain string input', () => {
      const input = 'Subject: Test\nFrom: test@example.com\n\nHello world';
      const result = normalizeEmailContent(input);
      expect(result).toBe(input);
    });

    it('should handle SendGrid format', () => {
      const input = {
        headers: 'Received: by mail.example.com',
        subject: 'Test Subject',
        from: 'sender@example.com',
        to: 'recipient@example.com',
        text: 'This is the email body'
      };
      const result = normalizeEmailContent(input);
      expect(result).toContain('Subject: Test Subject');
      expect(result).toContain('From: sender@example.com');
      expect(result).toContain('To: recipient@example.com');
      expect(result).toContain('This is the email body');
    });

    it('should handle empty input gracefully', () => {
      expect(normalizeEmailContent(null)).toBe('null');
      expect(normalizeEmailContent(undefined)).toBeUndefined();
    });
  });

  describe('createTicketFromEmail', () => {
    it('should create a ticket from valid email content', async () => {
      const emailContent = `Subject: Test Issue
From: chandanm.enjay@gmail.com
To: support@example.com

Hello, I need help with something.`;

      const result = await createTicketFromEmail(emailContent);

      expect(result).toHaveProperty('id', 1);
      expect(result.title).toBe('Test Ticket');
      expect(result.status).toBe('OPEN');
      expect(result.category).toBeNull(); // Category should be null (optional, no default)
      expect(result.priority).toBe('MEDIUM');

      // Verify prisma.ticket.create was called
      expect(prisma.ticket.create).toHaveBeenCalled();
    });

    it('should throw error when sender is missing', async () => {
      const emailContent = `Subject: Test Issue
To: support@example.com

Hello, I need help with something.`;

      await expect(createTicketFromEmail(emailContent))
        .rejects
        .toThrow('Sender email address is required');
    });

    it('should handle errors gracefully', async () => {
      // Make prisma throw an error
      (prisma.ticket.create as any).mockRejectedValueOnce(new Error('Database error'));

      await expect(createTicketFromEmail(`Subject: Test
From: chandanm.enjay@gmail.com
To: support@example.com

Test body`))
        .rejects
        .toThrow('Database error');
    });

    it('should return null if sender is not chandanm.enjay@gmail.com', async () => {
      const emailContent = `Subject: Test
From: spammer@spammer.com
To: support@example.com

Test body`;

      const result = await createTicketFromEmail(emailContent);
      expect(result).toBeNull();
    });
  });

  describe('sendEmailNotification', () => {
    beforeEach(() => {
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_USER = 'support@example.com';
      process.env.SMTP_PASSWORD = 'app-password';
      process.env.IMAP_HOST = 'imap.example.com';
      process.env.IMAP_USER = 'support@example.com';
      process.env.IMAP_PASSWORD = 'app-password';
    });

    afterEach(() => {
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASSWORD;
      delete process.env.IMAP_HOST;
      delete process.env.IMAP_USER;
      delete process.env.IMAP_PASSWORD;
    });

    it('should send email using nodemailer when SMTP details are provided', async () => {
      await sendEmailNotification('recipient@example.com', 'Test Subject', '<p>Hello</p>');
      expect(mockSendMail).toHaveBeenCalled();
    });
  });

  describe('IMAP Listener', () => {
    it('should skip starting IMAP listener if credentials are not configured', () => {
      const logSpy = vi.spyOn(console, 'log');
      startIMAPListener();
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Listener skipped'));
      logSpy.mockRestore();
    });
  });
});