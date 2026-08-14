import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import {
  DomainError,
  httpStatusFor,
  isDomainError,
} from "../domain/shared/errors";
import { isProduction } from "../config/env";
import { logger } from "../lib/logger";

/**
 * The single place where an error becomes an HTTP response.
 *
 * `domain/shared/errors.ts` deliberately keeps the domain free of HTTP, so the
 * kind → status translation lives here and nowhere else. Adding a domain error
 * means picking a `kind`; this file does not change.
 */

export interface ErrorBody {
  error: string;
  code: string;
  details?: unknown;
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: `No route matches ${req.method} ${req.path}`,
    code: "ROUTE_NOT_FOUND",
  } satisfies ErrorBody);
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Express 5 still requires the 4-arity signature to register this as an error
  // handler, and delegates to the default handler once headers are sent.
  if (res.headersSent) return next(err);

  // Zod failures are client mistakes, not server faults: 400 with the field
  // paths, so the caller can fix the request without guessing.
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Request validation failed",
      code: "VALIDATION_FAILED",
      details: err.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    } satisfies ErrorBody);
    return;
  }

  const status = httpStatusFor(err);

  if (isDomainError(err)) {
    // 5xx means we broke something; 4xx means the caller did. Only the former
    // is worth an error-level log line.
    const log = status >= 500 ? logger.error : logger.warn;
    log.call(logger, { err, status, path: req.path }, err.message);

    res.status(status).json({
      error: err.message,
      code: err.code,
      ...(err.details !== undefined ? { details: err.details } : {}),
    } satisfies ErrorBody);
    return;
  }

  logger.error({ err, path: req.path }, "Unhandled error");

  // An unexpected error's message can carry a connection string or a query.
  // In production the client gets a constant; the detail stays in the log.
  res.status(status).json({
    error:
      isProduction || status >= 500
        ? "Something went wrong. Please try again."
        : err instanceof Error
          ? err.message
          : "Unknown error",
    code: "INTERNAL_ERROR",
    ...(!isProduction && err instanceof Error && err.stack
      ? { details: err.stack.split("\n").slice(0, 5) }
      : {}),
  } satisfies ErrorBody);
}

/**
 * Wraps an async handler so a rejected promise reaches `errorHandler`.
 *
 * Express 5 forwards rejections from async handlers automatically, but only for
 * handlers it recognises as returning a promise. Wrapping is explicit and works
 * identically either way.
 */
export function asyncHandler<
  H extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
>(handler: H) {
  return (req: Request, res: Response, next: NextFunction): void => {
    void handler(req, res, next).catch(next);
  };
}

export { DomainError };
