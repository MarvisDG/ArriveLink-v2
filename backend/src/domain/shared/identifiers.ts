import { randomInt } from "node:crypto";

/**
 * Human-facing codes.
 *
 * Crockford base32 without I, L, O, U: those are the characters a rep misreads
 * from a traveler's cracked phone screen, and U is excluded so a random string
 * cannot spell something unfortunate. The rep types these under time pressure at
 * a terminal, so ambiguity is a real operational cost, not a nicety.
 */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function randomCode(length: number): string {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    // randomInt, not Math.random: ticket codes gate boarding.
    out += ALPHABET[randomInt(0, ALPHABET.length)];
  }
  return out;
}

/**
 * Booking reference shown to the traveler and searched by the rep.
 * `AL-` prefix so it is recognisable when pasted into a WhatsApp message.
 * 8 chars of 32-symbol alphabet ≈ 1.1e12 combinations.
 */
export function generateBookingReference(): string {
  return `AL-${randomCode(4)}-${randomCode(4)}`;
}

/** Ticket code, distinct from the booking reference and never derived from it. */
export function generateTicketCode(): string {
  return `TKT-${randomCode(6)}`;
}

/** URL slug from a display name. Collisions are resolved by the caller. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
