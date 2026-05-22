import request from 'supertest';
import app from '../../../src/app';
import { generateAccessToken } from '../../../src/utils/jwt';

jest.mock('../../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    symptom: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = jest.requireMock('../../../src/lib/prisma').default as any;

const authHeader = `Bearer ${generateAccessToken('user-uuid-1')}`;

const systemSymptom = { id: 'sym-system-1', userId: null, name: 'Headache', category: 'neurological', isActive: true };
const userSymptom = { id: 'sym-user-1', userId: 'user-uuid-1', name: 'My Pain', category: 'pain', isActive: true };
const otherSymptom = { id: 'sym-other-1', userId: 'user-uuid-2', name: 'Other', category: null, isActive: true };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/symptoms', () => {
  it('returns system and user symptoms', async () => {
    db.symptom.findMany.mockResolvedValue([systemSymptom, userSymptom]);

    const res = await request(app).get('/api/symptoms').set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.symptoms).toHaveLength(2);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/symptoms');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/symptoms', () => {
  it('creates a custom symptom', async () => {
    db.symptom.create.mockResolvedValue(userSymptom);

    const res = await request(app)
      .post('/api/symptoms')
      .set('Authorization', authHeader)
      .send({ name: 'My Pain', category: 'pain' });

    expect(res.status).toBe(201);
    expect(res.body.symptom.name).toBe('My Pain');
    expect(db.symptom.create.mock.calls[0][0].data.userId).toBe('user-uuid-1');
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/symptoms')
      .set('Authorization', authHeader)
      .send({ category: 'pain' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('creates symptom without category', async () => {
    db.symptom.create.mockResolvedValue({ ...userSymptom, category: null });

    const res = await request(app)
      .post('/api/symptoms')
      .set('Authorization', authHeader)
      .send({ name: 'My Pain' });

    expect(res.status).toBe(201);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/symptoms').send({ name: 'Test' });
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/symptoms/:id', () => {
  it('updates a user-owned symptom', async () => {
    db.symptom.findUnique.mockResolvedValue(userSymptom);
    db.symptom.update.mockResolvedValue({ ...userSymptom, name: 'Renamed' });

    const res = await request(app)
      .patch('/api/symptoms/sym-user-1')
      .set('Authorization', authHeader)
      .send({ name: 'Renamed' });

    expect(res.status).toBe(200);
    expect(res.body.symptom.name).toBe('Renamed');
  });

  it('returns 403 when trying to modify a system symptom', async () => {
    db.symptom.findUnique.mockResolvedValue(systemSymptom);

    const res = await request(app)
      .patch('/api/symptoms/sym-system-1')
      .set('Authorization', authHeader)
      .send({ name: 'Hacked' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Cannot modify system symptoms');
  });

  it('returns 403 when trying to modify another user symptom', async () => {
    db.symptom.findUnique.mockResolvedValue(otherSymptom);

    const res = await request(app)
      .patch('/api/symptoms/sym-other-1')
      .set('Authorization', authHeader)
      .send({ name: 'Hacked' });

    expect(res.status).toBe(403);
  });

  it('returns 404 when symptom does not exist', async () => {
    db.symptom.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/symptoms/nonexistent')
      .set('Authorization', authHeader)
      .send({ name: 'x' });

    expect(res.status).toBe(404);
  });

  it('returns 400 when no fields are provided', async () => {
    const res = await request(app)
      .patch('/api/symptoms/sym-user-1')
      .set('Authorization', authHeader)
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/symptoms/:id', () => {
  it('deletes a user-owned symptom', async () => {
    db.symptom.findUnique.mockResolvedValue(userSymptom);
    db.symptom.delete.mockResolvedValue({});

    const res = await request(app)
      .delete('/api/symptoms/sym-user-1')
      .set('Authorization', authHeader);

    expect(res.status).toBe(204);
    expect(db.symptom.delete).toHaveBeenCalledWith({ where: { id: 'sym-user-1' } });
  });

  it('returns 403 when trying to delete a system symptom', async () => {
    db.symptom.findUnique.mockResolvedValue(systemSymptom);

    const res = await request(app)
      .delete('/api/symptoms/sym-system-1')
      .set('Authorization', authHeader);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Cannot delete system symptoms');
  });

  it('returns 403 when trying to delete another user symptom', async () => {
    db.symptom.findUnique.mockResolvedValue(otherSymptom);

    const res = await request(app)
      .delete('/api/symptoms/sym-other-1')
      .set('Authorization', authHeader);

    expect(res.status).toBe(403);
  });

  it('returns 404 when symptom does not exist', async () => {
    db.symptom.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/symptoms/nonexistent')
      .set('Authorization', authHeader);

    expect(res.status).toBe(404);
  });
});
