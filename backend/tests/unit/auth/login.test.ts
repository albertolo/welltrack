import request from 'supertest';
import app from '../../../src/app';
import * as hash from '../../../src/utils/hash';

jest.mock('../../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn() },
    refreshToken: { create: jest.fn() },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = jest.requireMock('../../../src/lib/prisma').default as any;

const mockUser = {
  id: 'user-uuid-1',
  email: 'test@example.com',
  displayName: 'Test User',
  timezone: 'UTC',
  passwordHash: '$2b$10$hashedpassword',
  createdAt: new Date(),
};

beforeEach(() => {
  jest.clearAllMocks();
  db.refreshToken.create.mockResolvedValue({});
});

describe('POST /api/auth/login', () => {
  it('returns 200 with user and tokens on valid credentials', async () => {
    db.user.findUnique.mockResolvedValue(mockUser);
    jest.spyOn(hash, 'comparePassword').mockResolvedValue(true);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe('user-uuid-1');
    expect(res.body.user.email).toBe('test@example.com');
    expect(typeof res.body.accessToken).toBe('string');
    expect(typeof res.body.refreshToken).toBe('string');
  });

  it('does not expose passwordHash in the response', async () => {
    db.user.findUnique.mockResolvedValue(mockUser);
    jest.spyOn(hash, 'comparePassword').mockResolvedValue(true);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('returns 401 when user is not found', async () => {
    db.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'unknown@example.com', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('returns 401 when password is wrong', async () => {
    db.user.findUnique.mockResolvedValue(mockUser);
    jest.spyOn(hash, 'comparePassword').mockResolvedValue(false);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com' });

    expect(res.status).toBe(400);
  });

  it('stores a refresh token in the DB on success', async () => {
    db.user.findUnique.mockResolvedValue(mockUser);
    jest.spyOn(hash, 'comparePassword').mockResolvedValue(true);

    await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(db.refreshToken.create).toHaveBeenCalledTimes(1);
    const call = db.refreshToken.create.mock.calls[0][0];
    expect(call.data.userId).toBe('user-uuid-1');
    expect(typeof call.data.token).toBe('string');
  });
});
