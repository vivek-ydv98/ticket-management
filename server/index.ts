import "dotenv/config";
import express from "express";
import path from "path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { toNodeHandler } from "better-call/node";
import { auth, isLockedOut, clearAllFailedAttempts, logAudit, recordFailedAttempt, clearFailedAttempts } from "./lib/auth";
import { requireAuth } from "./lib/requireAuth";
import { prisma } from "./lib/db";
import usersRouter from "./routes/users";
import emailRouter from "./routes/email";
import ticketsRouter from "./routes/tickets";
import { startIMAPListener } from "./lib/email";

const app = express();
const port = process.env.PORT ?? 3000;

// Security middleware - only in production to avoid blocking Vite dev assets/scripts
if (process.env.NODE_ENV === 'production') {
  app.use(helmet());
}

// Rate limiting for API routes (general) - only in production
if (process.env.NODE_ENV === 'production') {
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: { error: "Too many requests from this IP, please try again later." },
  });
  app.use("/api/", apiLimiter);

  // Stricter limit for authentication endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 auth requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many authentication attempts, please try again later." },
  });
  app.use("/api/auth", authLimiter);
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Parse text/plain bodies as strings
app.use((req, res, next) => {
  if (req.headers['content-type'] === 'text/plain') {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      data += chunk;
    });
    req.on('end', () => {
      req.body = data;
      next();
    });
  } else {
    next();
  }
});

// Intercept email sign-in requests to check for account lockout and log audit events
app.post("/api/auth/sign-in/email", (req, res, next) => {
  const { email } = req.body;
  if (email && isLockedOut(email)) {
    logAudit("SIGN_IN_BLOCKED", { email, reason: "Account locked due to too many failed attempts" });
    return res.status(400).json({
      message: "Account temporarily locked due to too many failed login attempts. Please try again later."
    });
  }

  // Intercept the response from better-auth to update lockout tracking & log audit events
  const originalEnd = res.end;
  res.end = function (chunk?: any, encoding?: any, callback?: any) {
    if (!(res as any).__processed) {
      (res as any).__processed = true;
      if (res.statusCode >= 400) {
        if (email) {
          recordFailedAttempt(email);
          logAudit("SIGN_IN_FAILED", { email });
        }
      } else {
        if (email) {
          clearFailedAttempts(email);
          logAudit("SIGN_IN_SUCCESS", { email });
        }
      }
    }
    return (originalEnd as any).call(res, chunk, encoding, callback);
  } as any;

  next();
});

// Test endpoint to reset lockout state
if (process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development" || !process.env.NODE_ENV) {
  app.post("/api/test/reset-lockout", (req, res) => {
    clearAllFailedAttempts();
    res.json({ ok: true });
  });
}

const authHandler = toNodeHandler(auth.handler);
app.use("/api/auth", authHandler);

app.use("/api/tickets", ticketsRouter);

app.use("/api/users", usersRouter);
app.use("/api/email", emailRouter);

// Serve client static assets
const clientDistPath = path.resolve(__dirname, "../client/dist");
app.use(express.static(clientDistPath));

// Wildcard SPA route
app.get("(.*)", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, "index.html"));
});

app.listen(port, async () => {
  console.log(`Server listening on port ${port}`);
  try {
    await prisma.$connect();
    console.log("Connected to PostgreSQL database");
    startIMAPListener();
  } catch (error) {
    console.error("Database connection failed:", error);
  }
});
