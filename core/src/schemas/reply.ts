import { z } from 'zod';

export const createReplySchema = z.object({
  body: z.string().min(1, 'Reply message cannot be empty.').max(4000, 'Reply must be at most 4000 characters.'),
  senderType: z.enum(['AGENT', 'CUSTOMER']).optional().default('AGENT'),
});

export type CreateReplyInput = z.infer<typeof createReplySchema>;
