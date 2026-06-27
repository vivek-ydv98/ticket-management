import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { prisma } from "./db";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

// Ensure audit log directory exists
const auditDir = process.cwd();
const logFile = join(auditDir, "audit.log");
if (!existsSync(auditDir)) {
  mkdirSync(auditDir, { recursive: true });
}

// Simple logging function
export function logAudit(event: string, details: Record<string, any> = {}) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${event} ${JSON.stringify({ ...details })}\n`;
  try {
    writeFileSync(logFile, logLine, { flag: "a" });
  } catch (e) {
    // Fallback to console if file write fails
    console.error("Failed to write audit log:", e);
  }
}

// In-memory store for failed login attempts (for demo; use Redis/DB in produzione)
const failedAttempts = new Map<string, { count: number; firstAttempt: number }>();
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export function isLockedOut(email: string): boolean {
  const record = failedAttempts.get(email);
  if (!record) return false;
  const now = Date.now();
  if (now - record.firstAttempt > LOCKOUT_MS) {
    // Reset if lockout period expired
    failedAttempts.delete(email);
    return false;
  }
  return record.count >= LOCKOUT_THRESHOLD;
}
export function recordFailedAttempt(email: string) {
  const now = Date.now();
  const record = failedAttempts.get(email);
  if (record) {
    record.count += 1;
    // keep original firstAttempt
  } else {
    failedAttempts.set(email, { count: 1, firstAttempt: now });
  }
}
export function clearFailedAttempts(email: string) {
  failedAttempts.delete(email);
}
export function clearAllFailedAttempts() {
  failedAttempts.clear();
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL!,
  basePath: "/api/auth",
  trustedOrigins: process.env.TRUSTED_ORIGINS ? process.env.TRUSTED_ORIGINS.split(",") : [],
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  useSecureCookies: process.env.NODE_ENV === "production" ? undefined : false,
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 8,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "AGENT",
        input: false,
      },
    },
  },
  session: {
    // Session lifetime: 7 days (adjust as needed)
    expiresIn: 60 * 60 * 24 * 7, // 7 days in seconds
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: "lax" as const,
      domain: "localhost",
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
          });
          if (user?.deletedAt) {
            throw new Error("User account has been deleted.");
          }
        },
      },
    },
  },
});
