import request from 'supertest';
import app from '../../../src/app';

jest.mock('../../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    passwordResetToken: { findUnique: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
    user: { update: jest.fn() },
    refreshToken: { deleteMany: jest.fn() },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = jest.requireMock('../../../src/lib/prisma').default as any;

const validToken = {
  id: 'prt-1',
  userId: 'user-uuid-1',
  token: 'validtoken123',
  expiresAt: new Date(Date.now() + 60_000),
  used: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  db.$transaction.mockResolvedValue([]);
});

describe('POST /api/auth/reset-password', () => {
  it('returns 200 when token is valid', async () => {
    db.passwordResetToken.findUnique.mockResolvedValue(validToken);

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'validtoken123', newPassword: 'newpassword123' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/reset successfully/i);
  });

  it('runs update + token-mark-used + refresh-token-deletion in a transaction', async () => {
    db.passwordResetToken.findUnique.mockResolvedValue(validToken);

    await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'validtoken123', newPassword: 'newpassword123' });

    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });

  it('returns 400 when token is not found', async () => {
    db.passwordResetToken.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'badtoken', newPassword: 'newpassword123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid or expired/i);
  });

  it('returns 400 when token is already used', async () => {
    db.passwordResetToken.findUnique.mockResolvedValue({ ...validToken, used: true });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'validtoken123', newPassword: 'newpassword123' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when token is expired', async () => {
    db.passwordResetToken.findUnique.mockResolvedValue({
      ...validToken,
      expiresAt: new Date(Date.now() - 1000),
    });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'validtoken123', newPassword: 'newpassword123' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when newPassword is too short', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'validtoken123', newPassword: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.details[0].field).toBe('newPassword');
  });

  it('returns 400 when token is missing', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ newPassword: 'newpassword123' });

    expect(res.status).toBe(400);
  });
});
