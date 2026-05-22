import request from 'supertest';
import app from '../../../src/app';
import { generateAccessToken } from '../../../src/utils/jwt';

jest.mock('../../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    medication: {
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

const mockMed = {
  id: 'med-1',
  userId: 'user-uuid-1',
  name: 'Ibuprofen',
  dosage: '400mg',
  frequency: 'twice daily',
  isActive: true,
  createdAt: new Date('2024-01-01'),
};

const otherMed = { ...mockMed, id: 'med-2', userId: 'user-uuid-2' };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/medications', () => {
  it('returns medications for the current user', async () => {
    db.medication.findMany.mockResolvedValue([mockMed]);

    const res = await request(app).get('/api/medications').set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.medications).toHaveLength(1);
    expect(res.body.medications[0].name).toBe('Ibuprofen');
  });

  it('queries only for the current user', async () => {
    db.medication.findMany.mockResolvedValue([]);

    await request(app).get('/api/medications').set('Authorization', authHeader);

    expect(db.medication.findMany.mock.calls[0][0].where.userId).toBe('user-uuid-1');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/medications');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/medications', () => {
  it('creates a medication with all fields', async () => {
    db.medication.create.mockResolvedValue(mockMed);

    const res = await request(app)
      .post('/api/medications')
      .set('Authorization', authHeader)
      .send({ name: 'Ibuprofen', dosage: '400mg', frequency: 'twice daily' });

    expect(res.status).toBe(201);
    expect(res.body.medication.name).toBe('Ibuprofen');
    expect(db.medication.create.mock.calls[0][0].data.userId).toBe('user-uuid-1');
  });

  it('creates a medication with only a name', async () => {
    db.medication.create.mockResolvedValue({ ...mockMed, dosage: null, frequency: null });

    const res = await request(app)
      .post('/api/medications')
      .set('Authorization', authHeader)
      .send({ name: 'Ibuprofen' });

    expect(res.status).toBe(201);
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/medications')
      .set('Authorization', authHeader)
      .send({ dosage: '400mg' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/medications').send({ name: 'Test' });
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/medications/:id', () => {
  it('updates a medication', async () => {
    db.medication.findUnique.mockResolvedValue(mockMed);
    db.medication.update.mockResolvedValue({ ...mockMed, dosage: '600mg' });

    const res = await request(app)
      .patch('/api/medications/med-1')
      .set('Authorization', authHeader)
      .send({ dosage: '600mg' });

    expect(res.status).toBe(200);
    expect(res.body.medication.dosage).toBe('600mg');
  });

  it('can deactivate a medication', async () => {
    db.medication.findUnique.mockResolvedValue(mockMed);
    db.medication.update.mockResolvedValue({ ...mockMed, isActive: false });

    const res = await request(app)
      .patch('/api/medications/med-1')
      .set('Authorization', authHeader)
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.medication.isActive).toBe(false);
  });

  it('returns 404 when medication belongs to another user', async () => {
    db.medication.findUnique.mockResolvedValue(otherMed);

    const res = await request(app)
      .patch('/api/medications/med-2')
      .set('Authorization', authHeader)
      .send({ name: 'Hacked' });

    expect(res.status).toBe(404);
  });

  it('returns 404 when medication does not exist', async () => {
    db.medication.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/medications/nonexistent')
      .set('Authorization', authHeader)
      .send({ name: 'x' });

    expect(res.status).toBe(404);
  });

  it('returns 400 when no fields are provided', async () => {
    const res = await request(app)
      .patch('/api/medications/med-1')
      .set('Authorization', authHeader)
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/medications/:id', () => {
  it('deletes the medication and returns 204', async () => {
    db.medication.findUnique.mockResolvedValue(mockMed);
    db.medication.delete.mockResolvedValue({});

    const res = await request(app)
      .delete('/api/medications/med-1')
      .set('Authorization', authHeader);

    expect(res.status).toBe(204);
    expect(db.medication.delete).toHaveBeenCalledWith({ where: { id: 'med-1' } });
  });

  it('returns 404 when medication belongs to another user', async () => {
    db.medication.findUnique.mockResolvedValue(otherMed);

    const res = await request(app)
      .delete('/api/medications/med-2')
      .set('Authorization', authHeader);

    expect(res.status).toBe(404);
  });

  it('returns 404 when medication does not exist', async () => {
    db.medication.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/medications/nonexistent')
      .set('Authorization', authHeader);

    expect(res.status).toBe(404);
  });
});
