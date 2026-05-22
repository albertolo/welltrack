import request from 'supertest';
import app from '../../../src/app';
import { generateAccessToken } from '../../../src/utils/jwt';

jest.mock('../../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    habit: {
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

const systemHabit = { id: 'habit-sys-1', userId: null, name: 'Sleep', trackingType: 'DURATION', unit: 'hours', isActive: true };
const userHabit = { id: 'habit-user-1', userId: 'user-uuid-1', name: 'Meditation', trackingType: 'BOOLEAN', unit: null, isActive: true };
const otherHabit = { id: 'habit-other-1', userId: 'user-uuid-2', name: 'Running', trackingType: 'NUMERIC', unit: 'km', isActive: true };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/habits', () => {
  it('returns system and user habits', async () => {
    db.habit.findMany.mockResolvedValue([systemHabit, userHabit]);

    const res = await request(app).get('/api/habits').set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.habits).toHaveLength(2);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/habits');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/habits', () => {
  it('creates a BOOLEAN habit', async () => {
    db.habit.create.mockResolvedValue(userHabit);

    const res = await request(app)
      .post('/api/habits')
      .set('Authorization', authHeader)
      .send({ name: 'Meditation', trackingType: 'BOOLEAN' });

    expect(res.status).toBe(201);
    expect(res.body.habit.trackingType).toBe('BOOLEAN');
    expect(db.habit.create.mock.calls[0][0].data.userId).toBe('user-uuid-1');
  });

  it('creates a NUMERIC habit with unit', async () => {
    db.habit.create.mockResolvedValue({ ...userHabit, trackingType: 'NUMERIC', unit: 'glasses' });

    const res = await request(app)
      .post('/api/habits')
      .set('Authorization', authHeader)
      .send({ name: 'Water', trackingType: 'NUMERIC', unit: 'glasses' });

    expect(res.status).toBe(201);
  });

  it('returns 400 when trackingType is invalid', async () => {
    const res = await request(app)
      .post('/api/habits')
      .set('Authorization', authHeader)
      .send({ name: 'Test', trackingType: 'INVALID' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/habits')
      .set('Authorization', authHeader)
      .send({ trackingType: 'BOOLEAN' });

    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/habits/:id', () => {
  it('updates a user-owned habit', async () => {
    db.habit.findUnique.mockResolvedValue(userHabit);
    db.habit.update.mockResolvedValue({ ...userHabit, name: 'Daily Meditation' });

    const res = await request(app)
      .patch('/api/habits/habit-user-1')
      .set('Authorization', authHeader)
      .send({ name: 'Daily Meditation' });

    expect(res.status).toBe(200);
    expect(res.body.habit.name).toBe('Daily Meditation');
  });

  it('returns 403 when modifying a system habit', async () => {
    db.habit.findUnique.mockResolvedValue(systemHabit);

    const res = await request(app)
      .patch('/api/habits/habit-sys-1')
      .set('Authorization', authHeader)
      .send({ name: 'Hacked' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Cannot modify system habits');
  });

  it('returns 403 when modifying another user habit', async () => {
    db.habit.findUnique.mockResolvedValue(otherHabit);

    const res = await request(app)
      .patch('/api/habits/habit-other-1')
      .set('Authorization', authHeader)
      .send({ name: 'Hacked' });

    expect(res.status).toBe(403);
  });

  it('returns 404 when habit does not exist', async () => {
    db.habit.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/habits/nonexistent')
      .set('Authorization', authHeader)
      .send({ name: 'x' });

    expect(res.status).toBe(404);
  });

  it('returns 400 when no fields provided', async () => {
    const res = await request(app)
      .patch('/api/habits/habit-user-1')
      .set('Authorization', authHeader)
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/habits/:id', () => {
  it('deletes a user-owned habit', async () => {
    db.habit.findUnique.mockResolvedValue(userHabit);
    db.habit.delete.mockResolvedValue({});

    const res = await request(app)
      .delete('/api/habits/habit-user-1')
      .set('Authorization', authHeader);

    expect(res.status).toBe(204);
    expect(db.habit.delete).toHaveBeenCalledWith({ where: { id: 'habit-user-1' } });
  });

  it('returns 403 when deleting a system habit', async () => {
    db.habit.findUnique.mockResolvedValue(systemHabit);

    const res = await request(app)
      .delete('/api/habits/habit-sys-1')
      .set('Authorization', authHeader);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Cannot delete system habits');
  });

  it('returns 403 when deleting another user habit', async () => {
    db.habit.findUnique.mockResolvedValue(otherHabit);

    const res = await request(app)
      .delete('/api/habits/habit-other-1')
      .set('Authorization', authHeader);

    expect(res.status).toBe(403);
  });

  it('returns 404 when habit does not exist', async () => {
    db.habit.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/habits/nonexistent')
      .set('Authorization', authHeader);

    expect(res.status).toBe(404);
  });
});
