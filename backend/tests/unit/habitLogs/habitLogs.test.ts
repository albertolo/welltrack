import request from 'supertest';
import app from '../../../src/app';
import { generateAccessToken } from '../../../src/utils/jwt';

jest.mock('../../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    habit: { findFirst: jest.fn() },
    habitLog: {
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

const boolHabit = { id: 'habit-1', name: 'Exercise', trackingType: 'BOOLEAN', unit: null };
const numHabit = { id: 'habit-2', name: 'Water', trackingType: 'NUMERIC', unit: 'glasses' };
const durHabit = { id: 'habit-3', name: 'Sleep', trackingType: 'DURATION', unit: 'minutes' };

const mockLog = {
  id: 'log-1',
  userId: 'user-uuid-1',
  habitId: 'habit-1',
  valueBoolean: true,
  valueNumeric: null,
  valueDuration: null,
  notes: null,
  loggedAt: new Date('2024-01-15T10:00:00Z'),
  createdAt: new Date('2024-01-15T10:00:00Z'),
  habit: boolHabit,
};

beforeEach(() => {
  jest.clearAllMocks();
  db.habitLog.create.mockResolvedValue(mockLog);
});

describe('GET /api/habit-logs', () => {
  it('returns logs for the current user', async () => {
    db.habitLog.findMany.mockResolvedValue([mockLog]);

    const res = await request(app).get('/api/habit-logs').set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.logs).toHaveLength(1);
  });

  it('passes date range to query', async () => {
    db.habitLog.findMany.mockResolvedValue([]);

    await request(app)
      .get('/api/habit-logs?startDate=2024-01-01&endDate=2024-01-31')
      .set('Authorization', authHeader);

    const where = db.habitLog.findMany.mock.calls[0][0].where;
    expect(where.loggedAt.gte).toBeInstanceOf(Date);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/habit-logs');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/habit-logs', () => {
  it('creates a BOOLEAN habit log', async () => {
    db.habit.findFirst.mockResolvedValue(boolHabit);

    const res = await request(app)
      .post('/api/habit-logs')
      .set('Authorization', authHeader)
      .send({ habitId: 'habit-1', valueBoolean: true });

    expect(res.status).toBe(201);
    expect(db.habitLog.create.mock.calls[0][0].data.valueBoolean).toBe(true);
    expect(db.habitLog.create.mock.calls[0][0].data.valueNumeric).toBeNull();
    expect(db.habitLog.create.mock.calls[0][0].data.valueDuration).toBeNull();
  });

  it('creates a NUMERIC habit log', async () => {
    db.habit.findFirst.mockResolvedValue(numHabit);
    db.habitLog.create.mockResolvedValue({ ...mockLog, habitId: 'habit-2', valueBoolean: null, valueNumeric: 8 });

    const res = await request(app)
      .post('/api/habit-logs')
      .set('Authorization', authHeader)
      .send({ habitId: 'habit-2', valueNumeric: 8 });

    expect(res.status).toBe(201);
    expect(db.habitLog.create.mock.calls[0][0].data.valueNumeric).toBe(8);
    expect(db.habitLog.create.mock.calls[0][0].data.valueBoolean).toBeNull();
  });

  it('creates a DURATION habit log', async () => {
    db.habit.findFirst.mockResolvedValue(durHabit);
    db.habitLog.create.mockResolvedValue({ ...mockLog, habitId: 'habit-3', valueBoolean: null, valueDuration: 480 });

    const res = await request(app)
      .post('/api/habit-logs')
      .set('Authorization', authHeader)
      .send({ habitId: 'habit-3', valueDuration: 480 });

    expect(res.status).toBe(201);
    expect(db.habitLog.create.mock.calls[0][0].data.valueDuration).toBe(480);
  });

  it('returns 400 when required value field is missing for BOOLEAN', async () => {
    db.habit.findFirst.mockResolvedValue(boolHabit);

    const res = await request(app)
      .post('/api/habit-logs')
      .set('Authorization', authHeader)
      .send({ habitId: 'habit-1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/valueBoolean/);
  });

  it('returns 400 when required value field is missing for NUMERIC', async () => {
    db.habit.findFirst.mockResolvedValue(numHabit);

    const res = await request(app)
      .post('/api/habit-logs')
      .set('Authorization', authHeader)
      .send({ habitId: 'habit-2' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/valueNumeric/);
  });

  it('returns 400 when required value field is missing for DURATION', async () => {
    db.habit.findFirst.mockResolvedValue(durHabit);

    const res = await request(app)
      .post('/api/habit-logs')
      .set('Authorization', authHeader)
      .send({ habitId: 'habit-3' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/valueDuration/);
  });

  it('returns 404 when habit not found', async () => {
    db.habit.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/habit-logs')
      .set('Authorization', authHeader)
      .send({ habitId: 'nonexistent', valueBoolean: true });

    expect(res.status).toBe(404);
  });

  it('stores userId from token', async () => {
    db.habit.findFirst.mockResolvedValue(boolHabit);

    await request(app)
      .post('/api/habit-logs')
      .set('Authorization', authHeader)
      .send({ habitId: 'habit-1', valueBoolean: false });

    expect(db.habitLog.create.mock.calls[0][0].data.userId).toBe('user-uuid-1');
  });
});

describe('PATCH /api/habit-logs/:id', () => {
  it('updates the log value', async () => {
    db.habitLog.findUnique.mockResolvedValue(mockLog);
    db.habitLog.update.mockResolvedValue({ ...mockLog, valueBoolean: false });

    const res = await request(app)
      .patch('/api/habit-logs/log-1')
      .set('Authorization', authHeader)
      .send({ valueBoolean: false });

    expect(res.status).toBe(200);
    expect(res.body.log.valueBoolean).toBe(false);
  });

  it('returns 404 when log belongs to another user', async () => {
    db.habitLog.findUnique.mockResolvedValue({ ...mockLog, userId: 'user-uuid-2' });

    const res = await request(app)
      .patch('/api/habit-logs/log-1')
      .set('Authorization', authHeader)
      .send({ valueBoolean: false });

    expect(res.status).toBe(404);
  });

  it('returns 400 when no fields provided', async () => {
    const res = await request(app)
      .patch('/api/habit-logs/log-1')
      .set('Authorization', authHeader)
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/habit-logs/:id', () => {
  it('deletes the log and returns 204', async () => {
    db.habitLog.findUnique.mockResolvedValue(mockLog);
    db.habitLog.delete.mockResolvedValue({});

    const res = await request(app)
      .delete('/api/habit-logs/log-1')
      .set('Authorization', authHeader);

    expect(res.status).toBe(204);
  });

  it('returns 404 when log belongs to another user', async () => {
    db.habitLog.findUnique.mockResolvedValue({ ...mockLog, userId: 'user-uuid-2' });

    const res = await request(app)
      .delete('/api/habit-logs/log-1')
      .set('Authorization', authHeader);

    expect(res.status).toBe(404);
  });

  it('returns 404 when log does not exist', async () => {
    db.habitLog.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/habit-logs/nonexistent')
      .set('Authorization', authHeader);

    expect(res.status).toBe(404);
  });
});
