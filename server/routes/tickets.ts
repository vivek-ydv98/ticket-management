import { Router } from "express";
import { prisma } from "../lib/db";
import { requireAuth } from "../lib/requireAuth";
import { createTicketSchema, ticketQuerySchema } from "../../core/src/index";

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

  const { status, category, sortBy, search } = result.data;
  const where: any = {};

  if (status) {
    where.status = status;
  }

  if (category) {
    where.category = category;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { assignedTo: { contains: search, mode: "insensitive" } },
    ];
  }

  // Sort: default to newest first (createdAt desc)
  const orderBy = {
    createdAt: sortBy === "oldest" ? ("asc" as const) : ("desc" as const),
  };

  try {
    const tickets = await prisma.ticket.findMany({
      where,
      orderBy,
    });
    res.json(tickets);
  } catch (error) {
    console.error("Failed to fetch tickets:", error);
    res.status(500).json({
      error: "Failed to fetch tickets due to a database error.",
      message: "Failed to fetch tickets due to a database error."
    });
  }
});

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
    const ticket = await prisma.ticket.create({
      data: {
        title,
        description,
        status,
        category: category || null,
        priority,
        assignedTo,
      },
    });
    res.status(201).json(ticket);
  } catch (error) {
    console.error("Failed to create ticket:", error);
    res.status(500).json({
      error: "Failed to create ticket due to a database error.",
      message: "Failed to create ticket due to a database error."
    });
  }
});

export default router;
