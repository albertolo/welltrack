import request from 'supertest';
import app from '../../../src/app';
import { generateAccessToken } from '../../../src/utils/jwt';

jest.mock('../../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    medication: { findFirst: jest.fn() },
    medicationLog: {
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

const mockMed = { id: 'med-1', name: 'Ibuprofen', dosage: '400mg', frequency: 'twice daily' };
const mockLog = {
  id: 'log-1',
  userId: 'user-uuid-1',
  medicationId: 'med-1',
  taken: true,
  takenAt: null,
  notes: null,
  createdAt: new Date('2024-01-15T10:00:00Z'),
  medication: mockMed,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/medication-logs', () => {
  it('returns logs for the current user', async () => {
    db.medicationLog.findMany.mockResolvedValue([mockLog]);

    const res = await request(app).get('/api/medication-logs').set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.logs).toHaveLength(1);
    expect(res.body.logs[0].taken).toBe(true);
  });

  it('passes date range to query', async () => {
    db.medicationLog.findMany.mockResolvedValue([]);

    await request(app)
      .get('/api/medication-logs?startDate=2024-01-01&endDate=2024-01-31')
      .set('Authorization', authHeader);

    const where = db.medicationLog.findMany.mock.calls[0][0].where;
    expect(where.createdAt.gte).toBeInstanceOf(Date);
    expect(where.createdAt.lte).toBeInstanceOf(Date);
  });

  it('applies limit and offset', async () => {
    db.medicationLog.findMany.mockResolvedValue([]);

    await request(app)
      .get('/api/medication-logs?limit=5&offset=10')
      .set('Authorization', authHeader);

    const call = db.medicationLog.findMany.mock.calls[0][0];
    expect(call.take).toBe(5);
    expect(call.skip).toBe(10);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/medication-logs');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/medication-logs', () => {
  beforeEach(() => {
    db.medication.findFirst.mockResolvedValue(mockMed);
    db.medicationLog.create.mockResolvedValue(mockLog);
  });

  it('creates a log entry', async () => {
    const res = await request(app)
      .post('/api/medication-logs')
      .set('Authorization', authHeader)
      .send({ medicationId: 'med-1', taken: true });

    expect(res.status).toBe(201);
    expect(res.body.log.taken).toBe(true);
  });

  it('stores userId from token', async () => {
    await request(app)
      .post('/api/medication-logs')
      .set('Authorization', authHeader)
      .send({ medicationId: 'med-1', taken: false });

    expect(db.medicationLog.create.mock.calls[0][0].data.userId).toBe('user-uuid-1');
  });

  it('returns 404 when medication not found or belongs to another user', async () => {
    db.medication.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/medication-logs')
      .set('Authorization', authHeader)
      .send({ medicationId: 'med-other', taken: true });

    expect(res.status).toBe(404);
  });

  it('returns 400 when taken is missing', async () => {
    const res = await request(app)
      .post('/api/medication-logs')
      .set('Authorization', authHeader)
      .send({ medicationId: 'med-1' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when medicationId is missing', async () => {
    const res = await request(app)
      .post('/api/medication-logs')
      .set('Authorization', authHeader)
      .send({ taken: true });

    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/medication-logs/:id', () => {
  it('updates the taken status', async () => {
    db.medicationLog.findUnique.mockResolvedValue(mockLog);
    db.medicationLog.update.mockResolvedValue({ ...mockLog, taken: false });

    const res = await request(app)
      .patch('/api/medication-logs/log-1')
      .set('Authorization', authHeader)
      .send({ taken: false });

    expect(res.status).toBe(200);
    expect(res.body.log.taken).toBe(false);
  });

  it('returns 404 when log belongs to another user', async () => {
    db.medicationLog.findUnique.mockResolvedValue({ ...mockLog, userId: 'user-uuid-2' });

    const res = await request(app)
      .patch('/api/medication-logs/log-1')
      .set('Authorization', authHeader)
      .send({ taken: false });

    expect(res.status).toBe(404);
  });

  it('returns 400 when no fields provided', async () => {
    const res = await request(app)
      .patch('/api/medication-logs/log-1')
      .set('Authorization', authHeader)
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/medication-logs/:id', () => {
  it('deletes the log and returns 204', async () => {
    db.medicationLog.findUnique.mockResolvedValue(mockLog);
    db.medicationLog.delete.mockResolvedValue({});

    const res = await request(app)
      .delete('/api/medication-logs/log-1')
      .set('Authorization', authHeader);

    expect(res.status).toBe(204);
  });

  it('returns 404 when log belongs to another user', async () => {
    db.medicationLog.findUnique.mockResolvedValue({ ...mockLog, userId: 'user-uuid-2' });

    const res = await request(app)
      .delete('/api/medication-logs/log-1')
      .set('Authorization', authHeader);

    expect(res.status).toBe(404);
  });

  it('returns 404 when log does not exist', async () => {
    db.medicationLog.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/medication-logs/nonexistent')
      .set('Authorization', authHeader);

    expect(res.status).toBe(404);
  });
});
