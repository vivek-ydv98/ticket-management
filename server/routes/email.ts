import { Router } from "express";
import { prisma } from "../lib/db";
import { createTicketFromEmail, normalizeEmailContent, classifyEmailTicketAsync } from "../lib/email";
import type { Request, Response } from "express";

// Get webhook path from environment or use default
const EMAIL_WEBHOOK_PATH = process.env.EMAIL_WEBHOOK_PATH || "/receive";

const router = Router();

/**
 * POST /api/email/receive
 * Endpoint to receive incoming emails via webhook (e.g., from SendGrid)
 * Expects raw email content in the request body (various formats supported)
 */
router.post(EMAIL_WEBHOOK_PATH, async (req: Request, res: Response) => {
  try {
    // Get the raw email content from the request body
    const rawEmailContent = req.body;

    if (!rawEmailContent) {
      return res.status(400).json({
        error: "Invalid email content",
        message: "Email content is required"
      });
    }

    // Normalize the email content to handle different webhook formats
    const emailContent = normalizeEmailContent(rawEmailContent);

    if (!emailContent || typeof emailContent !== 'string' || emailContent.trim() === '') {
      return res.status(400).json({
        error: "Invalid email content",
        message: "Email content must be a non-empty string after normalization"
      });
    }

    // Create a ticket from the email
    const ticket = await createTicketFromEmail(emailContent);

    // Return success response
    res.status(201).json({
      message: "Ticket created successfully from email",
      ticketId: ticket.id,
      ticket: {
        id: ticket.id,
        title: ticket.title,
        status: ticket.status,
        category: ticket.category,
        priority: ticket.priority,
        description: ticket.description
      }
    });

    // Fire-and-forget: classify the ticket in the background
    classifyEmailTicketAsync(ticket.id, ticket.title, ticket.description ?? "");
  } catch (error: any) {
    console.error("Failed to process email:", error);

    // Check if it's a validation error (missing sender)
    if (error.message && error.message.includes('Sender email address is required')) {
      return res.status(400).json({
        error: "Invalid email content",
        message: "Sender email address is required"
      });
    }

    // Return error response
    res.status(500).json({
      error: "Failed to process email",
      message: "An error occurred while processing the incoming email"
    });
  }
});

/**
 * GET /api/email/health
 * Health check endpoint for email service
 */
router.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "Email service is healthy", timestamp: new Date().toISOString() });
});

export default router;