import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../../src/app';
import { hashPassword } from '../../../src/utils/hash';
import { verifyAccessToken, verifyRefreshToken } from '../../../src/utils/jwt';

const prisma = new PrismaClient();

const testEmail = `login-test-${Date.now()}@welltrack.test`;
const testPassword = 'securepassword';
let userId: string;

beforeAll(async () => {
  const passwordHash = await hashPassword(testPassword);
  const user = await prisma.user.create({
    data: { email: testEmail, passwordHash, displayName: 'Login Tester' },
  });
  userId = user.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: 'login-test-' } } });
  await prisma.$disconnect();
});

describe('POST /api/auth/login - integration', () => {
  it('returns valid JWTs and stores refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: testPassword });

    expect(res.status).toBe(200);

    const accessPayload = verifyAccessToken(res.body.accessToken);
    expect(accessPayload.userId).toBe(userId);

    const refreshPayload = verifyRefreshToken(res.body.refreshToken);
    expect(refreshPayload.userId).toBe(userId);

    const stored = await prisma.refreshToken.findUnique({
      where: { token: res.body.refreshToken },
    });
    expect(stored).not.toBeNull();
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  it('returns 401 for unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@welltrack.test', password: testPassword });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/refresh - integration', () => {
  it('issues new tokens and rotates the refresh token', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: testPassword });

    const oldRefreshToken = loginRes.body.refreshToken;

    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: oldRefreshToken });

    expect(refreshRes.status).toBe(200);
    expect(typeof refreshRes.body.accessToken).toBe('string');
    expect(refreshRes.body.refreshToken).not.toBe(oldRefreshToken);

    const oldStored = await prisma.refreshToken.findUnique({ where: { token: oldRefreshToken } });
    expect(oldStored).toBeNull();

    const newStored = await prisma.refreshToken.findUnique({
      where: { token: refreshRes.body.refreshToken },
    });
    expect(newStored).not.toBeNull();
  });
});

describe('POST /api/auth/logout - integration', () => {
  it('removes the refresh token from the DB', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: testPassword });

    const refreshToken = loginRes.body.refreshToken;

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken });

    expect(logoutRes.status).toBe(204);

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    expect(stored).toBeNull();
  });
});
