import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../../src/app';
import { hashPassword } from '../../../src/utils/hash';
import { generateAccessToken } from '../../../src/utils/jwt';

const prisma = new PrismaClient();

const testEmail = `habit-logs-test-${Date.now()}@welltrack.test`;
let userId: string;
let authHeader: string;
let boolHabitId: string;
let numHabitId: string;
let durHabitId: string;

beforeAll(async () => {
  const passwordHash = await hashPassword('password123');
  const user = await prisma.user.create({ data: { email: testEmail, passwordHash } });
  userId = user.id;
  authHeader = `Bearer ${generateAccessToken(userId)}`;

  const sys = await prisma.habit.findFirst({ where: { userId: null, trackingType: 'BOOLEAN' } });
  boolHabitId = sys!.id;

  const numHabit = await prisma.habit.create({
    data: { name: 'Water', trackingType: 'NUMERIC', unit: 'glasses', userId },
  });
  numHabitId = numHabit.id;

  const durHabit = await prisma.habit.create({
    data: { name: 'Sleep', trackingType: 'DURATION', unit: 'minutes', userId },
  });
  durHabitId = durHabit.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: 'habit-logs-test-' } } });
  await prisma.$disconnect();
});

describe('POST /api/habit-logs - integration', () => {
  it('creates a BOOLEAN habit log', async () => {
    const res = await request(app)
      .post('/api/habit-logs')
      .set('Authorization', authHeader)
      .send({ habitId: boolHabitId, valueBoolean: true });

    expect(res.status).toBe(201);

    const db = await prisma.habitLog.findUnique({ where: { id: res.body.log.id } });
    expect(db!.valueBoolean).toBe(true);
    expect(db!.valueNumeric).toBeNull();
    expect(db!.valueDuration).toBeNull();
  });

  it('creates a NUMERIC habit log', async () => {
    const res = await request(app)
      .post('/api/habit-logs')
      .set('Authorization', authHeader)
      .send({ habitId: numHabitId, valueNumeric: 8 });

    expect(res.status).toBe(201);

    const db = await prisma.habitLog.findUnique({ where: { id: res.body.log.id } });
    expect(db!.valueNumeric).toBe(8);
    expect(db!.valueBoolean).toBeNull();
  });

  it('creates a DURATION habit log', async () => {
    const res = await request(app)
      .post('/api/habit-logs')
      .set('Authorization', authHeader)
      .send({ habitId: durHabitId, valueDuration: 480 });

    expect(res.status).toBe(201);

    const db = await prisma.habitLog.findUnique({ where: { id: res.body.log.id } });
    expect(db!.valueDuration).toBe(480);
  });

  it('returns 400 when wrong value field provided', async () => {
    const res = await request(app)
      .post('/api/habit-logs')
      .set('Authorization', authHeader)
      .send({ habitId: numHabitId });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/valueNumeric/);
  });
});

describe('GET /api/habit-logs - integration', () => {
  it('returns only the current user logs', async () => {
    const res = await request(app).get('/api/habit-logs').set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.logs.every((l: { userId: string }) => l.userId === userId)).toBe(true);
  });

  it('filters by date range', async () => {
    const res = await request(app)
      .get('/api/habit-logs?startDate=2000-01-01&endDate=2000-01-02')
      .set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.logs).toHaveLength(0);
  });
});

describe('PATCH /api/habit-logs/:id - integration', () => {
  it('updates the log value', async () => {
    const log = await prisma.habitLog.create({
      data: { userId, habitId: numHabitId, valueNumeric: 5 },
    });

    const res = await request(app)
      .patch(`/api/habit-logs/${log.id}`)
      .set('Authorization', authHeader)
      .send({ valueNumeric: 10, notes: 'extra hydrated' });

    expect(res.status).toBe(200);

    const db = await prisma.habitLog.findUnique({ where: { id: log.id } });
    expect(db!.valueNumeric).toBe(10);
    expect(db!.notes).toBe('extra hydrated');
  });
});

describe('DELETE /api/habit-logs/:id - integration', () => {
  it('deletes the log', async () => {
    const log = await prisma.habitLog.create({
      data: { userId, habitId: boolHabitId, valueBoolean: false },
    });

    const res = await request(app)
      .delete(`/api/habit-logs/${log.id}`)
      .set('Authorization', authHeader);

    expect(res.status).toBe(204);
    expect(await prisma.habitLog.findUnique({ where: { id: log.id } })).toBeNull();
  });
});
