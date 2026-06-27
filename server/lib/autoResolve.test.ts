import { describe, it, expect, vi, beforeEach } from "vitest";
import { autoResolveTicketAsync } from "./autoResolve";
import { prisma } from "./db";
import { promises as fs } from "fs";
import { TicketStatus } from "../generated/prisma/enums";

// Mock DB
vi.mock("./db", () => ({
  prisma: {
    ticket: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    reply: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

// Mock fs
vi.mock("fs", () => ({
  promises: {
    readFile: vi.fn(),
  },
}));

// Mock vercel ai sdk
vi.mock("ai", () => ({
  generateText: vi.fn(),
}));
vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn(),
}));

describe("Auto-Resolution Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "mock";
  });

  it("transitions status to PROCESSING, then fallback to OPEN if knowledge-base.md is missing", async () => {
    vi.mocked(fs.readFile).mockRejectedValueOnce(new Error("File not found"));
    vi.mocked(prisma.ticket.findUnique).mockResolvedValueOnce({
      id: 42,
      assignedTo: "ai@example.com",
    } as any);

    await autoResolveTicketAsync(42, "Refund request", "I want my money back");

    // First update: status = PROCESSING
    expect(prisma.ticket.update).toHaveBeenNthCalledWith(1, {
      where: { id: 42 },
      data: { status: TicketStatus.PROCESSING },
    });

    // Second update: status = OPEN, unassigned
    expect(prisma.ticket.update).toHaveBeenNthCalledWith(2, {
      where: { id: 42 },
      data: { status: TicketStatus.OPEN, assignedTo: null },
    });
  });

  it("auto-resolves ticket using mock fallback if title contains refund keyword", async () => {
    vi.mocked(fs.readFile).mockResolvedValueOnce("# Helpdesk KB\nRefund Policy: We offer refunds.");
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: "ai-user-1",
      email: "ai@example.com",
    } as any);

    await autoResolveTicketAsync(101, "Double charge refund", "I was charged twice on my credit card");

    // 1st: PROCESSING
    expect(prisma.ticket.update).toHaveBeenNthCalledWith(1, {
      where: { id: 101 },
      data: { status: TicketStatus.PROCESSING },
    });

    // Create reply
    expect(prisma.reply.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ticketId: 101,
          userId: "ai-user-1",
          body: expect.stringContaining("refund"),
        }),
      })
    );

    // 2nd: RESOLVED and resolvedByAI: true
    expect(prisma.ticket.update).toHaveBeenNthCalledWith(2, {
      where: { id: 101 },
      data: { status: TicketStatus.RESOLVED, resolvedByAI: true },
    });
  });

  it("defaults to OPEN if mock fallback does not find keyword match", async () => {
    vi.mocked(fs.readFile).mockResolvedValueOnce("# Helpdesk KB\nOther policies.");
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: "ai-user-1",
      email: "ai@example.com",
    } as any);
    vi.mocked(prisma.ticket.findUnique).mockResolvedValueOnce({
      id: 102,
      assignedTo: "ai@example.com",
    } as any);

    await autoResolveTicketAsync(102, "Random query", "Just checking in to say hello");

    // 1st: PROCESSING
    expect(prisma.ticket.update).toHaveBeenNthCalledWith(1, {
      where: { id: 102 },
      data: { status: TicketStatus.PROCESSING },
    });

    // Reply not created
    expect(prisma.reply.create).not.toHaveBeenCalled();

    // 2nd: OPEN, unassigned since it was assigned to AI
    expect(prisma.ticket.update).toHaveBeenNthCalledWith(2, {
      where: { id: 102 },
      data: { status: TicketStatus.OPEN, assignedTo: null },
    });
  });

  it("keeps the human agent assigned if auto-resolution fails and ticket is not assigned to AI", async () => {
    vi.mocked(fs.readFile).mockResolvedValueOnce("# Helpdesk KB\nOther policies.");
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: "ai-user-1",
      email: "ai@example.com",
    } as any);
    vi.mocked(prisma.ticket.findUnique).mockResolvedValueOnce({
      id: 102,
      assignedTo: "human@example.com",
    } as any);

    await autoResolveTicketAsync(102, "Random query", "Just checking in to say hello");

    // 2nd: OPEN, but assignedTo is undefined (remains unchanged)
    expect(prisma.ticket.update).toHaveBeenNthCalledWith(2, {
      where: { id: 102 },
      data: { status: TicketStatus.OPEN, assignedTo: undefined },
    });
  });

  it("addresses the customer by first name and signs with code with ai support", async () => {
    vi.mocked(fs.readFile).mockResolvedValueOnce("# Helpdesk KB\nRefund Policy: We offer refunds.");
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: "ai-user-1",
      email: "ai@example.com",
    } as any);

    const description = `From: John Doe <john.doe@example.com>\nTo: support@example.com\nDate: 2026-06-27T10:00:00Z\n\nI want a refund.`;
    await autoResolveTicketAsync(103, "Refund Request", description);

    expect(prisma.reply.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ticketId: 103,
          userId: "ai-user-1",
          body: expect.stringContaining("Hi John,"),
        }),
      })
    );
    expect(prisma.reply.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ticketId: 103,
          userId: "ai-user-1",
          body: expect.stringContaining("Best regards,\ncode with ai support"),
        }),
      })
    );
  });

  it("falls back to mock resolver if OpenAI API throws an error", async () => {
    // Enable AI path by setting API key to non-mock
    process.env.OPENAI_API_KEY = "sk-real-key-placeholder";
    
    vi.mocked(fs.readFile).mockResolvedValueOnce("# Helpdesk KB\nRefund Policy: We offer refunds.");
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: "ai-user-1",
      email: "ai@example.com",
    } as any);

    // Mock generateText to throw an error (simulating OpenAI failure)
    const { generateText } = await import("ai");
    vi.mocked(generateText).mockRejectedValueOnce(new Error("OpenAI Rate Limit Exceeded"));

    const description = `From: Alice Smith <alice@example.com>\n\nI want a refund.`;
    await autoResolveTicketAsync(104, "Refund Request", description);

    // Should successfully fallback to mock resolver and auto-resolve the ticket
    expect(prisma.reply.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ticketId: 104,
          userId: "ai-user-1",
          body: expect.stringContaining("Hi Alice,"),
        }),
      })
    );
    expect(prisma.reply.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ticketId: 104,
          userId: "ai-user-1",
          body: expect.stringContaining("Best regards,\ncode with ai support"),
        }),
      })
    );

    expect(prisma.ticket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 104 },
        data: { status: TicketStatus.RESOLVED, resolvedByAI: true },
      })
    );
  });
});
