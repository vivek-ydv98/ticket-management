# Email-to-Ticket Functionality

## Overview

This implementation adds the ability to receive emails at a support address and automatically convert them into tickets in the ticket management system.

## Components Added

1. **Email Service** (`server/lib/email.ts`):
   - `createTicketFromEmail()`: Parses email content and creates a ticket
   - `normalizeEmailContent()`: Handles different email webhook formats
   - `sendEmailNotification()`: Placeholder for sending email notifications
   - `extractAssigneeFromEmail()`: Placeholder for extracting assignee info

2. **Email Route** (`server/routes/email.ts`):
   - POST endpoint at `/api/email/receive` (configurable via EMAIL_WEBHOOK_PATH)
   - Handles incoming email webhooks from services like SendGrid
   - Processes various email formats (SendGrid inbound parse, raw email, etc.)

3. **Environment Configuration**:
   - Added EMAIL_FROM_ADDRESS, EMAIL_API_KEY, EMAIL_WEBHOOK_PATH to `.env` and `.env.example`

## How It Works

1. **Email Reception**: Configure your email service (e.g., SendGrid Inbound Parse, Mailgun, etc.) to POST incoming emails to `https://your-domain.com/api/email/receive`

2. **Email Processing**: The endpoint receives the email, normalizes the format, and passes it to the email service

3. **Ticket Creation**: The email service:
   - Parses the email using `mailparser`
   - Extracts subject, sender, recipients, date, and body
   - Validates that sender is present (required)
   - Creates a ticket with:
     - Title: `[Email] [Original Subject]`
     - Description: Includes email metadata (from, to, date, original subject) plus the email body
     - Status: OPEN (default)
     - Category: NULL (optional, no default value - can be set later based on business rules)
     - Priority: MEDIUM (can be enhanced to detect urgency)
     - AssignedTo: null (can be enhanced to auto-assign based on rules)

## Configuration

Add these environment variables to your `.env` file:

```env
# Email configuration for receiving support emails
EMAIL_FROM_ADDRESS="support@example.com"
EMAIL_API_KEY="your_sendgrid_api_key_here"
EMAIL_WEBHOOK_PATH="/api/email/receive"
```

## Email Service Configuration Examples

### SendGrid Inbound Parse
1. Set up Inbound Parse in SendGrid dashboard
2. Set the URL to: `https://your-domain.com/api/email/receive`
3. Make sure to check "POST the raw, full MIME message"

### Webhook Format Handling
The system handles multiple formats:
- SendGrid Inbound Parse (with headers as string and text body)
- Raw email content (plain string)
- JSON-wrapped email data
- Custom formats via the normalization function

## Validation Rules Implemented

Based on feedback:
1. **Sender is required** - Emails without a sender address will be rejected
2. **Category is optional with no default** - Category is stored as NULL until business rules determine appropriate value
3. **ID is numeric** - The ticket ID returned is a number as defined by the Prisma schema

## Testing

A test file is available at `server/lib/email.test.ts` that demonstrates how the email processing works with sample data.

To run a basic syntax check:
```bash
node -c server/lib/email.ts
node -c server/routes/email.ts
node -c server/lib/email.test.ts
```

## Future Enhancements

1. **Smart Categorization**: Analyze email content to automatically set category (TECHNICAL, REFUND_REQUEST, etc.)
2. **Priority Detection**: Scan for urgency indicators ("urgent", "ASAP", "broken", etc.) to set priority
3. **Auto-assignment**: Parse email domains or content to assign to specific teams/agents
4. **Threading Support**: Extract references to existing tickets to append to conversations
5. **Attachment Handling**: Process file attachments and attach them to tickets
6. **Response Templates**: Create canned responses for common issues