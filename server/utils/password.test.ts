import bcryptjs from 'bcryptjs';
import { describe, expect, test } from 'vitest';
import { hashPassword, needsRehash, PASSWORD_HASH_COST, verifyPassword } from './password';

describe('password hashing', () => {
  test('hash baru dapat diverifikasi dan menolak password salah', async () => {
    const hash = await hashPassword('rahasia123');

    expect(hash).toMatch(new RegExp(`^\\$2[aby]\\$${PASSWORD_HASH_COST}\\$`));
    await expect(verifyPassword('rahasia123', hash)).resolves.toBe(true);
    await expect(verifyPassword('salah', hash)).resolves.toBe(false);
  });

  test.each(['$2a$', '$2b$'])('hash lama bcryptjs dengan prefix %s tetap valid', async (prefix) => {
    const legacy = (await bcryptjs.hash('password123', 4)).replace(/^\$2[ab]\$/, prefix);

    await expect(verifyPassword('password123', legacy)).resolves.toBe(true);
    await expect(verifyPassword('password124', legacy)).resolves.toBe(false);
  });

  test('hash baru tetap dapat dibaca bcryptjs', async () => {
    const hash = await hashPassword('rahasia123');

    await expect(bcryptjs.compare('rahasia123', hash)).resolves.toBe(true);
  });

  test('needsRehash hanya untuk hash bcrypt dengan cost berbeda', async () => {
    const current = await hashPassword('rahasia123');
    const legacy = await bcryptjs.hash('rahasia123', 4);

    expect(needsRehash(current)).toBe(false);
    expect(needsRehash(legacy)).toBe(true);
    expect(needsRehash('$2a$12$' + 'x'.repeat(53))).toBe(true);
    expect(needsRehash('bukan-hash-bcrypt')).toBe(false);
  });
});
