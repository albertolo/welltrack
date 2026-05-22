import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../../src/app';
import { hashPassword } from '../../../src/utils/hash';
import { generateAccessToken } from '../../../src/utils/jwt';

const prisma = new PrismaClient();

const testEmail = `medlogs-test-${Date.now()}@welltrack.test`;
let userId: string;
let authHeader: string;
let medicationId: string;

beforeAll(async () => {
  const passwordHash = await hashPassword('password123');
  const user = await prisma.user.create({ data: { email: testEmail, passwordHash } });
  userId = user.id;
  authHeader = `Bearer ${generateAccessToken(userId)}`;

  const med = await prisma.medication.create({ data: { userId, name: 'TestMed' } });
  medicationId = med.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: 'medlogs-test-' } } });
  await prisma.$disconnect();
});

describe('POST /api/medication-logs - integration', () => {
  it('creates a medication log in the DB', async () => {
    const res = await request(app)
      .post('/api/medication-logs')
      .set('Authorization', authHeader)
      .send({ medicationId, taken: true, notes: 'with food' });

    expect(res.status).toBe(201);
    expect(res.body.log.taken).toBe(true);
    expect(res.body.log.medication.id).toBe(medicationId);

    const db = await prisma.medicationLog.findUnique({ where: { id: res.body.log.id } });
    expect(db!.userId).toBe(userId);
    expect(db!.taken).toBe(true);
  });

  it('returns 404 when medication belongs to another user', async () => {
    const otherEmail = `medlogs-other-${Date.now()}@welltrack.test`;
    const other = await prisma.user.create({ data: { email: otherEmail, passwordHash: 'x' } });
    const otherMed = await prisma.medication.create({ data: { userId: other.id, name: 'Private' } });

    const res = await request(app)
      .post('/api/medication-logs')
      .set('Authorization', authHeader)
      .send({ medicationId: otherMed.id, taken: true });

    expect(res.status).toBe(404);
    await prisma.user.delete({ where: { id: other.id } });
  });
});

describe('GET /api/medication-logs - integration', () => {
  it('returns only the current user logs', async () => {
    const res = await request(app).get('/api/medication-logs').set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.logs.every((l: { userId: string }) => l.userId === userId)).toBe(true);
  });

  it('filters by date range', async () => {
    const res = await request(app)
      .get('/api/medication-logs?startDate=2000-01-01&endDate=2000-01-02')
      .set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.logs).toHaveLength(0);
  });
});

describe('PATCH /api/medication-logs/:id - integration', () => {
  it('updates the taken field', async () => {
    const log = await prisma.medicationLog.create({
      data: { userId, medicationId, taken: true },
    });

    const res = await request(app)
      .patch(`/api/medication-logs/${log.id}`)
      .set('Authorization', authHeader)
      .send({ taken: false, notes: 'forgot earlier' });

    expect(res.status).toBe(200);

    const db = await prisma.medicationLog.findUnique({ where: { id: log.id } });
    expect(db!.taken).toBe(false);
    expect(db!.notes).toBe('forgot earlier');
  });
});

describe('DELETE /api/medication-logs/:id - integration', () => {
  it('deletes the log', async () => {
    const log = await prisma.medicationLog.create({
      data: { userId, medicationId, taken: true },
    });

    const res = await request(app)
      .delete(`/api/medication-logs/${log.id}`)
      .set('Authorization', authHeader);

    expect(res.status).toBe(204);
    expect(await prisma.medicationLog.findUnique({ where: { id: log.id } })).toBeNull();
  });
});
