import request from 'supertest';
import app from '../../../src/app';
import { generateAccessToken } from '../../../src/utils/jwt';

jest.mock('../../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    symptom: {
      findFirst: jest.fn(),
    },
    symptomLog: {
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

const mockSymptom = { id: 'sym-1', name: 'Headache', category: 'neurological' };
const mockLog = {
  id: 'log-1',
  userId: 'user-uuid-1',
  symptomId: 'sym-1',
  severity: 7,
  notes: 'bad day',
  loggedAt: new Date('2024-01-15T10:00:00Z'),
  createdAt: new Date('2024-01-15T10:00:00Z'),
  symptom: mockSymptom,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/symptom-logs', () => {
  it('returns logs for the current user', async () => {
    db.symptomLog.findMany.mockResolvedValue([mockLog]);

    const res = await request(app).get('/api/symptom-logs').set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.logs).toHaveLength(1);
    expect(res.body.logs[0].id).toBe('log-1');
  });

  it('passes date range filters to query', async () => {
    db.symptomLog.findMany.mockResolvedValue([]);

    await request(app)
      .get('/api/symptom-logs?startDate=2024-01-01&endDate=2024-01-31')
      .set('Authorization', authHeader);

    const where = db.symptomLog.findMany.mock.calls[0][0].where;
    expect(where.loggedAt).toBeDefined();
    expect(where.loggedAt.gte).toBeInstanceOf(Date);
    expect(where.loggedAt.lte).toBeInstanceOf(Date);
  });

  it('applies limit and offset', async () => {
    db.symptomLog.findMany.mockResolvedValue([]);

    await request(app)
      .get('/api/symptom-logs?limit=10&offset=5')
      .set('Authorization', authHeader);

    const call = db.symptomLog.findMany.mock.calls[0][0];
    expect(call.take).toBe(10);
    expect(call.skip).toBe(5);
  });

  it('returns 400 for invalid query params', async () => {
    const res = await request(app)
      .get('/api/symptom-logs?limit=999')
      .set('Authorization', authHeader);

    expect(res.status).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/symptom-logs');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/symptom-logs', () => {
  beforeEach(() => {
    db.symptom.findFirst.mockResolvedValue(mockSymptom);
    db.symptomLog.create.mockResolvedValue(mockLog);
  });

  it('creates a log entry', async () => {
    const res = await request(app)
      .post('/api/symptom-logs')
      .set('Authorization', authHeader)
      .send({ symptomId: 'system-headache', severity: 7 });

    expect(res.status).toBe(201);
    expect(res.body.log.id).toBe('log-1');
  });

  it('returns 404 when symptom is not accessible', async () => {
    db.symptom.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/symptom-logs')
      .set('Authorization', authHeader)
      .send({ symptomId: 'system-headache', severity: 7 });

    expect(res.status).toBe(404);
  });

  it('returns 400 when severity is out of range', async () => {
    const res = await request(app)
      .post('/api/symptom-logs')
      .set('Authorization', authHeader)
      .send({ symptomId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', severity: 11 });

    expect(res.status).toBe(400);
    expect(res.body.details[0].field).toBe('severity');
  });

  it('returns 400 when symptomId is empty', async () => {
    const res = await request(app)
      .post('/api/symptom-logs')
      .set('Authorization', authHeader)
      .send({ symptomId: '', severity: 5 });

    expect(res.status).toBe(400);
  });

  it('returns 400 when severity is missing', async () => {
    const res = await request(app)
      .post('/api/symptom-logs')
      .set('Authorization', authHeader)
      .send({ symptomId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' });

    expect(res.status).toBe(400);
  });

  it('stores userId from the token, not from the body', async () => {
    await request(app)
      .post('/api/symptom-logs')
      .set('Authorization', authHeader)
      .send({ symptomId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', severity: 5 });

    const createData = db.symptomLog.create.mock.calls[0][0].data;
    expect(createData.userId).toBe('user-uuid-1');
  });
});

describe('PATCH /api/symptom-logs/:id', () => {
  it('updates severity and notes', async () => {
    db.symptomLog.findUnique.mockResolvedValue(mockLog);
    db.symptomLog.update.mockResolvedValue({ ...mockLog, severity: 3 });

    const res = await request(app)
      .patch('/api/symptom-logs/log-1')
      .set('Authorization', authHeader)
      .send({ severity: 3 });

    expect(res.status).toBe(200);
    expect(res.body.log.severity).toBe(3);
  });

  it('returns 404 when log belongs to another user', async () => {
    db.symptomLog.findUnique.mockResolvedValue({ ...mockLog, userId: 'user-uuid-2' });

    const res = await request(app)
      .patch('/api/symptom-logs/log-1')
      .set('Authorization', authHeader)
      .send({ severity: 5 });

    expect(res.status).toBe(404);
  });

  it('returns 404 when log does not exist', async () => {
    db.symptomLog.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/symptom-logs/nonexistent')
      .set('Authorization', authHeader)
      .send({ severity: 5 });

    expect(res.status).toBe(404);
  });

  it('returns 400 when no fields are provided', async () => {
    const res = await request(app)
      .patch('/api/symptom-logs/log-1')
      .set('Authorization', authHeader)
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/symptom-logs/:id', () => {
  it('deletes the log and returns 204', async () => {
    db.symptomLog.findUnique.mockResolvedValue(mockLog);
    db.symptomLog.delete.mockResolvedValue({});

    const res = await request(app)
      .delete('/api/symptom-logs/log-1')
      .set('Authorization', authHeader);

    expect(res.status).toBe(204);
    expect(db.symptomLog.delete).toHaveBeenCalledWith({ where: { id: 'log-1' } });
  });

  it('returns 404 when log belongs to another user', async () => {
    db.symptomLog.findUnique.mockResolvedValue({ ...mockLog, userId: 'user-uuid-2' });

    const res = await request(app)
      .delete('/api/symptom-logs/log-1')
      .set('Authorization', authHeader);

    expect(res.status).toBe(404);
  });

  it('returns 404 when log does not exist', async () => {
    db.symptomLog.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/symptom-logs/nonexistent')
      .set('Authorization', authHeader);

    expect(res.status).toBe(404);
  });
});
