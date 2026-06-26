import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters long.').max(100, 'Name must be at most 100 characters.'),
  email: z.string().email('Please enter a valid email address.').max(254, 'Email must be at most 254 characters.'),
  password: z.string().min(8, 'Password must be at least 8 characters long.').max(128, 'Password must be at most 128 characters.'),
});

export const updateUserSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters long.').max(100, 'Name must be at most 100 characters.'),
  email: z.string().email('Please enter a valid email address.').max(254, 'Email must be at most 254 characters.'),
  password: z.string().min(8, 'Password must be at least 8 characters long.').max(128, 'Password must be at most 128 characters.').optional().or(z.literal('')),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;