import { z } from 'zod';
import { TicketStatus, TicketCategory, TicketPriority } from '../constants/ticket';

export const ticketStatusSchema = z.nativeEnum(TicketStatus);
export const ticketCategorySchema = z.nativeEnum(TicketCategory);
export const ticketPrioritySchema = z.nativeEnum(TicketPriority);

export const createTicketSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters long.'),
  description: z.string().optional().nullable(),
  status: ticketStatusSchema.default(TicketStatus.OPEN),
  category: ticketCategorySchema.optional().nullable(),
  priority: ticketPrioritySchema.default(TicketPriority.MEDIUM),
  assignedTo: z.string().optional().nullable(),
});

export const ticketQuerySchema = z.object({
  status: ticketStatusSchema.optional().or(z.literal('')),
  category: ticketCategorySchema.optional().or(z.literal('')),
  sortBy: z.enum(['newest', 'oldest']).default('newest'),
  search: z.string().optional().or(z.literal('')),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type TicketQueryInput = z.infer<typeof ticketQuerySchema>;
