import { prisma } from "./lib/db";
import { hashPassword } from "@better-auth/utils/password";
import { Role } from "./generated/prisma/enums";

const email = process.env.ADMIN_EMAIL || "admin@example.com";
const password = process.env.ADMIN_PASSWORD || "password123";

const existing = await prisma.user.findUnique({ where: { email } });
if (existing) {
  console.log(`Admin user already exists: ${email}`);
  process.exit(0);
}

const hashedPassword = await hashPassword(password);

const user = await prisma.user.create({
  data: {
    email,
    emailVerified: true,
    name: "Admin",
    role: Role.ADMIN,
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

console.log(`Admin user created: ${email}`);
