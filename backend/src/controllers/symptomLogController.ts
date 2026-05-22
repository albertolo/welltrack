import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';

const querySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const createLogSchema = z.object({
  symptomId: z.string().min(1),
  severity: z.number().int().min(1).max(10),
  notes: z.string().max(1000).optional(),
  loggedAt: z.coerce.date().optional(),
});

const updateLogSchema = z.object({
  severity: z.number().int().min(1).max(10).optional(),
  notes: z.string().max(1000).nullable().optional(),
  loggedAt: z.coerce.date().optional(),
});

const symptomSelect = { id: true, name: true, category: true };

export async function getSymptomLogs(req: Request, res: Response): Promise<void> {
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

  const logs = await prisma.symptomLog.findMany({
    where: {
      userId,
      ...(startDate || endDate
        ? { loggedAt: { ...(startDate && { gte: startDate }), ...(endDate && { lte: endDate }) } }
        : {}),
    },
    include: { symptom: { select: symptomSelect } },
    orderBy: { loggedAt: 'desc' },
    take: limit,
    skip: offset,
  });

  res.status(200).json({ logs });
}

export async function createSymptomLog(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;

  const result = createLogSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: result.error.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
    return;
  }

  const { symptomId, severity, notes, loggedAt } = result.data;

  const symptom = await prisma.symptom.findFirst({
    where: { id: symptomId, OR: [{ userId: null }, { userId }] },
  });
  if (!symptom) {
    res.status(404).json({ error: 'Symptom not found' });
    return;
  }

  const log = await prisma.symptomLog.create({
    data: { userId, symptomId, severity, notes, ...(loggedAt && { loggedAt }) },
    include: { symptom: { select: symptomSelect } },
  });

  res.status(201).json({ log });
}

export async function updateSymptomLog(req: Request, res: Response): Promise<void> {
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

  const { severity, notes, loggedAt } = result.data;
  if (severity === undefined && notes === undefined && loggedAt === undefined) {
    res.status(400).json({ error: 'At least one field (severity, notes, loggedAt) must be provided' });
    return;
  }

  const log = await prisma.symptomLog.findUnique({ where: { id } });
  if (!log || log.userId !== userId) {
    res.status(404).json({ error: 'Log not found' });
    return;
  }

  const updated = await prisma.symptomLog.update({
    where: { id },
    data: {
      ...(severity !== undefined && { severity }),
      ...(notes !== undefined && { notes }),
      ...(loggedAt !== undefined && { loggedAt }),
    },
    include: { symptom: { select: symptomSelect } },
  });

  res.status(200).json({ log: updated });
}

export async function deleteSymptomLog(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const userId = req.user!.id;

  const log = await prisma.symptomLog.findUnique({ where: { id } });
  if (!log || log.userId !== userId) {
    res.status(404).json({ error: 'Log not found' });
    return;
  }

  await prisma.symptomLog.delete({ where: { id } });
  res.status(204).send();
}
