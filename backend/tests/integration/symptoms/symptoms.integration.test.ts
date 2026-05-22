import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../../src/app';
import { hashPassword } from '../../../src/utils/hash';
import { generateAccessToken } from '../../../src/utils/jwt';

const prisma = new PrismaClient();

const testEmail = `symptoms-test-${Date.now()}@welltrack.test`;
let userId: string;
let authHeader: string;

beforeAll(async () => {
  const passwordHash = await hashPassword('password123');
  const user = await prisma.user.create({ data: { email: testEmail, passwordHash } });
  userId = user.id;
  authHeader = `Bearer ${generateAccessToken(userId)}`;
});

afterAll(async () => {
  await prisma.symptom.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { email: { contains: 'symptoms-test-' } } });
  await prisma.$disconnect();
});

describe('GET /api/symptoms - integration', () => {
  it('returns system defaults plus user custom symptoms', async () => {
    const custom = await prisma.symptom.create({ data: { name: 'My Twitch', userId } });

    const res = await request(app).get('/api/symptoms').set('Authorization', authHeader);

    expect(res.status).toBe(200);
    const ids = res.body.symptoms.map((s: { id: string }) => s.id);
    expect(ids).toContain(custom.id);
    // should also include at least one system symptom
    const systemSymptoms = res.body.symptoms.filter((s: { userId: string | null }) => s.userId === null);
    expect(systemSymptoms.length).toBeGreaterThan(0);

    await prisma.symptom.delete({ where: { id: custom.id } });
  });
});

describe('POST /api/symptoms - integration', () => {
  it('creates a custom symptom linked to the user', async () => {
    const res = await request(app)
      .post('/api/symptoms')
      .set('Authorization', authHeader)
      .send({ name: 'Integration Pain', category: 'pain' });

    expect(res.status).toBe(201);
    expect(res.body.symptom.name).toBe('Integration Pain');

    const db = await prisma.symptom.findUnique({ where: { id: res.body.symptom.id } });
    expect(db!.userId).toBe(userId);

    await prisma.symptom.delete({ where: { id: res.body.symptom.id } });
  });
});

describe('PATCH /api/symptoms/:id - integration', () => {
  it('updates a user-owned symptom', async () => {
    const sym = await prisma.symptom.create({ data: { name: 'Old Name', userId } });

    const res = await request(app)
      .patch(`/api/symptoms/${sym.id}`)
      .set('Authorization', authHeader)
      .send({ name: 'New Name', isActive: false });

    expect(res.status).toBe(200);

    const db = await prisma.symptom.findUnique({ where: { id: sym.id } });
    expect(db!.name).toBe('New Name');
    expect(db!.isActive).toBe(false);

    await prisma.symptom.delete({ where: { id: sym.id } });
  });

  it('returns 403 when modifying a system symptom', async () => {
    const system = await prisma.symptom.findFirst({ where: { userId: null } });

    const res = await request(app)
      .patch(`/api/symptoms/${system!.id}`)
      .set('Authorization', authHeader)
      .send({ name: 'Hacked' });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/symptoms/:id - integration', () => {
  it('deletes a user-owned symptom', async () => {
    const sym = await prisma.symptom.create({ data: { name: 'To Delete', userId } });

    const res = await request(app)
      .delete(`/api/symptoms/${sym.id}`)
      .set('Authorization', authHeader);

    expect(res.status).toBe(204);
    expect(await prisma.symptom.findUnique({ where: { id: sym.id } })).toBeNull();
  });

  it('returns 403 when deleting a system symptom', async () => {
    const system = await prisma.symptom.findFirst({ where: { userId: null } });

    const res = await request(app)
      .delete(`/api/symptoms/${system!.id}`)
      .set('Authorization', authHeader);

    expect(res.status).toBe(403);
  });
});
