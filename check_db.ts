import { PrismaClient } from "./server/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "server/.env") });

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const tickets = await prisma.ticket.findMany({
    orderBy: { createdAt: "desc" }
  });
  console.log("Total tickets in DB:", tickets.length);
  console.log("Newest 5 tickets:");
  console.log(tickets.slice(0, 5).map(t => ({ id: t.id, title: t.title, createdAt: t.createdAt })));
}

main();
