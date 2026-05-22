import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../../src/app';
import { hashPassword } from '../../../src/utils/hash';
import { generateAccessToken } from '../../../src/utils/jwt';

const prisma = new PrismaClient();

const testEmail = `medications-test-${Date.now()}@welltrack.test`;
let userId: string;
let authHeader: string;

beforeAll(async () => {
  const passwordHash = await hashPassword('password123');
  const user = await prisma.user.create({ data: { email: testEmail, passwordHash } });
  userId = user.id;
  authHeader = `Bearer ${generateAccessToken(userId)}`;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: 'medications-test-' } } });
  await prisma.$disconnect();
});

describe('POST /api/medications - integration', () => {
  it('creates a medication in the DB', async () => {
    const res = await request(app)
      .post('/api/medications')
      .set('Authorization', authHeader)
      .send({ name: 'Metformin', dosage: '500mg', frequency: 'twice daily' });

    expect(res.status).toBe(201);
    expect(res.body.medication.name).toBe('Metformin');

    const db = await prisma.medication.findUnique({ where: { id: res.body.medication.id } });
    expect(db!.userId).toBe(userId);
    expect(db!.dosage).toBe('500mg');

    await prisma.medication.delete({ where: { id: res.body.medication.id } });
  });
});

describe('GET /api/medications - integration', () => {
  it('returns only the current user medications', async () => {
    const med = await prisma.medication.create({ data: { userId, name: 'Aspirin' } });

    const res = await request(app).get('/api/medications').set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.medications.every((m: { userId: string }) => m.userId === userId)).toBe(true);

    await prisma.medication.delete({ where: { id: med.id } });
  });
});

describe('PATCH /api/medications/:id - integration', () => {
  it('updates name and isActive', async () => {
    const med = await prisma.medication.create({ data: { userId, name: 'Old Name' } });

    const res = await request(app)
      .patch(`/api/medications/${med.id}`)
      .set('Authorization', authHeader)
      .send({ name: 'New Name', isActive: false });

    expect(res.status).toBe(200);

    const db = await prisma.medication.findUnique({ where: { id: med.id } });
    expect(db!.name).toBe('New Name');
    expect(db!.isActive).toBe(false);

    await prisma.medication.delete({ where: { id: med.id } });
  });

  it('returns 404 for another user medication', async () => {
    const otherEmail = `medications-other-${Date.now()}@welltrack.test`;
    const other = await prisma.user.create({
      data: { email: otherEmail, passwordHash: 'x' },
    });
    const med = await prisma.medication.create({ data: { userId: other.id, name: 'Private' } });

    const res = await request(app)
      .patch(`/api/medications/${med.id}`)
      .set('Authorization', authHeader)
      .send({ name: 'Hacked' });

    expect(res.status).toBe(404);

    await prisma.user.delete({ where: { id: other.id } });
  });
});

describe('DELETE /api/medications/:id - integration', () => {
  it('deletes the medication', async () => {
    const med = await prisma.medication.create({ data: { userId, name: 'To Delete' } });

    const res = await request(app)
      .delete(`/api/medications/${med.id}`)
      .set('Authorization', authHeader);

    expect(res.status).toBe(204);
    expect(await prisma.medication.findUnique({ where: { id: med.id } })).toBeNull();
  });
});
