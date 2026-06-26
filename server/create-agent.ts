import { prisma } from "./lib/db";
import { hashPassword } from "@better-auth/utils/password";
import { Role } from "./generated/prisma/enums";

const email = "agent@example.com";
const password = "password123";

async function main() {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Agent user already exists: ${email}`);
    process.exit(0);
  }

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      emailVerified: true,
      name: "Agent",
      role: Role.AGENT,
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

  console.log(`Agent user created: ${email}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
