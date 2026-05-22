import request from 'supertest';
import app from '../../../src/app';
import { generateAccessToken } from '../../../src/utils/jwt';
import * as hash from '../../../src/utils/hash';

jest.mock('../../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = jest.requireMock('../../../src/lib/prisma').default as any;

const mockUser = {
  id: 'user-uuid-1',
  email: 'test@example.com',
  displayName: 'Test User',
  timezone: 'UTC',
  passwordHash: '$2b$10$hashedpassword',
  createdAt: new Date('2024-01-01'),
};

const authHeader = `Bearer ${generateAccessToken('user-uuid-1')}`;

beforeEach(() => {
  jest.clearAllMocks();
  db.user.findUnique.mockResolvedValue(mockUser);
});

describe('GET /api/users/me', () => {
  it('returns the current user profile', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe('user-uuid-1');
    expect(res.body.user.email).toBe('test@example.com');
    expect(res.body.user.timezone).toBe('UTC');
  });

  it('does not expose passwordHash', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', authHeader);

    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/users/me', () => {
  beforeEach(() => {
    db.user.update.mockResolvedValue({ ...mockUser, displayName: 'Updated Name' });
  });

  it('updates and returns the user profile', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', authHeader)
      .send({ displayName: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.user.displayName).toBe('Updated Name');
  });

  it('can update timezone', async () => {
    db.user.update.mockResolvedValue({ ...mockUser, timezone: 'America/New_York' });

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', authHeader)
      .send({ timezone: 'America/New_York' });

    expect(res.status).toBe(200);
    expect(res.body.user.timezone).toBe('America/New_York');
  });

  it('returns 400 when body has no valid fields', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', authHeader)
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).patch('/api/users/me').send({ displayName: 'x' });
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/users/me', () => {
  beforeEach(() => {
    db.user.delete.mockResolvedValue({});
  });

  it('deletes the account and returns 204', async () => {
    jest.spyOn(hash, 'comparePassword').mockResolvedValue(true);

    const res = await request(app)
      .delete('/api/users/me')
      .set('Authorization', authHeader)
      .send({ password: 'password123' });

    expect(res.status).toBe(204);
    expect(db.user.delete).toHaveBeenCalledWith({ where: { id: 'user-uuid-1' } });
  });

  it('returns 401 when password is wrong', async () => {
    jest.spyOn(hash, 'comparePassword').mockResolvedValue(false);

    const res = await request(app)
      .delete('/api/users/me')
      .set('Authorization', authHeader)
      .send({ password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid password');
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .delete('/api/users/me')
      .set('Authorization', authHeader)
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app)
      .delete('/api/users/me')
      .send({ password: 'password123' });

    expect(res.status).toBe(401);
  });
});
