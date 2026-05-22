import request from 'supertest';
import app from '../../../src/app';
import { generateRefreshToken } from '../../../src/utils/jwt';

jest.mock('../../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    refreshToken: {
      findUnique: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = jest.requireMock('../../../src/lib/prisma').default as any;

beforeEach(() => {
  jest.clearAllMocks();
  db.refreshToken.delete.mockResolvedValue({});
  db.refreshToken.create.mockResolvedValue({});
});

describe('POST /api/auth/refresh', () => {
  it('returns new tokens for a valid refresh token', async () => {
    const token = generateRefreshToken('user-uuid-1');
    db.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      userId: 'user-uuid-1',
      token,
      expiresAt: new Date(Date.now() + 60_000),
    });

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: token });

    expect(res.status).toBe(200);
    expect(typeof res.body.accessToken).toBe('string');
    expect(typeof res.body.refreshToken).toBe('string');
    expect(res.body.refreshToken).not.toBe(token);
  });

  it('deletes the old token and stores a new one (rotation)', async () => {
    const token = generateRefreshToken('user-uuid-1');
    db.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      userId: 'user-uuid-1',
      token,
      expiresAt: new Date(Date.now() + 60_000),
    });

    await request(app).post('/api/auth/refresh').send({ refreshToken: token });

    expect(db.refreshToken.delete).toHaveBeenCalledWith({ where: { id: 'rt-1' } });
    expect(db.refreshToken.create).toHaveBeenCalledTimes(1);
  });

  it('returns 401 when the token is not in the DB', async () => {
    db.refreshToken.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'unknown-token' });

    expect(res.status).toBe(401);
  });

  it('returns 401 when the token is expired', async () => {
    const token = generateRefreshToken('user-uuid-1');
    db.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      userId: 'user-uuid-1',
      token,
      expiresAt: new Date(Date.now() - 1000),
    });

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: token });

    expect(res.status).toBe(401);
  });

  it('returns 400 when refreshToken is missing', async () => {
    const res = await request(app).post('/api/auth/refresh').send({});
    expect(res.status).toBe(400);
  });
});
