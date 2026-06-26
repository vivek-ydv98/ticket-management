import { Router } from "express";
import { prisma } from "../lib/db";
import { auth } from "../lib/auth";
import { requireAdmin } from "../lib/requireAdmin";
import { createUserSchema, updateUserSchema, Role } from "../../core/src/index";
import { ZodError } from "zod";

const router = Router();

// GET /api/users
router.get("/", requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  res.json(users);
});

// POST /api/users
router.post("/", requireAdmin, async (req, res) => {
  const result = createUserSchema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.errors.map(err => ({
      field: err.path[0] ?? 'root',
      message: err.message,
    }));
    // Return first error for simplicity, or we could return all
    const firstError = errors[0] || { message: "Invalid input" };
    return res.status(400).json({
      error: firstError.message,
      message: firstError.message,
    });
  }

  const { name, email, password } = result.data;
  const normalizedEmail = email.trim().toLowerCase();

  try {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });
    if (existingUser) {
      return res.status(400).json({
        error: "Email is already in use.",
        message: "Email is already in use."
      });
    }

    // Get the password hasher from Better Auth context
    const ctx = await (auth as any).$context;
    const hashedPassword = await ctx.password.hash(password);

    // Create the User and Account records inside a transaction
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          role: Role.AGENT,
        }
      });

      await tx.account.create({
        data: {
          userId: user.id,
          providerId: "credential",
          accountId: normalizedEmail,
          password: hashedPassword,
        }
      });

      return user;
    });

    res.status(201).json(newUser);
  } catch (error: any) {
    console.error("Failed to create user:", error);
    return res.status(500).json({
      error: "Failed to create user due to a database error.",
      message: "Failed to create user due to a database error."
    });
  }
});

// PUT /api/users/:id
router.put("/:id", requireAdmin, async (req, res) => {
  const id = req.params.id as string;
  const result = updateUserSchema.safeParse(req.body);
  if (!result.success) {
    const firstError = result.error.errors[0] || { message: "Invalid input" };
    return res.status(400).json({
      error: firstError.message,
      message: firstError.message,
    });
  }

  const { name, email, password } = result.data;
  const normalizedEmail = email.trim().toLowerCase();

  try {
    // Check if user exists
    const userToUpdate = await prisma.user.findUnique({
      where: { id },
      include: { accounts: { where: { providerId: "credential" } } },
    });

    if (!userToUpdate || userToUpdate.deletedAt) {
      return res.status(404).json({
        error: "User not found.",
        message: "User not found.",
      });
    }

    // If email is changing, make sure new email is not in use by another user
    if (userToUpdate.email !== normalizedEmail) {
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (existingUser) {
        return res.status(400).json({
          error: "Email is already in use.",
          message: "Email is already in use.",
        });
      }
    }

    let hashedPassword = undefined;
    if (password && password.trim() !== "") {
      const ctx = await (auth as any).$context;
      hashedPassword = await ctx.password.hash(password);
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: {
          name: name.trim(),
          email: normalizedEmail,
        },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          role: true,
          createdAt: true,
        },
      });

      // Update the credential account's accountId (email) and password (if changed)
      const credentialAccount = userToUpdate.accounts[0];
      if (credentialAccount) {
        await tx.account.update({
          where: { id: credentialAccount.id },
          data: {
            accountId: normalizedEmail,
            ...(hashedPassword ? { password: hashedPassword } : {}),
          },
        });
      }

      return user;
    });

    res.json(updatedUser);
  } catch (error: any) {
    console.error("Failed to update user:", error);
    return res.status(500).json({
      error: "Failed to update user due to a database error.",
      message: "Failed to update user due to a database error.",
    });
  }
});

// DELETE /api/users/:id
router.delete("/:id", requireAdmin, async (req, res) => {
  const id = req.params.id as string;

  try {
    const userToDelete = await prisma.user.findUnique({
      where: { id },
    });

    if (!userToDelete || userToDelete.deletedAt) {
      return res.status(404).json({
        error: "User not found.",
        message: "User not found.",
      });
    }

    if (userToDelete.role === Role.ADMIN) {
      return res.status(400).json({
        error: "Administrator accounts cannot be deleted.",
        message: "Administrator accounts cannot be deleted.",
      });
    }

    // Soft delete the user and revoke all sessions in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });

      // Delete all active sessions
      await tx.session.deleteMany({
        where: { userId: id },
      });
    });

    res.json({ message: "User deleted successfully." });
  } catch (error: any) {
    console.error("Failed to delete user:", error);
    return res.status(500).json({
      error: "Failed to delete user due to a database error.",
      message: "Failed to delete user due to a database error.",
    });
  }
});

export default router;