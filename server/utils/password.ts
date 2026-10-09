import bcryptjs from 'bcryptjs';

export const PASSWORD_HASH_COST = 12;

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
