import request from 'supertest';
import app from '../../../src/app';

jest.mock('../../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn() },
    passwordResetToken: { create: jest.fn() },
  },
}));

jest.mock('../../../src/utils/email', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = jest.requireMock('../../../src/lib/prisma').default as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const emailMock = jest.requireMock('../../../src/utils/email') as any;

const mockUser = {
  id: 'user-uuid-1',
  email: 'test@example.com',
};

beforeEach(() => {
  jest.clearAllMocks();
  db.passwordResetToken.create.mockResolvedValue({});
});

describe('POST /api/auth/forgot-password', () => {
  it('returns 200 with a generic message when user exists', async () => {
    db.user.findUnique.mockResolvedValue(mockUser);

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'test@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/reset link/i);
  });

  it('creates a password reset token in the DB', async () => {
    db.user.findUnique.mockResolvedValue(mockUser);

    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'test@example.com' });

    expect(db.passwordResetToken.create).toHaveBeenCalledTimes(1);
    const call = db.passwordResetToken.create.mock.calls[0][0];
    expect(call.data.userId).toBe('user-uuid-1');
    expect(typeof call.data.token).toBe('string');
    expect(call.data.token).toHaveLength(64);
    expect(call.data.expiresAt).toBeInstanceOf(Date);
  });

  it('calls sendPasswordResetEmail with the correct email', async () => {
    db.user.findUnique.mockResolvedValue(mockUser);

    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'test@example.com' });

    expect(emailMock.sendPasswordResetEmail).toHaveBeenCalledWith(
      'test@example.com',
      expect.stringContaining('reset-password'),
    );
  });

  it('returns 200 with the same message when user does NOT exist (security)', async () => {
    db.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nouser@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/reset link/i);
    expect(db.passwordResetToken.create).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
  });
});
