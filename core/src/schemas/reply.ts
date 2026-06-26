import { z } from 'zod';

export const createReplySchema = z.object({
  body: z.string().min(1, 'Reply message cannot be empty.').max(2000, 'Reply must be at most 4000 characters.'),
  senderType: z.enum(['AGENT', 'CUSTOMER']).optional().default('AGENT'),
});

export const replySchema = z.object({
  id: z.number(),
  ticketId: z.number(),
  userId: z.string(),
  body: z.string(),
  bodyhtml: z.string(),
  senderType: z.enum(['AGENT', 'CUSTOMER']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CreateReplyInput = z.infer<typeof createReplySchema>;
export type Reply = z.infer<typeof replySchema>;
