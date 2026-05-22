import request from 'supertest';
import app from '../../../src/app';

jest.mock('../../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    refreshToken: { deleteMany: jest.fn() },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = jest.requireMock('../../../src/lib/prisma').default as any;

beforeEach(() => {
  jest.clearAllMocks();
  db.refreshToken.deleteMany.mockResolvedValue({ count: 1 });
});

describe('POST /api/auth/logout', () => {
  it('returns 204 and deletes the refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken: 'some-token' });

    expect(res.status).toBe(204);
    expect(db.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { token: 'some-token' },
    });
  });

  it('returns 204 even when token does not exist (idempotent)', async () => {
    db.refreshToken.deleteMany.mockResolvedValue({ count: 0 });

    const res = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken: 'nonexistent-token' });

    expect(res.status).toBe(204);
  });

  it('returns 400 when refreshToken is missing', async () => {
    const res = await request(app).post('/api/auth/logout').send({});
    expect(res.status).toBe(400);
  });
});
