import { Router } from "express";
import { prisma } from "../lib/db";
import { requireAuth } from "../lib/requireAuth";
import { createTicketSchema, ticketQuerySchema, createReplySchema } from "../../core/src/index";
import { JSDOM } from "jsdom";
import createDOMPurify from "dompurify";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { autoResolveTicketAsync } from "../lib/autoResolve";
import { getCustomerFirstName } from "../lib/email";

const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window as any);

const router = Router();

// GET /api/tickets - List tickets with filtering, sorting, and search
router.get("/", requireAuth, async (req, res) => {
  const result = ticketQuerySchema.safeParse(req.query);
  if (!result.success) {
    return res.status(400).json({
      error: result.error.errors[0]?.message || "Invalid query parameters.",
      message: result.error.errors[0]?.message || "Invalid query parameters."
    });
  }

  const { status, category, priority, sortBy, sortOrder, search, page, limit } = result.data;
  const where: any = {};
  where.resolvedByAI = false;

  if (status) {
    where.status = status;
  }

  if (category) {
    where.category = category;
  }

  if (priority) {
    where.priority = priority;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { assignedTo: { contains: search, mode: "insensitive" } },
    ];
  }

  // Sort: default to newest first (createdAt desc)
  let orderBy: any = { createdAt: "desc" };

  if (sortBy) {
    if (sortBy === "newest") {
      orderBy = { createdAt: "desc" };
    } else if (sortBy === "oldest") {
      orderBy = { createdAt: "asc" };
    } else {
      const order = sortOrder === "asc" ? ("asc" as const) : ("desc" as const);
      orderBy = { [sortBy]: order };
    }
  }

  const pageNum = page ?? 1;
  const limitNum = limit ?? 10;
  const skip = (pageNum - 1) * limitNum;

  try {
    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.ticket.count({ where }),
    ]);

    res.json({
      tickets,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error("Failed to fetch tickets:", error);
    res.status(500).json({
      error: "Failed to fetch tickets due to a database error.",
      message: "Failed to fetch tickets due to a database error."
    });
  }
});

const VALID_CATEGORIES = ["GENERAL", "TECHNICAL", "REFUND_REQUEST"] as const;
type TicketCategory = typeof VALID_CATEGORIES[number];

/**
 * Non-blocking ticket classifier.
 * Called after the ticket creation response is sent — never delays the API caller.
 * Uses gpt-5-nano to pick the best TicketCategory from title + description.
 * Falls back to keyword heuristics if the API key is missing or the call fails.
 */
async function classifyTicketAsync(ticketId: number, title: string, description: string): Promise<void> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    let category: TicketCategory;

    if (!apiKey || apiKey === "mock" || apiKey.includes("your_openai_api_key")) {
      category = classifyByKeywords(title, description);
      console.log(`[classify] ticket #${ticketId} → ${category} (keyword fallback)`);
    } else {
      const systemPrompt = `You are a support ticket classifier. Given a ticket title and description, respond with EXACTLY one of these category labels and nothing else:
GENERAL
TECHNICAL
REFUND_REQUEST

Rules:
- TECHNICAL: bugs, errors, crashes, performance issues, API problems, integration failures.
- REFUND_REQUEST: refunds, charge disputes, billing errors, double charges, cancellations.
- GENERAL: everything else — questions, feature requests, account queries, documentation.`;

      const prompt = `Title: ${title}\nDescription: ${description || "(none)"}\n\nCategory:`;

      const { text } = await generateText({
        model: openai("gpt-5-nano"),
        system: systemPrompt,
        prompt,
      });

      const raw = text.trim().toUpperCase().replace(/[^A-Z_]/g, "") as TicketCategory;
      category = VALID_CATEGORIES.includes(raw as any) ? raw : classifyByKeywords(title, description);
      console.log(`[classify] ticket #${ticketId} → ${category} (AI)`);
    }

    await prisma.ticket.update({
      where: { id: ticketId },
      data: { category },
    });
  } catch (err) {
    console.error(`[classify] Failed to classify ticket #${ticketId}:`, err);
  }
}

/** Lightweight keyword heuristic fallback for when the AI is unavailable */
function classifyByKeywords(title: string, description: string): TicketCategory {
  const text = `${title} ${description}`.toLowerCase();
  const refundKeywords = ["refund", "charge", "invoice", "billing", "double charged", "overcharged", "cancellation", "cancel", "transaction"];
  const technicalKeywords = ["error", "bug", "crash", "timeout", "api", "integration", "not working", "broken", "failed", "exception", "500", "404", "memory", "performance", "slow", "ssl", "certificate"];
  if (refundKeywords.some((kw) => text.includes(kw))) return "REFUND_REQUEST";
  if (technicalKeywords.some((kw) => text.includes(kw))) return "TECHNICAL";
  return "GENERAL";
}

/** Helper for background processing of new tickets */
async function processNewTicketBackground(ticketId: number, title: string, description: string, hasCategory: boolean) {
  try {
    await autoResolveTicketAsync(ticketId, title, description);
    if (!hasCategory) {
      await classifyTicketAsync(ticketId, title, description);
    }
  } catch (err) {
    console.error(`[background-process] Failed for ticket #${ticketId}:`, err);
  }
}

// POST /api/tickets - Create a new ticket
router.post("/", requireAuth, async (req, res) => {
  const result = createTicketSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: result.error.errors[0]?.message || "Invalid input data.",
      message: result.error.errors[0]?.message || "Invalid input data."
    });
  }

  const { title, description, status, category, priority, assignedTo } = result.data;

  try {
    if (assignedTo) {
      const user = await prisma.user.findUnique({
        where: { email: assignedTo.trim().toLowerCase() },
      });
      if (!user || user.deletedAt) {
        return res.status(400).json({
          error: "Assigned agent must be a valid, active user.",
          message: "Assigned agent must be a valid, active user."
        });
      }
    }

    const ticket = await prisma.ticket.create({
      data: {
        title,
        description,
        status,
        category: category || null,
        priority,
        assignedTo: assignedTo || "ai@example.com",
      },
    });

    // Respond immediately — do NOT await classification.
    res.status(201).json(ticket);

    // Fire-and-forget: resolve and classify ticket in the background.
    processNewTicketBackground(ticket.id, title, description ?? "", !!category);
  } catch (error) {
    console.error("Failed to create ticket:", error);
    res.status(500).json({
      error: "Failed to create ticket due to a database error.",
      message: "Failed to create ticket due to a database error."
    });
  }
});

// GET /api/tickets/stats - Get ticket metrics for the dashboard
router.get("/stats", requireAuth, async (req, res) => {
  try {
    // 1. Total tickets
    const totalTickets = await prisma.ticket.count();

    // 2. Open tickets
    const openTickets = await prisma.ticket.count({
      where: { status: "OPEN" }
    });

    // 3. Number of tickets resolved by AI
    const resolvedByAI = await prisma.ticket.count({
      where: { resolvedByAI: true, status: "RESOLVED" }
    });

    // 4. Percentage of tickets resolved by AI
    const percentResolvedByAI = totalTickets > 0 ? Math.round((resolvedByAI / totalTickets) * 100) : 0;

    // 5. Average resolution time (RESOLVED and CLOSED tickets)
    const resolvedOrClosedTickets = await prisma.ticket.findMany({
      where: {
        status: { in: ["RESOLVED", "CLOSED"] }
      },
      select: {
        createdAt: true,
        updatedAt: true
      }
    });

    let averageResolutionTimeMs = 0;
    if (resolvedOrClosedTickets.length > 0) {
      const totalTimeMs = resolvedOrClosedTickets.reduce((acc, ticket) => {
        const duration = new Date(ticket.updatedAt).getTime() - new Date(ticket.createdAt).getTime();
        return acc + Math.max(0, duration);
      }, 0);
      averageResolutionTimeMs = Math.round(totalTimeMs / resolvedOrClosedTickets.length);
    }

    // 6. Tickets per day over the past 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const ticketsLast30Days = await prisma.ticket.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      select: {
        createdAt: true
      }
    }) || [];

    const dailyCounts: { [dateStr: string]: number } = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      dailyCounts[dateStr] = 0;
    }

    ticketsLast30Days.forEach(ticket => {
      const dateStr = new Date(ticket.createdAt).toISOString().split("T")[0];
      if (dailyCounts[dateStr] !== undefined) {
        dailyCounts[dateStr]++;
      }
    });

    const ticketsPerDay = Object.keys(dailyCounts).sort().map(dateStr => ({
      date: dateStr,
      count: dailyCounts[dateStr]
    }));

    res.json({
      totalTickets,
      openTickets,
      resolvedByAI,
      percentResolvedByAI,
      averageResolutionTimeMs,
      ticketsPerDay
    });
  } catch (error) {
    console.error("Failed to fetch ticket stats:", error);
    res.status(500).json({
      error: "Failed to fetch ticket stats",
      message: "Failed to fetch ticket stats"
    });
  }
});

// GET /api/tickets/:id - Get a ticket by ID
router.get("/:id", requireAuth, async (req, res) => {
  const idStr = req.params.id as string;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) {
    return res.status(400).json({
      error: "Invalid ticket ID format.",
      message: "Invalid ticket ID format."
    });
  }

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return res.status(404).json({
        error: "Ticket not found.",
        message: "Ticket not found."
      });
    }

    res.json(ticket);
  } catch (error) {
    console.error("Failed to fetch ticket details:", error);
    res.status(500).json({
      error: "Failed to fetch ticket details due to a database error.",
      message: "Failed to fetch ticket details due to a database error."
    });
  }
});

// PATCH /api/tickets/:id - Update ticket details (e.g. assignedTo, status, priority, category)
router.patch("/:id", requireAuth, async (req, res) => {
  const idStr = req.params.id as string;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) {
    return res.status(400).json({
      error: "Invalid ticket ID format.",
      message: "Invalid ticket ID format."
    });
  }

  const { assignedTo, status, priority, category } = req.body;
  const updateData: any = {};

  try {
    if (assignedTo !== undefined) {
      const targetEmail = (assignedTo === "" || assignedTo === "unassigned") ? null : assignedTo;
      if (targetEmail) {
        const user = await prisma.user.findUnique({
          where: { email: targetEmail.trim().toLowerCase() },
        });
        if (!user || user.deletedAt) {
          return res.status(400).json({
            error: "Assigned agent must be a valid, active user.",
            message: "Assigned agent must be a valid, active user."
          });
        }
        updateData.assignedTo = user.email;
      } else {
        updateData.assignedTo = null;
      }
    }
    if (status !== undefined) {
      updateData.status = status;
    }
    if (priority !== undefined) {
      updateData.priority = priority;
    }
    if (category !== undefined) {
      updateData.category = category === "" ? null : category;
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: updateData,
    });
    res.json(updatedTicket);
  } catch (error) {
    console.error("Failed to update ticket:", error);
    res.status(500).json({
      error: "Failed to update ticket due to a database error.",
      message: "Failed to update ticket due to a database error."
    });
  }
});

// GET /api/tickets/:id/replies - Get all replies for a ticket
router.get("/:id/replies", requireAuth, async (req, res) => {
  const idStr = req.params.id as string;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) {
    return res.status(400).json({
      error: "Invalid ticket ID format.",
      message: "Invalid ticket ID format."
    });
  }

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return res.status(404).json({
        error: "Ticket not found.",
        message: "Ticket not found."
      });
    }

    const replies = await prisma.reply.findMany({
      where: { ticketId: id },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    res.json(replies);
  } catch (error) {
    console.error("Failed to fetch replies:", error);
    res.status(500).json({
      error: "Failed to fetch replies due to a database error.",
      message: "Failed to fetch replies due to a database error."
    });
  }
});

// POST /api/tickets/:id/replies - Create a new reply for a ticket
router.post("/:id/replies", requireAuth, async (req, res) => {
  const idStr = req.params.id as string;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) {
    return res.status(400).json({
      error: "Invalid ticket ID format.",
      message: "Invalid ticket ID format."
    });
  }

  const result = createReplySchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: result.error.errors[0]?.message || "Invalid input data.",
      message: result.error.errors[0]?.message || "Invalid input data."
    });
  }

  const { body, senderType } = result.data;

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return res.status(404).json({
        error: "Ticket not found.",
        message: "Ticket not found."
      });
    }

    const cleanHtml = DOMPurify.sanitize(body);

    const reply = await prisma.reply.create({
      data: {
        ticketId: id,
        userId: req.user!.id,
        body,
        bodyhtml: cleanHtml,
        senderType,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    res.status(201).json(reply);
  } catch (error) {
    console.error("Failed to create reply:", error);
    res.status(500).json({
      error: "Failed to create reply due to a database error.",
      message: "Failed to create reply due to a database error."
    });
  }
});

// POST /api/tickets/polish - Polish a draft reply using AI
router.post("/polish", requireAuth, async (req, res) => {
  const { body, ticketId } = req.body;

  if (!body || typeof body !== "string") {
    return res.status(400).json({
      error: "Reply body is required and must be a string.",
      message: "Reply body is required and must be a string."
    });
  }

  const agentName = req.user?.name || "Support Team";
  let ticketTitle = req.body.ticketTitle || "";
  let ticketDescription = req.body.ticketDescription || "";

  try {

    if (ticketId) {
      const parsedId = typeof ticketId === "number" ? ticketId : parseInt(ticketId, 10);
      if (!isNaN(parsedId)) {
        const ticket = await prisma.ticket.findUnique({
          where: { id: parsedId }
        });
        if (ticket) {
          ticketTitle = ticket.title;
          ticketDescription = ticket.description || "";
        }
      }
    }

    const firstName = await getCustomerFirstName(ticketId, ticketDescription);
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === "mock" || apiKey.includes("your_openai_api_key")) {
      // Mock polishing fallback
      const polishedText = mockPolishReply(body, agentName, firstName, ticketTitle, ticketDescription);
      return res.json({ text: polishedText });
    }

    const systemPrompt = `You are an expert customer support agent. Your task is to polish and improve a draft reply to a support ticket.
Make the reply professional, polite, grammatically correct, and clear.
Always address the customer by their first name: "${firstName}".
For example, start the reply with: "Hi ${firstName}," or similar professional greeting.
Make sure the reply is signed off with:
Best regards,
[Agent Name]
https://codewithai.com

Replace [Agent Name] with "${agentName}".
Provide only the polished reply body. Do not include any meta-commentary, wrappers, markdown formatting (like code blocks), or labels (e.g., "Polished Reply:"). Return only the final text itself.`;

    const prompt = `Ticket Details:
Title: ${ticketTitle || "N/A"}
Description: ${ticketDescription || "N/A"}

Draft Reply to Polish:
${body}

Please improve this draft reply. Make sure to keep the key instructions/meaning intact, but make it professional and clear.
Address the customer as: Hi ${firstName},
Sign off using:
Best regards,
${agentName}
https://codewithai.com`;

    const { text } = await generateText({
      model: openai("gpt-5-nano"),
      system: systemPrompt,
      prompt: prompt,
    });

    res.json({ text: text.trim() });
  } catch (error) {
    console.error("Failed to polish reply via OpenAI, falling back to mock: ", error);
    const firstName = await getCustomerFirstName(ticketId, ticketDescription);
    const polishedText = mockPolishReply(body, agentName, firstName, ticketTitle, ticketDescription);
    res.json({ text: polishedText });
  }
});



// Helper function for mock polishing when API key is missing
function mockPolishReply(body: string, agentName: string, firstName: string, title?: string, desc?: string): string {
  const cleanBody = body.trim();
  if (!cleanBody) {
    return `Hi ${firstName},\n\nThank you for reaching out. How can I assist you with this ticket today?\n\nBest regards,\n${agentName}\nhttps://codewithai.com`;
  }
  
  // Ensure professional greeting if missing
  const greetingRegex = /^(?:hi|hello|dear)(?:\s+there)?\s*[,.!?]*/i;
  let bodyWithoutGreeting = cleanBody;
  if (greetingRegex.test(cleanBody)) {
    bodyWithoutGreeting = cleanBody.replace(greetingRegex, "").trim();
  }

  // Expand common contractions / clean up tone
  let polishedBody = bodyWithoutGreeting
    .replace(/\bi'm\b/gi, "I am")
    .replace(/\bi'll\b/gi, "I will")
    .replace(/\bcan't\b/gi, "cannot")
    .replace(/\bdon't\b/gi, "do not")
    .replace(/\bwon't\b/gi, "will not")
    .replace(/\bwe'll\b/gi, "we will")
    .replace(/\byou're\b/gi, "you are");

  // Capitalize first letter of body
  if (polishedBody) {
    polishedBody = polishedBody.charAt(0).toUpperCase() + polishedBody.slice(1);
  }
  // Capitalize first letter of sentences
  polishedBody = polishedBody.replace(/([.!?]\s+)([a-z])/g, (m, p1, p2) => p1 + p2.toUpperCase());

  // Clean up any existing signature to avoid duplicates
  const signatureRegex = /(?:best\s+regards|sincerely|respectfully|kind\s+regards)[\s\S]*$/i;
  if (signatureRegex.test(polishedBody)) {
    polishedBody = polishedBody.replace(signatureRegex, "").trim();
  }

  // Return greeting, polished body, and signature
  return `Hi ${firstName},\n\n${polishedBody}\n\nBest regards,\n${agentName}\nhttps://codewithai.com`;
}

// POST /api/tickets/:id/summarize - Summarize ticket and conversation history
router.post("/:id/summarize", requireAuth, async (req, res) => {
  const idStr = req.params.id as string;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) {
    return res.status(400).json({
      error: "Invalid ticket ID format.",
      message: "Invalid ticket ID format."
    });
  }

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        replies: {
          orderBy: { createdAt: "asc" },
          include: {
            user: {
              select: {
                name: true,
                email: true,
                role: true
              }
            }
          }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({
        error: "Ticket not found.",
        message: "Ticket not found."
      });
    }

    const repliesList = ticket.replies || [];
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === "mock" || apiKey.includes("your_openai_api_key")) {
      // Mock summarization fallback
      const summary = mockSummarizeTicket(ticket.title, ticket.description || "", repliesList);
      return res.json({ summary });
    }

    const systemPrompt = `You are a helpful customer support assistant. Your task is to write a brief, professional, and clear summary of a support ticket and its conversation history.
Keep it concise, focusing on:
- The main issue the customer reported.
- What has been done so far.
- What the current status or next action is.

Format the summary with:
- A brief paragraph summarizing the situation.
- Bullet points for key milestones or next steps if applicable.

Return ONLY the summary text. Do not include labels, metadata, JSON, markdown code block wrappers, or other formatting.`;

    const prompt = `Ticket: #${ticket.id}: ${ticket.title}
Status: ${ticket.status}
Priority: ${ticket.priority}
Description:
${ticket.description || "No description provided."}

Conversation History (Replies):
${repliesList.map((r, index) => `[Reply #${index + 1} by ${r.senderType} (${r.user?.name || r.user?.email || "Unknown"})]:
${r.body}`).join("\n\n")}

Please summarize the ticket and conversation history.`;

    const { text } = await generateText({
      model: openai("gpt-5-nano"),
      system: systemPrompt,
      prompt: prompt,
    });

    res.json({ summary: text.trim() });
  } catch (error) {
    console.error("Failed to summarize ticket via OpenAI, falling back to mock: ", error);
    try {
      const ticket = await prisma.ticket.findUnique({
        where: { id },
        include: {
          replies: {
            orderBy: { createdAt: "asc" },
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                  role: true
                }
              }
            }
          }
        }
      });
      if (ticket) {
        const summary = mockSummarizeTicket(ticket.title, ticket.description || "", ticket.replies || []);
        return res.json({ summary });
      }
    } catch (innerErr) {
      console.error("Failed to generate fallback summary:", innerErr);
    }
    res.status(500).json({
      error: "Failed to generate ticket summary.",
      message: "Failed to generate ticket summary."
    });
  }
});

// Helper function to mock summarize a ticket
function mockSummarizeTicket(title: string, description: string, replies: any[]): string {
  const repliesCount = replies.length;
  const agentRepliesCount = replies.filter(r => r.senderType === "AGENT").length;
  const customerRepliesCount = replies.filter(r => r.senderType === "CUSTOMER").length;

  let summary = `This ticket, titled "${title}", describes an issue regarding: "${description.split('\n')[0]}".\n\n`;
  summary += `The thread contains ${repliesCount} total replies (${agentRepliesCount} from agents and ${customerRepliesCount} from customers).\n\n`;
  
  if (repliesCount > 0) {
    summary += `Key milestones:\n`;
    const firstReply = replies[0];
    summary += `- The conversation started with a reply by ${firstReply.senderType} stating: "${firstReply.body.substring(0, 60)}${firstReply.body.length > 60 ? '...' : ''}"\n`;
    if (repliesCount > 1) {
      const latestReply = replies[replies.length - 1];
      summary += `- The latest response was from ${latestReply.senderType}: "${latestReply.body.substring(0, 60)}${latestReply.body.length > 60 ? '...' : ''}"\n`;
    }
    summary += `\nNext Action: Review the conversation thread and proceed with resolving the customer's query.`;
  } else {
    summary += `No action has been taken on this ticket yet. The ticket is currently awaiting initial review.`;
  }

  return summary;
}

export default router;

