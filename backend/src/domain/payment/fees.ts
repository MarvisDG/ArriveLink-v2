import { ValidationError } from "../shared/errors";

/**
 * PRD §8 — the checkout breakdown.
 *
 * Three separate line items, never a pre-blended total:
 *   fare subtotal    → the operator's money
 *   convenience fee  → ArriveLink's, fixed ₦200 regardless of method (PRD §8;
 *                      §10 explicitly rules out percentage-based or
 *                      operator-set convenience fees)
 *   processing fee   → Paystack's, varies by method
 *
 * All amounts are kobo. Nothing here returns a float: ₦0.01 is 1, and money
 * arithmetic in floating point is how a total ends up at ₦4,999.999999.
 */

export type PaymentMethod = "card" | "transfer";

export interface FeeBreakdown {
  /** farePerSeat × seats */
  fareSubtotal: number;
  convenienceFee: number;
  processingFee: number;
  total: number;
}

/**
 * Paystack's published Nigerian pricing, in kobo.
 *
 * Card: 1.5% + ₦100, where the ₦100 is waived below ₦2,500, and the whole
 * charge is capped at ₦2,000.
 * Bank transfer: flat ₦50.
 *
 * These are Paystack's rates, not ours, and they change. They live here as one
 * named constant block so a rate change is a single edit with a visible diff,
 * rather than a magic number buried in a checkout controller.
 */
export const PAYSTACK_RATES = {
  card: {
    percentage: 0.015,
    flatFee: 10_000,        // ₦100
    flatFeeWaivedBelow: 250_000, // ₦2,500
    cap: 200_000,           // ₦2,000
  },
  transfer: {
    flat: 5_000,            // ₦50
  },
} as const;

/** PRD §8 — fixed, identical across payment methods. */
export const DEFAULT_CONVENIENCE_FEE = 20_000; // ₦200

export function calculateProcessingFee(
  amount: number,
  method: PaymentMethod,
): number {
  if (amount < 0) {
    throw new ValidationError("Amount must not be negative");
  }

  if (method === "transfer") {
    return PAYSTACK_RATES.transfer.flat;
  }

  const { percentage, flatFee, flatFeeWaivedBelow, cap } = PAYSTACK_RATES.card;
  const percentagePart = Math.ceil(amount * percentage);
  const flatPart = amount < flatFeeWaivedBelow ? 0 : flatFee;

  // Round up, then cap: a fee rounded down is a fee we absorb on every payment.
  return Math.min(percentagePart + flatPart, cap);
}

/**
 * The full checkout breakdown.
 *
 * The processing fee is charged on the amount the traveler actually pays, which
 * includes the convenience fee — that is what passes through Paystack. Computing
 * it on the fare alone would leave ArriveLink quietly short on every transaction.
 */
export function calculateFees(params: {
  farePerSeat: number;
  seats: number;
  method: PaymentMethod;
  convenienceFee?: number;
}): FeeBreakdown {
  const { farePerSeat, seats, method } = params;

  if (!Number.isInteger(farePerSeat) || farePerSeat < 0) {
    throw new ValidationError("farePerSeat must be a non-negative integer (kobo)");
  }
  if (!Number.isInteger(seats) || seats <= 0) {
    throw new ValidationError("seats must be a positive integer");
  }

  const convenienceFee = params.convenienceFee ?? DEFAULT_CONVENIENCE_FEE;
  const fareSubtotal = farePerSeat * seats;
  const processingFee = calculateProcessingFee(
    fareSubtotal + convenienceFee,
    method,
  );

  return {
    fareSubtotal,
    convenienceFee,
    processingFee,
    total: fareSubtotal + convenienceFee + processingFee,
  };
}

/** Kobo → a display string. ₦4,500,000 kobo renders as "₦45,000". */
export function formatNaira(kobo: number): string {
  const naira = kobo / 100;
  return `₦${naira.toLocaleString("en-NG", {
    minimumFractionDigits: naira % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}
