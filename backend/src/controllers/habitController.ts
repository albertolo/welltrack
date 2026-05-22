import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';

const trackingTypeEnum = z.enum(['BOOLEAN', 'NUMERIC', 'DURATION']);

const createSchema = z.object({
  name: z.string().min(1).max(100),
  trackingType: trackingTypeEnum,
  unit: z.string().min(1).max(50).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  unit: z.string().min(1).max(50).nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function getHabits(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;

  const habits = await prisma.habit.findMany({
    where: { OR: [{ userId: null }, { userId }] },
    orderBy: [{ userId: 'asc' }, { name: 'asc' }],
  });

  res.status(200).json({ habits });
}

export async function createHabit(req: Request, res: Response): Promise<void> {
  const result = createSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: result.error.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
    return;
  }

  const { name, trackingType, unit } = result.data;

  const habit = await prisma.habit.create({
    data: { name, trackingType, unit, userId: req.user!.id },
  });

  res.status(201).json({ habit });
}

export async function updateHabit(req: Request, res: Response): Promise<void> {
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

  const { name, unit, isActive } = result.data;
  if (name === undefined && unit === undefined && isActive === undefined) {
    res.status(400).json({ error: 'At least one field (name, unit, isActive) must be provided' });
    return;
  }

  const habit = await prisma.habit.findUnique({ where: { id } });
  if (!habit) {
    res.status(404).json({ error: 'Habit not found' });
    return;
  }

  if (habit.userId === null) {
    res.status(403).json({ error: 'Cannot modify system habits' });
    return;
  }

  if (habit.userId !== userId) {
    res.status(403).json({ error: 'Cannot modify this habit' });
    return;
  }

  const updated = await prisma.habit.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(unit !== undefined && { unit }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  res.status(200).json({ habit: updated });
}

export async function deleteHabit(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const userId = req.user!.id;

  const habit = await prisma.habit.findUnique({ where: { id } });
  if (!habit) {
    res.status(404).json({ error: 'Habit not found' });
    return;
  }

  if (habit.userId === null) {
    res.status(403).json({ error: 'Cannot delete system habits' });
    return;
  }

  if (habit.userId !== userId) {
    res.status(403).json({ error: 'Cannot delete this habit' });
    return;
  }

  await prisma.habit.delete({ where: { id } });
  res.status(204).send();
}
