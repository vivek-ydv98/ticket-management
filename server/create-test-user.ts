import { prisma } from "./lib/db";
import { hashPassword } from "@better-auth/utils/password";
import { Role } from "./generated/prisma/enums";

const email = "test@example.com";
const password = "password123";

const existing = await prisma.user.findUnique({ where: { email } });
if (existing) {
  console.log(`User already exists: ${email}`);
} else {
  const hashedPassword = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      emailVerified: true,
      name: "Test User",
      role: Role.AGENT, // Not admin
    },
  });

  await prisma.account.create({
    data: {
      userId: user.id,
      providerId: "credential",
      accountId: user.id,
      password: hashedPassword,
    },
  });

  console.log(`Test user created: ${email}`);
}