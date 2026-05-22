import request from 'supertest';
import app from '../../../src/app';

jest.mock('../../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
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
  passwordHash: 'hashed',
  createdAt: new Date(),
};

beforeEach(() => {
  jest.clearAllMocks();
  db.user.findUnique.mockResolvedValue(null);
  db.user.create.mockResolvedValue(mockUser);
  db.refreshToken.create.mockResolvedValue({});
});

const validBody = {
  email: 'test@example.com',
  password: 'password123',
  displayName: 'Test User',
};

describe('POST /api/auth/register', () => {
  it('returns 201 with user object and tokens', async () => {
    const res = await request(app).post('/api/auth/register').send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.user.id).toBe('user-uuid-1');
    expect(res.body.user.email).toBe('test@example.com');
    expect(res.body.user.displayName).toBe('Test User');
    expect(res.body.user.timezone).toBe('UTC');
    expect(typeof res.body.accessToken).toBe('string');
    expect(typeof res.body.refreshToken).toBe('string');
  });

  it('does not expose passwordHash in the response', async () => {
    const res = await request(app).post('/api/auth/register').send(validBody);
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ password: 'password123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 for an invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'password123' });
    expect(res.status).toBe(400);
    expect(res.body.details[0].field).toBe('email');
  });

  it('returns 400 when password is too short', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.details[0].field).toBe('password');
  });

  it('returns 400 when body is empty', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.status).toBe(400);
  });

  it('returns 409 when email is already in use', async () => {
    db.user.findUnique.mockResolvedValue(mockUser);
    const res = await request(app).post('/api/auth/register').send(validBody);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Email already in use');
  });

  it('stores a hashed (not plain-text) password', async () => {
    await request(app).post('/api/auth/register').send(validBody);
    const createArg = db.user.create.mock.calls[0][0];
    expect(createArg.data.passwordHash).not.toBe(validBody.password);
    expect(createArg.data.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it('stores a refresh token in the DB', async () => {
    await request(app).post('/api/auth/register').send(validBody);
    expect(db.refreshToken.create).toHaveBeenCalledTimes(1);
    const call = db.refreshToken.create.mock.calls[0][0];
    expect(call.data.userId).toBe('user-uuid-1');
    expect(typeof call.data.token).toBe('string');
    expect(call.data.expiresAt).toBeInstanceOf(Date);
  });

  it('works without an optional displayName', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'password123' });
    expect(res.status).toBe(201);
  });
});
