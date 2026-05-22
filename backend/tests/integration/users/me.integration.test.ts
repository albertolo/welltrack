import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../../src/app';
import { hashPassword } from '../../../src/utils/hash';
import { generateAccessToken } from '../../../src/utils/jwt';

const prisma = new PrismaClient();

const testEmail = `me-test-${Date.now()}@welltrack.test`;
const testPassword = 'securepassword';
let userId: string;
let authHeader: string;

beforeAll(async () => {
  const passwordHash = await hashPassword(testPassword);
  const user = await prisma.user.create({
    data: { email: testEmail, passwordHash, displayName: 'Me Tester' },
  });
  userId = user.id;
  authHeader = `Bearer ${generateAccessToken(userId)}`;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: 'me-test-' } } });
  await prisma.$disconnect();
});

describe('GET /api/users/me - integration', () => {
  it('returns the current user', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(userId);
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body.user.passwordHash).toBeUndefined();
  });
});

describe('PATCH /api/users/me - integration', () => {
  it('updates displayName in the DB', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', authHeader)
      .send({ displayName: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.user.displayName).toBe('Updated Name');

    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    expect(dbUser!.displayName).toBe('Updated Name');
  });

  it('updates timezone in the DB', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', authHeader)
      .send({ timezone: 'America/New_York' });

    expect(res.status).toBe(200);

    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    expect(dbUser!.timezone).toBe('America/New_York');
  });
});

describe('DELETE /api/users/me - integration', () => {
  it('deletes the user and all their data from the DB', async () => {
    const deleteEmail = `me-test-delete-${Date.now()}@welltrack.test`;
    const passwordHash = await hashPassword(testPassword);
    const user = await prisma.user.create({
      data: { email: deleteEmail, passwordHash },
    });
    const deleteHeader = `Bearer ${generateAccessToken(user.id)}`;

    const res = await request(app)
      .delete('/api/users/me')
      .set('Authorization', deleteHeader)
      .send({ password: testPassword });

    expect(res.status).toBe(204);

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(dbUser).toBeNull();
  });

  it('returns 401 when password is wrong', async () => {
    const res = await request(app)
      .delete('/api/users/me')
      .set('Authorization', authHeader)
      .send({ password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });
});
