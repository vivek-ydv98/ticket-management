# AI-Powered Ticket Management System

A full-stack ticket management system built with:

- **Backend**: Express.js + TypeScript running on Bun
- **Frontend**: React + TypeScript (Vite)
- **Database**: PostgreSQL (to be added)
- **AI Integration**: Anthropic Claude API (to be added)
- **Email**: SendGrid/Mailgun (to be added)

*Documentation for each technology was fetched via Context7 to ensure up-to-date configuration.*

## Project Structure

- `/server` - Express/TypeScript backend
- `/client` - React/TypeScript frontend (Vite)

## Getting Started

### Backend

```bash
cd server
bun install          # already installed
bun run index.ts     # start Express server on port 3000
```

### Frontend

```bash
cd client
bun install          # already installed
bun dev              # start Vite dev server on port 5173
```

## Environment Variables

Create `.env` files in each folder as needed.

## Future Steps

- Add PostgreSQL database and ORM (e.g., Prisma)
- Implement authentication (sessions or JWT)
- Build ticket CRUD endpoints
- Integrate Claude API for classification, summarization, suggested replies
- Add email ingestion via SendGrid/Mailgun webhooks
- Build UI for ticket list, detail, dashboard
- Add real-time updates via WebSocket or SSE
- Write Dockerfiles and docker-compose for deployment