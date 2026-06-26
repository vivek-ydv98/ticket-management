import { Router } from "express";
import { prisma } from "../lib/db";
import { requireAuth } from "../lib/requireAuth";
import { createTicketSchema, ticketQuerySchema, createReplySchema } from "../../core/src/index";

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

// GET /api/tickets/:id - Get a ticket by ID
router.get("/:id", requireAuth, async (req, res) => {
  const idStr = req.params.id;
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
  const idStr = req.params.id;
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
  const idStr = req.params.id;
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
  const idStr = req.params.id;
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

    const reply = await prisma.reply.create({
      data: {
        ticketId: id,
        userId: req.user!.id,
        body,
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

export default router;

