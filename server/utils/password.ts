import bcryptjs from 'bcryptjs';

// Cost 10 is the OWASP minimum for bcrypt; higher costs cap login throughput on serverless CPUs.
export const PASSWORD_HASH_COST = 10;

type PasswordHasher = {
  hash(password: string, cost: number): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
};

const pureJsHasher: PasswordHasher = {
  hash: (password, cost) => bcryptjs.hash(password, cost),
  verify: (password, hash) => bcryptjs.compare(password, hash),
};

let hasherPromise: Promise<PasswordHasher> | null = null;

// Native bcrypt runs on the libuv threadpool so concurrent logins do not block the event loop;
// bcryptjs stays as fallback because a missing platform binary must never take login down.
function getHasher(): Promise<PasswordHasher> {
  hasherPromise ??= import('@node-rs/bcrypt')
    .then(
      (native): PasswordHasher => ({
        hash: (password, cost) => native.hash(password, cost),
        verify: (password, hash) => native.verify(password, hash),
      })
    )
    .catch((error: unknown) => {
      console.warn('[password] @node-rs/bcrypt unavailable, falling back to bcryptjs:', error);
      return pureJsHasher;
    });
  return hasherPromise;
}

export async function hashPassword(password: string): Promise<string> {
  return (await getHasher()).hash(password, PASSWORD_HASH_COST);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return (await getHasher()).verify(password, hash);
}

export function needsRehash(hash: string): boolean {
  const match = /^\$2[abxy]\$(\d{2})\$/.exec(hash);
  return match !== null && Number(match[1]) !== PASSWORD_HASH_COST;
}
