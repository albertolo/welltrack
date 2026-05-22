import { PrismaClient, TrackingType } from '@prisma/client';

const prisma = new PrismaClient();

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Database seed - Symptoms', () => {
  it('has at least 15 system symptoms in the database', async () => {
    const count = await prisma.symptom.count({
      where: { userId: null },
    });
    expect(count).toBeGreaterThanOrEqual(15);
  });

  it('all system symptoms have is_active = true', async () => {
    const inactive = await prisma.symptom.count({
      where: { userId: null, isActive: false },
    });
    expect(inactive).toBe(0);
  });

  it('system symptom IDs follow the system-<slug> pattern', async () => {
    const symptoms = await prisma.symptom.findMany({ where: { userId: null } });
    symptoms.forEach((s) => {
      expect(s.id).toMatch(/^system-/);
    });
  });

  it('expected symptoms exist by name', async () => {
    const names = ['Headache', 'Fatigue', 'Joint Pain', 'Anxiety', 'Fever'];
    for (const name of names) {
      const found = await prisma.symptom.findFirst({ where: { name, userId: null } });
      expect(found).not.toBeNull();
    }
  });
});

describe('Database seed - Habits', () => {
  it('has at least 10 system habits in the database', async () => {
    const count = await prisma.habit.count({
      where: { userId: null },
    });
    expect(count).toBeGreaterThanOrEqual(10);
  });

  it('all system habits have is_active = true', async () => {
    const inactive = await prisma.habit.count({
      where: { userId: null, isActive: false },
    });
    expect(inactive).toBe(0);
  });

  it('system habit IDs follow the system-<slug> pattern', async () => {
    const habits = await prisma.habit.findMany({ where: { userId: null } });
    habits.forEach((h) => {
      expect(h.id).toMatch(/^system-/);
    });
  });

  it('Sleep Duration habit has DURATION tracking type', async () => {
    const habit = await prisma.habit.findFirst({
      where: { name: 'Sleep Duration', userId: null },
    });
    expect(habit).not.toBeNull();
    expect(habit?.trackingType).toBe(TrackingType.DURATION);
  });

  it('Took Vitamins habit has BOOLEAN tracking type', async () => {
    const habit = await prisma.habit.findFirst({
      where: { name: 'Took Vitamins', userId: null },
    });
    expect(habit).not.toBeNull();
    expect(habit?.trackingType).toBe(TrackingType.BOOLEAN);
  });

  it('Water Intake habit has NUMERIC tracking type and unit', async () => {
    const habit = await prisma.habit.findFirst({
      where: { name: 'Water Intake', userId: null },
    });
    expect(habit).not.toBeNull();
    expect(habit?.trackingType).toBe(TrackingType.NUMERIC);
    expect(habit?.unit).toBe('glasses');
  });
});

describe('Database schema - User model', () => {
  const testEmail = `test-schema-${Date.now()}@welltrack.test`;

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
  });

  it('creates a user and reads it back', async () => {
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash: 'hashed-password',
        displayName: 'Test User',
      },
    });
    expect(user.id).toBeTruthy();
    expect(user.email).toBe(testEmail);
    expect(user.timezone).toBe('UTC');
    expect(user.createdAt).toBeInstanceOf(Date);
  });

  it('enforces unique email constraint', async () => {
    await prisma.user.create({
      data: { email: testEmail, passwordHash: 'hash1' },
    });
    await expect(
      prisma.user.create({ data: { email: testEmail, passwordHash: 'hash2' } }),
    ).rejects.toThrow();
  });

  it('cascade deletes symptom logs when user is deleted', async () => {
    const user = await prisma.user.create({
      data: { email: testEmail, passwordHash: 'hash' },
    });
    const symptom = await prisma.symptom.findFirst({ where: { userId: null } });
    await prisma.symptomLog.create({
      data: { userId: user.id, symptomId: symptom!.id, severity: 5 },
    });
    await prisma.user.delete({ where: { id: user.id } });
    const logs = await prisma.symptomLog.findMany({ where: { userId: user.id } });
    expect(logs).toHaveLength(0);
  });
});
