import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { normalizeEmailContent, createTicketFromEmail } from './email';
import { prisma } from './db';

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
From: user@example.com
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
From: user@example.com
To: support@example.com

Test body`))
        .rejects
        .toThrow('Database error');
    });
  });
});