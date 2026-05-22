import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';

const querySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const createSchema = z.object({
  habitId: z.string().min(1),
  valueBoolean: z.boolean().optional(),
  valueNumeric: z.number().optional(),
  valueDuration: z.number().int().min(0).optional(),
  notes: z.string().max(1000).optional(),
  loggedAt: z.coerce.date().optional(),
});

const updateSchema = z.object({
  valueBoolean: z.boolean().nullable().optional(),
  valueNumeric: z.number().nullable().optional(),
  valueDuration: z.number().int().min(0).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  loggedAt: z.coerce.date().optional(),
});

const habitSelect = { id: true, name: true, trackingType: true, unit: true };

function validateValue(
  trackingType: string,
  valueBoolean?: boolean,
  valueNumeric?: number,
  valueDuration?: number,
): string | null {
  if (trackingType === 'BOOLEAN' && valueBoolean === undefined) {
    return 'valueBoolean is required for BOOLEAN habits';
  }
  if (trackingType === 'NUMERIC' && valueNumeric === undefined) {
    return 'valueNumeric is required for NUMERIC habits';
  }
  if (trackingType === 'DURATION' && valueDuration === undefined) {
    return 'valueDuration is required for DURATION habits';
  }
  return null;
}

export async function getHabitLogs(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;

  const q = querySchema.safeParse(req.query);
  if (!q.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: q.error.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
    return;
  }

  const { startDate, endDate, limit, offset } = q.data;

  const logs = await prisma.habitLog.findMany({
    where: {
      userId,
      ...(startDate || endDate
        ? { loggedAt: { ...(startDate && { gte: startDate }), ...(endDate && { lte: endDate }) } }
        : {}),
    },
    include: { habit: { select: habitSelect } },
    orderBy: { loggedAt: 'desc' },
    take: limit,
    skip: offset,
  });

  res.status(200).json({ logs });
}

export async function createHabitLog(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;

  const result = createSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: result.error.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
    return;
  }

  const { habitId, valueBoolean, valueNumeric, valueDuration, notes, loggedAt } = result.data;

  const habit = await prisma.habit.findFirst({
    where: { id: habitId, OR: [{ userId: null }, { userId }] },
  });
  if (!habit) {
    res.status(404).json({ error: 'Habit not found' });
    return;
  }

  const valError = validateValue(habit.trackingType, valueBoolean, valueNumeric, valueDuration);
  if (valError) {
    res.status(400).json({ error: valError });
    return;
  }

  const log = await prisma.habitLog.create({
    data: {
      userId,
      habitId,
      valueBoolean: habit.trackingType === 'BOOLEAN' ? valueBoolean ?? null : null,
      valueNumeric: habit.trackingType === 'NUMERIC' ? valueNumeric ?? null : null,
      valueDuration: habit.trackingType === 'DURATION' ? valueDuration ?? null : null,
      notes,
      ...(loggedAt && { loggedAt }),
    },
    include: { habit: { select: habitSelect } },
  });

  res.status(201).json({ log });
}

export async function updateHabitLog(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const userId = req.user!.id;

  const result = updateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: result.error.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
    return;
  }

  const { valueBoolean, valueNumeric, valueDuration, notes, loggedAt } = result.data;
  if (
    valueBoolean === undefined &&
    valueNumeric === undefined &&
    valueDuration === undefined &&
    notes === undefined &&
    loggedAt === undefined
  ) {
    res.status(400).json({ error: 'At least one field must be provided' });
    return;
  }

  const log = await prisma.habitLog.findUnique({ where: { id } });
  if (!log || log.userId !== userId) {
    res.status(404).json({ error: 'Log not found' });
    return;
  }

  const updated = await prisma.habitLog.update({
    where: { id },
    data: {
      ...(valueBoolean !== undefined && { valueBoolean }),
      ...(valueNumeric !== undefined && { valueNumeric }),
      ...(valueDuration !== undefined && { valueDuration }),
      ...(notes !== undefined && { notes }),
      ...(loggedAt !== undefined && { loggedAt }),
    },
    include: { habit: { select: habitSelect } },
  });

  res.status(200).json({ log: updated });
}

export async function deleteHabitLog(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const userId = req.user!.id;

  const log = await prisma.habitLog.findUnique({ where: { id } });
  if (!log || log.userId !== userId) {
    res.status(404).json({ error: 'Log not found' });
    return;
  }

  await prisma.habitLog.delete({ where: { id } });
  res.status(204).send();
}
