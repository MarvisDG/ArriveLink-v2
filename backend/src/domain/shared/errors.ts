/**
 * Domain errors.
 *
 * The domain layer must not know about HTTP, but every error still has to reach
 * a client as some status code. The compromise: each error carries an abstract
 * `kind`, and a single translator in the interfaces layer maps kinds to statuses.
 * Adding an error means picking a kind, not touching the HTTP layer.
 */

export type ErrorKind =
  | "validation"      // 400 — the request is malformed
  | "unauthenticated" // 401 — no or bad credentials
  | "forbidden"       // 403 — authenticated, but not allowed
  | "not_found"       // 404
  | "conflict"        // 409 — legal request, illegal against current state
  | "exhausted"       // 409 — the resource ran out (seats)
  | "rate_limited"    // 429
  | "upstream"        // 502 — a third party failed
  | "internal";       // 500

export class DomainError extends Error {
  readonly kind: ErrorKind;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    kind: ErrorKind,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
    this.kind = kind;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, new.target);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, details?: unknown) {
    super("validation", "VALIDATION_FAILED", message, details);
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, identifier?: string | number) {
    super(
      "not_found",
      "NOT_FOUND",
      identifier === undefined
        ? `${entity} not found`
        : `${entity} ${identifier} not found`,
    );
  }
}

export class UnauthenticatedError extends DomainError {
  constructor(message = "Authentication required") {
    super("unauthenticated", "UNAUTHENTICATED", message);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = "You do not have access to this resource") {
    super("forbidden", "FORBIDDEN", message);
  }
}

export class ConflictError extends DomainError {
  constructor(code: string, message: string, details?: unknown) {
    super("conflict", code, message, details);
  }
}

/**
 * Raised when a departure cannot satisfy the requested seats. Carries what is
 * actually left so the UI can say "only 2 seats remain" rather than "failed".
 */
export class SeatsUnavailableError extends DomainError {
  constructor(
    readonly requested: number,
    readonly available: number,
  ) {
    super(
      "exhausted",
      "SEATS_UNAVAILABLE",
      available === 0
        ? "This departure is now full."
        : `Only ${available} seat${available === 1 ? "" : "s"} left on this departure, but ${requested} were requested.`,
      { requested, available },
    );
  }
}

export class UpstreamError extends DomainError {
  constructor(service: string, message: string, details?: unknown) {
    super("upstream", "UPSTREAM_FAILURE", `${service}: ${message}`, details);
  }
}

const STATUS_BY_KIND: Readonly<Record<ErrorKind, number>> = {
  validation: 400,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  exhausted: 409,
  rate_limited: 429,
  upstream: 502,
  internal: 500,
};

export function httpStatusFor(error: unknown): number {
  if (error instanceof DomainError) return STATUS_BY_KIND[error.kind];
  // InvalidBookingTransitionError declares its own status without extending
  // DomainError, so the state machine stays free of any transport concept.
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
  ) {
    return (error as { status: number }).status;
  }
  return 500;
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}
