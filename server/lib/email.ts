import { simpleParser } from 'mailparser';
import { prisma } from './db';
import { TicketStatus, TicketCategory, TicketPriority } from '../generated/prisma/enums';

/**
 * Normalizes email content from various webhook formats to a standard email string
 *
 * @param rawContent - Raw content from webhook (could be string, object, etc.)
 * @returns Normalized email content as a string
 */
export function normalizeEmailContent(rawContent: any): string {
  // Handle string input (raw email)
  if (typeof rawContent === 'string') {
    return rawContent;
  }

  // Handle SendGrid Inbound Parse Webhook format
  if (typeof rawContent === 'object' && rawContent !== null) {
    // SendGrid sends form data with specific fields
    if (rawContent.headers && (rawContent.text || rawContent.html)) {
      // Reconstruct email from SendGrid components
      const subject = rawContent.subject || 'No Subject';

      // Handle from field - could be string, empty string, or undefined
      let fromValue = '';
      if (typeof rawContent.from === 'string') {
        fromValue = rawContent.from.trim();
      }
      const toValue = typeof rawContent.to === 'string' && rawContent.to.trim() !== ''
                    ? rawContent.to.trim()
                    : 'unknown@example.com';
      
      const hasHtml = typeof rawContent.html === 'string' && rawContent.html.trim() !== '';
      const textValue = hasHtml ? rawContent.html : (typeof rawContent.text === 'string' ? rawContent.text : '');

      let fromLine = '';
      if (fromValue !== '') {
        fromLine = `From: ${fromValue}`;
      }

      const contentTypeLine = hasHtml ? 'Content-Type: text/html; charset=utf-8\n' : '';
      return `${contentTypeLine}Subject: ${subject}\n${fromLine}\nTo: ${toValue}\n\n${textValue}`;
    }

    // Handle Mandrill-style inbound
    if (rawContent.email && typeof rawContent.email === 'string') {
      try {
        const parsedEmail = JSON.parse(rawContent.email);
        if (parsedEmail.headers) {
          return parsedEmail.headers;
        }
      } catch (e) {
        // Not JSON, treat as plain text
      }
    }

    // Handle Mailgun-style webhook
    if (rawContent['message-headers'] && typeof rawContent['message-headers'] === 'string') {
      const headers = rawContent['message-headers'];
      const body = rawContent['body-plain'] || '';
      return `${headers}\n\n${body}`;
    }

    // Handle generic object - try to extract common fields
    if (rawContent.subject || rawContent.from || rawContent.text || rawContent.body || rawContent.html) {
      const subject = rawContent.subject || 'No Subject';
      const from = rawContent.from; // Keep as is, could be undefined
      const to = rawContent.to || 'unknown@example.com';
      
      const hasHtml = typeof rawContent.html === 'string' && rawContent.html.trim() !== '';
      const body = hasHtml ? rawContent.html : (rawContent.text || rawContent.body || '');

      let fromLine = '';
      if (from) {
        fromLine = `From: ${from}`;
      }

      const contentTypeLine = hasHtml ? 'Content-Type: text/html; charset=utf-8\n' : '';
      return `${contentTypeLine}Subject: ${subject}\n${fromLine}\nTo: ${to}\n\n${body}`;
    }
  }

  // Fallback: stringify the object
  return JSON.stringify(rawContent, null, 2);
}

/**
 * Parses an incoming email and creates a ticket from it
 *
 * @param emailContent - The raw email content as a string
 * @returns The created ticket object
 * @throws Error if sender is missing
 */
export async function createTicketFromEmail(emailContent: string) {
  try {
    // Parse the email using mailparser
    const parsed = await simpleParser(emailContent);

    // Extract email details
    const subject = parsed.subject || 'No Subject';

    // Extract sender address from parsed.from (handle multiple possible formats) or envelope
    let fromAddress: string | null = null;
    const mail = parsed as any;

    // Handle mail.from being an array of address objects
    if (Array.isArray(mail.from) && mail.from.length > 0) {
      // Take the first address
      fromAddress = mail.from[0].address || null;
    }
    // Handle mail.from being an object with a value property (array of address objects)
    else if (mail.from && typeof mail.from === 'object' && 'value' in mail.from &&
             Array.isArray(mail.from.value) && mail.from.value.length > 0) {
      // Take the first address from the value array
      fromAddress = mail.from.value[0].address || null;
    }
    // Handle mail.from being a single address object
    else if (mail.from && typeof mail.from === 'object' && 'address' in mail.from) {
      fromAddress = mail.from.address || null;
    }

    // If not found, try the envelope (SMTP envelope sender)
    if (!fromAddress && mail.envelope) {
      if (Array.isArray(mail.envelope.from) && mail.envelope.from.length > 0) {
        fromAddress = mail.envelope.from[0].address || null;
      } else if (mail.envelope.from && typeof mail.envelope.from === 'object' && 'address' in mail.envelope.from) {
        fromAddress = mail.envelope.from.address || null;
      }
    }

    // Extract recipient address (keeping original method for now to avoid breaking changes)
    const to = (mail.to && !Array.isArray(mail.to) ? mail.to.text : Array.isArray(mail.to) ? mail.to[0]?.text : '') ?? '';
    const date = parsed.date ?? new Date();

    // Extract body - prefer HTML, fallback to plain text
    let body = (parsed.html || parsed.text || '') as string;

    // Clean up the body if needed (remove excessive whitespace, etc.)
    // Only trim if body is a string
    if (typeof body === 'string') {
      body = body.trim();
    }

    // Validate that sender is present
    if (!fromAddress) {
      throw new Error('Sender email address is required');
    }

    // Create a descriptive title from the email subject
    const title = `[Email] ${subject}`;

    // Create description with email metadata
    const description = `
From: ${fromAddress}
To: ${to}
Date: ${date.toISOString()}

Original Subject: ${subject}

---
${body}
    `.trim();

    // Determine category - optional, no default value (will be undefined if not determined)
    let category: TicketCategory | undefined = undefined;
    // TODO: Implement category detection based on email content/sender

    // Determine priority - could analyze content for urgency indicators
    const priority: TicketPriority = TicketPriority.MEDIUM;

    // Use OPEN as the initial status
    const status: TicketStatus = TicketStatus.OPEN;

    // Create the ticket in the database
    const ticket = await prisma.ticket.create({
      data: {
        title,
        description,
        status,
        category,
        priority,
        // We could extract assignee from email rules, but for now leave unassigned
        assignedTo: null,
      }
    });

    return ticket;
  } catch (error) {
    console.error('Error creating ticket from email:', error);
    throw error;
  }
}

/**
 * Sends an email notification (using SendGrid)
 * This would be used for sending replies or notifications
 */
export async function sendEmailNotification(to: string, subject: string, htmlContent: string) {
  // Implementation would go here using @sendgrid/mail
  // For now, we'll just log it since the focus is on receiving emails
  console.log(`Would send email to: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Content: ${htmlContent}`);

  // TODO: Implement actual SendGrid sending
  /*
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.EMAIL_API_KEY);

  const msg = {
    to,
    from: process.env.EMAIL_FROM_ADDRESS,
    subject,
    html: htmlContent,
  };

  await sgMail.send(msg);
  */
}

/**
 * Extracts potential assignee from email content or headers
 * This could be enhanced to look for specific patterns or integrations
 */
export function extractAssigneeFromEmail(parsedEmail: any): string | null {
  // For now, return null (no assignee)
  // This could be enhanced to:
  // 1. Look for specific email patterns
  // 2. Check against known user emails
  // 3. Parse CC/TO analysis, etc.
  return null;
}

// ---------------------------------------------------------------------------
// Auto-classification helpers (non-blocking, same gpt-5-nano pattern)
// ---------------------------------------------------------------------------

const VALID_CATEGORIES = ["GENERAL", "TECHNICAL", "REFUND_REQUEST"] as const;
type ClassifyCategory = typeof VALID_CATEGORIES[number];

function classifyEmailByKeywords(title: string, description: string): ClassifyCategory {
  const text = `${title} ${description}`.toLowerCase();
  const refundKw = ["refund", "charge", "invoice", "billing", "double charged", "overcharged", "cancellation", "cancel", "transaction", "money back", "purchase"];
  const technicalKw = ["error", "bug", "crash", "timeout", "api", "integration", "not working", "broken", "failed", "exception", "500", "404", "memory", "performance", "slow", "ssl", "certificate", "postgres", "postgresql", "database", "query", "pool", "connection"];
  if (refundKw.some((kw) => text.includes(kw))) return "REFUND_REQUEST";
  if (technicalKw.some((kw) => text.includes(kw))) return "TECHNICAL";
  return "GENERAL";
}

/**
 * Non-blocking ticket classifier for email-originated tickets.
 * Called after the webhook response is sent — never delays the caller.
 * Uses gpt-5-nano; falls back to keyword heuristics on API absence or failure.
 */
export async function classifyEmailTicketAsync(ticketId: number, title: string, description: string): Promise<void> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    let category: ClassifyCategory;

    if (!apiKey || apiKey === "mock" || apiKey.includes("your_openai_api_key")) {
      category = classifyEmailByKeywords(title, description);
      console.log(`[classify-email] ticket #${ticketId} → ${category} (keyword fallback)`);
    } else {
      // Dynamic import to keep email.ts free from hard AI-SDK dependency at module level
      const { generateText } = await import("ai");
      const { openai } = await import("@ai-sdk/openai");

      const systemPrompt = `You are a support ticket classifier. Given a ticket title and description, respond with EXACTLY one of these category labels and nothing else:\nGENERAL\nTECHNICAL\nREFUND_REQUEST\n\nRules:\n- TECHNICAL: bugs, errors, crashes, performance issues, API problems, integration failures, database questions.\n- REFUND_REQUEST: refunds, charge disputes, billing errors, double charges, cancellations, money-back requests.\n- GENERAL: everything else — questions, feature requests, account queries, documentation.`;

      const prompt = `Title: ${title}\nDescription: ${description || "(none)"}\n\nCategory:`;

      const { text } = await generateText({
        model: openai("gpt-5-nano"),
        system: systemPrompt,
        prompt,
      });

      const raw = text.trim().toUpperCase().replace(/[^A-Z_]/g, "") as ClassifyCategory;
      category = VALID_CATEGORIES.includes(raw as any) ? raw : classifyEmailByKeywords(title, description);
      console.log(`[classify-email] ticket #${ticketId} → ${category} (AI)`);
    }

    await prisma.ticket.update({
      where: { id: ticketId },
      data: { category },
    });
  } catch (err) {
    console.error(`[classify-email] Failed to classify ticket #${ticketId}:`, err);
  }
}