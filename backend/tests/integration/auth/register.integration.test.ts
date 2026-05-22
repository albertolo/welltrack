import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../../src/app';
import { verifyAccessToken, verifyRefreshToken } from '../../../src/utils/jwt';

const prisma = new PrismaClient();

const testEmail = `register-test-${Date.now()}@welltrack.test`;

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: 'register-test-' } } });
  await prisma.$disconnect();
});

describe('POST /api/auth/register - integration', () => {
  it('creates a user and returns valid JWTs', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: testEmail,
      password: 'securepassword',
      displayName: 'Integration Tester',
    });

    expect(res.status).toBe(201);

    // Verify user in DB
    const dbUser = await prisma.user.findUnique({ where: { email: testEmail } });
    expect(dbUser).not.toBeNull();
    expect(dbUser!.displayName).toBe('Integration Tester');
    expect(dbUser!.timezone).toBe('UTC');

    // Verify tokens are valid JWTs with correct userId
    const accessPayload = verifyAccessToken(res.body.accessToken);
    expect(accessPayload.userId).toBe(dbUser!.id);

    const refreshPayload = verifyRefreshToken(res.body.refreshToken);
    expect(refreshPayload.userId).toBe(dbUser!.id);
  });

  it('stores the refresh token in the DB', async () => {
    const email = `register-test-${Date.now()}b@welltrack.test`;
    const res = await request(app).post('/api/auth/register').send({
      email,
      password: 'securepassword',
    });

    const stored = await prisma.refreshToken.findUnique({
      where: { token: res.body.refreshToken },
    });
    expect(stored).not.toBeNull();
    expect(stored!.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('returns 409 on duplicate email', async () => {
    const email = `register-test-${Date.now()}c@welltrack.test`;
    await request(app).post('/api/auth/register').send({ email, password: 'password123' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'different123' });
    expect(res.status).toBe(409);
  });

  it('does not store a user on validation failure', async () => {
    const email = `register-test-${Date.now()}d@welltrack.test`;
    await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'short' });
    const user = await prisma.user.findUnique({ where: { email } });
    expect(user).toBeNull();
  });
});
