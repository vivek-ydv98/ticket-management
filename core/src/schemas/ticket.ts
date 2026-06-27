import { z } from 'zod';
import { TicketStatus, TicketCategory, TicketPriority } from '../constants/ticket';

export const ticketStatusSchema = z.nativeEnum(TicketStatus);
export const ticketCategorySchema = z.nativeEnum(TicketCategory);
export const ticketPrioritySchema = z.nativeEnum(TicketPriority);

export const createTicketSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters long.').max(200, 'Title must be at most 200 characters.'),
  description: z.string().max(5000, 'Description must be at most 5000 characters.').optional().nullable(),
  status: ticketStatusSchema.default(TicketStatus.NEW),
  category: ticketCategorySchema.optional().nullable(),
  priority: ticketPrioritySchema.default(TicketPriority.MEDIUM),
  assignedTo: z.string().optional().nullable(),
});

export const ticketQuerySchema = z.object({
  status: ticketStatusSchema.optional().or(z.literal('')),
  category: ticketCategorySchema.optional().or(z.literal('')),
  priority: ticketPrioritySchema.optional().or(z.literal('')),
  sortBy: z.string().optional().or(z.literal('')).default('newest'),
  sortOrder: z.enum(['asc', 'desc']).optional().or(z.literal('')),
  search: z.string().optional().or(z.literal('')),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().optional().default(10),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type TicketQueryInput = z.infer<typeof ticketQuerySchema>;
