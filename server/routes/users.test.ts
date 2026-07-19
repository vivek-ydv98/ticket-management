import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import express from "express";

// Mock database
vi.mock("../lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    session: {
      deleteMany: vi.fn(),
    },
    ticket: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(async (callback: any) => {
      // Mock transaction - just call the callback with the mocked prisma
      return callback(prisma);
    }),
  },
}));

// Mock requireAuth and requireAdmin
vi.mock("../lib/requireAuth", () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.user = { id: "admin-1", email: "admin@example.com", role: "ADMIN" };
    next();
  },
}));
vi.mock("../lib/requireAdmin", () => ({
  requireAdmin: (req: any, res: any, next: any) => {
    // Assuming the mock user from requireAuth is admin
    next();
  },
}));

import router from "./users";
import { prisma } from "../lib/db";

describe("User Routes - Deletion Unassigns Tickets", () => {
  let app: express.Express;
  let server: any;
  let baseUrl: string;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use("/api/users", router);

    // Start server on a random port
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        const port = typeof address === "string" ? 0 : address.port;
        baseUrl = `http://localhost:${port}/api/users`;
        resolve();
      });
    });
  });

  afterAll(() => {
    server.close();
  });

  describe("DELETE /api/users/:id", () => {
    it("should unassign tickets when user is deleted", async () => {
      const userId = "user-123";
      const userEmail = "agent@example.com";

      // Mock user to be deleted
      const userToDelete = {
        id: userId,
        email: userEmail,
        role: "AGENT",
        deletedAt: null,
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(userToDelete as any);

      // Make the delete request
      const response = await fetch(`${baseUrl}/${userId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      // Verify response
      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.message).toBe("User deleted successfully.");

      // Verify that ticket unassignment was called
      expect(prisma.ticket.updateMany).toHaveBeenCalledWith({
        where: {
          assignedTo: userEmail.toLowerCase().trim(),
        },
        data: {
          assignedTo: null,
        },
      });
    });

    it("should not fail if user has no assigned tickets", async () => {
      const userId = "user-456";
      const userEmail = "agent2@example.com";

      // Mock user to be deleted
      const userToDelete = {
        id: userId,
        email: userEmail,
        role: "AGENT",
        deletedAt: null,
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(userToDelete as any);
      // Make updateMany return 0 affected rows (no tickets to update)
      vi.mocked(prisma.ticket.updateMany).mockResolvedValue({ count: 0 });

      // Make the delete request
      const response = await fetch(`${baseUrl}/${userId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      // Verify response
      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.message).toBe("User deleted successfully.");

      // Verify that ticket unassignment was still called
      expect(prisma.ticket.updateMany).toHaveBeenCalledWith({
        where: {
          assignedTo: userEmail.toLowerCase().trim(),
        },
        data: {
          assignedTo: null,
        },
      });
    });
  });
});