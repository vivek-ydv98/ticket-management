import { promises as fs } from "fs";
import path from "path";
import { prisma } from "./db";
import { TicketStatus } from "../generated/prisma/enums";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { getCustomerFirstName } from "./email";

/**
 * Automatically attempts to resolve a newly arrived support ticket in the background.
 * Uses the knowledge-base.md file and GPT-5-nano (or a keyword fallback) to decide
 * if the ticket can be resolved.
 *
 * Flow:
 * 1. Set status to PROCESSING.
 * 2. Read knowledge-base.md.
 * 3. Try to resolve using AI or mock keyword fallback.
 * 4. If resolved: create AI reply and set status to RESOLVED (with resolvedByAI = true).
 * 5. If not resolved: set status to OPEN.
 */
export async function autoResolveTicketAsync(
  ticketId: number,
  title: string,
  description: string
): Promise<void> {
  console.log(`[auto-resolve] Starting auto-resolution for ticket #${ticketId}...`);

  try {
    // 1. Transition status to PROCESSING
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: TicketStatus.PROCESSING },
    });

    // 2. Locate and read knowledge-base.md from project root
    const kbPath = path.join(__dirname, "../../knowledge-base.md");
    let kbContent = "";
    try {
      kbContent = await fs.readFile(kbPath, "utf-8");
    } catch (err) {
      console.warn(`[auto-resolve] Knowledge base file missing or unreadable at ${kbPath}. Defaulting ticket #${ticketId} to OPEN.`, err);
      const currentTicket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { assignedTo: true }
      });
      await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: TicketStatus.OPEN,
          assignedTo: currentTicket?.assignedTo === "ai@example.com" ? null : undefined,
        },
      });
      return;
    }

    // 3. Ensure the AI Assistant user exists
    let aiUser = await prisma.user.findUnique({
      where: { email: "ai@example.com" },
    });
    if (!aiUser) {
      aiUser = await prisma.user.create({
        data: {
          email: "ai@example.com",
          name: "AI",
          role: "AGENT",
        },
      });
    }

    // 4. Check API Key for AI vs Fallback Mock
    const apiKey = process.env.OPENAI_API_KEY;
    const aiUserId = aiUser?.id || "ai-user-id";
    if (!apiKey || apiKey === "mock" || apiKey.includes("your_openai_api_key")) {
      await runMockResolveFallback(ticketId, title, description, aiUserId);
    } else {
      try {
        await runAIResolution(ticketId, title, description, kbContent, aiUserId);
      } catch (aiErr) {
        console.error(`[auto-resolve] AI resolution failed for ticket #${ticketId}, falling back to mock:`, aiErr);
        await runMockResolveFallback(ticketId, title, description, aiUserId);
      }
    }
  } catch (error) {
    console.error(`[auto-resolve] Critical failure during auto-resolution for ticket #${ticketId}:`, error);
    // Graceful fallback to OPEN if anything throws
    try {
      const currentTicket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { assignedTo: true }
      });
      await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: TicketStatus.OPEN,
          assignedTo: currentTicket?.assignedTo === "ai@example.com" ? null : undefined,
        },
      });
    } catch (dbErr) {
      console.error(`[auto-resolve] Failed to reset ticket #${ticketId} status to OPEN:`, dbErr);
    }
  }
}

/**
 * Keyword-based heuristic auto-resolution fallback when OpenAI is unavailable.
 */
async function runMockResolveFallback(
  ticketId: number,
  title: string,
  description: string,
  aiUserId: string
): Promise<void> {
  const firstName = await getCustomerFirstName(ticketId, description);
  const text = `${title} ${description}`.toLowerCase();
  let replyBody = "";

  if (/\brefund(s)?\b/i.test(text)) {
    replyBody = `Hi ${firstName},\n\nI noticed you are inquiring about a refund. According to our policy, we offer a 100% money-back guarantee for all purchases made within the last 30 days. Your request has been forwarded to our billing department, and they will process the refund back to your original payment method. This usually takes 5-7 business days.\n\nBest regards,\ncode with ai support`;
  } else if (/\b(password|login(s)?)\b/i.test(text)) {
    replyBody = `Hi ${firstName},\n\nIt looks like you are having trouble resetting your password or logging in. You can reset your password by visiting https://codewithai.com/forgot-password. Enter your email address to receive a secure link valid for 1 hour.\n\nBest regards,\ncode with ai support`;
  } else if (/\b(api|webhook(s)?|documentation)\b/i.test(text)) {
    replyBody = `Hi ${firstName},\n\nRegarding your request about our API or webhook configuration, you can find our complete API documentation and setup guides at https://codewithai.com/docs/api. Rate limits are 100 req/min (Starter) and 1000 req/min (Enterprise).\n\nBest regards,\ncode with ai support`;
  } else if (/\b(pricing|cost(s)?|plan(s)?|discount(s)?)\b/i.test(text)) {
    replyBody = `Hi ${firstName},\n\nThanks for your inquiry! Our pricing plans can be viewed at https://codewithai.com/pricing. We offer Starter ($15/mo), Professional ($49/mo), and Enterprise (custom) tiers. We offer a 15% discount for annual billing on all plans.\n\nBest regards,\ncode with ai support`;
  }

  if (replyBody) {
    // Create the AI reply in DB
    await prisma.reply.create({
      data: {
        ticketId,
        userId: aiUserId,
        body: replyBody,
        bodyhtml: `<p>${replyBody.replace(/\n/g, "<br>")}</p>`,
        senderType: "AGENT",
      },
    });

    // Mark ticket as resolved by AI
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: TicketStatus.RESOLVED,
        resolvedByAI: true,
      },
    });

    // If the ticket originated from an email, send the response email
    if (title.startsWith("[Email]")) {
      const emailMatch = description.match(/From:\s*(?:[^<\n\r]+<)?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\s*>?/i);
      if (emailMatch) {
        const customerEmail = emailMatch[1]!.trim();
        const emailSubject = `Re: ${title.replace("[Email] ", "")}`;
        const { sendEmailNotification } = require("./email");
        sendEmailNotification(customerEmail, emailSubject, replyBody)
          .catch((err: any) => console.error("[SMTP] Failed to send AI auto-resolve reply email:", err));
      }
    }

    console.log(`[auto-resolve] Ticket #${ticketId} auto-resolved (mock fallback)`);
  } else {
    // Cannot resolve, mark as OPEN for agents
    const currentTicket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { assignedTo: true }
    });
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: TicketStatus.OPEN,
        assignedTo: currentTicket?.assignedTo === "ai@example.com" ? null : undefined,
      },
    });
    console.log(`[auto-resolve] Ticket #${ticketId} could not be resolved (mock fallback). Moved to OPEN.`);
  }
}

/**
 * Runs gpt-5-nano based auto-resolution using the knowledge base file context.
 */
async function runAIResolution(
  ticketId: number,
  title: string,
  description: string,
  kbContent: string,
  aiUserId: string
): Promise<void> {
  const firstName = await getCustomerFirstName(ticketId, description);
  const systemPrompt = `You are an automated support ticket resolver.
Analyze the user's support ticket and determine if it can be completely resolved using the provided Knowledge Base.

Knowledge Base content:
"""
${kbContent}
"""

Instructions:
1. First, decide if the ticket can be fully resolved based ONLY on the Knowledge Base.
2. Respond in a JSON format matching this schema:
{
  "canResolve": boolean, // true if the ticket can be fully resolved, false otherwise
  "replyBody": string // if canResolve is true, write a polite, professional, and clear reply resolving their issue. If false, leave this empty.
}

Rules for replyBody:
- Address the customer politely by their first name: "${firstName}" (e.g. "Hi ${firstName},").
- Provide a clear, actionable resolution.
- Refer ONLY to facts/policies/links in the Knowledge Base. Do NOT make up any info.
- Make sure the reply has a professional and customer-friendly tone, and is properly formatted.
- Sign off using:
Best regards,
code with ai support

Do not include any other text outside the JSON object.`;

  const prompt = `Ticket Details:
Title: ${title}
Description: ${description || "(no description)"}`;

  const { text } = await generateText({
    model: openai("gpt-5-nano"),
    system: systemPrompt,
    prompt: prompt,
    maxRetries: 0,
  });

  let result = { canResolve: false, replyBody: "" };
  try {
    const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(cleaned);
    if (typeof parsed.canResolve === "boolean") {
      result = parsed;
    }
  } catch (err) {
    console.error(`[auto-resolve] Failed to parse JSON response from GPT for ticket #${ticketId}:`, text, err);
    // Fallback to keyword mock if AI failed to return valid JSON
    return runMockResolveFallback(ticketId, title, description, aiUserId);
  }

  if (result.canResolve && result.replyBody) {
    await prisma.reply.create({
      data: {
        ticketId,
        userId: aiUserId,
        body: result.replyBody,
        bodyhtml: `<p>${result.replyBody.replace(/\n/g, "<br>")}</p>`,
        senderType: "AGENT",
      },
    });

    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: TicketStatus.RESOLVED,
        resolvedByAI: true,
      },
    });

    // If the ticket originated from an email, send the response email
    if (title.startsWith("[Email]")) {
      const emailMatch = description.match(/From:\s*(?:[^<\n\r]+<)?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\s*>?/i);
      if (emailMatch) {
        const customerEmail = emailMatch[1]!.trim();
        const emailSubject = `Re: ${title.replace("[Email] ", "")}`;
        const { sendEmailNotification } = require("./email");
        sendEmailNotification(customerEmail, emailSubject, result.replyBody)
          .catch((err: any) => console.error("[SMTP] Failed to send AI auto-resolve reply email:", err));
      }
    }

    console.log(`[auto-resolve] Ticket #${ticketId} auto-resolved (AI)`);
  } else {
    const currentTicket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { assignedTo: true }
    });
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: TicketStatus.OPEN,
        assignedTo: currentTicket?.assignedTo === "ai@example.com" ? null : undefined,
      },
    });
    console.log(`[auto-resolve] Ticket #${ticketId} could not be resolved (AI). Moved to OPEN.`);
  }
}
