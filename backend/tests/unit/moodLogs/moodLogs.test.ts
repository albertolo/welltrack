import request from 'supertest';
import app from '../../../src/app';
import { generateAccessToken } from '../../../src/utils/jwt';

jest.mock('../../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    moodLog: {
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

const mockLog = {
  id: 'log-1',
  userId: 'user-uuid-1',
  moodScore: 3,
  energyLevel: 4,
  stressLevel: 2,
  notes: 'feeling okay',
  loggedAt: new Date('2024-01-15T10:00:00Z'),
  createdAt: new Date('2024-01-15T10:00:00Z'),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/mood-logs', () => {
  it('returns logs for the current user', async () => {
    db.moodLog.findMany.mockResolvedValue([mockLog]);

    const res = await request(app).get('/api/mood-logs').set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.logs).toHaveLength(1);
    expect(res.body.logs[0].moodScore).toBe(3);
  });

  it('passes date range filters to query', async () => {
    db.moodLog.findMany.mockResolvedValue([]);

    await request(app)
      .get('/api/mood-logs?startDate=2024-01-01&endDate=2024-01-31')
      .set('Authorization', authHeader);

    const where = db.moodLog.findMany.mock.calls[0][0].where;
    expect(where.loggedAt.gte).toBeInstanceOf(Date);
    expect(where.loggedAt.lte).toBeInstanceOf(Date);
  });

  it('applies limit and offset', async () => {
    db.moodLog.findMany.mockResolvedValue([]);

    await request(app)
      .get('/api/mood-logs?limit=10&offset=5')
      .set('Authorization', authHeader);

    const call = db.moodLog.findMany.mock.calls[0][0];
    expect(call.take).toBe(10);
    expect(call.skip).toBe(5);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/mood-logs');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/mood-logs', () => {
  beforeEach(() => {
    db.moodLog.create.mockResolvedValue(mockLog);
  });

  it('creates a mood log with all fields', async () => {
    const res = await request(app)
      .post('/api/mood-logs')
      .set('Authorization', authHeader)
      .send({ moodScore: 3, energyLevel: 4, stressLevel: 2, notes: 'feeling okay' });

    expect(res.status).toBe(201);
    expect(res.body.log.moodScore).toBe(3);
  });

  it('creates a mood log with only moodScore', async () => {
    db.moodLog.create.mockResolvedValue({ ...mockLog, energyLevel: null, stressLevel: null });

    const res = await request(app)
      .post('/api/mood-logs')
      .set('Authorization', authHeader)
      .send({ moodScore: 4 });

    expect(res.status).toBe(201);
  });

  it('stores userId from token', async () => {
    await request(app)
      .post('/api/mood-logs')
      .set('Authorization', authHeader)
      .send({ moodScore: 3 });

    expect(db.moodLog.create.mock.calls[0][0].data.userId).toBe('user-uuid-1');
  });

  it('returns 400 when moodScore is missing', async () => {
    const res = await request(app)
      .post('/api/mood-logs')
      .set('Authorization', authHeader)
      .send({ energyLevel: 3 });

    expect(res.status).toBe(400);
    expect(res.body.details[0].field).toBe('moodScore');
  });

  it('returns 400 when moodScore is out of range', async () => {
    const res = await request(app)
      .post('/api/mood-logs')
      .set('Authorization', authHeader)
      .send({ moodScore: 6 });

    expect(res.status).toBe(400);
  });

  it('returns 400 when energyLevel is out of range', async () => {
    const res = await request(app)
      .post('/api/mood-logs')
      .set('Authorization', authHeader)
      .send({ moodScore: 3, energyLevel: 0 });

    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/mood-logs/:id', () => {
  it('updates the log', async () => {
    db.moodLog.findUnique.mockResolvedValue(mockLog);
    db.moodLog.update.mockResolvedValue({ ...mockLog, moodScore: 5 });

    const res = await request(app)
      .patch('/api/mood-logs/log-1')
      .set('Authorization', authHeader)
      .send({ moodScore: 5 });

    expect(res.status).toBe(200);
    expect(res.body.log.moodScore).toBe(5);
  });

  it('returns 404 when log belongs to another user', async () => {
    db.moodLog.findUnique.mockResolvedValue({ ...mockLog, userId: 'user-uuid-2' });

    const res = await request(app)
      .patch('/api/mood-logs/log-1')
      .set('Authorization', authHeader)
      .send({ moodScore: 5 });

    expect(res.status).toBe(404);
  });

  it('returns 404 when log does not exist', async () => {
    db.moodLog.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/mood-logs/nonexistent')
      .set('Authorization', authHeader)
      .send({ moodScore: 3 });

    expect(res.status).toBe(404);
  });

  it('returns 400 when no fields are provided', async () => {
    const res = await request(app)
      .patch('/api/mood-logs/log-1')
      .set('Authorization', authHeader)
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/mood-logs/:id', () => {
  it('deletes the log and returns 204', async () => {
    db.moodLog.findUnique.mockResolvedValue(mockLog);
    db.moodLog.delete.mockResolvedValue({});

    const res = await request(app)
      .delete('/api/mood-logs/log-1')
      .set('Authorization', authHeader);

    expect(res.status).toBe(204);
    expect(db.moodLog.delete).toHaveBeenCalledWith({ where: { id: 'log-1' } });
  });

  it('returns 404 when log belongs to another user', async () => {
    db.moodLog.findUnique.mockResolvedValue({ ...mockLog, userId: 'user-uuid-2' });

    const res = await request(app)
      .delete('/api/mood-logs/log-1')
      .set('Authorization', authHeader);

    expect(res.status).toBe(404);
  });

  it('returns 404 when log does not exist', async () => {
    db.moodLog.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/mood-logs/nonexistent')
      .set('Authorization', authHeader);

    expect(res.status).toBe(404);
  });
});
