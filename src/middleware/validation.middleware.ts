import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { AppError } from "./error.middleware";

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message).join(", ");
      return next(new AppError(400, `Validation failed: ${messages}`));
    }

    req.body = result.data;
    next();
  };
}
