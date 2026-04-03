import { z } from "zod";

const typeEnum = z.enum(["income", "expense"]);

export const createRecordSchema = z.object({
  amount: z.number().positive("amount must be positive"),
  type: typeEnum,
  category: z.string().trim().min(2),
  date: z.iso.date(),
  notes: z.string().trim().max(500).optional()
});

export const updateRecordSchema = z.object({
  amount: z.number().positive().optional(),
  type: typeEnum.optional(),
  category: z.string().trim().min(2).optional(),
  date: z.iso.date().optional(),
  notes: z.string().trim().max(500).optional()
}).refine((payload) => Object.keys(payload).length > 0, {
  message: "At least one field is required"
});
