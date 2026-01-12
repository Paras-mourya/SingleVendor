import { z } from 'zod';
import { REGEX } from '../constants.js';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(50),
    email: z.string().email().regex(REGEX.EMAIL),
    password: z.string().min(8).regex(REGEX.PASSWORD),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});
