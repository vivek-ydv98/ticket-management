import { prisma } from "./lib/db";
import { hashPassword } from "@better-auth/utils/password";
import { Role, TicketStatus, TicketCategory, TicketPriority } from "./generated/prisma/enums";

// 1. Create or get Admin user
const adminEmail = "admin@example.com";
let adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });
if (!adminUser) {
  const hashedPassword = await hashPassword("password123");
  adminUser = await prisma.user.create({
    data: {
      email: adminEmail,
      emailVerified: true,
      name: "Admin User",
      role: Role.ADMIN,
    },
  });
  await prisma.account.create({
    data: {
      userId: adminUser.id,
      providerId: "credential",
      accountId: adminUser.id,
      password: hashedPassword,
    },
  });
  console.log(`Admin user created: ${adminEmail}`);
} else {
  console.log(`Admin user already exists: ${adminEmail}`);
}

// 2. Create or get Test/Agent user
const agentEmail = "test@example.com";
let agentUser = await prisma.user.findUnique({ where: { email: agentEmail } });
if (!agentUser) {
  const hashedPassword = await hashPassword("password123");
  agentUser = await prisma.user.create({
    data: {
      email: agentEmail,
      emailVerified: true,
      name: "Test User",
      role: Role.AGENT,
    },
  });
  await prisma.account.create({
    data: {
      userId: agentUser.id,
      providerId: "credential",
      accountId: agentUser.id,
      password: hashedPassword,
    },
  });
  console.log(`Test user created: ${agentEmail}`);
} else {
  console.log(`Test user already exists: ${agentEmail}`);
}

// 2.5. Create or get AI Agent user
const aiEmail = "ai@example.com";
let aiUser = await prisma.user.findUnique({ where: { email: aiEmail } });
if (!aiUser) {
  const hashedPassword = await hashPassword("password123");
  aiUser = await prisma.user.create({
    data: {
      email: aiEmail,
      emailVerified: true,
      name: "AI",
      role: Role.AGENT,
    },
  });
  await prisma.account.create({
    data: {
      userId: aiUser.id,
      providerId: "credential",
      accountId: aiUser.id,
      password: hashedPassword,
    },
  });
  console.log(`AI Agent user created: ${aiEmail}`);
} else {
  console.log(`AI Agent user already exists: ${aiEmail}`);
}

// 3. Clear old tickets
await prisma.ticket.deleteMany();
await prisma.reply.deleteMany();
console.log("Cleared old tickets and replies.");

const now = Date.now();
const DAY = 1000 * 60 * 60 * 24;

// 4. Create diverse tickets spanning 30 days
const ticketsData = [
  { title: "Database connection timeout in production", description: "Database keeps timing out during peak traffic hours. Need to investigate Prisma pool size.", status: TicketStatus.OPEN, category: TicketCategory.TECHNICAL, priority: TicketPriority.HIGH, assignedTo: agentEmail, createdAt: new Date(now - DAY * 0.02) },
  { title: "Request for subscription pricing discount", description: "Enterprise lead asking for 15% annual discount options.", status: TicketStatus.OPEN, category: TicketCategory.GENERAL, priority: TicketPriority.LOW, assignedTo: null, createdAt: new Date(now - DAY * 0.08) },
  { title: "Refund requested for double charge", description: "Invoice #9823 was charged twice on client's card. Please reverse one.", status: TicketStatus.OPEN, category: TicketCategory.REFUND_REQUEST, priority: TicketPriority.HIGH, assignedTo: adminEmail, createdAt: new Date(now - DAY * 0.21) },
  { title: "Login button not working on iOS Safari", description: "Users report click gets swallowed on iOS 17.5 Safari browser.", status: TicketStatus.OPEN, category: TicketCategory.TECHNICAL, priority: TicketPriority.MEDIUM, assignedTo: agentEmail, createdAt: new Date(now - DAY * 0.5) },
  { title: "General inquiry about API rate limits", description: "Client asking if they can increase rate limit to 500 requests/minute.", status: TicketStatus.RESOLVED, category: TicketCategory.GENERAL, priority: TicketPriority.LOW, assignedTo: agentEmail, createdAt: new Date(now - DAY * 2) },
  { title: "Security vulnerability report: Package leak", description: "CVE-2026 reports vulnerability in one of the nested client dependencies.", status: TicketStatus.OPEN, category: TicketCategory.TECHNICAL, priority: TicketPriority.HIGH, assignedTo: null, createdAt: new Date(now - DAY * 3) },
  { title: "Duplicate refund for transaction TX-1002", description: "Accidental double refund issued for a customer return last week.", status: TicketStatus.CLOSED, category: TicketCategory.REFUND_REQUEST, priority: TicketPriority.MEDIUM, assignedTo: adminEmail, createdAt: new Date(now - DAY * 4) },
  { title: "Typo in homepage features section", description: "Change 'Antigravity' to 'Anti-gravity' in marketing copy.", status: TicketStatus.RESOLVED, category: TicketCategory.GENERAL, priority: TicketPriority.LOW, assignedTo: null, createdAt: new Date(now - DAY * 5) },
  { title: "Memory leak on background job runner", description: "Node.js process runs out of memory every 48 hours. Leak likely in email parser.", status: TicketStatus.OPEN, category: TicketCategory.TECHNICAL, priority: TicketPriority.HIGH, assignedTo: agentEmail, createdAt: new Date(now - DAY * 6) },
  { title: "Wrong item shipped to customer #2293", description: "Customer ordered a keyboard but received a mouse instead.", status: TicketStatus.OPEN, category: TicketCategory.GENERAL, priority: TicketPriority.MEDIUM, assignedTo: null, createdAt: new Date(now - DAY * 8) },
  { title: "Billing statement missing invoice details", description: "June invoice does not show the itemized tax breakdown.", status: TicketStatus.OPEN, category: TicketCategory.GENERAL, priority: TicketPriority.LOW, assignedTo: adminEmail, createdAt: new Date(now - DAY * 10) },
  { title: "Cannot upload attachments in ticket thread", description: "Error uploading 5MB PDF file to ticket message.", status: TicketStatus.OPEN, category: TicketCategory.TECHNICAL, priority: TicketPriority.HIGH, assignedTo: agentEmail, createdAt: new Date(now - DAY * 12) },
  { title: "Update documentation for API endpoints", description: "Please document the new query parameters for tickets endpoint.", status: TicketStatus.RESOLVED, category: TicketCategory.GENERAL, priority: TicketPriority.LOW, assignedTo: null, createdAt: new Date(now - DAY * 14) },
  { title: "Broken link in support footer page", description: "Terms of Service link in footer is pointing to localhost.", status: TicketStatus.OPEN, category: TicketCategory.GENERAL, priority: TicketPriority.MEDIUM, assignedTo: null, createdAt: new Date(now - DAY * 16) },
  { title: "Password reset link expires too quickly", description: "Users complain the link expires in 5 minutes instead of 1 hour.", status: TicketStatus.OPEN, category: TicketCategory.TECHNICAL, priority: TicketPriority.HIGH, assignedTo: adminEmail, createdAt: new Date(now - DAY * 18) },
  { title: "Data export feature missing CSV columns", description: "Customer data export missing recent purchase history columns.", status: TicketStatus.OPEN, category: TicketCategory.TECHNICAL, priority: TicketPriority.MEDIUM, assignedTo: agentEmail, createdAt: new Date(now - DAY * 20) },
  { title: "Request for team account upgrade", description: "Customer wants to upgrade from Pro to Enterprise plan.", status: TicketStatus.RESOLVED, category: TicketCategory.GENERAL, priority: TicketPriority.LOW, assignedTo: adminEmail, createdAt: new Date(now - DAY * 22) },
  { title: "Refund for canceled subscription", description: "Customer canceled within trial period, requesting full refund.", status: TicketStatus.CLOSED, category: TicketCategory.REFUND_REQUEST, priority: TicketPriority.MEDIUM, assignedTo: null, createdAt: new Date(now - DAY * 24) },
  { title: "Two-factor authentication setup failure", description: "SMS code never arrives for users in European region.", status: TicketStatus.OPEN, category: TicketCategory.TECHNICAL, priority: TicketPriority.HIGH, assignedTo: agentEmail, createdAt: new Date(now - DAY * 26) },
  { title: "Invoice PDF download returns 404", description: "Invoice links in billing portal returning 404 errors.", status: TicketStatus.OPEN, category: TicketCategory.TECHNICAL, priority: TicketPriority.MEDIUM, assignedTo: null, createdAt: new Date(now - DAY * 28) },
  { title: "Feature request: Dark mode toggle", description: "Multiple users requesting dark mode for the dashboard.", status: TicketStatus.OPEN, category: TicketCategory.GENERAL, priority: TicketPriority.LOW, assignedTo: null, createdAt: new Date(now - DAY * 29) },
  { title: "API key rotation automation needed", description: "Security team requests automated monthly key rotation.", status: TicketStatus.OPEN, category: TicketCategory.TECHNICAL, priority: TicketPriority.MEDIUM, assignedTo: adminEmail, createdAt: new Date(now - DAY * 30) },
];

for (const t of ticketsData) {
  await prisma.ticket.create({ data: t });
}

// Generate 150 additional tickets spread across 30 days
const statuses = [TicketStatus.OPEN, TicketStatus.RESOLVED, TicketStatus.CLOSED];
const categories = [TicketCategory.GENERAL, TicketCategory.TECHNICAL, TicketCategory.REFUND_REQUEST];
const priorities = [TicketPriority.LOW, TicketPriority.MEDIUM, TicketPriority.HIGH];
const subjects = [
  "Slow load time on dashboard",
  "Incorrect billing total on invoice",
  "Integration failing with third-party service",
  "Spam tickets flooding inbox",
  "Help needed with webhook setup",
  "Unable to change profile picture",
  "Mobile app crash on login screen",
  "Export CSV feature fails on large datasets",
  "SSL certificate warning in staging environment",
  "Request to delete personal data",
  "Notification emails not sending",
  "Search functionality returning stale results",
  "File upload size limit too restrictive",
  "User permissions not updating correctly",
  "Dashboard chart data misaligned",
];

for (let i = 1; i <= 150; i++) {
  const status = statuses[i % statuses.length];
  const category = categories[i % categories.length];
  const priority = priorities[i % priorities.length];
  const subject = subjects[i % subjects.length];
  const assignedTo = i % 3 === 0 ? agentEmail : (i % 3 === 1 ? adminEmail : null);
  
  await prisma.ticket.create({
    data: {
      title: `${subject} #${i}`,
      description: `Auto-generated description for ticket #${i}. This is a fake ticket for pagination testing spanning a full month.`,
      status,
      category,
      priority,
      assignedTo,
      createdAt: new Date(now - DAY * ((i * 30) / 150)), // spread evenly across 30 days
    }
  });
}

console.log(`Successfully seeded ${ticketsData.length + 150} tickets spanning 30 days.`);
process.exit(0);
