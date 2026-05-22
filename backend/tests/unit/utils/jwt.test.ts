import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../../../src/utils/jwt';

describe('generateAccessToken / verifyAccessToken', () => {
  it('generates a token that verifies correctly', () => {
    const token = generateAccessToken('user-123');
    const payload = verifyAccessToken(token);
    expect(payload.userId).toBe('user-123');
  });

  it('throws on a tampered token', () => {
    const token = generateAccessToken('user-123');
    expect(() => verifyAccessToken(token + 'tampered')).toThrow();
  });

  it('throws when verified with the wrong secret', () => {
    const token = generateRefreshToken('user-123');
    expect(() => verifyAccessToken(token)).toThrow();
  });
});

describe('generateRefreshToken / verifyRefreshToken', () => {
  it('generates a token that verifies correctly', () => {
    const token = generateRefreshToken('user-456');
    const payload = verifyRefreshToken(token);
    expect(payload.userId).toBe('user-456');
  });

  it('throws on a tampered token', () => {
    const token = generateRefreshToken('user-456');
    expect(() => verifyRefreshToken(token + 'tampered')).toThrow();
  });

  it('throws when access token is used as refresh token', () => {
    const token = generateAccessToken('user-456');
    expect(() => verifyRefreshToken(token)).toThrow();
  });
});
