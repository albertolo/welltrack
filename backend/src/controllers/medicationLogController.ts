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
  medicationId: z.string().min(1),
  taken: z.boolean(),
  takenAt: z.coerce.date().optional(),
  notes: z.string().max(1000).optional(),
});

const updateSchema = z.object({
  taken: z.boolean().optional(),
  takenAt: z.coerce.date().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

const medSelect = { id: true, name: true, dosage: true, frequency: true };

export async function getMedicationLogs(req: Request, res: Response): Promise<void> {
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

  const logs = await prisma.medicationLog.findMany({
    where: {
      userId,
      ...(startDate || endDate
        ? { createdAt: { ...(startDate && { gte: startDate }), ...(endDate && { lte: endDate }) } }
        : {}),
    },
    include: { medication: { select: medSelect } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });

  res.status(200).json({ logs });
}

export async function createMedicationLog(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;

  const result = createSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: result.error.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
    return;
  }

  const { medicationId, taken, takenAt, notes } = result.data;

  const medication = await prisma.medication.findFirst({
    where: { id: medicationId, userId },
  });
  if (!medication) {
    res.status(404).json({ error: 'Medication not found' });
    return;
  }

  const log = await prisma.medicationLog.create({
    data: { userId, medicationId, taken, takenAt, notes },
    include: { medication: { select: medSelect } },
  });

  res.status(201).json({ log });
}

export async function updateMedicationLog(req: Request, res: Response): Promise<void> {
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

  const { taken, takenAt, notes } = result.data;
  if (taken === undefined && takenAt === undefined && notes === undefined) {
    res.status(400).json({ error: 'At least one field (taken, takenAt, notes) must be provided' });
    return;
  }

  const log = await prisma.medicationLog.findUnique({ where: { id } });
  if (!log || log.userId !== userId) {
    res.status(404).json({ error: 'Log not found' });
    return;
  }

  const updated = await prisma.medicationLog.update({
    where: { id },
    data: {
      ...(taken !== undefined && { taken }),
      ...(takenAt !== undefined && { takenAt }),
      ...(notes !== undefined && { notes }),
    },
    include: { medication: { select: medSelect } },
  });

  res.status(200).json({ log: updated });
}

export async function deleteMedicationLog(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const userId = req.user!.id;

  const log = await prisma.medicationLog.findUnique({ where: { id } });
  if (!log || log.userId !== userId) {
    res.status(404).json({ error: 'Log not found' });
    return;
  }

  await prisma.medicationLog.delete({ where: { id } });
  res.status(204).send();
}
