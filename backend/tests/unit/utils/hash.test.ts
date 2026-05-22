import { hashPassword, comparePassword } from '../../../src/utils/hash';

describe('hashPassword', () => {
  it('returns a bcrypt hash (starts with $2)', async () => {
    const hash = await hashPassword('mypassword123');
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  it('produces different hashes for the same password (random salt)', async () => {
    const h1 = await hashPassword('samepassword');
    const h2 = await hashPassword('samepassword');
    expect(h1).not.toBe(h2);
  });
});

describe('comparePassword', () => {
  it('returns true for the correct password', async () => {
    const hash = await hashPassword('correct-password');
    expect(await comparePassword('correct-password', hash)).toBe(true);
  });

  it('returns false for the wrong password', async () => {
    const hash = await hashPassword('correct-password');
    expect(await comparePassword('wrong-password', hash)).toBe(false);
  });
});
