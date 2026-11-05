import { z } from 'zod';

export const signUpSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required.')
    .email('Please provide a valid email address.'),
  name: z
    .string()
    .trim()
    .min(1, 'Name is required.')
    .min(3, 'Name must be at least 3 characters long.')
    .max(100, 'Name must be at most 100 characters long.'),
  password: z
    .string()
    .min(1, 'Password is required.')
    .min(8, 'Password must be at least 8 characters long.')
    .max(128, 'Password must be at most 128 characters long.')
    .regex(/[a-zA-Z]/, 'Password must contain at least one letter.')
    .regex(/[0-9]/, 'Password must contain at least one number.')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character.'),
});

export type SignUpSchema = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required.')
    .email('Please provide a valid email address.'),
  password: z
    .string()
    .min(1, 'Password is required.')
    .max(128, 'Password must be at most 128 characters long.'),
});

export type SignInSchema = z.infer<typeof signInSchema>;
