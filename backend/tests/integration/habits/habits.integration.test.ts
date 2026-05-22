import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../../src/app';
import { hashPassword } from '../../../src/utils/hash';
import { generateAccessToken } from '../../../src/utils/jwt';

const prisma = new PrismaClient();

const testEmail = `habits-test-${Date.now()}@welltrack.test`;
let userId: string;
let authHeader: string;

beforeAll(async () => {
  const passwordHash = await hashPassword('password123');
  const user = await prisma.user.create({ data: { email: testEmail, passwordHash } });
  userId = user.id;
  authHeader = `Bearer ${generateAccessToken(userId)}`;
});

afterAll(async () => {
  await prisma.habit.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { email: { contains: 'habits-test-' } } });
  await prisma.$disconnect();
});

describe('GET /api/habits - integration', () => {
  it('returns system defaults plus user custom habits', async () => {
    const custom = await prisma.habit.create({
      data: { name: 'My Habit', trackingType: 'BOOLEAN', userId },
    });

    const res = await request(app).get('/api/habits').set('Authorization', authHeader);

    expect(res.status).toBe(200);
    const ids = res.body.habits.map((h: { id: string }) => h.id);
    expect(ids).toContain(custom.id);
    const systemHabits = res.body.habits.filter((h: { userId: string | null }) => h.userId === null);
    expect(systemHabits.length).toBeGreaterThan(0);

    await prisma.habit.delete({ where: { id: custom.id } });
  });
});

describe('POST /api/habits - integration', () => {
  it('creates a custom habit linked to the user', async () => {
    const res = await request(app)
      .post('/api/habits')
      .set('Authorization', authHeader)
      .send({ name: 'Journaling', trackingType: 'BOOLEAN' });

    expect(res.status).toBe(201);
    expect(res.body.habit.trackingType).toBe('BOOLEAN');

    const db = await prisma.habit.findUnique({ where: { id: res.body.habit.id } });
    expect(db!.userId).toBe(userId);

    await prisma.habit.delete({ where: { id: res.body.habit.id } });
  });
});

describe('PATCH /api/habits/:id - integration', () => {
  it('updates a user-owned habit', async () => {
    const habit = await prisma.habit.create({
      data: { name: 'Old Name', trackingType: 'NUMERIC', userId },
    });

    const res = await request(app)
      .patch(`/api/habits/${habit.id}`)
      .set('Authorization', authHeader)
      .send({ name: 'New Name', isActive: false });

    expect(res.status).toBe(200);

    const db = await prisma.habit.findUnique({ where: { id: habit.id } });
    expect(db!.name).toBe('New Name');
    expect(db!.isActive).toBe(false);

    await prisma.habit.delete({ where: { id: habit.id } });
  });

  it('returns 403 when modifying a system habit', async () => {
    const sys = await prisma.habit.findFirst({ where: { userId: null } });

    const res = await request(app)
      .patch(`/api/habits/${sys!.id}`)
      .set('Authorization', authHeader)
      .send({ name: 'Hacked' });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/habits/:id - integration', () => {
  it('deletes a user-owned habit', async () => {
    const habit = await prisma.habit.create({
      data: { name: 'To Delete', trackingType: 'BOOLEAN', userId },
    });

    const res = await request(app)
      .delete(`/api/habits/${habit.id}`)
      .set('Authorization', authHeader);

    expect(res.status).toBe(204);
    expect(await prisma.habit.findUnique({ where: { id: habit.id } })).toBeNull();
  });

  it('returns 403 when deleting a system habit', async () => {
    const sys = await prisma.habit.findFirst({ where: { userId: null } });

    const res = await request(app)
      .delete(`/api/habits/${sys!.id}`)
      .set('Authorization', authHeader);

    expect(res.status).toBe(403);
  });
});
