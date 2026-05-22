import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../../src/app';
import { hashPassword } from '../../../src/utils/hash';
import { generateAccessToken } from '../../../src/utils/jwt';

const prisma = new PrismaClient();

const testEmail = `symptom-logs-test-${Date.now()}@welltrack.test`;
const otherEmail = `symptom-logs-other-${Date.now()}@welltrack.test`;
let userId: string;
let otherUserId: string;
let authHeader: string;
let systemSymptomId: string;

beforeAll(async () => {
  const passwordHash = await hashPassword('password123');
  const user = await prisma.user.create({ data: { email: testEmail, passwordHash } });
  userId = user.id;
  authHeader = `Bearer ${generateAccessToken(userId)}`;

  const other = await prisma.user.create({ data: { email: otherEmail, passwordHash } });
  otherUserId = other.id;

  const sys = await prisma.symptom.findFirst({ where: { userId: null } });
  systemSymptomId = sys!.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: 'symptom-logs-test-' } } });
  await prisma.user.deleteMany({ where: { email: { contains: 'symptom-logs-other-' } } });
  await prisma.$disconnect();
});

describe('POST /api/symptom-logs - integration', () => {
  it('creates a symptom log', async () => {
    const res = await request(app)
      .post('/api/symptom-logs')
      .set('Authorization', authHeader)
      .send({ symptomId: systemSymptomId, severity: 6, notes: 'Rough morning' });

    expect(res.status).toBe(201);
    expect(res.body.log.severity).toBe(6);
    expect(res.body.log.symptom.id).toBe(systemSymptomId);

    const db = await prisma.symptomLog.findUnique({ where: { id: res.body.log.id } });
    expect(db!.userId).toBe(userId);
    expect(db!.severity).toBe(6);
  });

  it('returns 404 for a symptom the user cannot access', async () => {
    const otherSymptom = await prisma.symptom.create({
      data: { name: 'Private', userId: otherUserId },
    });

    const res = await request(app)
      .post('/api/symptom-logs')
      .set('Authorization', authHeader)
      .send({ symptomId: otherSymptom.id, severity: 5 });

    expect(res.status).toBe(404);

    await prisma.symptom.delete({ where: { id: otherSymptom.id } });
  });
});

describe('GET /api/symptom-logs - integration', () => {
  it('returns only the current user logs', async () => {
    const res = await request(app).get('/api/symptom-logs').set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.logs.every((l: { userId: string }) => l.userId === userId)).toBe(true);
  });

  it('filters by date range', async () => {
    const res = await request(app)
      .get('/api/symptom-logs?startDate=2000-01-01&endDate=2000-01-02')
      .set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.logs).toHaveLength(0);
  });

  it('respects limit and offset', async () => {
    const res = await request(app)
      .get('/api/symptom-logs?limit=1&offset=0')
      .set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.logs.length).toBeLessThanOrEqual(1);
  });
});

describe('PATCH /api/symptom-logs/:id - integration', () => {
  it('updates severity and notes', async () => {
    const log = await prisma.symptomLog.create({
      data: { userId, symptomId: systemSymptomId, severity: 4, notes: 'old' },
    });

    const res = await request(app)
      .patch(`/api/symptom-logs/${log.id}`)
      .set('Authorization', authHeader)
      .send({ severity: 8, notes: 'updated' });

    expect(res.status).toBe(200);

    const db = await prisma.symptomLog.findUnique({ where: { id: log.id } });
    expect(db!.severity).toBe(8);
    expect(db!.notes).toBe('updated');
  });
});

describe('DELETE /api/symptom-logs/:id - integration', () => {
  it('deletes the log', async () => {
    const log = await prisma.symptomLog.create({
      data: { userId, symptomId: systemSymptomId, severity: 2 },
    });

    const res = await request(app)
      .delete(`/api/symptom-logs/${log.id}`)
      .set('Authorization', authHeader);

    expect(res.status).toBe(204);
    expect(await prisma.symptomLog.findUnique({ where: { id: log.id } })).toBeNull();
  });

  it('returns 404 for another user log', async () => {
    const log = await prisma.symptomLog.create({
      data: { userId: otherUserId, symptomId: systemSymptomId, severity: 3 },
    });

    const res = await request(app)
      .delete(`/api/symptom-logs/${log.id}`)
      .set('Authorization', authHeader);

    expect(res.status).toBe(404);

    await prisma.symptomLog.delete({ where: { id: log.id } });
  });
});
