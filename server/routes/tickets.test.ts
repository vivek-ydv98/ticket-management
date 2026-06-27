import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import express from "express";
import router from "./tickets";
import { prisma } from "../lib/db";

// Mock database
vi.mock("../lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    ticket: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    reply: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock requireAuth
vi.mock("../lib/requireAuth", () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.user = { id: "1", email: "agent@example.com", role: "AGENT" };
    next();
  },
}));

describe("Ticket Routes - Assignment Validation", () => {
  let app: express.Express;
  let server: any;
  let baseUrl: string;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use("/api/tickets", router);
    
    // Start server on a random port
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        const port = typeof address === "string" ? 0 : address.port;
        baseUrl = `http://localhost:${port}/api/tickets`;
        resolve();
      });
    });
  });

  afterAll(() => {
    server.close();
  });

  it("POST /api/tickets - succeeds if assignedTo is a valid active user", async () => {
    // Mock user exists
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "agent-1",
      email: "agent@example.com",
      deletedAt: null,
    } as any);

    vi.mocked(prisma.ticket.create).mockResolvedValue({
      id: 101,
      title: "New ticket",
      assignedTo: "agent@example.com",
    } as any);

    const res = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "New ticket",
        description: "Need help",
        assignedTo: "agent@example.com",
      }),
    });

    expect(res.status).toBe(201);
    const data = await res.json() as any;
    expect(data.assignedTo).toBe("agent@example.com");
  });

  it("POST /api/tickets - fails with 400 if assignedTo is an invalid/deleted user", async () => {
    // Mock user does not exist
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const res = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "New ticket",
        description: "Need help",
        assignedTo: "nonexistent@example.com",
      }),
    });

    expect(res.status).toBe(400);
    const data = await res.json() as any;
    expect(data.error).toBe("Assigned agent must be a valid, active user.");
  });

  it("POST /api/tickets - fails with 400 if assignedTo user is deleted", async () => {
    // Mock user is deleted
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "agent-deleted",
      email: "deleted@example.com",
      deletedAt: new Date(),
    } as any);

    const res = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "New ticket",
        description: "Need help",
        assignedTo: "deleted@example.com",
      }),
    });

    expect(res.status).toBe(400);
    const data = await res.json() as any;
    expect(data.error).toBe("Assigned agent must be a valid, active user.");
  });

  it("PATCH /api/tickets/:id - succeeds if assignedTo is a valid active user", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "agent-1",
      email: "agent@example.com",
      deletedAt: null,
    } as any);

    vi.mocked(prisma.ticket.update).mockResolvedValue({
      id: 42,
      assignedTo: "agent@example.com",
    } as any);

    const res = await fetch(`${baseUrl}/42`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignedTo: "agent@example.com",
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.assignedTo).toBe("agent@example.com");
  });

  it("PATCH /api/tickets/:id - fails with 400 if assignedTo is an invalid user", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const res = await fetch(`${baseUrl}/42`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignedTo: "nonexistent@example.com",
      }),
    });

    expect(res.status).toBe(400);
    const data = await res.json() as any;
    expect(data.error).toBe("Assigned agent must be a valid, active user.");
  });

  it("PATCH /api/tickets/:id - succeeds if assignedTo is set to null (unassigned)", async () => {
    vi.mocked(prisma.ticket.update).mockResolvedValue({
      id: 42,
      assignedTo: null,
    } as any);

    const res = await fetch(`${baseUrl}/42`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignedTo: null,
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.assignedTo).toBeNull();
  });

  describe("GET /api/tickets/:id/replies", () => {
    it("returns replies for a valid ticket", async () => {
      vi.mocked(prisma.ticket.findUnique).mockResolvedValue({
        id: 42,
        title: "Test Ticket",
      } as any);

      const mockReplies = [
        {
          id: 1,
          ticketId: 42,
          body: "Hello, this is a reply.",
          bodyhtml: "<p>Hello, this is a reply.</p>",
          createdAt: new Date().toISOString(),
          user: { id: "1", name: "Agent", email: "agent@example.com", role: "AGENT" },
        },
      ];
      vi.mocked(prisma.reply.findMany).mockResolvedValue(mockReplies as any);

      const res = await fetch(`${baseUrl}/42/replies`);
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data).toHaveLength(1);
      expect(data[0].body).toBe("Hello, this is a reply.");
      expect(data[0].user.name).toBe("Agent");
    });

    it("returns 404 if the ticket does not exist", async () => {
      vi.mocked(prisma.ticket.findUnique).mockResolvedValue(null);

      const res = await fetch(`${baseUrl}/999/replies`);
      expect(res.status).toBe(404);
      const data = await res.json() as any;
      expect(data.error).toBe("Ticket not found.");
    });
  });

  describe("POST /api/tickets/:id/replies", () => {
    it("creates a new reply successfully", async () => {
      vi.mocked(prisma.ticket.findUnique).mockResolvedValue({
        id: 42,
        title: "Test Ticket",
      } as any);

      const mockCreatedReply = {
        id: 2,
        ticketId: 42,
        body: "I am working on this.",
        bodyhtml: "<p>I am working on this.</p>",
        senderType: "AGENT",
        createdAt: new Date().toISOString(),
        user: { id: "1", name: "Agent", email: "agent@example.com", role: "AGENT" },
      };
      vi.mocked(prisma.reply.create).mockResolvedValue(mockCreatedReply as any);

      const res = await fetch(`${baseUrl}/42/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "I am working on this." }),
      });

      expect(res.status).toBe(201);
      const data = await res.json() as any;
      expect(data.body).toBe("I am working on this.");
      expect(data.user.role).toBe("AGENT");
    });

    it("creates a new reply with custom senderType successfully", async () => {
      vi.mocked(prisma.ticket.findUnique).mockResolvedValue({
        id: 42,
        title: "Test Ticket",
      } as any);

      const mockCreatedReply = {
        id: 2,
        ticketId: 42,
        body: "I am working on this.",
        bodyhtml: "<p>I am working on this.</p>",
        senderType: "CUSTOMER",
        createdAt: new Date().toISOString(),
        user: { id: "1", name: "Agent", email: "agent@example.com", role: "AGENT" },
      };
      vi.mocked(prisma.reply.create).mockResolvedValue(mockCreatedReply as any);

      const res = await fetch(`${baseUrl}/42/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "I am working on this.", senderType: "CUSTOMER" }),
      });

      expect(res.status).toBe(201);
      const data = await res.json() as any;
      expect(data.body).toBe("I am working on this.");
      expect(data.senderType).toBe("CUSTOMER");
      expect(vi.mocked(prisma.reply.create)).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          senderType: "CUSTOMER"
        })
      }));
    });

    it("returns 400 for empty body", async () => {
      const res = await fetch(`${baseUrl}/42/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "" }),
      });

      expect(res.status).toBe(400);
      const data = await res.json() as any;
      expect(data.error).toBe("Reply message cannot be empty.");
    });

    it("returns 404 if the ticket does not exist for the reply", async () => {
      vi.mocked(prisma.ticket.findUnique).mockResolvedValue(null);

      const res = await fetch(`${baseUrl}/999/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "Valid reply body but non-existent ticket." }),
      });

      expect(res.status).toBe(404);
      const data = await res.json() as any;
      expect(data.error).toBe("Ticket not found.");
    });
  });

  describe("POST /api/tickets/polish", () => {
    const originalApiKey = process.env.OPENAI_API_KEY;

    beforeAll(() => {
      process.env.OPENAI_API_KEY = "mock";
    });

    afterAll(() => {
      process.env.OPENAI_API_KEY = originalApiKey;
    });

    it("returns 400 for empty or invalid body", async () => {
      const res = await fetch(`${baseUrl}/polish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "" }),
      });

      expect(res.status).toBe(400);
      const data = await res.json() as any;
      expect(data.error).toBe("Reply body is required and must be a string.");
    });

    it("polishes a reply using mock fallback when API key is missing", async () => {
      const res = await fetch(`${baseUrl}/polish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "i will check the logs" }),
      });

      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.text).toContain("Thank you for contacting support.");
      expect(data.text).toContain("I will check the logs");
      expect(data.text).toContain("Best regards,");
    });

    it("polishes a reply with ticket context from DB if ticketId is provided", async () => {
      vi.mocked(prisma.ticket.findUnique).mockResolvedValue({
        id: 42,
        title: "Database issue",
        description: "Postgres goes down",
      } as any);

      const res = await fetch(`${baseUrl}/polish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "will restart db", ticketId: 42 }),
      });

      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.text.toLowerCase()).toContain("will restart db");
      expect(prisma.ticket.findUnique).toHaveBeenCalledWith({ where: { id: 42 } });
    });

    it("polishes a reply using mock fallback when OpenAI API throws an error", async () => {
      process.env.OPENAI_API_KEY = "invalid-key-to-force-error";
      try {
        const res = await fetch(`${baseUrl}/polish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: "please help me fix this soon" }),
        });

        expect(res.status).toBe(200);
        const data = await res.json() as any;
        expect(data.text).toContain("Thank you for contacting support.");
        expect(data.text).toContain("Please help me fix this soon");
        expect(data.text).toContain("Best regards,");
      } finally {
        process.env.OPENAI_API_KEY = "mock";
      }
    });
  });
});
