import { test, expect } from '@playwright/test';

test.describe('Email Webhook Endpoint', () => {
  test('should create a ticket from a valid email', async ({ request }) => {
    const response = await request.post('http://localhost:3000/api/email/receive', {
      data: {
        subject: 'Test Support Request',
        from: 'customer@example.com',
        to: 'support@example.com',
        text: 'Hello, I need help with my account. I cannot log in and need to reset my password.'
      }
    });

    expect(response.ok()).toBeTruthy();
    const json = await response.json();
    expect(json).toHaveProperty('message', 'Ticket created successfully from email');
    expect(json).toHaveProperty('ticketId');
    expect(typeof json.ticketId).toBe('number');
    expect(json.ticket).toMatchObject({
      id: expect.any(Number),
      title: '[Email] Test Support Request',
      status: 'NEW',
      category: null,
      priority: 'MEDIUM'
    });
  });

  test('should return 400 when sender email is missing', async ({ request }) => {
    const response = await request.post('http://localhost:3000/api/email/receive', {
      data: {
        subject: 'Test Support Request',
        to: 'support@example.com',
        text: 'Hello, I need help with my account.'
      }
    });

    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(400);
    const json = await response.json();
    expect(json).toHaveProperty('error', 'Invalid email content');
    expect(json).toHaveProperty('message', 'Sender email address is required');
  });

  test('should handle SendGrid webhook format', async ({ request }) => {
    const response = await request.post('http://localhost:3000/api/email/receive', {
      form: {
        subject: 'SendGrid Test',
        from: 'sender@example.com',
        to: 'recipient@example.com',
        text: 'This is a test email from SendGrid webhook.',
        headers: 'Received: by mail.example.com with SMTP id abc123'
      }
    });

    expect(response.ok()).toBeTruthy();
    const json = await response.json();
    expect(json).toHaveProperty('message', 'Ticket created successfully from email');
    expect(json.ticket).toMatchObject({
      title: '[Email] SendGrid Test',
      status: 'NEW',
      category: null,
      priority: 'MEDIUM'
    });
  });

  test('should handle email with HTML body', async ({ request }) => {
    const response = await request.post('http://localhost:3000/api/email/receive', {
      form: {
        subject: 'HTML Email Test',
        from: 'user@example.com',
        to: 'support@example.com',
        text: 'This is the plain text version.',
        html: '<p>This is the <strong>HTML</strong> version.</p>',
        headers: 'Received: by mail.example.com'
      }
    });

    expect(response.ok()).toBeTruthy();
    const json = await response.json();
    expect(json).toHaveProperty('message', 'Ticket created successfully from email');
    // The description should contain the HTML body because we prefer HTML over plain text
    expect(json.ticket.description).toContain('<p>This is the <strong>HTML</strong> version.</p>');
  });

  test('should handle email with empty body', async ({ request }) => {
    const response = await request.post('http://localhost:3000/api/email/receive', {
      form: {
        subject: 'Empty Body Test',
        from: 'user@example.com',
        to: 'support@example.com',
        text: '',
        headers: 'Received: by mail.example.com'
      }
    });

    expect(response.ok()).toBeTruthy();
    const json = await response.json();
    expect(json).toHaveProperty('message', 'Ticket created successfully from email');
    // The description should still have the headers and subject, but the body will be empty
    expect(json.ticket.description).toContain('From: user@example.com');
    expect(json.ticket.description).toContain('To: support@example.com');
    expect(json.ticket.description).toContain('Original Subject: Empty Body Test');
    // The body part after the separator should be empty (just whitespace which gets trimmed)
    // We'll check that the description ends with the separator and then maybe a newline but no actual body
    const description = json.ticket.description;
    const separatorIndex = description.indexOf('---');
    expect(separatorIndex).toBeGreaterThan(-1);
    const afterSeparator = description.substring(separatorIndex + 4).trim();
    expect(afterSeparator).toBe(''); // After trimming, it should be empty
  });

  test('should handle email with special characters', async ({ request }) => {
    const response = await request.post('http://localhost:3000/api/email/receive', {
      form: {
        subject: 'Special chars: àáâãäå & symbols: <>\"\'',
        from: 'user+test@example.com',
        to: 'support@example.com',
        text: 'Body with special chars: àáâãäå & symbols: <>\"\'',
        headers: 'Received: by mail.example.com'
      }
    });

    expect(response.ok()).toBeTruthy();
    const json = await response.json();
    expect(json).toHaveProperty('message', 'Ticket created successfully from email');
    expect(json.ticket.title).toBe('[Email] Special chars: àáâãäå & symbols: <>\"\'');
    // The description should contain the special characters as well
    expect(json.ticket.description).toContain('Special chars: àáâãäå & symbols: <>\"\'');
    expect(json.ticket.description).toContain('Body with special chars: àáâãäå & symbols: <>\"\'');
  });

  test('should handle raw email string input', async ({ request }) => {
    const rawEmail = `Subject: Raw Email Test
From: sender@example.com
To: support@example.com
Date: ${new Date().toISOString()}

This is the body of the raw email.`;

    const response = await request.post('http://localhost:3000/api/email/receive', {
      data: rawEmail,
      headers: {
        'Content-Type': 'text/plain'
      }
    });

    expect(response.ok()).toBeTruthy();
    const json = await response.json();
    expect(json).toHaveProperty('message', 'Ticket created successfully from email');
    expect(json.ticket.title).toBe('[Email] Raw Email Test');
    expect(json.ticket.description).toContain('From: sender@example.com');
    expect(json.ticket.description).toContain('To: support@example.com');
    expect(json.ticket.description).toContain('Original Subject: Raw Email Test');
    expect(json.ticket.description).toContain('This is the body of the raw email.');
  });
});