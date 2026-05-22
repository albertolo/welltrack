import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';

const querySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const scoreField = z.number().int().min(1).max(5);

const createLogSchema = z.object({
  moodScore: scoreField,
  energyLevel: scoreField.optional(),
  stressLevel: scoreField.optional(),
  notes: z.string().max(1000).optional(),
  loggedAt: z.coerce.date().optional(),
});

const updateLogSchema = z.object({
  moodScore: scoreField.optional(),
  energyLevel: scoreField.nullable().optional(),
  stressLevel: scoreField.nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  loggedAt: z.coerce.date().optional(),
});

export async function getMoodLogs(req: Request, res: Response): Promise<void> {
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

  const logs = await prisma.moodLog.findMany({
    where: {
      userId,
      ...(startDate || endDate
        ? { loggedAt: { ...(startDate && { gte: startDate }), ...(endDate && { lte: endDate }) } }
        : {}),
    },
    orderBy: { loggedAt: 'desc' },
    take: limit,
    skip: offset,
  });

  res.status(200).json({ logs });
}

export async function createMoodLog(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;

  const result = createLogSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: result.error.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
    return;
  }

  const { moodScore, energyLevel, stressLevel, notes, loggedAt } = result.data;

  const log = await prisma.moodLog.create({
    data: {
      userId,
      moodScore,
      energyLevel,
      stressLevel,
      notes,
      ...(loggedAt && { loggedAt }),
    },
  });

  res.status(201).json({ log });
}

export async function updateMoodLog(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const userId = req.user!.id;

  const result = updateLogSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: result.error.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
    return;
  }

  const { moodScore, energyLevel, stressLevel, notes, loggedAt } = result.data;
  if (
    moodScore === undefined &&
    energyLevel === undefined &&
    stressLevel === undefined &&
    notes === undefined &&
    loggedAt === undefined
  ) {
    res.status(400).json({ error: 'At least one field must be provided' });
    return;
  }

  const log = await prisma.moodLog.findUnique({ where: { id } });
  if (!log || log.userId !== userId) {
    res.status(404).json({ error: 'Log not found' });
    return;
  }

  const updated = await prisma.moodLog.update({
    where: { id },
    data: {
      ...(moodScore !== undefined && { moodScore }),
      ...(energyLevel !== undefined && { energyLevel }),
      ...(stressLevel !== undefined && { stressLevel }),
      ...(notes !== undefined && { notes }),
      ...(loggedAt !== undefined && { loggedAt }),
    },
  });

  res.status(200).json({ log: updated });
}

export async function deleteMoodLog(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const userId = req.user!.id;

  const log = await prisma.moodLog.findUnique({ where: { id } });
  if (!log || log.userId !== userId) {
    res.status(404).json({ error: 'Log not found' });
    return;
  }

  await prisma.moodLog.delete({ where: { id } });
  res.status(204).send();
}
