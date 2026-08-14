import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";
import { promisify } from "node:util";

/**
 * `promisify` resolves to scrypt's 3-argument overload and drops the options
 * parameter, so the cost parameters below would be silently ignored by the type
 * checker. Declaring the signature explicitly keeps them type-checked.
 */
const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

/**
 * Password hashing on Node's built-in scrypt.
 *
 * scrypt rather than argon2id purely for deployment reasons: argon2 bindings are
 * native, and this stack has to build identically on an Apple Silicon laptop, an
 * alpine/musl container and whatever Neon's platform runs. scrypt is memory-hard,
 * ships in the standard library, and is on OWASP's accepted list — the security
 * difference against argon2id at these parameters is not what will be weakest in
 * this system.
 *
 * Format: scrypt$N$r$p$<salt-b64>$<hash-b64>
 * The parameters travel with the hash, so raising them later does not invalidate
 * existing passwords — old hashes verify with their own parameters and are
 * re-hashed on the user's next successful login.
 */

const PARAMS = {
  /** CPU/memory cost. 2^16 ≈ 64 MiB with r=8. */
  N: 65536,
  r: 8,
  p: 1,
  keyLength: 64,
  saltLength: 16,
} as const;

// scrypt refuses to allocate beyond this; must exceed 128 * N * r bytes.
const MAX_MEMORY = 256 * 1024 * 1024;

export async function hashPassword(plain: string): Promise<string> {
  if (!plain) throw new Error("Password must not be empty");

  const salt = randomBytes(PARAMS.saltLength);
  const derived = (await scrypt(plain.normalize("NFKC"), salt, PARAMS.keyLength, {
    N: PARAMS.N,
    r: PARAMS.r,
    p: PARAMS.p,
    maxmem: MAX_MEMORY,
  })) as Buffer;

  return [
    "scrypt",
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

export async function verifyPassword(
  plain: string,
  stored: string,
): Promise<boolean> {
  try {
    const [scheme, nRaw, rRaw, pRaw, saltB64, hashB64] = stored.split("$");
    if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;

    const N = Number(nRaw);
    const r = Number(rRaw);
    const p = Number(pRaw);
    if (!N || !r || !p) return false;

    const salt = Buffer.from(saltB64, "base64");
    const expected = Buffer.from(hashB64, "base64");

    const derived = (await scrypt(
      plain.normalize("NFKC"),
      salt,
      expected.length,
      { N, r, p, maxmem: MAX_MEMORY },
    )) as Buffer;

    // Constant-time: a byte-by-byte early return would leak how much of the
    // hash matched, which is enough to reconstruct it one byte at a time.
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/** True when `stored` was produced with weaker parameters than we now use. */
export function needsRehash(stored: string): boolean {
  const [scheme, nRaw, rRaw, pRaw] = stored.split("$");
  if (scheme !== "scrypt") return true;
  return (
    Number(nRaw) < PARAMS.N ||
    Number(rRaw) < PARAMS.r ||
    Number(pRaw) < PARAMS.p
  );
}
