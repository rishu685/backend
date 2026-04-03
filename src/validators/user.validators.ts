import { z } from "zod";

const roleEnum = z.enum(["viewer", "analyst", "admin"]);
const statusEnum = z.enum(["active", "inactive"]);

export const createUserSchema = z.object({
  name: z.string().trim().min(2),
  email: z.email().trim().toLowerCase(),
  password: z.string().min(6),
  role: roleEnum,
  status: statusEnum.optional().default("active")
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).optional(),
  password: z.string().min(6).optional(),
  role: roleEnum.optional(),
  status: statusEnum.optional()
}).refine((payload) => Object.keys(payload).length > 0, {
  message: "At least one field is required"
});
