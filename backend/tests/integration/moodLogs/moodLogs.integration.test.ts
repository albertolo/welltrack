import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../../src/app';
import { hashPassword } from '../../../src/utils/hash';
import { generateAccessToken } from '../../../src/utils/jwt';

const prisma = new PrismaClient();

const testEmail = `mood-logs-test-${Date.now()}@welltrack.test`;
let userId: string;
let authHeader: string;

beforeAll(async () => {
  const passwordHash = await hashPassword('password123');
  const user = await prisma.user.create({ data: { email: testEmail, passwordHash } });
  userId = user.id;
  authHeader = `Bearer ${generateAccessToken(userId)}`;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: 'mood-logs-test-' } } });
  await prisma.$disconnect();
});

describe('POST /api/mood-logs - integration', () => {
  it('creates a mood log in the DB', async () => {
    const res = await request(app)
      .post('/api/mood-logs')
      .set('Authorization', authHeader)
      .send({ moodScore: 4, energyLevel: 3, notes: 'Good day' });

    expect(res.status).toBe(201);
    expect(res.body.log.moodScore).toBe(4);

    const db = await prisma.moodLog.findUnique({ where: { id: res.body.log.id } });
    expect(db!.userId).toBe(userId);
    expect(db!.moodScore).toBe(4);
    expect(db!.energyLevel).toBe(3);
  });
});

describe('GET /api/mood-logs - integration', () => {
  it('returns only the current user logs', async () => {
    const res = await request(app).get('/api/mood-logs').set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.logs.every((l: { userId: string }) => l.userId === userId)).toBe(true);
  });

  it('filters by date range', async () => {
    const res = await request(app)
      .get('/api/mood-logs?startDate=2000-01-01&endDate=2000-01-02')
      .set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.logs).toHaveLength(0);
  });
});

describe('PATCH /api/mood-logs/:id - integration', () => {
  it('updates moodScore and stressLevel', async () => {
    const log = await prisma.moodLog.create({
      data: { userId, moodScore: 2, stressLevel: 4 },
    });

    const res = await request(app)
      .patch(`/api/mood-logs/${log.id}`)
      .set('Authorization', authHeader)
      .send({ moodScore: 5, stressLevel: 1 });

    expect(res.status).toBe(200);

    const db = await prisma.moodLog.findUnique({ where: { id: log.id } });
    expect(db!.moodScore).toBe(5);
    expect(db!.stressLevel).toBe(1);
  });
});

describe('DELETE /api/mood-logs/:id - integration', () => {
  it('deletes the log', async () => {
    const log = await prisma.moodLog.create({ data: { userId, moodScore: 3 } });

    const res = await request(app)
      .delete(`/api/mood-logs/${log.id}`)
      .set('Authorization', authHeader);

    expect(res.status).toBe(204);
    expect(await prisma.moodLog.findUnique({ where: { id: log.id } })).toBeNull();
  });

  it('returns 404 for another user log', async () => {
    const otherEmail = `mood-logs-other-${Date.now()}@welltrack.test`;
    const other = await prisma.user.create({
      data: { email: otherEmail, passwordHash: 'x' },
    });
    const log = await prisma.moodLog.create({ data: { userId: other.id, moodScore: 3 } });

    const res = await request(app)
      .delete(`/api/mood-logs/${log.id}`)
      .set('Authorization', authHeader);

    expect(res.status).toBe(404);

    await prisma.user.delete({ where: { id: other.id } });
  });
});
